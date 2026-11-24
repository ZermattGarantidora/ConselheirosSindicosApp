import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { DocumentLibrary } from "../../apps/web/DocumentLibrary.js";
import { waitForDocumentProcessing } from "../../apps/web/document-processing-request.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";
import {
  loadCondominiumDocuments,
  summarizeDocumentAvailability,
  filterLibraryDocuments
} from "../../apps/web/document-library.js";
import { loadSavedChat, openChatSession, saveChat } from "../../apps/web/chat-session.js";

function registeredDocument(
  condominiumId: "alameda" | "bosque",
  processingStatus: "ready" | "failed"
): RegisteredDocument {
  return {
    condominiumId: createCondominiumId(condominiumId),
    documentId: `${condominiumId}-${processingStatus}`,
    documentVersionId: `${condominiumId}-${processingStatus}-v1`,
    title: `Arquivo sintético exclusivo de ${condominiumId}`,
    documentType: "convention",
    versionNumber: 1,
    sizeBytes: 1024,
    processingStatus,
    validityStatus: "confirmed",
    createdAt: "2026-10-27T12:00:00Z",
    expectedPageCount: 1,
    processedPageCount: 1,
    searchablePageCount: processingStatus === "ready" ? 1 : 0,
    unreadablePageNumbers: [],
    extractionCompleteness: 1,
    extractionMethod: "pdf_text",
    ocrQualityScore: null
  };
}

describe("carteira, chats e biblioteca isolados — Spec 044", () => {
  it("AC-4405/4408: upload real sintético classifica balancete pelo conteúdo e mantém percentual nos detalhes", async () => {
    const repository = createDevelopmentDocumentUploadRepository();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentCatalogRepository: repository,
      documentUploadRepository: repository,
      developmentDocumentMemory: createDevelopmentDocumentMemory(),
      documentStorage: {
        async storeOriginal() {
          return { storageKey: "synthetic" };
        },
        async removeOriginal() {}
      }
    });
    const headers = { "x-development-user-id": "sindico-demo" };
    const request: typeof fetch = async (url) => {
      const response = await app.inject({ url: String(url), headers });
      return new Response(response.body, { status: response.statusCode });
    };
    try {
      for (const [title, text] of [
        ["arquivo-generico.pdf", "BALANCETE MENSAL\nCompetencia: 2026-10\nReceitas: R$ 1.000,00"],
        [
          "balancete-enganoso.pdf",
          "CONVENCAO CONDOMINIAL\nA assembleia examina o balancete mensal."
        ],
        ["extrato.pdf", "EXTRATO BANCARIO\nSaldo: R$ 1.000,00"]
      ]) {
        const response = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: {
            ...headers,
            "content-type": "application/pdf",
            "x-document-title": title!,
            "x-document-type": title === "arquivo-generico.pdf" ? "meeting_minutes" : "other",
            "x-document-validity-confirmed": "true"
          },
          payload: createSyntheticPdf([text!], { multiline: true, pageWidth: 800 })
        });
        expect(response.statusCode).toBe(202);
        expect(
          await waitForDocumentProcessing(request, {
            condominiumId: "alameda",
            documentVersionId: response.json().documentVersionId,
            headers,
            signal: AbortSignal.timeout(8000)
          })
        ).toBe("ready");
      }
      const documents = await loadCondominiumDocuments(
        request,
        { condominiumId: "alameda", condominiumName: "Alameda sintética", headers },
        new AbortController().signal
      );
      expect(
        filterLibraryDocuments(documents, "", "financial_statement", "all").map(
          (item) => item.title
        )
      ).toEqual(["arquivo-generico.pdf"]);
      const html = renderToStaticMarkup(
        createElement(DocumentLibrary, {
          condominiumId: "alameda",
          condominiumName: "Alameda sintética",
          documents,
          initialSection: "financial_statement",
          pending: false,
          error: "",
          onRetry() {},
          onClose() {},
          onOpen() {},
          confirmationControl: () => null
        })
      );
      expect(html).toContain("arquivo-generico.pdf");
      expect(html).not.toContain("balancete-enganoso.pdf");
      expect(html).not.toContain("extrato.pdf");
      expect(html.split("<details>")[0]).not.toContain("100%");
      expect(html).toContain("100% dos arquivos enviados");
      const denied = await app.inject({
        url: "/v1/condominiums/alameda/documents",
        headers: { "x-development-user-id": "usuario-sem-acesso" }
      });
      expect(denied.statusCode).toBe(403);
    } finally {
      await app.close();
    }
    // Três PDFs passam pelo parser real e por polling de um segundo por envio.
  }, 15_000);
  it("AC-4401/4403/4405: alterna dois condomínios sem misturar chats, documentos ou porcentagem", async () => {
    const identities = createDevelopmentIdentityRepository();
    const documents = createDevelopmentDocumentUploadRepository([
      registeredDocument("alameda", "ready"),
      registeredDocument("alameda", "failed"),
      registeredDocument("bosque", "ready")
    ]);
    const app = createApi({
      membershipRepository: identities,
      documentCatalogRepository: documents
    });
    const urls: string[] = [];
    const request: typeof fetch = async (url, init) => {
      urls.push(String(url));
      const response = await app.inject({
        method: (init?.method ?? "GET") as "GET" | "POST",
        url: String(url),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        ...(init?.body === undefined ? {} : { payload: String(init.body) })
      });
      return new Response(response.body, { status: response.statusCode });
    };
    const headers = { "x-development-user-id": "sindico-demo" };
    const scopeA = { condominiumId: "alameda", headers };
    const scopeB = { condominiumId: "bosque", headers };
    try {
      const directory = await app.inject({ url: "/v1/chat/condominiums", headers });
      expect(
        directory.json().condominiums.map((item: { condominiumId: string }) => item.condominiumId)
      ).toEqual(["alameda", "bosque"]);
      const chatA = randomUUID();
      const chatB = randomUUID();
      await saveChat(request, scopeA, { id: chatA, title: "Assunto exclusivo Alameda" });
      await saveChat(request, scopeB, { id: chatB, title: "Assunto exclusivo Bosque" });
      for (const [scope, expectedChat, foreignChat, percentage, count] of [
        [scopeA, chatA, chatB, 50, 2],
        [scopeB, chatB, chatA, 100, 1],
        [scopeA, chatA, chatB, 50, 2]
      ] as const) {
        const contextResponse = await request(`/v1/condominiums/${scope.condominiumId}/context`, {
          headers
        });
        expect(contextResponse.status).toBe(200);
        const session = await openChatSession(request, scope);
        expect(session.chats.some((chat) => chat.id === expectedChat)).toBe(true);
        expect(session.chats.some((chat) => chat.id === foreignChat)).toBe(false);
        urls.length = 0;
        const catalog = await loadCondominiumDocuments(
          request,
          { ...scope, condominiumName: scope.condominiumId },
          new AbortController().signal
        );
        expect(urls).toEqual([`/v1/condominiums/${scope.condominiumId}/documents`]);
        expect(
          catalog.every(
            (item) =>
              item.condominiumId === scope.condominiumId && item.title.endsWith(scope.condominiumId)
          )
        ).toBe(true);
        expect(summarizeDocumentAvailability(catalog)).toMatchObject({ total: count, percentage });
        await expect(loadSavedChat(request, scope, foreignChat)).rejects.toThrow();
      }
      await expect(
        loadCondominiumDocuments(
          request,
          {
            ...scopeA,
            headers: { "x-development-user-id": "usuario-sem-acesso" },
            condominiumName: "Alameda"
          },
          new AbortController().signal
        )
      ).rejects.toThrow();
    } finally {
      await app.close();
    }
  });
});
