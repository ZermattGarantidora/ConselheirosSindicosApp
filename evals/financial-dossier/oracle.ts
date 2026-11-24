import type { Ledger } from "./corpus.js";
/** Gabarito separado: usa exclusivamente o ledger anterior ao PDF, sem parser, relatório ou modelo. */
export function buildOracle(ledger: Ledger) {
  const monthly = new Map<string, number>();
  for (const invoice of ledger)
    monthly.set(invoice.period, (monthly.get(invoice.period) ?? 0) + invoice.total);
  const current = monthly.get("10/2026")!;
  const cancelled = ledger.find((v) => v.cancelled)!;
  const erroneous = ledger.find((v) => v.itemError)!;
  return {
    version: "oracle-financial-300-v1",
    syntheticOnly: true,
    pages: 300,
    invoices: 293,
    itemLines: 8790,
    monetaryEntries: 9126,
    documents: ledger.map((v) => ({
      key: v.id,
      page: v.page,
      itemCount: v.items.length,
      declaredMinor: v.total,
      itemSumMinor: v.total + v.itemError
    })),
    currentExpenseMinor: current,
    previousExpenseMinor: monthly.get("09/2026"),
    calculatedClosingMinor: 5000000 + 12000000 - current,
    declaredClosingMinor: 5000000 + 12000000 - current + 150000,
    closingDifferenceMinor: 150000,
    liquidityGapMinor: 300000,
    bankDifferenceMinor: 100000,
    budgetOverrunMinor: 250000,
    arrearsIncreaseMinor: 400000,
    reserveBalanceMinor: 500000,
    reserveUseMinor: 50000,
    commitmentsMinor: 500000,
    unsupported: {
      rubric: cancelled.rubric,
      page: cancelled.page,
      id: cancelled.id,
      missingMinor: cancelled.total
    },
    itemMismatch: {
      page: erroneous.page,
      id: erroneous.id,
      declaredMinor: erroneous.total,
      itemSumMinor: erroneous.total + erroneous.itemError
    },
    status: {
      closing: "atenção",
      arrears: "atenção",
      budget: "atenção",
      extraordinary: "atenção",
      bank: "atenção",
      reserve: "atenção",
      support: "atenção",
      history: "atenção",
      commitments: "ok",
      transparency: "ok"
    },
    missingEvidence: [
      "Comprovante válido de Manutenção",
      "Justificativa/autorização dos gastos extraordinários",
      "Finalidade/autorização do uso do fundo de reserva"
    ],
    mustNotConclude: [
      "fraude comprovada",
      "contas aprovadas",
      "causa do aumento apurada",
      "cancelamento equivale a pagamento"
    ]
  };
}
