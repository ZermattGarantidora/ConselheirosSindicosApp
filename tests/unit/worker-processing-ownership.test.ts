import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createScopedDocumentProcessor,
  type DocumentProcessingRepository
} from "../../apps/api/documents/document-processing.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const content = createSyntheticTextPdf();
const job = {
  condominiumId: createCondominiumId("synthetic"),
  documentVersionId: "version",
  jobId: "job",
  attemptCount: 2
};
const stored = {
  condominiumId: job.condominiumId,
  documentVersionId: job.documentVersionId,
  documentId: "document",
  content,
  mediaType: "application/pdf" as const,
  state: {
    processingStatus: "processing" as const,
    validityStatus: "confirmed" as const,
    validFrom: null,
    validUntil: null,
    ocrQualityScore: null
  }
};

describe("AC-6902/6903 — documento reservado e retomado", () => {
  it("processa versão já marcada processing, preservando páginas e tentativa atual", async () => {
    const saveProcessingResult = vi.fn();
    await createScopedDocumentProcessor({
      loadForProcessing: async () => stored,
      saveProcessingResult
    }).process(job);
    expect(saveProcessingResult).toHaveBeenCalledOnce();
    expect(saveProcessingResult.mock.calls[0]![0]).toMatchObject({
      ...job,
      outcome: {
        status: "completed",
        state: { processingStatus: "ready" },
        extractionSummary: { expectedPageCount: 2, processedPageCount: 2, searchablePageCount: 2 }
      }
    });
    expect(saveProcessingResult.mock.calls[0]![0].outcome.pages[0].contentSha256).toBe(
      createHash("sha256").update("Regra da primeira pagina").digest("hex")
    );
  });
  it("reserva perdida antes ou durante a carga não processa nem publica o original", async () => {
    const controller = new AbortController();
    const repository: DocumentProcessingRepository = {
      loadForProcessing: vi.fn(async () => {
        controller.abort();
        return stored;
      }),
      saveProcessingResult: vi.fn()
    };
    const processor = createScopedDocumentProcessor(repository);
    await expect(processor.process({ ...job, signal: controller.signal })).rejects.toThrow();
    expect(repository.saveProcessingResult).not.toHaveBeenCalled();
    await expect(processor.process({ ...job, signal: controller.signal })).rejects.toThrow();
    expect(repository.loadForProcessing).toHaveBeenCalledOnce();
  });
});
