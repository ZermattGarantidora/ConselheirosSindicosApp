import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { extractStructuredDocument } from "../../apps/api/documents/structured/extract-structured-document.js";

const condominiumId = createCondominiumId("table-condominium");
function extract(text: string) {
  return extractStructuredDocument({
    condominiumId,
    documentId: "table-document",
    documentVersionId: "table-version",
    pages: [{ pageNumber: 2, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
  });
}

describe("tabelas documentais verificáveis", () => {
  it("preserva células e não duplica subtotal como rubrica", () => {
    const result = extract(
      "Balancete 01/2026\nRubrica | Valor\nEnergia | R$ 100,00\nLimpeza | R$ 200,00\nSubtotal despesas | R$ 300,00"
    );
    expect(result.financialEntries.map((entry) => entry.originalLabel)).toEqual([
      "Energia",
      "Limpeza"
    ]);
    const table = result.tables[0];
    expect(table?.state).toBe("known");
    expect(table?.rows[0]?.cells.map((cell) => cell.text)).toEqual(["Rubrica", "Valor"]);
    expect(table?.rows[1]?.cells[0]?.source).toMatchObject({
      pageNumber: 2,
      condominiumId: "table-condominium"
    });
  });

  it("recusa tabela cortada sem associar qualquer valor", () => {
    const result = extract("Balancete 01/2026\nRubrica | Valor |\nEnergia | R$ 100,00 |");
    expect(result.tables[0]).toMatchObject({ state: "needs_review" });
    expect(result.financialEntries).toEqual([]);
  });

  it("preserva rubrica multilinha quando a linha tabular é íntegra", () => {
    const result = extract(
      "Balancete 01/2026\nRubrica | Valor\nManutenção\npreventiva | R$ 2.100,00"
    );
    expect(result.financialEntries).toMatchObject([
      { originalLabel: "Manutenção\npreventiva", amountMinor: "210000" }
    ]);
    expect(result.financialEntries[0]?.source.excerpt).toContain(
      "Manutenção\npreventiva | R$ 2.100,00"
    );
  });
});
