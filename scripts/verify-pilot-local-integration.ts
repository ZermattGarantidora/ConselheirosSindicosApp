import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";
import { migrateDatabase } from "./database-migrations.js";
import { localRecoveryConnection } from "./pilot-recovery.js";
import {
  parseLocalIntegrationUrl,
  assertLocalIntegrationTarget
} from "./local-integration-guard.js";

let phase = "guards";
const runId = randomUUID().replaceAll("-", "");
const directory = resolve(".local", "pilot-operations", runId);
const env: Record<string, string> = {};
for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
  if (process.env[name]) env[name] = process.env[name]!;
const run = async (args: string[]) => {
  try {
    const result = await promisify(execFile)(process.execPath, args, {
      env,
      shell: false,
      windowsHide: true,
      timeout: 240000,
      maxBuffer: 16777216
    });
    await writeFile(resolve(directory, `${phase}.log`), result.stdout, { flag: "wx", mode: 0o600 });
  } catch (error) {
    // Child output contains only synthetic harness diagnostics; keep native errors out of logs.
    const stdout = (error as { stdout?: string }).stdout ?? "";
    await writeFile(resolve(directory, `${phase}.log`), stdout, { flag: "wx", mode: 0o600 });
    throw new Error("Gate local não concluído.");
  }
};
try {
  const suite = process.argv[2];
  assert.ok(
    suite === "worker" || suite === "rls" || suite === "documents" || suite === "authoring"
  );
  const documentSuite = suite === "documents" || suite === "authoring";
  assert.equal(process.argv.length, 3);
  assert.equal(process.env.PILOT_RECOVERY_CONFIRMATION, "synthetic-local-only");
  const adminUrl = new URL(process.env.PILOT_RECOVERY_ADMIN_URL ?? "");
  assert.equal(adminUrl.pathname, "/postgres");
  const url = new URL(adminUrl);
  url.pathname = `/alvitra_ops_${documentSuite ? "source" : suite}_${runId}`;
  const restoreUrl = new URL(adminUrl);
  restoreUrl.pathname = `/alvitra_ops_restore_${runId}`;
  const documentConfig =
    suite === "authoring"
      ? "tests/vitest.authoring-postgres.config.ts"
      : "tests/vitest.pilot-document-lifecycle.config.ts";
  if (documentSuite) {
    localRecoveryConnection(url.toString(), "source", "synthetic-local-only");
    localRecoveryConnection(restoreUrl.toString(), "restore", "synthetic-local-only");
    // Refuse a missing integration contract before creating databases or other resources.
    assert.ok((await readFile(documentConfig, "utf8")).trim().length > 0);
  } else parseLocalIntegrationUrl(url.toString(), "synthetic-local-only", suite);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  phase = "database_setup";
  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000
  });
  try {
    await admin.connect();
    for (const target of documentSuite ? [url, restoreUrl] : [url])
      await admin.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
  } finally {
    await admin.end();
  }
  const database = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  try {
    await database.connect();
    await database.query("CREATE SCHEMA ops_control");
    await database.query(
      "CREATE TABLE ops_control.environment(purpose text NOT NULL,data_policy text NOT NULL)"
    );
    await database.query("INSERT INTO ops_control.environment VALUES($1,'synthetic-local-only')", [
      documentSuite ? "source" : suite
    ]);
    if (documentSuite) {
      const marker = await database.query(
        "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
      );
      assert.deepEqual(marker.rows, [
        { name: url.pathname.slice(1), purpose: "source", data_policy: "synthetic-local-only" }
      ]);
    } else await assertLocalIntegrationTarget(database, suite);
    await migrateDatabase(database);
    if (suite === "worker") {
      const login = `ops_exec_worker_${runId}`;
      await database.query(
        `CREATE ROLE "${login}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
      );
      await database.query(`GRANT app_worker TO "${login}"`);
      const executionUrl = new URL(url);
      executionUrl.username = login;
      executionUrl.password = "synthetic-only";
      env.SYNTHETIC_WORKER_EXECUTION_DATABASE_URL = executionUrl.toString();
    }
  } finally {
    await database.end();
  }
  if (documentSuite) {
    const restore = new Client({
      connectionString: restoreUrl.toString(),
      connectionTimeoutMillis: 5000
    });
    try {
      await restore.connect();
      await restore.query("CREATE SCHEMA ops_control");
      await restore.query(
        "CREATE TABLE ops_control.environment(purpose text NOT NULL,data_policy text NOT NULL)"
      );
      await restore.query(
        "INSERT INTO ops_control.environment VALUES('restore','synthetic-local-only')"
      );
      await restore.query("CREATE EXTENSION vector");
    } finally {
      await restore.end();
    }
    env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL = url.toString();
    env.PILOT_DOCUMENTS_RESTORE_DATABASE_URL = restoreUrl.toString();
    env.PILOT_DOCUMENTS_RUN_ID = runId;
    env.PILOT_RECOVERY_CONFIRMATION = "synthetic-local-only";
    if (process.env.PILOT_RECOVERY_DOCKER_CONTAINER)
      env.PILOT_RECOVERY_DOCKER_CONTAINER = process.env.PILOT_RECOVERY_DOCKER_CONTAINER;
  } else {
    env.LOCAL_INTEGRATION_DATABASE_URL = url.toString();
    env.LOCAL_INTEGRATION_CONFIRMATION = "synthetic-local-only";
  }
  env.PILOT_LOCAL_REPORT_DIRECTORY = directory;
  if (suite === "worker") {
    phase = "build";
    const compiled = resolve(directory, "compiled");
    await run(["node_modules/typescript/bin/tsc", "-p", "tsconfig.api.json", "--outDir", compiled]);
    phase = "worker";
    env.SYNTHETIC_WORKER_BUILD_ROOT = compiled;
    env.SYNTHETIC_WORKER_REPORT_DIRECTORY = directory;
    await run(["scripts/run-tsx.mjs", "scripts/verify-separated-worker.mjs", "--provider=local"]);
    const proof = JSON.parse(await readFile(resolve(directory, "worker-result.json"), "utf8"));
    assert.equal(proof.passed, true);
    assert.equal(proof.paidAiCalls, 0);
  } else if (suite === "rls") {
    phase = "rls";
    await run([
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "infrastructure/pilot/vitest.rls.config.ts"
    ]);
    const proof = JSON.parse(await readFile(resolve(directory, "rls-result.json"), "utf8"));
    assert.equal(proof.numFailedTests, 0);
    assert.ok(proof.numPassedTests > 0);
    assert.equal(proof.success, true);
  } else {
    phase = "documents";
    await run([
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      documentConfig,
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${resolve(directory, "document-lifecycle-tests.json")}`
    ]);
    const tests = JSON.parse(
      await readFile(resolve(directory, "document-lifecycle-tests.json"), "utf8")
    );
    assert.equal(tests.numFailedTests, 0);
    assert.ok(tests.numPassedTests > 0);
    assert.equal(tests.success, true);
    const proof = JSON.parse(
      await readFile(
        resolve(
          directory,
          suite === "authoring" ? "authoring-proof.json" : "document-lifecycle-proof.json"
        ),
        "utf8"
      )
    );
    assert.equal(proof.passed, true);
    assert.equal(proof.providerCalls, 0);
    assert.equal(proof.activationAuthorized, false);
    assert.equal(proof.runId, runId);
    if (suite === "authoring") {
      const financial = JSON.parse(
        await readFile(resolve(directory, "financial-report-proof.json"), "utf8")
      );
      assert.equal(financial.passed, true);
      assert.equal(financial.runId, runId);
      assert.equal(financial.providerCalls, 0);
      assert.equal(financial.limitsActive, false);
      assert.equal(financial.processRestart, true);
      assert.equal(financial.restored, true);
      assert.equal(financial.pages, 300);
      assert.equal(financial.changedPage300Blocked, true);
    }
  }
  await writeFile(
    resolve(directory, "result.json"),
    JSON.stringify(
      {
        passed: true,
        suite,
        providerCalls: 0,
        activationAuthorized: false,
        databaseName: url.pathname.slice(1),
        ...(documentSuite ? { restoreDatabaseName: restoreUrl.pathname.slice(1) } : {}),
        buildAndReportsExclusive: true,
        workerRestrictedLogin: suite === "worker"
      },
      null,
      2
    ),
    { flag: "wx", mode: 0o600 }
  );
  console.info(
    JSON.stringify({ code: "pilot_local_integration_passed", reportDirectory: directory })
  );
} catch {
  console.error(
    JSON.stringify({ code: "pilot_local_integration_failed", phase, activationAuthorized: false })
  );
  process.exitCode = 1;
}
