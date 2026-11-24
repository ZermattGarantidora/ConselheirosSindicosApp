import { appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import {
  budgetDigest,
  createBudgetedOperationRunner,
  OperationBudgetError,
  type BudgetPolicy,
  type BudgetRequest
} from "../../apps/api/security/operation-budget.js";

try {
  const [directory, serializedRequest, serializedPolicy] = process.argv.slice(2);
  if (
    process.env.BUDGET_TEST_CONFIRMATION !== "synthetic-only" ||
    !directory ||
    !serializedRequest ||
    !serializedPolicy ||
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-budget-synthetic-")
  )
    throw new Error();
  const store = createLocalOperationBudgetStore({
    directory,
    confirmation: "synthetic-only",
    policy: JSON.parse(serializedPolicy) as BudgetPolicy,
    now: () => new Date("2026-11-09T12:00:00Z")
  });
  const runner = createBudgetedOperationRunner({ store, authorize: async () => true });
  await runner.execute(JSON.parse(serializedRequest) as BudgetRequest, async () => {
    await appendFile(join(directory, "dispatch-count.txt"), "synthetic-dispatch\n", {
      mode: 0o600
    });
    return { value: "synthetic", outputHash: budgetDigest("synthetic"), actualCostMicrounits: 0 };
  });
  process.stdout.write(JSON.stringify({ completed: true }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      completed: false,
      code: error instanceof OperationBudgetError ? error.code : "unavailable"
    })
  );
}
