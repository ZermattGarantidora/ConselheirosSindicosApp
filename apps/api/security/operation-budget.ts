import { createHash, randomBytes } from "node:crypto";

export const budgetKinds = [
  "setup",
  "upload",
  "question",
  "pdf_ocr",
  "photo_ocr",
  "photo_analysis",
  "batch_synthesis",
  "embedding",
  "document_write",
  "document_review",
  "document_improvement",
  "audio_transcription",
  "audio_minutes_write",
  "audio_minutes_review"
] as const;
export type BudgetKind = (typeof budgetKinds)[number];
export type BudgetScope = Readonly<
  { userId: string } & (
    { kind: "account" } | { kind: "tenant"; condominiumId: string; membershipRevision: string }
  )
>;
export type BudgetRequest = Readonly<{
  scope: BudgetScope;
  operationId: string;
  kind: BudgetKind;
  payloadHash: string;
  policyRevision: string;
  maximumCostMicrounits: number;
}>;
export type BudgetPolicy = Readonly<{
  enabled: boolean;
  revision: string;
  currency: "BRL" | "USD";
  scopeDailyCost: number;
  globalDailyCost: number;
  scopeDailyOperations: number;
  globalDailyOperations: number;
  scopeConcurrent: number;
  globalConcurrent: number;
}>;
export type BudgetState = "reserved" | "started" | "completed" | "cancelled" | "unknown";
export type BudgetReceipt = Readonly<{
  currency: BudgetPolicy["currency"];
  request: BudgetRequest;
  fingerprint: string;
  state: BudgetState;
  day: string;
  createdAt: string;
  updatedAt: string;
  actualCostMicrounits: number | null;
  outputHash: string | null;
}>;
export type StoredBudgetReceipt = { -readonly [K in keyof BudgetReceipt]: BudgetReceipt[K] } & {
  tokenHash: string | null;
};
export type BudgetLedger = { policy: BudgetPolicy; receipts: StoredBudgetReceipt[] };
export type BudgetAction = "reserve" | "start" | "complete" | "cancel" | "unknown";
export type BudgetDetails = Readonly<{
  token?: string;
  outputHash?: string;
  actualCostMicrounits?: number;
}>;
export type BudgetMutation = Readonly<{ receipt: BudgetReceipt; claimed: boolean }>;
export interface OperationBudgetStore {
  mutate(
    action: BudgetAction,
    request: BudgetRequest,
    details?: BudgetDetails
  ): Promise<BudgetMutation>;
}
export class OperationBudgetError extends Error {
  constructor(
    public readonly code:
      | "denied"
      | "limit"
      | "conflict"
      | "in_progress"
      | "already_completed"
      | "unknown"
      | "unavailable"
  ) {
    super(
      "A operação não foi autorizada ou concluída com segurança. Consulte seu estado antes de tentar novamente."
    );
    this.name = "OperationBudgetError";
  }
}
const canonicalValue = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonicalValue)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
            .map(([key, item]) => [key, canonicalValue(item)])
        )
      : value;
export const serializeBudgetValue = (value: unknown): string =>
  JSON.stringify(canonicalValue(value));
export const budgetDigest = (value: unknown) =>
  createHash("sha256").update(serializeBudgetValue(value)).digest("hex");
const digestPattern = /^[a-f0-9]{64}$/u;
const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
const amount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000_000;
export const budgetScopeKey = (scope: BudgetScope) =>
  scope.kind === "account" ? `account:${scope.userId}` : `tenant:${scope.condominiumId}`;

export function validateBudgetRequest(request: BudgetRequest): void {
  if (
    !request ||
    !request.scope ||
    !uuidPattern.test(request.scope.userId) ||
    !uuidPattern.test(request.operationId) ||
    !budgetKinds.includes(request.kind) ||
    !digestPattern.test(request.payloadHash) ||
    !digestPattern.test(request.policyRevision) ||
    !amount(request.maximumCostMicrounits) ||
    Object.keys(request).some(
      (key) =>
        ![
          "scope",
          "operationId",
          "kind",
          "payloadHash",
          "policyRevision",
          "maximumCostMicrounits"
        ].includes(key)
    ) ||
    Object.keys(request.scope).some(
      (key) =>
        !(
          request.scope.kind === "account"
            ? ["kind", "userId"]
            : ["kind", "userId", "condominiumId", "membershipRevision"]
        ).includes(key)
    ) ||
    (request.scope.kind === "account"
      ? request.kind !== "setup"
      : request.scope.kind !== "tenant" ||
        !uuidPattern.test(request.scope.condominiumId) ||
        typeof request.scope.membershipRevision !== "string" ||
        !request.scope.membershipRevision.trim() ||
        request.scope.membershipRevision.length > 160)
  )
    throw new OperationBudgetError("denied");
}
export function validateBudgetPolicy(policy: BudgetPolicy): void {
  if (
    !policy ||
    typeof policy.enabled !== "boolean" ||
    !digestPattern.test(policy.revision) ||
    !["BRL", "USD"].includes(policy.currency) ||
    Object.keys(policy).some(
      (key) =>
        ![
          "enabled",
          "revision",
          "currency",
          "scopeDailyCost",
          "globalDailyCost",
          "scopeDailyOperations",
          "globalDailyOperations",
          "scopeConcurrent",
          "globalConcurrent"
        ].includes(key)
    ) ||
    [
      policy.scopeDailyCost,
      policy.globalDailyCost,
      policy.scopeDailyOperations,
      policy.globalDailyOperations,
      policy.scopeConcurrent,
      policy.globalConcurrent
    ].some((value) => !amount(value)) ||
    (policy.enabled &&
      [
        policy.scopeDailyOperations,
        policy.globalDailyOperations,
        policy.scopeConcurrent,
        policy.globalConcurrent
      ].some((value) => value < 1))
  )
    throw new OperationBudgetError("unavailable");
}
export function snapshotBudgetRequest(request: BudgetRequest): BudgetRequest {
  try {
    validateBudgetRequest(request);
    return structuredClone(request);
  } catch {
    throw new OperationBudgetError("denied");
  }
}
export function publicBudgetReceipt(receipt: StoredBudgetReceipt): BudgetReceipt {
  return structuredClone({
    currency: receipt.currency,
    request: receipt.request,
    fingerprint: receipt.fingerprint,
    state: receipt.state,
    day: receipt.day,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    actualCostMicrounits: receipt.actualCostMicrounits,
    outputHash: receipt.outputHash
  });
}
export function validateBudgetReceipt(receipt: BudgetReceipt): void {
  validateBudgetRequest(receipt.request);
  if (
    !["BRL", "USD"].includes(receipt.currency) ||
    receipt.fingerprint !== budgetDigest(receipt.request) ||
    !["reserved", "started", "completed", "cancelled", "unknown"].includes(receipt.state) ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(receipt.day) ||
    Object.keys(receipt).some(
      (key) =>
        ![
          "currency",
          "request",
          "fingerprint",
          "state",
          "day",
          "createdAt",
          "updatedAt",
          "actualCostMicrounits",
          "outputHash",
          "tokenHash"
        ].includes(key)
    ) ||
    new Date(receipt.createdAt).toISOString() !== receipt.createdAt ||
    receipt.day !== receipt.createdAt.slice(0, 10) ||
    new Date(receipt.updatedAt).toISOString() !== receipt.updatedAt ||
    (receipt.actualCostMicrounits !== null &&
      (!amount(receipt.actualCostMicrounits) ||
        receipt.actualCostMicrounits > receipt.request.maximumCostMicrounits)) ||
    (receipt.outputHash !== null && !digestPattern.test(receipt.outputHash)) ||
    (receipt.state === "completed"
      ? receipt.outputHash === null || receipt.actualCostMicrounits === null
      : receipt.outputHash !== null || receipt.actualCostMicrounits !== null)
  )
    throw new OperationBudgetError("unavailable");
}
export function validateBudgetLedger(ledger: BudgetLedger): void {
  validateBudgetPolicy(ledger.policy);
  if (
    !Array.isArray(ledger.receipts) ||
    Object.keys(ledger).some((key) => !["policy", "receipts"].includes(key))
  )
    throw new OperationBudgetError("unavailable");
  const keys = new Set<string>();
  for (const receipt of ledger.receipts) {
    validateBudgetReceipt(receipt);
    if (receipt.currency !== ledger.policy.currency) throw new OperationBudgetError("unavailable");
    const key = `${budgetScopeKey(receipt.request.scope)}:${receipt.request.operationId}`;
    if (
      keys.has(key) ||
      (receipt.state === "reserved" || receipt.state === "cancelled"
        ? receipt.tokenHash !== null
        : typeof receipt.tokenHash !== "string" || !digestPattern.test(receipt.tokenHash))
    )
      throw new OperationBudgetError("unavailable");
    keys.add(key);
  }
}

/** Invoke only within the store's exclusive transaction/lock. Never returns the claim token/hash. */
export function mutateBudgetLedger(
  ledger: BudgetLedger,
  action: BudgetAction,
  request: BudgetRequest,
  details: BudgetDetails,
  now: Date
): BudgetMutation {
  validateBudgetRequest(request);
  if (!["reserve", "start", "complete", "cancel", "unknown"].includes(action))
    throw new OperationBudgetError("denied");
  const timestamp = now.toISOString();
  if (ledger.receipts.some((row) => row.updatedAt > timestamp))
    throw new OperationBudgetError("unavailable");
  const day = timestamp.slice(0, 10);
  const key = budgetScopeKey(request.scope);
  const existing = ledger.receipts.find(
    (row) =>
      budgetScopeKey(row.request.scope) === key && row.request.operationId === request.operationId
  );
  if (existing && existing.fingerprint !== budgetDigest(request))
    throw new OperationBudgetError("conflict");
  const policy = ledger.policy;
  const tokenHash =
    details.token && /^[A-Za-z0-9_-]{43}$/u.test(details.token)
      ? budgetDigest(details.token)
      : undefined;
  if (
    !["complete", "unknown", "cancel"].includes(action) &&
    (!policy.enabled || request.policyRevision !== policy.revision)
  )
    throw new OperationBudgetError("denied");
  let row = existing;
  if (action === "reserve" && !row) {
    const today = ledger.receipts.filter((entry) => entry.day === day);
    const active = ledger.receipts.filter((entry) =>
      ["reserved", "started", "unknown"].includes(entry.state)
    );
    const local = today.filter((entry) => budgetScopeKey(entry.request.scope) === key);
    const sum = (entries: StoredBudgetReceipt[]) =>
      entries.reduce(
        (total, entry) =>
          total + (entry.state === "cancelled" ? 0 : entry.request.maximumCostMicrounits),
        0
      );
    if (
      today.length >= policy.globalDailyOperations ||
      local.length >= policy.scopeDailyOperations ||
      sum(today) + request.maximumCostMicrounits > policy.globalDailyCost ||
      sum(local) + request.maximumCostMicrounits > policy.scopeDailyCost ||
      active.length >= policy.globalConcurrent ||
      active.filter((entry) => budgetScopeKey(entry.request.scope) === key).length >=
        policy.scopeConcurrent
    )
      throw new OperationBudgetError("limit");
    row = {
      currency: policy.currency,
      request: structuredClone(request),
      fingerprint: budgetDigest(request),
      state: "reserved",
      day,
      createdAt: timestamp,
      updatedAt: timestamp,
      actualCostMicrounits: null,
      outputHash: null,
      tokenHash: null
    };
    ledger.receipts.push(row);
  }
  if (!row) throw new OperationBudgetError("denied");
  let claimed = false;
  if (action === "start" && row.state === "reserved") {
    if (row.day !== day || !tokenHash) throw new OperationBudgetError("denied");
    row.state = "started";
    row.tokenHash = tokenHash;
    claimed = true;
  } else if (action === "cancel") {
    if (!["reserved", "cancelled"].includes(row.state)) throw new OperationBudgetError("conflict");
    row.state = "cancelled";
  } else if (action === "complete" || action === "unknown") {
    if (!tokenHash || row.tokenHash !== tokenHash) throw new OperationBudgetError("denied");
    if (action === "unknown") {
      if (row.state !== "started" && row.state !== "unknown")
        throw new OperationBudgetError("conflict");
      row.state = "unknown";
    } else {
      if (
        !details.outputHash ||
        !digestPattern.test(details.outputHash) ||
        !amount(details.actualCostMicrounits) ||
        details.actualCostMicrounits > row.request.maximumCostMicrounits
      )
        throw new OperationBudgetError("conflict");
      if (row.state === "completed") {
        if (
          row.outputHash !== details.outputHash ||
          row.actualCostMicrounits !== details.actualCostMicrounits
        )
          throw new OperationBudgetError("conflict");
      } else {
        if (row.state !== "started") throw new OperationBudgetError("conflict");
        row.state = "completed";
        row.outputHash = details.outputHash;
        row.actualCostMicrounits = details.actualCostMicrounits;
      }
    }
  }
  row.updatedAt = timestamp;
  return { receipt: publicBudgetReceipt(row), claimed };
}

export function createBudgetedOperationRunner(options: {
  store: OperationBudgetStore;
  authorize?: (request: BudgetRequest) => Promise<boolean>;
}) {
  const authorize = options.authorize ?? (async () => false);
  return {
    async execute<T>(
      request: BudgetRequest,
      operation: () => Promise<{ value: T; outputHash: string; actualCostMicrounits: number }>
    ): Promise<T> {
      const frozen = snapshotBudgetRequest(request);
      let token: string | undefined;
      let started = false;
      const permit = async () => {
        if (!(await authorize(structuredClone(frozen)))) throw new OperationBudgetError("denied");
      };
      try {
        validateBudgetRequest(frozen);
        await permit();
        const reserved = await options.store.mutate("reserve", frozen);
        if (reserved.receipt.state !== "reserved")
          throw new OperationBudgetError(
            reserved.receipt.state === "completed"
              ? "already_completed"
              : reserved.receipt.state === "unknown"
                ? "unknown"
                : "in_progress"
          );
        await permit();
        token = randomBytes(32).toString("base64url");
        const claimed = await options.store.mutate("start", frozen, { token });
        if (!claimed.claimed) throw new OperationBudgetError("in_progress");
        started = true;
        const result = await operation();
        await options.store.mutate("complete", frozen, {
          token,
          outputHash: result.outputHash,
          actualCostMicrounits: result.actualCostMicrounits
        });
        started = false;
        await permit();
        return result.value;
      } catch (error) {
        if (started && token)
          await options.store.mutate("unknown", frozen, { token }).catch(() => undefined);
        if (error instanceof OperationBudgetError) throw error;
        throw new OperationBudgetError("unavailable");
      }
    }
  };
}
