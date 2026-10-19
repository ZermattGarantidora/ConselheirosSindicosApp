import type { CondominiumId } from "../../core/condominium-scope.js";
import type { StructuredFinancialEntry } from "../structured/structured-document-contract.js";

export type OcrNumericVerification = Readonly<{
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  pageNumber: number;
  normalizedRubric: string;
  observedAmountMinor: string;
  method: "operator_original_review" | "independent_authorized_read";
}>;

export type OcrFinancialConsistency = Readonly<{
  status: "confirmed" | "unverified" | "discrepant";
  limitation: string | null;
}>;

export type OcrFinancialConsistencyDecision = Readonly<{
  processingStatus: "ready" | "needs_review";
  reason: "confirmed" | "unverified_financial_ocr" | "discrepant_financial_ocr";
  entries: readonly OcrFinancialConsistency[];
}>;

function normalizeRubric(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replaceAll(/\s+/gu, " ");
}

/**
 * Uma confirmação é prova adicional delimitada, não uma correção automática do
 * OCR. Sem ela, o número continua utilizável apenas como material para revisão.
 */
export function assessOcrFinancialConsistency(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    entries: readonly StructuredFinancialEntry[];
    hasUnresolvedFinancialContent: boolean;
    verifications?: readonly OcrNumericVerification[];
  }>
): OcrFinancialConsistencyDecision {
  const verifications = input.verifications ?? [];
  const states = input.entries.map((entry): OcrFinancialConsistency => {
    const rubric = normalizeRubric(entry.originalLabel);
    const scoped = verifications.filter(
      (verification) =>
        verification.condominiumId === input.condominiumId &&
        verification.documentId === input.documentId &&
        verification.documentVersionId === input.documentVersionId &&
        verification.pageNumber === entry.source.pageNumber &&
        verification.normalizedRubric === rubric
    );
    if (scoped.length === 0) {
      return Object.freeze({
        status: "unverified",
        limitation: "O valor OCR não possui conferência independente da página original."
      });
    }
    if (scoped.some((verification) => verification.observedAmountMinor !== entry.amountMinor)) {
      return Object.freeze({
        status: "discrepant",
        limitation:
          "A leitura independente diverge do OCR; nenhum valor foi escolhido automaticamente."
      });
    }
    return Object.freeze({ status: "confirmed", limitation: null });
  });
  if (states.some((state) => state.status === "discrepant")) {
    return Object.freeze({
      processingStatus: "needs_review",
      reason: "discrepant_financial_ocr",
      entries: Object.freeze(states)
    });
  }
  if (
    input.hasUnresolvedFinancialContent ||
    states.some((state) => state.status === "unverified")
  ) {
    return Object.freeze({
      processingStatus: "needs_review",
      reason: "unverified_financial_ocr",
      entries: Object.freeze(states)
    });
  }
  return Object.freeze({
    processingStatus: "ready",
    reason: "confirmed",
    entries: Object.freeze(states)
  });
}
