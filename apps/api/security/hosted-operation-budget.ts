import {
  HostedDocumentExecutionError,
  hostedDocumentRequestHash,
  denyHostedDocumentTransfer,
  type HostedDocumentCallControl,
  type HostedDocumentOperationBudget,
  type HostedDocumentTransferAuthorizer,
  type HostedDocumentTransferRequest
} from "../documents/hosted-document-execution.js";
import {
  budgetDigest,
  createBudgetedOperationRunner,
  OperationBudgetError,
  type BudgetScope,
  type OperationBudgetStore
} from "./operation-budget.js";
import type { HostedCallBudget, HostedCallLedger } from "../documents/hosted-call-ledger.js";

type TenantBudgetScope = Extract<BudgetScope, { kind: "tenant" }>;
type HostedBudgetOptions = {
  store: OperationBudgetStore;
  resolveScope: (request: HostedDocumentTransferRequest) => Promise<TenantBudgetScope>;
  authorize?: HostedDocumentTransferAuthorizer;
};
const scopeMatches = (request: HostedDocumentTransferRequest, value: TenantBudgetScope) =>
  value.kind === "tenant" &&
  value.condominiumId === request.condominiumId &&
  (request.userId === undefined || request.userId === value.userId) &&
  (request.membershipRevision === undefined ||
    request.membershipRevision === value.membershipRevision);

export function hostedOperationId(condominiumId: string, requestHash: string): string {
  const id = budgetDigest(["hosted-operation-v1", condominiumId, requestHash]).slice(0, 32);
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

/** Bind this pair together so replay also revalidates the current private scope, without consuming quota. */
export function createBudgetedHostedDocumentControls(
  options: HostedBudgetOptions & {
    ledger: HostedCallLedger;
    budget: (request: HostedDocumentTransferRequest) => HostedCallBudget;
  }
): { authorize: HostedDocumentTransferAuthorizer; callControl: HostedDocumentCallControl } {
  const originalAuthorize = options.authorize ?? denyHostedDocumentTransfer;
  const authorize: HostedDocumentTransferAuthorizer = async (request) => {
    try {
      if (!scopeMatches(request, await options.resolveScope(request))) return { allowed: false };
      return await originalAuthorize(request);
    } catch {
      return { allowed: false };
    }
  };
  return {
    authorize,
    callControl: {
      ledger: options.ledger,
      budget: options.budget,
      operationBudget: createHostedOperationBudget({ ...options, authorize })
    }
  };
}

/** Inject only trusted server resolvers; policy/quotas are never taken from the HTTP payload. */
export function createHostedOperationBudget(
  options: HostedBudgetOptions
): HostedDocumentOperationBudget {
  const authorize = options.authorize ?? denyHostedDocumentTransfer;
  return {
    async execute(request, policyRevision, maximumCostMicrounits, operation) {
      try {
        const requestHash = hostedDocumentRequestHash(request);
        const scope = structuredClone(await options.resolveScope(request));
        const matches = (value: TenantBudgetScope) => scopeMatches(request, value);
        if (!matches(scope)) throw new OperationBudgetError("denied");
        // Do not include policy in the logical ID: a new revision must not escape an old claim.
        const operationId = hostedOperationId(request.condominiumId, requestHash);
        const runner = createBudgetedOperationRunner({
          store: {
            mutate: async (...args) => {
              const result = await options.store.mutate(...args);
              if (result.receipt.currency !== "USD") throw new OperationBudgetError("unavailable");
              return result;
            }
          },
          authorize: async () => {
            const currentScope = await options.resolveScope(request);
            const decision = await authorize(request);
            return (
              matches(currentScope) &&
              budgetDigest(currentScope) === budgetDigest(scope) &&
              decision.allowed &&
              decision.requestHash === requestHash &&
              decision.policyRevision === policyRevision
            );
          }
        });
        return await runner.execute(
          {
            scope,
            operationId,
            kind: request.purpose === "document_embedding" ? "embedding" : request.purpose,
            payloadHash: requestHash,
            policyRevision: budgetDigest(policyRevision),
            maximumCostMicrounits
          },
          async () => {
            const value = await operation();
            // Conservative accounted upper bound, not measured provider billing. Never refund here.
            return {
              value,
              outputHash: budgetDigest(value),
              actualCostMicrounits: maximumCostMicrounits
            };
          }
        );
      } catch (error) {
        if (error instanceof OperationBudgetError) {
          const code =
            error.code === "denied"
              ? "transfer_denied"
              : error.code === "limit"
                ? "budget_exceeded"
                : error.code === "in_progress"
                  ? "call_in_progress"
                  : ["unknown", "already_completed", "conflict"].includes(error.code)
                    ? "call_uncertain"
                    : "ledger_unavailable";
          throw new HostedDocumentExecutionError(code);
        }
        if (error instanceof HostedDocumentExecutionError) throw error;
        throw new HostedDocumentExecutionError("execution_failed");
      }
    }
  };
}
