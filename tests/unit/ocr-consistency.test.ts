import { describe, expect, it } from "vitest";

import { assessOcrFinancialConsistency } from "../../apps/api/documents/ocr-consistency/ocr-financial-consistency.js";
import { processDocumentVersion } from "../../apps/api/documents/document-processing.js";
import { createDocumentVersion } from "../../apps/api/documents/document-model.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createSyntheticScannedPdf } from "../fixtures/synthetic-pdfs.js";
import { ocrExecutors } from "../../evals/documentary-quality/ocr/executors.js";

const condominiumId = createCondominiumId("ocr-consistency");
const entry = {
  originalLabel: "Energia",
  originalAmount: "R$ 88,00",
  amountMinor: "8800",
  currency: "BRL" as const,
  source: {
    condominiumId,
    documentId: "document",
    documentVersionId: "version",
    pageNumber: 1,
    startOffset: 0,
    endOffset: 18,
    excerpt: "Energia R$ 88,00",
    extractionMethod: "ocr" as const,
    uncertainty: []
  }
};

describe("conferência numérica do OCR", () => {
  it.each([
    "Balancete 01/2026\nEnergia | R$ 88,00 | R$ 83,00",
    "Energia | R$ 88,00 | R$ 83,00",
    "Balancete 01/2026\nEnergia | R$ 88,00 |",
    "Balancete 01/2026\nEnergia R$ ilegível",
    "Balancete 01/2026\nValores ilegíveis",
    "Balancete 01/2026\nEnergia R$ 88,00\nÁgua | R$ 10,00 | R$ 20,00",
    "Balancete 01/2026\nEnergia R$ 88,00\nÁgua R$ ilegível"
  ])("não publica extração financeira vazia ou parcial: %s", async (extractedText) => {
    const outcome = await processOcrText(extractedText);
    expect(outcome).toMatchObject({
      status: "needs_review",
      reason: "ocr_numeric_unverified",
      state: { processingStatus: "needs_review" }
    });
    expect(outcome.structuredExtraction).toBeDefined();
  });

  it("não bloqueia ata textual sem conteúdo financeiro", async () => {
    const outcome = await processOcrText(
      "Ata da assembleia\nA reunião foi encerrada às dezoito horas."
    );
    expect(outcome).toMatchObject({ status: "completed", state: { processingStatus: "ready" } });
    expect(outcome.structuredExtraction?.financialEntries).toEqual([]);
  });

  it("não trata score alto como comprovação de valor financeiro", () => {
    expect(
      assessOcrFinancialConsistency({
        condominiumId,
        documentId: "document",
        documentVersionId: "version",
        entries: [entry],
        hasUnresolvedFinancialContent: false
      })
    ).toMatchObject({ processingStatus: "needs_review", reason: "unverified_financial_ocr" });
  });

  it("bloqueia a divergência 8/3 sem escolher um número", () => {
    expect(
      assessOcrFinancialConsistency({
        condominiumId,
        documentId: "document",
        documentVersionId: "version",
        entries: [entry],
        hasUnresolvedFinancialContent: false,
        verifications: [
          {
            condominiumId,
            documentId: "document",
            documentVersionId: "version",
            pageNumber: 1,
            normalizedRubric: "energia",
            observedAmountMinor: "8300",
            method: "operator_original_review"
          }
        ]
      })
    ).toMatchObject({
      processingStatus: "needs_review",
      reason: "discrepant_financial_ocr",
      entries: [{ status: "discrepant" }]
    });
  });

  it("aceita apenas confirmação exata e escopada", () => {
    const verification = {
      condominiumId,
      documentId: "document",
      documentVersionId: "version",
      pageNumber: 1,
      normalizedRubric: "energia",
      observedAmountMinor: "8800",
      method: "independent_authorized_read" as const
    };
    expect(
      assessOcrFinancialConsistency({
        condominiumId,
        documentId: "document",
        documentVersionId: "version",
        entries: [entry],
        hasUnresolvedFinancialContent: false,
        verifications: [verification]
      }).processingStatus
    ).toBe("ready");
    expect(
      assessOcrFinancialConsistency({
        condominiumId,
        documentId: "document",
        documentVersionId: "version",
        entries: [entry],
        hasUnresolvedFinancialContent: false,
        verifications: [{ ...verification, documentVersionId: "other" }]
      }).processingStatus
    ).toBe("needs_review");
  });

  it("mantém documento OCR financeiro em revisão até receber confirmação", async () => {
    const content = createSyntheticScannedPdf(1);
    const initial = createDocumentVersion({
      id: "version",
      documentId: "document",
      condominiumId,
      versionNumber: 1,
      contentSha256: "a".repeat(64),
      mediaType: "application/pdf",
      sizeBytes: content.length
    });
    const outcome = await processDocumentVersion({
      condominiumId,
      documentId: "document",
      documentVersionId: "version",
      content,
      currentState: initial.state,
      ocrAdapter: {
        async recognize() {
          return {
            status: "completed" as const,
            pages: [
              {
                pageIndex: 0,
                extractedText: "Balancete 01/2026\nEnergia R$ 88,00",
                qualityScore: 0.99
              }
            ]
          };
        }
      }
    });
    expect(outcome).toMatchObject({ status: "needs_review", reason: "ocr_numeric_unverified" });
  });

  it("libera apenas a confirmação exata e expõe o executor documental", async () => {
    const content = createSyntheticScannedPdf(1);
    const initial = createDocumentVersion({
      id: "version",
      documentId: "document",
      condominiumId,
      versionNumber: 1,
      contentSha256: "b".repeat(64),
      mediaType: "application/pdf",
      sizeBytes: content.length
    });
    const outcome = await processDocumentVersion({
      condominiumId,
      documentId: "document",
      documentVersionId: "version",
      content,
      currentState: initial.state,
      ocrNumericVerifications: [
        {
          condominiumId,
          documentId: "document",
          documentVersionId: "version",
          pageNumber: 1,
          normalizedRubric: "energia",
          observedAmountMinor: "8800",
          method: "operator_original_review"
        }
      ],
      ocrAdapter: {
        async recognize() {
          return {
            status: "completed" as const,
            pages: [
              {
                pageIndex: 0,
                extractedText: "Balancete 01/2026\nEnergia R$ 88,00",
                qualityScore: 0.99
              }
            ]
          };
        }
      }
    });
    expect(outcome.status).toBe("completed");
    const executor = ocrExecutors.get("OCR trocou 8 por 3");
    expect(executor).toBeDefined();
    await expect(executor?.()).resolves.toBeUndefined();
  });
});

async function processOcrText(extractedText: string) {
  const content = createSyntheticScannedPdf(1);
  const initial = createDocumentVersion({
    id: "version",
    documentId: "document",
    condominiumId,
    versionNumber: 1,
    contentSha256: "c".repeat(64),
    mediaType: "application/pdf",
    sizeBytes: content.length
  });
  return processDocumentVersion({
    condominiumId,
    documentId: "document",
    documentVersionId: "version",
    content,
    currentState: initial.state,
    ocrNumericVerifications: [
      {
        condominiumId,
        documentId: "document",
        documentVersionId: "version",
        pageNumber: 1,
        normalizedRubric: "energia",
        observedAmountMinor: "8800",
        method: "operator_original_review"
      }
    ],
    ocrAdapter: {
      async recognize() {
        return { status: "completed", pages: [{ pageIndex: 0, extractedText, qualityScore: 1 }] };
      }
    }
  });
}
