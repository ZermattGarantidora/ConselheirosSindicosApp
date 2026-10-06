import { createHash } from "node:crypto";

import {
  answerPipelineVersion,
  type GeneratedAnswer,
  type GeneratedCitation
} from "./answer-contract.js";
import {
  AnswerGatewayUnavailableError,
  type AnswerGateway,
  type AnswerGatewayInput,
  type AnswerGatewayResult
} from "./answer-gateway.js";
import { answerPromptVersion, buildAnswerPrompt } from "./prompt-catalog.js";

const generateContentBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
const defaultModel = "gemini-3.5-flash-lite";
const defaultTimeoutMs = 30_000;
const defaultMaximumAttempts = 3;
const defaultRetryBaseDelayMs = 200;
const maximumRetryDelayMs = 2_000;

type GeminiGenerateContentResponse = Readonly<{
  usageMetadata?: Readonly<{
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  }>;
  candidates?: readonly Readonly<{
    content?: Readonly<{
      parts?: readonly Readonly<{ text?: string }>[];
    }>;
  }>[];
}>;

type ProviderGeneratedAnswer = Readonly<
  Omit<GeneratedAnswer, "citations"> & {
    citations: readonly Readonly<{ evidenceId?: unknown }>[];
  }
>;

export type GeminiAnswerGatewayOptions = Readonly<{
  apiKey: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maximumAttempts?: number;
  retryBaseDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}>;

class NonRetryableGeminiError extends AnswerGatewayUnavailableError {}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function answerSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "answer",
      "answerMode",
      "citations",
      "attentionPoints",
      "suggestedNextStep",
      "specialist",
      "claims"
    ],
    properties: {
      answer: { type: "string" },
      answerMode: { type: "string", enum: ["grounded", "conflict", "abstained"] },
      citations: {
        type: "array",
        minItems: 0,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["evidenceId"],
          properties: {
            evidenceId: { type: "string" }
          }
        }
      },
      attentionPoints: { type: "array", items: { type: "string" } },
      suggestedNextStep: { type: ["string", "null"] },
      specialist: {
        type: "object",
        additionalProperties: false,
        required: ["required", "type", "reason"],
        properties: {
          required: { type: "boolean" },
          type: { type: ["string", "null"] },
          reason: { type: ["string", "null"] }
        }
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["statement", "claimType", "evidenceRequired", "citationEvidenceIds"],
          properties: {
            statement: { type: "string" },
            claimType: {
              type: "string",
              enum: ["condominium_fact", "interpretation", "recommendation"]
            },
            evidenceRequired: { type: "boolean" },
            citationEvidenceIds: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  } as const;
}

function outputText(response: GeminiGenerateContentResponse): string | undefined {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === "string") return part.text;
    }
  }
  return undefined;
}

function parseOutput(text: string): ProviderGeneratedAnswer {
  try {
    return JSON.parse(text) as ProviderGeneratedAnswer;
  } catch {
    throw new AnswerGatewayUnavailableError(
      "A Gemini não retornou uma resposta estruturada válida."
    );
  }
}

/**
 * Conversas de orientação não têm fatos documentais a comprovar. A resposta
 * textual é envolvida localmente no contrato seguro, sem citações ou alegações
 * sobre regras do condomínio.
 */
function conversationalOutput(text: string): GeneratedAnswer {
  const answer = text.trim();
  if (answer.length === 0) {
    throw new AnswerGatewayUnavailableError("A Gemini não retornou texto.");
  }

  return Object.freeze({
    answer,
    answerMode: "abstained" as const,
    citations: Object.freeze([]),
    attentionPoints: Object.freeze([]),
    suggestedNextStep: null,
    specialist: Object.freeze({ required: false, type: null, reason: null }),
    claims: Object.freeze([])
  });
}

/** A Gemini escolhe o evidenceId; a fonte exibida é sempre reconstruída localmente. */
function canonicalizeCitations(
  output: ProviderGeneratedAnswer,
  input: AnswerGatewayInput
): GeneratedAnswer {
  if (!Array.isArray(output.citations)) {
    return Object.freeze({ ...output, citations: Object.freeze([]) });
  }
  const citations: GeneratedCitation[] = [];
  for (const candidate of output.citations) {
    const evidenceId = candidate?.evidenceId;
    if (typeof evidenceId !== "string") continue;
    const evidence = input.evidence.find((item) => item.id === evidenceId);
    if (evidence === undefined) continue;
    citations.push(
      Object.freeze({
        evidenceId: evidence.id,
        documentId: evidence.documentId,
        documentVersionId: evidence.documentVersionId,
        title: evidence.documentTitle,
        page: evidence.pageNumber,
        excerpt: evidence.content,
        sourceScope: evidence.sourceScope ?? "condominium",
        startOffset: evidence.startOffset,
        endOffset: evidence.endOffset
      })
    );
  }
  return Object.freeze({ ...output, citations: Object.freeze(citations) });
}

function requestBody(input: AnswerGatewayInput): string {
  const request = {
    contents: [{ role: "user", parts: [{ text: buildAnswerPrompt(input) }] }],
    generationConfig: { maxOutputTokens: input.budget.maximumOutputTokens }
  };
  if (input.evidence.length === 0) {
    return JSON.stringify(request);
  }
  return JSON.stringify({
    ...request,
    generationConfig: {
      ...request.generationConfig,
      responseMimeType: "application/json",
      responseJsonSchema: answerSchema()
    }
  });
}

function generateContentUrl(model: string): string {
  const modelName = model.replace(/^models\//u, "");
  return `${generateContentBaseUrl}/${encodeURIComponent(modelName)}:generateContent`;
}

function providerFailureMessage(status: number): string {
  if (status === 400) return "A configuração enviada à Gemini foi recusada.";
  if (status === 401 || status === 403)
    return "A chave da Gemini não está autorizada para esta API.";
  if (status === 429) return "O limite de uso da Gemini foi atingido temporariamente.";
  if (status >= 500) return "A Gemini está indisponível no momento.";
  return "A Gemini não aceitou a solicitação neste momento.";
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function retryAfterMilliseconds(value: string | null, nowMs = Date.now()): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - nowMs) : undefined;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createGeminiAnswerGateway(options: GeminiAnswerGatewayOptions): AnswerGateway {
  const apiKey = options.apiKey.trim();
  const model = options.model?.trim() || defaultModel;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const maximumAttempts = options.maximumAttempts ?? defaultMaximumAttempts;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? defaultRetryBaseDelayMs;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Date.now());
  if (apiKey.length === 0)
    throw new Error("A chave da Gemini é obrigatória para habilitar o gateway.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1)
    throw new Error("O timeout da Gemini é inválido.");
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 3)
    throw new Error("O número de tentativas da Gemini deve estar entre 1 e 3.");
  if (!Number.isInteger(retryBaseDelayMs) || retryBaseDelayMs < 0)
    throw new Error("O intervalo de repetição da Gemini é inválido.");

  const effectiveAttempts = Math.min(maximumAttempts, timeoutMs);
  const retryBudgetMs =
    effectiveAttempts === 1
      ? 0
      : Math.min(maximumRetryDelayMs * (effectiveAttempts - 1), Math.floor(timeoutMs * 0.1));
  const maximumDelayPerRetryMs =
    effectiveAttempts === 1 ? 0 : Math.floor(retryBudgetMs / (effectiveAttempts - 1));
  const attemptTimeoutMs = Math.max(1, Math.floor((timeoutMs - retryBudgetMs) / effectiveAttempts));

  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      const prompt = buildAnswerPrompt(input);
      const startedAt = now();
      let lastFailure = new AnswerGatewayUnavailableError(
        "Não foi possível consultar a Gemini com segurança."
      );

      for (let attempt = 1; attempt <= effectiveAttempts; attempt += 1) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let retryAfterMs: number | undefined;
        try {
          const controller = new AbortController();
          timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
          const response = await fetchImplementation(generateContentUrl(model), {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
            body: requestBody(input)
          });
          if (!response.ok) {
            const message = providerFailureMessage(response.status);
            if (!isRetryableStatus(response.status)) {
              throw new NonRetryableGeminiError(message);
            }
            retryAfterMs = retryAfterMilliseconds(response.headers.get("retry-after"));
            throw new AnswerGatewayUnavailableError(message);
          }
          const providerResponse = (await response.json()) as GeminiGenerateContentResponse;
          const text = outputText(providerResponse);
          if (text === undefined)
            throw new AnswerGatewayUnavailableError("A Gemini não retornou texto.");
          const isConversation = input.evidence.length === 0;
          const output = isConversation
            ? conversationalOutput(text)
            : canonicalizeCitations(parseOutput(text), input);
          const finishedAt = now();
          const retrySuffix = attempt === 1 ? "" : `; recuperada na tentativa ${attempt}`;
          return Object.freeze({
            output,
            telemetry: Object.freeze({
              providerKey: "google",
              modelKey: model,
              modelVersion: "api-generate-content-v1beta",
              promptVersion: answerPromptVersion,
              pipelineVersion: answerPipelineVersion,
              taskType: input.task,
              riskClass: input.riskClass,
              routingReason: isConversation
                ? `Gemini configurada para orientação condominial conversacional${retrySuffix}`
                : `Gemini configurada para resposta documental estruturada${retrySuffix}`,
              status: "completed" as const,
              inputTokens: providerResponse.usageMetadata?.promptTokenCount ?? 0,
              outputTokens: providerResponse.usageMetadata?.candidatesTokenCount ?? 0,
              cachedInputTokens: 0,
              latencyMs: Math.max(0, finishedAt - startedAt),
              estimatedCostMicrounits: 0,
              costCurrency: "BRL" as const,
              inputHash: hash(prompt),
              outputHash: hash(text),
              errorCode: null
            })
          });
        } catch (error: unknown) {
          if (error instanceof NonRetryableGeminiError) {
            throw new AnswerGatewayUnavailableError(error.message);
          }
          lastFailure =
            error instanceof AnswerGatewayUnavailableError
              ? error
              : new AnswerGatewayUnavailableError(
                  "Não foi possível consultar a Gemini com segurança."
                );
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
        }

        if (attempt < effectiveAttempts) {
          const exponentialDelay = retryBaseDelayMs * 2 ** (attempt - 1);
          const delayMs = Math.min(maximumDelayPerRetryMs, retryAfterMs ?? exponentialDelay);
          if (delayMs > 0) await sleep(delayMs);
        }
      }

      throw lastFailure;
    }
  });
}

export function createGeminiAnswerGatewayFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): AnswerGateway | undefined {
  if (environment.GEMINI_ENABLED?.trim().toLowerCase() === "false") return undefined;
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return undefined;
  const timeoutMs = Number(environment.GEMINI_TIMEOUT_MS);
  const maximumAttempts = Number(environment.GEMINI_MAX_ATTEMPTS);
  const retryBaseDelayMs = Number(environment.GEMINI_RETRY_BASE_DELAY_MS);
  return createGeminiAnswerGateway({
    apiKey,
    ...(environment.GEMINI_MODEL === undefined ? {} : { model: environment.GEMINI_MODEL }),
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {}),
    ...(Number.isInteger(maximumAttempts) && maximumAttempts > 0 ? { maximumAttempts } : {}),
    ...(Number.isInteger(retryBaseDelayMs) && retryBaseDelayMs >= 0 ? { retryBaseDelayMs } : {})
  });
}
