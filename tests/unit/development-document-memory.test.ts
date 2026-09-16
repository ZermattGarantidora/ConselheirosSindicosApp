import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createSyntheticScannedPdf, createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

function context(condominiumId: string): AuthorizedCondominiumContext {
  return Object.freeze({
    condominiumId: createCondominiumId(condominiumId),
    userId: createUserId("sindico-demo"),
    roleKey: "manager",
    membershipRevision: `membership-${condominiumId}`,
    permissions: ["document:read", "document:upload"] as const
  });
}

function uploadedRecord(condominiumId: string, content: Buffer): UploadedDocumentRecord {
  return Object.freeze({
    condominiumId: createCondominiumId(condominiumId),
    documentId: "11111111-1111-4111-8111-111111111111",
    documentVersionId: "22222222-2222-4222-8222-222222222222",
    storageObjectId: "33333333-3333-4333-8333-333333333333",
    storageKey: `${condominiumId}/33333333-3333-4333-8333-333333333333.pdf`,
    title: "Ata sintética de constituição",
    documentType: "meeting_minutes",
    contentSha256: createHash("sha256").update(content).digest("hex"),
    sizeBytes: content.length,
    uploadedByUserId: createUserId("sindico-demo"),
    processingStatus: "uploaded",
    validityStatus: "pending"
  });
}

describe("memória documental de desenvolvimento", () => {
  it("indexa PDF textual confirmado somente no condomínio do upload", async () => {
    const content = createSyntheticTextPdf();
    const memory = createDevelopmentDocumentMemory();
    const status = await memory.indexUploaded({
      record: uploadedRecord("residencial-azul", content),
      content,
      validityConfirmed: true
    });
    const retriever = createScopedTextRetriever(memory.index);
    const authorized = await retriever.search(context("residencial-azul"), {
      query: "Qual é a regra da primeira página?"
    });
    const otherCondominium = await retriever.search(context("residencial-verde"), {
      query: "Qual é a regra da primeira página?"
    });

    expect(status).toBe("ready");
    expect(authorized.evidence[0]).toMatchObject({
      condominiumId: "residencial-azul",
      documentTitle: "Ata sintética de constituição",
      pageNumber: 1
    });
    expect(otherCondominium.evidence).toEqual([]);
  });

  it("mantém PDF sem texto fora das respostas até revisão", async () => {
    const content = createSyntheticScannedPdf();
    const memory = createDevelopmentDocumentMemory();
    const status = await memory.indexUploaded({
      record: uploadedRecord("residencial-azul", content),
      content,
      validityConfirmed: true
    });
    const result = await createScopedTextRetriever(memory.index).search(
      context("residencial-azul"),
      { query: "O que a ata diz?" }
    );

    expect(status).toBe("needs_review");
    expect(result.evidence).toEqual([]);
  });
});
