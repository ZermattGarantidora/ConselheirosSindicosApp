import { createHash } from "node:crypto";
import {
  HostedCallLedgerError,
  type HostedCallLedger,
  type HostedCallBudget
} from "./hosted-call-ledger.js";

export const hostedDocumentDestination = "https://api.openai.com/v1/responses";
export const hostedDocumentEmbeddingsDestination = "https://api.openai.com/v1/embeddings";

export type HostedDocumentTransferRequest = Readonly<{
  purpose: "pdf_ocr" | "photo_ocr" | "photo_analysis" | "document_embedding" | "batch_synthesis";
  destination: typeof hostedDocumentDestination | typeof hostedDocumentEmbeddingsDestination;
  model: string;
  condominiumId: string;
  documentVersions: readonly Readonly<{
    id: string;
    contentKind: "original" | "evidence_bundle";
    contentSha256: string;
  }>[];
  userId?: string;
  chatId?: string;
  membershipRevision?: string;
  payloadSha256: string;
  inputBytes: number;
  pageCount: number;
  maximumOutputTokens: number;
  processorVersion?: string;
}>;

export type HostedDocumentTransferAuthorizer = (
  request: HostedDocumentTransferRequest
) => Promise<
  | Readonly<{ allowed: false }>
  | Readonly<{ allowed: true; requestHash: string; policyRevision: string }>
>;

export const denyHostedDocumentTransfer: HostedDocumentTransferAuthorizer = async () => ({
  allowed: false
});

export function hostedDocumentRequestHash(request: HostedDocumentTransferRequest): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

export class HostedDocumentExecutionError extends Error {
  constructor(
    public readonly code:
      "transfer_denied" | "execution_limit" | "execution_failed" | HostedCallLedgerError["code"]
  ) {
    super("O processamento documental hospedado não foi autorizado ou concluído.");
    this.name = "HostedDocumentExecutionError";
  }
}

export type HostedDocumentCallControl = Readonly<{
  ledger: HostedCallLedger;
  budget: (request: HostedDocumentTransferRequest) => HostedCallBudget;
  operationBudget?: HostedDocumentOperationBudget;
}>;

export interface HostedDocumentOperationBudget {
  execute<T>(
    request: HostedDocumentTransferRequest,
    policyRevision: string,
    maximumCostMicrounits: number,
    operation: () => Promise<T>
  ): Promise<T>;
}

function validCallControl(value: unknown): value is HostedDocumentCallControl {
  if (!value || typeof value !== "object") return false;
  const control = value as Partial<HostedDocumentCallControl>;
  return (
    typeof control.budget === "function" &&
    !!control.ledger &&
    (
      [
        "reserve",
        "dispatch",
        "complete",
        "uncertain",
        "cancel",
        "invalidateDocumentVersion"
      ] as const
    ).every((method) => typeof control.ledger![method] === "function")
  );
}

export function hostedDocumentTransportConfigured(
  options: Readonly<{
    callControl?: HostedDocumentCallControl;
    syntheticContractOnly?: boolean;
    fetch?: typeof globalThis.fetch;
  }>
): boolean {
  if (options.callControl !== undefined) return validCallControl(options.callControl);
  return (
    options.syntheticContractOnly === true &&
    options.fetch !== undefined &&
    ![process.env.NODE_ENV, process.env.APP_ENV].some(
      (value) => value?.trim().toLowerCase() === "production"
    )
  );
}

export interface HostedDocumentExecutor {
  execute<T>(
    request: HostedDocumentTransferRequest,
    operation: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal
  ): Promise<T>;
}

/** Cache/fila privados por instância. Não é recibo durável nem autorização de produção. */
export function createHostedDocumentExecutor(
  options: Readonly<{
    authorize?: HostedDocumentTransferAuthorizer;
    now?: () => number;
    callControl?: HostedDocumentCallControl;
  }> = {}
): HostedDocumentExecutor {
  const authorize = options.authorize ?? denyHostedDocumentTransfer;
  const now = options.now ?? Date.now;
  const callControl = options.callControl;
  if (callControl !== undefined && !validCallControl(callControl))
    throw new HostedCallLedgerError("ledger_unavailable");
  const inFlight = new Map<string, Promise<unknown>>();
  const completed = new Map<string, { expiresAt: number; value: unknown }>();
  const waiters: Array<{ start: () => void; cancel: () => void }> = [];
  let active = false;

  const permit = async (request: HostedDocumentTransferRequest, revision?: string) => {
    try {
      const decision = await authorize(request);
      if (
        decision.allowed &&
        decision.requestHash === hostedDocumentRequestHash(request) &&
        decision.policyRevision.trim().length > 0 &&
        (revision === undefined || revision === decision.policyRevision)
      )
        return decision.policyRevision;
    } catch {
      // Não propagar detalhes do autorizador nem uma causa que possa conter dados privados.
    }
    throw new HostedDocumentExecutionError("transfer_denied");
  };

  const release = () => {
    const next = waiters.shift();
    if (next) next.start();
    else active = false;
  };
  const acquire = async (signal: AbortSignal) => {
    signal.throwIfAborted();
    if (!active) {
      active = true;
      return;
    }
    if (waiters.length >= 4) throw new HostedDocumentExecutionError("execution_limit");
    await new Promise<void>((resolve, reject) => {
      const waiter = {
        start: () => {
          signal.removeEventListener("abort", waiter.cancel);
          resolve();
        },
        cancel: () => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new HostedDocumentExecutionError("execution_failed"));
        }
      };
      waiters.push(waiter);
      signal.addEventListener("abort", waiter.cancel, { once: true });
    });
  };

  const executeDurably = async <T>(
    request: HostedDocumentTransferRequest,
    operation: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal,
    revision: string
  ): Promise<T> => {
    if (!callControl) return operation(signal);
    const key = {
      condominiumId: request.condominiumId,
      requestHash: hostedDocumentRequestHash(request),
      policyRevision: revision,
      documentVersionIds: request.documentVersions.map((version) => version.id)
    };
    const budget = callControl.budget(request);
    const reservation = await callControl.ledger.reserve(key, budget);
    if (reservation.status === "completed") return reservation.value as T;
    let dispatched = false;
    try {
      const executeReserved = async () => {
        await permit(request, revision);
        signal.throwIfAborted();
        await callControl.ledger.dispatch(key, reservation.owner);
        dispatched = true;
        signal.throwIfAborted();
        const value = await operation(signal);
        signal.throwIfAborted();
        await permit(request, revision);
        await callControl.ledger.complete(key, reservation.owner, value);
        return value;
      };
      return callControl.operationBudget
        ? await callControl.operationBudget.execute(
            request,
            revision,
            budget.maximumCostMicrounits,
            executeReserved
          )
        : await executeReserved();
    } catch (error) {
      try {
        if (dispatched) await callControl.ledger.uncertain(key, reservation.owner);
        else await callControl.ledger.cancel(key, reservation.owner);
      } catch {
        // O recibo de reserva/envio anterior continua bloqueando uma nova chamada.
      }
      throw error;
    }
  };

  return Object.freeze({
    async execute<T>(
      original: HostedDocumentTransferRequest,
      operation: (signal: AbortSignal) => Promise<T>,
      callerSignal?: AbortSignal
    ): Promise<T> {
      const request = Object.freeze({
        ...original,
        documentVersions: Object.freeze(
          original.documentVersions.map((item) => Object.freeze({ ...item }))
        )
      });
      try {
        callerSignal?.throwIfAborted();
        const revision = await permit(request);
        const key = JSON.stringify([hostedDocumentRequestHash(request), revision]);
        for (const [cachedKey, entry] of completed)
          if (entry.expiresAt <= now()) completed.delete(cachedKey);
        const cached = callControl ? undefined : completed.get(key);
        if (cached) {
          callerSignal?.throwIfAborted();
          return structuredClone(cached.value) as T;
        }
        let execution = inFlight.get(key);
        if (!execution) {
          // Inclui espera de fila no teto. O transporte recebe o sinal combinado do job.
          const deadline = AbortSignal.timeout(60_000);
          const signal = callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline;
          execution = (async () => {
            await acquire(signal);
            try {
              await permit(request, revision);
              signal.throwIfAborted();
              const result = await executeDurably(request, operation, signal, revision);
              signal.throwIfAborted();
              await permit(request, revision);
              const value = structuredClone(result);
              if (!callControl) {
                if (completed.size >= 64) completed.delete(completed.keys().next().value!);
                completed.set(key, { value, expiresAt: now() + 600_000 });
              }
              return value;
            } finally {
              release();
            }
          })();
          inFlight.set(key, execution);
          // Retirar também quando todos os consumidores tiverem sido cancelados.
          void execution.finally(() => inFlight.delete(key)).catch(() => {});
        }
        const result = await execution;
        callerSignal?.throwIfAborted();
        await permit(request, revision);
        return structuredClone(result) as T;
      } catch (error) {
        if (error instanceof HostedDocumentExecutionError) throw error;
        if (error instanceof HostedCallLedgerError)
          throw new HostedDocumentExecutionError(error.code);
        throw new HostedDocumentExecutionError("execution_failed");
      }
    }
  });
}
