import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import {
  createSyntheticElectionMinutesPdf,
  createSyntheticTextPdf
} from "../fixtures/synthetic-pdfs.js";
import { expectDocumentReady } from "../fixtures/wait-for-document.js";
import { loadDocumentOriginal } from "../../apps/web/DocumentViewer.js";
import {
  sendDocumentMessage,
  waitForDocumentProcessing
} from "../../apps/web/document-processing-request.js";

describe("envio e visualização integral no chat", () => {
  it("AC-2004, AC-2005 e AC-2007: confirma recepção antes de ler, abre o PDF inteiro e consulta a mensagem após leitura", async () => {
    const memory = createDevelopmentDocumentMemory();
    const repository = createDevelopmentDocumentUploadRepository();
    const memberships = createDevelopmentIdentityRepository();
    let revoked = false;
    const originals = new Map<string, Buffer>();
    const content = createSyntheticElectionMinutesPdf();
    const headers = { "x-development-user-id": "sindico-demo" };
    let finishReading!: () => void;
    const reading = new Promise<void>((resolve) => {
      finishReading = resolve;
    });
    const indexUploaded = vi.fn(async (input: Parameters<typeof memory.indexUploaded>[0]) => {
      await reading;
      return memory.indexUploaded(input);
    });
    const app = createApi({
      membershipRepository: {
        async findMembership(input) {
          return revoked ? undefined : memberships.findMembership(input);
        }
      },
      developmentDocumentMemory: { ...memory, indexUploaded },
      answerUseCase: createAnswerUseCase({
        retriever: createScopedTextRetriever(memory.index),
        gateway: createLocalSyntheticAnswerGateway(),
        persistence: createInMemoryAnswerPersistence()
      }),
      documentCatalogRepository: repository,
      documentUploadRepository: repository,
      documentStorage: {
        async storeOriginal(input) {
          originals.set(`${input.condominiumId}:${input.objectId}`, input.content);
          return { storageKey: input.objectId };
        },
        async removeOriginal() {},
        ...{
          async readOriginal(input: { condominiumId: string; objectId: string }) {
            return originals.get(`${input.condominiumId}:${input.objectId}`)!;
          }
        }
      }
    });
    const calls: string[] = [];
    const transport: typeof fetch = async (url, init) => {
      calls.push(String(url));
      const response = await app.inject({
        method: init?.method === "POST" ? "POST" : "GET",
        url: String(url),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        ...(init?.body === undefined ? {} : { payload: String(init.body) })
      });
      return new Response(new Uint8Array(response.rawPayload), {
        status: response.statusCode,
        headers: { "content-type": String(response.headers["content-type"]) }
      });
    };
    let versionId = "";
    let documentId = "";
    try {
      await sendDocumentMessage({
        message: "  Quem foi eleita síndica e qual é o período do mandato?  ",
        receive: async () => {
          const received = await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/documents",
            headers: {
              ...headers,
              "content-type": "application/pdf",
              "x-document-title": "Ata.pdf",
              "x-document-type": "meeting_minutes",
              "x-document-validity-confirmed": "true"
            },
            payload: content
          });
          expect(received.statusCode).toBe(202);
          expect(received.json().processingStatus).toBe("uploaded");
          versionId = received.json().documentVersionId;
          documentId = received.json().documentId;
          const document = {
            condominiumId: "alameda",
            documentVersionId: versionId,
            title: "Ata.pdf",
            page: 2
          };
          // The parser is still waiting, but every original byte is already available.
          const original = await loadDocumentOriginal(
            transport,
            document,
            headers,
            new AbortController().signal
          );
          expect(Buffer.from(await original.arrayBuffer())).toEqual(content);
          const catalog = await app.inject({ url: "/v1/condominiums/alameda/documents", headers });
          expect(catalog.json().documents[0].processingStatus).not.toBe("ready");
        },
        waitUntilProcessed: async () => {
          finishReading();
          await expectDocumentReady(app, versionId);
          return waitForDocumentProcessing(transport, {
            condominiumId: "alameda",
            documentVersionId: versionId,
            headers,
            signal: AbortSignal.timeout(3000)
          });
        },
        ask: async (question) => {
          expect(indexUploaded).toHaveBeenCalledOnce();
          expect(question).toBe("Quem foi eleita síndica e qual é o período do mandato?");
          const response = await transport("/v1/condominiums/alameda/questions", {
            method: "POST",
            headers: { ...headers, "content-type": "application/json" },
            body: JSON.stringify({ question })
          });
          expect(response.status).toBe(200);
          const answer = await response.json();
          expect(answer.citations).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ documentVersionId: versionId, page: 1 })
            ])
          );
        }
      });
      expect(calls.filter((url) => url.endsWith("/questions"))).toHaveLength(1);
      const path = `/v1/condominiums/alameda/documents/${versionId}/file`;
      const original = await app.inject({ url: path, headers });
      expect(original.headers).toMatchObject({
        "content-type": "application/pdf",
        "content-disposition": "inline",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      });
      expect((await app.inject({ url: path })).statusCode).toBe(401);
      expect(
        (
          await app.inject({
            url: path,
            headers: { "x-development-user-id": "usuario-sem-vinculo" }
          })
        ).statusCode
      ).toBe(403);
      expect(
        (await app.inject({ url: `/v1/condominiums/bosque/documents/${versionId}/file`, headers }))
          .statusCode
      ).toBe(404);
      revoked = true;
      expect((await app.inject({ url: path, headers })).statusCode).toBe(403);
      revoked = false;
      await app.inject({
        method: "DELETE",
        url: `/v1/condominiums/alameda/documents/${documentId}`,
        headers
      });
      expect((await app.inject({ url: path, headers })).statusCode).toBe(404);
    } finally {
      finishReading();
      await app.close();
    }
  });

  it.each(["needs_review", "failed", "exception"] as const)(
    "AC-2006: registra %s sem afirmar que a leitura foi concluída",
    async (outcome) => {
      const memory = createDevelopmentDocumentMemory();
      const repository = createDevelopmentDocumentUploadRepository();
      const app = createApi({
        membershipRepository: createDevelopmentIdentityRepository(),
        documentCatalogRepository: repository,
        documentUploadRepository: repository,
        documentStorage: {
          async storeOriginal() {
            return { storageKey: "sintetico" };
          },
          async removeOriginal() {}
        },
        developmentDocumentMemory: {
          ...memory,
          async indexUploaded() {
            if (outcome === "exception") throw new Error("conteúdo privado não deve sair");
            return outcome;
          }
        }
      });
      try {
        const received = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: {
            "x-development-user-id": "sindico-demo",
            "content-type": "application/pdf",
            "x-document-title": "Ata.pdf",
            "x-document-type": "other"
          },
          payload: createSyntheticTextPdf()
        });
        expect(received.statusCode).toBe(202);
        await expect
          .poll(
            async () =>
              (
                await app.inject({
                  url: "/v1/condominiums/alameda/documents",
                  headers: { "x-development-user-id": "sindico-demo" }
                })
              ).json().documents[0].processingStatus
          )
          .toBe(outcome === "exception" ? "failed" : outcome);
        expect(received.body).not.toContain("conteúdo privado");
      } finally {
        await app.close();
      }
    }
  );
});
