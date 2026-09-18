import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createInMemoryAccountAuth } from "../../apps/api/identity/account-auth.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import {
  createGoogleOAuthClient,
  createGoogleOAuthFromEnvironment,
  googleOAuthStatesMatch,
  readGoogleOAuthState,
  serializeGoogleOAuthStateCookie
} from "../../apps/api/identity/google-oauth.js";

const googleProfile = {
  subject: "google-subject-123",
  email: "sindico.google@example.test",
  displayName: "Síndico Google"
} as const;

describe("login Google", () => {
  it("monta a autorização e valida o perfil verificado pelo Google", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: googleProfile.subject,
            email: googleProfile.email,
            email_verified: true,
            name: googleProfile.displayName
          }),
          { status: 200 }
        )
      );
    const client = createGoogleOAuthClient(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://127.0.0.1:5173/v1/auth/google/callback",
        successRedirectUri: "http://127.0.0.1:5173/"
      },
      fetchImpl
    );

    const authorization = new URL(client.createAuthorizationUrl("state-value"));
    expect(authorization.origin).toBe("https://accounts.google.com");
    expect(authorization.searchParams.get("client_id")).toBe("client-id");
    expect(authorization.searchParams.get("response_type")).toBe("code");
    expect(authorization.searchParams.get("state")).toBe("state-value");
    expect(authorization.searchParams.get("scope")).toContain("openid");
    await expect(client.exchangeAuthorizationCode("code-value")).resolves.toEqual(googleProfile);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("recusa perfil sem e-mail verificado e exige os três segredos/configurações", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "subject",
            email: "unverified@example.test",
            email_verified: false
          }),
          { status: 200 }
        )
      );
    const client = createGoogleOAuthClient(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://127.0.0.1:5173/v1/auth/google/callback",
        successRedirectUri: "http://127.0.0.1:5173/"
      },
      fetchImpl
    );
    await expect(client.exchangeAuthorizationCode("code-value")).rejects.toThrow(
      "Não foi possível validar"
    );
    expect(
      createGoogleOAuthFromEnvironment({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REDIRECT_URI: "http://127.0.0.1:5173/v1/auth/google/callback"
      })
    ).toBeDefined();
    expect(createGoogleOAuthFromEnvironment({ GOOGLE_CLIENT_ID: "client-id" })).toBeUndefined();
    expect(googleOAuthStatesMatch("abc", "abc")).toBe(true);
    expect(googleOAuthStatesMatch("abc", "abd")).toBe(false);
    expect(readGoogleOAuthState(serializeGoogleOAuthStateCookie("abc", false))).toBe("abc");
  });

  it("faz login, cria a conta sem condomínio automático e protege o state", async () => {
    const googleOAuth = {
      successRedirectUri: "http://127.0.0.1:5173/",
      createAuthorizationUrl: vi.fn(
        (state: string) => `https://accounts.google.com/auth?state=${state}`
      ),
      exchangeAuthorizationCode: vi.fn(async () => googleProfile)
    };
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth(),
      googleOAuth
    });
    await app.ready();

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.json()).toMatchObject({ authMode: "real", googleAuthEnabled: true });

    const start = await app.inject({ method: "GET", url: "/v1/auth/google" });
    expect(start.statusCode).toBe(302);
    const stateCookie = String(start.headers["set-cookie"]).split(";")[0];
    const state = readGoogleOAuthState(stateCookie);
    expect(state).toBeDefined();

    const callback = await app.inject({
      method: "GET",
      url: `/v1/auth/google/callback?code=google-code&state=${encodeURIComponent(state ?? "")}`,
      headers: { cookie: stateCookie }
    });
    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe("http://127.0.0.1:5173/");
    const sessionCookie = String(callback.headers["set-cookie"])
      .split(",")
      .find((cookie) => cookie.includes("conselheiro_session="))
      ?.split(";")[0];
    expect(sessionCookie).toBeDefined();

    const session = await app.inject({
      method: "GET",
      url: "/v1/auth/session",
      headers: { cookie: sessionCookie }
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().user).toMatchObject({ email: googleProfile.email });

    const rejected = await app.inject({
      method: "GET",
      url: "/v1/auth/google/callback?code=google-code&state=wrong",
      headers: { cookie: stateCookie }
    });
    expect(rejected.statusCode).toBe(302);
    expect(rejected.headers.location).toContain("auth_error=google_state");
    expect(googleOAuth.exchangeAuthorizationCode).toHaveBeenCalledOnce();
    await app.close();
  });

  it("mantém o botão indisponível com resposta explícita quando OAuth não foi configurado", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: createInMemoryAccountAuth()
    });
    await app.ready();
    const response = await app.inject({ method: "GET", url: "/v1/auth/google" });
    expect(response.statusCode).toBe(503);
    expect(response.json().message).toContain("não está configurado");
    await app.close();
  });

  it("registra a identidade Google no banco sem grant direto às tabelas", async () => {
    const migration = await readFile(
      "infrastructure/database/013_google_oauth_identity.sql",
      "utf8"
    );
    expect(migration).toContain("google_subject");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.find_or_create_google_account");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION app.find_or_create_google_account");
    expect(migration).not.toContain("GRANT INSERT ON app.users");
  });
});
