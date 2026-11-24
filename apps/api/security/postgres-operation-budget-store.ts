import type { Pool } from "pg";
import {
  OperationBudgetError,
  budgetDigest,
  serializeBudgetValue,
  snapshotBudgetRequest,
  validateBudgetReceipt,
  type BudgetMutation,
  type OperationBudgetStore
} from "./operation-budget.js";

export function createPostgresOperationBudgetStore(
  pool: Pick<Pool, "connect">,
  role: "app_runtime" | "app_worker" = "app_runtime"
): OperationBudgetStore {
  if (role !== "app_runtime" && role !== "app_worker") throw new OperationBudgetError("denied");
  return {
    async mutate(action, request, details = {}) {
      request = snapshotBudgetRequest(request);
      details = { ...details };
      const client = await pool.connect().catch(() => {
        throw new OperationBudgetError("unavailable");
      });
      try {
        await client.query("BEGIN");
        await client.query(
          role === "app_runtime" ? "SET LOCAL ROLE app_runtime" : "SET LOCAL ROLE app_worker"
        );
        await client.query("SET LOCAL statement_timeout = '5s'");
        await client.query(
          "SELECT set_config('app.user_id',$1,true), set_config('app.condominium_id',$2,true)",
          [request.scope.userId, request.scope.kind === "tenant" ? request.scope.condominiumId : ""]
        );
        if (details.token !== undefined && !/^[A-Za-z0-9_-]{43}$/u.test(details.token))
          throw new OperationBudgetError("denied");
        const result = await client.query<{ result: BudgetMutation }>(
          "SELECT app.mutate_operation_budget($1,$2,$3,$4,$5) AS result",
          [
            action,
            serializeBudgetValue(request),
            details.token === undefined ? null : budgetDigest(details.token),
            details.outputHash ?? null,
            details.actualCostMicrounits ?? null
          ]
        );
        const value = result.rows[0]?.result;
        if (
          result.rows.length !== 1 ||
          !value ||
          Object.keys(value).some((key) => !["receipt", "claimed"].includes(key)) ||
          typeof value.claimed !== "boolean" ||
          value.receipt?.fingerprint !== budgetDigest(request)
        )
          throw new OperationBudgetError("unavailable");
        try {
          validateBudgetReceipt(value.receipt);
        } catch {
          throw new OperationBudgetError("unavailable");
        }
        if (
          "tokenHash" in value.receipt ||
          (value.claimed && (action !== "start" || value.receipt.state !== "started"))
        )
          throw new OperationBudgetError("unavailable");
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        if (error instanceof OperationBudgetError) throw error;
        const code =
          error && typeof error === "object" && "message" in error ? error.message : undefined;
        if (["budget_denied", "budget_limit", "budget_conflict"].includes(String(code)))
          throw new OperationBudgetError(String(code).slice(7) as "denied" | "limit" | "conflict");
        throw new OperationBudgetError("unavailable");
      } finally {
        client.release();
      }
    }
  };
}
