import { describe, expect, it } from "vitest";

import { startServer } from "../../apps/api/app/server.js";

describe("servidor local", () => {
  it("inicia em loopback com porta efêmera", async () => {
    const app = await startServer(0);

    expect(app.server.listening).toBe(true);
    await app.close();
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
