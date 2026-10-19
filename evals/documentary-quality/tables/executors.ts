import { createCondominiumId } from "../../../apps/api/core/condominium-scope.js";
import { extractStructuredDocument } from "../../../apps/api/documents/structured/extract-structured-document.js";

const condominiumId = createCondominiumId("documentary-table-condominium");
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function extract(text: string) {
  return extractStructuredDocument({
    condominiumId,
    documentId: "documentary-table-document",
    documentVersionId: "documentary-table-version",
    pages: [{ pageNumber: 1, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
  });
}

export const tableExecutors: ReadonlyMap<string, () => void | Promise<void>> = new Map([
  [
    "tabela com subtotal",
    () => {
      const result = extract(
        "Balancete 01/2026\nRubrica | Valor\nEnergia | R$ 100,00\nSubtotal despesas | R$ 100,00"
      );
      assert(
        result.financialEntries.length === 1 &&
          result.financialEntries[0]?.originalLabel === "Energia",
        "Subtotal foi duplicado como rubrica."
      );
    }
  ],
  [
    "tabela cortada",
    () => {
      const result = extract("Balancete 01/2026\nRubrica | Valor |\nEnergia | R$ 100,00 |");
      assert(
        result.tables[0]?.state === "needs_review" && result.financialEntries.length === 0,
        "Tabela cortada foi associada."
      );
    }
  ],
  [
    "tabela com rubrica multilinha",
    () => {
      const result = extract(
        "Balancete 01/2026\nRubrica | Valor\nManutenção\npreventiva | R$ 2.100,00"
      );
      assert(
        result.financialEntries[0]?.originalLabel === "Manutenção\npreventiva",
        "Rubrica multilinha foi dividida."
      );
    }
  ]
]);
