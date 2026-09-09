import { randomUUID } from "node:crypto";

import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import {
  freezeAnswerPayload,
  specialistTypes,
  type AnswerPayload,
  type GeneratedAnswer,
  type GeneratedCitation,
  type SpecialistType
} from "./answer-contract.js";

export class InvalidAnswerValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerValidationError";
  }
}

function assertString(
  value: unknown,
  field: string,
  maximumLength = 10_000
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximumLength) {
    throw new InvalidAnswerValidationError(`O campo ${field} é inválido.`);
  }
}

function assertArray(value: unknown, field: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidAnswerValidationError(`O campo ${field} deve ser uma lista.`);
  }
}

function findExcerptStart(content: string, excerpt: string): number {
  const contentCharacters = Array.from(content);
  const excerptCharacters = Array.from(excerpt);
  if (excerptCharacters.length === 0 || excerptCharacters.length > contentCharacters.length) {
    return -1;
  }

  for (let index = 0; index <= contentCharacters.length - excerptCharacters.length; index += 1) {
    if (
      excerptCharacters.every(
        (character, offset) => contentCharacters[index + offset] === character
      )
    ) {
      return index;
    }
  }

  return -1;
}

function validateCitation(
  citation: GeneratedCitation,
  evidence: readonly RetrievalEvidence[],
  index: number
): GeneratedCitation & Readonly<{ startOffset: number; endOffset: number }> {
  assertString(citation.evidenceId, `citations[${index}].evidenceId`, 200);
  const source = evidence.find((item) => item.id === citation.evidenceId);
  if (source === undefined) {
    throw new InvalidAnswerValidationError("A citação aponta para uma evidência não autorizada.");
  }

  if (
    citation.documentId !== source.documentId ||
    citation.documentVersionId !== source.documentVersionId ||
    citation.title !== source.documentTitle ||
    citation.page !== source.pageNumber
  ) {
    throw new InvalidAnswerValidationError("Os metadados da citação não correspondem à evidência.");
  }
  assertString(citation.excerpt, `citations[${index}].excerpt`, 4_000);

  const localStart = findExcerptStart(source.content, citation.excerpt);
  if (localStart < 0) {
    throw new InvalidAnswerValidationError("O trecho citado não existe na evidência autorizada.");
  }

  const startOffset = source.startOffset + localStart;
  const endOffset = startOffset + Array.from(citation.excerpt).length;
  if (
    (citation.startOffset !== undefined && citation.startOffset !== startOffset) ||
    (citation.endOffset !== undefined && citation.endOffset !== endOffset)
  ) {
    throw new InvalidAnswerValidationError(
      "Os offsets da citação não correspondem ao trecho citado."
    );
  }

  return Object.freeze({
    ...citation,
    startOffset,
    endOffset
  });
}

function validateSpecialist(value: unknown): GeneratedAnswer["specialist"] {
  if (typeof value !== "object" || value === null) {
    throw new InvalidAnswerValidationError("O especialista da resposta é inválido.");
  }

  const specialist = value as {
    required?: unknown;
    type?: unknown;
    reason?: unknown;
  };
  if (typeof specialist.required !== "boolean") {
    throw new InvalidAnswerValidationError("O indicador de especialista é inválido.");
  }

  if (!specialist.required) {
    if (specialist.type !== null || specialist.reason !== null) {
      throw new InvalidAnswerValidationError(
        "Especialista não requerido não pode ter tipo ou motivo."
      );
    }
    return Object.freeze({ required: false, type: null, reason: null });
  }

  assertString(specialist.type, "specialist.type", 100);
  if (!specialistTypes.includes(specialist.type as SpecialistType)) {
    throw new InvalidAnswerValidationError("O tipo de especialista não é permitido.");
  }
  assertString(specialist.reason, "specialist.reason", 1_000);
  return Object.freeze({
    required: true,
    type: specialist.type as GeneratedAnswer["specialist"]["type"],
    reason: specialist.reason
  });
}

function validateClaims(
  claims: readonly NonNullable<GeneratedAnswer["claims"]>[number][],
  citations: readonly (GeneratedCitation & Readonly<{ startOffset: number; endOffset: number }>)[]
): void {
  const citedEvidenceIds = new Set(citations.map((citation) => citation.evidenceId));
  claims.forEach((claim, index) => {
    assertString(claim.statement, `claims[${index}].statement`, 10_000);
    if (!["condominium_fact", "interpretation", "recommendation"].includes(claim.claimType)) {
      throw new InvalidAnswerValidationError("O tipo da afirmação é inválido.");
    }
    if (typeof claim.evidenceRequired !== "boolean") {
      throw new InvalidAnswerValidationError("O indicador de evidência da afirmação é inválido.");
    }
    assertArray(claim.citationEvidenceIds, `claims[${index}].citationEvidenceIds`);
    if (
      (claim.claimType === "condominium_fact" || claim.claimType === "interpretation") &&
      !claim.evidenceRequired
    ) {
      throw new InvalidAnswerValidationError(
        "Fatos e interpretações documentais precisam exigir evidência."
      );
    }
    if (claim.evidenceRequired && claim.citationEvidenceIds.length === 0) {
      throw new InvalidAnswerValidationError("Afirmação factual sem citação é proibida.");
    }
    for (const evidenceId of claim.citationEvidenceIds) {
      assertString(evidenceId, `claims[${index}].citationEvidenceIds`, 200);
      if (!citedEvidenceIds.has(evidenceId)) {
        throw new InvalidAnswerValidationError("A afirmação referencia evidência não exibida.");
      }
    }
  });
}

export function validateGeneratedAnswer(
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[]
): AnswerPayload & Readonly<{ claims: readonly NonNullable<GeneratedAnswer["claims"]>[number][] }> {
  if (typeof generated !== "object" || generated === null) {
    throw new InvalidAnswerValidationError("A resposta gerada não é um objeto.");
  }
  assertString(generated.answer, "answer", 20_000);
  if (!["grounded", "abstained", "conflict", "failed"].includes(generated.answerMode)) {
    throw new InvalidAnswerValidationError("O modo da resposta é inválido.");
  }
  assertArray(generated.citations, "citations");
  assertArray(generated.attentionPoints, "attentionPoints");
  generated.attentionPoints.forEach((point, index) => {
    assertString(point, `attentionPoints[${index}]`, 2_000);
  });
  if (generated.suggestedNextStep !== null) {
    assertString(generated.suggestedNextStep, "suggestedNextStep", 2_000);
  }

  const specialist = validateSpecialist(generated.specialist);
  const citations = Object.freeze(
    generated.citations
      .map((citation, index) => validateCitation(citation, evidence, index))
      .map((citation) =>
        Object.freeze({
          id: randomUUID(),
          ...citation
        })
      )
  );

  if (
    (generated.answerMode === "grounded" || generated.answerMode === "conflict") &&
    citations.length === 0
  ) {
    throw new InvalidAnswerValidationError("Resposta com base documental precisa de citação.");
  }
  if (
    (generated.answerMode === "abstained" || generated.answerMode === "failed") &&
    citations.length > 0
  ) {
    throw new InvalidAnswerValidationError(
      "Abstenção ou falha não pode exibir citação como base confirmada."
    );
  }
  if (
    generated.answerMode === "conflict" &&
    new Set(citations.map((citation) => citation.evidenceId)).size < 2
  ) {
    throw new InvalidAnswerValidationError(
      "Conflito documental precisa citar as fontes conflitantes."
    );
  }

  const claims = Object.freeze(
    (generated.claims ?? []).map((claim) =>
      Object.freeze({
        statement: claim.statement,
        claimType: claim.claimType,
        evidenceRequired: claim.evidenceRequired,
        citationEvidenceIds: Object.freeze([...claim.citationEvidenceIds])
      })
    )
  );
  validateClaims(claims, citations);

  return Object.freeze({
    ...freezeAnswerPayload({
      answer: generated.answer,
      answerMode: generated.answerMode,
      citations,
      attentionPoints: Object.freeze([...generated.attentionPoints]),
      suggestedNextStep: generated.suggestedNextStep,
      specialist
    }),
    claims
  });
}
