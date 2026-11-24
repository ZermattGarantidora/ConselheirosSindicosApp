import {
  budgetDigest,
  createBudgetedOperationRunner,
  OperationBudgetError,
  type BudgetRequest,
  type BudgetScope,
  type OperationBudgetStore
} from "../security/operation-budget.js";

export type ApiOperation = Readonly<{
  scope: BudgetScope;
  kind: "setup" | "question" | "upload";
  requestKey: string;
  payload: unknown;
  revalidate: () => Promise<boolean>;
}>;
export interface ApiOperationControl {
  execute<T>(input: ApiOperation, operation: () => Promise<T>): Promise<T>;
  replayProof?(input: ApiOperation): BudgetRequest;
  authorizeReplay?(proof: BudgetRequest, revalidate: () => Promise<boolean>): Promise<boolean>;
}

/** No policy, limit, scope or price can come from the HTTP request. */
export function createApiOperationControl(
  options: Readonly<{
    store: OperationBudgetStore;
    policyRevision: string;
    maximumCostMicrounits: Readonly<Record<ApiOperation["kind"], number>>;
    authorize?: (request: BudgetRequest) => Promise<boolean>;
  }>
): ApiOperationControl {
  const revision = options.policyRevision;
  const costs = Object.freeze({ ...options.maximumCostMicrounits });
  const replayProof = (input: ApiOperation): BudgetRequest => {
    if (!input.requestKey.trim() || input.requestKey.length > 200)
      throw new OperationBudgetError("denied");
    const scope = structuredClone(input.scope);
    // A changed payload or policy must conflict with the same logical attempt, not get a new claim.
    const id = budgetDigest([
      "api-operation-v1",
      scope.userId,
      scope.kind === "tenant" ? scope.condominiumId : "account",
      input.kind,
      input.requestKey
    ]).slice(0, 32);
    const operationId = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    const request: BudgetRequest = {
      scope,
      operationId,
      kind: input.kind,
      payloadHash: budgetDigest(input.payload),
      policyRevision: revision,
      maximumCostMicrounits: costs[input.kind]
    };
    return request;
  };
  return Object.freeze({
    replayProof,
    async authorizeReplay(proof: BudgetRequest, revalidate: () => Promise<boolean>) {
      try {
        return (
          proof.policyRevision === revision &&
          proof.maximumCostMicrounits === costs[proof.kind as ApiOperation["kind"]] &&
          (await revalidate()) &&
          (await (options.authorize?.(structuredClone(proof)) ?? false))
        );
      } catch {
        return false;
      }
    },
    async execute<T>(input: ApiOperation, operation: () => Promise<T>): Promise<T> {
      const request = replayProof(input);
      const runner = createBudgetedOperationRunner({
        store: options.store,
        authorize: async (candidate) =>
          (await input.revalidate()) && (await (options.authorize?.(candidate) ?? false))
      });
      return runner.execute(request, async () => {
        const value = await operation();
        return {
          value,
          outputHash: budgetDigest(value),
          actualCostMicrounits: request.maximumCostMicrounits
        };
      });
    }
  });
}

/** Persistent startup stays closed until there is a reviewed policy and explicit wiring. */
export const deniedApiOperationControl: ApiOperationControl = Object.freeze({
  async execute() {
    throw new OperationBudgetError("denied");
  }
});
