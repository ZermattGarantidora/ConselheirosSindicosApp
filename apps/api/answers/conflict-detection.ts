import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import { lexicalScore } from "../retrieval/text-retrieval.js";
import { documentSubjectQuery } from "../retrieval/retrieval-query.js";
import { literalSentences } from "./literal-sentences.js";
import { detectRecordNoteConflict } from "./record-note-conflict.js";

export type DetectedConflict = Readonly<{
  kind?: "record_note";
  evidence: readonly RetrievalEvidence[];
  reason: string;
}>;

function hasMinimumLeaseQuestion(question: string): boolean {
  const normalized = question
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
  return /locac(?:ao|oes)|prazo\s+minimo|prazo.*permitido/u.test(normalized);
}

function leaseDuration(content: string): Readonly<{ days: number; label: string }> | undefined {
  const wordDays: Readonly<Record<string, number>> = {
    quinze: 15,
    trinta: 30,
    sessenta: 60,
    noventa: 90
  };
  for (const { text } of literalSentences(content)) {
    const normalized = text
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLowerCase();
    if (!/locac(?:ao|oes)|temporada/u.test(normalized)) continue;
    const minimum = /prazo minimo[^.!?]{0,65}?\b([a-z]+|\d{1,3})\s+dias\b/u;
    const equivalent = /prazo (?:igual ou superior a|nao inferior a)\s+([a-z]+|\d{1,3})\s+dias\b/u;
    const prohibited =
      /(?:vedad[ao]|proibid[ao]|nao (?:e |sao )?permitid[ao]s?).{0,100}prazo inferior a\s+([a-z]+|\d{1,3})\s+dias\b/u;
    const value =
      normalized.match(minimum)?.[1] ??
      normalized.match(equivalent)?.[1] ??
      normalized.match(prohibited)?.[1];
    if (value === undefined) continue;
    const days = wordDays[value] ?? (/^\d+$/u.test(value) ? Number(value) : 0);
    if (days > 0) return { days, label: `${value} dias` };
  }
  return undefined;
}

/**
 * Detecta somente conflitos que podem ser explicados por sinais explícitos dos
 * trechos. A ausência de uma regra de prioridade não é resolvida por ranking.
 */
export function detectDocumentConflict(
  question: string,
  evidence: readonly RetrievalEvidence[]
): DetectedConflict | null {
  const subject = documentSubjectQuery(question);
  for (const pending of evidence
    .filter((item) => ["pending", "disputed"].includes(item.validityStatus))
    .toSorted((a, b) => lexicalScore(subject, b.content) - lexicalScore(subject, a.content))) {
    const confirmed = evidence
      .filter(
        (item) =>
          item.documentId === pending.documentId &&
          item.documentVersionId !== pending.documentVersionId &&
          ["confirmed", "not_applicable"].includes(item.validityStatus)
      )
      .sort((a, b) => lexicalScore(subject, b.content) - lexicalScore(subject, a.content))[0];
    if (confirmed !== undefined)
      return Object.freeze({
        evidence: Object.freeze([confirmed, pending]),
        reason:
          "Há uma versão confirmada e outra pendente ou disputada do mesmo documento. A versão pendente não confirma alteração da regra ou do preço vigente."
      });
  }
  const recordConflict = detectRecordNoteConflict(question, evidence);
  if (recordConflict) return recordConflict;
  if (!hasMinimumLeaseQuestion(question) && !/conflit|diverg[eê]n/iu.test(question)) {
    return null;
  }

  const convention = evidence.find(
    (item) => item.documentType === "convention" && leaseDuration(item.content) !== undefined
  );
  const internalRules = evidence.find(
    (item) => item.documentType === "internal_rules" && leaseDuration(item.content) !== undefined
  );

  if (convention === undefined || internalRules === undefined) {
    return null;
  }
  const conventionPeriod = leaseDuration(convention.content)!;
  const rulesPeriod = leaseDuration(internalRules.content)!;
  if (conventionPeriod.days === rulesPeriod.days) return null;

  return Object.freeze({
    evidence: Object.freeze([convention, internalRules]),
    reason: `A convenção indica prazo mínimo de ${conventionPeriod.label} e o regimento indica ${rulesPeriod.label}: são prazos incompatíveis que precisam ser conciliados antes de aplicar a regra.`
  });
}
