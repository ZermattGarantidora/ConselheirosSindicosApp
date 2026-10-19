import { assessOcrFinancialConsistency } from "../../../apps/api/documents/ocr-consistency/ocr-financial-consistency.js";
import { createCondominiumId } from "../../../apps/api/core/condominium-scope.js";
import { createDocumentVersion } from "../../../apps/api/documents/document-model.js";
import { processDocumentVersion } from "../../../apps/api/documents/document-processing.js";
import { createSyntheticScannedPdf } from "../../../tests/fixtures/synthetic-pdfs.js";

const condominiumId = createCondominiumId("documentary-ocr");

/** Exportado para o runner canônico pela frente de qualidade, sem acoplá-lo aqui. */
export const ocrExecutors: ReadonlyMap<string, () => void | Promise<void>> = new Map([
  [
    "OCR trocou 8 por 3",
    async () => {
      const decision = assessOcrFinancialConsistency({
        hasUnresolvedFinancialContent: false,
        condominiumId,
        documentId: "balancete-sintetico",
        documentVersionId: "balancete-sintetico-v1",
        entries: [
          {
            originalLabel: "Energia",
            originalAmount: "R$ 88,00",
            amountMinor: "8800",
            currency: "BRL",
            source: {
              condominiumId,
              documentId: "balancete-sintetico",
              documentVersionId: "balancete-sintetico-v1",
              pageNumber: 1,
              startOffset: 0,
              endOffset: 18,
              excerpt: "Energia R$ 88,00",
              extractionMethod: "ocr",
              uncertainty: []
            }
          }
        ],
        verifications: [
          {
            condominiumId,
            documentId: "balancete-sintetico",
            documentVersionId: "balancete-sintetico-v1",
            pageNumber: 1,
            normalizedRubric: "energia",
            observedAmountMinor: "8300",
            method: "operator_original_review"
          }
        ]
      });
      if (decision.reason !== "discrepant_financial_ocr") {
        throw new Error("A divergência 8/3 não bloqueou o uso financeiro do OCR.");
      }
      const content = createSyntheticScannedPdf(1);
      const initial = createDocumentVersion({
        condominiumId,
        id: "balancete-sintetico-v1",
        documentId: "balancete-sintetico",
        versionNumber: 1,
        contentSha256: "a".repeat(64),
        mediaType: "application/pdf",
        sizeBytes: content.length
      });
      const result = await processDocumentVersion({
        condominiumId,
        documentId: "balancete-sintetico",
        documentVersionId: "balancete-sintetico-v1",
        content,
        currentState: initial.state,
        ocrAdapter: {
          async recognize() {
            return {
              status: "completed",
              pages: [
                {
                  pageIndex: 0,
                  extractedText: "Balancete 01/2026\nEnergia R$ 88,00",
                  qualityScore: 1
                }
              ]
            };
          }
        },
        ocrNumericVerifications: [
          {
            condominiumId,
            documentId: "balancete-sintetico",
            documentVersionId: "balancete-sintetico-v1",
            pageNumber: 1,
            normalizedRubric: "energia",
            observedAmountMinor: "8300",
            method: "operator_original_review"
          }
        ]
      });
      if (
        result.status !== "needs_review" ||
        result.reason !== "ocr_numeric_discrepancy" ||
        result.state.processingStatus !== "needs_review"
      ) {
        throw new Error("O processamento publicou OCR financeiro discrepante.");
      }
    }
  ]
]);
