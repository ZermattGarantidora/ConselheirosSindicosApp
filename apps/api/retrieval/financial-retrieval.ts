import type { CondominiumId } from "../core/condominium-scope.js";
import type { FinancialAmount, FinancialPeriod } from "../analysis/financial-analysis.js";

/** Contrato interno até a publicação do extrator estruturado documental. */
export type FinancialEvidenceSearch = Readonly<{
  condominiumId: CondominiumId;
  periods: readonly FinancialPeriod[];
  rubricHints?: readonly string[];
}>;

export function selectFinancialEvidence(
  input: FinancialEvidenceSearch,
  amounts: readonly FinancialAmount[]
): readonly FinancialAmount[] {
  const allowedPeriods = new Set(input.periods);
  const hints = new Set(
    (input.rubricHints ?? []).map((item) => item.trim().toLocaleLowerCase("pt-BR"))
  );
  return Object.freeze(
    amounts.filter(
      (amount) =>
        amount.condominiumId === input.condominiumId &&
        allowedPeriods.has(amount.period) &&
        (hints.size === 0 || hints.has(amount.normalizedRubric))
    )
  );
}
