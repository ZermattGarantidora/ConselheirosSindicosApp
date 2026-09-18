import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresCondominiumDirectory } from "../../apps/api/identity/postgres-condominium-directory.js";

const row = {
  condominium_id: "11111111-1111-4111-8111-111111111111",
  display_name: "Residencial Horizonte",
  role_key: "manager" as const,
  cnpj: "12345678000199",
  address: { city: "São Paulo", state: "sp" },
  administration_company: null,
  unit_count: 64,
  contact: {}
};

function createFixture() {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("list_authorized_condominiums")) return { rows: [row] };
      if (sql.includes("create_condominium_for_user")) return { rows: [row] };
      return { rows: [] };
    }),
    release: vi.fn()
  } as unknown as PoolClient;

  return { client, queries, pool: { connect: async () => client } };
}

describe("diretório PostgreSQL de condomínios", () => {
  it("lista somente os condomínios retornados pela função autorizada", async () => {
    const fixture = createFixture();
    const directory = createPostgresCondominiumDirectory(fixture.pool);

    await expect(
      directory.listAuthorized(createUserId("11111111-1111-4111-8111-111111111111"))
    ).resolves.toEqual([
      {
        condominiumId: row.condominium_id,
        name: row.display_name,
        detail: "São Paulo/SP · Condomínio autorizado",
        roleKey: "manager"
      }
    ]);
    expect(fixture.queries).toContain("SET LOCAL ROLE app_runtime");
  });

  it("cria o condomínio e usa a mesma transação para a associação de síndico", async () => {
    const fixture = createFixture();
    const directory = createPostgresCondominiumDirectory(fixture.pool);

    await expect(
      directory.createForUser(createUserId("11111111-1111-4111-8111-111111111111"), {
        name: "Residencial Horizonte",
        cnpj: "12345678000199",
        address: { city: "São Paulo", state: "SP" },
        contact: {}
      })
    ).resolves.toMatchObject({
      condominiumId: row.condominium_id,
      name: "Residencial Horizonte",
      roleKey: "manager"
    });
    expect(fixture.queries.filter((query) => query === "BEGIN")).toHaveLength(1);
    expect(fixture.queries.filter((query) => query === "COMMIT")).toHaveLength(1);
    expect(fixture.client.release).toHaveBeenCalledOnce();
  });

  it("remove somente a membership da conta ao sair da gestão", async () => {
    const fixture = createFixture();
    const directory = createPostgresCondominiumDirectory(fixture.pool);

    await expect(
      directory.leaveForUser(
        createUserId("11111111-1111-4111-8111-111111111111"),
        row.condominium_id
      )
    ).resolves.toBeUndefined();
    expect(fixture.queries).toContain("SELECT app.leave_condominium_for_user($1, $2::uuid)");
    expect(fixture.queries.filter((query) => query === "BEGIN")).toHaveLength(1);
    expect(fixture.queries.filter((query) => query === "COMMIT")).toHaveLength(1);
  });

  it("apaga o condomínio pela função protegida do síndico", async () => {
    const fixture = createFixture();
    const directory = createPostgresCondominiumDirectory(fixture.pool);

    await expect(
      directory.deleteForUser(
        createUserId("11111111-1111-4111-8111-111111111111"),
        row.condominium_id
      )
    ).resolves.toBeUndefined();
    expect(fixture.queries).toContain("SELECT app.delete_condominium_for_user($1, $2::uuid)");
    expect(fixture.queries.filter((query) => query === "BEGIN")).toHaveLength(1);
    expect(fixture.queries.filter((query) => query === "COMMIT")).toHaveLength(1);
  });
});
