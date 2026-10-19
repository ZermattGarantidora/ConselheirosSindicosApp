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
    input_tokens_details?: Readonly<{ cached_tokens?: number }>;
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

function outputText(response: OpenAiResponse): string {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new AnswerGatewayUnavailableError("A OpenAI não retornou uma resposta completa.");
}

function structuredAnswer(text: string, input: AnswerGatewayInput): GeneratedAnswer {
  let output: ProviderAnswer;
  try {
    output = JSON.parse(text) as ProviderAnswer;
  } catch {
    throw new AnswerGatewayUnavailableError(
      "A OpenAI não retornou uma resposta estruturada válida."
    );
  }
  const citations: GeneratedCitation[] = [];
  for (const candidate of Array.isArray(output.citations) ? output.citations : []) {
    const evidence = input.evidence.find((item) => item.id === candidate?.evidenceId);
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

function generalAnswer(text: string): GeneratedAnswer {
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

function requestBody(input: AnswerGatewayInput, prompt: string, model: string): string {
  const questionMarker = "\nQUESTION_START\n";
  const questionOffset = prompt.indexOf(questionMarker);
  if (questionOffset < 0) throw new Error("O prompt da Alvitra está incompleto.");
  return JSON.stringify({
    model,
    store: false,
    reasoning: { effort: "low" },
    input: [
      { role: "developer", content: prompt.slice(0, questionOffset) },
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
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const now = options.now ?? (() => Date.now());
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1)
    throw new Error("O timeout da OpenAI é inválido.");

  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      const prompt = buildAnswerPrompt(input);
      const startedAt = now();
      let response: Response;
      try {
        response = await fetchImplementation(responsesUrl, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: requestBody(input, prompt, model),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch {
        throw new AnswerGatewayUnavailableError(
          "Não foi possível consultar a OpenAI com segurança."
        );
      }
      if (!response.ok) throw new AnswerGatewayUnavailableError(failureMessage(response.status));
      let providerResponse: OpenAiResponse;
      try {
        providerResponse = (await response.json()) as OpenAiResponse;
      } catch {
        throw new AnswerGatewayUnavailableError("A OpenAI retornou uma resposta inválida.");
      }
      if (providerResponse.status !== "completed") {
        throw new AnswerGatewayUnavailableError("A OpenAI não concluiu a resposta.");
      }
      const text = outputText(providerResponse);
      const output =
        input.evidence.length === 0 ? generalAnswer(text) : structuredAnswer(text, input);
      return Object.freeze({
        output,
        telemetry: Object.freeze({
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
          status: "completed" as const,
          inputTokens: providerResponse.usage?.input_tokens ?? 0,
          outputTokens: providerResponse.usage?.output_tokens ?? 0,
          cachedInputTokens: providerResponse.usage?.input_tokens_details?.cached_tokens ?? 0,
          latencyMs: Math.max(0, now() - startedAt),
          estimatedCostMicrounits: 0,
          costCurrency: "BRL" as const,
          inputHash: hash(prompt),
          outputHash: hash(text),
          errorCode: null
        })
      });
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
  return createOpenAiAnswerGateway({
    apiKey,
    ...(environment.OPENAI_ANSWER_MODEL === undefined
      ? {}
      : { model: environment.OPENAI_ANSWER_MODEL }),
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {})
  });
}
