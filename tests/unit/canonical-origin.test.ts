import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalRedirectLocation,
  canonicalOriginFromEnvironment,
  registerCanonicalOrigin
} from "../../apps/api/app/canonical-origin.js";

const environment = {
  PUBLIC_APP_ORIGIN: "https://alvitra.app",
  PUBLIC_APP_ALIASES: "www.alvitra.app,alvitraapp.com,www.alvitraapp.com"
};
const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function application(config: NodeJS.ProcessEnv = environment) {
  const app = Fastify();
  apps.push(app);
  registerCanonicalOrigin(app, canonicalOriginFromEnvironment(config));
  app.all("/*", async () => ({ reached: true }));
  return app;
}

describe("AC-6910 — domínio principal e aliases", () => {
  it.each(["GET", "POST"] as const)("redireciona %s antes de executar a rota", async (method) => {
    const app = application();
    const response = await app.inject({
      method,
      url: "/conversas?pagina=2&busca=ata%20de%20assembleia",
      headers: { host: "alvitraapp.com", "x-forwarded-host": "attacker.invalid" }
    });
    expect(response.statusCode).toBe(308);
    expect(response.headers.location).toBe(
      "https://alvitra.app/conversas?pagina=2&busca=ata%20de%20assembleia"
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).not.toContain("reached");
  });

  it.each(["www.alvitra.app", "www.alvitraapp.com", "ALVITRAAPP.COM:443"])(
    "reconhece somente alias explícito %s",
    async (host) => {
      const response = await application().inject({ url: "/", headers: { host } });
      expect(response.statusCode).toBe(308);
      expect(response.headers.location).toBe("https://alvitra.app/");
    }
  );

  it.each([
    "alvitra.app",
    "attacker.invalid",
    "alvitraapp.com.attacker.invalid",
    "alvitraapp.com:80"
  ])("não redireciona host principal ou não autorizado %s", async (host) => {
    const response = await application().inject({
      url: "/",
      headers: { host, "x-forwarded-host": "alvitraapp.com" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers.location).toBeUndefined();
    expect(response.json()).toEqual({ reached: true });
  });

  it("mantém o health check no alias e ignora a ausência de Host", async () => {
    const app = application();
    for (const request of [
      { url: "/health?probe=1", headers: { host: "alvitraapp.com" } },
      { url: "/", headers: {}, autoHeaders: { host: false } }
    ]) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(200);
      expect(response.headers.location).toBeUndefined();
    }
  });

  it("recusa caminho iniciado em // sem Location externo", async () => {
    const response = await application().inject({
      url: "//attacker.invalid/path",
      headers: { host: "alvitraapp.com" }
    });
    expect(response.statusCode).toBe(400);
    expect(response.headers.location).toBeUndefined();
    expect(response.json()).toEqual({ code: "invalid_redirect_path" });
  });

  it("continua na origem fixa quando o transporte normaliza barras invertidas", async () => {
    const response = await application().inject({
      url: "/\\attacker.invalid/path",
      headers: { host: "alvitraapp.com" }
    });
    expect(response.statusCode).toBe(308);
    expect(response.headers.location).toBe("https://alvitra.app/path");
  });

  it.each([
    "//attacker.invalid/path",
    "/\\attacker.invalid/path",
    "https://attacker.invalid/path",
    "/path\r\nLocation:https://attacker.invalid",
    "/path with spaces",
    `/path${String.fromCharCode(0)}`,
    `/path${String.fromCharCode(127)}`
  ])("recusa request-target bruto hostil antes de construir Location: %s", (target) => {
    expect(
      canonicalRedirectLocation(canonicalOriginFromEnvironment(environment)!, target)
    ).toBeUndefined();
  });

  it("mantém comportamento atual sem configuração ou sem aliases", async () => {
    for (const config of [{}, { PUBLIC_APP_ORIGIN: environment.PUBLIC_APP_ORIGIN }]) {
      const response = await application(config).inject({
        url: "/",
        headers: { host: "alvitraapp.com" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers.location).toBeUndefined();
    }
  });

  it("normaliza maiúsculas e espaços da configuração", () => {
    const configuration = canonicalOriginFromEnvironment({
      PUBLIC_APP_ORIGIN: " https://ALVITRA.APP/ ",
      PUBLIC_APP_ALIASES: " ALVITRAAPP.COM, www.alvitraapp.com "
    });
    expect(configuration?.origin).toBe("https://alvitra.app");
    expect([...configuration!.aliases]).toEqual(["alvitraapp.com", "www.alvitraapp.com"]);
  });

  it.each([
    "http://alvitra.app",
    "https://synthetic-user:synthetic-secret@alvitra.app",
    "https://alvitra.app:444",
    "https://alvitra.app/path",
    "https://alvitra.app/?query=1",
    "https://alvitra.app/#fragment",
    "https://localhost",
    "https://-invalid.app",
    "https://invalid-.app",
    `https://${"a".repeat(64)}.app`,
    `https://${Array.from({ length: 5 }, () => "a".repeat(60)).join(".")}`,
    "invalid-origin"
  ])("recusa origem inválida sem expor configuração: %s", (origin) => {
    expect(() =>
      canonicalOriginFromEnvironment({ ...environment, PUBLIC_APP_ORIGIN: origin })
    ).toThrow(/^Configuração de domínio público inválida\.$/u);
  });

  it.each([
    "https://alvitraapp.com",
    "alvitraapp.com:443",
    "*.alvitraapp.com",
    "alvitra.app",
    "alvitraapp.com,ALVITRAAPP.COM",
    "alvitraapp.com,",
    "a..app"
  ])("recusa alias inválido: %s", (aliases) => {
    expect(() =>
      canonicalOriginFromEnvironment({ ...environment, PUBLIC_APP_ALIASES: aliases })
    ).toThrow(/^Configuração de domínio público inválida\.$/u);
  });

  it("recusa aliases sem origem, sem inferir destino do pedido", () => {
    expect(() => canonicalOriginFromEnvironment({ PUBLIC_APP_ALIASES: "alvitraapp.com" })).toThrow(
      /^Configuração de domínio público inválida\.$/u
    );
  });
});
