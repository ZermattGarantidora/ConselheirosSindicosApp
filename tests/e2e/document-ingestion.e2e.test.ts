import { describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createScopedDocumentProcessor,
  documentVersionFromUpload,
  type SavedDocumentProcessingResult,
  type StoredDocumentForProcessing
} from "../../apps/api/documents/document-processing.js";
import type { PrivateStorageObject } from "../../apps/api/documents/private-document-storage.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import type { OcrAdapter } from "../../apps/api/documents/ocr-quality.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
import { createSyntheticScannedPdf, createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

type SyntheticProcessingStore = {
  original?: PrivateStorageObject;
  uploaded?: UploadedDocumentRecord;
  processingResult?: SavedDocumentProcessingResult;
};

function createProcessingStore(store: SyntheticProcessingStore) {
  const records: UploadedDocumentRecord[] = [];

  return {
    storage: {
      async storeOriginal(input: PrivateStorageObject) {
        store.original = input;
        return { storageKey: `synthetic/${input.objectId}` };
      },
      async removeOriginal() {}
    },
    repository: {
      async recordUploaded(record: UploadedDocumentRecord) {
        records.push(record);
        store.uploaded = record;
      }
    },
    records
  };
}

async function uploadSyntheticDocument(
  content: Buffer,
  store: SyntheticProcessingStore
): Promise<void> {
  const dependencies = createProcessingStore(store);
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    documentStorage: dependencies.storage,
    documentUploadRepository: dependencies.repository,
    now: () => new Date("2026-09-01T00:00:00.000Z")
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/documents",
    headers: {
      "content-type": "application/pdf",
      "x-development-user-id": "sindico-demo",
      "x-document-title": "Documento sintético",
      "x-document-type": "convention"
    },
    payload: content
  });

  expect(response.statusCode).toBe(202);
  expect(response.body).not.toContain("synthetic/");
  expect(store.uploaded).toBeDefined();
  await app.close();
}

async function processUploadedDocument(
  store: SyntheticProcessingStore,
  ocrAdapter?: OcrAdapter
): Promise<SavedDocumentProcessingResult> {
  const uploaded = store.uploaded;
  const original = store.original;

  if (uploaded === undefined || original === undefined) {
    throw new Error("Fixture sintética não foi enviada.");
  }

  const document = documentVersionFromUpload(uploaded);
  const storedDocument: StoredDocumentForProcessing = {
    condominiumId: uploaded.condominiumId,
    documentVersionId: uploaded.documentVersionId,
    content: original.content,
    state: document.state
  };
  const processor = createScopedDocumentProcessor(
    {
      async loadForProcessing(input) {
        expect(input).toEqual({
          condominiumId: uploaded.condominiumId,
          documentVersionId: uploaded.documentVersionId,
          jobId: "job-synthetic-1",
          attemptCount: 1
        });
        return storedDocument;
      },
      async saveProcessingResult(input) {
        store.processingResult = input;
      }
    },
    ocrAdapter
  );

  await expect(
    processOne(
      {
        async claimNext() {
          return {
            jobId: "job-synthetic-1",
            condominiumId: uploaded.condominiumId,
            documentVersionId: uploaded.documentVersionId,
            attemptCount: 1
          };
        }
      },
      processor
    )
  ).resolves.toBe("processed");

  if (store.processingResult === undefined) {
    throw new Error("O resultado de processamento não foi persistido.");
  }

  return store.processingResult;
}

describe("ingestão documental de ponta a ponta", { timeout: 15_000 }, () => {
  it("AC-004: envia, registra o original e publica PDF textual pronto com páginas verificáveis", async () => {
    const store: SyntheticProcessingStore = {};
    const content = createSyntheticTextPdf();
    await uploadSyntheticDocument(content, store);

    const result = await processUploadedDocument(store);

    expect(store.original?.content).toEqual(content);
    expect(store.uploaded).toMatchObject({
      condominiumId: createCondominiumId("alameda"),
      processingStatus: "uploaded",
      validityStatus: "pending"
    });
    expect(result).toMatchObject({
      outcome: {
        status: "completed",
        state: { processingStatus: "ready" },
        pages: [
          { pageNumber: 1, extractedText: "Regra da primeira pagina" },
          { pageNumber: 2, extractedText: "Regra da segunda pagina" }
        ]
      }
    });
  });

  it("AC-005: envia PDF digitalizado e não publica OCR abaixo do piso como pronto", async () => {
    const store: SyntheticProcessingStore = {};
    const content = createSyntheticScannedPdf();
    await uploadSyntheticDocument(content, store);
    const ocrAdapter: OcrAdapter = {
      async recognize() {
        return {
          status: "completed",
          pages: [{ pageIndex: 0, extractedText: "trecho ilegível", qualityScore: 0.4 }]
        };
      }
    };

    const result = await processUploadedDocument(store, ocrAdapter);

    expect(result).toMatchObject({
      outcome: {
        status: "needs_review",
        reason: "ocr_low_quality",
        state: { processingStatus: "needs_review", ocrQualityScore: 0.4 }
      }
    });
  });
});
