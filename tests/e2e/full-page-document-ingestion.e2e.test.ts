import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import { createLocalPrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import {
  createUserId,
  resolveAuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { loadDocumentOriginal } from "../../apps/web/DocumentViewer.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "../../apps/web/document-upload-request.js";
import {
  createFullPageDocumentCorpus,
  renderFullPagePdf
} from "../fixtures/full-page-documents.js";

const corpus = createFullPageDocumentCorpus();
const headers = { "x-development-user-id": "sindico-demo" };
const now = () => new Date("2026-11-03T12:00:00.000Z");

async function removeTestStorageDirectory(storageDirectory: string): Promise<void> {
  if (
    dirname(resolve(storageDirectory)) !== resolve(tmpdir()) ||
    !basename(storageDirectory).startsWith("alvitra-full-page-pdfs-")
  ) {
    throw new Error("Diretório de teste fora da raiz temporária esperada.");
  }
  await rm(storageDirectory, { recursive: true, force: true });
}

describe("AC-1309: PDFs com páginas A4 preenchidas por HTTP e storage privado local", () => {
  beforeAll(() => {
    expect(corpus).toHaveLength(35);
    expect(
      [1, 2, 8].map((count) => corpus.filter((item) => item.pageCount === count).length)
    ).toEqual([20, 10, 5]);
    const pages = corpus.flatMap((item) => item.pages);
    expect(pages).toHaveLength(80);
    expect(new Set(corpus.map((item) => item.id)).size).toBe(35);
    expect(new Set(pages.map((page) => page.expectedText)).size).toBe(80);
    for (const page of pages) {
      expect(page.lines.filter((line) => line.trim().length > 0).length).toBeGreaterThanOrEqual(50);
      expect(page.expectedText.replaceAll(/\s/gu, "").length).toBeGreaterThanOrEqual(3000);
      expect(page.lines.every((line) => line.length <= 92)).toBe(true);
      expect(page.probes).toHaveLength(3);
      // Confirma que as consultas cobrem regiões diferentes, inclusive o fim da página.
      const positions = page.probes.map(
        (probe) => page.expectedText.indexOf(probe.statement) / page.expectedText.length
      );
      expect(positions[0]).toBeGreaterThanOrEqual(0);
      expect(positions[0]).toBeLessThan(0.15);
      expect(positions[1]).toBeGreaterThan(0.3);
      expect(positions[1]).toBeLessThan(0.6);
      expect(positions[2]).toBeGreaterThan(0.8);
    }
  });

  it.each(corpus)(
    "$id: $title ($pageCount pág. completas)",
    async (document) => {
      const storageDirectory = await mkdtemp(join(tmpdir(), "alvitra-full-page-pdfs-"));
      const memory = createDevelopmentDocumentMemory();
      const repository = createDevelopmentDocumentUploadRepository();
      const memberships = createDevelopmentIdentityRepository();
      const retriever = createScopedTextRetriever(memory.index);
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
            signal: init?.signal ?? AbortSignal.timeout(10_000)
          });
        const content = renderFullPagePdf(document);
        const uploaded = await requestDocumentUploadWithAuthorizationRecovery(transport, {
          condominiumId: "alameda",
          content: new Blob([new Uint8Array(content)], { type: "application/pdf" }),
          title: document.title,
          documentType: "other",
          authMode: "development",
          developmentUserId: "sindico-demo"
        });
        expect(uploaded.status).toBe(202);
        const record = (await uploaded.json()) as {
          documentId: string;
          documentVersionId: string;
          processingStatus: string;
        };
        expect(record.processingStatus).toBe("uploaded");
        const original = await loadDocumentOriginal(
          transport,
          {
            condominiumId: "alameda",
            documentVersionId: record.documentVersionId,
            title: document.title,
            page: 1
          },
          headers,
          AbortSignal.timeout(10_000)
        );
        expect(Buffer.from(await original.arrayBuffer())).toEqual(content);
        await expect
          .poll(
            async () => {
              const response = await transport("/v1/condominiums/alameda/documents", { headers });
              expect(response.status).toBe(200);
              const catalog = (await response.json()) as { documents: RegisteredDocument[] };
              return catalog.documents.find(
                (item) => item.documentVersionId === record.documentVersionId
              );
            },
            { timeout: 10_000 }
          )
          .toMatchObject({
            documentId: record.documentId,
            documentVersionId: record.documentVersionId,
            title: document.title,
            processingStatus: "ready",
            expectedPageCount: document.pageCount,
            processedPageCount: document.pageCount,
            searchablePageCount: document.pageCount,
            unreadablePageNumbers: [],
            extractionCompleteness: 1,
            extractionMethod: "pdf_text"
          });

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
        const indexedDocuments = await memory.analysisReader.readAuthorized(context, [
          record.documentVersionId
        ]);
        expect(indexedDocuments).toHaveLength(1);
        expect(indexedDocuments[0]).toMatchObject({
          condominiumId: "alameda",
          documentId: record.documentId,
          documentVersionId: record.documentVersionId
        });
        const indexedPages = indexedDocuments[0]!.pages;
        expect(indexedPages).toHaveLength(document.pageCount);
        for (const [index, page] of document.pages.entries()) {
          expect(indexedPages[index]).toMatchObject({
            pageNumber: index + 1,
            extractedText: page.expectedText,
            extractionMethod: "pdf_text",
            qualityScore: 1
          });
          for (const probe of page.probes) {
            const result = await retriever.search(context, { query: probe.question });
            expect(result.sufficiency.status, probe.question).toBe("sufficient");
            expect(result.evidence, probe.question).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  documentId: record.documentId,
                  documentVersionId: record.documentVersionId,
                  pageNumber: index + 1,
                  content: expect.stringContaining(probe.statement)
                })
              ])
            );
            for (const evidence of result.evidence) {
              expect(evidence.condominiumId).toBe("alameda");
              expect(evidence.documentId).toBe(record.documentId);
              expect(evidence.documentVersionId).toBe(record.documentVersionId);
              const sourceText = document.pages[evidence.pageNumber - 1]!.expectedText;
              expect(
                Array.from(sourceText).slice(evidence.startOffset, evidence.endOffset).join("")
              ).toBe(evidence.content);
              expect(createHash("sha256").update(evidence.content).digest("hex")).toBe(
                evidence.contentSha256
              );
            }
            const crossTenant = await retriever.search(otherContext, { query: probe.question });
            expect(crossTenant.evidence).toEqual([]);
          }
        }
        const filePath = `/v1/condominiums/alameda/documents/${record.documentVersionId}/file`;
        const unauthenticated = await transport(filePath);
        expect(unauthenticated.status).toBe(401);
        await unauthenticated.arrayBuffer();
        const crossTenant = await transport(filePath.replace("/alameda/", "/bosque/"), { headers });
        expect(crossTenant.status).toBe(404);
        await crossTenant.arrayBuffer();
        expect(
          await memory.analysisReader.readAuthorized(otherContext, [record.documentVersionId])
        ).toEqual([]);
      } finally {
        await app.close();
        await removeTestStorageDirectory(storageDirectory);
      }
    },
    30_000
  );
});
