import { Pool } from "pg";
import { localRecoveryConnection } from "../../scripts/pilot-recovery.js";
import { createPostgresOperationBudgetStore } from "../../apps/api/security/postgres-operation-budget-store.js";
import { createPostgresHostedCallLedger } from "../../apps/api/documents/postgres-hosted-call-ledger.js";
import { createBudgetedHostedDocumentControls } from "../../apps/api/security/hosted-operation-budget.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";
import type { BudgetScope } from "../../apps/api/security/operation-budget.js";

let pool: Pool | undefined;
try {
  const [url, serializedRequest, serializedScope, revision] = process.argv.slice(2);
  if (
    process.env.PILOT_SECURITY_CONFIRMATION !== "synthetic-local-only" ||
    !url ||
    !serializedRequest ||
    !serializedScope ||
    !revision
  )
    throw new Error();
  const purpose = new URL(url).pathname.startsWith("/alvitra_ops_restore_") ? "restore" : "source";
  localRecoveryConnection(url, purpose, "synthetic-local-only");
  const parsed = new URL(url);
  if (parsed.username !== "postgres" || parsed.password !== "synthetic-only") throw new Error();
  pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
  const marker = await pool.query("SELECT purpose,data_policy FROM ops_control.environment");
  if (
    marker.rows.length !== 1 ||
    marker.rows[0].purpose !== purpose ||
    marker.rows[0].data_policy !== "synthetic-local-only"
  )
    throw new Error();
  const request = JSON.parse(serializedRequest) as HostedDocumentTransferRequest;
  const scope = JSON.parse(serializedScope) as Extract<BudgetScope, { kind: "tenant" }>;
  const currentPool = pool;
  const resolveScope = async () => {
    const result = await currentPool.query(
      "SELECT 1 FROM app.memberships m JOIN app.users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.condominium_id=$2 AND m.revision=$3 AND m.status='active' AND u.status='active' AND m.valid_from<=now() AND (m.valid_until IS NULL OR m.valid_until>now())",
      [scope.userId, scope.condominiumId, scope.membershipRevision]
    );
    if (result.rows.length !== 1) throw new Error();
    return scope;
  };
  const controls = createBudgetedHostedDocumentControls({
    store: createPostgresOperationBudgetStore(pool),
    ledger: createPostgresHostedCallLedger(pool),
    resolveScope,
    authorize: async (value) => ({
      allowed: true,
      requestHash: hostedDocumentRequestHash(value),
      policyRevision: revision
    }),
    budget: () => ({
      currency: "USD",
      tariffVersion: "synthetic-only-v1",
      maximumCostMicrounits: 10,
      tenantDailyLimitMicrounits: 100,
      globalDailyLimitMicrounits: 100
    })
  });
  const value = await createHostedDocumentExecutor(controls).execute(request, async () => {
    await currentPool.query("INSERT INTO ops_control.synthetic_dispatches DEFAULT VALUES");
    return { text: "FICTÍCIO: fala integral persistida da Alvitra." };
  });
  process.stdout.write(JSON.stringify({ status: "completed", value }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      status: "blocked",
      code:
        error && typeof error === "object" && "code" in error ? error.code : "synthetic_unavailable"
    })
  );
} finally {
  await pool?.end();
}
