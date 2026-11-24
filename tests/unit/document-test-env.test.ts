import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { resolveConfig, type UserConfig } from "vite";
import { expect, it, vi } from "vitest";
import documents from "../vitest.pilot-documents.config.js";

async function removeEnvironmentFixture(directory: string): Promise<void> {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-document-env-isolation-")
  )
    throw new Error("Temporário fora do escopo documental.");
  await rm(directory, { recursive: true, force: true });
}

it.each(["documents", "lifecycle"])(
  "AC-7128: configuração %s ignora arquivos de ambiente",
  async (name) => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-document-env-isolation-"));
    try {
      vi.stubEnv("PILOT_LOCAL_REPORT_DIRECTORY", directory);
      vi.stubEnv("PILOT_RECOVERY_CONFIRMATION", "synthetic-local-only");
      const candidate =
        name === "documents"
          ? documents
          : (await import("../vitest.pilot-document-lifecycle.config.js")).default;
      // Owned synthetic canary; never load or inspect workspace environment files.
      await writeFile(
        join(directory, ".env.test.local"),
        "VITE_SYNTHETIC_DOCUMENT_CANARY=FICTICIO-NAO-IMPORTAR\n",
        { flag: "wx" }
      );
      const config = await resolveConfig(
        {
          ...(candidate as UserConfig),
          configFile: false,
          root: directory,
          cacheDir: join(directory, "cache")
        },
        "serve",
        "test"
      );
      expect(config.env.VITE_SYNTHETIC_DOCUMENT_CANARY).toBeUndefined();
      expect(config.envDir).toBe(false);
    } finally {
      vi.unstubAllEnvs();
      await removeEnvironmentFixture(directory);
    }
  }
);
