import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAccessCodeRoutes } from "../../apps/api/app/access-code-routes.js";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";

const apps: FastifyInstance[] = [];
const directories: string[] = [];
const time = new Date("2026-11-09T12:00:00Z");
async function setup(directory?: string) {
  const location = directory ?? (await mkdtemp(join(tmpdir(), "alvitra-security-api-")));
  if (!directory) directories.push(location);
  const service = await createLocalAccessCodeService(location);
  const app = Fastify({ logger: false });
  registerAccessCodeRoutes(app, service, true, () => time);
  apps.push(app);
  return { app, service, directory: location };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("abuso de entrada sem chamadas externas", () => {
  it("AC-6813/6814: duas APIs e API reiniciada compartilham limite; header forjado não troca origem", async () => {
    const first = await setup();
    const second = await setup(first.directory);
    for (let index = 0; index < 10; index++) {
      const response = await (index % 2 ? first.app : second.app).inject({
        method: "POST",
        url: "/v1/access/login",
        payload: { code: "sintetico-invalido" },
        headers: { "x-forwarded-for": `198.51.100.${index}` }
      });
      expect(response.statusCode).toBe(401);
    }
    const restarted = await setup(first.directory);
    const login = vi.spyOn(restarted.service, "login");
    const blocked = await restarted.app.inject({
      method: "POST",
      url: "/v1/access/login",
      payload: { code: "nao-ecoar-sintetico" }
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("900");
    expect(blocked.headers["cache-control"]).toBe("no-store");
    expect(blocked.headers["set-cookie"]).toBeUndefined();
    expect(blocked.body).not.toContain("nao-ecoar-sintetico");
    expect(login).not.toHaveBeenCalled();
  });

  it("AC-6814/6815: parsing não evita cota e limite não revoga sessão existente", async () => {
    const { app, service } = await setup();
    const code = await service.provision("sindico-sintetico");
    const login = await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } });
    const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    for (let index = 0; index < 9; index++) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/access/login",
        payload: index % 2 ? "{" : JSON.stringify({ code: "x".repeat(1200) }),
        headers: { "content-type": "application/json" }
      });
      expect(response.statusCode).toBe(index % 2 ? 400 : 413);
    }
    expect(
      (await app.inject({ method: "POST", url: "/v1/access/login", payload: { code } })).statusCode
    ).toBe(429);
    expect((await app.inject({ url: "/v1/access/session", headers: { cookie } })).statusCode).toBe(
      200
    );
  });

  it("AC-6814: cota global bloqueia origem nova antes da credencial", async () => {
    const { app, directory, service } = await setup();
    await writeFile(
      join(directory, "vault.json"),
      JSON.stringify({
        credentials: [],
        sessions: [],
        loginAttempts: [{ key: "global", count: 1000, until: time.getTime() + 900_000 }]
      })
    );
    const login = vi.spyOn(service, "login");
    const response = await app.inject({
      method: "POST",
      url: "/v1/access/login",
      remoteAddress: "198.51.100.55",
      payload: {}
    });
    expect(response.statusCode).toBe(429);
    expect(login).not.toHaveBeenCalled();
    expect(await readFile(join(directory, "vault.json"), "utf8")).not.toContain("198.51.100.55");
  });

  it("AC-6815: falha e corrupção negam login sem cookie nem detalhe privado", async () => {
    const { app, directory, service } = await setup();
    const login = vi.spyOn(service, "login");
    const failure = vi
      .spyOn(service, "consumeLoginAttempt")
      .mockRejectedValue(new Error("canario-privado-sintetico"));
    const response = await app.inject({ method: "POST", url: "/v1/access/login", payload: {} });
    expect(response.statusCode).toBe(503);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.body).not.toContain("canario-privado-sintetico");
    expect(login).not.toHaveBeenCalled();
    failure.mockRestore();
    await writeFile(join(directory, "vault.json"), "corrompido-sintetico");
    const corrupted = await app.inject({ method: "POST", url: "/v1/access/login", payload: {} });
    expect(corrupted.statusCode).toBe(503);
    expect(corrupted.headers["set-cookie"]).toBeUndefined();
    expect(login).not.toHaveBeenCalled();
    expect(await readFile(join(directory, "vault.json"), "utf8")).toBe("corrompido-sintetico");
  });
});
