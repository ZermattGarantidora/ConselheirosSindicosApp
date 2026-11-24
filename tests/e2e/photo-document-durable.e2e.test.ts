import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createHostedDocumentProcessingAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import { createHostedDocumentBatchGatewayFactory } from "../../apps/api/answers/hosted-document-batch-gateway.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import {
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer
} from "../../apps/api/documents/hosted-document-execution.js";
import type { MembershipRepository } from "../../apps/api/identity/authorized-condominium-context.js";
import { createBudgetedHostedDocumentControls } from "../../apps/api/security/hosted-operation-budget.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import {
  createUserId,
  resolveAuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { syntheticPhotoTranscript } from "../fixtures/synthetic-document-photo.js";

const userId = "11111111-1111-4111-8111-111111111111";
const tenant = "22222222-2222-4222-8222-222222222222";
const foreignTenant = "33333333-3333-4333-8333-333333333333";
const headers = { "x-development-user-id": userId };
const allow: HostedDocumentTransferAuthorizer = async (request) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic-only"
});
const budget = () => ({
  currency: "USD" as const,
  tariffVersion: "synthetic-v1",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 20,
  globalDailyLimitMicrounits: 20
});
const now = () => new Date("2026-11-09T12:00:00.000Z");
async function removePhotoTestDirectory(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-photo-durable-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
}

describe("Spec 071 — foto, fonte integral e resultado durável pelo HTTP local", () => {
  it.each([
    { failedReading: false, mediaType: "image/jpeg" },
    { failedReading: true, mediaType: "image/jpeg" },
    { failedReading: false, mediaType: "image/png" },
    { failedReading: true, mediaType: "image/png" }
  ] as const)(
    "AC-7109/7112: $mediaType leitura falha=$failedReading preserva original e isolamento",
    async ({ failedReading, mediaType }) => {
      const directory = await mkdtemp(join(tmpdir(), "alvitra-photo-durable-"));
      const createControl = () =>
        createBudgetedHostedDocumentControls({
          authorize: allow,
          store: createLocalOperationBudgetStore({
            directory: join(directory, "budget"),
            confirmation: "synthetic-only",
            policy: {
              enabled: true,
              revision: budgetDigest("synthetic-only"),
              currency: "USD",
              scopeDailyCost: 20,
              globalDailyCost: 20,
              scopeDailyOperations: 2,
              globalDailyOperations: 2,
              scopeConcurrent: 1,
              globalConcurrent: 1
            }
          }),
          resolveScope: async () => ({
            kind: "tenant",
            userId,
            condominiumId: tenant,
            membershipRevision: "synthetic-v1"
          }),
          ledger: createSyntheticFileHostedCallLedger({
            directory: join(directory, "ledger"),
            confirmation: "synthetic-only"
          }),
          budget
        });
      let version = "";
      const provider = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.text.format.name === "ocr_pages")
          return Response.json({
            status: "completed",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      pages: [
                        {
                          pageIndex: 0,
                          extractedText: syntheticPhotoTranscript,
                          qualityScore: failedReading ? 0.3 : 1
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          });
        const evidenceId = `batch:${version}:1:0`;
        return Response.json({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    answer:
                      "O texto informa que a utilização do espaço comum exige registro na administração. Quer ajuda para conferir essa regra?",
                    answerMode: "grounded",
                    citations: [{ evidenceId }],
                    attentionPoints: [],
                    suggestedNextStep: null,
                    specialist: { required: false, type: null, reason: null },
                    claims: [
                      {
                        statement: "A utilização do espaço comum exige registro na administração.",
                        claimType: "interpretation",
                        evidenceRequired: true,
                        citationEvidenceIds: [evidenceId]
                      }
                    ]
                  })
                }
              ]
            }
          ]
        });
      });
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: "synthetic-key",
        ...createControl(),
        fetch: provider,
        photoMode: "document"
      });
      const memory = createDevelopmentDocumentMemory([], adapters),
        repository = createDevelopmentDocumentUploadRepository();
      const memberships: MembershipRepository = {
        findMembership: async (input) =>
          input.userId === userId && [tenant, foreignTenant].includes(input.condominiumId)
            ? {
                ...input,
                roleKey: "manager",
                status: "active",
                revision: "synthetic-v1",
                validFrom: new Date("2026-01-01")
              }
            : undefined
      };
      const journal = createInMemoryConversationStore();
      const createApp = (store = journal) =>
        createApi({
          membershipRepository: memberships,
          documentCatalogRepository: repository,
          documentUploadRepository: repository,
          documentStorage: createLocalPrivateDocumentStorage(join(directory, "originals")),
          developmentDocumentMemory: memory,
          imageUploadsEnabled: true,
          conversationStore: store,
          now,
          hostedDocumentBatchGateway: createHostedDocumentBatchGatewayFactory({
            apiKey: "synthetic-key",
            ...createControl(),
            fetch: provider
          })
        });
      let app = createApp();
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const photo = await readFile(
          `tests/fixtures/synthetic-document-page.${mediaType === "image/png" ? "png" : "jpg"}`
        );
        const uploaded = await app.inject({
          method: "POST",
          url: `/v1/condominiums/${tenant}/documents`,
          headers: {
            ...headers,
            "content-type": mediaType,
            "x-document-title": encodeURIComponent("Página inteiramente sintética"),
            "x-document-type": "other",
            "x-document-validity-confirmed": "true"
          },
          payload: photo
        });
        expect(uploaded.statusCode).toBe(202);
        version = uploaded.json().documentVersionId;
        await expect
          .poll(
            async () =>
              (
                await app.inject({
                  method: "GET",
                  url: `/v1/condominiums/${tenant}/documents`,
                  headers
                })
              )
                .json()
                .documents.find(
                  (item: { documentVersionId: string }) => item.documentVersionId === version
                )?.processingStatus
          )
          .toBe(failedReading ? "needs_review" : "ready");
        const original = await app.inject({
          method: "GET",
          url: `/v1/condominiums/${tenant}/documents/${version}/file`,
          headers
        });
        expect(original.statusCode).toBe(200);
        expect(original.rawPayload).toEqual(photo);
        const foreign = await app.inject({
          method: "GET",
          url: `/v1/condominiums/${foreignTenant}/documents/${version}/file`,
          headers
        });
        expect(foreign.statusCode).toBe(404);
        const route = `/v1/condominiums/${tenant}/documents/conversation`,
          payload = { documentVersionIds: [version] };
        if (failedReading) {
          expect(
            (await app.inject({ method: "POST", url: route, headers, payload })).statusCode
          ).toBe(503);
          expect(provider).toHaveBeenCalledOnce();
          return;
        }
        const context = await resolveAuthorizedCondominiumContext(memberships, {
          condominiumId: createCondominiumId(tenant),
          userId: createUserId(userId),
          now: now()
        });
        const page = (await memory.analysisReader.readAuthorized(context, [version]))[0]!.pages[0]!;
        expect(page.extractedText).toBe(syntheticPhotoTranscript);
        const write = vi
          .spyOn(journal, "append")
          .mockRejectedValueOnce(new Error("Falha sintética antes do ACK"));
        const first = await app.inject({
          method: "POST",
          url: route,
          headers: { ...headers, "x-conversation-request-id": "synthetic-summary" },
          payload
        });
        expect(first.statusCode).toBe(503);
        write.mockRestore();
        expect(provider).toHaveBeenCalledTimes(2);
        await app.close();
        // Novo executor/journal de teste. Catálogo/memória representam a base atual, não prova de durabilidade do chat.
        app = createApp(createInMemoryConversationStore());
        const resumed = await app.inject({
          method: "POST",
          url: route,
          headers: { ...headers, "x-conversation-request-id": "synthetic-summary" },
          payload
        });
        expect(resumed.statusCode).toBe(200);
        const citation = resumed.json().summary.citations[0];
        expect(citation).toMatchObject({ documentVersionId: version, page: 1 });
        expect(
          Array.from(syntheticPhotoTranscript)
            .slice(citation.startOffset, citation.endOffset)
            .join("")
        ).toBe(citation.excerpt);
        expect(provider).toHaveBeenCalledTimes(2);
        const ledger = JSON.parse(
          await readFile(join(directory, "ledger", "synthetic-calls.json"), "utf8")
        );
        expect(ledger.daily[0].committed).toBe(20);
        const operational = JSON.parse(
          await readFile(join(directory, "budget", "operation-budgets.json"), "utf8")
        );
        expect(operational.receipts).toHaveLength(2);
        expect(
          operational.receipts.every(
            (receipt: { state: string; actualCostMicrounits: number }) =>
              receipt.state === "completed" && receipt.actualCostMicrounits === 10
          )
        ).toBe(true);
        // Spec 072 is authoritative: the ledger's 20 is a recovery mirror, not another 20 spent.
        expect(
          operational.receipts.reduce(
            (sum: number, receipt: { actualCostMicrounits: number }) =>
              sum + receipt.actualCostMicrounits,
            0
          )
        ).toBe(20);
        expect(ledger.calls.every((call: { status: string }) => call.status === "completed")).toBe(
          true
        );
        const denied = await app.inject({
          method: "POST",
          url: `/v1/condominiums/${foreignTenant}/documents/conversation`,
          headers,
          payload
        });
        expect(denied.statusCode).toBe(404);
        expect(provider).toHaveBeenCalledTimes(2);
      } finally {
        await app.close();
        log.mockRestore();
        await removePhotoTestDirectory(directory);
      }
    }
  );
});
