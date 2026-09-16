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

const interactionsUrl = "https://generativelanguage.googleapis.com/v1beta/interactions";
const defaultModel = "gemini-flash-lite-latest";
const defaultTimeoutMs = 30_000;

type GeminiInteraction = Readonly<{
  status?: string;
  usage?: Readonly<{ total_input_tokens?: number; total_output_tokens?: number }>;
  steps?: readonly Readonly<{
    type?: string;
    content?: readonly Readonly<{ type?: string; text?: string }>[];
  }>[];
}>;

export type GeminiAnswerGatewayOptions = Readonly<{
  apiKey: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  now?: () => number;
}>;

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
          required: ["evidenceId", "documentId", "documentVersionId", "title", "page", "excerpt"],
          properties: {
            evidenceId: { type: "string" },
            documentId: { type: "string" },
            documentVersionId: { type: "string" },
            title: { type: "string" },
            page: { type: "integer" },
            excerpt: { type: "string" }
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

function outputText(response: GeminiInteraction): string | undefined {
  for (const step of response.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const content of step.content ?? []) {
      if (content.type === "text" && typeof content.text === "string") return content.text;
    }
  }
  return undefined;
}

function parseOutput(text: string): GeneratedAnswer {
  try {
    return JSON.parse(text) as GeneratedAnswer;
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
  output: GeneratedAnswer,
  input: AnswerGatewayInput
): GeneratedAnswer {
  if (!Array.isArray(output.citations)) return output;
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
        startOffset: evidence.startOffset,
        endOffset: evidence.endOffset
      })
    );
  }
  return Object.freeze({ ...output, citations: Object.freeze(citations) });
}

function requestBody(input: AnswerGatewayInput, model: string): string {
  const request = {
    model,
    store: false,
    input: buildAnswerPrompt(input),
    generation_config: { max_output_tokens: input.budget.maximumOutputTokens }
  };
  if (input.evidence.length === 0) {
    return JSON.stringify(request);
  }
  return JSON.stringify({
    ...request,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: answerSchema()
    }
  });
}

function providerFailureMessage(status: number): string {
  if (status === 400) return "A configuração enviada à Gemini foi recusada.";
  if (status === 401 || status === 403)
    return "A chave da Gemini não está autorizada para esta API.";
  if (status === 429) return "O limite de uso da Gemini foi atingido temporariamente.";
  if (status >= 500) return "A Gemini está indisponível no momento.";
  return "A Gemini não aceitou a solicitação neste momento.";
}

export function createGeminiAnswerGateway(options: GeminiAnswerGatewayOptions): AnswerGateway {
  const apiKey = options.apiKey.trim();
  const model = options.model?.trim() || defaultModel;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const now = options.now ?? (() => Date.now());
  if (apiKey.length === 0)
    throw new Error("A chave da Gemini é obrigatória para habilitar o gateway.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1)
    throw new Error("O timeout da Gemini é inválido.");

  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      const prompt = buildAnswerPrompt(input);
      const startedAt = now();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetchImplementation(interactionsUrl, {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: requestBody(input, model)
        });
        if (!response.ok) {
          throw new AnswerGatewayUnavailableError(providerFailureMessage(response.status));
        }
        const providerResponse = (await response.json()) as GeminiInteraction;
        if (providerResponse.status !== "completed") {
          throw new AnswerGatewayUnavailableError("A Gemini não concluiu a resposta.");
        }
        const text = outputText(providerResponse);
        if (text === undefined)
          throw new AnswerGatewayUnavailableError("A Gemini não retornou texto.");
        const isConversation = input.evidence.length === 0;
        const output = isConversation
          ? conversationalOutput(text)
          : canonicalizeCitations(parseOutput(text), input);
        const finishedAt = now();
        return Object.freeze({
          output,
          telemetry: Object.freeze({
            providerKey: "google",
            modelKey: model,
            modelVersion: "api-interactions-v1beta",
            promptVersion: answerPromptVersion,
            pipelineVersion: answerPipelineVersion,
            taskType: input.task,
            riskClass: input.riskClass,
            routingReason: isConversation
              ? "Gemini configurada para orientação condominial conversacional"
              : "Gemini configurada para resposta documental estruturada",
            status: "completed" as const,
            inputTokens: providerResponse.usage?.total_input_tokens ?? 0,
            outputTokens: providerResponse.usage?.total_output_tokens ?? 0,
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
        if (error instanceof AnswerGatewayUnavailableError) throw error;
        throw new AnswerGatewayUnavailableError(
          "Não foi possível consultar a Gemini com segurança."
        );
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    }
  });
}

export function createGeminiAnswerGatewayFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): AnswerGateway | undefined {
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return undefined;
  const timeoutMs = Number(environment.GEMINI_TIMEOUT_MS);
  return createGeminiAnswerGateway({
    apiKey,
    ...(environment.GEMINI_MODEL === undefined ? {} : { model: environment.GEMINI_MODEL }),
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {})
  });
}
