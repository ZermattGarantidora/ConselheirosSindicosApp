import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  OperationBudgetError,
  mutateBudgetLedger,
  snapshotBudgetRequest,
  validateBudgetLedger,
  validateBudgetPolicy,
  type BudgetLedger,
  type BudgetMutation,
  type BudgetPolicy,
  type OperationBudgetStore
} from "./operation-budget.js";

const deniedPolicy: BudgetPolicy = Object.freeze({
  enabled: false,
  revision: "0".repeat(64),
  currency: "BRL",
  scopeDailyCost: 0,
  globalDailyCost: 0,
  scopeDailyOperations: 0,
  globalDailyOperations: 0,
  scopeConcurrent: 0,
  globalConcurrent: 0
});
const errorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error ? error.code : undefined;

/** Synthetic only; processes must share a private volume. Never selected as a PostgreSQL fallback. */
export function createLocalOperationBudgetStore(options: {
  directory: string;
  confirmation: "synthetic-only";
  policy?: BudgetPolicy;
  now?: () => Date;
  requireExisting?: boolean;
}): OperationBudgetStore {
  if (options.confirmation !== "synthetic-only") throw new OperationBudgetError("denied");
  const policy = structuredClone(options.policy ?? deniedPolicy);
  validateBudgetPolicy(policy);
  const now = options.now ?? (() => new Date());
  const file = join(options.directory, "operation-budgets.json");
  return {
    async mutate(action, request, details = {}) {
      request = snapshotBudgetRequest(request);
      details = { ...details };
      let lock: Awaited<ReturnType<typeof open>> | undefined;
      let ownsLock = false;
      let result: BudgetMutation | undefined;
      let failure: unknown;
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await mkdir(options.directory, { recursive: true, mode: 0o700 });
        for (let attempt = 0; attempt < 100; attempt++) {
          try {
            lock = await open(`${file}.lock`, "wx", 0o600);
            ownsLock = true;
            break;
          } catch (error) {
            if (!["EEXIST", "EPERM", "EACCES"].includes(String(errorCode(error)))) throw error;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
        if (!ownsLock) throw new OperationBudgetError("unavailable");
        let ledger: BudgetLedger;
        try {
          const raw = await readFile(file, "utf8");
          if (raw.length > 16_000_000) throw new Error();
          ledger = JSON.parse(raw) as BudgetLedger;
          validateBudgetLedger(ledger);
          if (
            Object.entries(policy).some(
              ([key, value]) => ledger.policy[key as keyof BudgetPolicy] !== value
            )
          )
            throw new Error();
        } catch (error) {
          if (errorCode(error) === "ENOENT" && !options.requireExisting)
            ledger = { policy, receipts: [] };
          else throw new OperationBudgetError("unavailable");
        }
        result = mutateBudgetLedger(ledger, action, request, details, now());
        validateBudgetLedger(ledger);
        await writeFile(temporary, JSON.stringify(ledger), {
          flag: "wx",
          mode: 0o600,
          flush: true
        });
        await rename(temporary, file);
      } catch (error) {
        failure = error;
      } finally {
        await rm(temporary, { force: true }).catch(() => undefined);
        if (ownsLock) {
          try {
            await lock!.close();
            await rm(`${file}.lock`);
          } catch {
            failure = new OperationBudgetError("unavailable");
          }
        }
      }
      if (failure instanceof OperationBudgetError) throw failure;
      if (failure || !result) throw new OperationBudgetError("unavailable");
      return result;
    }
  };
}
