import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, open, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { Client, Pool, type PoolClient, type QueryResult } from "pg";
import { defaultMigrationsDirectory, migrateDatabase } from "./database-migrations.js";
import {
  backupLocalApplication,
  assertRecoveryInventory,
  captureRecoveryInventory,
  localRecoveryConnection,
  postgresRecoveryCommand,
  runPostgresRecoveryCommand,
  restoreLocalApplication,
  type RecoveryRunner
} from "./pilot-recovery.js";
import { createDockerRecoveryRunner } from "./pilot-recovery-docker.js";
import { createCondominiumId } from "../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../apps/api/identity/authorized-condominium-context.js";
import { createAccessCodeService } from "../apps/api/identity/access-code.js";
import { createSecretCipher } from "../apps/api/identity/account-security-crypto.js";
import { createPostgresAccessCodeStore } from "../apps/api/identity/postgres-access-code-store.js";
import { createPostgresChatRepository } from "../apps/api/chats/postgres-chat-repository.js";
import { createPostgresConversationStore } from "../apps/api/answers/postgres-conversation-store.js";
import { conversationHash } from "../apps/api/answers/conversation-store.js";
import { createPostgresPrivateDocumentStorage } from "../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresDocumentUploadRepository } from "../apps/api/documents/postgres-document-upload-repository.js";
import { createPostgresDocumentProcessingRepository } from "../apps/api/documents/postgres-document-processing-repository.js";
import { createScopedDocumentProcessor } from "../apps/api/documents/document-processing.js";
import { uploadDocument } from "../apps/api/documents/upload-document.js";
import { createPostgresProcessingJobQueue } from "../apps/api/worker/postgres-processing-job-queue.js";
import { processOne } from "../apps/api/worker/processing-worker.js";
import { createSyntheticTextPdf } from "../tests/fixtures/synthetic-pdfs.js";

const contexts = [0, 1].map((): AuthorizedCondominiumContext => ({
  userId: randomUUID() as AuthorizedCondominiumContext["userId"],
  condominiumId: createCondominiumId(randomUUID()),
  roleKey: "manager",
  membershipRevision: "synthetic-v1",
  permissions: ["document:read", "document:upload"]
}));
const confirmation = process.env.PILOT_RECOVERY_CONFIRMATION;
const runId = randomUUID().replaceAll("-", "");
const reportDirectory = resolve(".local", "pilot-operations", runId);
const secret = "7".repeat(64); // Deterministic synthetic fixture, never a production secret.
let recoveryPhase = "preconditions";

async function verifyLedgerRecoveryInChild(stage: "seed" | "verify") {
  const environment: Record<string, string> = {};
  for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
    if (process.env[name]) environment[name] = process.env[name]!;
  environment.PILOT_RECOVERY_CONFIRMATION = "synthetic-local-only";
  environment.PILOT_RECOVERY_ADMIN_URL = process.env.PILOT_RECOVERY_ADMIN_URL!;
  try {
    await promisify(execFile)(
      process.execPath,
      ["scripts/run-tsx.mjs", "scripts/verify-pilot-ledger-recovery.ts", stage, runId],
      {
        env: environment,
        shell: false,
        windowsHide: true,
        timeout: 60000,
        maxBuffer: 1048576
      }
    );
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? "";
    for (const line of stderr.trim().split(/\r?\n/u)) {
      try {
        const diagnostic = JSON.parse(line) as { code?: string; phase?: string };
        if (
          diagnostic.code === "pilot_ledger_recovery_failed" &&
          /^[a-z_]{1,50}$/u.test(diagnostic.phase ?? "")
        )
          recoveryPhase = `ledger_${stage}_${diagnostic.phase}`;
      } catch {
        /* Native child diagnostics are never copied to logs. */
      }
    }
    throw new Error("Ensaio local do ledger não concluído.");
  }
}

async function verifyMaintenanceInChild(stage: "prepare" | "verify", targetId?: string) {
  const environment: Record<string, string> = {};
  for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
    if (process.env[name]) environment[name] = process.env[name]!;
  environment.PILOT_RECOVERY_CONFIRMATION = "synthetic-local-only";
  environment.PILOT_RECOVERY_ADMIN_URL = process.env.PILOT_RECOVERY_ADMIN_URL!;
  try {
    await promisify(execFile)(
      process.execPath,
      [
        "scripts/run-tsx.mjs",
        "scripts/verify-pilot-maintenance-recovery.ts",
        stage,
        runId,
        ...(targetId ? [targetId] : [])
      ],
      { env: environment, shell: false, windowsHide: true, timeout: 90000, maxBuffer: 1048576 }
    );
  } catch (error) {
    for (const line of ((error as { stderr?: string }).stderr ?? "").trim().split(/\r?\n/u)) {
      try {
        const diagnostic = JSON.parse(line) as { code?: string; phase?: string };
        if (
          diagnostic.code === "pilot_maintenance_recovery_failed" &&
          /^[a-z_]{1,60}$/u.test(diagnostic.phase ?? "")
        )
          recoveryPhase = `maintenance_${stage}_${diagnostic.phase}`;
      } catch {
        /* Native diagnostics are never copied to logs. */
      }
    }
    throw new Error("Manutenção sintética após restore não concluída.");
  }
}

async function verifyMaintenanceRecovery(sourceUrl: string, run: RecoveryRunner): Promise<string> {
  recoveryPhase = "maintenance_prepare";
  await verifyMaintenanceInChild("prepare");
  const targetId = randomUUID().replaceAll("-", "");
  const target = new URL(sourceUrl);
  target.pathname = `/alvitra_ops_restore_${targetId}`;
  localRecoveryConnection(target.toString(), "restore", confirmation);
  const snapshotDigest = createHash("sha256")
    .update(await readFile(resolve(reportDirectory, "backup", "manifest.json")))
    .digest("hex");
  const binding = await open(resolve(reportDirectory, "maintenance", "target.json"), "wx", 0o600);
  try {
    await binding.writeFile(JSON.stringify({ runId, targetId, snapshotDigest }));
    await binding.sync();
  } finally {
    await binding.close();
  }
  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000
  });
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
    await client.connect();
    await client.query("CREATE SCHEMA ops_control");
    await client.query(
      "CREATE TABLE ops_control.environment(purpose text NOT NULL,data_policy text NOT NULL)"
    );
    await client.query(
      "INSERT INTO ops_control.environment VALUES('restore','synthetic-local-only')"
    );
    await client.query("CREATE EXTENSION vector");
    recoveryPhase = "maintenance_restore_inventory";
    await restoreLocalApplication(
      client,
      target.toString(),
      resolve(reportDirectory, "backup"),
      confirmation!,
      run
    );
    await client.query(
      "CREATE TABLE ops_control.maintenance_guard(snapshot_digest text NOT NULL,quarantined boolean NOT NULL,recovery_run_id text NOT NULL)"
    );
    await client.query("INSERT INTO ops_control.maintenance_guard VALUES($1,true,$2)", [
      snapshotDigest,
      runId
    ]);
    await client.query("UPDATE app.operation_budget_policy SET enabled=false WHERE singleton");
    recoveryPhase = "maintenance_verify";
    await verifyMaintenanceInChild("verify", targetId);
    const proof = JSON.parse(
      await readFile(resolve(reportDirectory, "maintenance", "result.json"), "utf8")
    );
    assert.equal(proof.passed, true);
    assert.equal(proof.quarantined, true);
    assert.equal(proof.actualExternalCalls, 0);
    assert.equal(proof.activationAuthorized, false);
    return target.pathname.slice(1);
  } finally {
    await client.end().catch(() => undefined);
    await admin.end().catch(() => undefined);
  }
}

async function migrationInputs() {
  const names = (await readdir(defaultMigrationsDirectory))
    .filter((name) => /^\d{3}_.+\.sql$/u.test(name))
    .sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      sha256: createHash("sha256")
        .update(await readFile(join(defaultMigrationsDirectory, name)))
        .digest("hex")
    }))
  );
}

async function recoveryCodeInputs() {
  return Promise.all(
    [
      "scripts/verify-pilot-recovery.ts",
      "scripts/verify-pilot-ledger-recovery.ts",
      "scripts/verify-pilot-maintenance-recovery.ts",
      "scripts/pilot-recovery.ts",
      "scripts/pilot-recovery-docker.ts",
      "apps/api/documents/hosted-call-ledger.ts",
      "apps/api/documents/postgres-hosted-call-ledger.ts",
      "apps/api/documents/hosted-document-execution.ts",
      "apps/api/security/operation-budget.ts",
      "apps/api/security/postgres-operation-budget-store.ts",
      "apps/api/security/hosted-operation-budget.ts",
      "apps/api/security/synthetic-data-controls.ts",
      "apps/api/security/synthetic-maintenance-plan.ts",
      "apps/api/documents/synthetic-document-decisions.ts",
      "apps/api/identity/postgres-access-code-store.ts",
      "apps/api/identity/access-code.ts",
      "infrastructure/pilot/verify-access.sql",
      "infrastructure/pilot/operational-observation.sql"
    ].map(async (name) => ({
      name,
      sha256: createHash("sha256")
        .update(await readFile(name))
        .digest("hex")
    }))
  );
}

async function verifyRecoveryRefusals(
  client: Client,
  restoreUrl: string,
  manifest: Awaited<ReturnType<typeof backupLocalApplication>>
) {
  const backupDirectory = resolve(reportDirectory, "backup");
  let restoreCalls = 0;
  const forbiddenTool: RecoveryRunner = async () => {
    restoreCalls += 1;
    throw new Error("Ferramenta inesperada.");
  };
  await assert.rejects(
    restoreLocalApplication(client, restoreUrl, backupDirectory, confirmation!, forbiddenTool)
  );
  assert.equal(restoreCalls, 0, "Destino ocupado não pode executar ferramenta de restore.");
  const corruptedDirectory = resolve(reportDirectory, "corrupted-backup");
  await mkdir(corruptedDirectory, { mode: 0o700 });
  await copyFile(
    resolve(backupDirectory, "manifest.json"),
    resolve(corruptedDirectory, "manifest.json")
  );
  const corrupted = await readFile(resolve(backupDirectory, "app.dump"));
  corrupted[corrupted.length - 1] = corrupted[corrupted.length - 1]! ^ 0xff;
  await writeFile(resolve(corruptedDirectory, "app.dump"), corrupted, { flag: "wx", mode: 0o600 });
  await assert.rejects(
    restoreLocalApplication(client, restoreUrl, corruptedDirectory, confirmation!, forbiddenTool)
  );
  assert.equal(restoreCalls, 0, "Dump corrompido não pode executar ferramenta de restore.");
  for (const mutation of [
    "ALTER TABLE app.document_pages DISABLE ROW LEVEL SECURITY",
    "GRANT SELECT ON app.access_codes TO app_runtime",
    "UPDATE app.document_original_contents SET content=content||decode('00','hex')"
  ]) {
    await client.query("BEGIN");
    try {
      await client.query(mutation);
      const changed = await captureRecoveryInventory(client);
      assert.throws(() => assertRecoveryInventory(manifest.inventory, changed));
    } finally {
      await client.query("ROLLBACK");
    }
  }
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    assertRecoveryInventory(manifest.inventory, await captureRecoveryInventory(client));
  } finally {
    await client.query("ROLLBACK");
  }
}

async function inspectOperationalSql(client: Client) {
  const observation = await client.query(
    await readFile(
      new URL("../infrastructure/pilot/operational-observation.sql", import.meta.url),
      "utf8"
    )
  );
  const results = observation as unknown as QueryResult<Record<string, unknown>>[];
  const queue = results
    .flatMap((result) => result.rows)
    .find((row) => Object.hasOwn(row, "queued_jobs"));
  const originals = results
    .flatMap((result) => result.rows)
    .find((row) => Object.hasOwn(row, "originals_with_hash_or_size_mismatch"));
  assert.equal(Number(queue?.queued_jobs), 1);
  assert.equal(Number(originals?.originals_with_hash_or_size_mismatch), 0);
}

async function verifyRestrictedLogins(client: Client, restoreUrl: string) {
  const sql = await readFile(
    new URL("../infrastructure/pilot/verify-access.sql", import.meta.url),
    "utf8"
  );
  for (const [purpose, role] of [
    ["api", "app_runtime"],
    ["worker", "app_worker"]
  ] as const) {
    const login = `ops_${purpose}_${runId}`;
    assert.match(login, /^ops_(api|worker)_[a-f0-9]{32}$/u);
    await client.query(
      `CREATE ROLE "${login}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
    );
    await client.query(`GRANT ${role} TO "${login}"`);
    const url = new URL(restoreUrl);
    url.username = login;
    url.password = "synthetic-only";
    const service = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    try {
      await service.connect();
      const rejectedUrl = new URL(url);
      rejectedUrl.password = "wrong-synthetic-password";
      const rejected = new Client({
        connectionString: rejectedUrl.toString(),
        connectionTimeoutMillis: 5000
      });
      try {
        await assert.rejects(
          rejected.connect(),
          (error: unknown) => (error as { code?: string }).code === "28P01"
        );
      } finally {
        await rejected.end().catch(() => undefined);
      }
      const result = (await service.query(sql)) as unknown as QueryResult<
        Record<string, unknown>
      >[];
      const rows = result.flatMap((entry) => entry.rows);
      const privileged = rows.find((row) => Object.hasOwn(row, "reachable_elevated_roles"));
      const grants = rows.find((row) => Object.hasOwn(row, "runtime_membership"));
      assert.equal(Number(privileged?.reachable_elevated_roles), 0);
      assert.equal(grants?.runtime_membership, purpose === "api");
      assert.equal(grants?.worker_membership, purpose === "worker");
      assert.equal(grants?.can_change_app_schema, false);
      assert.equal(grants?.runtime_can_read_access_codes, false);
      assert.equal(grants?.runtime_can_read_device_sessions, false);
      assert.equal(grants?.runtime_can_provision_access, false);
      const scoped = rows.filter((row) => Object.hasOwn(row, "rls_enabled"));
      assert.ok(scoped.length > 0);
      assert.ok(scoped.every((row) => row.rls_enabled === true && row.rls_forced === true));
    } finally {
      await service.end().catch(() => undefined);
    }
  }
}

async function asRuntime<T>(
  pool: Pool,
  context: AuthorizedCondominiumContext,
  operation: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query(
      "SELECT set_config('app.user_id',$1,true), set_config('app.condominium_id',$2,true)",
      [context.userId, context.condominiumId]
    );
    return await operation(client);
  } finally {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
}

async function exercise(sourceUrl: string, restoreUrl: string, run: RecoveryRunner) {
  const source = new Pool({ connectionString: sourceUrl, max: 3, connectionTimeoutMillis: 5000 });
  const restored = new Pool({
    connectionString: restoreUrl,
    max: 3,
    connectionTimeoutMillis: 5000
  });
  const sourceClient = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 5000 });
  const restoreClient = new Client({ connectionString: restoreUrl, connectionTimeoutMillis: 5000 });
  try {
    await sourceClient.connect();
    await restoreClient.connect();
    recoveryPhase = "migrations";
    const migrations = await migrationInputs();
    const integrationInputs = await recoveryCodeInputs();
    await migrateDatabase(sourceClient);
    assert.deepEqual(
      (
        await sourceClient.query<{ name: string }>(
          "SELECT name FROM app.schema_migrations ORDER BY name"
        )
      ).rows.map((row) => row.name),
      migrations.map((entry) => entry.name)
    );
    // Synthetic metadata fixture: exercise default ACL recovery as well as explicit grants.
    await sourceClient.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE ON SEQUENCES TO app_worker"
    );
    await restoreClient.query("CREATE EXTENSION vector");
    const records = [];
    const storage = createPostgresPrivateDocumentStorage(source);
    const queue = createPostgresProcessingJobQueue(source);
    const processor = createScopedDocumentProcessor(
      createPostgresDocumentProcessingRepository(source, storage)
    );
    const chats = createPostgresChatRepository(source);
    const journal = createPostgresConversationStore(source);
    recoveryPhase = "fixtures";
    for (const context of contexts) {
      await source.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
        context.userId,
        `synthetic:${context.userId}`
      ]);
      await source.query(
        "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'Condomínio FICTÍCIO','active')",
        [context.condominiumId]
      );
      await source.query(
        `INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision)
        VALUES($1,$2,$3,'manager','active',now()-interval '1 day','synthetic-v1')`,
        [context.condominiumId, randomUUID(), context.userId]
      );
      const chatId = randomUUID();
      await chats.create(context, { id: chatId, title: "Ensaio FICTÍCIO de recuperação" });
      const scope = {
        kind: "chat" as const,
        userId: context.userId,
        condominiumId: context.condominiumId,
        chatId
      };
      await journal.append(scope, {
        id: randomUUID(),
        requestKey: "synthetic-history",
        inputHash: conversationHash("synthetic-history"),
        createdAt: "2026-11-09T12:00:00.000Z",
        messages: [
          { id: randomUUID(), role: "user", kind: "setup", text: "Pergunta FICTÍCIA original" },
          { id: randomUUID(), role: "assistant", kind: "setup", text: "Resposta FICTÍCIA original" }
        ],
        response: { message: "Resposta FICTÍCIA original" },
        metadata: { origin: "synthetic-local-recovery" }
      });
      const document = await uploadDocument(
        storage,
        createPostgresDocumentUploadRepository(source),
        context,
        {
          title: "Documento FICTÍCIO",
          documentType: "convention",
          content: createSyntheticTextPdf(),
          validityConfirmed: true
        }
      );
      assert.equal(await processOne(queue, processor), "processed");
      const access = createAccessCodeService(createPostgresAccessCodeStore(source), secret);
      const code = await access.provision(context.userId);
      const session = await access.login(code);
      assert.ok(session);
      records.push({
        context,
        document,
        scope,
        history: await journal.list(scope),
        code,
        token: session.token
      });
    }
    // Existing MFA account fixture; this does not enable any product flow or delivery provider.
    const encryptedAccountId = randomUUID();
    const syntheticAccountKey = "8".repeat(64);
    const syntheticMfaSecret = "JBSWY3DPEHPK3PXP";
    await source.query(
      `INSERT INTO app.users(id,auth_subject,status,mfa_secret_ciphertext,mfa_enabled_at)
      VALUES($1,$2,'active',$3,'2026-11-09T12:00:00.000Z')`,
      [
        encryptedAccountId,
        `synthetic-mfa:${encryptedAccountId}`,
        createSecretCipher(syntheticAccountKey).seal(syntheticMfaSecret)
      ]
    );
    // Preserve pending work too, rather than backing up only an empty/completed queue.
    const pending = await uploadDocument(
      storage,
      createPostgresDocumentUploadRepository(source),
      contexts[0]!,
      {
        title: "Documento FICTÍCIO na fila",
        documentType: "other",
        content: createSyntheticTextPdf()
      }
    );
    recoveryPhase = "ledger_seed";
    await writeFile(
      resolve(reportDirectory, "ledger-identities.json"),
      JSON.stringify(
        records.map((record) => ({
          userId: record.context.userId,
          condominiumId: record.context.condominiumId,
          membershipRevision: record.context.membershipRevision,
          chatId: record.scope.chatId,
          documentVersionId: record.document.documentVersionId,
          contentSha256: record.document.contentSha256
        }))
      ),
      { flag: "wx", mode: 0o600 }
    );
    await verifyLedgerRecoveryInChild("seed");
    recoveryPhase = "backup";
    const dumpStartedAt = Date.now();
    const backup = await backupLocalApplication(
      sourceClient,
      sourceUrl,
      resolve(reportDirectory, "backup"),
      confirmation!,
      run
    );
    const dumpDurationMs = Date.now() - dumpStartedAt;
    assert.ok(backup.inventory.catalog.some((entry) => entry.kind === "defaultAcl"));
    const identities = backup.inventory.catalog.map((entry) => `${entry.kind}:${entry.identity}`);
    assert.equal(
      new Set(identities).size,
      identities.length,
      "Identidades do catálogo não podem colidir."
    );
    recoveryPhase = "restore";
    const restoreStartedAt = Date.now();
    await restoreLocalApplication(
      restoreClient,
      restoreUrl,
      resolve(reportDirectory, "backup"),
      confirmation!,
      run
    );
    const restoreDurationMs = Date.now() - restoreStartedAt;
    recoveryPhase = "stable_secrets";
    const encrypted = (
      await restored.query<{ mfa_secret_ciphertext: string }>(
        "SELECT mfa_secret_ciphertext FROM app.users WHERE id=$1",
        [encryptedAccountId]
      )
    ).rows[0]!.mfa_secret_ciphertext;
    assert.equal(createSecretCipher(syntheticAccountKey).open(encrypted), syntheticMfaSecret);
    assert.throws(() => createSecretCipher("9".repeat(64)).open(encrypted));
    await assert.rejects(
      createAccessCodeService(createPostgresAccessCodeStore(restored), secret).provision(
        encryptedAccountId
      ),
      (error: unknown) => (error as { code?: string }).code === "P0001"
    );
    recoveryPhase = "negative_recovery";
    await verifyRecoveryRefusals(restoreClient, restoreUrl, backup);
    recoveryPhase = "ledger_verify";
    await verifyLedgerRecoveryInChild("verify");
    recoveryPhase = "observation";
    await inspectOperationalSql(restoreClient);
    recoveryPhase = "service_logins";
    await verifyRestrictedLogins(restoreClient, restoreUrl);
    recoveryPhase = "isolation";
    for (const record of records) {
      assert.deepEqual(
        await createPostgresConversationStore(restored).list(record.scope),
        record.history
      );
      const other = records.find((item) => item.context !== record.context)!;
      await assert.rejects(
        asRuntime(restored, record.context, (client) =>
          client.query("SELECT * FROM app.access_codes")
        ),
        (error: unknown) => (error as { code?: string }).code === "42501"
      );
      await assert.rejects(
        createPostgresConversationStore(restored).list({
          ...record.scope,
          userId: other.context.userId
        })
      );
      await asRuntime(restored, record.context, async (client) => {
        const service = createAccessCodeService(createPostgresAccessCodeStore(client), secret);
        assert.equal((await service.authenticate(record.token))?.userId, record.context.userId);
        assert.equal(
          await createAccessCodeService(
            createPostgresAccessCodeStore(client),
            "9".repeat(64)
          ).authenticate(record.token),
          undefined
        );
        assert.ok(await service.login(record.code));
        const original = await client.query<{ content: Buffer }>(
          "SELECT content FROM app.document_original_contents WHERE storage_object_id=$1",
          [record.document.storageObjectId]
        );
        assert.deepEqual(original.rows[0]!.content, createSyntheticTextPdf());
        for (const table of [
          "documents",
          "document_pages",
          "document_chunks",
          "document_chunk_embeddings",
          "document_original_contents",
          "processing_jobs",
          "conversation_entries"
        ] as const) {
          const rows = await client.query<{ condominium_id: string }>(
            `SELECT condominium_id FROM app.${table}`
          );
          assert.ok(rows.rows.length > 0);
          assert.ok(rows.rows.every((row) => row.condominium_id === record.context.condominiumId));
        }
      });
      await asRuntime(
        restored,
        { ...record.context, condominiumId: other.context.condominiumId },
        async (client) => {
          for (const table of [
            "documents",
            "document_original_contents",
            "document_pages",
            "document_chunk_embeddings",
            "conversation_entries"
          ] as const)
            assert.equal((await client.query(`SELECT * FROM app.${table}`)).rows.length, 0);
        }
      );
      assert.ok(
        await createPostgresChatRepository(restored).create(record.context, {
          id: randomUUID(),
          title: "Escrita FICTÍCIA após restore"
        })
      );
    }
    recoveryPhase = "queue";
    assert.equal(
      (await restored.query("SELECT 1 FROM app.processing_jobs WHERE status='queued'")).rows.length,
      1
    );
    assert.equal(
      await processOne(
        createPostgresProcessingJobQueue(restored),
        createScopedDocumentProcessor(
          createPostgresDocumentProcessingRepository(
            restored,
            createPostgresPrivateDocumentStorage(restored)
          )
        )
      ),
      "processed"
    );
    assert.equal(
      (
        await restored.query<{ processing_status: string }>(
          "SELECT processing_status FROM app.document_version_states WHERE document_version_id=$1",
          [pending.documentVersionId]
        )
      ).rows[0]?.processing_status,
      "ready"
    );
    const maintenanceDatabase = await verifyMaintenanceRecovery(sourceUrl, run);
    recoveryPhase = "input_stability";
    assert.deepEqual(await migrationInputs(), migrations, "Migrations alteradas durante o ensaio.");
    assert.deepEqual(
      await recoveryCodeInputs(),
      integrationInputs,
      "Entradas da integração alteradas durante o ensaio."
    );
    await writeFile(
      resolve(reportDirectory, "result.json"),
      JSON.stringify(
        {
          verification: "synthetic-local-full-application-restore",
          passed: true,
          providerCalls: 0,
          activationAuthorized: false,
          identities: 2,
          inventoryCompared: true,
          crossTenantDenied: true,
          corruptedAndOccupiedTargetsRefused: true,
          rlsGrantAndOriginalTamperingDetected: true,
          operationalSqlExecuted: true,
          restrictedServiceLogins: 2,
          wrongDatabasePasswordsDenied: true,
          stableAccountSecretsVerified: true,
          wrongKeyAndMfaBypassDenied: true,
          ledgerBudgetLoginRecoveryVerified: true,
          policyRevisionReplayAfterRestoreDenied: true,
          ledgerRecoverySeparateProcesses: true,
          maintenanceRecoveryVerified: true,
          maintenanceSeparateProcesses: true,
          maintenanceFreshRestoreCompared: true,
          maintenanceDecisionsOutsideDump: true,
          maintenanceDatabase,
          postgresTools: process.env.PILOT_RECOVERY_DOCKER_CONTAINER ? "local-docker" : "native",
          inventoryTableCount: backup.inventory.tables.length,
          catalogObjectCount: backup.inventory.catalog.length,
          internalRoleCount: backup.inventory.roles.length,
          migrationInputs: migrations,
          integrationInputs,
          snapshotCounts: Object.fromEntries(
            backup.inventory.tables
              .filter((table) =>
                [
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
                  "schema_migrations",
                  "hosted_call_records",
                  "hosted_call_daily",
                  "operation_budget_receipts",
                  "operation_budget_policy",
                  "access_login_attempts"
                ].includes(table.name)
              )
              .map((table) => [table.name, table.rows])
          ),
          timingsMs: { dump: dumpDurationMs, restoreAndComparison: restoreDurationMs },
          databaseNames: [
            new URL(sourceUrl).pathname.slice(1),
            new URL(restoreUrl).pathname.slice(1)
          ],
          elapsedMs: Date.now() - startedAt
        },
        null,
        2
      ) + "\n",
      { flag: "wx", mode: 0o600 }
    );
  } finally {
    await sourceClient.end().catch(() => undefined);
    await restoreClient.end().catch(() => undefined);
    await source.end();
    await restored.end();
  }
}

const startedAt = Date.now();
try {
  if (confirmation !== "synthetic-local-only") throw new Error();
  const adminUrl = new URL(process.env.PILOT_RECOVERY_ADMIN_URL ?? "");
  const sourceUrl = new URL(adminUrl);
  sourceUrl.pathname = `/alvitra_ops_source_${runId}`;
  const restoreUrl = new URL(adminUrl);
  restoreUrl.pathname = `/alvitra_ops_restore_${runId}`;
  // Validate before even opening an administrative connection. No generic DATABASE_URL fallback.
  localRecoveryConnection(sourceUrl.toString(), "source", confirmation);
  localRecoveryConnection(restoreUrl.toString(), "restore", confirmation);
  if (adminUrl.pathname !== "/postgres") throw new Error();
  const run = process.env.PILOT_RECOVERY_DOCKER_CONTAINER
    ? await createDockerRecoveryRunner({
        containerName: process.env.PILOT_RECOVERY_DOCKER_CONTAINER,
        outputDirectory: resolve(".local", "pilot-operations")
      })
    : runPostgresRecoveryCommand;
  // Fail before creating databases if the native tools are unavailable.
  recoveryPhase = "tools";
  for (const executable of ["pg_dump", "pg_restore"] as const)
    await run(postgresRecoveryCommand(executable, sourceUrl, ["--version"]));
  await mkdir(reportDirectory, { recursive: true, mode: 0o700 });
  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000
  });
  await admin.connect();
  recoveryPhase = "database_setup";
  try {
    for (const [purpose, url] of [
      ["source", sourceUrl],
      ["restore", restoreUrl]
    ] as const) {
      const name = url.pathname.slice(1);
      await admin.query(`CREATE DATABASE "${name}"`);
      const client = new Client({
        connectionString: url.toString(),
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        await client.query("CREATE SCHEMA ops_control");
        await client.query(
          "CREATE TABLE ops_control.environment(purpose text NOT NULL, data_policy text NOT NULL)"
        );
        await client.query(
          "INSERT INTO ops_control.environment VALUES($1,'synthetic-local-only')",
          [purpose]
        );
      } finally {
        await client.end();
      }
    }
  } finally {
    await admin.end();
  }
  await exercise(sourceUrl.toString(), restoreUrl.toString(), run);
  console.info(
    JSON.stringify({
      code: "pilot_recovery_exercise_passed",
      reportDirectory,
      activationAuthorized: false
    })
  );
} catch (error) {
  console.error(
    JSON.stringify({
      code: "pilot_recovery_exercise_not_validated",
      phase: recoveryPhase,
      ...((error as { phase?: string })?.phase &&
      ["arguments", "inspection", "metadata", "tool"].includes((error as { phase: string }).phase)
        ? { toolPhase: (error as { phase: string }).phase }
        : {}),
      activationAuthorized: false,
      requirement:
        "PostgreSQL/pgvector e pg_dump/pg_restore locais; confirmação e conexão administrativa sintética explícitas. Destinos criados ficam em quarentena."
    })
  );
  process.exitCode = 1;
}
