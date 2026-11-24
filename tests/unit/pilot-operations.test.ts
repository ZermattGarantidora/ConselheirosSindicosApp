import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inspectPilotPreparation,
  parsePilotBlueprint,
  requiredPilotDecisions
} from "../../scripts/pilot-preparation.js";
import {
  assertRecoveryInventory,
  backupLocalApplication,
  captureRecoveryInventory,
  localRecoveryConnection,
  postgresRecoveryCommand,
  restoreLocalApplication,
  type RecoveryClient,
  type RecoveryRunner
} from "../../scripts/pilot-recovery.js";

const sourceUrl = "postgresql://synthetic:synthetic@127.0.0.1:5432/alvitra_ops_source_aaaaaaaaaaaa";
const restoreUrl = sourceUrl.replace("_source_", "_restore_");
const confirmation = "synthetic-local-only";
const blueprint = await readFile(new URL("../../render.pilot.yaml", import.meta.url), "utf8");
const decisions = JSON.parse(
  await readFile(
    new URL("../../infrastructure/pilot/operations-decisions.example.json", import.meta.url),
    "utf8"
  )
);
const directories: string[] = [];
async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-pilot-ops-test-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("alvitra-pilot-ops-test-"));
    await rm(directory, { recursive: true, force: true });
  }
});

function database(purpose: "source" | "restore") {
  const state = {
    occupied: false,
    badMarker: false,
    unsafeRole: false,
    missingRole: false,
    inheritedRole: false,
    missingVector: false,
    vectorVersion: "0.8.0",
    missingTable: false,
    badSnapshot: false,
    executor: false,
    unsafeExecutor: false,
    divergent: false,
    markerName: `${purpose === "source" ? "alvitra_ops_source" : "alvitra_ops_restore"}_aaaaaaaaaaaa`
  };
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("current_database()"))
      return {
        rows: [
          {
            name: state.markerName,
            purpose: state.badMarker ? "pilot" : purpose,
            data_policy: confirmation
          }
        ]
      };
    if (sql.includes("FROM pg_roles") && sql.includes("rolcanlogin"))
      return {
        rows: (state.missingRole
          ? ["app_runtime"]
          : ["app_runtime", "app_worker", ...(state.executor ? ["app_ai_executor"] : [])]
        ).map((rolname) => ({
          rolname,
          rolcanlogin: state.unsafeRole,
          rolsuper: rolname === "app_ai_executor" && state.unsafeExecutor,
          rolcreatedb: false,
          rolcreaterole: false,
          rolreplication: false,
          rolbypassrls: false,
          rolinherit: rolname === "app_ai_executor"
        }))
      };
    if (sql.includes("FROM pg_auth_members")) return { rows: state.inheritedRole ? [{}] : [] };
    if (sql.includes("FROM pg_extension"))
      return {
        rows: state.missingVector
          ? []
          : [{ name: "vector", schema: "public", version: state.vectorVersion }]
      };
    if (sql.includes("FROM pg_tables"))
      return {
        rows: (state.missingTable
          ? []
          : [
              "users",
              "memberships",
              "chats",
              "access_codes",
              "device_sessions",
              "document_original_contents",
              "document_versions",
              "document_pages",
              "document_chunks",
              "document_chunk_embeddings",
              "processing_jobs",
              "conversation_entries",
              "schema_migrations"
            ]
        ).map((name) => ({ name }))
      };
    if (sql.includes("fingerprints"))
      return { rows: [{ rows: "2", sha256: (state.divergent ? "b" : "a").repeat(64) }] };
    if (sql.includes("SELECT kind, identity"))
      return { rows: [{ kind: "policy", identity: "synthetic", definition: { rls: true } }] };
    if (sql.includes("FROM pg_sequences"))
      return { rows: [{ name: "conversation_entries_sequence_seq" }] };
    if (sql.includes("SELECT last_value")) return { rows: [{ last_value: "2", is_called: true }] };
    if (sql.includes("pg_export_snapshot"))
      return { rows: [{ snapshot: state.badSnapshot ? "invalid" : "00000003-0000001B-1" }] };
    if (sql.includes("UNION ALL SELECT 1 FROM pg_namespace"))
      return { rows: state.occupied ? [{}] : [] };
    return { rows: [] };
  });
  return { client: { query } as unknown as RecoveryClient, query, state };
}

async function localBackup() {
  const root = await temporary();
  const directory = join(root, "backup");
  const source = database("source");
  const run: RecoveryRunner = vi.fn<RecoveryRunner>(async (command) => {
    const path = command.args.find((arg) => arg.startsWith("--file="))!.slice(7);
    expect(command.args.join(" ")).not.toContain("synthetic:synthetic");
    expect(source.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    await writeFile(path, "SYNTHETIC-CUSTOM-DUMP");
  });
  const manifest = await backupLocalApplication(
    source.client,
    sourceUrl,
    directory,
    confirmation,
    run
  );
  return { directory, source, manifest, run };
}

describe("Spec 070 — preparação sem ativação", () => {
  it("AC-7001: exemplos são revisáveis e mantêm decisões/ativação pendentes sem ler ambiente", () => {
    const result = inspectPilotPreparation(blueprint, decisions);
    expect(result).toMatchObject({
      configurationValid: true,
      networkCalls: 0,
      activationAuthorized: false,
      decisionsRecorded: false
    });
    expect(result.pendingDecisions).toEqual(requiredPilotDecisions);
    expect(
      inspectPilotPreparation(blueprint, {
        ...decisions,
        decisions: Object.fromEntries(
          requiredPilotDecisions.map((key) => [
            key,
            key === "candidateRevision"
              ? "a".repeat(40)
              : ["rpoMinutes", "rtoMinutes", "retentionDays"].includes(key)
                ? 60
                : "referência local de revisão"
          ])
        )
      })
    ).toMatchObject({ decisionsRecorded: true, activationAuthorized: false });
  });
  it.each([
    [
      'DOCUMENT_WORKER_IN_API\n        value: "false"',
      'DOCUMENT_WORKER_IN_API\n        value: "true"'
    ],
    ["autoDeployTrigger: off", "autoDeployTrigger: commit"],
    ["region: virginia", "region: unknown"],
    ["startCommand: node dist/api/app/main.js", "startCommand: pnpm run db:migrate:remote"],
    [
      "key: OPENAI_API_KEY\n        sync: false",
      "key: OPENAI_API_KEY\n        value: SYNTHETIC-DO-NOT-LOG"
    ],
    ['key: NODE_VERSION\n        value: "24"', 'key: UNRECOGNIZED\n        value: "24"'],
    ["maxShutdownDelaySeconds: 300", "maxShutdownDelaySeconds: 0"],
    ["sync: false", "sync: true"],
    ["healthCheckPath: /health", "healthCheckPath: /unhealthy"],
    ['key: NODE_VERSION\n        value: "24"', "key: NODE_VERSION\n        sync: false"],
    [
      'key: NODE_VERSION\n        value: "24"',
      'key: NODE_VERSION\n        value: "24"\n      - key: ACCESS_CODE_SECRET\n        sync: false'
    ]
  ])("recusa configuração divergente sem devolver valores", (before, after) => {
    const result = inspectPilotPreparation(blueprint.replaceAll(before!, after!), decisions);
    expect(result.configurationValid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC-DO-NOT-LOG");
  });
  it("recusa regiões distintas, segredo excedente no worker e env obrigatório faltante", () => {
    const start = blueprint.indexOf("  - type: worker");
    const web = blueprint.slice(0, start);
    const worker = blueprint.slice(start);
    for (const modified of [
      worker.replace("region: virginia", "region: ohio"),
      worker + "      - key: OPENAI_API_KEY\n        sync: false\n",
      worker.replace(/ {6}- key: NODE_VERSION\r?\n {8}value: "24"\r?\n/u, ""),
      worker.replace("    envVars:", "    healthCheckPath: /health\n    envVars:")
    ])
      expect(inspectPilotPreparation(web + modified, decisions).configurationValid).toBe(false);
  });
  it.each([
    "services:\n  - type: web\n",
    "databases: []",
    blueprint + "services:\n",
    blueprint.replace("runtime: node", "runtime: node\n    runtime: node"),
    blueprint.replace("value: production", "value: production\n        value: production"),
    blueprint.replace("    envVars:", "    envVars:\n    envVars:"),
    blueprint.replace("value: production", "value: &unsafe"),
    blueprint.replace("value: production", "value: |"),
    blueprint.replace("value: production", "value: {unsafe: true}"),
    blueprint.replace("value: production", "value: !unsafe"),
    blueprint.replace("value: production", "value: \"production'"),
    blueprint.replace("sync: false", 'sync: "false"'),
    blueprint.replace('value: "false"', "value: false"),
    blueprint.replace("maxShutdownDelaySeconds: 300", 'maxShutdownDelaySeconds: "300"'),
    blueprint.replace("    runtime: node", "    preDeployCommand: deploy"),
    blueprint.replace("value: production", "value: 'production'") + "unexpected: true\n"
  ])("sintaxe fora do subconjunto falha fechada", (input) => {
    expect(() => parsePilotBlueprint(input)).toThrow();
  });
  it.each([null, {}, { version: 2, decisions: [] }, { ...decisions, decisions: "invalid" }])(
    "decisões inválidas ficam pendentes",
    (input) => {
      expect(inspectPilotPreparation(blueprint, input).decisionsRecorded).toBe(false);
    }
  );
});

describe("Spec 070 — backup integral local", () => {
  it.each([
    undefined,
    "invalid",
    sourceUrl.replace("127.0.0.1", "localhost"),
    sourceUrl.replace("127.0.0.1", "db.synthetic.supabase.co"),
    sourceUrl.replace("postgresql:", "https:"),
    sourceUrl.replace("alvitra_ops_source_aaaaaaaaaaaa", "pilot"),
    sourceUrl + "?host=remote.invalid",
    sourceUrl + "#fragment",
    sourceUrl.replace("synthetic:synthetic@", ""),
    restoreUrl
  ])("AC-7002: recusa conexões antes de consultar banco", (url) => {
    expect(() => localRecoveryConnection(url, "source", confirmation)).toThrow();
  });
  it("confirmação, IPv6 literal e ambiente mínimo do subprocesso", () => {
    expect(() => localRecoveryConnection(sourceUrl, "source", "synthetic-only")).toThrow();
    expect(
      localRecoveryConnection(sourceUrl.replace("127.0.0.1", "[::1]"), "source", confirmation)
        .hostname
    ).toBe("[::1]");
    const command = postgresRecoveryCommand(
      "pg_dump",
      localRecoveryConnection(sourceUrl, "source", confirmation),
      ["--format=custom"],
      {
        PATH: "synthetic-path",
        OPENAI_API_KEY: "SYNTHETIC-SECRET",
        PGOPTIONS: "unsafe",
        PGSERVICE: "unsafe",
        DATABASE_URL: "unsafe"
      }
    );
    expect(command.environment).toMatchObject({
      PGHOST: "127.0.0.1",
      PGPORT: "5432",
      PATH: "synthetic-path"
    });
    expect(command.environment.OPENAI_API_KEY).toBeUndefined();
    expect(command.environment.PGOPTIONS).toBeUndefined();
    expect(command.environment.PGSERVICE).toBeUndefined();
    for (const executable of ["pg_dump", "pg_restore"] as const)
      expect(postgresRecoveryCommand(executable, new URL(sourceUrl), ["--version"]).args).toEqual([
        "--version"
      ]);
    expect(
      postgresRecoveryCommand("pg_restore", new URL(sourceUrl.replace(":5432", "")), []).environment
        .PGPORT
    ).toBe("5432");
  });
  it("AC-7002/7003: snapshot compartilhado, manifesto final e restore sem comandos destrutivos", async () => {
    const { directory, source, manifest, run } = await localBackup();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(["--snapshot=00000003-0000001B-1", "--schema=app"])
      })
    );
    expect(JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"))).toEqual(manifest);
    expect(manifest.inventory.catalog).toContainEqual({
      kind: "policy",
      identity: "synthetic",
      definition: { rls: true }
    });
    expect(source.query.mock.calls.at(-1)![0]).toBe("COMMIT");
    const restored = database("restore");
    const restore = vi.fn<RecoveryRunner>().mockResolvedValue();
    await restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, restore);
    const command = restore.mock.calls[0]![0];
    expect(command.args).toEqual(
      expect.arrayContaining(["--single-transaction", "--exit-on-error", "--no-owner"])
    );
    expect(command.args.join(" ")).not.toMatch(/--clean|--create|--no-acl/u);
    expect(restored.query.mock.calls.at(-1)![0]).toBe("COMMIT");
  });
  it.each([
    "badMarker",
    "unsafeRole",
    "missingRole",
    "inheritedRole",
    "missingVector",
    "missingTable",
    "badSnapshot"
  ] as const)("recusa origem incompleta/insegura: %s", async (key) => {
    const source = database("source");
    source.state[key] = true;
    const run = vi.fn<RecoveryRunner>();
    await expect(
      backupLocalApplication(
        source.client,
        sourceUrl,
        join(await temporary(), "backup"),
        confirmation,
        run
      )
    ).rejects.toThrow("não concluído");
    expect(run).not.toHaveBeenCalled();
  });
  it("não sobrescreve backup nem registra sucesso após erro com conteúdo privado", async () => {
    const { directory, source } = await localBackup();
    const run = vi.fn<RecoveryRunner>();
    await expect(
      backupLocalApplication(source.client, sourceUrl, directory, confirmation, run)
    ).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    const target = join(await temporary(), "failed");
    const failure = vi
      .fn<RecoveryRunner>()
      .mockRejectedValue(new Error("SYNTHETIC-PRIVATE-CONTENT"));
    await expect(
      backupLocalApplication(source.client, sourceUrl, target, confirmation, failure)
    ).rejects.toThrow("nenhum manifesto");
    await expect(readFile(join(target, "manifest.json"))).rejects.toThrow();
    await expect(
      backupLocalApplication(source.client, sourceUrl, "relative", confirmation, run)
    ).rejects.toThrow("absoluto");
  });
  it.each(["occupied", "badMarker", "unsafeRole", "inheritedRole", "missingVector"] as const)(
    "AC-7003: destino incompatível não é alterado: %s",
    async (key) => {
      const { directory } = await localBackup();
      const restored = database("restore");
      restored.state[key] = true;
      const run = vi.fn<RecoveryRunner>();
      await expect(
        restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
      ).rejects.toThrow("quarentena");
      expect(run).not.toHaveBeenCalled();
    }
  );
  it("recusa arquivo corrompido e manifesto incompatível antes de restaurar", async () => {
    const { directory, manifest } = await localBackup();
    const restored = database("restore");
    const run = vi.fn<RecoveryRunner>();
    await writeFile(join(directory, "app.dump"), "CORRUPTED");
    await expect(
      restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
    ).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    for (const invalid of [
      { ...manifest, version: 2 },
      { ...manifest, sourceDatabase: "pilot" },
      { ...manifest, dumpSha256: "invalid" },
      {}
    ]) {
      await writeFile(join(directory, "manifest.json"), JSON.stringify(invalid));
      await expect(
        restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
      ).rejects.toThrow();
    }
    expect(run).not.toHaveBeenCalled();
    await expect(
      restoreLocalApplication(restored.client, restoreUrl, "relative", confirmation, run)
    ).rejects.toThrow("absoluto");
  });
  it("falha em extensão divergente, restore interrompido e inventário diferente", async () => {
    const { directory } = await localBackup();
    const restored = database("restore");
    const run = vi.fn<RecoveryRunner>().mockResolvedValue();
    restored.state.vectorVersion = "0.0.0";
    await expect(
      restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
    ).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    restored.state.vectorVersion = "0.8.0";
    run.mockRejectedValueOnce(new Error("SYNTHETIC-PRIVATE-ERROR"));
    await expect(
      restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
    ).rejects.toThrow("quarentena");
    restored.state.divergent = true;
    await expect(
      restoreLocalApplication(restored.client, restoreUrl, directory, confirmation, run)
    ).rejects.toThrow("quarentena");
    const inventory = await captureRecoveryInventory(database("source").client);
    expect(() => assertRecoveryInventory(inventory, { ...inventory, catalog: [] })).toThrow(
      "divergente"
    );
  });
  it("inventaria executor opcional e recusa privilégio elevado sem alterar o papel", async () => {
    const source = database("source");
    source.state.executor = true;
    expect((await captureRecoveryInventory(source.client)).roles).toContainEqual(
      expect.objectContaining({ rolname: "app_ai_executor", rolcanlogin: false })
    );
    source.state.unsafeExecutor = true;
    await expect(captureRecoveryInventory(source.client)).rejects.toThrow("inseguros");
  });
  it("marcador de outro banco e identificador inesperado são recusados", async () => {
    const source = database("source");
    source.state.markerName = "other";
    const root = await temporary();
    await mkdir(join(root, "existing"));
    await expect(
      backupLocalApplication(
        source.client,
        sourceUrl,
        join(root, "existing"),
        confirmation,
        vi.fn()
      )
    ).rejects.toThrow();
  });
});
