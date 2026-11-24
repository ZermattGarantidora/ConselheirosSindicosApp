import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createScopedPostgresDocumentProcessor } from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createHostedDocumentEmbeddingAdapter } from "../../apps/api/documents/hosted-document-embedding.js";
import { createHostedDocumentProcessingAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import { hostedDocumentRequestHash } from "../../apps/api/documents/hosted-document-execution.js";
import { createBudgetedHostedDocumentControls } from "../../apps/api/security/hosted-operation-budget.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
import { syntheticPhotoTranscript } from "../fixtures/synthetic-document-photo.js";

async function removeWorkerBudgetDirectory(directory: string) {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-worker-budget-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
}

describe("AC-7115/7118 — worker com stores duráveis e SQL simulado", () => {
  it("rollback depois de OCR e embeddings confirmados não repete provedores na nova tentativa", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-worker-budget-"));
    try {
      const condominiumId = createCondominiumId("22222222-2222-4222-8222-222222222222");
      const documentVersionId = "33333333-3333-4333-8333-333333333333";
      const userId = "11111111-1111-4111-8111-111111111111";
      const content = await readFile("tests/fixtures/synthetic-document-page.png");
      const contentSha256 = createHash("sha256").update(content).digest("hex");
      const controls = () =>
        createBudgetedHostedDocumentControls({
          ledger: createSyntheticFileHostedCallLedger({
            directory: join(directory, "ledger"),
            confirmation: "synthetic-only"
          }),
          budget: () => ({
            currency: "USD",
            tariffVersion: "synthetic-only",
            maximumCostMicrounits: 10,
            tenantDailyLimitMicrounits: 1000,
            globalDailyLimitMicrounits: 1000
          }),
          store: createLocalOperationBudgetStore({
            directory: join(directory, "budget"),
            confirmation: "synthetic-only",
            policy: {
              enabled: true,
              revision: budgetDigest("synthetic-only"),
              currency: "USD",
              scopeDailyCost: 1000,
              globalDailyCost: 1000,
              scopeDailyOperations: 100,
              globalDailyOperations: 100,
              scopeConcurrent: 1,
              globalConcurrent: 1
            }
          }),
          resolveScope: async () => ({
            kind: "tenant",
            userId,
            condominiumId,
            membershipRevision: "synthetic-v1"
          }),
          authorize: async (request) => ({
            allowed: request.condominiumId === condominiumId,
            requestHash: hostedDocumentRequestHash(request),
            policyRevision: "synthetic-only"
          })
        });
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) =>
        String(url).endsWith("/embeddings")
          ? Response.json({
              data: [{ embedding: Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)) }]
            })
          : Response.json({
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
                            qualityScore: 1
                          }
                        ]
                      })
                    }
                  ]
                }
              ]
            })
      );
      let failSave = true;
      const statements: string[] = [];
      const values: unknown[][] = [];
      const client = {
        query: vi.fn(async (sql: string, parameters: unknown[] = []) => {
          statements.push(sql);
          values.push(parameters);
          if (sql.includes("dv.id AS document_version_id"))
            return {
              rows: [
                {
                  condominium_id: condominiumId,
                  document_id: "44444444-4444-4444-8444-444444444444",
                  document_version_id: documentVersionId,
                  storage_object_id: "55555555-5555-4555-8555-555555555555",
                  content_sha256: contentSha256,
                  media_type: "image/png",
                  processing_status: "processing",
                  validity_status: "confirmed",
                  valid_from: null,
                  valid_until: null,
                  ocr_quality_score: null
                }
              ],
              rowCount: 1
            };
          if (sql.includes("SELECT 1 AS active")) return { rows: [{ active: 1 }], rowCount: 1 };
          if (sql.includes("UPDATE app.document_version_states") && failSave) {
            failSave = false;
            throw new Error("FICTICIO-SAVE-FAILED");
          }
          return { rows: [], rowCount: 1 };
        }),
        release: vi.fn()
      };
      const factory = vi.fn((scope: Parameters<typeof createHostedDocumentEmbeddingAdapter>[0]) =>
        createHostedDocumentEmbeddingAdapter(scope)
      );
      const processor = () => {
        const adapters = createHostedDocumentProcessingAdapters({
          apiKey: "synthetic-key",
          ...controls(),
          fetch,
          photoMode: "document"
        });
        return createScopedPostgresDocumentProcessor(
          { connect: async () => client as unknown as PoolClient },
          { readOriginal: async () => content },
          adapters.ocrAdapter,
          undefined,
          undefined,
          adapters.photoOcrAdapter,
          (scope) => factory({ ...scope, apiKey: "synthetic-key", ...controls(), fetch })
        );
      };
      const job = {
        jobId: "66666666-6666-4666-8666-666666666666",
        condominiumId,
        documentVersionId,
        attemptCount: 1
      };
      const failed = vi.fn(async () => {});
      await expect(
        processOne({ claimNext: async () => job, fail: failed }, processor())
      ).rejects.toThrow("FICTICIO-SAVE-FAILED");
      expect(failed).toHaveBeenCalledOnce();
      expect(statements).toContain("ROLLBACK");
      const calls = fetch.mock.calls.length;
      expect(calls).toBeGreaterThan(1);
      const signal = new AbortController().signal;
      await processor().process({ ...job, attemptCount: 2, signal });
      expect(fetch).toHaveBeenCalledTimes(calls);
      expect(factory.mock.calls[1]?.[0]).toMatchObject({
        condominiumId,
        documentVersionId,
        signal
      });
      expect(statements.at(-1)).toBe("COMMIT");
      const pages = statements.findIndex((sql) => sql.includes("INSERT INTO app.document_pages"));
      expect(values[pages]).toContain(syntheticPhotoTranscript);
      const receipts = JSON.parse(
        await readFile(join(directory, "budget", "operation-budgets.json"), "utf8")
      );
      expect(receipts.receipts).toHaveLength(calls);
      expect(receipts.receipts.every((row: { state: string }) => row.state === "completed")).toBe(
        true
      );
      expect(
        receipts.receipts.reduce(
          (sum: number, row: { actualCostMicrounits: number }) => sum + row.actualCostMicrounits,
          0
        )
      ).toBe(calls * 10);
    } finally {
      await removeWorkerBudgetDirectory(directory);
    }
  });
});
