import { describe, expect, it } from "vitest";

import {
  startSyntheticServer as startServer,
  syntheticAccessHeaders
} from "../fixtures/synthetic-access.js";

describe("servidor local", () => {
  it("AC-6910: aplica domínio antes das rotas e recusa configuração inválida antes do banco", async () => {
    await expect(
      startServer(0, {
        PUBLIC_APP_ORIGIN: "http://alvitra.app",
        DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/unused"
      })
    ).rejects.toThrow("Configuração de domínio público inválida.");
    const app = await startServer(0, {
      DEMO_MODE: "true",
      PUBLIC_APP_ORIGIN: "https://alvitra.app",
      PUBLIC_APP_ALIASES: "alvitraapp.com"
    });
    try {
      const alias = await app.inject({ url: "/", headers: { host: "alvitraapp.com" } });
      expect(alias.statusCode).toBe(308);
      expect(alias.headers.location).toBe("https://alvitra.app/");
      const health = await app.inject({ url: "/health", headers: { host: "alvitraapp.com" } });
      expect(health.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
  it("inicia a demonstração somente quando ela é pedida explicitamente", async () => {
    const app = await startServer(0, { DEMO_MODE: "true" });

    expect(app.server.listening).toBe(true);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development" });
    const documents = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: await syntheticAccessHeaders(app)
    });
    expect(documents.statusCode).toBe(200);
    expect(documents.json()).toMatchObject({ documents: [] });
    await app.close();
  });

  it("mantém a demonstração isolada mesmo quando existe uma URL de banco no ambiente local", async () => {
    const app = await startServer(0, {
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://postgres:senha-sintetica@127.0.0.1:1/conselheiro",
      OPENAI_IMAGE_ANALYSIS_ENABLED: "true",
      OPENAI_IMAGE_BILLING_CONFIRMED: "true"
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development", aiProvider: "local" });
    const answer = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers: await syntheticAccessHeaders(app),
      payload: { question: "Olá" }
    });
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({
      answer: "Olá! Sou a Alvitra, sua conselheira documental.",
      answerMode: "abstained"
    });
    await app.close();
  });

  it("mantém a conversa disponível com Gemini quando OpenAI não está configurada", async () => {
    const app = await startServer(0, {
      DEMO_MODE: "true",
      GEMINI_API_KEY: "synthetic-test-key"
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development", aiProvider: "gemini" });
    await app.close();
  });

  it("respeita a porta atribuída pela hospedagem", async () => {
    const app = await startServer(0, { DEMO_MODE: "true", PORT: "4321", APP_ENV: "production" });

    expect(app.server.address()).toMatchObject({ port: 4321 });
    await app.close();
  });

  it("recusa iniciar sem banco quando a demonstração não foi pedida", async () => {
    await expect(startServer(0, {})).rejects.toThrow(
      "DATABASE_URL é obrigatória para iniciar o site real"
    );
  });

  it("liga os adaptadores persistidos quando DATABASE_URL está configurado", async () => {
    const app = await startServer(0, {
      DATABASE_URL: "postgresql://postgres:senha-sintetica@127.0.0.1:5432/conselheiro",
      OPENAI_API_KEY: "synthetic-test-key",
      AUTH_ACCOUNT_SECRET_KEY: "11".repeat(32)
    });

    await expect(app.inject({ method: "GET", url: "/health" })).resolves.toMatchObject({
      statusCode: 200
    });
    await app.close();
  });

  it("recusa site real sem um provedor generativo em vez de responder com texto sintético", async () => {
    await expect(
      startServer(0, {
        DATABASE_URL: "postgresql://postgres:senha-sintetica@127.0.0.1:5432/conselheiro"
      })
    ).rejects.toThrow("A OpenAI ou a Gemini deve estar configurada para iniciar o site real.");
  });
});
