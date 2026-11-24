import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFinancialReview } from "../../apps/api/analysis/financial-review.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import { validateDocumentAnalysisSources } from "../../apps/api/analysis/document-analysis-validation.js";
import { managerContext } from "./answer-fixtures.js";

function source(id: string, text: string): AnalysisDocument {
  return {
    condominiumId: managerContext.condominiumId,
    documentId: id,
    documentVersionId: id,
    documentTitle: `${id}.pdf`,
    pages: [{ pageNumber: 1, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
  };
}

const prior = (extra = "") =>
  source(
    "prior",
    `Balancete janeiro de 2026\nRegime de caixa. Valores em reais. Plano de contas JH-2026.\nÁgua e esgoto R$ 100,00\nCompromissos conhecidos de fevereiro de 2026\n05/02/2026 - Folha e encargos R$ 200,00\n${extra}`
  );
const current = (
  extra = "05/03/2026 - Folha e encargos R$ 200,00",
  heading = "Compromissos conhecidos de março de 2026"
) =>
  source(
    "current",
    `Balancete fevereiro de 2026\nRegime de caixa. Valores em reais. Plano de contas JH-2026.\nÁgua e esgoto R$ 150,00\n${heading}\n${extra}`
  );
const review = (...documents: AnalysisDocument[]) =>
  buildFinancialReview(managerContext, "current", documents);
const historyRows = (report: ReturnType<typeof review>) =>
  report.rows.filter((row) => row.label.startsWith("Histórico"));

describe("comparabilidade do histórico com compromissos futuros — regressão de 29/10/2026", () => {
  it("AC-4903a/c: compara realizados e preserva compromissos sem comparar vencimentos de meses diferentes", () => {
    const documents = [current(), prior()];
    const report = review(...documents);
    expect(historyRows(report)).toHaveLength(1);
    expect(historyRows(report)[0]).toMatchObject({ label: "Histórico — Água e esgoto" });
    expect(historyRows(report)[0]!.detail).toContain("diferença R$ 50,00");
    expect(historyRows(report)[0]!.detail).toContain("variação 50%");
    expect(report.rows.some((row) => row.label === "05/03/2026 - Folha e encargos")).toBe(true);
    expect(report.limitations.join(" ")).not.toMatch(
      /sem valores comparáveis|Regime de caixa\/competência não está explícito|Plano de contas não está explícito/u
    );
    expect(report.financialReview!.checks.find((check) => check.id === "history")!.status).toBe(
      "ok"
    );
    expect(
      historyRows(report)[0]!.citations.some((citation) =>
        citation.excerpt.includes("Regime de caixa.")
      )
    ).toBe(true);
    validateDocumentAnalysisSources(managerContext, documents, report.rows);
  });

  it.each([
    ["31/03/2026 - Folha e encargos R$ 200,00", "Compromissos conhecidos de março de 2026", false],
    ["31/04/2026 - Folha e encargos R$ 200,00", "Compromissos conhecidos de abril de 2026", true],
    ["05/04/2026 - Folha e encargos R$ 200,00", "Compromissos conhecidos de março de 2026", true],
    [
      "05/03/2026 - Folha e encargos R$ 200,00",
      "Compromissos conhecidos de março e abril de 2026",
      true
    ],
    [
      "05/03/2026 - Folha e encargos R$ 200,00",
      "Compromissos conhecidos de 03/2026 e 04/2026",
      true
    ],
    ["05/03/2026 - Folha e encargos R$ 200,00", "Notas gerais", true],
    ["05/01/2026 - Folha e encargos R$ 200,00", "Compromissos conhecidos de janeiro de 2026", true],
    [
      "05/03/2026 - Folha e encargos R$ 200,00",
      "Compromissos conhecidos de março de 2026\nDespesas pagas",
      true
    ],
    [
      "05/03/2026 - Folha e encargos R$ 200,00",
      "Compromissos conhecidos de março de 2026\n2. Despesas de custeio",
      true
    ],
    [
      "31/02/2026 - Folha e encargos R$ 200,00",
      "Compromissos conhecidos de fevereiro de 2026",
      true
    ],
    ["Folha e encargos R$ 200,00", "Compromissos conhecidos de março de 2026", true]
  ])("AC-4903b: exclusão conservadora para %s / %s", (entry, heading, expectedLimitation) => {
    const report = review(current(entry, heading), prior());
    const limitedEntry = report.limitations.some(
      (limitation) =>
        limitation.includes("2026-01:") &&
        limitation.includes("folha e encargos sem valores comparáveis")
    );
    expect(limitedEntry).toBe(expectedLimitation);
    expect(historyRows(report).some((row) => row.label === "Histórico — Água e esgoto")).toBe(true);
  });

  it("AC-4903b: despesa realizada ausente continua como lacuna específica", () => {
    const report = review(current(), prior("Despesas pagas\nEnergia elétrica R$ 80,00"));
    expect(report.limitations.join(" ")).toContain("energia eletrica sem valores comparáveis");
  });

  it.each([
    ["Regime de caixa.", "Regime de competência."],
    ["Plano de contas JH-2026.", "Plano de contas OUTRO-2026."],
    ["Regime de caixa.", "Regime de caixa. Regime de competência."],
    ["Plano de contas JH-2026.", "Plano de contas JH-2026. Plano de contas OUTRO-2026."]
  ])("AC-4903c: divergência ou concorrência em declaração literal %s", (before, after) => {
    const changed = prior();
    const report = review(
      current(),
      source("prior", changed.pages[0]!.extractedText.replace(before, after))
    );
    expect(historyRows(report)).toEqual([]);
    expect(report.limitations.join(" ")).toContain("regime/plano de contas divergente");
  });

  it.each([
    "Não utiliza regime de caixa.",
    "A proposta menciona plano de contas JH-2026.",
    "Regime de caixa talvez"
  ])("AC-4903c: não promove frase negada, incidental ou sem delimitação: %s", (text) => {
    const changed = current();
    const report = review(
      source(
        "current",
        changed.pages[0]!.extractedText.replace(
          "Regime de caixa. Valores em reais. Plano de contas JH-2026.",
          text
        )
      ),
      prior()
    );
    expect(report.limitations.join(" ")).toMatch(/não está explícito/u);
  });

  it("AC-4902a/b: reconhece totais consolidados e principal sem presumir caixa livre", () => {
    const currentDoc = source(
      "current",
      "Balancete junho de 2026\nRegime: caixa\nPlano de contas: JH-2026\nSaldo inicial consolidado R$ 91.310,00\nReceitas totais do mês R$ 42.710,00\nDespesas totais do mês R$ 68.210,00\nSaldo final consolidado informado R$ 67.310,00\nPrincipal em aberto no fim R$ 13.290,00"
    );
    const priorDoc = source(
      "prior",
      "Balancete maio de 2026\nRegime: caixa\nPlano de contas: JH-2026\nPrincipal em aberto no fim R$ 5.100,00"
    );
    const report = review(currentDoc, priorDoc);
    const closing = report.financialReview!.checks.find((check) => check.id === "closing")!;
    expect(closing.status).toBe("atenção");
    expect(closing.detail).toContain("= R$ 65.810,00");
    expect(closing.detail).toContain("diferença (informado − calculado) R$ 1.500,00");
    expect(closing.detail).toContain("sem presumir que saldo final seja caixa livre");
    for (const value of ["91.310,00", "42.710,00", "68.210,00", "67.310,00"]) {
      expect(closing.citations.some((citation) => citation.excerpt.includes(value))).toBe(true);
    }
    const arrears = report.financialReview!.checks.find((check) => check.id === "arrears")!;
    expect(arrears.status).toBe("atenção");
    expect(arrears.detail).toContain("R$ 13.290,00");
    expect(arrears.detail).toContain("R$ 5.100,00");
    validateDocumentAnalysisSources(
      managerContext,
      [currentDoc, priorDoc],
      report.financialReview!.checks.filter((check) => check.citations.length > 0)
    );
  });

  it("AC-4903a/c: reproduz a extração local dos cinco PDFs sintéticos enviados", () => {
    const documents = JSON.parse(
      readFileSync(
        new URL("../fixtures/financial-history-jardim-horizonte.json", import.meta.url),
        "utf8"
      )
    ) as AnalysisDocument[];
    const report = buildFinancialReview(
      managerContext,
      documents.at(-1)!.documentVersionId,
      documents
    );
    expect(report.limitations.join(" ")).not.toMatch(
      /sem valores comparáveis|Regime de caixa\/competência não está explícito|Plano de contas não está explícito/u
    );
    const water = historyRows(report).filter((row) => row.label === "Histórico — Água e esgoto");
    expect(water).toHaveLength(4);
    expect(
      water.some((row) =>
        row.detail.includes("2026-04: R$ 5.000,00; 2026-05: R$ 4.850,00; diferença -R$ 150,00")
      )
    ).toBe(true);
    expect(historyRows(report).some((row) => /^Histórico — \d{2}\//u.test(row.label))).toBe(false);
    validateDocumentAnalysisSources(managerContext, documents, report.rows);
  });
});
