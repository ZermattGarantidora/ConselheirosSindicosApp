import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  AccessDeniedError,
  createUserId,
  resolveAuthorizedCondominiumContext,
  type Membership,
  type MembershipRepository
} from "../../apps/api/identity/authorized-condominium-context.js";

const now = new Date("2026-09-01T12:00:00.000Z");
const userId = createUserId("sindico-1");
const alameda = createCondominiumId("alameda");

function repositoryWith(membership: Membership | undefined): MembershipRepository {
  return {
    async findMembership() {
      return membership;
    }
  };
}

function activeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    condominiumId: alameda,
    userId,
    roleKey: "manager",
    status: "active",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    revision: "v1",
    ...overrides
  };
}

describe("AuthorizedCondominiumContext", () => {
  it("resolve um escopo imutável apenas para membership vigente", async () => {
    const context = await resolveAuthorizedCondominiumContext(repositoryWith(activeMembership()), {
      userId,
      condominiumId: alameda,
      now
    });

    expect(context).toMatchObject({
      condominiumId: "alameda",
      userId: "sindico-1",
      roleKey: "manager",
      permissions: ["document:read", "document:upload"]
    });
    expect(Object.isFrozen(context)).toBe(true);
  });

  it.each([
    undefined,
    activeMembership({ status: "revoked" }),
    activeMembership({ validFrom: new Date("2026-10-01T00:00:00.000Z") }),
    activeMembership({ validUntil: new Date("2026-09-01T12:00:00.000Z") }),
    activeMembership({ userId: createUserId("outro-usuario") })
  ])("nega membership ausente, revogada, inválida ou inconsistente", async (membership) => {
    await expect(
      resolveAuthorizedCondominiumContext(repositoryWith(membership), {
        userId,
        condominiumId: alameda,
        now
      })
    ).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("recusa identificador de usuário vazio", () => {
    expect(() => createUserId("  ")).toThrow("UserId não pode ser vazio.");
  });
});
