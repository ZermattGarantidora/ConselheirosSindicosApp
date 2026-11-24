import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { resolveConfig } from "vite";
import { expect, it } from "vitest";

const run = promisify(execFile);
const minimalEnvironment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => /^(PATH|SYSTEMROOT|TEMP|TMP)$/iu.test(name))
  );

it("AC-7009/7012: Vite não carrega arquivo de ambiente automaticamente nos gates operacionais", async () => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-vite-env-"));
  const name = `VITE_ALVITRA_ENV_CANARY_${randomUUID().replaceAll("-", "").toUpperCase()}`;
  const previousDirectory = process.env.PILOT_LOCAL_REPORT_DIRECTORY;
  try {
    process.env.PILOT_LOCAL_REPORT_DIRECTORY = directory;
    // The only env file involved is this newly created synthetic fixture, never the workspace's.
    await writeFile(join(directory, ".env"), `${name}=synthetic-only\n`);
    const control = await resolveConfig(
      { root: directory, configFile: false, logLevel: "silent" },
      "serve",
      "test"
    );
    expect(control.env[name]).toBe("synthetic-only");
    for (const config of [
      "infrastructure/pilot/vitest.operations.config.ts",
      "infrastructure/pilot/vitest.rls.config.ts"
    ]) {
      const current = await resolveConfig(
        { root: directory, configFile: resolve(config), logLevel: "silent" },
        "serve",
        "test"
      );
      expect(current.envDir).toBe(false);
      expect(current.env[name]).toBeUndefined();
    }
  } finally {
    if (previousDirectory === undefined) delete process.env.PILOT_LOCAL_REPORT_DIRECTORY;
    else process.env.PILOT_LOCAL_REPORT_DIRECTORY = previousDirectory;
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    expect(basename(directory)).toMatch(/^alvitra-vite-env-/u);
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);

it.each([
  {
    suite: "documents",
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@example.org:5432/postgres"
  },
  {
    suite: "documents",
    confirmation: "",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/postgres"
  },
  {
    suite: "other",
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/postgres"
  },
  {
    suite: "documents",
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/customer_database"
  }
])(
  "AC-7012: recusa entrada insegura antes de conectar/criar banco: $suite/$confirmation/$url",
  async ({ suite, confirmation, url }) => {
    try {
      await run(
        process.execPath,
        ["scripts/run-tsx.mjs", "scripts/verify-pilot-local-integration.ts", suite],
        {
          env: {
            ...minimalEnvironment(),
            PILOT_RECOVERY_CONFIRMATION: confirmation,
            PILOT_RECOVERY_ADMIN_URL: url
          },
          shell: false,
          windowsHide: true,
          timeout: 15_000
        }
      );
      throw new Error("A entrada insegura foi aceita.");
    } catch (error) {
      const result = error as { code: number; stdout: string; stderr: string };
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stderr.trim())).toEqual({
        code: "pilot_local_integration_failed",
        phase: "guards",
        activationAuthorized: false
      });
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toContain("PRIVATE_CANARY");
      expect(result.stderr).not.toContain("example.org");
    }
  },
  20_000
);

it("AC-7012: wrapper recusa config ausente antes de descobrir/iniciar Docker", async () => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-wrapper-contract-"));
  try {
    const scripts = join(directory, "scripts");
    await mkdir(scripts);
    const wrapper = join(scripts, "verify-pilot-recovery-container.ps1");
    await writeFile(wrapper, await readFile("scripts/verify-pilot-recovery-container.ps1"));
    const result = await run(
      "pwsh",
      ["-NoProfile", "-File", wrapper, "-ConfirmSyntheticLocal", "-Suite", "documents"],
      {
        env: minimalEnvironment(),
        shell: false,
        windowsHide: true,
        timeout: 15_000
      }
    ).then(
      () => {
        throw new Error("A configuração ausente foi aceita.");
      },
      (error: { code: number; stdout: string; stderr: string }) => error
    );
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      code: "pilot_document_config_missing",
      resourcesCreated: false,
      activationAuthorized: false
    });
    expect(result.stderr).toContain("nenhum recurso criado");
    expect(result.stdout).not.toContain("pilot_container_exercise");
    await expect(readFile(join(directory, ".local", "pilot-operations"))).rejects.toMatchObject({
      code: "ENOENT"
    });
  } finally {
    expect(dirname(resolve(directory))).toBe(resolve(tmpdir()));
    expect(basename(directory)).toMatch(/^alvitra-wrapper-contract-/u);
    await rm(directory, { recursive: true, force: true });
  }
}, 20_000);

it.each(["missing", "different"] as const)(
  "AC-7011: destino de manutenção sem vínculo %s é recusado antes da conexão",
  async (binding) => {
    const runId = randomUUID().replaceAll("-", "");
    const directory = resolve(".local/pilot-operations", runId);
    try {
      await mkdir(join(directory, "backup"), { recursive: true });
      await mkdir(join(directory, "maintenance"));
      await writeFile(
        join(directory, "backup", "manifest.json"),
        JSON.stringify({
          version: 1,
          purpose: "synthetic-local-recovery",
          sourceDatabase: `alvitra_ops_source_${runId}`
        })
      );
      if (binding === "different")
        await writeFile(
          join(directory, "maintenance", "target.json"),
          JSON.stringify({ runId, targetId: "c".repeat(32), snapshotDigest: "0".repeat(64) })
        );
      const result = await run(
        process.execPath,
        [
          "scripts/run-tsx.mjs",
          "scripts/verify-pilot-maintenance-recovery.ts",
          "verify",
          runId,
          "b".repeat(32)
        ],
        {
          env: {
            ...minimalEnvironment(),
            PILOT_RECOVERY_CONFIRMATION: "synthetic-local-only",
            PILOT_RECOVERY_ADMIN_URL: "postgresql://postgres:synthetic-only@127.0.0.1:1/postgres"
          },
          shell: false,
          windowsHide: true,
          timeout: 15000
        }
      ).then(
        () => {
          throw new Error("Destino sem vínculo foi aceito.");
        },
        (error: { code: number; stdout: string; stderr: string }) => error
      );
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(JSON.parse(result.stderr.trim())).toEqual({
        code: "pilot_maintenance_recovery_failed",
        phase: "target_binding",
        activationAuthorized: false
      });
    } finally {
      expect(dirname(directory)).toBe(resolve(".local/pilot-operations"));
      expect(basename(directory)).toBe(runId);
      await rm(directory, { recursive: true, force: true });
    }
  },
  20000
);

it.each([
  {
    stage: "prepare",
    id: "a".repeat(32),
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@example.org:5432/postgres"
  },
  {
    stage: "prepare",
    id: "a".repeat(32),
    confirmation: "",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/postgres"
  },
  {
    stage: "other",
    id: "a".repeat(32),
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/postgres"
  },
  {
    stage: "prepare",
    id: "invalid-id",
    confirmation: "synthetic-local-only",
    url: "postgresql://postgres:PRIVATE_CANARY@127.0.0.1:5432/postgres"
  }
])(
  "AC-7010/7011: manutenção recusa entrada insegura sem conectar: $stage/$id",
  async ({ stage, id, confirmation, url }) => {
    const result = await run(
      process.execPath,
      ["scripts/run-tsx.mjs", "scripts/verify-pilot-maintenance-recovery.ts", stage, id],
      {
        env: {
          ...minimalEnvironment(),
          PILOT_RECOVERY_CONFIRMATION: confirmation,
          PILOT_RECOVERY_ADMIN_URL: url
        },
        shell: false,
        windowsHide: true,
        timeout: 15000
      }
    ).then(
      () => {
        throw new Error("A manutenção insegura foi aceita.");
      },
      (error: { code: number; stdout: string; stderr: string }) => error
    );
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr.trim())).toEqual({
      code: "pilot_maintenance_recovery_failed",
      phase: "guards",
      activationAuthorized: false
    });
    expect(result.stderr).not.toContain("PRIVATE_CANARY");
    expect(result.stderr).not.toContain("example.org");
  },
  20000
);
