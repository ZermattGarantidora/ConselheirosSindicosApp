import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { syntheticWorkerDatabase } from "./synthetic-worker-database.ts";
import { parseLocalIntegrationUrl } from "./local-integration-guard.ts";
import { createLongPdfDocument, renderFullPagePdf } from "../tests/fixtures/full-page-documents.ts";
import {
  createSyntheticTextPdf,
  createSyntheticScannedPdf
} from "../tests/fixtures/synthetic-pdfs.ts";
import { createPostgresProcessingJobQueue } from "../apps/api/worker/postgres-processing-job-queue.ts";
import { createPostgresPrivateDocumentStorage } from "../apps/api/documents/postgres-private-document-storage.ts";
import { createPostgresDocumentProcessingRepository } from "../apps/api/documents/postgres-document-processing-repository.ts";
import { createScopedDocumentProcessor } from "../apps/api/documents/document-processing.ts";
import { createPostgresDocumentAnalysisReader } from "../apps/api/analysis/document-analysis-reader.ts";
import { createPostgresScopedRetrievalIndex } from "../apps/api/retrieval/postgres-scoped-retrieval.ts";

const provider = process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1] ?? "neon";
const output = process.env.SYNTHETIC_WORKER_REPORT_DIRECTORY
  ? path.resolve(process.env.SYNTHETIC_WORKER_REPORT_DIRECTORY, "worker-result.json")
  : path.resolve("reports/worker-separated/latest.json");
const compiledRoot = process.env.SYNTHETIC_WORKER_BUILD_ROOT ?? path.resolve("dist");
const report = {
  specification: "069",
  syntheticOnly: true,
  provider,
  paidAiCalls: 0,
  checks: [],
  metrics: {}
};
const children = new Set();
let pool;
let lock;
let stage = "synthetic_database_guard";
const childEnvironment = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP"]
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]])
);
const databaseKey =
  provider === "local"
    ? "LOCAL_INTEGRATION_DATABASE_URL"
    : provider === "neon"
      ? "NEON_INTEGRATION_DATABASE_URL"
      : "SUPABASE_INTEGRATION_DATABASE_URL";
const confirmationKey =
  provider === "local"
    ? "LOCAL_INTEGRATION_CONFIRMATION"
    : provider === "neon"
      ? "NEON_INTEGRATION_CONFIRMATION"
      : "SUPABASE_INTEGRATION_CONFIRMATION";

function child(args, environment) {
  const process = spawn(globalThis.process.execPath, args, {
    env: { ...childEnvironment, ...environment },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  // Retain only aggregate diagnostics; never echo connection strings or input documents.
  let stderrBytes = 0;
  process.stderr.on("data", (chunk) => {
    stderrBytes += chunk.length;
  });
  process.stdout.on("data", () => {});
  process.on("exit", () => children.delete(process));
  process.on("error", () => {});
  children.add(process);
  return { process, stderrBytes: () => stderrBytes };
}

async function until(operation, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await operation();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Ensaio excedeu o prazo na etapa ${stage}.`);
}

async function stop(process, abrupt = false) {
  if (process.exitCode !== null || process.signalCode !== null) return;
  const exited = once(process, "exit");
  if (abrupt) process.kill("SIGKILL");
  else process.send("stop");
  await Promise.race([exited, delay(5000).then(() => process.kill("SIGKILL"))]);
}

async function startApi() {
  const api = child(["--import", "tsx", "tests/fixtures/separated-worker-api.mjs"], {
    SYNTHETIC_WORKER_PROVIDER: provider,
    SYNTHETIC_WORKER_BUILD_ROOT: compiledRoot,
    [databaseKey]: process.env[databaseKey],
    [confirmationKey]: process.env[confirmationKey],
    ...(provider !== "supabase" || process.env.SUPABASE_INTEGRATION_CA_CERT === undefined
      ? {}
      : {
          SUPABASE_INTEGRATION_CA_CERT: process.env.SUPABASE_INTEGRATION_CA_CERT
        })
  });
  const ready = await Promise.race([
    once(api.process, "message"),
    once(api.process, "exit").then(() => {
      throw new Error("API sintética não iniciou.");
    }),
    delay(20_000).then(() => {
      throw new Error("API sintética excedeu o prazo de início.");
    })
  ]);
  assert.equal(ready[0].type, "ready");
  return { ...api, base: `http://127.0.0.1:${ready[0].address.port}` };
}

function startWorker() {
  return child([path.join(compiledRoot, "api/worker/main.js")], {
    APP_ENV: "development",
    DEMO_MODE: "false",
    DATABASE_URL: process.env.SYNTHETIC_WORKER_EXECUTION_DATABASE_URL ?? process.env[databaseKey],
    ...(provider === "supabase"
      ? { DOCUMENT_WORKER_SSL_CA: process.env.SUPABASE_INTEGRATION_CA_CERT }
      : {}),
    DOCUMENT_WORKER_POLL_MS: "50",
    DOCUMENT_WORKER_LEASE_SECONDS: "30",
    DOCUMENT_WORKER_HEARTBEAT_MS: "500"
  });
}

async function main() {
  if (provider === "local") {
    const execution = parseLocalIntegrationUrl(
      process.env.SYNTHETIC_WORKER_EXECUTION_DATABASE_URL,
      process.env[confirmationKey],
      "worker"
    );
    const fixtures = parseLocalIntegrationUrl(
      process.env[databaseKey],
      process.env[confirmationKey],
      "worker"
    );
    assert.equal(execution.host, fixtures.host);
    assert.equal(execution.pathname, fixtures.pathname);
    assert.equal(execution.username, `ops_exec_worker_${execution.pathname.split("_").at(-1)}`);
  }
  pool = await syntheticWorkerDatabase(provider);
  stage = "synthetic_fixtures";
  // This target is dedicated and marked synthetic. No application or customer database is accepted.
  await pool.query("TRUNCATE app.users, app.condominiums CASCADE");
  const condominiumIds = [randomUUID(), randomUUID()];
  await pool.query(
    "INSERT INTO app.condominiums (id, display_name, status) VALUES ($1,'Alameda sintética','active'),($2,'Bosque sintético','active')",
    condominiumIds
  );
  const users = [];
  for (let index = 0; index < 10; index++) {
    const user = {
      id: randomUUID(),
      subject: `worker-synthetic-${randomUUID()}`,
      condominiumId: condominiumIds[index === 9 ? 1 : 0]
    };
    users.push(user);
    await pool.query("INSERT INTO app.users (id, auth_subject, status) VALUES ($1,$2,'active')", [
      user.id,
      user.subject
    ]);
    await pool.query(
      "INSERT INTO app.memberships (condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES ($1,$2,$3,'manager','active',now() - interval '1 day','v1')",
      [user.condominiumId, randomUUID(), user.id]
    );
  }
  let api = await startApi();
  const headers = (user) => ({ "x-development-user-id": user.subject });
  const request = (route, user, init = {}) =>
    globalThis.fetch(`${api.base}${route}`, {
      ...init,
      headers: { ...headers(user), ...init.headers },
      signal: globalThis.AbortSignal.timeout(30_000)
    });
  const route = (user) => `/v1/condominiums/${user.condominiumId}/documents`;
  const chatId = randomUUID();
  const createdChat = await request(`/v1/condominiums/${users[0].condominiumId}/chats`, users[0], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: chatId, title: "Ensaio sintético do worker" })
  });
  assert.equal(createdChat.status, 201);
  const upload = async (user, content, title = "Documento sintético", chat) => {
    const response = await request(route(user), user, {
      method: "POST",
      body: content,
      headers: {
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(title),
        "x-document-type": "other",
        "x-document-validity-confirmed": "true",
        ...(chat ? { "x-chat-id": chat } : {})
      }
    });
    assert.equal(response.status, 202);
    return response.json();
  };
  const state = async (versionId) =>
    (
      await pool.query(
        `SELECT jobs.id, jobs.status, jobs.attempt_count, states.processing_status
     FROM app.processing_jobs AS jobs JOIN app.document_version_states AS states
       ON states.condominium_id = jobs.condominium_id AND states.document_version_id = jobs.document_version_id
     WHERE jobs.document_version_id = $1`,
        [versionId]
      )
    ).rows[0];
  const long = createLongPdfDocument();
  const content = renderFullPagePdf(long);
  stage = "upload_without_worker";
  const uploaded = await upload(users[0], content, long.title, chatId);
  assert.equal((await state(uploaded.documentVersionId)).status, "queued");
  const original = await request(`${route(users[0])}/${uploaded.documentVersionId}/file`, users[0]);
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), content);
  report.checks.push("upload_202_original_private_without_worker");

  stage = "worker_interruption";
  lock = await pool.connect();
  await lock.query("BEGIN");
  await lock.query("LOCK TABLE app.document_original_contents IN ACCESS EXCLUSIVE MODE");
  const interrupted = startWorker();
  await until(
    async () => (await state(uploaded.documentVersionId)).status === "processing",
    20_000
  );
  await stop(interrupted.process, true);
  const abandoned = await state(uploaded.documentVersionId);
  assert.equal(abandoned.attempt_count, 1);
  // Advance only the abandoned synthetic lease; the real worker still uses its normal clock.
  await pool.query(
    "UPDATE app.processing_jobs SET lease_expires_at = now() - interval '1 second' WHERE id = $1",
    [abandoned.id]
  );
  report.metrics.abandonedLeaseExpirySimulated = true;
  await lock.query("ROLLBACK");
  lock.release();
  lock = undefined;
  report.checks.push("worker_killed_after_claim_before_original_read");

  stage = "ten_users_during_pending_job";
  const measurements = await Promise.all(
    users.map(async (user) => {
      const started = performance.now();
      const response = await request(route(user), user);
      assert.equal(response.status, 200);
      const catalog = await response.json();
      if (user === users[9]) assert.equal(catalog.documents.length, 0);
      return Math.round(performance.now() - started);
    })
  );
  report.metrics.catalogRequests = 10;
  report.metrics.catalogLatencyMs = measurements;
  const denied = await request(`/v1/condominiums/${users[0].condominiumId}/documents`, users[9]);
  assert.equal(denied.status, 403);
  report.checks.push("ten_synthetic_identities_and_cross_tenant_denial");

  stage = "api_restart_pending_job";
  await stop(api.process);
  api = await startApi();
  const history = await request(
    `/v1/condominiums/${users[0].condominiumId}/chats/${chatId}/messages`,
    users[0]
  );
  assert.equal(history.status, 200);
  assert.equal(
    (await history.json()).entries.filter(
      (entry) => entry.metadata.documentVersionId === uploaded.documentVersionId
    ).length,
    1
  );
  report.checks.push("upload_journal_survives_api_restart");

  stage = "worker_restart_long_pdf";
  const worker = startWorker();
  const processingStarted = performance.now();
  await until(async () => (await state(uploaded.documentVersionId)).processing_status === "ready");
  report.metrics.longPdfRecoveryMs = Math.round(performance.now() - processingStarted);
  assert.equal((await state(uploaded.documentVersionId)).attempt_count, 2);
  const context = {
    condominiumId: users[0].condominiumId,
    userId: users[0].id,
    roleKey: "manager",
    membershipRevision: "v1",
    permissions: ["document:read", "document:upload"]
  };
  const reader = createPostgresDocumentAnalysisReader(pool);
  const [indexed] = await reader.readAuthorized(context, [uploaded.documentVersionId]);
  assert.equal(indexed.pages.length, 300);
  for (const [index, page] of long.pages.entries())
    assert.equal(indexed.pages[index].extractedText, page.expectedText);
  const index = createPostgresScopedRetrievalIndex(pool);
  const search = { query: "R0300", limit: 50, minimumQualityScore: 0.7, asOf: new Date() };
  const candidates = await index.findAuthorizedCandidates(context, search);
  assert(
    candidates.some(
      (candidate) =>
        candidate.documentVersionId === uploaded.documentVersionId && candidate.pageNumber === 300
    )
  );
  assert.deepEqual(
    await reader.readAuthorized({ ...context, condominiumId: users[9].condominiumId }, [
      uploaded.documentVersionId
    ]),
    []
  );
  assert.deepEqual(
    await index.findAuthorizedCandidates(
      { ...context, condominiumId: users[9].condominiumId },
      search
    ),
    []
  );
  report.metrics.longPdfPages = indexed.pages.length;
  report.checks.push("300_pages_recovered_complete_with_page_300_evidence");

  stage = "ten_uploads_two_workers";
  const secondWorker = startWorker();
  const smallUploads = await Promise.all(
    users.map((user) => upload(user, createSyntheticTextPdf()))
  );
  await until(async () =>
    (await Promise.all(smallUploads.map((item) => state(item.documentVersionId)))).every(
      (item) => item.processing_status === "ready"
    )
  );
  const counts = await pool.query(
    `SELECT document_version_id, count(*)::int AS pages FROM app.document_pages
    WHERE document_version_id = ANY($1::uuid[]) GROUP BY document_version_id`,
    [smallUploads.map((item) => item.documentVersionId)]
  );
  assert.equal(counts.rows.length, 10);
  assert(counts.rows.every((row) => row.pages === 2));
  report.checks.push("ten_uploads_two_workers_no_duplicate_pages");
  await stop(worker.process, true);
  await stop(secondWorker.process, true);

  stage = "lease_fencing_and_retries";
  const retry = await upload(users[0], createSyntheticTextPdf());
  const queue = createPostgresProcessingJobQueue(pool, { leaseSeconds: 30 });
  const firstAttempt = await queue.claimNext();
  assert.equal(firstAttempt.documentVersionId, retry.documentVersionId);
  assert.equal(await queue.renewLease(firstAttempt), true);
  assert.equal(
    await queue.renewLease({ ...firstAttempt, condominiumId: users[9].condominiumId }),
    false
  );
  await queue.fail(firstAttempt);
  assert.equal((await state(retry.documentVersionId)).processing_status, "processing");
  await pool.query(
    "UPDATE app.processing_jobs SET available_at = now() - interval '1 second' WHERE id = $1",
    [firstAttempt.jobId]
  );
  const secondAttempt = await queue.claimNext();
  assert.equal(secondAttempt.attemptCount, 2);
  assert.equal(await queue.renewLease(firstAttempt), false);
  const processor = createScopedDocumentProcessor(
    createPostgresDocumentProcessingRepository(pool, createPostgresPrivateDocumentStorage(pool))
  );
  await assert.rejects(() => processor.process(firstAttempt));
  await processor.process(secondAttempt);
  assert.equal((await state(retry.documentVersionId)).processing_status, "ready");
  report.checks.push("renewal_old_attempt_fenced_and_transient_retry");

  stage = "last_attempt_crash";
  const last = await upload(users[0], createSyntheticTextPdf());
  await pool.query(
    "UPDATE app.processing_jobs SET max_attempts = 1 WHERE document_version_id = $1",
    [last.documentVersionId]
  );
  const expired = await queue.claimNext();
  assert.equal(expired.documentVersionId, last.documentVersionId);
  await pool.query(
    "UPDATE app.processing_jobs SET lease_expires_at = now() - interval '1 second' WHERE id = $1",
    [expired.jobId]
  );
  assert.equal(await queue.renewLease(expired), false);
  await queue.claimNext();
  assert.equal((await state(last.documentVersionId)).status, "failed");
  assert.equal((await state(last.documentVersionId)).processing_status, "failed");
  report.checks.push("exhausted_crashed_job_becomes_terminal");

  stage = "unreadable_pdf_stays_in_review";
  const scanned = await upload(users[0], createSyntheticScannedPdf());
  const scannedJob = await queue.claimNext();
  await processor.process(scannedJob);
  assert.equal((await state(scanned.documentVersionId)).processing_status, "needs_review");
  report.checks.push("no_ocr_calls_no_false_complete_pdf");
  await stop(api.process);
  report.passed = true;
}

try {
  await main();
} catch (error) {
  report.passed = false;
  report.failedStage = stage;
  report.errorType = error instanceof Error ? error.name : "UnknownError";
  console.error(
    JSON.stringify({
      code: "separated_worker_validation_failed",
      stage,
      errorType: report.errorType
    })
  );
  process.exitCode = 1;
} finally {
  if (lock) {
    await lock.query("ROLLBACK").catch(() => {});
    lock.release();
  }
  await Promise.all([...children].map((process) => stop(process, true)));
  await pool?.end();
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    JSON.stringify({
      code: "separated_worker_validation_finished",
      passed: report.passed,
      report: output
    })
  );
}
