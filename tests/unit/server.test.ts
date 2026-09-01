import { describe, expect, it } from "vitest";

import { startServer } from "../../apps/api/app/server.js";

describe("servidor local", () => {
  it("inicia em loopback com porta efêmera", async () => {
    const app = await startServer(0);

    expect(app.server.listening).toBe(true);
    await app.close();
  });
});
