import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  createPostgresAdminDashboard,
  parseAdminUserIds,
  type AdminDashboardService
} from "../../apps/api/admin/admin-dashboard.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createInMemoryAccountAuth } from "../../apps/api/identity/account-auth.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

function sessionCookie(response: Readonly<{ headers: Readonly<Record<string, unknown>> }>): string {
  return String(response.headers["set-cookie"]).split(";")[0] ?? "";
}

describe("painel administrativo minimizado da Zermatt", () => {
  it("valida a lista de IDs internos e mantém o acesso desabilitado por padrão", () => {
    expect(parseAdminUserIds(undefined)).toEqual([]);
    expect(
      parseAdminUserIds(
        " AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,invalido "
      )
    ).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  });

  it("autoriza somente a conta configurada e devolve apenas métricas agregadas", async () => {
    const now = new Date("2026-09-22T15:00:00.000Z");
    const readMetrics = vi.fn<AdminDashboardService["readMetrics"]>().mockResolvedValue({
      activeAccounts: 14,
      newAccountsLast7Days: 4,
      activeUsersLast7Days: 7
    });
    const readAccounts = vi.fn<AdminDashboardService["readAccounts"]>().mockResolvedValue([
      { displayName: "Síndica Sintética", email: "sindica@example.test" },
      { displayName: "Equipe Zermatt", email: "admin@example.test" }
    ]);
    const accountAuth = createInMemoryAccountAuth();
    const seededAdmin = await accountAuth.register({
      displayName: "Equipe Zermatt",
      email: "admin@example.test",
      password: "senha sintética segura"
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth,
      adminDashboard: { readMetrics, readAccounts },
      adminUserIds: [seededAdmin.account.userId],
      now: () => now
    });
    await app.ready();

    const adminLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "ADMIN@example.test",
        password: "senha sintética segura"
      }
    });
    const commonRegistration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Síndica Sintética",
        email: "sindica@example.test",
        password: "outra senha sintética"
      }
    });

    expect(adminLogin.json().user).toMatchObject({ isAdmin: true });
    expect(commonRegistration.json().user).toMatchObject({ isAdmin: false });

    const anonymous = await app.inject({ method: "GET", url: "/v1/admin/dashboard" });
    expect(anonymous.statusCode).toBe(401);

    const common = await app.inject({
      method: "GET",
      url: "/v1/admin/dashboard",
      headers: { cookie: sessionCookie(commonRegistration) }
    });
    expect(common.statusCode).toBe(403);
    expect(common.json()).toEqual({ message: "Acesso administrativo não autorizado." });

    const admin = await app.inject({
      method: "GET",
      url: "/v1/admin/dashboard",
      headers: { cookie: sessionCookie(adminLogin) }
    });
    expect(admin.statusCode).toBe(200);
    expect(admin.json()).toEqual({
      metrics: {
        activeAccounts: 14,
        newAccountsLast7Days: 4,
        activeUsersLast7Days: 7
      },
      generatedAt: now.toISOString(),
      commercialOpportunities: { collectionActive: false },
      accounts: [
        { displayName: "Síndica Sintética", email: "sindica@example.test" },
        { displayName: "Equipe Zermatt", email: "admin@example.test" }
      ]
    });
    expect(admin.headers["cache-control"]).toBe("no-store");
    expect(readMetrics).toHaveBeenCalledWith(new Date("2026-09-15T15:00:00.000Z"));
    expect(readAccounts).toHaveBeenCalledWith(100);

    const restoredSession = await app.inject({
      method: "GET",
      url: "/v1/auth/session",
      headers: { cookie: sessionCookie(adminLogin) }
    });
    expect(restoredSession.json().user).toMatchObject({ isAdmin: true });
    await app.close();
  });

  it("falha de modo seguro quando o serviço está ausente ou indisponível", async () => {
    const auth = createInMemoryAccountAuth();
    const seededAdmin = await auth.register({
      displayName: "Equipe Zermatt",
      email: "admin@example.test",
      password: "senha sintética segura"
    });
    const appWithoutService = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: auth,
      adminUserIds: [seededAdmin.account.userId]
    });
    await appWithoutService.ready();
    const registration = await appWithoutService.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "admin@example.test",
        password: "senha sintética segura"
      }
    });
    const unavailable = await appWithoutService.inject({
      method: "GET",
      url: "/v1/admin/dashboard",
      headers: { cookie: sessionCookie(registration) }
    });
    expect(unavailable.statusCode).toBe(503);
    await appWithoutService.close();

    const failingAuth = createInMemoryAccountAuth();
    const failingAdmin = await failingAuth.register({
      displayName: "Equipe Zermatt",
      email: "falha.admin@example.test",
      password: "senha sintética segura"
    });
    const appWithFailure = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: failingAuth,
      adminUserIds: [failingAdmin.account.userId],
      adminDashboard: {
        async readMetrics() {
          throw new Error("falha sintética");
        },
        async readAccounts() {
          return [];
        }
      }
    });
    await appWithFailure.ready();
    const secondRegistration = await appWithFailure.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "falha.admin@example.test",
        password: "senha sintética segura"
      }
    });
    const failed = await appWithFailure.inject({
      method: "GET",
      url: "/v1/admin/dashboard",
      headers: { cookie: sessionCookie(secondRegistration) }
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({
      message: "Não foi possível carregar os indicadores da Zermatt."
    });
    await appWithFailure.close();
  });

  it("lê as três contagens pela função PostgreSQL dedicada", async () => {
    const query = vi.fn().mockImplementation(async (text: string) =>
      text.includes("read_admin_account_directory")
        ? {
            rows: [
              { display_name: "Pessoa A", email: "pessoa.a@example.test" },
              { display_name: "Pessoa B", email: "pessoa.b@example.test" }
            ]
          }
        : {
            rows: [
              {
                active_accounts: "12",
                new_accounts_last_7_days: 3,
                active_users_last_7_days: "6"
              }
            ]
          }
    );
    const dashboard = createPostgresAdminDashboard({ query } as never);
    const since = new Date("2026-09-15T00:00:00.000Z");

    await expect(dashboard.readMetrics(since)).resolves.toEqual({
      activeAccounts: 12,
      newAccountsLast7Days: 3,
      activeUsersLast7Days: 6
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("read_admin_dashboard_metrics"), [
      since
    ]);
    await expect(dashboard.readAccounts(250)).resolves.toEqual([
      { displayName: "Pessoa A", email: "pessoa.a@example.test" },
      { displayName: "Pessoa B", email: "pessoa.b@example.test" }
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("read_admin_account_directory"),
      [100]
    );
  });

  it("rejeita respostas ausentes ou métricas inválidas do banco", async () => {
    const absent = createPostgresAdminDashboard({
      async query() {
        return { rows: [] };
      }
    } as never);
    await expect(absent.readMetrics(new Date())).rejects.toThrow(
      "O banco não retornou as métricas administrativas."
    );

    const invalid = createPostgresAdminDashboard({
      async query() {
        return {
          rows: [
            {
              active_accounts: -1,
              new_accounts_last_7_days: 0,
              active_users_last_7_days: 0
            }
          ]
        };
      }
    } as never);
    await expect(invalid.readMetrics(new Date())).rejects.toThrow(
      "O banco retornou uma métrica administrativa inválida."
    );
  });

  it("mantém a migration restrita a contas e sessões", async () => {
    const migration = await readFile(
      "infrastructure/database/016_admin_dashboard_metrics.sql",
      "utf8"
    );
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION app.read_admin_dashboard_metrics");
    expect(migration).toContain("app.users");
    expect(migration).toContain("app.auth_sessions");
    expect(migration).not.toMatch(/app\.(condominiums|memberships|documents|questions|answers)/u);
    expect(migration).not.toContain("answer_feedback");

    const accountDirectoryMigration = await readFile(
      "infrastructure/database/017_admin_account_directory.sql",
      "utf8"
    );
    expect(accountDirectoryMigration).toContain("SECURITY DEFINER");
    expect(accountDirectoryMigration).toContain(
      "GRANT EXECUTE ON FUNCTION app.read_admin_account_directory"
    );
    expect(accountDirectoryMigration).toContain("users.display_name");
    expect(accountDirectoryMigration).toContain("users.email");
    expect(accountDirectoryMigration).not.toMatch(
      /app\.(condominiums|memberships|documents|questions|answers)/u
    );
  });
});
