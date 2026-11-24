import { randomUUID } from "node:crypto";
import { answerFidelityFailure } from "./answer-fidelity.js";
import type { IntegralSumSummary } from "../analysis/integral-document-sum.js";
import { cleanTrailingSourceMarker } from "./documentary-execution.js";
import { withFinancialCurrencyCitations } from "./source-monetary-amounts.js";
import { contradictsDocumentAvailability } from "./document-availability.js";

import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import {
  freezeAnswerPayload,
  specialistTypes,
  type AnswerPayload,
  type GeneratedAnswer,
  type GeneratedCitation,
  type SpecialistType
} from "./answer-contract.js";

export const answerValidationCodes = [
  "temporal_order_mismatch",
  "unproven_execution_assertion",
  "specialist_type_invalid",
  "specialist_metadata_invalid",
  "specialist_reason_contradiction",
  "answer_schema_invalid",
  "answer_body_protocol_json",
  "mode_incompatible",
  "citation_not_authorized",
  "citation_metadata_mismatch",
  "citation_excerpt_mismatch",
  "citation_offsets_mismatch",
  "claim_type_invalid",
  "claim_evidence_required",
  "claim_citation_missing",
  "claim_local_source_required",
  "claim_citation_not_displayed",
  "mode_citation_mismatch",
  "conflict_sources_missing",
  "pending_source_as_confirmed",
  "unsupported_monetary_assertion",
  "financial_result_scope_mismatch",
  "abstention_local_assertion",
  "document_availability_mismatch",
  "task_coverage_missing",
  "task_entity_missing"
] as const;
export type AnswerValidationCode = (typeof answerValidationCodes)[number];

export class InvalidAnswerValidationError extends Error {
  public constructor(
    message: string,
    public readonly code: AnswerValidationCode = "answer_schema_invalid",
    public readonly missingCoverageKeys: readonly string[] = []
  ) {
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
  if (typeof citation !== "object" || citation === null)
    throw new InvalidAnswerValidationError("A citação é inválida.");
  assertString(citation.evidenceId, `citations[${index}].evidenceId`, 200);
  const source = evidence.find((item) => item.id === citation.evidenceId);
  if (source === undefined) {
    throw new InvalidAnswerValidationError(
      "A citação aponta para uma evidência não autorizada.",
      "citation_not_authorized"
    );
  }

  if (
    citation.documentId !== source.documentId ||
    citation.documentVersionId !== source.documentVersionId ||
    citation.title !== source.documentTitle ||
    citation.page !== source.pageNumber
  ) {
    throw new InvalidAnswerValidationError(
      "Os metadados da citação não correspondem à evidência.",
      "citation_metadata_mismatch"
    );
  }
  assertString(citation.excerpt, `citations[${index}].excerpt`, 4_000);

  const localStart = findExcerptStart(source.content, citation.excerpt);
  if (localStart < 0) {
    throw new InvalidAnswerValidationError(
      "O trecho citado não existe na evidência autorizada.",
      "citation_excerpt_mismatch"
    );
  }

  const startOffset = source.startOffset + localStart;
  const endOffset = startOffset + Array.from(citation.excerpt).length;
  if (
    (citation.startOffset !== undefined && citation.startOffset !== startOffset) ||
    (citation.endOffset !== undefined && citation.endOffset !== endOffset)
  ) {
    throw new InvalidAnswerValidationError(
      "Os offsets da citação não correspondem ao trecho citado.",
      "citation_offsets_mismatch"
    );
  }

  return Object.freeze({
    ...citation,
    sourceScope: source.sourceScope ?? "condominium",
    startOffset,
    endOffset
  });
}

export function validateSpecialist(value: unknown): GeneratedAnswer["specialist"] {
  if (typeof value !== "object" || value === null) {
    throw new InvalidAnswerValidationError(
      "O especialista da resposta é inválido.",
      "specialist_metadata_invalid"
    );
  }

  const specialist = value as {
    required?: unknown;
    type?: unknown;
    reason?: unknown;
  };
  if (typeof specialist.required !== "boolean") {
    throw new InvalidAnswerValidationError(
      "O indicador de especialista é inválido.",
      "specialist_metadata_invalid"
    );
  }

  if (!specialist.required) {
    if (specialist.type !== null || specialist.reason !== null) {
      throw new InvalidAnswerValidationError(
        "Especialista não requerido não pode ter tipo ou motivo.",
        "specialist_metadata_invalid"
      );
    }
    return Object.freeze({ required: false, type: null, reason: null });
  }

  assertString(specialist.type, "specialist.type", 100);
  if (!specialistTypes.includes(specialist.type as SpecialistType)) {
    throw new InvalidAnswerValidationError(
      "O tipo de especialista não é permitido.",
      "specialist_type_invalid"
    );
  }
  assertString(specialist.reason, "specialist.reason", 1_000);
  const reason = specialist.reason
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
  const targets: Record<SpecialistType, string> = {
    contador: "contador|validacao contabil|revisao contabil",
    advogado: "advogado|validacao juridica|revisao juridica",
    engenheiro: "engenheiro|validacao de engenharia|avaliacao de engenharia|validacao tecnica",
    "responsável técnico": "responsavel tecnico|validacao tecnica|avaliacao tecnica",
    seguradora: "seguradora|validacao securitaria",
    "especialista em proteção de dados":
      "especialista em protecao de dados|validacao de protecao de dados"
  };
  const target = `(?:validacao humana|especialista|${targets[specialist.type as SpecialistType]})`;
  if (
    new RegExp(
      `\\b(?:nao (?:e|sera|seria) necessari[oa]\\s+(?:(?:um|uma|o|a) )?${target}|nao (?:ha|existe) necessidade de (?:(?:um|uma|o|a) )?${target}|${target} (?:e|sera|seria) desnecessari[oa])\\b`,
      "u"
    ).test(reason)
  )
    throw new InvalidAnswerValidationError(
      "O motivo nega a necessidade do especialista indicado.",
      "specialist_reason_contradiction"
    );
  return Object.freeze({
    required: true,
    type: specialist.type as GeneratedAnswer["specialist"]["type"],
    reason: specialist.reason
  });
}

function containsProtocolEnvelope(text: string): boolean {
  const objects: string[] = [];
  let start = -1,
    depth = 0,
    quoted = false,
    escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (start < 0) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) {
      objects.push(text.slice(start, index + 1));
      start = -1;
    }
  }
  const candidates = [
    ...objects,
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gu)].map((match) => match[1]!)
  ];
  return candidates.some((candidate) => {
    try {
      const value: unknown = JSON.parse(candidate);
      return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        ("answer" in value || "response" in value) &&
        "answerMode" in value &&
        ["citations", "claims", "attentionPoints", "suggestedNextStep", "specialist"].some(
          (key) => key in value
        )
      );
    } catch {
      return false;
    }
  });
}

function validateClaims(
  claims: readonly NonNullable<GeneratedAnswer["claims"]>[number][],
  citations: readonly (GeneratedCitation & Readonly<{ startOffset: number; endOffset: number }>)[],
  evidence: readonly RetrievalEvidence[]
): void {
  const citedEvidenceIds = new Set(citations.map((citation) => citation.evidenceId));
  claims.forEach((claim, index) => {
    assertString(claim.statement, `claims[${index}].statement`, 10_000);
    if (!["condominium_fact", "interpretation", "recommendation"].includes(claim.claimType)) {
      throw new InvalidAnswerValidationError(
        "O tipo da afirmação é inválido.",
        "claim_type_invalid"
      );
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
        "Fatos e interpretações documentais precisam exigir evidência.",
        "claim_evidence_required"
      );
    }
    if (claim.evidenceRequired && claim.citationEvidenceIds.length === 0) {
      throw new InvalidAnswerValidationError(
        "Afirmação factual sem citação é proibida.",
        "claim_citation_missing"
      );
    }
    if (
      claim.claimType === "condominium_fact" &&
      claim.citationEvidenceIds.length > 0 &&
      claim.citationEvidenceIds.every((evidenceId) =>
        citations.some(
          (citation) => citation.evidenceId === evidenceId && citation.sourceScope === "legislation"
        )
      )
    ) {
      throw new InvalidAnswerValidationError(
        "Um fato do condomínio não pode ser sustentado apenas por legislação.",
        "claim_local_source_required"
      );
    }
    if (
      claim.claimType === "condominium_fact" &&
      claim.citationEvidenceIds.some((id) =>
        evidence.some(
          (item) =>
            item.id === id && ["pending", "disputed", "superseded"].includes(item.validityStatus)
        )
      )
    ) {
      throw new InvalidAnswerValidationError(
        "Versão pendente não confirma fato ou regra vigente.",
        "pending_source_as_confirmed"
      );
    }
    for (const evidenceId of claim.citationEvidenceIds) {
      assertString(evidenceId, `claims[${index}].citationEvidenceIds`, 200);
      if (!citedEvidenceIds.has(evidenceId)) {
        throw new InvalidAnswerValidationError(
          "A afirmação referencia evidência não exibida.",
          "claim_citation_not_displayed"
        );
      }
    }
  });
}

export function validateGeneratedAnswer(
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[],
  computation?: IntegralSumSummary
): AnswerPayload & Readonly<{ claims: readonly NonNullable<GeneratedAnswer["claims"]>[number][] }> {
  if (typeof generated !== "object" || generated === null) {
    throw new InvalidAnswerValidationError("A resposta gerada não é um objeto.");
  }
  assertString(generated.answer, "answer", 20_000);
  if (containsProtocolEnvelope(generated.answer))
    throw new InvalidAnswerValidationError(
      "A fala contém o envelope do protocolo em vez da resposta.",
      "answer_body_protocol_json"
    );
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
  // Validar primeiro as referências geradas; contexto suplementar nunca corrige um ID falso.
  const checkedCitations = generated.citations.map((citation, index) =>
    validateCitation(citation, evidence, index)
  );
  const citations = Object.freeze(
    withFinancialCurrencyCitations(checkedCitations, evidence)
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
    throw new InvalidAnswerValidationError(
      "Resposta com base documental precisa de citação.",
      "mode_citation_mismatch"
    );
  }
  if (
    (generated.answerMode === "abstained" || generated.answerMode === "failed") &&
    citations.length > 0
  ) {
    throw new InvalidAnswerValidationError(
      "Abstenção ou falha não pode exibir citação como base confirmada.",
      "mode_citation_mismatch"
    );
  }
  if (
    generated.answerMode === "conflict" &&
    new Set(citations.map((citation) => citation.evidenceId)).size < 2
  ) {
    throw new InvalidAnswerValidationError(
      "Conflito documental precisa citar as fontes conflitantes.",
      "conflict_sources_missing"
    );
  }

  if (generated.claims !== undefined) {
    assertArray(generated.claims, "claims");
    for (const claim of generated.claims) {
      if (typeof claim !== "object" || claim === null)
        throw new InvalidAnswerValidationError("A afirmação é inválida.");
      assertArray(claim.citationEvidenceIds, "claim.citationEvidenceIds");
    }
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
  validateClaims(claims, citations, evidence);
  for (const citation of citations) {
    if (
      evidence.some(
        (item) =>
          item.id === citation.evidenceId && ["pending", "disputed"].includes(item.validityStatus)
      ) &&
      !claims.some(
        (claim) =>
          claim.claimType === "interpretation" &&
          claim.evidenceRequired &&
          claim.citationEvidenceIds.includes(citation.evidenceId)
      )
    )
      throw new InvalidAnswerValidationError(
        "Pendência documental exige interpretação citada, sem confirmação de regra vigente.",
        "pending_source_as_confirmed"
      );
  }
  if (
    (generated.answerMode === "abstained" || generated.answerMode === "failed") &&
    claims.some((claim) => claim.evidenceRequired || claim.citationEvidenceIds.length > 0)
  )
    throw new InvalidAnswerValidationError(
      "Abstenção não confirma afirmação documental.",
      "mode_citation_mismatch"
    );

  const fidelityFailure = answerFidelityFailure({ ...generated, citations }, computation);
  if (fidelityFailure !== undefined)
    throw new InvalidAnswerValidationError(
      "Afirmação sem suporte nos trechos citados.",
      fidelityFailure
    );
  if (contradictsDocumentAvailability(generated, evidence))
    throw new InvalidAnswerValidationError(
      "A resposta negou acesso a documentos presentes nas evidências recuperadas.",
      "document_availability_mismatch"
    );
  return Object.freeze({
    ...freezeAnswerPayload({
      answer: cleanTrailingSourceMarker(generated.answer, citations.length > 0),
      answerMode: generated.answerMode,
      citations,
      attentionPoints: Object.freeze([...generated.attentionPoints]),
      suggestedNextStep: generated.suggestedNextStep,
      specialist
    }),
    claims
  });
}
