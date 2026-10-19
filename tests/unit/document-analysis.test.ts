import { describe, expect, it } from "vitest";
import {
  analyzeDocumentRequest,
  isDocumentAnalysisRequest,
  requestedFinancialPeriods
} from "../../apps/api/analysis/document-analysis.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import {
  createMemoryDocumentAnalysisReader,
  assertAnalysisLimits
} from "../../apps/api/analysis/document-analysis-reader.js";
import { alameda, bosque, createEvidence, managerContext } from "./answer-fixtures.js";

function document(period: string, value: string, version = period): AnalysisDocument {
  return {
    condominiumId: alameda,
    documentId: version,
    documentVersionId: version,
    documentTitle: `Balancete ${period}`,
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "pdf_text",
        qualityScore: 1,
        extractedText: `BALANCETE ${period}\nEnergia R$ ${value}`
      }
    ]
  };
}
describe("relatório integrado", () => {
  it("integra rótulos naturais de atas e cláusulas, preservando condições e fontes", () => {
    const page = (text: string) => ({
      pageNumber: 1,
      extractionMethod: "pdf_text" as const,
      qualityScore: 1,
      extractedText: text
    });
    const base = document("01/2026", "10,00");
    const minutes = {
      ...base,
      documentId: "ata",
      documentVersionId: "ata-v1",
      documentTitle: "Ata sintética",
      pages: [
        page(
          "ATA DA ASSEMBLEIA\nAssunto: pintura\nProposta: pintar o hall\nDeliberação: aprovada somente após orçamento\nPrazo: 30 dias"
        )
      ]
    };
    const contract = {
      ...base,
      documentId: "contrato",
      documentVersionId: "contrato-v1",
      documentTitle: "Contrato sintético",
      pages: [page("CONTRATO DE SERVICOS\nObjeto: manutencao\nPrazo: 12 meses\nReajuste: anual")]
    };
    const report = analyzeDocumentRequest(managerContext, "Analise a ata e o contrato", [
      minutes,
      contract
    ]);
    expect(report.rows).toHaveLength(6);
    expect(report.rows.map((row) => row.detail)).toContain(
      "Deliberação: aprovada somente após orçamento"
    );
    expect(report.rows.every((row) => row.citations.length === 1)).toBe(true);
    expect(
      analyzeDocumentRequest(managerContext, "Analise a convenção", [minutes, contract]).rows
    ).toEqual([]);
  });

  it("registra limites normativos e conflitos entre fontes sem escolher uma", () => {
    const base = document("01/2026", "10,00");
    const version = (text: string, id: string) => ({
      ...base,
      documentId: id,
      documentVersionId: id,
      pages: [
        {
          ...base.pages[0]!,
          extractedText: `CONVENÇÃO DO CONDOMÍNIO\nAssunto: animais\nRegra: ${text}\nCondição: com coleira\nExceção: emergência`
        }
      ]
    });
    const report = analyzeDocumentRequest(managerContext, "Analise a convenção", [
      version("permitido", "v1"),
      version("proibido", "v2")
    ]);
    expect(report.rows).toHaveLength(6);
    expect(report.limitations.join(" ")).toContain("contraditórias");
    expect(
      analyzeDocumentRequest(managerContext, "Analise o regimento", []).limitations.join(" ")
    ).toContain("rótulos explícitos");
  });
  it("expõe regras divergentes mesmo dentro da mesma versão", () => {
    const base = document("01/2026", "10,00");
    const source = {
      ...base,
      pages: [
        {
          ...base.pages[0]!,
          extractedText:
            "CONVENÇÃO DO CONDOMÍNIO\nAssunto: animais\nRegra: permitido\nRegra: proibido"
        }
      ]
    };
    const report = analyzeDocumentRequest(managerContext, "Analise a convenção", [source]);
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]?.citations[0]?.documentVersionId).toBe(
      report.rows[1]?.citations[0]?.documentVersionId
    );
    expect(report.limitations.join(" ")).toContain("contraditórias");
  });
  it("compara centavos, sinal e base zero com duas fontes", () => {
    const result = analyzeDocumentRequest(managerContext, "balancetes 2026-01 2026-02", [
      document("01/2026", "100,01"),
      document("02/2026", "90,01")
    ]);
    expect(result.rows[0]?.detail).toContain("-R$ 10,00");
    expect(result.rows[0]?.citations).toHaveLength(2);
    expect(
      analyzeDocumentRequest(managerContext, "balancetes 2026-01 2026-02", [
        document("01/2026", "0,00"),
        document("02/2026", "1,00")
      ]).rows[0]?.detail
    ).toContain("base anterior zero");
  });
  it("explicita período ausente, fonte incerta e linhas ambíguas", () => {
    expect(requestedFinancialPeriods("2026-02 2026-01 2026-02")).toEqual(["2026-01", "2026-02"]);
    expect(analyzeDocumentRequest(managerContext, "balancete", []).limitations.join(" ")).toContain(
      "AAAA-MM"
    );
    expect(
      analyzeDocumentRequest(managerContext, "balancetes 2026-01 2026-02", [
        document("01/2026", "10,00")
      ]).rows
    ).toEqual([]);
    const ambiguous = document("02/2026", "10,00 R$ 20,00");
    expect(
      analyzeDocumentRequest(managerContext, "balancetes 2026-01 2026-02", [
        ambiguous
      ]).limitations.join(" ")
    ).toContain("ambíguos");
    expect(isDocumentAnalysisRequest("Analise a convenção")).toBe(true);
    expect(isDocumentAnalysisRequest("Olá")).toBe(false);
  });
  it("rejeita acesso e fontes externas, limita trabalho sem publicar subconjunto", () => {
    expect(() =>
      analyzeDocumentRequest({ ...managerContext, permissions: [] }, "balancete", [])
    ).toThrow("autorizado");
    expect(() =>
      analyzeDocumentRequest(managerContext, "balancete", [
        { ...document("01/2026", "10,00"), condominiumId: bosque }
      ])
    ).toThrow("outro condomínio");
    const original = document("01/2026", "10,00");
    expect(() =>
      assertAnalysisLimits([{ ...original, pages: Array(501).fill(original.pages[0]) }])
    ).toThrow("limite");
    expect(() =>
      assertAnalysisLimits([
        { ...original, pages: [{ ...original.pages[0]!, extractedText: "x".repeat(2_000_001) }] }
      ])
    ).toThrow("limite");
  });
  it("reconstrói sobreposição sem duplicar e bloqueia lacuna/conflito", async () => {
    const reader = createMemoryDocumentAnalysisReader([
      createEvidence({ content: "abcdef", endOffset: 6 }),
      createEvidence({ id: "second", content: "defghi", startOffset: 3, endOffset: 9 }),
      createEvidence({ id: "external", condominiumId: bosque }),
      createEvidence({ id: "pending", documentVersionId: "pending", validityStatus: "pending" })
    ]);
    const documents = await reader.readAuthorized(managerContext, ["version-1", "pending"]);
    expect(documents).toHaveLength(1);
    expect(documents[0]?.pages[0]?.extractedText).toBe("abcdefghi");
    expect(await reader.readAuthorized(managerContext, [])).toEqual([]);
    await expect(
      reader.readAuthorized({ ...managerContext, permissions: [] }, ["version-1"])
    ).rejects.toThrow("autorizado");
    await expect(
      createMemoryDocumentAnalysisReader([createEvidence({ startOffset: 2 })]).readAuthorized(
        managerContext,
        ["version-1"]
      )
    ).rejects.toThrow("cobertura");
    await expect(
      createMemoryDocumentAnalysisReader([
        createEvidence({ content: "abc" }),
        createEvidence({ content: "xyz" })
      ]).readAuthorized(managerContext, ["version-1"])
    ).rejects.toThrow("conflitantes");
  });
});
