import { describe, expect, it } from "vitest";

import { calculateAccountLevel } from "../../apps/api/identity/account-level.js";

describe("base ajustável de nível da conta", () => {
  it("mantém nível inicial sem informações confirmadas suficientes", () => {
    expect(calculateAccountLevel({ emailVerified: false, activeCondominiumCount: 3 })).toBe(
      "starting"
    );
    expect(calculateAccountLevel({ emailVerified: true, activeCondominiumCount: 0 })).toBe(
      "starting"
    );
  });

  it("calcula nível confirmado apenas com dados confirmados e limiar ajustável", () => {
    expect(calculateAccountLevel({ emailVerified: true, activeCondominiumCount: 1 })).toBe(
      "confirmed"
    );
    expect(
      calculateAccountLevel(
        { emailVerified: true, activeCondominiumCount: 2 },
        { confirmedLevelMinimumCondominiums: 3 }
      )
    ).toBe("starting");
  });
});
