import type { CondominiumId } from "../core/condominium-scope.js";
import type { RetrievalEvidence, ScopedRetrievalResult } from "../retrieval/retrieval-contract.js";
import type {
  AuthorizedCondominiumContext,
  UserId
} from "../identity/authorized-condominium-context.js";
import type { AnswerClaim, AnswerRecord, RiskClass } from "./answer-contract.js";

export type QuestionRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  userId: UserId;
  content: string;
  language: "pt-BR";
  idempotencyKey: string;
  requestId: string;
  createdAt: Date;
}>;

export type RetrievalRunRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  questionId: string;
  status: "completed" | "failed";
  pipelineVersion: string;
  riskClass: RiskClass;
  queryHash: string;
  startedAt: Date;
  finishedAt: Date;
  candidateCount: number;
  selectedCount: number;
  failureCode: string | null;
}>;

export type RetrievalEvidenceRecord = Readonly<{
  id: string;
  retrievalRunId: string;
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  pageId: string;
  rank: number;
  lexicalScore: number;
  semanticScore: number | null;
  rerankScore: number;
  selectedForGeneration: boolean;
  sufficiencyFlags: readonly string[];
}>;

export type ModelInvocationRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  questionId: string;
  retrievalRunId: string;
  answerId: string;
  taskType: string;
  riskClass: RiskClass;
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  promptVersion: string;
  pipelineVersion: string;
  routingReason: string;
  status: "completed" | "failed" | "skipped";
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  latencyMs: number;
  estimatedCostMicrounits: number;
  costCurrency: "BRL";
  inputHash: string;
  outputHash: string | null;
  errorCode: string | null;
  evidenceIds: readonly string[];
  createdAt: Date;
}>;

export type AuditEventRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  actorType: "user" | "system";
  actorUserId: UserId | null;
  eventType: "question_created" | "answer_created" | "answer_failed" | "feedback_created";
  subjectType: "question" | "answer" | "feedback";
  subjectId: string;
  requestId: string;
  correlationId: string;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  createdAt: Date;
}>;

export type PersistedInteraction = Readonly<{
  question: QuestionRecord;
  retrieval: RetrievalRunRecord;
  evidence: readonly RetrievalEvidenceRecord[];
  answer: AnswerRecord;
  claims: readonly AnswerClaim[];
  invocations: readonly ModelInvocationRecord[];
  auditEvents: readonly AuditEventRecord[];
}>;

export type ConversationHistoryEntry = Readonly<{
  questionId: string;
  question: string;
  answer: AnswerRecord;
  createdAt: Date;
}>;

export type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";

export type FeedbackRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  answerId: string;
  submittedByUserId: UserId;
  classification: FeedbackClassification;
  comment: string | null;
  createdAt: Date;
}>;

export type SubmitFeedbackInput = Readonly<{
  answerId: string;
  classification: FeedbackClassification;
  comment: string | null;
  requestId?: string;
}>;

export interface AnswerPersistence {
  saveInteraction(input: PersistedInteraction): Promise<void>;
  findAnswerByIdempotencyKey(
    context: AuthorizedCondominiumContext,
    idempotencyKey: string
  ): Promise<AnswerRecord | undefined>;
  findAnswer(
    context: AuthorizedCondominiumContext,
    answerId: string
  ): Promise<AnswerRecord | undefined>;
  listConversationHistory(
    context: AuthorizedCondominiumContext,
    limit?: number
  ): Promise<readonly ConversationHistoryEntry[]>;
  createFeedback(
    context: AuthorizedCondominiumContext,
    input: SubmitFeedbackInput
  ): Promise<FeedbackRecord | undefined>;
}

export function retrievalEvidenceRecordFromResult(
  retrievalRunId: string,
  result: ScopedRetrievalResult
): readonly RetrievalEvidenceRecord[] {
  return Object.freeze(
    result.evidence.map((evidence: RetrievalEvidence) =>
      Object.freeze({
        id: evidence.id,
        retrievalRunId,
        condominiumId: evidence.condominiumId,
        documentId: evidence.documentId,
        documentVersionId: evidence.documentVersionId,
        pageId: evidence.pageId,
        rank: evidence.rank,
        lexicalScore: evidence.lexicalScore,
        semanticScore: evidence.semanticScore,
        rerankScore: evidence.rerankScore,
        selectedForGeneration: true,
        sufficiencyFlags: Object.freeze([
          evidence.qualityScore < 0.7 ? "quality_below_default" : "quality_ok",
          evidence.processingStatus === "ready" ? "processing_ready" : "processing_review"
        ])
      })
    )
  );
}

export function isFeedbackClassification(value: unknown): value is FeedbackClassification {
  return (
    value === "correct" || value === "incorrect" || value === "incomplete" || value === "outdated"
  );
}

export function validateFeedbackInput(input: SubmitFeedbackInput): void {
  if (input.answerId.trim().length === 0 || input.answerId.length > 200) {
    throw new Error("O identificador da resposta é inválido.");
  }
  if (!isFeedbackClassification(input.classification)) {
    throw new Error("A classificação do feedback é inválida.");
  }
  if (
    input.requestId !== undefined &&
    (input.requestId.trim().length === 0 || input.requestId.length > 200)
  ) {
    throw new Error("O identificador da requisição do feedback é inválido.");
  }
  if (
    input.comment !== null &&
    (input.comment.length > 2_000 || input.comment.trim().length === 0)
  ) {
    throw new Error("O comentário do feedback deve ter até 2.000 caracteres.");
  }
}
