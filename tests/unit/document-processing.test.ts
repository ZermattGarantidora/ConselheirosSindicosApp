import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDocumentVersion } from "../../apps/api/documents/document-model.js";
import {
  createScopedDocumentProcessor,
  processDocumentVersion,
  type DocumentProcessingOutcome,
  type DocumentProcessingRepository
} from "../../apps/api/documents/document-processing.js";
import type { OcrAdapter } from "../../apps/api/documents/ocr-quality.js";
import type { ImageAnalysisAdapter } from "../../apps/api/documents/gemini-image-analysis.js";
import type { MultimodalImageEmbeddingAdapter } from "../../apps/api/retrieval/gemini-multimodal-embedding.js";
import { geminiImageEmbeddingProfile } from "../../apps/api/retrieval/gemini-multimodal-embedding.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
import { createSyntheticScannedPdf, createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const alameda = createCondominiumId("alameda");

function syntheticPng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from("IHDR"),
    Buffer.from([0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
    Buffer.alloc(4),
    Buffer.from([0, 0, 0, 1]),
    Buffer.from("IDAT"),
    Buffer.from([0]),
    Buffer.alloc(4),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("IEND"),
    Buffer.alloc(4)
  ]);
}

function createVersionState() {
  return createDocumentVersion({
    id: "version-1",
    condominiumId: alameda,
    documentId: "document-1",
    versionNumber: 1,
    contentSha256: "a".repeat(64),
    mediaType: "application/pdf",
    sizeBytes: 128
  }).state;
}

describe("processamento documental", () => {
  it("publica PDF textual como pronto, preservando página humana e localização", async () => {
    const ocrAdapter: OcrAdapter = {
      recognize: vi.fn(async () => {
        throw new Error("OCR não deve ser chamado para PDF textual");
      })
    };

    const result = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "version-1",
      content: createSyntheticTextPdf(),
      currentState: createVersionState(),
      ocrAdapter
    });

    expect(result).toMatchObject({
      status: "completed",
      state: { processingStatus: "ready", ocrQualityScore: null },
      pages: [
        { pageIndex: 0, pageNumber: 1, extractionMethod: "pdf_text", qualityScore: 1 },
        { pageIndex: 1, pageNumber: 2, extractionMethod: "pdf_text", qualityScore: 1 }
      ]
    });
    expect(result.status === "completed" ? result.pages[1]?.extractedText : "").toBe(
      "Regra da segunda pagina"
    );
    expect(result).toMatchObject({
      extractionSummary: {
        expectedPageCount: 2,
        processedPageCount: 2,
        searchablePageCount: 2,
        unreadablePageNumbers: [],
        extractionCompleteness: 1,
        extractionMethod: "pdf_text"
      }
    });
    expect(ocrAdapter.recognize).not.toHaveBeenCalled();
  });

  it("mantém PDF digitalizado em revisão quando OCR fica abaixo do piso", async () => {
    const received: Array<{ condominiumId: string; documentVersionId: string; content: Buffer }> =
      [];
    const ocrAdapter: OcrAdapter = {
      async recognize(input) {
        received.push(input);
        return {
          status: "completed",
          pages: [
            { pageIndex: 0, extractedText: "texto incerto", qualityScore: 0.5 },
            { pageIndex: 1, extractedText: "texto incerto", qualityScore: 0.6 }
          ]
        };
      }
    };

    const content = createSyntheticScannedPdf(2);
    const result = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "version-1",
      content,
      currentState: createVersionState(),
      ocrAdapter
    });

    expect(result).toMatchObject({
      status: "needs_review",
      state: { processingStatus: "needs_review", ocrQualityScore: 0.55 },
      reason: "ocr_low_quality",
      pages: [
        { pageIndex: 0, pageNumber: 1, extractionMethod: "ocr", qualityScore: 0.5 },
        { pageIndex: 1, pageNumber: 2, extractionMethod: "ocr", qualityScore: 0.6 }
      ]
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ condominiumId: "alameda", documentVersionId: "version-1" });
    expect(received[0]?.content).toEqual(content);
  });

  it("não libera OCR incompleto e trata indisponibilidade como revisão", async () => {
    const invalidOcr: OcrAdapter = {
      async recognize() {
        return {
          status: "completed",
          pages: [{ pageIndex: 0, extractedText: "uma página", qualityScore: 1 }]
        };
      }
    };
    const invalidResult = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "version-1",
      content: createSyntheticScannedPdf(2),
      currentState: createVersionState(),
      ocrAdapter: invalidOcr
    });

    expect(invalidResult).toMatchObject({
      status: "needs_review",
      reason: "ocr_invalid",
      state: { processingStatus: "needs_review", ocrQualityScore: 0 }
    });

    const unavailableResult = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "version-1",
      content: createSyntheticScannedPdf(),
      currentState: createVersionState()
    });
    expect(unavailableResult).toMatchObject({
      status: "needs_review",
      reason: "ocr_unavailable",
      state: { processingStatus: "needs_review", ocrQualityScore: null }
    });
    expect(unavailableResult).toMatchObject({
      extractionSummary: {
        expectedPageCount: 1,
        processedPageCount: 1,
        searchablePageCount: 0,
        unreadablePageNumbers: [1],
        extractionCompleteness: 0,
        extractionMethod: "pdf_text"
      }
    });
  });

  it("falha com segurança quando o parser PDF não consegue ler o original", async () => {
    const result = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "version-1",
      content: Buffer.from("%PDF-1.7 inválido"),
      currentState: createVersionState()
    });

    expect(result).toMatchObject({
      status: "failed",
      reason: "pdf_parse_failed",
      state: { processingStatus: "failed" },
      pages: []
    });
  });

  it("interpreta foto sintética e só publica a página quando descrição e vetor estão prontos", async () => {
    const content = syntheticPng();
    const analysisAdapter: ImageAnalysisAdapter = {
      async analyze(input) {
        expect(input).toMatchObject({ condominiumId: "alameda", mediaType: "image/png" });
        return {
          visualDescription: "Uma parede com uma pequena mancha escura.",
          recognizedText: "Bloco A",
          limitations: "A foto não permite identificar a causa da mancha."
        };
      }
    };
    const embeddingAdapter: MultimodalImageEmbeddingAdapter = {
      profile: geminiImageEmbeddingProfile,
      async embed(input) {
        return {
          ...geminiImageEmbeddingProfile,
          values: Array(768).fill(0),
          contentSha256: input.contentSha256
        };
      },
      async embedImageAndText(input) {
        expect(input.mediaType).toBe("image/png");
        return {
          ...geminiImageEmbeddingProfile,
          values: Array(768).fill(0.01),
          contentSha256: input.contentSha256
        };
      }
    };
    const result = await processDocumentVersion({
      condominiumId: alameda,
      documentVersionId: "photo-version",
      content,
      mediaType: "image/png",
      currentState: createDocumentVersion({
        id: "photo-version",
        condominiumId: alameda,
        documentId: "photo-document",
        versionNumber: 1,
        contentSha256: "b".repeat(64),
        mediaType: "image/png",
        sizeBytes: content.length
      }).state,
      imageAnalysisAdapter: analysisAdapter,
      imageEmbeddingAdapter: embeddingAdapter
    });

    expect(result).toMatchObject({
      status: "completed",
      state: { processingStatus: "ready" },
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "image_vision",
          qualityScore: 1,
          visualDescription: "Uma parede com uma pequena mancha escura.",
          recognizedText: "Bloco A",
          analysisLimitations: "A foto não permite identificar a causa da mancha."
        }
      ],
      extractionSummary: { extractionMethod: "image_vision", searchablePageCount: 1 }
    });
    expect(result.status === "completed" ? result.pages[0]?.extractedText : "").toContain(
      "Observação visual gerada por IA"
    );
    expect(result.status === "completed" ? result.pages[0]?.multimodalEmbeddings : []).toHaveLength(
      1
    );
  });

  it("mantém imagem não analisada ou com falha em revisão, sem vetor consultável", async () => {
    const input = {
      condominiumId: alameda,
      documentVersionId: "photo-version",
      content: syntheticPng(),
      mediaType: "image/png" as const,
      currentState: createDocumentVersion({
        id: "photo-version",
        condominiumId: alameda,
        documentId: "photo-document",
        versionNumber: 1,
        contentSha256: "b".repeat(64),
        mediaType: "image/png",
        sizeBytes: syntheticPng().length
      }).state
    };
    const disabled = await processDocumentVersion(input);
    expect(disabled).toMatchObject({
      status: "needs_review",
      reason: "image_analysis_unavailable"
    });
    expect(disabled.pages[0]?.extractedText).toBe("");

    const failed = await processDocumentVersion({
      ...input,
      imageAnalysisAdapter: {
        async analyze() {
          throw new Error("provider unavailable");
        }
      },
      imageEmbeddingAdapter: {
        profile: geminiImageEmbeddingProfile,
        async embed() {
          throw new Error("not called");
        },
        async embedImageAndText() {
          throw new Error("not called");
        }
      }
    });
    expect(failed).toMatchObject({ status: "needs_review", reason: "image_analysis_failed" });
  });

  it("liga o worker ao processador escopado e persiste somente o resultado do job", async () => {
    const saved: Array<{
      condominiumId: string;
      documentVersionId: string;
      outcome: DocumentProcessingOutcome;
    }> = [];
    const repository: DocumentProcessingRepository = {
      async loadForProcessing(input) {
        return {
          ...input,
          content: createSyntheticTextPdf(),
          state: createVersionState()
        };
      },
      async saveProcessingResult(input) {
        saved.push(input);
      }
    };
    const processor = createScopedDocumentProcessor(repository);

    await expect(
      processOne(
        {
          async claimNext() {
            return {
              jobId: "job-1",
              condominiumId: alameda,
              documentVersionId: "version-1",
              attemptCount: 1
            };
          }
        },
        processor
      )
    ).resolves.toBe("processed");

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      condominiumId: "alameda",
      documentVersionId: "version-1",
      outcome: { status: "completed", state: { processingStatus: "ready" } }
    });
  });

  it("rejeita uma fonte de processamento que devolva outro condomínio", async () => {
    const repository: DocumentProcessingRepository = {
      async loadForProcessing(input) {
        return {
          ...input,
          condominiumId: createCondominiumId("bosque"),
          content: createSyntheticTextPdf(),
          state: createVersionState()
        };
      },
      async saveProcessingResult() {}
    };

    await expect(
      createScopedDocumentProcessor(repository).process({
        condominiumId: alameda,
        documentVersionId: "version-1",
        jobId: "job-1",
        attemptCount: 1
      })
    ).rejects.toThrow("não pertence ao condomínio");
  });
});
