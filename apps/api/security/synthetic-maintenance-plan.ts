import { createHmac, timingSafeEqual } from "node:crypto";
import { open } from "node:fs/promises";
import {
  budgetDigest,
  serializeBudgetValue,
  validateBudgetReceipt,
  type StoredBudgetReceipt
} from "./operation-budget.js";
import { validateHostedCallState, type HostedCallRecord } from "../documents/hosted-call-ledger.js";

export const maintenanceActions = [
  "revoke_account",
  "revoke_membership",
  "purge_document_version",
  "purge_condominium_content",
  "reconcile_hosted_operation"
] as const;
export type MaintenanceAction = (typeof maintenanceActions)[number];
export type SyntheticMaintenancePolicy = Readonly<{
  dataPolicy: "synthetic-local-only";
  revision: string;
  snapshotDigest: string;
  migrationDigest: string;
  userIds: readonly string[];
  condominiumIds: readonly string[];
  documentVersionIds: readonly string[];
  allowedActions: readonly MaintenanceAction[];
}>;
export type MaintenanceDecision = Readonly<{
  id: string;
  action: MaintenanceAction;
  userId?: string;
  condominiumId?: string;
  documentVersionId?: string;
  requestHash?: string;
  policyRevision?: string;
}>;
export type ConsumptionFence = {
  receipts: StoredBudgetReceipt[];
  calls: HostedCallRecord[];
  daily: Array<{ period: string; committed: number }>;
  lastSeenAt: number;
  login: Array<{ key: string; count: number; untilAt: string }>;
};
export type SyntheticMaintenancePlan = {
  version: 1;
  policyDigest: string;
  snapshotDigest: string;
  fence: ConsumptionFence;
  decisions: MaintenanceDecision[];
};
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
const digest = /^[a-f0-9]{64}$/u;
const fail = (): never => {
  throw new Error("Manutenção sintética recusada; mantenha o ambiente em quarentena.");
};
export function maintenanceDenied(): never {
  return fail();
}
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

/** Authenticated checkpoints form a union of proven transitions, including equal millisecond timestamps. */
export function combineConsumptionReceipt(
  existing: StoredBudgetReceipt | undefined,
  incoming: StoredBudgetReceipt
): StoredBudgetReceipt {
  validateBudgetReceipt(incoming);
  const validClaim = (row: StoredBudgetReceipt) =>
    row.state === "reserved" || row.state === "cancelled"
      ? row.tokenHash === null
      : digest.test(row.tokenHash ?? "");
  if (!validClaim(incoming)) fail();
  if (!existing) return structuredClone(incoming);
  validateBudgetReceipt(existing);
  if (!validClaim(existing)) fail();
  if (
    existing.fingerprint !== incoming.fingerprint ||
    existing.currency !== incoming.currency ||
    existing.createdAt !== incoming.createdAt ||
    (existing.tokenHash !== null &&
      incoming.tokenHash !== null &&
      existing.tokenHash !== incoming.tokenHash)
  )
    fail();
  const terminal = (row: StoredBudgetReceipt) =>
    row.state === "completed" || row.state === "cancelled";
  if (
    terminal(existing) &&
    terminal(incoming) &&
    (existing.state !== incoming.state ||
      existing.outputHash !== incoming.outputHash ||
      existing.actualCostMicrounits !== incoming.actualCostMicrounits)
  )
    fail();
  const rank = { reserved: 0, started: 1, unknown: 2, completed: 3, cancelled: 3 };
  const selected = rank[existing.state] >= rank[incoming.state] ? existing : incoming;
  return {
    ...structuredClone(selected),
    updatedAt: existing.updatedAt > incoming.updatedAt ? existing.updatedAt : incoming.updatedAt
  };
}

export function validateMaintenancePolicy(policy: SyntheticMaintenancePolicy): void {
  if (
    !policy ||
    policy.dataPolicy !== "synthetic-local-only" ||
    !digest.test(policy.revision) ||
    !digest.test(policy.snapshotDigest) ||
    !digest.test(policy.migrationDigest) ||
    !exact(policy, [
      "dataPolicy",
      "revision",
      "snapshotDigest",
      "migrationDigest",
      "userIds",
      "condominiumIds",
      "documentVersionIds",
      "allowedActions"
    ]) ||
    [policy.userIds, policy.condominiumIds, policy.documentVersionIds].some(
      (values) =>
        !Array.isArray(values) ||
        values.length > 10000 ||
        new Set(values).size !== values.length ||
        values.some((value) => !uuid.test(value))
    ) ||
    !Array.isArray(policy.allowedActions) ||
    policy.allowedActions.some((action) => !maintenanceActions.includes(action))
  )
    fail();
}

export function validateMaintenancePlan(
  plan: SyntheticMaintenancePlan,
  policy: SyntheticMaintenancePolicy
): void {
  validateMaintenancePolicy(policy);
  if (
    !plan ||
    plan.version !== 1 ||
    plan.policyDigest !== budgetDigest(policy) ||
    plan.snapshotDigest !== policy.snapshotDigest ||
    !exact(plan, ["version", "policyDigest", "snapshotDigest", "fence", "decisions"]) ||
    !Array.isArray(plan.decisions) ||
    plan.decisions.length > 10000 ||
    new Set(plan.decisions.map((event) => event?.id)).size !== plan.decisions.length
  )
    fail();
  for (const event of plan.decisions) {
    const keys: Record<MaintenanceAction, string[]> = {
      revoke_account: ["id", "action", "userId"],
      revoke_membership: ["id", "action", "userId", "condominiumId"],
      purge_document_version: ["id", "action", "condominiumId", "documentVersionId"],
      purge_condominium_content: ["id", "action", "condominiumId"],
      reconcile_hosted_operation: [
        "id",
        "action",
        "condominiumId",
        "userId",
        "requestHash",
        "policyRevision"
      ]
    };
    if (
      !event ||
      !uuid.test(event.id) ||
      !policy.allowedActions.includes(event.action) ||
      !keys[event.action] ||
      !exact(event, keys[event.action]) ||
      keys[event.action].some((key) => !(key in event)) ||
      (event.userId !== undefined && !policy.userIds.includes(event.userId)) ||
      (event.condominiumId !== undefined && !policy.condominiumIds.includes(event.condominiumId)) ||
      (event.documentVersionId !== undefined &&
        !policy.documentVersionIds.includes(event.documentVersionId)) ||
      (event.requestHash !== undefined && !digest.test(event.requestHash)) ||
      (event.policyRevision !== undefined &&
        (!event.policyRevision.trim() || event.policyRevision.length > 160))
    )
      fail();
  }
  const fence = plan.fence;
  if (
    !fence ||
    !exact(fence, ["receipts", "calls", "daily", "lastSeenAt", "login"]) ||
    !Array.isArray(fence.receipts) ||
    fence.receipts.length > 10000 ||
    !Array.isArray(fence.login) ||
    fence.login.length > 10000
  )
    fail();
  const receiptKeys = new Set<string>();
  for (const row of fence.receipts) {
    validateBudgetReceipt(row);
    const key = `${row.request.scope.kind === "account" ? row.request.scope.userId : row.request.scope.condominiumId}:${row.request.operationId}`;
    if (
      receiptKeys.has(key) ||
      !policy.userIds.includes(row.request.scope.userId) ||
      (row.request.scope.kind === "tenant" &&
        !policy.condominiumIds.includes(row.request.scope.condominiumId)) ||
      (row.state === "reserved" || row.state === "cancelled"
        ? row.tokenHash !== null
        : !digest.test(row.tokenHash ?? ""))
    )
      fail();
    receiptKeys.add(key);
  }
  validateHostedCallState({
    version: 1,
    lastSeenAt: fence.lastSeenAt,
    calls: fence.calls,
    daily: fence.daily
  });
  for (const row of fence.calls) {
    if (
      !policy.condominiumIds.includes(row.condominiumId) ||
      row.documentVersionIds.some((id) => !policy.documentVersionIds.includes(id)) ||
      !["uncertain", "cancelled", "invalidated"].includes(row.status) ||
      !exact(row, [
        "condominiumId",
        "requestHash",
        "policyRevision",
        "owner",
        "status",
        "documentVersionIds",
        "period",
        "currency",
        "tariffVersion",
        "commitment",
        "leaseUntil"
      ])
    )
      fail();
  }
  if (new Set(fence.login.map((row) => row?.key)).size !== fence.login.length) fail();
  for (const row of fence.login) {
    if (
      !row ||
      !exact(row, ["key", "count", "untilAt"]) ||
      (row.key !== "global" && !digest.test(row.key)) ||
      !Number.isInteger(row.count) ||
      row.count < 0 ||
      row.count > (row.key === "global" ? 1000 : 10) ||
      new Date(row.untilAt).toISOString() !== row.untilAt
    )
      fail();
  }
}

/** No original/result or open claim is exported. Missing results become a non-retryable fence. */
export function redactHostedConsumption(row: HostedCallRecord): HostedCallRecord {
  const id = budgetDigest(["maintenance-fence-owner", row.condominiumId, row.requestHash]).slice(
    0,
    32
  );
  return {
    condominiumId: row.condominiumId,
    requestHash: row.requestHash,
    ...(row.policyRevision === undefined ? {} : { policyRevision: row.policyRevision }),
    owner: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`,
    status: row.status === "cancelled" || row.status === "invalidated" ? row.status : "uncertain",
    documentVersionIds: [...row.documentVersionIds],
    period: row.period,
    currency: row.currency,
    tariffVersion: row.tariffVersion,
    commitment: row.commitment,
    leaseUntil: 0
  };
}

const signature = (payload: string, key: Uint8Array) => {
  if (key.byteLength < 32) fail();
  return createHmac("sha256", key)
    .update("alvitra-synthetic-maintenance-v1\n")
    .update(payload)
    .digest("hex");
};

/** Immutable file: explicit exclusive creation and fsync precede all effects. Caller anchors digest outside DB. */
export async function persistMaintenancePlan(
  path: string,
  plan: SyntheticMaintenancePlan,
  policy: SyntheticMaintenancePolicy,
  key: Uint8Array
): Promise<string> {
  validateMaintenancePlan(plan, policy);
  const payload = serializeBudgetValue(plan);
  const envelope = serializeBudgetValue({ payload, mac: signature(payload, key) });
  if (Buffer.byteLength(envelope) > 32 * 1024 * 1024) fail();
  const file = await open(path, "wx", 0o600);
  try {
    await file.writeFile(envelope);
    await file.sync();
  } finally {
    await file.close();
  }
  return budgetDigest(envelope);
}

export async function loadMaintenancePlan(
  path: string,
  expectedDigest: string,
  policy: SyntheticMaintenancePolicy,
  key: Uint8Array
): Promise<SyntheticMaintenancePlan> {
  try {
    if (!digest.test(expectedDigest)) fail();
    const file = await open(path, "r");
    let encoded: string;
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 32 * 1024 * 1024) fail();
      encoded = await file.readFile("utf8");
    } finally {
      await file.close();
    }
    if (budgetDigest(encoded) !== expectedDigest) fail();
    const envelope = JSON.parse(encoded) as { payload: string; mac: string };
    if (
      !exact(envelope, ["payload", "mac"]) ||
      typeof envelope.payload !== "string" ||
      !digest.test(envelope.mac)
    )
      fail();
    if (
      !timingSafeEqual(
        Buffer.from(envelope.mac, "hex"),
        Buffer.from(signature(envelope.payload, key), "hex")
      )
    )
      fail();
    const plan = JSON.parse(envelope.payload) as SyntheticMaintenancePlan;
    validateMaintenancePlan(plan, policy);
    return plan;
  } catch {
    return fail();
  }
}
