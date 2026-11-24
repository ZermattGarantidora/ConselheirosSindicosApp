import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createUserId,
  resolveAuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "../../apps/web/document-upload-request.js";
import { createLongPdfDocument, renderFullPagePdf } from "../fixtures/full-page-documents.js";
import {
  processDocumentVersion,
  documentVersionFromUpload
} from "../../apps/api/documents/document-processing.js";
import { identifyDocumentPages } from "../../apps/api/documents/document-identification.js";
import { extractStructuredDocument } from "../../apps/api/documents/structured/extract-structured-document.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";

const now = () => new Date("2026-11-05T12:00:00.000Z");
const headers = { "x-development-user-id": "sindico-demo" };

async function removeStorageDirectory(storageDirectory: string): Promise<void> {
  if (
    dirname(resolve(storageDirectory)) !== resolve(tmpdir()) ||
    !basename(storageDirectory).startsWith("alvitra-long-pdf-")
  ) {
    throw new Error("Diretório de teste fora da raiz temporária esperada.");
  }
  await rm(storageDirectory, { recursive: true, force: true });
}

describe("Spec 067: PDFs de 300 páginas", () => {
  it("AC-6701: envia, reconstrói todas as páginas e consulta fontes até o fim da página 300", async () => {
    const document = createLongPdfDocument();
    expect(document.pages).toHaveLength(300);
    expect(new Set(document.pages.map((page) => page.expectedText)).size).toBe(300);
    for (const page of document.pages) {
      expect(page.lines.length).toBeGreaterThanOrEqual(50);
      expect(page.expectedText.replaceAll(/\s/gu, "").length).toBeGreaterThanOrEqual(3000);
    }
    const content = renderFullPagePdf(document);
    const storageDirectory = await mkdtemp(join(tmpdir(), "alvitra-long-pdf-"));
    const memory = createDevelopmentDocumentMemory();
    const repository = createDevelopmentDocumentUploadRepository();
    const memberships = createDevelopmentIdentityRepository();
    const app = createApi({
      membershipRepository: memberships,
      documentCatalogRepository: repository,
      documentUploadRepository: repository,
      documentStorage: createLocalPrivateDocumentStorage(storageDirectory),
      developmentDocumentMemory: memory,
      now
    });
    try {
      const origin = await app.listen({ port: 0, host: "127.0.0.1" });
      const transport: typeof fetch = (input, init) =>
        fetch(typeof input === "string" ? new URL(input, origin) : input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(60_000)
        });
      const response = await requestDocumentUploadWithAuthorizationRecovery(transport, {
        condominiumId: "alameda",
        content: new Blob([new Uint8Array(content)], { type: "application/pdf" }),
        title: document.title,
        documentType: "other",
        authMode: "development",
        developmentUserId: "sindico-demo"
      });
      expect(response.status).toBe(202);
      const record = (await response.json()) as { documentId: string; documentVersionId: string };
      await expect
        .poll(
          async () => {
            const catalogResponse = await transport("/v1/condominiums/alameda/documents", {
              headers
            });
            expect(catalogResponse.status).toBe(200);
            const catalog = (await catalogResponse.json()) as {
              documents: { documentVersionId: string }[];
            };
            return catalog.documents.find(
              (item) => item.documentVersionId === record.documentVersionId
            );
          },
          { timeout: 60_000 }
        )
        .toMatchObject({
          processingStatus: "ready",
          expectedPageCount: 300,
          processedPageCount: 300,
          searchablePageCount: 300,
          extractionCompleteness: 1,
          unreadablePageNumbers: []
        });
      const filePath = `/v1/condominiums/alameda/documents/${record.documentVersionId}/file`;
      const original = await transport(filePath, { headers });
      expect(original.status).toBe(200);
      expect(Buffer.from(await original.arrayBuffer())).toEqual(content);
      const context = await resolveAuthorizedCondominiumContext(memberships, {
        userId: createUserId("sindico-demo"),
        condominiumId: createCondominiumId("alameda"),
        now: now()
      });
      const otherContext = await resolveAuthorizedCondominiumContext(memberships, {
        userId: createUserId("sindico-demo"),
        condominiumId: createCondominiumId("bosque"),
        now: now()
      });
      const [indexed] = await memory.analysisReader.readAuthorized(context, [
        record.documentVersionId
      ]);
      expect(indexed?.pages).toHaveLength(300);
      for (const [index, page] of document.pages.entries()) {
        expect(indexed!.pages[index]).toMatchObject({
          pageNumber: index + 1,
          extractedText: page.expectedText
        });
      }
      const retriever = createScopedTextRetriever(memory.index);
      for (const pageNumber of [1, 75, 150, 225, 299, 300]) {
        const page = document.pages[pageNumber - 1]!;
        for (const probe of page.probes) {
          const result = await retriever.search(context, { query: probe.question });
          expect(result.sufficiency.status).toBe("sufficient");
          expect(result.evidence).toContainEqual(
            expect.objectContaining({
              documentId: record.documentId,
              documentVersionId: record.documentVersionId,
              pageNumber,
              content: expect.stringContaining(probe.statement)
            })
          );
          for (const source of result.evidence) {
            expect(source.condominiumId).toBe("alameda");
            expect(source.documentVersionId).toBe(record.documentVersionId);
            const expected = document.pages[source.pageNumber - 1]!.expectedText;
            expect(Array.from(expected).slice(source.startOffset, source.endOffset).join("")).toBe(
              source.content
            );
            expect(createHash("sha256").update(source.content).digest("hex")).toBe(
              source.contentSha256
            );
          }
          expect(
            (await retriever.search(otherContext, { query: probe.question })).evidence
          ).toEqual([]);
        }
      }
      expect(
        await memory.analysisReader.readAuthorized(otherContext, [record.documentVersionId])
      ).toEqual([]);
      const forbidden = await transport(filePath.replace("/alameda/", "/bosque/"), { headers });
      expect(forbidden.status).toBe(404);
      await forbidden.arrayBuffer();
      const anonymous = await transport(filePath);
      expect(anonymous.status).toBe(401);
      await anonymous.arrayBuffer();
    } finally {
      await app.close();
      await removeStorageDirectory(storageDirectory);
    }
  }, 120_000);

  it("AC-6702: identifica sinal tardio e conserva conflito entre tipos", () => {
    const pages = Array.from({ length: 300 }, (_, index) => ({
      pageNumber: index + 1,
      extractedText: index === 299 ? "REGIMENTO INTERNO" : "Registro de acompanhamento.",
      extractionMethod: "pdf_text" as const,
      qualityScore: 1
    }));
    expect(identifyDocumentPages(pages)).toEqual({
      documentType: "internal_rules",
      identified: true
    });
    pages[0]!.extractedText = "CONVENÇÃO DO CONDOMÍNIO";
    expect(identifyDocumentPages(pages)).toEqual({ documentType: "other", identified: false });
    expect(
      extractStructuredDocument({
        condominiumId: createCondominiumId("alameda"),
        documentId: "document",
        documentVersionId: "version",
        pages
      }).documentKind
    ).toMatchObject({ value: "unknown", state: "needs_review" });
  });

  it.each([300, 501])(
    "AC-6705: não publica leitura incompleta ou excedente (%i páginas)",
    async (count) => {
      const content = createSyntheticPdf(
        Array.from({ length: count }, (_, index) =>
          index === 299 ? null : `Registro sintetico ${index + 1}`
        )
      );
      const identity = {
        condominiumId: createCondominiumId("alameda"),
        documentId: "document",
        documentVersionId: "version",
        sizeBytes: content.length,
        contentSha256: createHash("sha256").update(content).digest("hex")
      };
      const result = await processDocumentVersion({
        ...identity,
        content,
        currentState: documentVersionFromUpload(identity).state
      });
      if (count === 300) {
        expect(result).toMatchObject({
          status: "needs_review",
          state: { processingStatus: "needs_review" },
          extractionSummary: {
            expectedPageCount: 300,
            processedPageCount: 300,
            searchablePageCount: 299,
            unreadablePageNumbers: [300]
          }
        });
      } else {
        expect(result).toMatchObject({
          status: "failed",
          pages: [],
          state: { processingStatus: "failed" }
        });
      }
    },
    30_000
  );
});
