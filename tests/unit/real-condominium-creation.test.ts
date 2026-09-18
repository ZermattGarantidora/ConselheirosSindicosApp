import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createInMemoryAccountAuth } from "../../apps/api/identity/account-auth.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import type { MembershipRepository } from "../../apps/api/identity/authorized-condominium-context.js";
import type {
  AuthorizedCondominium,
  CondominiumDirectory
} from "../../apps/api/identity/postgres-condominium-directory.js";

const authorized: AuthorizedCondominium = {
  condominiumId: "11111111-1111-4111-8111-111111111111",
  name: "Residencial Horizonte",
  detail: "São Paulo/SP · Condomínio autorizado",
  roleKey: "manager"
};

function directoryFixture(): CondominiumDirectory & {
  listAuthorized: ReturnType<typeof vi.fn>;
  createForUser: ReturnType<typeof vi.fn>;
  leaveForUser: ReturnType<typeof vi.fn>;
  deleteForUser: ReturnType<typeof vi.fn>;
} {
  return {
    listAuthorized: vi.fn(async () => [authorized]),
    createForUser: vi.fn(async () => authorized),
    leaveForUser: vi.fn(async () => undefined),
    deleteForUser: vi.fn(async () => undefined)
  };
}

describe("criação real de condomínio", () => {
  it("lista os grupos da conta e cria o primeiro condomínio com papel de síndico", async () => {
    const directory = directoryFixture();
    directory.listAuthorized.mockResolvedValueOnce([]);
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directory
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Síndico de Teste",
        email: "sindico-condominio@example.test",
        password: "senha sintética forte"
      }
    });
    const cookie = String(registration.headers["set-cookie"]).split(";")[0];

    const list = await app.inject({
      method: "GET",
      url: "/v1/condominiums",
      headers: { cookie }
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual({ condominiums: [] });

    const create = await app.inject({
      method: "POST",
      url: "/v1/condominiums",
      headers: { cookie },
      payload: {
        name: "Residencial Horizonte",
        cnpj: "12345678000199",
        address: { city: "São Paulo", state: "SP" },
        contact: {}
      }
    });
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      condominiumId: authorized.condominiumId,
      role: "manager",
      permissions: ["document:read", "document:upload"]
    });
    expect(directory.listAuthorized).toHaveBeenCalledOnce();
    expect(directory.createForUser).toHaveBeenCalledOnce();

    await app.close();
  });

  it("rejeita dados incompletos antes de chamar o diretório persistente", async () => {
    const directory = directoryFixture();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directory
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Síndico de Teste",
        email: "sindico-invalido@example.test",
        password: "senha sintética forte"
      }
    });
    const cookie = String(registration.headers["set-cookie"]).split(";")[0];
    const create = await app.inject({
      method: "POST",
      url: "/v1/condominiums",
      headers: { cookie },
      payload: { name: "X", cnpj: "1", address: { city: "", state: "S" }, contact: {} }
    });

    expect(create.statusCode).toBe(400);
    expect(directory.createForUser).not.toHaveBeenCalled();
    await app.close();
  });

  it("não expõe os endpoints reais sem sessão", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directoryFixture()
    });
    await app.ready();

    await expect(app.inject({ method: "GET", url: "/v1/condominiums" })).resolves.toMatchObject({
      statusCode: 401
    });
    await expect(
      app.inject({
        method: "POST",
        url: "/v1/condominiums",
        payload: {}
      })
    ).resolves.toMatchObject({ statusCode: 401 });
    await expect(
      app.inject({
        method: "DELETE",
        url: `/v1/condominiums/${authorized.condominiumId}/membership`
      })
    ).resolves.toMatchObject({ statusCode: 401 });
    await expect(
      app.inject({
        method: "DELETE",
        url: `/v1/condominiums/${authorized.condominiumId}`
      })
    ).resolves.toMatchObject({ statusCode: 401 });
    await app.close();
  });

  it("revoga somente a membership do usuário após confirmação no endpoint real", async () => {
    const directory = directoryFixture();
    const membershipRepository: MembershipRepository = {
      findMembership: vi.fn(
        async ({
          userId,
          condominiumId
        }: Parameters<MembershipRepository["findMembership"]>[0]) => ({
          userId,
          condominiumId,
          roleKey: "manager" as const,
          status: "active" as const,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          revision: "membership-synthetic-v1"
        })
      )
    };
    const app = createApi({
      membershipRepository,
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directory
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Síndico de Saída",
        email: "sindico-saida@example.test",
        password: "senha sintética forte"
      }
    });
    const cookie = String(registration.headers["set-cookie"]).split(";")[0];
    const userId = registration.json().user.userId as string;
    const leave = await app.inject({
      method: "DELETE",
      url: `/v1/condominiums/${authorized.condominiumId}/membership`,
      headers: { cookie }
    });

    expect(leave.statusCode).toBe(204);
    expect(directory.leaveForUser).toHaveBeenCalledWith(userId, authorized.condominiumId);
    await app.close();
  });

  it("apaga o condomínio inteiro somente quando o usuário é o síndico responsável", async () => {
    const directory = directoryFixture();
    const membershipRepository: MembershipRepository = {
      findMembership: vi.fn(
        async ({
          userId,
          condominiumId
        }: Parameters<MembershipRepository["findMembership"]>[0]) => ({
          userId,
          condominiumId,
          roleKey: "manager" as const,
          status: "active" as const,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          revision: "membership-synthetic-v1"
        })
      )
    };
    const app = createApi({
      membershipRepository,
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directory
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Síndico de Exclusão",
        email: "sindico-exclusao@example.test",
        password: "senha sintética forte"
      }
    });
    const cookie = String(registration.headers["set-cookie"]).split(";")[0];
    const userId = registration.json().user.userId as string;
    const deletion = await app.inject({
      method: "DELETE",
      url: `/v1/condominiums/${authorized.condominiumId}`,
      headers: { cookie }
    });

    expect(deletion.statusCode).toBe(204);
    expect(directory.deleteForUser).toHaveBeenCalledWith(userId, authorized.condominiumId);
    await app.close();
  });

  it("recusa apagar o condomínio para uma membership que não é de síndico", async () => {
    const directory = directoryFixture();
    const membershipRepository: MembershipRepository = {
      findMembership: vi.fn(async ({ userId, condominiumId }) => ({
        userId,
        condominiumId,
        roleKey: "advisor" as const,
        status: "active" as const,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        revision: "membership-synthetic-v1"
      }))
    };
    const app = createApi({
      membershipRepository,
      accountAuth: createInMemoryAccountAuth(),
      condominiumDirectory: directory
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Morador de Exclusão",
        email: "morador-exclusao@example.test",
        password: "senha sintética forte"
      }
    });
    const cookie = String(registration.headers["set-cookie"]).split(";")[0];
    const deletion = await app.inject({
      method: "DELETE",
      url: `/v1/condominiums/${authorized.condominiumId}`,
      headers: { cookie }
    });

    expect(deletion.statusCode).toBe(403);
    expect(deletion.json()).toEqual({
      message: "Somente o síndico responsável pode apagar o condomínio."
    });
    expect(directory.deleteForUser).not.toHaveBeenCalled();
    await app.close();
  });

  it("mantém a criação e listagem protegidas por funções do banco", async () => {
    const migration = await readFile(
      "infrastructure/database/012_real_condominium_creation.sql",
      "utf8"
    );
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.list_authorized_condominiums");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.create_condominium_for_user");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION app.create_condominium_for_user");
    expect(migration).not.toContain("GRANT INSERT ON app.condominiums");
  });

  it("mantém a saída da gestão separada da exclusão de dados", async () => {
    const migration = await readFile(
      "infrastructure/database/014_leave_condominium_management.sql",
      "utf8"
    );
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.leave_condominium_for_user");
    expect(migration).toContain("status = 'revoked'");
    expect(migration).toContain("O condomínio não está associado à sua conta.");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION app.leave_condominium_for_user");
    expect(migration).not.toContain("DELETE FROM app.condominiums");
  });

  it("define a exclusão permanente isolada pelo condomínio e pelo síndico", async () => {
    const migration = await readFile("infrastructure/database/015_delete_condominium.sql", "utf8");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.delete_condominium_for_user");
    expect(migration).toContain("role_key = 'manager'");
    expect(migration).toContain("DELETE FROM app.condominiums WHERE id = p_condominium_id");
    expect(migration).toContain("REVOKE ALL ON FUNCTION app.delete_condominium_for_user");
  });
});
