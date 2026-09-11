import { createHash, randomUUID } from "node:crypto";

import type { AnswerMode, GroundedAnswer } from "./answer-service.js";
import { answerPromptVersion, taskClassForEvidence } from "./answer-service.js";
import type { CondominiumId } from "../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { ScopedRetrievalResult } from "../retrieval/retrieval-contract.js";

export const answerTraceSchemaVersion = "answer-trace-v1" as const;
export const answerTraceProviderKey = "local-extractive" as const;
export const answerTraceUnitKind = "characters" as const;
export const maximumFeedbackCommentLength = 2_000;

export type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";

export type AnswerSourceRef = Readonly<{
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  page: number;
  contentSha256: string;
}>;

export type AnswerTrace = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  userId: string;
  questionSha256: string;
  responseSha256: string;
  answerMode: AnswerMode;
  sourceRefs: readonly AnswerSourceRef[];
  retrieval: Readonly<{
    pipelineVersion: string;
    queryHash: string;
    candidateCount: number;
    selectedCount: number;
    sufficiency: ScopedRetrievalResult["sufficiency"]["status"];
  }>;
  routing: Readonly<{
    taskClass: "economical" | "intermediate" | "advanced";
    promptVersion: typeof answerPromptVersion;
    schemaVersion: "grounded-answer-v1";
    providerKey: typeof answerTraceProviderKey;
  }>;
  usage: Readonly<{
    unitKind: typeof answerTraceUnitKind;
    inputUnits: number;
    outputUnits: number;
    estimatedCostMicros: number;
  }>;
  securityOutcome: Readonly<{
    answerMode: AnswerMode;
    evidenceTenantChecked: true;
    citationValidation: "performed";
  }>;
  latencyMs: number;
  createdAt: string;
}>;

export type AnswerFeedback = Readonly<{
  id: string;
  answerId: string;
  condominiumId: CondominiumId;
  userId: string;
  classification: FeedbackClassification;
  comment: string | null;
  sourceRefs: readonly AnswerSourceRef[];
  createdAt: string;
}>;

export type RecordAnswerTraceInput = Readonly<{
  id?: string;
  context: AuthorizedCondominiumContext;
  question: string;
  retrieval: ScopedRetrievalResult;
  response: GroundedAnswer;
  latencyMs: number;
  createdAt?: Date;
}>;

export type RecordFeedbackInput = Readonly<{
  answerId: string;
  classification: FeedbackClassification;
  comment?: string;
  createdAt?: Date;
}>;

export interface AnswerTraceStore {
  record(input: RecordAnswerTraceInput): Promise<AnswerTrace>;
  get(context: AuthorizedCondominiumContext, answerId: string): Promise<AnswerTrace | undefined>;
  recordFeedback(
    context: AuthorizedCondominiumContext,
    input: RecordFeedbackInput
  ): Promise<AnswerFeedback>;
  listFeedback(context: AuthorizedCondominiumContext): Promise<readonly AnswerFeedback[]>;
}

export class AnswerTraceNotFoundError extends Error {
  public constructor() {
    super("Resposta não encontrada no condomínio autorizado.");
    this.name = "AnswerTraceNotFoundError";
  }
}

export class InvalidAnswerFeedbackError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerFeedbackError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function freezeSourceRefs(retrieval: ScopedRetrievalResult): readonly AnswerSourceRef[] {
  return Object.freeze(
    retrieval.evidence.map((evidence) =>
      Object.freeze({
        chunkId: evidence.id,
        documentId: evidence.documentId,
        documentVersionId: evidence.documentVersionId,
        page: evidence.pageNumber,
        contentSha256: evidence.contentSha256
      })
    )
  );
}

function validateLatency(latencyMs: number): number {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    throw new Error("A latência da resposta deve ser um número finito não negativo.");
  }

  return Number(latencyMs.toFixed(3));
}

function validateFeedbackComment(comment: string | undefined): string | null {
  if (comment === undefined) {
    return null;
  }

  const normalized = comment.trim();
  if (normalized.length > maximumFeedbackCommentLength) {
    throw new InvalidAnswerFeedbackError("O comentário de feedback excede o limite permitido.");
  }

  return normalized.length === 0 ? null : normalized;
}

function isFeedbackClassification(value: string): value is FeedbackClassification {
  return ["correct", "incorrect", "incomplete", "outdated"].includes(value);
}

export function createInMemoryAnswerTraceStore(
  options: Readonly<{
    answerIdFactory?: () => string;
    feedbackIdFactory?: () => string;
  }> = {}
): AnswerTraceStore {
  const answers = new Map<string, AnswerTrace>();
  const feedback = new Map<string, AnswerFeedback>();
  const answerIdFactory = options.answerIdFactory ?? (() => `answer-${randomUUID()}`);
  const feedbackIdFactory = options.feedbackIdFactory ?? (() => `feedback-${randomUUID()}`);

  return Object.freeze({
    async record(input: RecordAnswerTraceInput): Promise<AnswerTrace> {
      const question = input.question.trim();
      if (question.length === 0) {
        throw new Error("A pergunta da trilha não pode ser vazia.");
      }

      const id = (input.id ?? answerIdFactory()).trim();
      if (id.length === 0) {
        throw new Error("O identificador da resposta não pode ser vazio.");
      }

      const createdAt = (input.createdAt ?? new Date()).toISOString();
      const sourceRefs = freezeSourceRefs(input.retrieval);
      const trace = Object.freeze({
        id,
        condominiumId: input.context.condominiumId,
        userId: input.context.userId,
        questionSha256: sha256(question),
        responseSha256: sha256(JSON.stringify(input.response)),
        answerMode: input.response.answerMode,
        sourceRefs,
        retrieval: Object.freeze({
          pipelineVersion: input.retrieval.pipelineVersion,
          queryHash: input.retrieval.queryHash,
          candidateCount: input.retrieval.candidateCount,
          selectedCount: input.retrieval.selectedCount,
          sufficiency: input.retrieval.sufficiency.status
        }),
        routing: Object.freeze({
          taskClass: taskClassForEvidence(input.retrieval.evidence),
          promptVersion: answerPromptVersion,
          schemaVersion: "grounded-answer-v1" as const,
          providerKey: answerTraceProviderKey
        }),
        usage: Object.freeze({
          unitKind: answerTraceUnitKind,
          inputUnits: question.length,
          outputUnits: input.response.answer.length,
          estimatedCostMicros: 0
        }),
        securityOutcome: Object.freeze({
          answerMode: input.response.answerMode,
          evidenceTenantChecked: true as const,
          citationValidation: "performed" as const
        }),
        latencyMs: validateLatency(input.latencyMs),
        createdAt
      });

      const key = `${trace.condominiumId}:${trace.id}`;
      if (answers.has(key)) {
        throw new Error("O identificador da resposta já está vinculado ao condomínio.");
      }
      answers.set(key, trace);
      return trace;
    },

    async get(context: AuthorizedCondominiumContext, answerId: string) {
      return answers.get(`${context.condominiumId}:${answerId.trim()}`);
    },

    async recordFeedback(context: AuthorizedCondominiumContext, input: RecordFeedbackInput) {
      const answerId = input.answerId.trim();
      const answer = answers.get(`${context.condominiumId}:${answerId}`);
      if (answer === undefined) {
        throw new AnswerTraceNotFoundError();
      }
      if (!isFeedbackClassification(input.classification)) {
        throw new InvalidAnswerFeedbackError("A classificação de feedback é inválida.");
      }

      const record = Object.freeze({
        id: feedbackIdFactory(),
        answerId: answer.id,
        condominiumId: context.condominiumId,
        userId: context.userId,
        classification: input.classification,
        comment: validateFeedbackComment(input.comment),
        sourceRefs: answer.sourceRefs,
        createdAt: (input.createdAt ?? new Date()).toISOString()
      });
      const key = `${record.condominiumId}:${record.id}`;
      feedback.set(key, record);
      return record;
    },

    async listFeedback(context: AuthorizedCondominiumContext) {
      return Object.freeze(
        [...feedback.values()].filter((item) => item.condominiumId === context.condominiumId)
      );
    }
  });
}
