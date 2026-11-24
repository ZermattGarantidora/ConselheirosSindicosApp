import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createFinancialTableStatementPdf } from "../fixtures/financial-table-statement.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

const headers = { "x-development-user-id": "sindico-demo" };
const validAnalysis =
  "O balancete registra entradas de R$ 17.380,25 e saídas de R$ 15.640,75. O resultado do período foi R$ 1.739,50 e o saldo final, R$ 9.739,50. Resultado e saldo são medidas diferentes; a disponibilidade deve ser conferida com extratos e recursos vinculados.";

describe("AC-5617 — upload e análise de tabela sem R$ repetido", () => {
  it.each([false, true])(
    "preserva a validação documental (valor adulterado: %s)",
    async (invalid) => {
      const memory = createDevelopmentDocumentMemory();
      const repository = createDevelopmentDocumentUploadRepository();
      const persistence = createInMemoryAnswerPersistence();
      const generate = vi.fn(async (input: AnswerGatewayInput) => {
        const source = input.evidence.find((item) => item.pageNumber === 1);
        expect(source?.content).toContain("Valores em reais");
        expect(source?.content).not.toContain("R$");
        const text = invalid ? validAnalysis.replace("17.380,25", "99.999,99") : validAnalysis;
        return {
          output: structuredAnswer(
            JSON.stringify({
              answer: text,
              answerMode: "grounded",
              citations: [{ evidenceId: source!.id }],
              attentionPoints: [],
              suggestedNextStep: null,
              specialist: { required: false, type: null, reason: null },
              claims: [
                {
                  statement: text,
                  claimType: "interpretation",
                  evidenceRequired: true,
                  citationEvidenceIds: [source!.id]
                }
              ]
            }),
            input
          ),
          telemetry: createAnswerTelemetry()
        };
      });
      const app = createApi({
        membershipRepository: createDevelopmentIdentityRepository(),
        developmentDocumentMemory: memory,
        documentCatalogRepository: repository,
        documentUploadRepository: repository,
        documentStorage: {
          async storeOriginal() {
            return { storageKey: "synthetic" };
          },
          async removeOriginal() {}
        },
        answerUseCase: createAnswerUseCase({
          retriever: createScopedTextRetriever(memory.index),
          gateway: { generate },
          persistence
        })
      });
      try {
        const uploaded = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: {
            ...headers,
            "content-type": "application/pdf",
            "x-document-title": "Balancete_Alameda_2028_04.pdf",
            "x-document-type": "other",
            "x-document-validity-confirmed": "true"
          },
          payload: createFinancialTableStatementPdf()
        });
        expect(uploaded.statusCode).toBe(202);
        const versionId = uploaded.json().documentVersionId;
        let ready = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          const catalog = (
            await app.inject({ url: "/v1/condominiums/alameda/documents", headers })
          ).json();
          if (
            catalog.documents.find(
              (item: { documentVersionId: string; processingStatus: string }) =>
                item.documentVersionId === versionId
            )?.processingStatus === "ready"
          ) {
            ready = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(ready).toBe(true);
        const response = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/questions",
          headers,
          payload: { question: "Analise o balancete de abril de 2028." }
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().answerMode).toBe(invalid ? "abstained" : "grounded");
        expect(generate).toHaveBeenCalledTimes(invalid ? 2 : 1);
        const interaction = persistence.listInteractions().at(-1)!;
        expect(
          interaction.auditEvents.find((event) => event.eventType === "answer_created")?.metadata
            .validationFailureCode
        ).toBe(invalid ? "unsupported_monetary_assertion" : null);
        if (!invalid) {
          expect(response.json().answer).toContain("R$ 17.380,25");
          expect(response.json().citations).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ documentVersionId: versionId, page: 1 })
            ])
          );
          expect(response.json().citations[0].excerpt).not.toContain("R$");
        }
      } finally {
        await app.close();
      }
    }
  );
});
