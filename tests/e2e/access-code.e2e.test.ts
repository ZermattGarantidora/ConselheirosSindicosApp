import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApi } from "../../apps/api/app/create-api.js";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

const resources: { app: FastifyInstance; directory: string }[] = [];
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-access-e2e-"));
  const service = await createLocalAccessCodeService(directory);
  const registry = createDevelopmentIdentityRepository();
  const app = createApi({
    membershipRepository: registry,
    developmentMembershipRegistry: registry,
    accessCodeAuth: service,
    secureCookies: true
  });
  resources.push({ app, directory });
  return { app, service };
}
afterEach(async () => {
  for (const { app, directory } of resources.splice(0)) {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
const cookieOf = (response: { headers: Record<string, unknown> }): string =>
  String(response.headers["set-cookie"]).split(";")[0]!;

describe("entrada por código e aparelhos", () => {
  it("AC-6807/6808: falha de armazenamento não confirma nem limpa sessão e nunca revela detalhes", async () => {
    const { app, service } = await setup();
    const code = await service.provision("sindico-demo");
    const login = await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } });
    const cookie = cookieOf(login);
    const privateFailure = new Error("canario-sintetico-privado-nao-expor");
    const loginFailure = vi.spyOn(service, "login").mockRejectedValue(privateFailure);
    const failedLogin = await app.inject({
      method: "POST",
      url: "/v1/access/login",
      payload: { code }
    });
    expect(failedLogin.statusCode).toBe(503);
    expect(failedLogin.headers["set-cookie"]).toBeUndefined();
    expect(failedLogin.body).not.toContain(privateFailure.message);
    loginFailure.mockRestore();
    const logoutFailure = vi.spyOn(service, "logout").mockRejectedValue(privateFailure);
    const failedLogout = await app.inject({
      method: "POST",
      url: "/v1/access/logout",
      headers: { cookie }
    });
    expect(failedLogout.statusCode).toBe(503);
    expect(failedLogout.headers["set-cookie"]).toBeUndefined();
    expect(failedLogout.body).not.toContain(privateFailure.message);
    logoutFailure.mockRestore();
    const authFailure = vi.spyOn(service, "authenticate").mockRejectedValue(privateFailure);
    for (const url of ["/v1/access/session", "/v1/access/code", "/v1/chat/bootstrap"]) {
      const failed = await app.inject({ url, headers: { cookie } });
      expect(failed.statusCode).toBe(503);
      expect(failed.body).not.toContain(privateFailure.message);
    }
    authFailure.mockRestore();
    expect((await app.inject({ url: "/v1/access/session", headers: { cookie } })).statusCode).toBe(
      200
    );
    const tooLarge = await app.inject({
      method: "POST",
      url: "/v1/access/login",
      payload: { code: "canario-sintetico".repeat(100) }
    });
    expect(tooLarge.statusCode).toBe(413);
    expect(tooLarge.body).not.toContain("canario-sintetico");
  });
  it("AC-6801–6805: conecta dois aparelhos, renova cookie, rejeita identidade forjada e sai somente de um", async () => {
    const { app, service } = await setup();
    const code = await service.provision("sindico-demo");
    const login = await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toEqual({ userId: "sindico-demo" });
    expect(login.headers["set-cookie"]).toContain(
      "HttpOnly; SameSite=Lax; Max-Age=34560000; Secure"
    );
    const cookie = cookieOf(login);
    const other = await app.inject({
      method: "POST",
      url: "/v1/access/login",
      payload: { code },
      remoteAddress: "198.51.100.5"
    });
    const otherCookie = cookieOf(other);
    expect(otherCookie).not.toBe(cookie);
    const own = await app.inject({ url: "/v1/access/code", headers: { cookie } });
    expect(own.json()).toEqual({ code });
    expect(own.headers["cache-control"]).toBe("no-store");
    const restored = await app.inject({
      url: "/v1/access/session",
      headers: { cookie },
      remoteAddress: "203.0.113.25"
    });
    expect(restored.json()).toEqual({ userId: "sindico-demo" });
    expect(restored.headers["set-cookie"]).toContain("Max-Age=34560000");
    expect(
      (
        await app.inject({
          url: "/v1/chat/bootstrap",
          headers: { "x-development-user-id": "sindico-demo" }
        })
      ).statusCode
    ).toBe(401);
    expect(
      (await app.inject({ url: "/v1/access/session", remoteAddress: "203.0.113.25" })).statusCode
    ).toBe(401);
    expect(
      (
        await app.inject({
          url: "/v1/chat/bootstrap",
          headers: { cookie, "x-development-user-id": "forjado" }
        })
      ).statusCode
    ).toBe(200);
    const logout = await app.inject({
      method: "POST",
      url: "/v1/access/logout",
      headers: { cookie }
    });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
    expect((await app.inject({ url: "/v1/access/session", headers: { cookie } })).statusCode).toBe(
      401
    );
    expect(
      (await app.inject({ url: "/v1/access/session", headers: { cookie: otherCookie } })).statusCode
    ).toBe(200);
    await service.provision("sindico-demo");
    expect(
      (await app.inject({ url: "/v1/access/session", headers: { cookie: otherCookie } })).statusCode
    ).toBe(401);
    expect(
      (await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } })).statusCode
    ).toBe(401);
  });
  it("AC-6804: outro código mantém permissões e isolamento por condomínio", async () => {
    const { app, service } = await setup();
    const code = await service.provision("morador-alameda-demo");
    const login = await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } });
    const cookie = cookieOf(login);
    const denied = await app.inject({
      url: "/v1/condominiums/bosque/context",
      headers: { cookie, "x-development-user-id": "sindico-demo" }
    });
    expect(denied.statusCode).toBe(403);
    expect(
      (await app.inject({ url: "/v1/condominiums/alameda/context", headers: { cookie } }))
        .statusCode
    ).toBe(200);
    expect(
      (
        await app.inject({
          url: "/v1/access/code",
          headers: { cookie, "x-development-user-id": "sindico-demo" }
        })
      ).json()
    ).toEqual({ code });
  });
  it("AC-6801/6806: sem cadastro aberto, erros genéricos, CSRF e limite de tentativas", async () => {
    const { app } = await setup();
    for (const url of ["/v1/access/session", "/v1/access/code"])
      expect((await app.inject({ url })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: "POST", url: "/v1/access/provision", payload: {} })).statusCode
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/access/login",
          headers: { "sec-fetch-site": "cross-site" },
          payload: { code: "sintetico" }
        })
      ).statusCode
    ).toBe(403);
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await app.inject({
        method: "POST",
        url: "/v1/access/login",
        payload: { code: "credencial-invalida-sintetica" }
      });
      expect(result.statusCode).toBe(401);
      expect(result.body).not.toContain("credencial-invalida-sintetica");
      expect(result.headers["cache-control"]).toBe("no-store");
    }
    expect(
      (await app.inject({ method: "POST", url: "/v1/access/login", payload: {} })).statusCode
    ).toBe(429);
  });
});
