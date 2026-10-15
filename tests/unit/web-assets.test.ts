import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { registerWebAssets } from "../../apps/api/app/web-assets.js";

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) await rm(directory, { force: true, recursive: true });
  directory = undefined;
});

describe("assets web publicados", () => {
  it("serve o cliente e mantém rotas do navegador na mesma origem", async () => {
    directory = await mkdtemp(join(tmpdir(), "alvitra-web-"));
    await writeFile(join(directory, "index.html"), "<main>Alvitra</main>");
    const app = Fastify();
    registerWebAssets(app, directory);

    await expect(app.inject({ method: "GET", url: "/" })).resolves.toMatchObject({
      statusCode: 200,
      payload: "<main>Alvitra</main>"
    });
    await expect(app.inject({ method: "GET", url: "/conversas/atual" })).resolves.toMatchObject({
      statusCode: 200,
      payload: "<main>Alvitra</main>"
    });
    await app.close();
  });

  it("não permite sair do diretório publicado", async () => {
    directory = await mkdtemp(join(tmpdir(), "alvitra-web-"));
    const app = Fastify();
    registerWebAssets(app, directory);

    await expect(app.inject({ method: "GET", url: "/%2e%2e/package.json" })).resolves.toMatchObject(
      {
        statusCode: 404
      }
    );
    await app.close();
  });
});
