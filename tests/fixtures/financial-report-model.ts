import type { FinancialReportModel } from "../../apps/api/authoring/financial-report.js";
/** Somente saída programada para contratos; não avalia qualidade de modelo real. */
export function syntheticFinancialReportModel(
  onCall?: (phase: "write" | "review") => void
): FinancialReportModel {
  return {
    key: "synthetic-financial-report-v2",
    async complete(phase, data) {
      onCall?.(phase);
      const checks = data.checks as { id: string; detail: string; summary?: string }[];
      if (phase === "write")
        return {
          title: "FICTÍCIO - Relatório financeiro do caderno",
          overview: "Conferência do caderno integral com cálculos e fontes verificáveis.",
          priorities: (data.priorityCheckIds as string[]).map((checkId) => ({
            checkId,
            text: checks.find((c) => c.id === checkId)!.detail
          })),
          conclusion:
            "Confira as pendências e valide decisões financeiras com o responsável contábil."
        };
      return {
        accepted: true,
        snapshotHash: data.snapshotHash,
        planHash: data.planHash,
        checks: checks.map((c) => ({ id: c.id, supported: true })),
        issues: []
      };
    }
  };
}
