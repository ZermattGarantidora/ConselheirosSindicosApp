import { Pool, type PoolClient } from "pg";
import { budgetDigest, budgetScopeKey, type StoredBudgetReceipt } from "./operation-budget.js";
import { hostedOperationId } from "./hosted-operation-budget.js";
import {
  hostedCallResultHash,
  validateHostedCallState,
  type HostedCallRecord
} from "../documents/hosted-call-ledger.js";
import {
  loadMaintenancePlan,
  combineConsumptionReceipt,
  maintenanceDenied,
  redactHostedConsumption,
  validateMaintenancePlan,
  validateMaintenancePolicy,
  type ConsumptionFence,
  type MaintenanceDecision,
  type SyntheticMaintenancePolicy
} from "./synthetic-maintenance-plan.js";

export type SyntheticDocumentDecision = Extract<MaintenanceDecision, object> & {
  action: "purge_document_version" | "purge_condominium_content";
};
export type SyntheticDataControlsOptions = {
  connectionString: string;
  confirmation: "synthetic-local-only";
  policy: SyntheticMaintenancePolicy;
  key: Uint8Array;
  eligible: (client: PoolClient) => Promise<boolean>;
  onDiagnostic?: (phase: "target" | "inventory" | "eligibility" | "operation" | "commit") => void;
  applyDocumentDecision?: (
    client: PoolClient,
    decision: SyntheticDocumentDecision
  ) => Promise<void>;
};
/** Refuses credentials/env discovery: only explicit public fixture credentials on literal loopback. */
export function syntheticMaintenanceConnection(raw: string, confirmation: string): URL {
  try {
    const url = new URL(raw);
    if (
      confirmation !== "synthetic-local-only" ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username !== "postgres" ||
      url.password !== "synthetic-only" ||
      !url.port ||
      url.search ||
      url.hash ||
      !/^\/alvitra_ops_(source|restore)_[a-f0-9]{32}$/u.test(url.pathname)
    )
      maintenanceDenied();
    return url;
  } catch {
    return maintenanceDenied();
  }
}
const receiptProjection = `jsonb_build_object('request',request,'fingerprint',fingerprint,'state',state,
  'currency',currency,'day',to_char(day,'YYYY-MM-DD'),
  'createdAt',to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'updatedAt',to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'tokenHash',token_hash,'outputHash',output_hash,'actualCostMicrounits',actual_cost) AS value`;

/** OID-independent schema fingerprint; no domain rows, credentials or function bodies leave this call. */
export async function maintenanceInventoryDigest(
  client: Pick<PoolClient, "query">
): Promise<string> {
  const migrations = (await client.query("SELECT name FROM app.schema_migrations ORDER BY name"))
    .rows;
  const catalog = (
    await client.query(`SELECT 'relation' AS kind,c.relname::text AS name,
      jsonb_build_array(c.relkind,c.relrowsecurity,c.relforcerowsecurity,
        (SELECT jsonb_agg(jsonb_build_array(a.grantor::regrole::text,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,a.privilege_type,a.is_grantable)
          ORDER BY a.grantor::regrole::text,a.grantee::regrole::text,a.privilege_type,a.is_grantable)
          FROM aclexplode(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a)) AS definition
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app'
    UNION ALL SELECT 'column',c.relname||'.'||a.attname,
      jsonb_build_array(format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid))
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname='app' AND a.attnum>0 AND NOT a.attisdropped
    UNION ALL SELECT 'constraint',c.relname||'.'||k.conname,to_jsonb(pg_get_constraintdef(k.oid))
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app'
    UNION ALL SELECT 'function',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
      jsonb_build_array(pg_get_functiondef(p.oid),
        (SELECT jsonb_agg(jsonb_build_array(a.grantor::regrole::text,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,a.privilege_type,a.is_grantable)
          ORDER BY a.grantor::regrole::text,a.grantee::regrole::text,a.privilege_type,a.is_grantable)
          FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a))
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app'
    UNION ALL SELECT 'index',c.relname::text,to_jsonb(pg_get_indexdef(c.oid))
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relkind='i'
    UNION ALL SELECT 'policy',c.relname||'.'||p.polname,
      jsonb_build_array(p.polcmd,p.polpermissive,(SELECT array_agg(r.rolname ORDER BY r.rolname) FROM pg_roles r WHERE r.oid=ANY(p.polroles)),pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app'
    ORDER BY kind,name`)
  ).rows;
  return budgetDigest({ migrations, catalog });
}

/** Local operator tool only. No runtime grants, public endpoint, automatic reopen or provider call. */
export function createSyntheticDataControls(options: SyntheticDataControlsOptions) {
  const policy = structuredClone(options.policy);
  validateMaintenancePolicy(policy);
  const url = syntheticMaintenanceConnection(options.connectionString, options.confirmation);
  const key = new Uint8Array(options.key);
  if (key.byteLength < 32 || typeof options.eligible !== "function") maintenanceDenied();
  const pool = new Pool({
    connectionString: url.toString(),
    max: 1,
    connectionTimeoutMillis: 5000
  });
  async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect().catch(() => maintenanceDenied());
    let phase: "target" | "inventory" | "eligibility" | "operation" | "commit" = "target";
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      const marker = (
        await client.query(
          "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
        )
      ).rows;
      const purpose = url.pathname.includes("_source_") ? "source" : "restore";
      if (
        marker.length !== 1 ||
        marker[0].name !== url.pathname.slice(1) ||
        marker[0].purpose !== purpose ||
        marker[0].data_policy !== "synthetic-local-only"
      )
        maintenanceDenied();
      // Lock every app table: no concurrent dispatch, finalization, journal write or deletion can cross the proof.
      const tables = (
        await client.query<{ name: string }>(
          "SELECT tablename AS name FROM pg_tables WHERE schemaname='app' ORDER BY tablename"
        )
      ).rows;
      if (!tables.length || tables.some((row) => !/^[a-z][a-z0-9_]*$/u.test(row.name)))
        maintenanceDenied();
      await client.query(
        `LOCK TABLE ${tables.map((row) => `app."${row.name}"`).join(",")} IN ACCESS EXCLUSIVE MODE`
      );
      phase = "inventory";
      if ((await maintenanceInventoryDigest(client)) !== policy.migrationDigest)
        maintenanceDenied();
      phase = "eligibility";
      const enabled = (
        await client.query("SELECT enabled FROM app.operation_budget_policy WHERE singleton")
      ).rows;
      if (
        enabled.length !== 1 ||
        enabled[0].enabled !== false ||
        (await client.query("SELECT 1 FROM app.processing_jobs WHERE status='processing' LIMIT 1"))
          .rowCount ||
        !(await options.eligible(client))
      )
        maintenanceDenied();
      phase = "operation";
      const result = await operation(client);
      phase = "commit";
      await client.query("COMMIT");
      return result;
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      try {
        options.onDiagnostic?.(phase);
      } catch {
        /* Diagnostics cannot change the closed failure. */
      }
      return maintenanceDenied();
    } finally {
      client.release();
    }
  }

  async function captureFence(): Promise<ConsumptionFence> {
    return transaction(async (client) => {
      const receipts = (
        await client.query<{ value: StoredBudgetReceipt }>(
          `SELECT ${receiptProjection} FROM app.operation_budget_receipts ORDER BY scope_key,operation_id`
        )
      ).rows.map((row) => row.value);
      const calls = (
        await client.query<{ record: HostedCallRecord }>(
          "SELECT record FROM app.hosted_call_records ORDER BY condominium_id,request_hash"
        )
      ).rows.map((row) => row.record);
      const daily = (
        await client.query(
          "SELECT to_char(period,'YYYY-MM-DD') AS period,committed::float8 AS committed FROM app.hosted_call_daily ORDER BY period"
        )
      ).rows;
      const lastSeenAt = Number(
        (await client.query("SELECT last_seen_at FROM app.hosted_call_control WHERE singleton"))
          .rows[0]?.last_seen_at
      );
      validateHostedCallState({ version: 1, lastSeenAt, calls, daily });
      const login = (
        await client.query(
          'SELECT key,count,to_char(until_at AT TIME ZONE \'UTC\',\'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') AS "untilAt" FROM app.access_login_attempts ORDER BY key'
        )
      ).rows;
      const fence: ConsumptionFence = {
        receipts,
        calls: calls.map(redactHostedConsumption),
        daily,
        lastSeenAt,
        login
      };
      validateMaintenancePlan(
        {
          version: 1,
          policyDigest: budgetDigest(policy),
          snapshotDigest: policy.snapshotDigest,
          fence,
          decisions: []
        },
        policy
      );
      return fence;
    });
  }

  async function mergeFence(client: PoolClient, fence: ConsumptionFence) {
    const currency = (
      await client.query("SELECT currency FROM app.operation_budget_policy WHERE singleton")
    ).rows[0]?.currency;
    if (fence.receipts.some((row) => row.currency !== currency)) maintenanceDenied();
    const knownReceipts = new Set(
      fence.receipts.map((row) => `${budgetScopeKey(row.request.scope)}:${row.request.operationId}`)
    );
    const knownCalls = new Set(fence.calls.map((row) => `${row.condominiumId}:${row.requestHash}`));
    if (
      (
        await client.query("SELECT scope_key,operation_id FROM app.operation_budget_receipts")
      ).rows.some((row) => !knownReceipts.has(`${row.scope_key}:${row.operation_id}`)) ||
      (
        await client.query("SELECT condominium_id,request_hash FROM app.hosted_call_records")
      ).rows.some((row) => !knownCalls.has(`${row.condominium_id}:${row.request_hash}`))
    )
      maintenanceDenied();
    for (const incoming of fence.receipts) {
      const scopeKey = budgetScopeKey(incoming.request.scope);
      const existing = (
        await client.query<{ value: StoredBudgetReceipt }>(
          `SELECT ${receiptProjection} FROM app.operation_budget_receipts WHERE scope_key=$1 AND operation_id=$2`,
          [scopeKey, incoming.request.operationId]
        )
      ).rows[0]?.value;
      const row = combineConsumptionReceipt(existing, incoming);
      await client.query(
        `INSERT INTO app.operation_budget_receipts(scope_key,operation_id,owner_user_id,condominium_id,request,fingerprint,state,day,created_at,updated_at,token_hash,output_hash,actual_cost,currency)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT(scope_key,operation_id) DO UPDATE SET state=EXCLUDED.state,updated_at=EXCLUDED.updated_at,token_hash=EXCLUDED.token_hash,output_hash=EXCLUDED.output_hash,actual_cost=EXCLUDED.actual_cost`,
        [
          scopeKey,
          row.request.operationId,
          row.request.scope.userId,
          row.request.scope.kind === "tenant" ? row.request.scope.condominiumId : null,
          row.request,
          row.fingerprint,
          row.state,
          row.day,
          row.createdAt,
          row.updatedAt,
          row.tokenHash,
          row.outputHash,
          row.actualCostMicrounits,
          row.currency
        ]
      );
    }
    for (const row of fence.calls) {
      const existing = (
        await client.query<{ record: HostedCallRecord }>(
          "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 AND request_hash=$2",
          [row.condominiumId, row.requestHash]
        )
      ).rows[0]?.record;
      if (existing) {
        const fields = (record: HostedCallRecord) => [
          record.condominiumId,
          record.requestHash,
          record.policyRevision,
          record.documentVersionIds,
          record.period,
          record.currency,
          record.tariffVersion
        ];
        if (budgetDigest(fields(existing)) !== budgetDigest(fields(row))) maintenanceDenied();
        // A later purge may have invalidated a previously cancelled call, whose cost was already released.
        if (
          existing.status === "invalidated" &&
          existing.commitment === 0 &&
          row.status === "cancelled"
        )
          continue;
        if (
          existing.commitment !== row.commitment &&
          !(row.status === "invalidated" && row.commitment === 0 && existing.status === "cancelled")
        )
          maintenanceDenied();
        if (existing.status === "invalidated") continue;
        if (
          row.status === "uncertain" &&
          ["completed", "invalidated", "cancelled"].includes(existing.status)
        )
          continue;
        if (row.status === "cancelled" && !["reserved", "cancelled"].includes(existing.status))
          maintenanceDenied();
      }
      await client.query(
        "INSERT INTO app.hosted_call_records(condominium_id,request_hash,record) VALUES($1,$2,$3) ON CONFLICT(condominium_id,request_hash) DO UPDATE SET record=EXCLUDED.record",
        [row.condominiumId, row.requestHash, row]
      );
    }
    for (const row of fence.daily)
      await client.query(
        "INSERT INTO app.hosted_call_daily(period,committed) VALUES($1,$2) ON CONFLICT(period) DO UPDATE SET committed=GREATEST(app.hosted_call_daily.committed,EXCLUDED.committed)",
        [row.period, row.committed]
      );
    await client.query(
      "UPDATE app.hosted_call_control SET last_seen_at=GREATEST(last_seen_at,$1) WHERE singleton",
      [fence.lastSeenAt]
    );
    for (const row of fence.login)
      await client.query(
        "INSERT INTO app.access_login_attempts(key,count,until_at) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET count=GREATEST(app.access_login_attempts.count,EXCLUDED.count),until_at=GREATEST(app.access_login_attempts.until_at,EXCLUDED.until_at)",
        [row.key, row.count, row.untilAt]
      );
  }

  async function reconcile(
    client: PoolClient,
    event: MaintenanceDecision
  ): Promise<"completed" | "cancelled" | "pending"> {
    const operationId = hostedOperationId(event.condominiumId!, event.requestHash!);
    const receipt = (
      await client.query<{ value: StoredBudgetReceipt }>(
        `SELECT ${receiptProjection} FROM app.operation_budget_receipts WHERE scope_key=$1 AND operation_id=$2`,
        [`tenant:${event.condominiumId}`, operationId]
      )
    ).rows[0]?.value;
    const call = (
      await client.query<{ record: HostedCallRecord }>(
        "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 AND request_hash=$2",
        [event.condominiumId, event.requestHash]
      )
    ).rows[0]?.record;
    if (
      !receipt ||
      !call ||
      receipt.request.scope.userId !== event.userId ||
      receipt.request.policyRevision !== budgetDigest(event.policyRevision) ||
      receipt.request.payloadHash !== event.requestHash ||
      call.policyRevision !== event.policyRevision ||
      receipt.currency !== "USD" ||
      !["pdf_ocr", "photo_ocr", "photo_analysis", "batch_synthesis", "embedding"].includes(
        receipt.request.kind
      )
    )
      maintenanceDenied();
    const amountMatches = call.commitment === receipt.request.maximumCostMicrounits;
    if (
      receipt.state === "cancelled" &&
      ((call.status === "cancelled" && amountMatches) ||
        (call.status === "invalidated" && call.commitment === 0))
    )
      return "cancelled";
    if (!amountMatches) maintenanceDenied();
    if (receipt.state === "completed") return "completed";
    if (receipt.state === "cancelled") maintenanceDenied();
    if (!["started", "unknown"].includes(receipt.state)) return "pending";
    if (call.status === "completed") {
      if (
        typeof call.resultJson !== "string" ||
        Buffer.byteLength(call.resultJson) > 1000000 ||
        hostedCallResultHash(call.resultJson) !== call.resultSha256
      )
        maintenanceDenied();
      const outputHash = budgetDigest(JSON.parse(call.resultJson));
      await client.query(
        "UPDATE app.operation_budget_receipts SET state='completed',output_hash=$3,actual_cost=(request->>'maximumCostMicrounits')::bigint,updated_at=clock_timestamp() WHERE scope_key=$1 AND operation_id=$2",
        [`tenant:${event.condominiumId}`, operationId, outputHash]
      );
      return "completed";
    }
    if (call.status === "cancelled") {
      await client.query(
        "UPDATE app.operation_budget_receipts SET state='cancelled',token_hash=NULL,updated_at=clock_timestamp() WHERE scope_key=$1 AND operation_id=$2",
        [`tenant:${event.condominiumId}`, operationId]
      );
      return "cancelled";
    }
    return "pending";
  }

  async function applyPlan(path: string, expectedDigest: string) {
    const plan = await loadMaintenancePlan(path, expectedDigest, policy, key);
    return transaction(async (client) => {
      await client.query(
        "CREATE TABLE IF NOT EXISTS ops_control.maintenance_decisions(id uuid PRIMARY KEY,fingerprint text NOT NULL,outcome text NOT NULL)"
      );
      await mergeFence(client, plan.fence);
      const results: Array<{ id: string; outcome: string }> = [];
      for (const event of plan.decisions) {
        const fingerprint = budgetDigest([plan.policyDigest, event]);
        const previous = (
          await client.query(
            "SELECT fingerprint,outcome FROM ops_control.maintenance_decisions WHERE id=$1",
            [event.id]
          )
        ).rows[0];
        if (previous) {
          if (previous.fingerprint !== fingerprint) maintenanceDenied();
          // Restrictive effects must run again: an older app dump can be restored while ops_control survives.
        }
        let outcome: string = "applied";
        if (event.action === "revoke_membership") {
          await client.query(
            "UPDATE app.memberships SET status='revoked',revoked_at=COALESCE(revoked_at,clock_timestamp()),revision=$3 WHERE condominium_id=$1 AND user_id=$2",
            [event.condominiumId, event.userId, budgetDigest(["revoked", event.id])]
          );
        } else if (event.action === "revoke_account") {
          await client.query("UPDATE app.users SET status='blocked' WHERE id=$1", [event.userId]);
          for (const table of [
            "access_codes",
            "auth_sessions",
            "auth_action_tokens",
            "auth_mfa_challenges",
            "auth_mfa_recovery_codes"
          ])
            await client.query(`DELETE FROM app.${table} WHERE user_id=$1`, [event.userId]);
        } else if (event.action === "reconcile_hosted_operation") {
          outcome = await reconcile(client, event);
        } else {
          if (!options.applyDocumentDecision) maintenanceDenied();
          await options.applyDocumentDecision(client, event as SyntheticDocumentDecision);
        }
        await client.query(
          "INSERT INTO ops_control.maintenance_decisions(id,fingerprint,outcome) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET outcome=EXCLUDED.outcome",
          [event.id, fingerprint, outcome]
        );
        results.push({ id: event.id, outcome });
      }
      return {
        quarantined: true as const,
        activationAuthorized: false as const,
        decisions: results
      };
    });
  }
  return { captureFence, applyPlan, close: () => pool.end() };
}
