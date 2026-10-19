import { describe, expect, it } from "vitest";

import {
  compareFinancialPeriods,
  financialAmountsFromStructuredExtraction,
  normalizeFinancialRubric,
  type FinancialAmount,
  type FinancialSource
} from "../../apps/api/analysis/financial-analysis.js";
import { selectFinancialEvidence } from "../../apps/api/retrieval/financial-retrieval.js";
import { alameda, bosque, managerContext } from "./answer-fixtures.js";

function amount(
  period: "2026-01" | "2026-02",
  rubric: string,
  value: bigint,
  overrides: Partial<FinancialAmount> = {}
): FinancialAmount {
  const source: FinancialSource = {
    documentId: `balancete-${period}`,
    documentVersionId: `balancete-${period}-v1`,
    documentTitle: `Balancete ${period}`,
    page: 1,
    excerpt: `${rubric}: R$ ${value}`,
    startOffset: 0,
    endOffset: 20,
    extractionMethod: "pdf_text",
    uncertainty: "none"
  };
  const { source: sourceOverride, ...amountOverrides } = overrides;
  return Object.freeze({
    condominiumId: alameda,
    period,
    rubric,
    normalizedRubric: normalizeFinancialRubric(rubric),
    amountMinor: value,
    currency: "BRL",
    ...amountOverrides,
    source: sourceOverride ?? source
  });
}

describe("análise financeira reproduzível", () => {
  it("compara rubrica equivalente, mantém ambos os comprovantes e calcula em centavos", () => {
    const result = compareFinancialPeriods(managerContext, {
      currentPeriod: "2026-02",
      previousPeriod: "2026-01",
      amounts: [
        amount("2026-01", "Energia elétrica", 10_000n),
        amount("2026-02", "Energia Elétrica", 12_500n)
      ]
    });
    expect(result.rubrics[0]).toMatchObject({
      status: "compared",
      absoluteChangeMinor: 2_500n,
      percentageChange: 25,
      percentageStatus: "available"
    });
    expect(result.rubrics[0]?.sources).toHaveLength(2);
  });

  it("não divide por zero e não inventa variação percentual", () => {
    const result = compareFinancialPeriods(managerContext, {
      currentPeriod: "2026-02",
      previousPeriod: "2026-01",
      amounts: [amount("2026-01", "Multas", 0n), amount("2026-02", "Multas", 500n)]
    });
    expect(result.rubrics[0]).toMatchObject({
      absoluteChangeMinor: 500n,
      percentageChange: null,
      percentageStatus: "zero_denominator"
    });
  });

  it.each([
    [3n, 4n, 33.33],
    [3n, 2n, -33.33],
    [300n, 301n, 0.33],
    [300n, 299n, -0.33],
    [7n, 7n, 0]
  ])("trunca duas casas sem alterar centavos: %s para %s", (previous, current, expected) => {
    const result = compareFinancialPeriods(managerContext, {
      currentPeriod: "2026-02",
      previousPeriod: "2026-01",
      amounts: [amount("2026-01", "Água", previous), amount("2026-02", "Água", current)]
    });
    expect(result.rubrics[0]).toMatchObject({
      absoluteChangeMinor: current - previous,
      percentageChange: expected,
      percentageStatus: "available"
    });
  });

  it.each([1n, -1n])("preserva diferença exata sem percentual impreciso (base %s)", (previous) => {
    const current = BigInt(Number.MAX_SAFE_INTEGER);
    const result = compareFinancialPeriods(managerContext, {
      currentPeriod: "2026-02",
      previousPeriod: "2026-01",
      amounts: [amount("2026-01", "Água", previous), amount("2026-02", "Água", current)]
    });
    expect(result.rubrics[0]).toMatchObject({
      absoluteChangeMinor: current - previous,
      percentageChange: null,
      percentageStatus: "precision_limit"
    });
  });

  it("expõe ausência e incerteza, em vez de completar a comparação", () => {
    const uncertain = amount("2026-02", "Água", 900n, {
      source: { ...amount("2026-02", "Água", 900n).source, uncertainty: "review_required" }
    });
    const result = compareFinancialPeriods(managerContext, {
      currentPeriod: "2026-02",
      previousPeriod: "2026-01",
      amounts: [amount("2026-01", "Água", 800n), uncertain, amount("2026-02", "Seguro", 100n)]
    });
    expect(result.rubrics.map((item) => item.status)).toEqual(["uncertain", "missing_previous"]);
    expect(result.limitations).toHaveLength(1);
  });

  it("recusa duplicidade e conserva o isolamento na seleção", () => {
    expect(() =>
      compareFinancialPeriods(managerContext, {
        currentPeriod: "2026-02",
        previousPeriod: "2026-01",
        amounts: [amount("2026-01", "Água", 1n), amount("2026-01", "Água", 2n)]
      })
    ).toThrow("mais de um valor");
    expect(
      selectFinancialEvidence({ condominiumId: alameda, periods: ["2026-01"] }, [
        amount("2026-01", "Água", 1n),
        amount("2026-01", "Água", 2n, { condominiumId: bosque })
      ])
    ).toHaveLength(1);
  });

  it("adapta somente extração financeira conhecida e conserva incerteza", () => {
    const extraction = {
      condominiumId: alameda,
      documentId: "balancete-fevereiro",
      documentVersionId: "balancete-fevereiro-v1",
      documentKind: { value: "financial_statement", state: "known", source: null },
      financialPeriod: { state: "known", year: 2026, month: 2, source: null },
      financialEntries: [
        {
          originalLabel: "Água",
          originalAmount: "R$ 10,00",
          amountMinor: "1000",
          currency: "BRL",
          source: {
            condominiumId: alameda,
            documentId: "balancete-fevereiro",
            documentVersionId: "balancete-fevereiro-v1",
            pageNumber: 2,
            startOffset: 10,
            endOffset: 22,
            excerpt: "Água R$ 10,00",
            extractionMethod: "pdf_text",
            uncertainty: ["OCR revisado"]
          }
        }
      ],
      tables: [],
      warnings: []
    } as const;
    expect(
      financialAmountsFromStructuredExtraction(extraction, "Balancete fevereiro")
    ).toMatchObject([
      {
        period: "2026-02",
        amountMinor: 1000n,
        normalizedRubric: "agua",
        source: { uncertainty: "review_required" }
      }
    ]);
  });
});
