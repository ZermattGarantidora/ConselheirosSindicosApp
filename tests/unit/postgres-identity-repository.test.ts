import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";

function createFixture(resolveUser: string | null) {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("resolve_user_id")) {
        return { rows: [{ user_id: resolveUser }], rowCount: resolveUser === null ? 0 : 1 };
      }
      if (sql.includes("FROM app.memberships")) {
        return {
          rows: [
            {
              role_key: "manager",
              status: "active",
              valid_from: new Date("2026-01-01T00:00:00.000Z"),
              valid_until: null,
              revision: "membership-v1"
            }
          ],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 1 };
    }),
    release: vi.fn()
  } as unknown as PoolClient;

  return { client, queries, pool: { connect: async () => client } };
}

describe("repositório PostgreSQL de identidade", () => {
  it("resolve auth_subject sem expor UUID ao domínio e carrega membership escopada", async () => {
    const fixture = createFixture("11111111-1111-4111-8111-111111111111");
    const repository = createPostgresMembershipRepository(fixture.pool);
    const condominiumId = createCondominiumId("22222222-2222-4222-8222-222222222222");
    const userId = createUserId("sindico-sintetico");

    await expect(repository.findMembership({ userId, condominiumId })).resolves.toMatchObject({
      condominiumId,
      userId,
      roleKey: "manager",
      revision: "membership-v1"
    });
    expect(fixture.queries).toContain("SET LOCAL ROLE app_runtime");
    expect(fixture.queries.some((sql) => sql.includes("app.condominium_id"))).toBe(true);
  });

  it("falha fechado para condomínio não UUID e identidade desconhecida", async () => {
    const invalidFixture = createFixture("ignored");
    await expect(
      createPostgresMembershipRepository(invalidFixture.pool).findMembership({
        userId: createUserId("sindico-sintetico"),
        condominiumId: createCondominiumId("alameda")
      })
    ).resolves.toBeUndefined();
    expect(invalidFixture.client.query).not.toHaveBeenCalled();

    const missingFixture = createFixture(null);
    await expect(
      createPostgresMembershipRepository(missingFixture.pool).findMembership({
        userId: createUserId("ausente"),
        condominiumId: createCondominiumId("22222222-2222-4222-8222-222222222222")
      })
    ).resolves.toBeUndefined();
    expect(missingFixture.queries).toContain("COMMIT");
  });
});
