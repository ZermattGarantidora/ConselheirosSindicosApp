import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import {
  createAccountActionDeliveryFromEnvironment,
  createDevelopmentAccountActionDelivery,
  type AccountActionDelivery
} from "../../apps/api/identity/account-action-delivery.js";
import {
  createRecoveryCodes,
  createSecretCipher,
  createTotpCode,
  createTotpSecret,
  verifyTotpCode
} from "../../apps/api/identity/account-security-crypto.js";
import type { AccountAction } from "../../apps/api/identity/account-security.js";
import { createInMemoryAccountSecurityBundle } from "../../apps/api/identity/in-memory-account-security.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

const accountInput = Object.freeze({
  displayName: "Gestora Sintética",
  email: "seguranca@example.test",
  password: "senha sintética inicial"
});

function firstSetCookie(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(";", 1)[0] ?? "";
}

function createSyntheticExternalEmailDelivery(baseUrl: string): AccountActionDelivery {
  const preview = createDevelopmentAccountActionDelivery(baseUrl);
  return Object.freeze({
    channel: "external_email",
    deliver: (action: AccountAction) => preview.deliver(action)
  });
}

async function verifiedAccount() {
  const bundle = createInMemoryAccountSecurityBundle();
  const registration = await bundle.accountSecurity.register(accountInput);
  await bundle.accountSecurity.confirmEmail(registration.action.token);
  return { ...bundle, registration };
}

describe("segurança e recuperação da conta", () => {
  it("gera e valida TOTP, cifra segredos e cria códigos de recuperação", () => {
    const secret = createTotpSecret();
    const now = new Date("2026-10-08T12:00:00.000Z");
    const code = createTotpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/u);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(verifyTotpCode(secret, "000000", now)).toBe(code === "000000");

    const cipher = createSecretCipher("11".repeat(32));
    const encrypted = cipher.seal(secret);
    expect(encrypted).not.toContain(secret);
    expect(cipher.open(encrypted)).toBe(secret);
    expect(() => createSecretCipher("curta")).toThrow(/32 bytes/u);

    const recoveryCodes = createRecoveryCodes();
    expect(recoveryCodes).toHaveLength(8);
    expect(new Set(recoveryCodes).size).toBe(8);
    expect(recoveryCodes.every((value) => /^[A-F\d]{4}(?:-[A-F\d]{4}){3}$/u.test(value))).toBe(
      true
    );
  });

  it("exige e-mail verificado e consome o token uma única vez", async () => {
    const { accountSecurity } = createInMemoryAccountSecurityBundle();
    const registration = await accountSecurity.register(accountInput);

    await expect(
      accountSecurity.login({
        email: accountInput.email,
        password: accountInput.password,
        deviceLabel: "Chrome em Windows"
      })
    ).rejects.toMatchObject({ code: "email_unverified" });

    await expect(accountSecurity.confirmEmail(registration.action.token)).resolves.toBeUndefined();
    await expect(accountSecurity.confirmEmail(registration.action.token)).rejects.toMatchObject({
      code: "invalid_token"
    });

    await expect(
      accountSecurity.login({
        email: accountInput.email,
        password: accountInput.password,
        deviceLabel: "Chrome em Windows"
      })
    ).resolves.toMatchObject({ mfaRequired: false });
  });

  it("não enumera conta ao solicitar verificação ou recuperação", async () => {
    const { accountSecurity } = createInMemoryAccountSecurityBundle();
    await accountSecurity.register(accountInput);
    await expect(
      accountSecurity.requestEmailVerification("ausente@example.test")
    ).resolves.toBeUndefined();
    await expect(
      accountSecurity.requestPasswordReset("ausente@example.test")
    ).resolves.toBeUndefined();
  });

  it("redefine senha, consome o token e revoga todas as sessões", async () => {
    const { accountAuth, accountSecurity } = await verifiedAccount();
    const first = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Chrome em Windows"
    });
    if (first.mfaRequired) throw new Error("MFA não deveria estar ativo.");

    const reset = await accountSecurity.requestPasswordReset(accountInput.email);
    expect(reset).toBeDefined();
    await accountSecurity.resetPassword(reset?.token ?? "", "senha sintética redefinida");

    await expect(accountAuth.authenticate(first.token)).resolves.toBeUndefined();
    await expect(
      accountSecurity.login({
        email: accountInput.email,
        password: accountInput.password,
        deviceLabel: "Firefox em Linux"
      })
    ).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(
      accountSecurity.resetPassword(reset?.token ?? "", "outra senha sintética")
    ).rejects.toMatchObject({
      code: "invalid_token"
    });
    await expect(
      accountSecurity.login({
        email: accountInput.email,
        password: "senha sintética redefinida",
        deviceLabel: "Firefox em Linux"
      })
    ).resolves.toMatchObject({ mfaRequired: false });
  });

  it("troca a senha mantendo apenas a sessão atual", async () => {
    const { accountAuth, accountSecurity } = await verifiedAccount();
    const current = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Chrome em Windows"
    });
    const other = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Safari em iOS"
    });
    if (current.mfaRequired || other.mfaRequired) throw new Error("MFA inesperado.");

    await accountSecurity.changePassword(
      current.token,
      accountInput.password,
      "senha sintética alterada"
    );
    await expect(accountAuth.authenticate(current.token)).resolves.toBeDefined();
    await expect(accountAuth.authenticate(other.token)).resolves.toBeUndefined();
  });

  it("ativa MFA, exige desafio e consome código de recuperação uma vez", async () => {
    const { accountSecurity } = await verifiedAccount();
    const firstLogin = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Chrome em Windows"
    });
    if (firstLogin.mfaRequired) throw new Error("MFA inesperado.");

    const setup = await accountSecurity.beginMfaSetup(firstLogin.token);
    const activationCode = createTotpCode(setup.secret);
    const enabled = await accountSecurity.enableMfa(firstLogin.token, activationCode);
    expect(enabled.recoveryCodes).toHaveLength(8);
    await expect(accountSecurity.getStatus(firstLogin.token)).resolves.toEqual({
      emailVerified: true,
      mfaEnabled: true
    });
    await expect(accountSecurity.beginMfaSetup(firstLogin.token)).rejects.toMatchObject({
      code: "invalid_mfa"
    });

    const challenged = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Firefox em Linux"
    });
    expect(challenged.mfaRequired).toBe(true);
    if (!challenged.mfaRequired) throw new Error("Desafio MFA esperado.");
    await expect(
      accountSecurity.completeMfaChallenge(challenged.challengeId, "111111")
    ).rejects.toMatchObject({ code: "invalid_mfa" });
    await expect(
      accountSecurity.completeMfaChallenge(challenged.challengeId, createTotpCode(setup.secret))
    ).resolves.toMatchObject({ mfaRequired: false });

    const recoveryChallenge = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Safari em iOS"
    });
    if (!recoveryChallenge.mfaRequired) throw new Error("Desafio MFA esperado.");
    const recoveryCode = enabled.recoveryCodes[0] ?? "";
    await expect(
      accountSecurity.completeMfaChallenge(recoveryChallenge.challengeId, recoveryCode)
    ).resolves.toMatchObject({ mfaRequired: false });

    const reusedChallenge = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Safari em iOS"
    });
    if (!reusedChallenge.mfaRequired) throw new Error("Desafio MFA esperado.");
    await expect(
      accountSecurity.completeMfaChallenge(reusedChallenge.challengeId, recoveryCode)
    ).rejects.toMatchObject({ code: "invalid_mfa" });
  });

  it("bloqueia o desafio depois de cinco códigos MFA inválidos", async () => {
    const { accountSecurity } = await verifiedAccount();
    const firstLogin = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Chrome em Windows"
    });
    if (firstLogin.mfaRequired) throw new Error("MFA inesperado.");
    const setup = await accountSecurity.beginMfaSetup(firstLogin.token);
    await accountSecurity.enableMfa(firstLogin.token, createTotpCode(setup.secret));
    const challenged = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Firefox em Linux"
    });
    if (!challenged.mfaRequired) throw new Error("Desafio MFA esperado.");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        accountSecurity.completeMfaChallenge(challenged.challengeId, "111111")
      ).rejects.toMatchObject({ code: "invalid_mfa" });
    }
    await expect(
      accountSecurity.completeMfaChallenge(challenged.challengeId, createTotpCode(setup.secret))
    ).rejects.toMatchObject({ code: "invalid_mfa" });
  });

  it("lista somente sessões da conta e permite revogar outra ou a atual", async () => {
    const { accountAuth, accountSecurity } = await verifiedAccount();
    const current = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Chrome em Windows"
    });
    const other = await accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Safari em iOS"
    });
    if (current.mfaRequired || other.mfaRequired) throw new Error("MFA inesperado.");
    const sessions = await accountSecurity.listSessions(current.token);
    expect(sessions.map((session) => session.deviceLabel).sort()).toEqual([
      "Chrome em Windows",
      "Safari em iOS"
    ]);
    const otherSession = sessions.find((session) => !session.current);
    await accountSecurity.revokeSession(current.token, otherSession?.sessionId ?? "");
    await expect(accountAuth.authenticate(other.token)).resolves.toBeUndefined();
    const currentSession = (await accountSecurity.listSessions(current.token)).find(
      (session) => session.current
    );
    await expect(
      accountSecurity.revokeSession(current.token, currentSession?.sessionId ?? "")
    ).resolves.toEqual({ currentRevoked: true });
    await expect(accountAuth.authenticate(current.token)).resolves.toBeUndefined();
  });

  it("expõe o fluxo HTTP com prévia local sem colocar token em log", async () => {
    const bundle = createInMemoryAccountSecurityBundle();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: bundle.accountAuth,
      accountSecurity: bundle.accountSecurity,
      accountActionDelivery: createDevelopmentAccountActionDelivery("http://127.0.0.1:5173/")
    });
    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: accountInput
    });
    expect(registration.statusCode).toBe(202);
    const registrationBody = registration.json<{
      developmentActionUrl: string;
      verificationRequired: boolean;
    }>();
    expect(registrationBody.verificationRequired).toBe(true);
    const token = new URL(registrationBody.developmentActionUrl).searchParams.get("verify_email");
    expect(token).toBeTruthy();

    const confirmation = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email/confirm",
      payload: { token }
    });
    expect(confirmation.statusCode).toBe(204);
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "user-agent": "Synthetic Chrome Windows" },
      payload: { email: accountInput.email, password: accountInput.password }
    });
    expect(login.statusCode).toBe(200);
    expect(login.headers["set-cookie"]).toContain("HttpOnly");
    expect((await app.inject({ method: "GET", url: "/v1/runtime" })).json()).toMatchObject({
      developmentAuthActions: true
    });
    const cookie = firstSetCookie(login.headers["set-cookie"]);
    expect(
      (await app.inject({ method: "GET", url: "/v1/auth/security", headers: { cookie } })).json()
    ).toEqual({
      emailVerified: true,
      mfaEnabled: false,
      mfaEnrollmentAvailable: false
    });
    const setup = await app.inject({
      method: "POST",
      url: "/v1/auth/mfa/setup",
      headers: { cookie }
    });
    expect(setup.statusCode).toBe(503);
    expect(setup.json<{ message: string }>().message).toMatch(/envio real de e-mails/u);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/mfa/enable",
          headers: { cookie },
          payload: { code: "123456" }
        })
      ).statusCode
    ).toBe(503);
    await app.close();
  });

  it("exercita recuperação, troca, MFA e revogação de sessões pelas rotas HTTP", async () => {
    const bundle = createInMemoryAccountSecurityBundle();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: bundle.accountAuth,
      accountSecurity: bundle.accountSecurity,
      accountActionDelivery: createSyntheticExternalEmailDelivery("http://127.0.0.1:5173/")
    });
    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: accountInput
    });
    expect((await app.inject({ method: "GET", url: "/v1/runtime" })).json()).toMatchObject({
      developmentAuthActions: false
    });
    const verificationUrl = registration.json<{ developmentActionUrl: string }>()
      .developmentActionUrl;
    await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email/confirm",
      payload: { token: new URL(verificationUrl).searchParams.get("verify_email") }
    });

    const resetRequest = await app.inject({
      method: "POST",
      url: "/v1/auth/password-reset/request",
      payload: { email: accountInput.email }
    });
    expect(resetRequest.statusCode).toBe(202);
    const resetUrl = resetRequest.json<{ developmentActionUrl: string }>().developmentActionUrl;
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/password-reset/confirm",
          payload: {
            token: new URL(resetUrl).searchParams.get("reset_password"),
            password: "senha sintética redefinida"
          }
        })
      ).statusCode
    ).toBe(204);

    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "user-agent": "Synthetic Chrome Windows" },
      payload: { email: accountInput.email, password: "senha sintética redefinida" }
    });
    expect(login.statusCode).toBe(200);
    let cookie = firstSetCookie(login.headers["set-cookie"]);
    expect(cookie).toContain("conselheiro_session=");

    const initialStatus = await app.inject({
      method: "GET",
      url: "/v1/auth/security",
      headers: { cookie }
    });
    expect(initialStatus.json()).toEqual({
      emailVerified: true,
      mfaEnabled: false,
      mfaEnrollmentAvailable: true
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/password/change",
          headers: { cookie },
          payload: {
            currentPassword: "senha sintética redefinida",
            newPassword: "senha sintética alterada"
          }
        })
      ).statusCode
    ).toBe(204);

    const setupResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/mfa/setup",
      headers: { cookie }
    });
    expect(setupResponse.statusCode).toBe(200);
    const setup = setupResponse.json<{ secret: string }>();
    const enableResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/mfa/enable",
      headers: { cookie },
      payload: { code: createTotpCode(setup.secret) }
    });
    expect(enableResponse.statusCode).toBe(200);
    expect(enableResponse.json<{ recoveryCodes: string[] }>().recoveryCodes).toHaveLength(8);

    const challengedLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "user-agent": "Synthetic Firefox Linux" },
      payload: { email: accountInput.email, password: "senha sintética alterada" }
    });
    expect(challengedLogin.statusCode).toBe(202);
    const challengeId = challengedLogin.json<{ challengeId: string }>().challengeId;
    const completedChallenge = await app.inject({
      method: "POST",
      url: "/v1/auth/mfa/challenge",
      payload: { challengeId, code: createTotpCode(setup.secret) }
    });
    expect(completedChallenge.statusCode).toBe(200);
    cookie = firstSetCookie(completedChallenge.headers["set-cookie"]);

    const sessions = await app.inject({
      method: "GET",
      url: "/v1/auth/sessions",
      headers: { cookie }
    });
    expect(sessions.statusCode).toBe(200);
    expect(
      sessions.json<{ sessions: { sessionId: string; current: boolean }[] }>().sessions
    ).toHaveLength(2);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/sessions/revoke-others",
          headers: { cookie }
        })
      ).statusCode
    ).toBe(204);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/mfa/disable",
          headers: { cookie },
          payload: {
            password: "senha sintética alterada",
            code: createTotpCode(setup.secret)
          }
        })
      ).statusCode
    ).toBe(204);

    const currentSessions: { sessionId: string; current: boolean }[] = (
      await app.inject({ method: "GET", url: "/v1/auth/sessions", headers: { cookie } })
    ).json<{ sessions: { sessionId: string; current: boolean }[] }>().sessions;
    const current = currentSessions.find((session) => session.current);
    const revoked = await app.inject({
      method: "DELETE",
      url: `/v1/auth/sessions/${current?.sessionId ?? "missing"}`,
      headers: { cookie }
    });
    expect(revoked.json()).toEqual({ currentRevoked: true });
    expect(
      (await app.inject({ method: "GET", url: "/v1/auth/security", headers: { cookie } }))
        .statusCode
    ).toBe(401);
    await app.close();
  });

  it("preserva desafio e desativação de MFA já ativo durante o adiamento", async () => {
    const bundle = await verifiedAccount();
    const initialLogin = await bundle.accountSecurity.login({
      email: accountInput.email,
      password: accountInput.password,
      deviceLabel: "Preparação sintética"
    });
    if (initialLogin.mfaRequired) throw new Error("MFA inesperado antes da preparação.");
    const setup = await bundle.accountSecurity.beginMfaSetup(initialLogin.token);
    await bundle.accountSecurity.enableMfa(initialLogin.token, createTotpCode(setup.secret));

    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: bundle.accountAuth,
      accountSecurity: bundle.accountSecurity,
      accountActionDelivery: createDevelopmentAccountActionDelivery("http://127.0.0.1:5173/")
    });
    const challengedLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: accountInput.email, password: accountInput.password }
    });
    expect(challengedLogin.statusCode).toBe(202);
    const challengeId = challengedLogin.json<{ challengeId: string }>().challengeId;
    const completed = await app.inject({
      method: "POST",
      url: "/v1/auth/mfa/challenge",
      payload: { challengeId, code: createTotpCode(setup.secret) }
    });
    expect(completed.statusCode).toBe(200);
    const cookie = firstSetCookie(completed.headers["set-cookie"]);
    expect(
      (await app.inject({ method: "GET", url: "/v1/auth/security", headers: { cookie } })).json()
    ).toEqual({
      emailVerified: true,
      mfaEnabled: true,
      mfaEnrollmentAvailable: false
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/mfa/disable",
          headers: { cookie },
          payload: {
            password: accountInput.password,
            code: createTotpCode(setup.secret)
          }
        })
      ).statusCode
    ).toBe(204);
    await app.close();
  });

  it("mantém a entrega de ações limitada ao desenvolvimento", () => {
    expect(createAccountActionDeliveryFromEnvironment({})).toBeUndefined();
    expect(
      createAccountActionDeliveryFromEnvironment({ AUTH_EMAIL_DELIVERY: "disabled" })
    ).toBeUndefined();
    expect(
      createAccountActionDeliveryFromEnvironment({
        AUTH_EMAIL_DELIVERY: "development",
        AUTH_PUBLIC_BASE_URL: "http://127.0.0.1:5173/"
      })?.channel
    ).toBe("development_preview");
    expect(() =>
      createAccountActionDeliveryFromEnvironment({ AUTH_EMAIL_DELIVERY: "provider-inexistente" })
    ).toThrow(/somente 'development'/u);
    expect(() =>
      createAccountActionDeliveryFromEnvironment({
        APP_ENV: "production",
        AUTH_EMAIL_DELIVERY: "development"
      })
    ).toThrow(/não pode ser ativada em produção/u);
  });

  it("fecha as rotas de segurança quando o serviço não está configurado", async () => {
    const bundle = createInMemoryAccountSecurityBundle();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: bundle.accountAuth
    });
    const requests = [
      {
        method: "POST",
        url: "/v1/auth/verify-email/request",
        payload: { email: accountInput.email }
      },
      { method: "POST", url: "/v1/auth/verify-email/confirm", payload: { token: "x".repeat(40) } },
      {
        method: "POST",
        url: "/v1/auth/password-reset/request",
        payload: { email: accountInput.email }
      },
      {
        method: "POST",
        url: "/v1/auth/password-reset/confirm",
        payload: { token: "x".repeat(40), password: accountInput.password }
      },
      {
        method: "POST",
        url: "/v1/auth/mfa/challenge",
        payload: { challengeId: "x".repeat(40), code: "123456" }
      },
      { method: "POST", url: "/v1/auth/mfa/setup" },
      { method: "POST", url: "/v1/auth/mfa/enable", payload: { code: "123456" } },
      {
        method: "POST",
        url: "/v1/auth/mfa/disable",
        payload: { password: accountInput.password, code: "123456" }
      },
      { method: "GET", url: "/v1/auth/security" },
      { method: "GET", url: "/v1/auth/sessions" },
      { method: "DELETE", url: "/v1/auth/sessions/1" },
      { method: "POST", url: "/v1/auth/sessions/revoke-others" }
    ] as const;
    for (const request of requests) {
      const response = await app.inject(request);
      expect([401, 404]).toContain(response.statusCode);
    }
    await app.close();
  });

  it("rejeita corpos incompletos e acesso sem sessão nas rotas de segurança", async () => {
    const bundle = createInMemoryAccountSecurityBundle();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accountAuth: bundle.accountAuth,
      accountSecurity: bundle.accountSecurity
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/register",
          payload: accountInput
        })
      ).statusCode
    ).toBe(503);
    const registration = await bundle.accountSecurity.register({
      ...accountInput,
      email: "sem-entrega@example.test"
    });
    const verificationRequest = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email/request",
      payload: { email: "sem-entrega@example.test" }
    });
    expect(verificationRequest.statusCode).toBe(202);
    expect(verificationRequest.json()).not.toHaveProperty("developmentActionUrl");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/password-reset/request",
          payload: { email: "sem-entrega@example.test" }
        })
      ).statusCode
    ).toBe(202);

    for (const url of [
      "/v1/auth/verify-email/request",
      "/v1/auth/verify-email/confirm",
      "/v1/auth/password-reset/request",
      "/v1/auth/password-reset/confirm",
      "/v1/auth/mfa/challenge"
    ]) {
      expect((await app.inject({ method: "POST", url, payload: {} })).statusCode).toBe(400);
    }
    for (const request of [
      { method: "POST", url: "/v1/auth/password/change", payload: {} },
      { method: "POST", url: "/v1/auth/mfa/setup" },
      { method: "POST", url: "/v1/auth/mfa/enable", payload: {} },
      { method: "POST", url: "/v1/auth/mfa/disable", payload: {} },
      { method: "GET", url: "/v1/auth/security" },
      { method: "GET", url: "/v1/auth/sessions" },
      { method: "DELETE", url: "/v1/auth/sessions/1" },
      { method: "POST", url: "/v1/auth/sessions/revoke-others" }
    ] as const) {
      expect((await app.inject(request)).statusCode).toBe(401);
    }
    const fakeCookie = `conselheiro_session=${"z".repeat(43)}`;
    for (const request of [
      { method: "POST", url: "/v1/auth/password/change", payload: {} },
      { method: "POST", url: "/v1/auth/mfa/enable", payload: {} },
      { method: "POST", url: "/v1/auth/mfa/disable", payload: {} }
    ] as const) {
      expect((await app.inject({ ...request, headers: { cookie: fakeCookie } })).statusCode).toBe(
        400
      );
    }
    await expect(
      bundle.accountSecurity.confirmEmail(registration.action.token)
    ).rejects.toMatchObject({
      code: "invalid_token"
    });
    await app.close();
  });

  it("mantém a migration restrita a funções e sem grants diretos", async () => {
    const migration = await readFile("infrastructure/database/027_account_security.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS app.auth_action_tokens");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS app.auth_mfa_challenges");
    expect(migration).toContain("mfa_secret_ciphertext");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("app.revoke_owned_auth_session");
    expect(migration).toContain(
      "REVOKE ALL ON TABLE app.auth_action_tokens, app.auth_mfa_challenges"
    );
    expect(migration).not.toContain("GRANT SELECT ON app.auth_action_tokens");
  });

  it("não permite que novo setup derrube um MFA já ativo no banco", async () => {
    const migration = await readFile(
      "infrastructure/database/028_preserve_active_mfa_setup.sql",
      "utf8"
    );
    expect(migration).toContain("users.mfa_enabled_at IS NULL");
    expect(migration).toContain("users.status = 'active'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION app.set_pending_mfa_secret");
  });

  it("atualiza a atividade do dispositivo quando a sessão é autenticada", async () => {
    const migration = await readFile(
      "infrastructure/database/029_track_account_session_activity.sql",
      "utf8"
    );
    expect(migration).toContain("SET last_seen_at = GREATEST");
    expect(migration).toContain("sessions.token_hash = p_token_hash");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("REVOKE ALL ON FUNCTION app.resolve_auth_session");
  });
});
