import { createHash } from "node:crypto";

import {
  answerPipelineVersion,
  specialistTypes,
  type GeneratedAnswer,
  type GeneratedCitation
} from "./answer-contract.js";
import {
  AnswerGatewayUnavailableError,
  attachGatewayErrorTelemetry,
  type AnswerGateway,
  type AnswerGatewayInput,
  type AnswerGatewayResult
} from "./answer-gateway.js";
import { answerPromptVersion, buildAnswerPrompt } from "./prompt-catalog.js";
import { InvalidAnswerValidationError } from "./citation-validator.js";
import {
  answerRoutingMode,
  createRoutedAnswerGateway,
  routedReasoningEfforts
} from "./answer-model-routing.js";
import { accountOpenAiUsage } from "./usage-accounting.js";

const responsesUrl = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-6.1-sol";
const defaultTimeoutMs = 45_000;

type OpenAiResponse = Readonly<{
  status?: string;
  output?: readonly Readonly<{
    type?: string;
    content?: readonly Readonly<{ type?: string; text?: string }>[];
  }>[];
  usage?: Readonly<{
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: Readonly<{
      cached_tokens?: number;
      cache_write_tokens?: number;
      cache_write_tokens_details?: Readonly<{ ttl_30m_tokens?: number; ttl_12h_tokens?: number }>;
    }>;
    output_tokens_details?: Readonly<{ reasoning_tokens?: number }>;
  }>;
}>;

type ProviderAnswer = Readonly<
  Omit<GeneratedAnswer, "citations"> & {
    citations: readonly Readonly<{ evidenceId: string }>[];
  }
>;

export type OpenAiAnswerGatewayOptions = Readonly<{
  apiKey: string;
  model?: string;
  reasoningEffort?: "low" | "high";
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  now?: () => number;
}>;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function recordedTokens(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function answerSchema(evidence?: AnswerGatewayInput["evidence"]) {
  // Em uma comparação com minuta, todas as afirmações documentais são
  // interpretações conservadoras; restringir só IDs incentivava trocar a citação.
  const factualIds = evidence?.some((source) =>
    ["pending", "disputed", "superseded"].includes(source.validityStatus)
  )
    ? []
    : evidence?.map((source) => source.id);
  const documentaryClaim = (type: "condominium_fact" | "interpretation") => ({
    type: "object",
    additionalProperties: false,
    required: ["statement", "claimType", "evidenceRequired", "citationEvidenceIds"],
    properties: {
      statement: { type: "string" },
      claimType: { type: "string", enum: [type] },
      evidenceRequired: { type: "boolean", enum: [true] },
      citationEvidenceIds: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          ...(type === "condominium_fact" && factualIds ? { enum: factualIds } : {})
        }
      }
    }
  });
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
      answerMode: {
        type: "string",
        enum: ["grounded", "conflict", "abstained"]
      },
      citations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["evidenceId"],
          properties: { evidenceId: { type: "string" } }
        }
      },
      attentionPoints: { type: "array", items: { type: "string" } },
      suggestedNextStep: { type: ["string", "null"] },
      specialist: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["required", "type", "reason"],
            properties: {
              required: { type: "boolean", enum: [false] },
              type: { type: "null" },
              reason: { type: "null" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["required", "type", "reason"],
            properties: {
              required: { type: "boolean", enum: [true] },
              type: { type: "string", enum: [...specialistTypes] },
              reason: { type: "string" }
            }
          }
        ]
      },
      claims: {
        type: "array",
        items: {
          anyOf: [
            ...(factualIds?.length === 0 ? [] : [documentaryClaim("condominium_fact")]),
            documentaryClaim("interpretation"),
            {
              type: "object",
              additionalProperties: false,
              required: ["statement", "claimType", "evidenceRequired", "citationEvidenceIds"],
              properties: {
                statement: { type: "string" },
                claimType: { type: "string", enum: ["recommendation"] },
                evidenceRequired: { type: "boolean" },
                citationEvidenceIds: { type: "array", items: { type: "string" } }
              }
            }
          ]
        }
      }
    }
  } as const;
}

function outputText(response: OpenAiResponse): string {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new AnswerGatewayUnavailableError("A OpenAI não retornou uma resposta completa.");
}

export function structuredAnswer(text: string, input: AnswerGatewayInput): GeneratedAnswer {
  let output: ProviderAnswer;
  try {
    output = JSON.parse(text) as ProviderAnswer;
  } catch {
    throw new AnswerGatewayUnavailableError(
      "A OpenAI não retornou uma resposta estruturada válida."
    );
  }
  const citations: GeneratedCitation[] = [];
  const citationReferences = [
    ...(Array.isArray(output.citations) ? output.citations : []),
    ...(Array.isArray(output.claims)
      ? output.claims.flatMap((claim) =>
          Array.isArray(claim?.citationEvidenceIds)
            ? claim.citationEvidenceIds.map((evidenceId: string) => ({ evidenceId }))
            : []
        )
      : [])
  ];
  for (const candidate of citationReferences) {
    const evidence = input.evidence.find((item) => item.id === candidate?.evidenceId);
    if (evidence === undefined)
      throw new InvalidAnswerValidationError(
        "A citação aponta para uma evidência não autorizada.",
        "citation_not_authorized"
      );
    if (citations.some((citation) => citation.evidenceId === evidence.id)) continue;
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

export function generalAnswer(text: string): GeneratedAnswer {
  const answer = text.trim();
  if (answer.length === 0) throw new AnswerGatewayUnavailableError("A OpenAI não retornou texto.");
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

function requestBody(
  input: AnswerGatewayInput,
  prompt: string,
  model: string,
  reasoningEffort: "low" | "high"
): string {
  const questionMarker = "\nQUESTION_START\n";
  const questionOffset = prompt.indexOf(questionMarker);
  if (questionOffset < 0) throw new Error("O prompt da Alvitra está incompleto.");
  const cacheInstructions = model === "gpt-6-luna" || model === "gpt-6.1-sol";
  const taskOffset = prompt.indexOf("\nTASK=");
  if (cacheInstructions && (taskOffset < 0 || taskOffset >= questionOffset))
    throw new Error("O prefixo de instruções da Alvitra está incompleto.");
  return JSON.stringify({
    model,
    store: false,
    reasoning: { effort: reasoningEffort },
    ...(cacheInstructions ? { prompt_cache_options: { mode: "explicit", ttl: "30m" } } : {}),
    input: [
      ...(cacheInstructions
        ? [
            {
              role: "developer",
              content: [
                {
                  type: "input_text",
                  text: prompt.slice(0, taskOffset),
                  prompt_cache_breakpoint: { mode: "explicit" }
                }
              ]
            },
            { role: "developer", content: prompt.slice(taskOffset + 1, questionOffset) }
          ]
        : [{ role: "developer", content: prompt.slice(0, questionOffset) }]),
      { role: "user", content: prompt.slice(questionOffset + 1) }
    ],
    max_output_tokens: input.budget.maximumOutputTokens,
    ...(input.evidence.length === 0
      ? {}
      : {
          text: {
            format: {
              type: "json_schema",
              name: "alvitra_answer",
              strict: true,
              schema: answerSchema()
            }
          }
        })
  });
}

function failureMessage(status: number): string {
  if (status === 401 || status === 403)
    return "A chave da OpenAI não está autorizada para esta API.";
  if (status === 429) return "O limite de uso da OpenAI foi atingido temporariamente.";
  if (status >= 500) return "A OpenAI está indisponível no momento.";
  return "A OpenAI não aceitou a solicitação neste momento.";
}

export function createOpenAiAnswerGateway(options: OpenAiAnswerGatewayOptions): AnswerGateway {
  const apiKey = options.apiKey.trim();
  if (apiKey.length === 0)
    throw new Error("A chave da OpenAI é obrigatória para habilitar o gateway.");
  const model = options.model?.trim() || defaultModel;
  const reasoningEffort = options.reasoningEffort ?? "low";
  if (reasoningEffort !== "low" && reasoningEffort !== "high")
    throw new Error("O esforço OpenAI deve ser low ou high.");
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const now = options.now ?? (() => Date.now());
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1)
    throw new Error("O timeout da OpenAI é inválido.");

  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      const prompt = buildAnswerPrompt(input);
      const startedAt = now();
      let providerResponse: OpenAiResponse | undefined;
      let errorCode = "provider_transport_error";
      const telemetry = (
        status: "completed" | "failed",
        outputHash: string | null,
        failure: string | null
      ) => {
        const accounting = accountOpenAiUsage(model, providerResponse?.usage);
        const validCounters = accounting.unavailableReason !== "usage_invalid";
        return Object.freeze({
          providerKey: "openai",
          modelKey: model,
          modelVersion: "responses-v1",
          promptVersion: answerPromptVersion,
          pipelineVersion: answerPipelineVersion,
          taskType: input.task,
          riskClass: input.riskClass,
          routingReason:
            input.evidence.length === 0
              ? "OpenAI configurada para orientação geral"
              : "OpenAI configurada para resposta com evidências",
          status,
          inputTokens: validCounters ? recordedTokens(providerResponse?.usage?.input_tokens) : 0,
          outputTokens: validCounters ? recordedTokens(providerResponse?.usage?.output_tokens) : 0,
          cachedInputTokens: validCounters
            ? recordedTokens(providerResponse?.usage?.input_tokens_details?.cached_tokens)
            : 0,
          usageAccounting: accounting,
          latencyMs: Math.max(0, now() - startedAt),
          estimatedCostMicrounits: 0,
          costCurrency: "BRL" as const,
          inputHash: hash(prompt),
          outputHash,
          errorCode: failure
        });
      };
      try {
        input.signal?.throwIfAborted();
        const response = await fetchImplementation(responsesUrl, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: requestBody(input, prompt, model, reasoningEffort),
          signal: input.signal
            ? AbortSignal.any([input.signal, AbortSignal.timeout(timeoutMs)])
            : AbortSignal.timeout(timeoutMs)
        });
        errorCode = "provider_http_error";
        if (!response.ok) {
          // Mesmo uma rejeição HTTP pode trazer consumo; não conservar o corpo de erro.
          try {
            providerResponse = (await response.json()) as OpenAiResponse;
          } catch {
            /* uso desconhecido */
          }
          throw new AnswerGatewayUnavailableError(failureMessage(response.status));
        }
        errorCode = "provider_invalid_json";
        try {
          providerResponse = (await response.json()) as OpenAiResponse;
        } catch {
          throw new AnswerGatewayUnavailableError("A OpenAI retornou uma resposta inválida.");
        }
        errorCode = "provider_incomplete";
        if (providerResponse?.status !== "completed")
          throw new AnswerGatewayUnavailableError("A OpenAI não concluiu a resposta.");
        errorCode = "provider_output_rejected";
        const text = outputText(providerResponse);
        const output =
          input.evidence.length === 0 ? generalAnswer(text) : structuredAnswer(text, input);
        return Object.freeze({ output, telemetry: telemetry("completed", hash(text), null) });
      } catch (error) {
        const safeError =
          error instanceof AnswerGatewayUnavailableError ||
          error instanceof InvalidAnswerValidationError
            ? error
            : new AnswerGatewayUnavailableError(
                "Não foi possível consultar a OpenAI com segurança."
              );
        attachGatewayErrorTelemetry(
          safeError,
          telemetry(
            "failed",
            null,
            error instanceof InvalidAnswerValidationError ? error.code : errorCode
          )
        );
        throw safeError;
      }
    }
  });
}

export function createOpenAiAnswerGatewayFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): AnswerGateway | undefined {
  if (environment.OPENAI_ANSWER_ENABLED?.trim().toLowerCase() === "false") return undefined;
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return undefined;
  const timeoutMs = Number(environment.OPENAI_ANSWER_TIMEOUT_MS);
  const options = {
    apiKey,
    ...(environment.OPENAI_ANSWER_MODEL === undefined
      ? {}
      : { model: environment.OPENAI_ANSWER_MODEL }),
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {})
  };
  const routing = answerRoutingMode(environment.OPENAI_ANSWER_ROUTING, "OPENAI_ANSWER_ROUTING");
  if (routing === "hybrid")
    return createRoutedAnswerGateway({
      "gpt-6-luna": createOpenAiAnswerGateway({
        ...options,
        model: "gpt-6-luna",
        reasoningEffort: routedReasoningEfforts["gpt-6-luna"]
      }),
      "gpt-6.1-sol": createOpenAiAnswerGateway({
        ...options,
        model: "gpt-6.1-sol",
        reasoningEffort: routedReasoningEfforts["gpt-6.1-sol"]
      })
    });
  return createOpenAiAnswerGateway(options);
}
