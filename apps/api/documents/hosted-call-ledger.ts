import { createHash, randomUUID } from "node:crypto";

export type HostedCallBudget = Readonly<{
  currency: "USD";
  tariffVersion: string;
  maximumCostMicrounits: number;
  tenantDailyLimitMicrounits: number;
  globalDailyLimitMicrounits: number;
}>;
export type HostedCallKey = Readonly<{
  condominiumId: string;
  requestHash: string;
  policyRevision: string;
  documentVersionIds?: readonly string[];
}>;
export type HostedCallRecord = Omit<HostedCallKey, "policyRevision"> & {
  // Legacy receipts remain readable only to refuse reuse, never to infer an authorization.
  policyRevision?: string;
  owner: string;
  status: "reserved" | "dispatched" | "completed" | "uncertain" | "cancelled" | "invalidated";
  documentVersionIds: readonly string[];
  period: string;
  currency: "USD";
  tariffVersion: string;
  commitment: number;
  leaseUntil: number;
  resultJson?: string;
  resultSha256?: string;
};
export type HostedCallLedgerState = {
  version: 1;
  lastSeenAt: number;
  calls: HostedCallRecord[];
  daily: Array<{ period: string; committed: number }>;
};
export type HostedCallReservation =
  | Readonly<{ status: "reserved"; owner: string }>
  | Readonly<{ status: "completed"; value: unknown }>;
export interface HostedCallLedger {
  reserve(key: HostedCallKey, budget: HostedCallBudget): Promise<HostedCallReservation>;
  dispatch(key: HostedCallKey, owner: string): Promise<void>;
  complete(key: HostedCallKey, owner: string, value: unknown): Promise<void>;
  uncertain(key: HostedCallKey, owner: string): Promise<void>;
  cancel(key: HostedCallKey, owner: string): Promise<void>;
  invalidateDocumentVersion(condominiumId: string, documentVersionId: string): Promise<number>;
}
export class HostedCallLedgerError extends Error {
  constructor(
    public readonly code:
      | "budget_exceeded"
      | "call_in_progress"
      | "call_uncertain"
      | "call_invalidated"
      | "call_policy_conflict"
      | "ledger_unavailable"
  ) {
    super("O controle durável de chamadas não permitiu continuar.");
    this.name = "HostedCallLedgerError";
  }
}
export const hostedCallResultHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const positive = (value: number) =>
  Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000_000;
const hashPattern = /^[a-f0-9]{64}$/u;
const periodPattern = /^\d{4}-\d{2}-\d{2}$/u;
export function validateHostedCallState(value: unknown): asserts value is HostedCallLedgerState {
  const state = value as HostedCallLedgerState | null;
  if (
    !state ||
    state.version !== 1 ||
    !Number.isSafeInteger(state.lastSeenAt) ||
    state.lastSeenAt < 0 ||
    !Array.isArray(state.calls) ||
    state.calls.length > 10_000 ||
    !Array.isArray(state.daily) ||
    state.daily.length > 10_000 ||
    new Set(state.daily.map((row) => row?.period)).size !== state.daily.length ||
    state.daily.some(
      (row) =>
        !row ||
        !periodPattern.test(row.period) ||
        !Number.isSafeInteger(row.committed) ||
        row.committed < 0
    ) ||
    new Set(state.calls.map((row) => JSON.stringify([row?.condominiumId, row?.requestHash])))
      .size !== state.calls.length ||
    state.calls.some(
      (row) =>
        !row ||
        typeof row.condominiumId !== "string" ||
        !row.condominiumId ||
        !hashPattern.test(row.requestHash) ||
        (row.policyRevision !== undefined &&
          (typeof row.policyRevision !== "string" ||
            !row.policyRevision.trim() ||
            row.policyRevision.length > 160)) ||
        !/^[a-f0-9-]{36}$/u.test(row.owner) ||
        !periodPattern.test(row.period) ||
        row.currency !== "USD" ||
        typeof row.tariffVersion !== "string" ||
        !row.tariffVersion ||
        !(positive(row.commitment) || (row.status === "invalidated" && row.commitment === 0)) ||
        !Number.isSafeInteger(row.leaseUntil) ||
        row.leaseUntil < 0 ||
        !Array.isArray(row.documentVersionIds) ||
        row.documentVersionIds.length > 50 ||
        row.documentVersionIds.some((id) => typeof id !== "string" || !id || id.length > 200) ||
        !["reserved", "dispatched", "completed", "uncertain", "cancelled", "invalidated"].includes(
          row.status
        ) ||
        (row.status !== "completed" &&
          (row.resultJson !== undefined || row.resultSha256 !== undefined)) ||
        (row.status === "completed" &&
          (typeof row.resultJson !== "string" ||
            Buffer.byteLength(row.resultJson) > 1_000_000 ||
            hostedCallResultHash(row.resultJson) !== row.resultSha256))
    )
  )
    throw new HostedCallLedgerError("ledger_unavailable");
  for (const row of state.calls)
    if (row.status === "completed") {
      try {
        JSON.parse(row.resultJson!);
      } catch {
        throw new HostedCallLedgerError("ledger_unavailable");
      }
    }
  // Contador global pode incluir outros tenants no adaptador PostgreSQL; nunca pode ser menor.
  for (const row of state.daily) {
    const minimum = state.calls
      .filter((call) => call.period === row.period && call.status !== "cancelled")
      .reduce((sum, call) => sum + call.commitment, 0);
    if (!Number.isSafeInteger(minimum) || row.committed < minimum)
      throw new HostedCallLedgerError("ledger_unavailable");
  }
  if (state.calls.some((call) => !state.daily.some((row) => row.period === call.period)))
    throw new HostedCallLedgerError("ledger_unavailable");
}

export type HostedCallLedgerTransaction = <T>(
  key: HostedCallKey,
  change: (state: HostedCallLedgerState, time: number) => T
) => Promise<T>;

/** As transações do backend serializam compromisso global, tenant e recibo juntos. */
export function createTransactionalHostedCallLedger(
  transact: HostedCallLedgerTransaction
): HostedCallLedger {
  const checked = async <T>(
    key: HostedCallKey,
    change: (state: HostedCallLedgerState, time: number) => T
  ) => {
    try {
      if (
        !key.condominiumId.trim() ||
        key.condominiumId.length > 200 ||
        typeof key.policyRevision !== "string" ||
        !key.policyRevision.trim() ||
        key.policyRevision.length > 160 ||
        !hashPattern.test(key.requestHash)
      )
        throw new Error();
      return await transact(key, (state, time) => {
        validateHostedCallState(state);
        if (
          key.documentVersionIds !== undefined &&
          (!Array.isArray(key.documentVersionIds) ||
            key.documentVersionIds.length > 50 ||
            key.documentVersionIds.some((id) => typeof id !== "string" || !id || id.length > 200))
        )
          throw new Error();
        if (!Number.isSafeInteger(time) || time < state.lastSeenAt) throw new Error();
        state.lastSeenAt = time;
        return change(state, time);
      });
    } catch (error) {
      if (error instanceof HostedCallLedgerError) throw error;
      throw new HostedCallLedgerError("ledger_unavailable");
    }
  };
  const find = (state: HostedCallLedgerState, key: HostedCallKey, owner: string) => {
    const row = state.calls.find(
      (item) =>
        item.condominiumId === key.condominiumId &&
        item.requestHash === key.requestHash &&
        item.owner === owner
    );
    if (!row) throw new HostedCallLedgerError("ledger_unavailable");
    if (row.policyRevision !== key.policyRevision)
      throw new HostedCallLedgerError("call_policy_conflict");
    return row;
  };
  return {
    reserve: (key, budget) =>
      checked(key, (state, time) => {
        if (
          budget.currency !== "USD" ||
          !budget.tariffVersion.trim() ||
          budget.tariffVersion.length > 100 ||
          !positive(budget.maximumCostMicrounits) ||
          !positive(budget.tenantDailyLimitMicrounits) ||
          !positive(budget.globalDailyLimitMicrounits)
        )
          throw new Error();
        const previous = state.calls.find(
          (row) => row.condominiumId === key.condominiumId && row.requestHash === key.requestHash
        );
        if (previous && previous.policyRevision !== key.policyRevision)
          throw new HostedCallLedgerError("call_policy_conflict");
        if (previous && previous.status !== "cancelled") {
          if (previous.status === "invalidated")
            throw new HostedCallLedgerError("call_invalidated");
          if (previous.status === "completed")
            return {
              status: "completed" as const,
              value: JSON.parse(previous.resultJson!) as unknown
            };
          if (
            previous.status === "uncertain" ||
            (previous.status === "dispatched" && previous.leaseUntil <= time)
          )
            throw new HostedCallLedgerError("call_uncertain");
          if (previous.leaseUntil > time || previous.status === "dispatched")
            throw new HostedCallLedgerError("call_in_progress");
          // Sem envio, a retomada faz nova reserva no dia/tarifa atuais, sem burlar o teto diário.
          state.daily.find((row) => row.period === previous.period)!.committed -=
            previous.commitment;
          previous.status = "cancelled";
        }
        const period = new Date(time).toISOString().slice(0, 10);
        let daily = state.daily.find((row) => row.period === period);
        const tenantCommitted = state.calls
          .filter(
            (row) =>
              row.condominiumId === key.condominiumId &&
              row.period === period &&
              row.status !== "cancelled"
          )
          .reduce((sum, row) => sum + row.commitment, 0);
        if (
          tenantCommitted + budget.maximumCostMicrounits > budget.tenantDailyLimitMicrounits ||
          (daily?.committed ?? 0) + budget.maximumCostMicrounits > budget.globalDailyLimitMicrounits
        )
          throw new HostedCallLedgerError("budget_exceeded");
        if (state.calls.length >= 10_000 || state.daily.length >= 10_000) throw new Error();
        if (!daily) {
          daily = { period, committed: 0 };
          state.daily.push(daily);
        }
        daily.committed += budget.maximumCostMicrounits;
        const record: HostedCallRecord = {
          ...key,
          documentVersionIds: [...(key.documentVersionIds ?? [])],
          owner: randomUUID(),
          status: "reserved",
          period,
          currency: "USD",
          tariffVersion: budget.tariffVersion,
          commitment: budget.maximumCostMicrounits,
          leaseUntil: time + 120_000
        };
        if (previous) Object.assign(previous, record);
        else state.calls.push(record);
        return { status: "reserved" as const, owner: record.owner };
      }),
    dispatch: (key, owner) =>
      checked(key, (state, time) => {
        const row = find(state, key, owner);
        if (row.status !== "reserved" || row.leaseUntil <= time) throw new Error();
        row.status = "dispatched";
        row.leaseUntil = time + 120_000;
      }),
    complete: (key, owner, value) =>
      checked(key, (state) => {
        const row = find(state, key, owner);
        if (row.status !== "dispatched" && row.status !== "uncertain") throw new Error();
        const resultJson = JSON.stringify(value);
        if (typeof resultJson !== "string" || Buffer.byteLength(resultJson) > 1_000_000)
          throw new Error();
        row.resultJson = resultJson;
        row.resultSha256 = hostedCallResultHash(resultJson);
        row.status = "completed";
      }),
    uncertain: (key, owner) =>
      checked(key, (state) => {
        const row = find(state, key, owner);
        if (row.status === "dispatched") row.status = "uncertain";
      }),
    cancel: (key, owner) =>
      checked(key, (state) => {
        const row = find(state, key, owner);
        if (row.status !== "reserved") throw new Error();
        const daily = state.daily.find((item) => item.period === row.period)!;
        daily.committed -= row.commitment;
        row.status = "cancelled";
      }),
    invalidateDocumentVersion: (condominiumId, documentVersionId) =>
      checked(
        { condominiumId, requestHash: "0".repeat(64), policyRevision: "invalidation-only" },
        (state) => {
          if (!documentVersionId || documentVersionId.length > 200) throw new Error();
          let affected = 0;
          for (const row of state.calls)
            if (
              row.condominiumId === condominiumId &&
              row.documentVersionIds.includes(documentVersionId) &&
              row.status !== "invalidated"
            ) {
              // Uma reserva cancelada já liberou o valor: conservar somente compromisso zero.
              if (row.status === "cancelled") row.commitment = 0;
              delete row.resultJson;
              delete row.resultSha256;
              row.status = "invalidated";
              affected++;
            }
          return affected;
        }
      )
  };
}
