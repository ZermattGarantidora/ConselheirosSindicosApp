import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createDevelopmentIdentityRepository,
  developmentUserId
} from "../../apps/api/identity/development-identity-repository.js";

describe("adapter de identidade de desenvolvimento", () => {
  it("expõe somente memberships sintéticas conhecidas", async () => {
    const repository = createDevelopmentIdentityRepository();

    await expect(
      repository.findMembership({
        userId: developmentUserId(),
        condominiumId: createCondominiumId("alameda")
      })
    ).resolves.toMatchObject({ roleKey: "manager", status: "active" });

    await expect(
      repository.findMembership({
        userId: developmentUserId(),
        condominiumId: createCondominiumId("inexistente")
      })
    ).resolves.toBeUndefined();
  });
});
