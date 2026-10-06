import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { UserId } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  createInMemoryTenantWorkLimiter,
  TenantWorkLimitExceededError
} from "../../apps/api/operations/tenant-work-limiter.js";

const condominiumId = createCondominiumId("alameda");
const userId = "manager-1" as UserId;

describe("limite de trabalho por condomínio", () => {
  it("limita consultas caras por operação, usuário e condomínio", () => {
    const limiter = createInMemoryTenantWorkLimiter({
      document_question: { maximumOperations: 2, windowMilliseconds: 60_000 }
    });
    const now = new Date("2026-09-21T12:00:00.000Z");
    const input = { operation: "document_question" as const, condominiumId, userId, now };

    limiter.consume(input);
    limiter.consume(input);

    expect(() => limiter.consume(input)).toThrow(TenantWorkLimitExceededError);
    try {
      limiter.consume(input);
    } catch (error: unknown) {
      expect(error).toMatchObject({ retryAfterSeconds: 60 });
    }
  });

  it("não mistura os limites entre condomínios, usuários ou operações", () => {
    const limiter = createInMemoryTenantWorkLimiter({
      document_question: { maximumOperations: 1, windowMilliseconds: 60_000 }
    });
    const now = new Date("2026-09-21T12:00:00.000Z");
    limiter.consume({ operation: "document_question", condominiumId, userId, now });

    expect(() =>
      limiter.consume({
        operation: "document_question",
        condominiumId: createCondominiumId("bosque"),
        userId,
        now
      })
    ).not.toThrow();
    expect(() =>
      limiter.consume({
        operation: "document_question",
        condominiumId,
        userId: "manager-2" as UserId,
        now
      })
    ).not.toThrow();
    expect(() =>
      limiter.consume({ operation: "document_upload", condominiumId, userId, now })
    ).not.toThrow();
  });

  it("libera a operação após a janela e rejeita configurações inseguras", () => {
    const limiter = createInMemoryTenantWorkLimiter({
      document_upload: { maximumOperations: 1, windowMilliseconds: 1_000 }
    });
    limiter.consume({
      operation: "document_upload",
      condominiumId,
      userId,
      now: new Date("2026-09-21T12:00:00.000Z")
    });

    expect(() =>
      limiter.consume({
        operation: "document_upload",
        condominiumId,
        userId,
        now: new Date("2026-09-21T12:00:01.000Z")
      })
    ).not.toThrow();
    expect(() =>
      createInMemoryTenantWorkLimiter({
        document_upload: { maximumOperations: 0, windowMilliseconds: 1_000 }
      })
    ).toThrow("máximo de operações");
  });
});
