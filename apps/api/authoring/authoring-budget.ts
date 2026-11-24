import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createLocalOperationBudgetStore } from "../security/local-operation-budget-store.js";
import { validateBudgetPolicy, type BudgetPolicy } from "../security/operation-budget.js";
/** Provisionamento explícito, fora do dump; perda do cofre não cria cota vazia. */
export function createSyntheticAuthoringBudget(options: {
  directory: string;
  confirmation: "synthetic-local-only";
  policy: BudgetPolicy;
  now: () => Date;
}) {
  if (options.confirmation !== "synthetic-local-only")
    throw new Error("Cofre sintético exige confirmação.");
  const policy = structuredClone(options.policy);
  validateBudgetPolicy(policy);
  return {
    store: createLocalOperationBudgetStore({
      directory: options.directory,
      confirmation: "synthetic-only",
      policy,
      now: options.now,
      requireExisting: true
    }),
    async initialize() {
      await mkdir(options.directory, { recursive: true, mode: 0o700 });
      await writeFile(
        join(options.directory, "operation-budgets.json"),
        JSON.stringify({ policy, receipts: [] }),
        { flag: "wx", mode: 0o600, flush: true }
      );
    }
  };
}
