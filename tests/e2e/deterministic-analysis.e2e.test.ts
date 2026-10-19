import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";
import { createRetrievalResult, fixedNow } from "../unit/answer-fixtures.js";

describe("fronteira entre geração e cálculo local", () => {
  it.each([false, true])(
    "gera relatório independente da IA e recusa fontes ambíguas (%s)",
    async (duplicate) => {
      const memory = createDevelopmentDocumentMemory();
      const repository = createDevelopmentDocumentUploadRepository();
      const generate = vi.fn(async () => {
        throw new Error("Provedor sintético indisponível");
      });
      const app = createApi({
        membershipRepository: createDevelopmentIdentityRepository(),
        developmentDocumentMemory: memory,
        documentAnalysisReader: {
          async readAuthorized(context, versionIds) {
            const documents = await memory.analysisReader.readAuthorized(context, versionIds);
            return duplicate ? [...documents, documents[0]!] : documents;
          }
        },
        documentCatalogRepository: repository,
        documentUploadRepository: repository,
        documentStorage: {
          async storeOriginal() {
            return { storageKey: "synthetic" };
          },
          async removeOriginal() {}
        },
        answerUseCase: createAnswerUseCase({
          retriever: {
            async search() {
              return createRetrievalResult([]);
            }
          },
          gateway: { generate },
          persistence: createInMemoryAnswerPersistence(),
          now: fixedNow
        })
      });
      const headers = { "x-development-user-id": "sindico-demo" };
      try {
        for (const [period, value] of [
          ["01/2026", "100,00"],
          ["02/2026", "125,00"]
        ]) {
          const uploaded = await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/documents",
            headers: {
              ...headers,
              "x-document-title": `Balancete ${period}`,
              "x-document-type": "other",
              "x-document-validity-confirmed": "true",
              "content-type": "application/pdf"
            },
            payload: createSyntheticPdf([`BALANCETE ${period}`, `Energia R$ ${value}`])
          });
          expect(uploaded.statusCode).toBe(202);
          expect(uploaded.json().memoryStatus).toBe("ready");
        }
        const result = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/questions",
          headers,
          payload: { question: "Compare os balancetes 2026-01 e 2026-02" }
        });
        expect(result.statusCode).toBe(200);
        expect(result.json().answerMode).toBe("failed");
        expect(generate).toHaveBeenCalledOnce();
        const report = result.json().documentAnalysis;
        if (duplicate) {
          expect(report).toMatchObject({ status: "unavailable", rows: [] });
          expect(result.body).not.toContain("Versão documental ambígua");
        } else {
          expect(report.status).toBe("available");
          expect(report.rows[0].detail).toContain("diferença: R$ 25,00; variação: 25%");
          expect(report.rows[0].citations).toHaveLength(2);
        }
      } finally {
        await app.close();
      }
    }
  );
});
