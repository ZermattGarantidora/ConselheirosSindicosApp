import { Pool } from "pg";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { localRecoveryConnection } from "../../scripts/pilot-recovery.js";
import {
  createSyntheticDocumentRecoveryJournal,
  recoveryDigest,
  type DocumentRecoverySnapshot
} from "../../apps/api/documents/synthetic-document-recovery-journal.js";
import { createPostgresHostedCallLedger } from "../../apps/api/documents/postgres-hosted-call-ledger.js";
import { createBudgetedHostedDocumentControls } from "../../apps/api/security/hosted-operation-budget.js";
import { createPostgresOperationBudgetStore } from "../../apps/api/security/postgres-operation-budget-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import {
  createRecoveryGuardedHostedControls,
  createDocumentRecoveryGuard
} from "../../apps/api/documents/document-recovery-controls.js";
import { hostedDocumentRequestHash } from "../../apps/api/documents/hosted-document-execution.js";
import { createHostedDocumentProcessingAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import { createHostedDocumentEmbeddingAdapter } from "../../apps/api/documents/hosted-document-embedding.js";
import { createScopedPostgresDocumentProcessor } from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createPostgresPrivateDocumentStorage } from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { syntheticPhotoTranscript } from "./synthetic-document-photo.js";

export const lifecycleTenant = "11111111-1111-4111-8111-111111111111";
export const lifecycleForeign = "22222222-2222-4222-8222-222222222222";
export const lifecycleUser = "33333333-3333-4333-8333-333333333333";
export const lifecycleOtherUser = "44444444-4444-4444-8444-444444444444";
export const lifecycleJournalId = "55555555-5555-4555-8555-555555555555";

/** Only guarded, loopback synthetic DB URLs, inherited through a minimal environment. */
export function documentLifecycleFixture(
  target: "source" | "restore" = "source",
  restoredUrl?: string
) {
  const url = localRecoveryConnection(
    target === "source"
      ? process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL
      : (restoredUrl ?? process.env.PILOT_DOCUMENTS_RESTORE_DATABASE_URL),
    target,
    process.env.PILOT_RECOVERY_CONFIRMATION
  );
  const suffix = process.env.PILOT_DOCUMENTS_RUN_ID;
  if (!suffix || !/^[a-f0-9]{32}$/u.test(suffix)) throw new Error("Rodada sintética ausente.");
  const execution = (kind: "api" | "worker" | "ai") => {
    const copy = new URL(url);
    copy.username = `doc_${kind}_${suffix}`;
    copy.password = "synthetic-only";
    return new Pool({
      connectionString: copy.toString(),
      max: 4,
      options:
        kind === "api"
          ? "-c role=app_runtime -c lock_timeout=1200 -c statement_timeout=5000"
          : "-c lock_timeout=1200 -c statement_timeout=5000"
    });
  };
  const admin = new Pool({ connectionString: url.toString(), max: 4 });
  const api = execution("api"),
    worker = execution("worker"),
    ai = execution("ai");
  const journal = createSyntheticDocumentRecoveryJournal({
    directory: join(process.env.PILOT_LOCAL_REPORT_DIRECTORY!, "outside-app-dump"),
    journalId: lifecycleJournalId,
    confirmation: "synthetic-only"
  });
  const ledger = createPostgresHostedCallLedger(ai);
  const membership = createPostgresMembershipRepository(api);
  const verify = async (snapshot: DocumentRecoverySnapshot) => {
    // Trusted TEST verifier. No production wiring; verifies ALL tenants and authoritative receipts.
    for (const purge of snapshot.purges)
      if (
        (
          await admin.query("SELECT id FROM app.documents WHERE condominium_id=$1 AND id=$2", [
            purge.condominiumId,
            purge.documentId
          ])
        ).rows.length
      )
        return false;
    for (const call of snapshot.calls) {
      const record = (
        await admin.query(
          "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 AND request_hash=$2",
          [call.key.condominiumId, call.key.requestHash]
        )
      ).rows[0]?.record;
      if (
        !record ||
        record.policyRevision !== call.key.policyRevision ||
        recoveryDigest(record.owner) !== call.ownerSha256 ||
        ["cancelled", "reserved"].includes(record.status) ||
        (call.resultSha256 &&
          record.status !== "invalidated" &&
          record.resultSha256 !== call.resultSha256)
      )
        return false;
      const digest = budgetDigest([
        "hosted-operation-v1",
        call.key.condominiumId,
        call.key.requestHash
      ]).slice(0, 32);
      const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`;
      const receipt = (
        await admin.query(
          "SELECT state,currency,request,actual_cost,day::text FROM app.operation_budget_receipts WHERE condominium_id=$1 AND operation_id=$2",
          [call.key.condominiumId, id]
        )
      ).rows[0];
      if (
        !receipt ||
        !["started", "unknown", "completed"].includes(receipt.state) ||
        receipt.currency !== record.currency ||
        receipt.day !== record.period ||
        receipt.request.payloadHash !== call.key.requestHash ||
        receipt.request.policyRevision !== budgetDigest(call.key.policyRevision) ||
        receipt.request.maximumCostMicrounits !== record.commitment ||
        (receipt.state === "completed" && Number(receipt.actual_cost) !== record.commitment)
      )
        return false;
    }
    return true;
  };
  const guard = createDocumentRecoveryGuard({ journal, verifyRecoveredState: verify });
  const controls = createRecoveryGuardedHostedControls({
    journal,
    verifyRecoveredState: verify,
    ...createBudgetedHostedDocumentControls({
      ledger,
      store: createPostgresOperationBudgetStore(worker, "app_worker"),
      resolveScope: async (request) => {
        const current = await membership.findMembership({
          condominiumId: createCondominiumId(request.condominiumId),
          userId: createUserId(lifecycleUser)
        });
        if (!current || current.status !== "active") throw new Error("synthetic-denied");
        return {
          kind: "tenant",
          userId: lifecycleUser,
          condominiumId: request.condominiumId,
          membershipRevision: current.revision
        };
      },
      authorize: async (request) => ({
        allowed: true,
        requestHash: hostedDocumentRequestHash(request),
        policyRevision: "synthetic-lifecycle-v1"
      }),
      budget: () => ({
        currency: "USD",
        tariffVersion: "synthetic-lifecycle-v1",
        maximumCostMicrounits: 10,
        tenantDailyLimitMicrounits: 10000,
        globalDailyLimitMicrounits: 10000
      })
    })
  });
  let transports = 0;
  const fetch: typeof globalThis.fetch = async (url, init) => {
    transports++;
    if (String(url).endsWith("/embeddings"))
      return Response.json({
        data: [{ embedding: Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)) }]
      });
    const body = JSON.parse(String(init?.body));
    if (body.text.format.name !== "ocr_pages") throw new Error("Unrecognized synthetic transport");
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                pages: [{ pageIndex: 0, extractedText: syntheticPhotoTranscript, qualityScore: 1 }]
              })
            }
          ]
        }
      ]
    });
  };
  const adapters = createHostedDocumentProcessingAdapters({
    ...controls,
    apiKey: "synthetic-key",
    photoMode: "document",
    fetch
  });
  const processor = createScopedPostgresDocumentProcessor(
    worker,
    createPostgresPrivateDocumentStorage(worker),
    adapters.ocrAdapter,
    undefined,
    undefined,
    adapters.photoOcrAdapter,
    (scope) =>
      createHostedDocumentEmbeddingAdapter({
        ...scope,
        ...controls,
        apiKey: "synthetic-key",
        fetch
      })
  );
  return {
    admin,
    api,
    worker,
    ai,
    ledger,
    journal,
    controls,
    guard,
    verify,
    membership,
    processor: {
      process: async (job: Parameters<typeof processor.process>[0]) => {
        const scope = {
          condominiumId: job.condominiumId,
          documentVersionIds: [job.documentVersionId]
        };
        await guard(scope);
        await processor.process(job);
        await guard(scope);
      }
    },
    transports: () => transports,
    sha256: (content: Buffer) => createHash("sha256").update(content).digest("hex"),
    close: async () => {
      await Promise.all([api.end(), worker.end(), ai.end(), admin.end()]);
    }
  };
}
