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

  it("retoma o cadastro quando a confirmação da primeira gravação se perde", async () => {
    let createAttempts = 0;
    let storedAccount:
      | {
          user_id: string;
          auth_subject: string;
          email: string;
          display_name: string;
          password_hash: string;
          google_subject: null;
          status: "active";
        }
      | undefined;
    const pool = {
      async query<T>(text: string, values: readonly unknown[] = []) {
        if (text.includes("app.create_account")) {
          createAttempts += 1;
          if (createAttempts === 1) {
            storedAccount = {
              user_id: String(values[0]),
              auth_subject: String(values[1]),
              email: String(values[2]),
              display_name: String(values[3]),
              password_hash: String(values[4]),
              google_subject: null,
              status: "active"
            };
            throw Object.assign(new Error("getaddrinfo ENOTFOUND banco"), {
              code: "ENOTFOUND"
            });
          }
          throw Object.assign(new Error("duplicate key"), { code: "23505" });
        }
        if (text.includes("app.find_account_by_email")) {
          return { rows: storedAccount === undefined ? [] : ([storedAccount] as T[]) };
        }
        if (text.includes("app.create_auth_session")) return { rows: [] as T[] };
        throw new Error(`Consulta inesperada: ${text}`);
      }
    } as unknown as Parameters<typeof createPostgresAccountAuth>[0];

    const auth = createPostgresAccountAuth(pool, { wait: async () => undefined });
    await expect(
      auth.register({
        displayName: "Cadastro Recuperado",
        email: "recuperado@example.test",
        password: "senha sintética recuperada"
      })
    ).resolves.toMatchObject({ account: { email: "recuperado@example.test" } });
    expect(createAttempts).toBe(2);
  });

  it("limita as tentativas temporárias e devolve indisponibilidade clara", async () => {
    let attempts = 0;
    const pool = {
      async query() {
        attempts += 1;
        throw new AggregateError(
          [
            Object.assign(new Error("Connection terminated due to connection timeout"), {
              code: "ETIMEDOUT"
            })
          ],
          "conexão temporária"
        );
      }
    } as unknown as Parameters<typeof createPostgresAccountAuth>[0];
    const accountAuth = createPostgresAccountAuth(pool, {
      attempts: 3,
      wait: async () => undefined
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        displayName: "Conta Temporária",
        email: "temporaria@example.test",
        password: "senha sintética temporária"
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message: "O acesso está temporariamente indisponível. Aguarde um instante e tente novamente."
    });
    expect(response.body).not.toContain("connection");
    expect(response.body).not.toContain("banco");
    expect(attempts).toBe(3);
    await app.close();
  });

  it("preserva o erro de autenticação ao atravessar módulos carregados separadamente", async () => {
    const delegate = createInMemoryAccountAuth();
    const accountAuth = {
      ...delegate,
      async login() {
        throw Object.assign(new Error("E-mail ou senha inválidos."), {
          name: "AccountAuthError",
          code: "invalid_credentials"
        });
      }
    };
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "modulo-separado@example.test",
        password: "senha sintética separada"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "E-mail ou senha inválidos." });
    await app.close();
  });

  it("não repete uma duplicidade real de e-mail", async () => {
    let createAttempts = 0;
    const pool = {
      async query<T>(text: string) {
        if (text.includes("app.create_account")) {
          createAttempts += 1;
          throw Object.assign(new Error("duplicate key"), { code: "23505" });
        }
        if (text.includes("app.find_account_by_email")) {
          return {
            rows: [
              {
                user_id: "00000000-0000-4000-8000-000000000099",
                auth_subject: "outra-conta",
                email: "existente@example.test",
                display_name: "Outra Conta",
                password_hash: "hash",
                google_subject: null,
                status: "active"
              }
            ] as T[]
          };
        }
        throw new Error(`Consulta inesperada: ${text}`);
      }
    } as unknown as Parameters<typeof createPostgresAccountAuth>[0];
    const auth = createPostgresAccountAuth(pool, { wait: async () => undefined });

    await expect(
      auth.register({
        displayName: "Nova Conta",
        email: "existente@example.test",
        password: "senha sintética existente"
      })
    ).rejects.toMatchObject({ code: "email_taken" });
    expect(createAttempts).toBe(1);
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

  it("mantém a configuração pública quando um cookie antigo não pode ser validado", async () => {
    const delegate = createInMemoryAccountAuth();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: {
        ...delegate,
        async authenticate() {
          throw new Error("sessão indisponível");
        }
      }
    });
    await app.ready();
    const headers = { cookie: "conselheiro_session=token-antigo" };

    const [health, runtime] = await Promise.all([
      app.inject({ method: "GET", url: "/health", headers }),
      app.inject({ method: "GET", url: "/v1/runtime", headers })
    ]);

    expect(health.statusCode).toBe(200);
    expect(runtime.statusCode).toBe(200);
    expect(runtime.json()).toMatchObject({ authMode: "real" });
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
