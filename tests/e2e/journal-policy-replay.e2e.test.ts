import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createHostedDocumentBatchGatewayFactory } from "../../apps/api/answers/hosted-document-batch-gateway.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import { hostedDocumentRequestHash } from "../../apps/api/documents/hosted-document-execution.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
async function removePolicyDirectory(directory: string) {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-journal-policy-repro-")
  )
    throw new Error("Temporário fora do escopo");
  await rm(directory, { recursive: true, force: true });
}

describe("AC-7125 — regressão promovida da revisão independente do journal", () => {
  it.each(["changed", "revoked", "same", "content", "catalog", "missing-proof"])(
    "revalida replay HTTP: %s, inclusive com executor recriado",
    async (mode) => {
      const directory = await mkdtemp(join(tmpdir(), "alvitra-journal-policy-repro-"));
      const text = "Convenção FICTÍCIA. O mandato é de dois anos.";
      const condominiumId = createCondominiumId("alameda");
      const document = {
        condominiumId,
        documentId: "document-1",
        documentVersionId: "version-1",
        documentTitle: "Convenção FICTÍCIA.pdf",
        pages: [
          {
            pageNumber: 1,
            extractedText: text,
            extractionMethod: "pdf_text" as const,
            qualityScore: 1
          }
        ]
      };
      const registered = {
        condominiumId,
        documentId: "document-1",
        documentVersionId: "version-1",
        title: document.documentTitle,
        documentType: "other" as const,
        versionNumber: 1,
        sizeBytes: 100,
        processingStatus: "ready" as const,
        validityStatus: "not_applicable" as const,
        createdAt: "2026-11-09T10:00:00.000Z",
        expectedPageCount: 1,
        processedPageCount: 1,
        searchablePageCount: 1,
        unreadablePageNumbers: [],
        extractionCompleteness: 1,
        extractionMethod: "pdf_text" as const,
        ocrQualityScore: null
      };
      let revision = "synthetic-policy-a",
        allowed = true,
        providerCalls = 0,
        authorizationCalls = 0;
      const journal = createInMemoryConversationStore();
      let missingProof = false;
      const createApp = () =>
        createApi({
          membershipRepository: createDevelopmentIdentityRepository(),
          conversationStore: missingProof
            ? {
                ...journal,
                find: async (...args) => {
                  const saved = await journal.find(...args);
                  if (!saved) return undefined;
                  const { replayProof: _proof, ...metadata } = saved.metadata;
                  void _proof;
                  return { ...saved, metadata };
                }
              }
            : journal,
          now: () => new Date("2026-11-09T12:00:00.000Z"),
          documentCatalogRepository: { listAuthorized: async () => [registered] },
          documentAnalysisReader: { readAuthorized: async () => [document] },
          hostedDocumentBatchGateway: createHostedDocumentBatchGatewayFactory({
            apiKey: "synthetic-only",
            authorize: async (request) => {
              authorizationCalls += 1;
              return allowed
                ? {
                    allowed: true,
                    requestHash: hostedDocumentRequestHash(request),
                    policyRevision: revision
                  }
                : { allowed: false };
            },
            callControl: {
              ledger: createSyntheticFileHostedCallLedger({
                directory,
                confirmation: "synthetic-only"
              }),
              budget: () => ({
                currency: "USD",
                tariffVersion: "synthetic-only",
                maximumCostMicrounits: 1,
                tenantDailyLimitMicrounits: 10,
                globalDailyLimitMicrounits: 10
              })
            },
            fetch: async () => {
              providerCalls += 1;
              return Response.json({
                status: "completed",
                output: [
                  {
                    type: "message",
                    content: [
                      {
                        type: "output_text",
                        text: JSON.stringify({
                          answer: "O mandato é de dois anos. Quer ajuda para conferir os prazos?",
                          answerMode: "grounded",
                          citations: [{ evidenceId: "batch:version-1:1:0" }],
                          attentionPoints: [],
                          suggestedNextStep: null,
                          specialist: { required: false, type: null, reason: null },
                          claims: [
                            {
                              statement: "O mandato é de dois anos.",
                              claimType: "interpretation",
                              evidenceRequired: true,
                              citationEvidenceIds: ["batch:version-1:1:0"]
                            }
                          ]
                        })
                      }
                    ]
                  }
                ],
                usage: { input_tokens: 100, output_tokens: 50 }
              });
            }
          })
        });
      const request = {
        method: "POST" as const,
        url: "/v1/condominiums/alameda/documents/conversation",
        headers: {
          "x-development-user-id": "sindico-demo",
          "x-conversation-request-id": "synthetic-replay-policy"
        },
        payload: { documentVersionIds: ["version-1"], message: "Segue a convenção." }
      };
      let app = createApp();
      try {
        const first = await app.inject(request);
        expect(first.statusCode).toBe(200);
        expect(providerCalls).toBe(1);
        const historical = await app.inject({
          method: "GET",
          url: "/v1/condominiums/alameda/chats/00000000-0000-4000-8000-000000000000/messages",
          headers: request.headers
        });
        expect(historical.statusCode).toBe(200);
        expect(historical.body).toContain("O mandato é de dois anos.");
        await app.close();
        if (mode === "changed") revision = "synthetic-policy-b";
        if (mode === "revoked") allowed = false;
        if (mode === "content") document.pages[0]!.extractedText += " FICTICIO-ALTERADO";
        if (mode === "catalog") registered.title = "FICTICIO-ALTERADO.pdf";
        if (mode === "missing-proof") missingProof = true;
        const authorizationBefore = authorizationCalls;
        app = createApp();
        const replay = await app.inject(request);
        const result = {
          scenario: mode,
          firstStatus: first.statusCode,
          replayStatus: replay.statusCode,
          reusedOriginalResponse: replay.body === first.body,
          authorizationCallsDuringReplay: authorizationCalls - authorizationBefore,
          providerCalls,
          syntheticOnly: true,
          activationAuthorized: false
        };
        await writeFile(join(directory, "result.json"), JSON.stringify(result));
        console.info(JSON.stringify(result));
        if (mode === "same") {
          expect(replay.statusCode).toBe(200);
          expect(replay.body).toBe(first.body);
          expect(authorizationCalls - authorizationBefore).toBeGreaterThan(0);
        } else expect(replay.statusCode).not.toBe(200);
        expect(providerCalls).toBe(1);
        const preserved = await app.inject({
          method: "GET",
          url: "/v1/condominiums/alameda/chats/00000000-0000-4000-8000-000000000000/messages",
          headers: request.headers
        });
        expect(preserved.statusCode).toBe(200);
        expect(preserved.body).toContain("O mandato é de dois anos.");
      } finally {
        await app.close();
        await removePolicyDirectory(directory);
      }
    }
  );
});
