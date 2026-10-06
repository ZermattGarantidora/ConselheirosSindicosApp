import type { CondominiumId } from "../core/condominium-scope.js";
import type { UserId } from "../identity/authorized-condominium-context.js";

export type ProtectedOperation = "document_upload" | "document_question";

export type TenantWorkLimit = Readonly<{
  maximumOperations: number;
  windowMilliseconds: number;
}>;

export type TenantWorkLimiter = Readonly<{
  consume(
    input: Readonly<{
      operation: ProtectedOperation;
      condominiumId: CondominiumId;
      userId: UserId;
      now: Date;
    }>
  ): void;
}>;

export class TenantWorkLimitExceededError extends Error {
  public constructor(public readonly retryAfterSeconds: number) {
    super("O limite temporário de processamento deste condomínio foi atingido.");
    this.name = "TenantWorkLimitExceededError";
  }
}

type LimitByOperation = Readonly<Record<ProtectedOperation, TenantWorkLimit>>;

const defaultLimits: LimitByOperation = Object.freeze({
  document_upload: Object.freeze({ maximumOperations: 5, windowMilliseconds: 10 * 60 * 1_000 }),
  document_question: Object.freeze({ maximumOperations: 30, windowMilliseconds: 60 * 1_000 })
});

function assertLimit(limit: TenantWorkLimit): void {
  if (!Number.isInteger(limit.maximumOperations) || limit.maximumOperations < 1) {
    throw new Error("O máximo de operações deve ser um inteiro positivo.");
  }
  if (!Number.isInteger(limit.windowMilliseconds) || limit.windowMilliseconds < 1) {
    throw new Error("A janela de operações deve ser um inteiro positivo em milissegundos.");
  }
}

function keyFor(
  input: Readonly<{
    operation: ProtectedOperation;
    condominiumId: CondominiumId;
    userId: UserId;
  }>
): string {
  return `${input.operation}:${input.condominiumId}:${input.userId}`;
}

export function createInMemoryTenantWorkLimiter(
  configuredLimits: Partial<LimitByOperation> = {}
): TenantWorkLimiter {
  const limits: LimitByOperation = {
    document_upload: configuredLimits.document_upload ?? defaultLimits.document_upload,
    document_question: configuredLimits.document_question ?? defaultLimits.document_question
  };
  assertLimit(limits.document_upload);
  assertLimit(limits.document_question);

  const usedAtByScope = new Map<string, number[]>();

  return Object.freeze({
    consume(input) {
      const limit = limits[input.operation];
      const nowMilliseconds = input.now.getTime();
      const windowStart = nowMilliseconds - limit.windowMilliseconds;
      const key = keyFor(input);
      const stillWithinWindow = (usedAtByScope.get(key) ?? []).filter(
        (usedAt) => usedAt > windowStart
      );

      if (stillWithinWindow.length >= limit.maximumOperations) {
        const oldestUsageAt = stillWithinWindow[0];
        if (oldestUsageAt === undefined) {
          throw new Error("O limite de trabalho entrou em um estado inválido.");
        }
        const earliestAllowedAt = oldestUsageAt + limit.windowMilliseconds;
        throw new TenantWorkLimitExceededError(
          Math.max(1, Math.ceil((earliestAllowedAt - nowMilliseconds) / 1_000))
        );
      }

      stillWithinWindow.push(nowMilliseconds);
      usedAtByScope.set(key, stillWithinWindow);
    }
  });
}
