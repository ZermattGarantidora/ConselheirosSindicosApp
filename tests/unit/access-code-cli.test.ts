import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";
import { createDevelopmentIdentity } from "../../apps/web/development-identity.js";

it("AC-6801/6805: CLI conserva acesso sintético anterior e modo demo prevalece sobre URL de banco", async () => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-code-cli-"));
  try {
    const env = {
      ...process.env,
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://sintetico:nao-usar@127.0.0.1:1/teste",
      ACCESS_CODE_DIRECTORY: directory
    };
    const run = () =>
      promisify(execFile)(
        process.execPath,
        [
          "scripts/run-tsx.mjs",
          "scripts/issue-access-code.ts",
          "--demo-name",
          "acesso-sintetico-cli"
        ],
        { env }
      );
    const first = await run();
    const code = first.stdout.match(/[A-F0-9]{4}(?:-[A-F0-9]{4}){7}/u)![0];
    const service = await createLocalAccessCodeService(directory);
    const session = (await service.login(code))!;
    expect(session.userId).toBe(createDevelopmentIdentity("acesso-sintetico-cli").userId);
    await run();
    expect(await service.login(code)).toBeUndefined();
    expect(await service.authenticate(session.token)).toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
