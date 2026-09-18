import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createInMemoryAccountAuth,
  getAccountSessionCookie,
  serializeAccountSessionCookie,
  serializeClearedAccountSessionCookie
} from "../../apps/api/identity/account-auth.js";
import { createPostgresAccountAuth } from "../../apps/api/identity/postgres-account-auth.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

describe("autenticação real por e-mail e senha", () => {
  it("cria conta, autentica a sessão e revoga o token", async () => {
    const auth = createInMemoryAccountAuth();
    const created = await auth.register({
      displayName: "Síndica Sintética",
      email: "  SINDICA@example.test ",
      password: "uma senha sintética segura"
    });

    expect(created.account).toMatchObject({
      displayName: "Síndica Sintética",
      email: "sindica@example.test"
    });
    await expect(auth.authenticate(created.token)).resolves.toMatchObject({
      userId: created.account.userId,
      email: "sindica@example.test"
    });

    const loggedIn = await auth.login({
      email: "SINDICA@example.test",
      password: "uma senha sintética segura"
    });
    await expect(auth.authenticate(loggedIn.token)).resolves.toMatchObject({
      userId: created.account.userId
    });

    await auth.logout(created.token);
    await expect(auth.authenticate(created.token)).resolves.toBeUndefined();
  });

  it("cria e vincula uma conta Google pelo subject verificado, sem senha local", async () => {
    const auth = createInMemoryAccountAuth();
    const first = await auth.loginWithGoogle({
      subject: "google-subject",
      email: "google@example.test",
      displayName: "Conta Google"
    });
    const second = await auth.loginWithGoogle({
      subject: "google-subject",
      email: "google@example.test",
      displayName: "Conta Google Atualizada"
    });

    expect(second.account.userId).toBe(first.account.userId);
    await expect(
      auth.login({ email: "google@example.test", password: "senha que não existe" })
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("valida entrada, impede duplicidade e não aceita credencial inválida", async () => {
    const auth = createInMemoryAccountAuth();
    await expect(
      auth.register({ displayName: "A", email: "invalido", password: "curta" })
    ).rejects.toMatchObject({ code: "invalid_input" });

    const input = {
      displayName: "Gestor Sintético",
      email: "gestor@example.test",
      password: "senha sintética forte"
    };
    await auth.register(input);
    await expect(auth.register(input)).rejects.toMatchObject({
      code: "email_taken"
    });
    await expect(
      auth.login({ email: input.email, password: "senha errada demais" })
    ).rejects.toMatchObject({
      code: "invalid_credentials"
    });
    await expect(
      auth.login({ email: "ausente@example.test", password: input.password })
    ).rejects.toMatchObject({
      code: "invalid_credentials"
    });
  });

  it("expira sessões e serializa cookies sem expor o token em atributos", async () => {
    const auth = createInMemoryAccountAuth();
    const session = await auth.register({
      displayName: "Gestor Sintético",
      email: "cookie@example.test",
      password: "senha sintética forte"
    });
    await expect(
      auth.authenticate(session.token, new Date(session.expiresAt.getTime() + 1))
    ).resolves.toBeUndefined();

    const cookie = serializeAccountSessionCookie(session.token, true);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(getAccountSessionCookie(cookie)).toBe(session.token);
    expect(getAccountSessionCookie("outro=1; conselheiro_session=%")).toBeUndefined();
    expect(serializeClearedAccountSessionCookie(false)).toContain("Max-Age=0");
  });

  it("usa o adaptador PostgreSQL pelas funções de conta e sessão", async () => {
    let accountRow:
      | {
          user_id: string;
          auth_subject: string;
          email: string;
          display_name: string;
          password_hash: string | null;
          google_subject: string | null;
          status: "active";
        }
      | undefined;
    const sessions = new Map<string, { userId: string; expiresAt: Date; revoked: boolean }>();
    const calls: string[] = [];
    const pool = {
      async query<T>(text: string, values: readonly unknown[] = []) {
        calls.push(text);
        if (text.includes("app.create_account")) {
          accountRow = {
            user_id: String(values[0]),
            auth_subject: String(values[1]),
            email: String(values[2]),
            display_name: String(values[3]),
            password_hash: String(values[4]),
            google_subject: null,
            status: "active"
          };
          return { rows: [] as T[] };
        }
        if (text.includes("app.find_or_create_google_account")) {
          accountRow = {
            user_id: String(values[0]),
            auth_subject: String(values[1]),
            google_subject: String(values[2]),
            email: String(values[3]),
            display_name: String(values[4]),
            password_hash: null,
            status: "active"
          };
          return { rows: [accountRow] as T[] };
        }
        if (text.includes("app.find_account_by_email")) {
          return {
            rows:
              accountRow !== undefined && accountRow.email === String(values[0])
                ? ([accountRow] as T[])
                : []
          };
        }
        if (text.includes("app.create_auth_session")) {
          sessions.set(String(values[1]), {
            userId: String(values[0]),
            expiresAt: new Date(String(values[2])),
            revoked: false
          });
          return { rows: [] as T[] };
        }
        if (text.includes("app.resolve_auth_session")) {
          const session = sessions.get(String(values[0]));
          return {
            rows:
              accountRow !== undefined &&
              session !== undefined &&
              !session.revoked &&
              session.expiresAt > new Date(String(values[1]))
                ? ([
                    {
                      user_id: accountRow.user_id,
                      email: accountRow.email,
                      display_name: accountRow.display_name
                    }
                  ] as T[])
                : []
          };
        }
        if (text.includes("app.revoke_auth_session")) {
          const session = sessions.get(String(values[0]));
          if (session !== undefined) session.revoked = true;
          return { rows: [] as T[] };
        }
        throw new Error(`Consulta inesperada: ${text}`);
      }
    } as unknown as Parameters<typeof createPostgresAccountAuth>[0];

    const auth = createPostgresAccountAuth(pool);
    const created = await auth.register({
      displayName: "Gestor Persistente",
      email: "persistente@example.test",
      password: "senha sintética persistente"
    });
    expect(calls).toEqual([
      expect.stringContaining("app.create_account"),
      expect.stringContaining("app.create_auth_session")
    ]);
    await expect(auth.authenticate(created.token)).resolves.toMatchObject({
      email: "persistente@example.test"
    });
    await expect(
      auth.login({
        email: "persistente@example.test",
        password: "senha sintética persistente"
      })
    ).resolves.toMatchObject({ account: { displayName: "Gestor Persistente" } });
    await expect(
      auth.loginWithGoogle({
        subject: "google-subject",
        email: "google.persistente@example.test",
        displayName: "Google Persistente"
      })
    ).resolves.toMatchObject({ account: { email: "google.persistente@example.test" } });
    await auth.logout(created.token);
    await expect(auth.authenticate(created.token)).resolves.toBeUndefined();
  });

  it("expõe as rotas de conta e rejeita a identidade de desenvolvimento no modo real", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth(),
      secureCookies: true
    });
    await app.ready();

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Gestor Sintético",
        email: "api@example.test",
        password: "senha sintética forte"
      }
    });
    expect(registration.statusCode).toBe(201);
    const setCookie = registration.headers["set-cookie"];
    expect(typeof setCookie).toBe("string");
    const cookie = String(setCookie).split(";")[0];

    const session = await app.inject({
      method: "GET",
      url: "/v1/auth/session",
      headers: { cookie }
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().user.email).toBe("api@example.test");

    const context = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/context",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(context.statusCode).toBe(401);

    const logout = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { cookie }
    });
    expect(logout.statusCode).toBe(204);
    await expect(
      app.inject({ method: "GET", url: "/v1/auth/session", headers: { cookie } })
    ).resolves.toMatchObject({
      statusCode: 401
    });
    await app.close();
  });

  it("mantém a migration protegida por funções e sem grant direto nas tabelas de sessão", async () => {
    const migration = await readFile("infrastructure/database/011_real_account_auth.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS app.auth_sessions");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION app.create_account");
    expect(migration).not.toContain("GRANT SELECT ON app.auth_sessions");
  });
});
