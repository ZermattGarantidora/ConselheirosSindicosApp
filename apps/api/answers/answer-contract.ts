import type { CondominiumId } from "../core/condominium-scope.js";
import type { UserId } from "../identity/authorized-condominium-context.js";

export const answerSchemaVersion = "answer-v1" as const;
export const answerPipelineVersion = "answer-pipeline-v1" as const;

export type AnswerMode = "grounded" | "abstained" | "conflict" | "failed";
export type RiskClass = "low" | "medium" | "high";
export type ClaimType = "condominium_fact" | "interpretation" | "recommendation";

export const specialistTypes = [
  "advogado",
  "contador",
  "engenheiro",
  "responsável técnico",
  "seguradora",
  "especialista em proteção de dados"
] as const;

export type SpecialistType = (typeof specialistTypes)[number];

export type AnswerSpecialist = Readonly<{
  required: boolean;
  type: SpecialistType | null;
  reason: string | null;
}>;

export type GeneratedCitation = Readonly<{
  evidenceId: string;
  documentId: string;
  documentVersionId: string;
  title: string;
  page: number;
  excerpt: string;
  startOffset?: number;
  endOffset?: number;
}>;

export type GeneratedClaim = Readonly<{
  statement: string;
  claimType: ClaimType;
  evidenceRequired: boolean;
  citationEvidenceIds: readonly string[];
}>;

export type GeneratedAnswer = Readonly<{
  answer: string;
  answerMode: AnswerMode;
  citations: readonly GeneratedCitation[];
  attentionPoints: readonly string[];
  suggestedNextStep: string | null;
  specialist: AnswerSpecialist;
  claims?: readonly GeneratedClaim[];
}>;

export type AnswerCitation = Readonly<{
  id: string;
  evidenceId: string;
  documentId: string;
  documentVersionId: string;
  title: string;
  page: number;
  excerpt: string;
  startOffset: number;
  endOffset: number;
}>;

export type AnswerClaim = Readonly<{
  id: string;
  statement: string;
  claimType: ClaimType;
  evidenceRequired: boolean;
  citationEvidenceIds: readonly string[];
}>;

export type AnswerPayload = Readonly<{
  answer: string;
  answerMode: AnswerMode;
  citations: readonly AnswerCitation[];
  attentionPoints: readonly string[];
  suggestedNextStep: string | null;
  specialist: AnswerSpecialist;
}>;

export type AnswerRecord = Readonly<
  AnswerPayload & {
    answerId: string;
    questionId: string;
    condominiumId: CondominiumId;
    userId: UserId;
    riskClass: RiskClass;
    schemaVersion: typeof answerSchemaVersion;
    promptVersion: string;
    pipelineVersion: typeof answerPipelineVersion;
    validationStatus: "passed" | "failed";
    claims: readonly AnswerClaim[];
    createdAt: Date;
    requestId: string | null;
  }
>;

export type PublicAnswer = Readonly<
  AnswerPayload & {
    answerId: string;
    questionId: string;
    condominiumId: CondominiumId;
    riskClass: RiskClass;
    createdAt: string;
  }
>;

export function freezeAnswerPayload(payload: AnswerPayload): AnswerPayload {
  return Object.freeze({
    ...payload,
    citations: Object.freeze(payload.citations.map((citation) => Object.freeze({ ...citation }))),
    attentionPoints: Object.freeze([...payload.attentionPoints]),
    specialist: Object.freeze({ ...payload.specialist })
  });
}

export function toPublicAnswer(record: AnswerRecord): PublicAnswer {
  return Object.freeze({
    answer: record.answer,
    answerMode: record.answerMode,
    citations: record.citations,
    attentionPoints: record.attentionPoints,
    suggestedNextStep: record.suggestedNextStep,
    specialist: record.specialist,
    answerId: record.answerId,
    questionId: record.questionId,
    condominiumId: record.condominiumId,
    riskClass: record.riskClass,
    createdAt: record.createdAt.toISOString()
  });
}
