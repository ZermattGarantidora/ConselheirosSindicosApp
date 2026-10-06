import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresCondominiumProfileRepository } from "../../apps/api/identity/postgres-condominium-profile.js";

const condominiumId = createCondominiumId("11111111-1111-4111-8111-111111111111");
const userId = createUserId("gestor-externo");
const photoId = "22222222-2222-4222-8222-222222222222";
const profileRow = {
  condominium_id: condominiumId,
  display_name: "Residencial Horizonte",
  cnpj: "12345678000199",
  address: { city: "São Paulo", state: "SP" },
  administration_company: null,
  unit_count: null,
  contact: {},
  profile_description: null
};
const photoRow = {
  id: photoId,
  media_type: "image/jpeg" as const,
  size_bytes: 3,
  is_cover: true,
  created_at: new Date("2026-10-06T12:00:00.000Z"),
  content: Buffer.from([0xff, 0xd8, 0xff])
};

function fixture() {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("app.resolve_user_id")) {
        return { rows: [{ user_id: "33333333-3333-4333-8333-333333333333" }] };
      }
      if (sql.includes("FROM app.condominiums")) return { rows: [profileRow] };
      if (sql.includes("octet_length(content)") && sql.includes("AND id = $2")) {
        return { rows: [photoRow] };
      }
      if (sql.includes("octet_length(content)")) return { rows: [photoRow] };
      if (sql.includes("content\n            FROM app.condominium_profile_photos")) {
        return { rows: [photoRow] };
      }
      return { rows: [] };
    }),
    release: vi.fn()
  } as unknown as PoolClient;
  return { client, queries, pool: { connect: async () => client } };
}

const update = {
  name: "Residencial Atualizado",
  address: {
    postalCode: "01234567",
    street: "Rua A",
    number: "1",
    complement: "",
    neighborhood: "",
    city: "São Paulo",
    state: "SP"
  },
  administrationCompany: "",
  unitCount: 20,
  contact: { managerName: "Maria", email: "maria@example.test", phone: "" },
  description: ""
};

describe("adaptador PostgreSQL de perfil do condomínio", () => {
  it("opera somente pela transação, contexto de tenant e funções protegidas", async () => {
    const item = fixture();
    const repository = createPostgresCondominiumProfileRepository(item.pool);

    await expect(repository.getProfile({ userId, condominiumId })).resolves.toMatchObject({
      condominiumId,
      address: { city: "São Paulo", state: "SP", street: "" },
      contact: { managerName: "", email: "", phone: "" }
    });
    await expect(
      repository.updateProfile({ userId, condominiumId, profile: update })
    ).resolves.toMatchObject({
      cnpj: "12345678000199"
    });
    await expect(repository.listPhotos({ userId, condominiumId })).resolves.toEqual([
      expect.objectContaining({ photoId, sizeBytes: 3, createdAt: "2026-10-06T12:00:00.000Z" })
    ]);
    await expect(
      repository.addPhoto({
        userId,
        condominiumId,
        photoId,
        mediaType: "image/jpeg",
        content: photoRow.content
      })
    ).resolves.toMatchObject({ photoId, mediaType: "image/jpeg" });
    await expect(repository.readPhoto({ userId, condominiumId, photoId })).resolves.toMatchObject({
      photoId,
      content: photoRow.content
    });
    await expect(repository.setCover({ userId, condominiumId, photoId })).resolves.toBeUndefined();
    await expect(
      repository.deletePhoto({ userId, condominiumId, photoId })
    ).resolves.toBeUndefined();

    expect(item.queries).toContain("SET LOCAL ROLE app_runtime");
    expect(item.queries.filter((sql) => sql === "BEGIN")).toHaveLength(7);
    expect(item.queries.filter((sql) => sql === "COMMIT")).toHaveLength(7);
    expect(item.queries.some((sql) => sql.includes("app.update_condominium_profile"))).toBe(true);
    expect(item.queries.some((sql) => sql.includes("app.add_condominium_profile_photo"))).toBe(
      true
    );
    expect(
      item.queries.some((sql) => sql.includes("app.set_condominium_profile_photo_cover"))
    ).toBe(true);
    expect(item.queries.some((sql) => sql.includes("app.delete_condominium_profile_photo"))).toBe(
      true
    );
    expect(item.client.release).toHaveBeenCalledTimes(7);
  });

  it("reverte a transação quando a identidade não pode ser resolvida", async () => {
    const client = {
      query: vi.fn(async (sql: string) =>
        sql.includes("app.resolve_user_id") ? { rows: [{ user_id: null }] } : { rows: [] }
      ),
      release: vi.fn()
    } as unknown as PoolClient;
    const repository = createPostgresCondominiumProfileRepository({ connect: async () => client });

    await expect(repository.getProfile({ userId, condominiumId })).rejects.toThrow(
      "A identidade do perfil não está cadastrada como usuário ativo."
    );
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
