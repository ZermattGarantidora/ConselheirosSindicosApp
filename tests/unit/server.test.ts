import { describe, expect, it } from "vitest";

import { startServer } from "../../apps/api/app/server.js";

describe("servidor local", () => {
  it("inicia a demonstração somente quando ela é pedida explicitamente", async () => {
    const app = await startServer(0, { DEMO_MODE: "true" });

    expect(app.server.listening).toBe(true);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ authMode: "development" });
    await app.close();
  });

  it("recusa iniciar sem banco quando a demonstração não foi pedida", async () => {
    await expect(startServer(0, {})).rejects.toThrow(
      "DATABASE_URL é obrigatória para iniciar o site real"
    );
  });

  it("liga os adaptadores persistidos quando DATABASE_URL está configurado", async () => {
    const app = await startServer(0, {
      DATABASE_URL: "postgresql://postgres:senha-sintetica@127.0.0.1:5432/conselheiro"
    });

    await expect(app.inject({ method: "GET", url: "/health" })).resolves.toMatchObject({
      statusCode: 200
    });
    await app.close();
  });
});
