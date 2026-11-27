import type { Pool } from "pg";
import { createApiOperationControl, deniedApiOperationControl } from "../app/operation-control.js";
import { budgetDigest, type BudgetRequest, type OperationBudgetStore } from "./operation-budget.js";
import { createPostgresOperationBudgetStore } from "./postgres-operation-budget-store.js";

export type PersistentExecutionPolicy = Readonly<{
  version: 1;
  approvalReference: string;
  dataPolicyRevision: string;
  expiresAt: string;
  currency: "USD" | "BRL";
  allowedUserIds: readonly string[];
  provider: "openai" | "gemini";
  answerModel: string;
  maximumCostMicrounits: Readonly<{ setup: number; question: number; upload: number }>;
}>;
export type PersistentExecutionConfiguration = Readonly<{
  policy: PersistentExecutionPolicy;
  revision: string;
}>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const invalid = () => new Error("Configuração de execução persistente inválida.");
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

/** Operator configuration, never an HTTP input. The database must independently enable its hash. */
export function persistentExecutionConfiguration(
  environment: NodeJS.ProcessEnv
): PersistentExecutionConfiguration | undefined {
  const raw = environment.ALVITRA_PERSISTENT_EXECUTION_POLICY;
  if (raw === undefined) return undefined;
  try {
    if (raw.length > 32_768 || environment.DEMO_MODE?.trim().toLowerCase() === "true")
      throw invalid();
    const value: unknown = JSON.parse(raw);
    if (
      !object(value) ||
      !exactKeys(value, [
        "version",
        "approvalReference",
        "dataPolicyRevision",
        "expiresAt",
        "currency",
        "allowedUserIds",
        "provider",
        "answerModel",
        "maximumCostMicrounits"
      ]) ||
      value.version !== 1 ||
      ![value.approvalReference, value.dataPolicyRevision].every(
        (item) => typeof item === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u.test(item)
      ) ||
      typeof value.expiresAt !== "string" ||
      new Date(value.expiresAt).toISOString() !== value.expiresAt ||
      !["USD", "BRL"].includes(String(value.currency)) ||
      !Array.isArray(value.allowedUserIds) ||
      value.allowedUserIds.length < 1 ||
      value.allowedUserIds.length > 100 ||
      value.allowedUserIds.some((id) => typeof id !== "string" || !uuid.test(id)) ||
      new Set(value.allowedUserIds).size !== value.allowedUserIds.length ||
      typeof value.answerModel !== "string" ||
      !/^[a-z0-9][a-z0-9.-]{0,99}$/u.test(value.answerModel) ||
      !object(value.maximumCostMicrounits) ||
      !exactKeys(value.maximumCostMicrounits, ["setup", "question", "upload"]) ||
      Object.entries(value.maximumCostMicrounits).some(
        ([kind, cost]) =>
          typeof cost !== "number" ||
          !Number.isSafeInteger(cost) ||
          cost < (kind === "upload" ? 0 : 1) ||
          cost > 1_000_000_000_000
      ) ||
      environment.CODEX_ANSWER_ENABLED?.trim().toLowerCase() === "true" ||
      !providerMatches(value, environment)
    )
      throw invalid();
    const policy = value as unknown as PersistentExecutionPolicy;
    const snapshot = Object.freeze({
      ...policy,
      allowedUserIds: Object.freeze([...policy.allowedUserIds]),
      maximumCostMicrounits: Object.freeze({ ...policy.maximumCostMicrounits })
    });
    return Object.freeze({ policy: snapshot, revision: budgetDigest(snapshot) });
  } catch {
    throw invalid();
  }
}

function providerMatches(value: Record<string, unknown>, environment: NodeJS.ProcessEnv): boolean {
  const openai =
    !!environment.OPENAI_API_KEY?.trim() &&
    environment.OPENAI_ANSWER_ENABLED?.trim().toLowerCase() !== "false";
  const gemini =
    !!environment.GEMINI_API_KEY?.trim() &&
    environment.GEMINI_ENABLED?.trim().toLowerCase() !== "false";
  if (value.provider === "openai")
    return (
      openai &&
      !gemini &&
      environment.OPENAI_ANSWER_ROUTING?.trim() === "single" &&
      value.answerModel === (environment.OPENAI_ANSWER_MODEL?.trim() || "gpt-6.1-sol")
    );
  if (value.provider === "gemini")
    return (
      gemini &&
      !openai &&
      value.answerModel === (environment.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite")
    );
  return false;
}

export function createPersistentApiOperationControl(
  options: Readonly<{
    pool: Pick<Pool, "connect">;
    configuration?: PersistentExecutionConfiguration;
    store?: OperationBudgetStore;
    now?: () => number;
  }>
) {
  const configuration = options.configuration;
  if (configuration === undefined) return deniedApiOperationControl;
  const { policy, revision } = configuration;
  const now = options.now ?? Date.now;
  const authorize = async (request: BudgetRequest): Promise<boolean> => {
    if (
      request.policyRevision !== revision ||
      !policy.allowedUserIds.includes(request.scope.userId) ||
      now() >= Date.parse(policy.expiresAt)
    )
      return false;
    let client;
    try {
      client = await options.pool.connect();
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL ROLE app_runtime");
      await client.query("SET LOCAL statement_timeout = '5s'");
      const result = await client.query<{ allowed: boolean }>(
        "SELECT app.persistent_execution_is_current($1,$2) AS allowed",
        [revision, policy.currency]
      );
      await client.query("COMMIT");
      return (
        result.rows.length === 1 &&
        result.rows[0]?.allowed === true &&
        now() < Date.parse(policy.expiresAt)
      );
    } catch {
      await client?.query("ROLLBACK").catch(() => undefined);
      return false;
    } finally {
      client?.release();
    }
  };
  return createApiOperationControl({
    store: options.store ?? createPostgresOperationBudgetStore(options.pool),
    policyRevision: revision,
    maximumCostMicrounits: policy.maximumCostMicrounits,
    authorize
  });
}

/** Read-only check: never creates schema, roles, accounts, policy or synthetic markers. */
export async function assertPersistentRuntimeReady(pool: Pick<Pool, "connect">): Promise<void> {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await client.query<{ ready: boolean }>(`
      SELECT
        EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = session_user
          AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication))
        AND pg_has_role(session_user, 'app_runtime', 'MEMBER')
        AND NOT EXISTS (SELECT 1 FROM pg_roles r WHERE
          (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication)
          AND pg_has_role(session_user, r.oid, 'MEMBER'))
        AND NOT EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname='app'
          AND pg_has_role(session_user, n.nspowner, 'MEMBER'))
        AND EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname='app_runtime'
          AND NOT (r.rolcanlogin OR r.rolsuper OR r.rolbypassrls OR r.rolcreaterole
            OR r.rolcreatedb OR r.rolinherit OR r.rolreplication)
          AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid))
        AND to_regprocedure('app.persistent_execution_is_current(text,text)') IS NOT NULL
        AND to_regprocedure('app.mutate_operation_budget(text,text,text,text,bigint)') IS NOT NULL
        AND to_regprocedure('app.consume_access_login_attempt(text)') IS NOT NULL
        AND (SELECT count(*) = 8 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='app' AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity
          AND c.relname IN ('users','memberships','chats','conversation_entries',
            'document_versions','document_original_contents','processing_jobs','operation_budget_receipts'))
        AS ready
    `);
    if (result.rows.length !== 1 || result.rows[0]?.ready !== true) throw invalid();
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query("SELECT app.persistent_execution_is_current($1,$2)", [
      "0".repeat(64),
      "USD"
    ]);
    await client.query("COMMIT");
  } catch {
    await client?.query("ROLLBACK").catch(() => undefined);
    throw new Error("O banco não atende aos contratos do runtime persistente.");
  } finally {
    client?.release();
  }
}
