import { describe, expect, it, vi } from "vitest";
import type { AnswerCitation } from "../../apps/api/answers/answer-contract.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import { analyzeDocumentRequest } from "../../apps/api/analysis/document-analysis.js";
import { validateDocumentAnalysisSources } from "../../apps/api/analysis/document-analysis-validation.js";
import { alameda, bosque, managerContext } from "./answer-fixtures.js";

const text = "🏠\nEnergia R$ 100,00";
const document: AnalysisDocument = {
  condominiumId: alameda,
  documentId: "document-synthetic",
  documentVersionId: "version-synthetic",
  documentTitle: "Balancete sintético",
  pages: [{ pageNumber: 1, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
};
const citation: AnswerCitation = {
  id: "source-synthetic",
  evidenceId: "source-synthetic",
  documentId: document.documentId,
  documentVersionId: document.documentVersionId,
  title: document.documentTitle,
  page: 1,
  excerpt: "Energia R$ 100,00",
  startOffset: 2,
  endOffset: Array.from(text).length,
  sourceScope: "condominium"
};

describe("conferência de relatório independente de modelo", () => {
  it("aceita fonte literal com offsets em code points e não usa rede", () => {
    const fetch = vi.fn(() => {
      throw new Error("Rede proibida no cálculo local");
    });
    vi.stubGlobal("fetch", fetch);
    try {
      validateDocumentAnalysisSources(managerContext, [document], [{ citations: [citation] }]);
      const financial = (period: string, value: string): AnalysisDocument => ({
        ...document,
        documentId: period,
        documentVersionId: period,
        pages: [
          { ...document.pages[0]!, extractedText: `BALANCETE ${period}\nEnergia R$ ${value}` }
        ]
      });
      const report = analyzeDocumentRequest(managerContext, "Compare balancetes 2026-01 2026-02", [
        financial("01/2026", "3,00"),
        financial("02/2026", "4,00")
      ]);
      expect(report.rows[0]?.detail).toContain("diferença: R$ 1,00; variação: 33.33%");
      expect(report.rows[0]?.citations).toHaveLength(2);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    { documentId: "inventado" },
    { documentVersionId: "inventada" },
    { title: "Título inventado" },
    { sourceScope: "legislation" as const },
    { page: 2 },
    { excerpt: "Energia R$ 900,00" },
    { excerpt: " " },
    { startOffset: -1 },
    { startOffset: undefined },
    { startOffset: 3 },
    { startOffset: 2.5 },
    { endOffset: 2 },
    { endOffset: undefined },
    { endOffset: 999 },
    { endOffset: Number.NaN }
  ])("recusa referência adulterada: %j", (override) => {
    expect(() =>
      validateDocumentAnalysisSources(
        managerContext,
        [document],
        // Entrada adulterada: força a fronteira de runtime, fora do contrato TypeScript.
        [{ citations: [citation, { ...citation, ...override } as unknown as AnswerCitation] }]
      )
    ).toThrow();
  });

  it("recusa permissão ausente, outra origem e achado sem citação", () => {
    expect(() =>
      validateDocumentAnalysisSources({ ...managerContext, permissions: [] }, [], [])
    ).toThrow("autorizado");
    expect(() =>
      validateDocumentAnalysisSources(managerContext, [{ ...document, condominiumId: bosque }], [])
    ).toThrow("não autorizada");
    expect(() =>
      validateDocumentAnalysisSources(managerContext, [document], [{ citations: [] }])
    ).toThrow("sem fonte");
  });

  it.each([
    { ...document, documentId: "" },
    { ...document, documentVersionId: "" },
    { ...document, documentTitle: "" }
  ])("recusa documento incompleto", (invalid) => {
    expect(() => validateDocumentAnalysisSources(managerContext, [invalid], [])).toThrow(
      "incompleta"
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("recusa página inválida: %s", (pageNumber) => {
    expect(() =>
      validateDocumentAnalysisSources(
        managerContext,
        [{ ...document, pages: [{ ...document.pages[0]!, pageNumber }] }],
        []
      )
    ).toThrow("página inválido");
  });

  it("recusa versões e páginas duplicadas sem escolher uma silenciosamente", () => {
    expect(() => validateDocumentAnalysisSources(managerContext, [document, document], [])).toThrow(
      "Versão documental ambígua"
    );
    expect(() =>
      validateDocumentAnalysisSources(
        managerContext,
        [{ ...document, pages: [document.pages[0]!, document.pages[0]!] }],
        []
      )
    ).toThrow("Página documental ambígua");
  });

  it("não apresenta limite de precisão como se fosse base zero", () => {
    const financial = (period: string, value: string): AnalysisDocument => ({
      ...document,
      documentId: period,
      documentVersionId: period,
      pages: [{ ...document.pages[0]!, extractedText: `BALANCETE ${period}\nEnergia R$ ${value}` }]
    });
    const report = analyzeDocumentRequest(managerContext, "Compare balancetes 2026-01 2026-02", [
      financial("01/2026", "0,01"),
      financial("02/2026", "90071992547409,91")
    ]);
    expect(report.rows[0]?.detail).toContain("limite de precisão numérica");
    expect(report.rows[0]?.detail).not.toContain("base anterior zero");
    expect(report.rows[0]?.detail).toContain("diferença: R$ 90071992547409,90");
  });
});
