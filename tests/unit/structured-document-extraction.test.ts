import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { extractStructuredDocument } from "../../apps/api/documents/structured/extract-structured-document.js";

const condominiumId = createCondominiumId("alameda");

describe("extração documental estruturada", () => {
  it.each(["R$ 100,00-", "R$ 1.234,56.78", "R$ 100,00 USD 20,00"])(
    "não aceita sufixo financeiro não interpretado: %s",
    (value) => {
      const result = extractStructuredDocument({
        condominiumId,
        documentId: "d",
        documentVersionId: "v",
        pages: [
          {
            pageNumber: 1,
            extractedText: `Balancete 01/2026\nEnergia ${value}`,
            extractionMethod: "pdf_text",
            qualityScore: 1
          }
        ]
      });
      expect(result.financialEntries).toEqual([]);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  );
  it("preserva rubrica, moeda, período e procedência de balancete sem ponto flutuante", () => {
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "pdf_text",
          qualityScore: 1,
          extractedText: "BALANCETE - Março de 2026\nEnergia elétrica R$ 1.234,56"
        }
      ]
    });

    expect(extraction).toMatchObject({
      condominiumId: "alameda",
      documentId: "document-1",
      documentVersionId: "version-1",
      documentKind: { value: "financial_statement", state: "known" },
      financialPeriod: { state: "known", year: 2026, month: 3 },
      financialEntries: [
        {
          originalLabel: "Energia elétrica",
          originalAmount: "R$ 1.234,56",
          amountMinor: "123456",
          currency: "BRL",
          source: {
            condominiumId: "alameda",
            documentId: "document-1",
            documentVersionId: "version-1",
            pageNumber: 1,
            extractionMethod: "pdf_text",
            uncertainty: []
          }
        }
      ]
    });
    const source = extraction.financialEntries[0]?.source;
    expect(source?.excerpt).toBe("Energia elétrica R$ 1.234,56");
    expect(source?.endOffset).toBeGreaterThan(source?.startOffset ?? 0);
  });

  it("sinaliza tabela ambígua e não associa rubrica a dois valores", () => {
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "pdf_text",
          qualityScore: 1,
          extractedText: "Balancete\nDespesas R$ 100,00 R$ 120,00\nReferência 01/2026 e 02/2026"
        }
      ]
    });

    expect(extraction.financialEntries).toEqual([]);
    expect(extraction.tables).toMatchObject([
      { state: "needs_review", warning: "A associação entre rubrica e colunas não foi inferida." }
    ]);
    expect(extraction.financialPeriod).toEqual({
      state: "needs_review",
      year: null,
      month: null,
      source: null
    });
  });

  it("mede offsets em code points e conserva o trecho correspondente", () => {
    const text = "💡 BALANCETE Março de 2026\nEnergia R$ 10,00";
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [{ pageNumber: 1, extractionMethod: "pdf_text", qualityScore: 1, extractedText: text }]
    });

    const kindSource = extraction.documentKind.source;
    expect(kindSource).not.toBeNull();
    expect(kindSource?.startOffset).toBe(Array.from("💡 ").length);
    expect(kindSource?.excerpt).toBe("BALANCETE");
  });

  it("não publica fatos conhecidos de página com qualidade insuficiente", () => {
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "ocr",
          qualityScore: 0.69,
          extractedText: "BALANCETE Março de 2026\nEnergia R$ 10,00"
        }
      ]
    });

    expect(extraction.documentKind).toMatchObject({
      value: "financial_statement",
      state: "needs_review",
      source: { uncertainty: ["A qualidade da página está abaixo do piso para fato estruturado."] }
    });
    expect(extraction.financialPeriod).toMatchObject({
      state: "needs_review",
      year: null,
      month: null
    });
    expect(extraction.financialEntries[0]?.source.uncertainty).toEqual([
      "A qualidade da página está abaixo do piso para fato estruturado."
    ]);
  });

  it.each(["-R$ 10,00", "R$ -10,00", "(R$ 10,00)", "R$ 1.234,567"])(
    "recusa valor monetário inseguro %s",
    (amount) => {
      const extraction = extractStructuredDocument({
        condominiumId,
        documentId: "document-1",
        documentVersionId: "version-1",
        pages: [
          {
            pageNumber: 1,
            extractionMethod: "pdf_text",
            qualityScore: 1,
            extractedText: `BALANCETE Março de 2026\nDespesa ${amount}`
          }
        ]
      });

      expect(extraction.financialEntries).toEqual([]);
      expect(extraction.warnings).not.toEqual([]);
    }
  );

  it.each(
    ["−", "‒", "–", "—", "―", "﹣", "－"].flatMap((sign) => [`${sign} R$ 10,00`, `R$ ${sign}10,00`])
  )("não converte sinal tipográfico em valor positivo: %s", (amount) => {
    for (const extractionMethod of ["pdf_text", "ocr"] as const) {
      const extraction = extractStructuredDocument({
        condominiumId,
        documentId: "document-1",
        documentVersionId: "version-1",
        pages: [
          {
            pageNumber: 1,
            extractionMethod,
            qualityScore: 1,
            extractedText: `Balancete 01/2026\nDespesa ${amount}`
          }
        ]
      });
      expect(extraction.financialEntries).toEqual([]);
      expect(extraction.warnings).not.toEqual([]);
    }
  });

  it("preserva hífen interno da rubrica sem confundi-lo com sinal monetário", () => {
    const excerpt = "Manutenção - elevador R$ 10,00";
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "pdf_text",
          qualityScore: 1,
          extractedText: `Balancete 01/2026\n${excerpt}`
        }
      ]
    });
    expect(extraction.financialEntries).toHaveLength(1);
    expect(extraction.financialEntries[0]).toMatchObject({
      originalLabel: "Manutenção - elevador",
      originalAmount: "R$ 10,00",
      amountMinor: "1000",
      source: { excerpt, uncertainty: [] }
    });
    expect(extraction.warnings).toEqual([]);
  });

  it.each([
    ["CONVENÇÃO DO CONDOMÍNIO", "convention"],
    ["REGIMENTO INTERNO", "internal_rules"],
    ["ATA DA ASSEMBLEIA GERAL", "meeting_minutes"],
    ["CONTRATO DE PRESTAÇÃO DE SERVIÇOS", "contract"],
    ["Arquivo sem marcador direto", "unknown"]
  ] as const)("identifica %s de forma conservadora", (text, expectedKind) => {
    const extraction = extractStructuredDocument({
      condominiumId,
      documentId: "document-1",
      documentVersionId: "version-1",
      pages: [{ pageNumber: 1, extractionMethod: "pdf_text", qualityScore: 1, extractedText: text }]
    });

    expect(extraction.documentKind.value).toBe(expectedKind);
    expect(extraction.documentKind.state).toBe(expectedKind === "unknown" ? "unknown" : "known");
  });
});
