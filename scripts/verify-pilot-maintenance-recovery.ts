import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { localRecoveryConnection, captureRecoveryInventory } from "./pilot-recovery.js";
import {
  createSyntheticDataControls,
  maintenanceInventoryDigest,
  syntheticMaintenanceConnection
} from "../apps/api/security/synthetic-data-controls.js";
import {
  persistMaintenancePlan,
  type SyntheticMaintenancePolicy,
  type SyntheticMaintenancePlan
} from "../apps/api/security/synthetic-maintenance-plan.js";
import { budgetDigest } from "../apps/api/security/operation-budget.js";
import { createBudgetedHostedDocumentControls } from "../apps/api/security/hosted-operation-budget.js";
import { createPostgresOperationBudgetStore } from "../apps/api/security/postgres-operation-budget-store.js";
import { createPostgresHostedCallLedger } from "../apps/api/documents/postgres-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../apps/api/documents/hosted-document-execution.js";
import { createSyntheticDocumentDecisionApplier } from "../apps/api/documents/synthetic-document-decisions.js";

type Identity = {
  userId: string;
  condominiumId: string;
  membershipRevision: string;
  chatId: string;
  documentVersionId: string;
  contentSha256: string;
};
type Anchor = {
  policy: SyntheticMaintenancePolicy;
  planDigest: string;
  sourcePid: number;
  identities: Identity[];
  postPoint: HostedDocumentTransferRequest[];
  untouchedDigest: string;
};
const key = new Uint8Array(32).fill(6); // Public synthetic key; never discovered from environment.
const pools: Pool[] = [];
let phase = "guards";
const pool = (url: URL) => {
  const value = new Pool({
    connectionString: url.toString(),
    max: 2,
    connectionTimeoutMillis: 5000
  });
  pools.push(value);
  return value;
};
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic-only",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 1000,
  globalDailyLimitMicrounits: 10000
};
const revision = "synthetic-policy-a";

async function untouchedDigest(database: Pool, identity: Identity): Promise<string> {
  const rows = [];
  for (const table of [
    "documents",
    "document_versions",
    "document_original_contents",
    "document_pages",
    "document_chunks",
    "document_chunk_embeddings",
    "conversation_entries",
    "memberships"
  ])
    rows.push([
      table,
      (
        await database.query(
          `SELECT md5(to_jsonb(t)::text) AS hash FROM app.${table} t WHERE condominium_id=$1 ORDER BY hash`,
          [identity.condominiumId]
        )
      ).rows
    ]);
  return budgetDigest(rows);
}

async function installQuarantine(database: Pool, digest: string, runId: string) {
  await database.query(
    "CREATE TABLE ops_control.maintenance_guard(snapshot_digest text NOT NULL,quarantined boolean NOT NULL,recovery_run_id text NOT NULL)"
  );
  await database.query("INSERT INTO ops_control.maintenance_guard VALUES($1,true,$2)", [
    digest,
    runId
  ]);
  await database.query("UPDATE app.operation_budget_policy SET enabled=false WHERE singleton");
}

const eligible = (digest: string, runId: string) => async (client: Pick<PoolClient, "query">) => {
  const rows = (
    await client.query(
      "SELECT snapshot_digest,quarantined,recovery_run_id FROM ops_control.maintenance_guard"
    )
  ).rows;
  return (
    rows.length === 1 &&
    rows[0].snapshot_digest === digest &&
    rows[0].quarantined === true &&
    rows[0].recovery_run_id === runId
  );
};

const options = (url: URL, policy: SyntheticMaintenancePolicy, runId: string) => ({
  connectionString: url.toString(),
  confirmation: "synthetic-local-only" as const,
  policy,
  key,
  eligible: eligible(policy.snapshotDigest, runId),
  applyDocumentDecision: createSyntheticDocumentDecisionApplier({
    confirmation: "synthetic-local-only",
    condominiumIds: policy.condominiumIds,
    documentVersionIds: policy.documentVersionIds,
    history: "preserve-as-historical"
  }),
  onDiagnostic: (value: string) => {
    phase = `maintenance_${value}`;
  }
});

try {
  const [stage, runId, targetId] = process.argv.slice(2);
  assert.ok(stage === "prepare" || stage === "verify");
  assert.match(runId ?? "", /^[a-f0-9]{32}$/u);
  assert.equal(process.argv.length, stage === "prepare" ? 4 : 5);
  if (stage === "verify") assert.match(targetId ?? "", /^[a-f0-9]{32}$/u);
  assert.equal(process.env.PILOT_RECOVERY_CONFIRMATION, "synthetic-local-only");
  const adminUrl = new URL(process.env.PILOT_RECOVERY_ADMIN_URL ?? "");
  assert.equal(adminUrl.pathname, "/postgres");
  const url = new URL(adminUrl);
  url.pathname = `/alvitra_ops_${stage === "prepare" ? "source" : "restore"}_${stage === "prepare" ? runId : targetId}`;
  localRecoveryConnection(
    url.toString(),
    stage === "prepare" ? "source" : "restore",
    "synthetic-local-only"
  );
  syntheticMaintenanceConnection(url.toString(), "synthetic-local-only");
  const directory = resolve(".local", "pilot-operations", runId!, "maintenance");
  const manifest = await readFile(resolve(directory, "..", "backup", "manifest.json"));
  const manifestIdentity = JSON.parse(manifest.toString("utf8")) as {
    version?: number;
    purpose?: string;
    sourceDatabase?: string;
  };
  assert.equal(manifestIdentity.version, 1);
  assert.equal(manifestIdentity.purpose, "synthetic-local-recovery");
  assert.equal(manifestIdentity.sourceDatabase, `alvitra_ops_source_${runId}`);
  const snapshotDigest = createHash("sha256").update(manifest).digest("hex");
  if (stage === "verify") {
    phase = "target_binding";
    assert.deepEqual(JSON.parse(await readFile(resolve(directory, "target.json"), "utf8")), {
      runId,
      targetId,
      snapshotDigest
    });
  }
  const planPath = resolve(directory, "plan.json");
  const anchorPath = resolve(directory, "anchor.json");
  const database = pool(url);
  phase = "target";
  const marker = (
    await database.query(
      "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
    )
  ).rows;
  assert.deepEqual(marker, [
    {
      name: url.pathname.slice(1),
      purpose: stage === "prepare" ? "source" : "restore",
      data_policy: "synthetic-local-only"
    }
  ]);
  if (stage === "prepare") {
    phase = "post_snapshot_calls";
    const fixture = JSON.parse(
      await readFile(resolve(directory, "..", "ledger-seeded.json"), "utf8")
    ) as { identities: Identity[]; hosted: HostedDocumentTransferRequest };
    const [a, b] = fixture.identities;
    assert.ok(a && b && a.condominiumId !== b.condominiumId && a.userId !== b.userId);
    const service = (role: "runtime" | "ledger") => {
      const serviceUrl = new URL(url);
      serviceUrl.username = `ops_bound_${role}_${runId}`;
      return pool(serviceUrl);
    };
    const ledger = createPostgresHostedCallLedger(service("ledger"));
    const controls = createBudgetedHostedDocumentControls({
      ledger,
      store: createPostgresOperationBudgetStore(service("runtime")),
      budget: () => budget,
      authorize: async (request) => ({
        allowed: true,
        requestHash: hostedDocumentRequestHash(request),
        policyRevision: revision
      }),
      resolveScope: async () => ({
        kind: "tenant",
        userId: b.userId,
        condominiumId: b.condominiumId,
        membershipRevision: b.membershipRevision
      })
    });
    const executor = createHostedDocumentExecutor(controls);
    const request: HostedDocumentTransferRequest = {
      ...fixture.hosted,
      condominiumId: b.condominiumId,
      userId: b.userId,
      chatId: b.chatId,
      membershipRevision: b.membershipRevision,
      documentVersions: [
        { id: b.documentVersionId, contentKind: "original", contentSha256: b.contentSha256 }
      ],
      payloadSha256: budgetDigest(["synthetic-post-snapshot-completed", runId])
    };
    const unknown = {
      ...request,
      payloadSha256: budgetDigest(["synthetic-post-snapshot-unknown", runId])
    };
    await executor.execute(request, async () => ({ synthetic: "result-after-backup" }));
    await assert.rejects(
      executor.execute(unknown, async () => {
        throw new Error("synthetic-unknown-after-dispatch");
      })
    );
    phase = "plan";
    await mkdir(directory, { mode: 0o700 });
    const policy: SyntheticMaintenancePolicy = {
      dataPolicy: "synthetic-local-only",
      revision: budgetDigest(["maintenance-recovery-v1", runId]),
      snapshotDigest,
      migrationDigest: await maintenanceInventoryDigest(database),
      userIds: (
        await database.query<{ id: string }>("SELECT id FROM app.users ORDER BY id")
      ).rows.map((row) => row.id),
      condominiumIds: (
        await database.query<{ id: string }>("SELECT id FROM app.condominiums ORDER BY id")
      ).rows.map((row) => row.id),
      documentVersionIds: (
        await database.query<{ id: string }>("SELECT id FROM app.document_versions ORDER BY id")
      ).rows.map((row) => row.id),
      allowedActions: ["revoke_account", "revoke_membership", "purge_condominium_content"]
    };
    await installQuarantine(database, snapshotDigest, runId!);
    const maintenance = createSyntheticDataControls(options(url, policy, runId!));
    try {
      const fence = await maintenance.captureFence();
      const plan: SyntheticMaintenancePlan = {
        version: 1,
        policyDigest: budgetDigest(policy),
        snapshotDigest,
        fence,
        decisions: [
          {
            id: randomUUID(),
            action: "revoke_membership",
            userId: a.userId,
            condominiumId: a.condominiumId
          },
          { id: randomUUID(), action: "revoke_account", userId: a.userId },
          { id: randomUUID(), action: "purge_condominium_content", condominiumId: a.condominiumId }
        ]
      };
      const planDigest = await persistMaintenancePlan(planPath, plan, policy, key);
      const anchor: Anchor = {
        policy,
        planDigest,
        sourcePid: process.pid,
        identities: fixture.identities,
        postPoint: [request, unknown],
        untouchedDigest: await untouchedDigest(database, b)
      };
      // Anchor is outside app/dump and immutable; all restrictions follow durable plan+anchor writes.
      const anchorFile = await open(anchorPath, "wx", 0o600);
      try {
        await anchorFile.writeFile(JSON.stringify(anchor));
        await anchorFile.sync();
      } finally {
        await anchorFile.close();
      }
      const result = await maintenance.applyPlan(planPath, planDigest);
      assert.equal(result.quarantined, true);
      assert.equal(result.activationAuthorized, false);
    } finally {
      await maintenance.close();
    }
  } else {
    phase = "anchor";
    const anchor = JSON.parse(await readFile(anchorPath, "utf8")) as Anchor;
    assert.notEqual(
      anchor.sourcePid,
      process.pid,
      "Maintenance verification requires a new Node process."
    );
    assert.equal(anchor.policy.snapshotDigest, snapshotDigest);
    assert.equal(
      await eligible(snapshotDigest, runId!)(database),
      true,
      "Target quarantine is not bound to this recovery run."
    );
    const maintenance = createSyntheticDataControls(options(url, anchor.policy, runId!));
    try {
      phase = "refusals";
      const before = await captureRecoveryInventory(database);
      await assert.rejects(
        maintenance.applyPlan(resolve(directory, "missing-plan.json"), anchor.planDigest)
      );
      await assert.rejects(maintenance.applyPlan(planPath, "0".repeat(64)));
      const altered = `${await readFile(planPath, "utf8")} `;
      const alteredPath = resolve(directory, "altered-plan.json");
      await writeFile(alteredPath, altered, { flag: "wx", mode: 0o600 });
      await assert.rejects(maintenance.applyPlan(alteredPath, anchor.planDigest));
      for (const policy of [
        { ...anchor.policy, revision: budgetDigest("different-policy") },
        { ...anchor.policy, condominiumIds: [] }
      ]) {
        const denied = createSyntheticDataControls(options(url, policy, runId!));
        try {
          await assert.rejects(denied.applyPlan(planPath, anchor.planDigest));
        } finally {
          await denied.close();
        }
      }
      const denied = createSyntheticDataControls({
        ...options(url, anchor.policy, runId!),
        eligible: async () => false
      });
      try {
        await assert.rejects(denied.applyPlan(planPath, anchor.planDigest));
      } finally {
        await denied.close();
      }
      const wrongKey = createSyntheticDataControls({
        ...options(url, anchor.policy, runId!),
        key: new Uint8Array(32).fill(8)
      });
      try {
        await assert.rejects(wrongKey.applyPlan(planPath, anchor.planDigest));
      } finally {
        await wrongKey.close();
      }
      phase = "schema_refusal";
      await database.query("ALTER TABLE app.document_pages DISABLE ROW LEVEL SECURITY");
      try {
        await assert.rejects(maintenance.applyPlan(planPath, anchor.planDigest));
      } finally {
        await database.query("ALTER TABLE app.document_pages ENABLE ROW LEVEL SECURITY");
      }
      assert.deepEqual(
        await captureRecoveryInventory(database),
        before,
        "Refused plans changed app state."
      );
      phase = "apply";
      const first = await maintenance.applyPlan(planPath, anchor.planDigest);
      const applied = await captureRecoveryInventory(database);
      const second = await maintenance.applyPlan(planPath, anchor.planDigest);
      assert.deepEqual(second, first);
      assert.deepEqual(
        await captureRecoveryInventory(database),
        applied,
        "Repeated restrictions changed app state."
      );
      assert.equal(first.quarantined, true);
      assert.equal(first.activationAuthorized, false);
      phase = "revoked_identity";
      const [a, b] = anchor.identities;
      assert.ok(a && b);
      assert.equal(
        (await database.query("SELECT status FROM app.users WHERE id=$1", [a.userId])).rows[0]
          .status,
        "blocked"
      );
      assert.equal(
        (
          await database.query(
            "SELECT status FROM app.memberships WHERE user_id=$1 AND condominium_id=$2",
            [a.userId, a.condominiumId]
          )
        ).rows[0].status,
        "revoked"
      );
      for (const table of [
        "access_codes",
        "device_sessions",
        "auth_sessions",
        "auth_mfa_challenges",
        "auth_mfa_recovery_codes"
      ])
        assert.equal(
          (await database.query(`SELECT 1 FROM app.${table} WHERE user_id=$1`, [a.userId]))
            .rowCount,
          0
        );
      for (const table of [
        "documents",
        "document_versions",
        "document_original_contents",
        "document_pages",
        "document_chunks",
        "document_chunk_embeddings"
      ])
        assert.equal(
          (
            await database.query(`SELECT 1 FROM app.${table} WHERE condominium_id=$1`, [
              a.condominiumId
            ])
          ).rowCount,
          0
        );
      phase = "purged_private_results";
      const removedCalls = (
        await database.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [
          a.condominiumId
        ])
      ).rows;
      assert.ok(removedCalls.length > 0);
      assert.ok(
        removedCalls.every(
          (row) =>
            (row.record.status === "invalidated" ||
              (row.record.status === "cancelled" && row.record.commitment === 0)) &&
            row.record.resultJson === undefined &&
            row.record.resultSha256 === undefined
        )
      );
      phase = "other_tenant_and_history";
      assert.equal(await untouchedDigest(database, b), anchor.untouchedDigest);
      assert.ok(
        (
          await database.query("SELECT 1 FROM app.conversation_entries WHERE condominium_id=$1", [
            a.condominiumId
          ])
        ).rowCount
      );
      phase = "consumption_fence";
      const fence = await maintenance.captureFence();
      for (const request of anchor.postPoint) {
        const row = fence.calls.find(
          (call) =>
            call.condominiumId === b.condominiumId &&
            call.requestHash === hostedDocumentRequestHash(request)
        );
        assert.equal(row?.status, "uncertain");
        assert.equal(row?.resultJson, undefined);
        const durable = (
          await database.query(
            "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 AND request_hash=$2",
            [b.condominiumId, hostedDocumentRequestHash(request)]
          )
        ).rows[0]?.record;
        assert.equal(durable?.status, "uncertain");
        assert.equal(durable?.resultJson, undefined);
        const serviceUrl = new URL(url);
        serviceUrl.username = `ops_bound_ledger_${runId}`;
        await assert.rejects(
          createPostgresHostedCallLedger(pool(serviceUrl)).reserve(
            {
              condominiumId: b.condominiumId,
              requestHash: hostedDocumentRequestHash(request),
              policyRevision: revision,
              documentVersionIds: [b.documentVersionId]
            },
            budget
          ),
          (error: unknown) => (error as { code?: string }).code === "call_uncertain"
        );
      }
      phase = "unknown_receipt";
      const unknownReceipt = fence.receipts.find(
        (row) => row.request.payloadHash === hostedDocumentRequestHash(anchor.postPoint[1]!)
      );
      assert.equal(unknownReceipt?.state, "unknown");
      phase = "purged_commitment";
      assert.ok(
        fence.calls.some(
          (row) =>
            row.condominiumId === a.condominiumId &&
            row.status === "invalidated" &&
            row.commitment > 0
        )
      );
      phase = "login_fence";
      assert.ok(fence.login.some((row) => row.key === "global" && row.count === 1000));
      await writeFile(
        resolve(directory, "result.json"),
        JSON.stringify(
          {
            passed: true,
            quarantined: true,
            activationAuthorized: false,
            actualExternalCalls: 0,
            simulatedCallsBeforeFence: 2,
            separateNodeProcesses: true,
            authenticatedPlanOutsideDump: true,
            missingAlteredWrongPolicyScopeKeyEligibilityAndSchemaDenied: true,
            idempotent: true,
            accountAndMembershipRevoked: true,
            originalsDerivativesAndPrivateResultsPurged: true,
            otherTenantOriginalAndHistoryIntact: true,
            postSnapshotResultsRemainUncertain: true,
            unknownReceiptPreserved: true,
            loginFencePreserved: true,
            receipts: fence.receipts.length,
            calls: fence.calls.length,
            dailyCommitment: fence.daily.reduce((sum, row) => sum + row.committed, 0),
            sourcePid: anchor.sourcePid,
            verificationPid: process.pid
          },
          null,
          2
        ),
        { flag: "wx", mode: 0o600 }
      );
    } finally {
      await maintenance.close();
    }
  }
  console.info(
    JSON.stringify({
      code: "pilot_maintenance_recovery_passed",
      stage,
      activationAuthorized: false
    })
  );
} catch {
  console.error(
    JSON.stringify({
      code: "pilot_maintenance_recovery_failed",
      phase,
      activationAuthorized: false
    })
  );
  process.exitCode = 1;
} finally {
  await Promise.all(pools.map((value) => value.end()));
}
