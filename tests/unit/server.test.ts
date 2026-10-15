import { describe, expect, it } from "vitest";

import { startServer } from "../../apps/api/app/server.js";

describe("servidor local", () => {
  it("inicia a demonstração somente quando ela é pedida explicitamente", async () => {
    const app = await startServer(0, { DEMO_MODE: "true" });

    expect(app.server.listening).toBe(true);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development" });
    const documents = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(documents.statusCode).toBe(200);
    expect(documents.json()).toMatchObject({ documents: [] });
    await app.close();
  });

  it("mantém a demonstração isolada mesmo quando existe uma URL de banco no ambiente local", async () => {
    const app = await startServer(0, {
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://postgres:senha-sintetica@127.0.0.1:1/conselheiro",
      GEMINI_API_KEY: "chave-sintetica-que-nao-deve-ser-usada"
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development", aiProvider: "local" });
    const answer = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers: { "x-development-user-id": "sindico-demo" },
      payload: { question: "Olá" }
    });
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({
      answer: "Olá! Sou a Alvitra, sua conselheira documental.",
      answerMode: "abstained"
    });
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
      AUTH_ACCOUNT_SECRET_KEY: "11".repeat(32)
    });

    await expect(app.inject({ method: "GET", url: "/health" })).resolves.toMatchObject({
      statusCode: 200
    });
    await app.close();
  });
});
