import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import {
  createSyntheticPdf,
  createSyntheticScannedPdf,
  createSyntheticTextPdf
} from "../fixtures/synthetic-pdfs.js";

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
    mediaType: "application/pdf",
    contentSha256: createHash("sha256").update(content).digest("hex"),
    sizeBytes: content.length,
    uploadedByUserId: createUserId("sindico-demo"),
    processingStatus: "uploaded",
    validityStatus: "pending"
  });
}

describe("memória documental de desenvolvimento", () => {
  it.each([true, false])(
    "AC-7125: fonte do upload conserva a página inteira e isolamento; vigência confirmada=%s",
    async (validityConfirmed) => {
      const lines = Array.from(
        { length: 45 },
        (_, index) =>
          `Linha ficticia ${index + 1}: a assembleia sintetica organiza documentos para consulta integral autorizada.`
      );
      const content = createSyntheticPdf([lines.join("\n")], {
        pageWidth: 1200,
        fontSize: 8,
        multiline: true
      });
      const record = uploadedRecord("residencial-azul", content);
      const memory = createDevelopmentDocumentMemory();
      const catalog = createDevelopmentDocumentUploadRepository();
      await catalog.recordUploaded(record);
      const reader = memory.createSourceReader(catalog);
      expect(await memory.indexUploaded({ record, content, validityConfirmed })).toBe(
        validityConfirmed ? "ready" : "pending_confirmation"
      );
      const input = {
        documentId: record.documentId,
        documentVersionId: record.documentVersionId,
        page: 1
      };
      const page = await reader.getAuthorizedPage(context("residencial-azul"), input);
      expect(page).toMatchObject({ ...input, title: record.title });
      expect(page?.content.length).toBeGreaterThan(3000);
      expect(page?.content).toContain(lines[0]);
      expect(page?.content).toContain(lines.at(-1));
      await expect(
        reader.getAuthorizedPage(context("residencial-verde"), input)
      ).resolves.toBeUndefined();
      await expect(
        reader.getAuthorizedPage({ ...context("residencial-azul"), permissions: [] }, input)
      ).resolves.toBeUndefined();
      for (const changed of [
        { page: 2 },
        { documentId: "missing" },
        { documentVersionId: "missing" }
      ])
        await expect(
          reader.getAuthorizedPage(context("residencial-azul"), {
            ...input,
            ...changed
          })
        ).resolves.toBeUndefined();
    }
  );

  it("AC-7125/AC-2007: arquivar nega página inteira; recuperar e versão histórica ativa mantêm escopo", async () => {
    const content = createSyntheticTextPdf();
    const a = uploadedRecord("residencial-azul", content);
    const newer = { ...a, documentVersionId: "55555555-5555-4555-8555-555555555555" };
    const b = {
      ...uploadedRecord("residencial-verde", content),
      documentId: "66666666-6666-4666-8666-666666666666",
      documentVersionId: "77777777-7777-4777-8777-777777777777"
    };
    const memory = createDevelopmentDocumentMemory();
    const catalog = createDevelopmentDocumentUploadRepository();
    const reader = memory.createSourceReader(catalog);
    for (const record of [a, newer, b]) {
      await catalog.recordUploaded(record);
      expect(await memory.indexUploaded({ record, content, validityConfirmed: true })).toBe(
        "ready"
      );
    }
    const input = (record: UploadedDocumentRecord) => ({
      documentId: record.documentId,
      documentVersionId: record.documentVersionId,
      page: 1
    });
    const previous = await reader.getAuthorizedPage(context("residencial-azul"), input(a));
    const foreign = await reader.getAuthorizedPage(context("residencial-verde"), input(b));
    expect(previous?.content).toBe("Regra da primeira pagina");
    expect(foreign?.content).toBe("Regra da primeira pagina");
    expect(await catalog.archiveAuthorized?.(context("residencial-azul"), a.documentId)).toBe(true);
    await expect(
      reader.getAuthorizedPage(context("residencial-azul"), input(a))
    ).resolves.toBeUndefined();
    await expect(
      reader.getAuthorizedPage(context("residencial-azul"), input(newer))
    ).resolves.toBeUndefined();
    await expect(reader.getAuthorizedPage(context("residencial-verde"), input(b))).resolves.toEqual(
      foreign
    );
    expect(await catalog.restoreAuthorized?.(context("residencial-azul"), a.documentId)).toBe(true);
    await expect(reader.getAuthorizedPage(context("residencial-azul"), input(a))).resolves.toEqual(
      previous
    );
  });

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
