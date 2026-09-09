import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";

export type DetectedConflict = Readonly<{
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

/**
 * Detecta somente conflitos que podem ser explicados por sinais explícitos dos
 * trechos. A ausência de uma regra de prioridade não é resolvida por ranking.
 */
export function detectDocumentConflict(
  question: string,
  evidence: readonly RetrievalEvidence[]
): DetectedConflict | null {
  if (!hasMinimumLeaseQuestion(question)) {
    return null;
  }

  const convention = evidence.find(
    (item) => item.documentType === "convention" && /noventa|90/iu.test(item.content)
  );
  const internalRules = evidence.find(
    (item) => item.documentType === "internal_rules" && /trinta|30/iu.test(item.content)
  );

  if (convention === undefined || internalRules === undefined) {
    return null;
  }

  return Object.freeze({
    evidence: Object.freeze([convention, internalRules]),
    reason: "Fontes aplicáveis apresentam prazos incompatíveis sem prioridade determinística."
  });
}
