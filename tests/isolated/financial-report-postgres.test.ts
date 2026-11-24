import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, Client } from "pg";
import { it, expect } from "vitest";
import { localRecoveryConnection } from "../../scripts/pilot-recovery.js";
import { migrateDatabase } from "../../scripts/database-migrations.js";
import { createDocumentLifecycleRestorer } from "../fixtures/document-lifecycle-restore.js";
import { financialCorpusPdf } from "../fixtures/financial-corpus.js";
import { syntheticFinancialReportModel } from "../fixtures/financial-report-model.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import { createPostgresPrivateDocumentStorage } from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresDocumentSourceReader } from "../../apps/api/documents/document-source.js";
import { createPostgresDocumentAnalysisReader } from "../../apps/api/analysis/document-analysis-reader.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";
import { createScopedPostgresDocumentProcessor } from "../../apps/api/documents/postgres-document-processing-repository.js";
it("AC-7359/7360: 300 páginas, relatório editado e PDF sobrevivem a processo novo/restore sem modelo ou limites ativos", async () => {
  const parent = localRecoveryConnection(
      process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL,
      "source",
      process.env.PILOT_RECOVERY_CONFIRMATION
    ),
    directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY!,
    runId = process.env.PILOT_DOCUMENTS_RUN_ID!,
    suffix = randomUUID().replaceAll("-", "");
  const adminRoot = new URL(parent);
  adminRoot.pathname = "/postgres";
  const admin = new Client({ connectionString: adminRoot.toString() });
  await admin.connect();
  const source = new URL(parent),
    restore = new URL(parent);
  source.pathname = `/alvitra_ops_source_${suffix}`;
  restore.pathname = `/alvitra_ops_restore_${suffix}`;
  const runtimeRole = `finance_runtime_${suffix}`,
    workerRole = `finance_worker_${suffix}`;
  let api: ReturnType<typeof createApi> | undefined,
    runtime: Pool | undefined,
    worker: Pool | undefined,
    db: Pool | undefined;
  try {
    const guard = new Client({ connectionString: parent.toString() });
    await guard.connect();
    try {
      expect(
        (await guard.query("SELECT purpose,data_policy FROM ops_control.environment")).rows
      ).toEqual([{ purpose: "source", data_policy: "synthetic-local-only" }]);
    } finally {
      await guard.end();
    }
    for (const target of [source, restore]) {
      expect(target.pathname).toMatch(/^\/alvitra_ops_(source|restore)_[a-f0-9]{32}$/u);
      await admin.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
    }
    const setup = new Client({ connectionString: source.toString() });
    await setup.connect();
    try {
      await migrateDatabase(setup);
      await setup.query(
        "CREATE SCHEMA ops_control;CREATE TABLE ops_control.environment(purpose text,data_policy text);INSERT INTO ops_control.environment VALUES('source','synthetic-local-only')"
      );
    } finally {
      await setup.end();
    }
    const empty = new Client({ connectionString: restore.toString() });
    await empty.connect();
    try {
      await empty.query(
        "CREATE SCHEMA ops_control;CREATE TABLE ops_control.environment(purpose text,data_policy text);INSERT INTO ops_control.environment VALUES('restore','synthetic-local-only');CREATE EXTENSION vector"
      );
    } finally {
      await empty.end();
    }
    for (const [role, group] of [
      [runtimeRole, "app_runtime"],
      [workerRole, "app_worker"]
    ]) {
      await admin.query(
        `CREATE ROLE "${role}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
      );
      await admin.query(`GRANT ${group} TO "${role}"`);
    }
    db = new Pool({ connectionString: source.toString() });
    const tenant = randomUUID(),
      foreign = randomUUID(),
      user = randomUUID(),
      other = randomUUID(),
      chat = randomUUID(),
      id = randomUUID(),
      headers = { "x-development-user-id": user };
    for (const u of [user, other])
      await db.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
        u,
        `FICTICIO-${u}`
      ]);
    for (const t of [tenant, foreign]) {
      await db.query(
        "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTÍCIO financeiro','active')",
        [t]
      );
      for (const u of [user, other])
        await db.query(
          "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','financial-v2')",
          [t, randomUUID(), u]
        );
    }
    expect(
      (await db.query("SELECT enabled FROM app.operation_budget_policy")).rows.every(
        (r) => r.enabled === false
      )
    ).toBe(true);
    const runtimeUrl = new URL(source);
    runtimeUrl.username = runtimeRole;
    runtimeUrl.password = "synthetic-only";
    runtime = new Pool({ connectionString: runtimeUrl.toString(), max: 4 });
    const workerUrl = new URL(source);
    workerUrl.username = workerRole;
    workerUrl.password = "synthetic-only";
    worker = new Pool({ connectionString: workerUrl.toString(), max: 4 });
    let calls = 0;
    api = createApi({
      membershipRepository: createPostgresMembershipRepository(runtime),
      chatRepository: createPostgresChatRepository(runtime),
      conversationStore: createPostgresConversationStore(runtime),
      documentCatalogRepository: createPostgresDocumentUploadRepository(runtime),
      documentUploadRepository: createPostgresDocumentUploadRepository(runtime),
      documentStorage: createPostgresPrivateDocumentStorage(runtime),
      documentSourceReader: createPostgresDocumentSourceReader(runtime),
      documentAnalysisReader: createPostgresDocumentAnalysisReader(runtime),
      financialReportModel: syntheticFinancialReportModel(() => calls++)
    });
    expect(
      (
        await api.inject({
          method: "POST",
          url: `/v1/condominiums/${tenant}/chats`,
          headers,
          payload: { id: chat, title: "FICTÍCIO - caderno financeiro" }
        })
      ).statusCode
    ).toBe(201);
    const corpus = financialCorpusPdf();
    const upload = await api.inject({
      method: "POST",
      url: `/v1/condominiums/${tenant}/documents`,
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(corpus.book.title),
        "x-document-type": "other",
        "x-document-validity-confirmed": "true",
        "x-chat-id": chat
      },
      payload: corpus.pdf
    });
    expect(upload.statusCode, upload.body).toBe(202);
    const item = upload.json(),
      queue = createPostgresProcessingJobQueue(worker),
      job = await queue.claimNext();
    expect(job).toBeDefined();
    await createScopedPostgresDocumentProcessor(
      worker,
      createPostgresPrivateDocumentStorage(worker)
    ).process(job!);
    const base = `/v1/condominiums/${tenant}/chats/${chat}`,
      request = { documentVersionIds: [item.documentVersionId], currentDocumentKey: "BAL-OUT" },
      report = `${base}/financial-reports/${id}`,
      draftPath = `${base}/document-drafts/${id}`;
    const prepared = await api.inject({ method: "POST", url: report, headers, payload: request });
    expect(prepared.statusCode, prepared.body.slice(0, 500)).toBe(200);
    expect(prepared.json().analysis.inventory).toHaveLength(300);
    expect(prepared.json().draft.text).toContain(
      "suporte parcial de R$ 9.382,80; faltam R$ 305,95"
    );
    const draft = prepared.json().draft;
    const edited = await api.inject({
      method: "POST",
      url: draftPath,
      headers,
      payload: {
        expectedEvent: draft.event,
        content: {
          ...draft,
          text: draft.text + "\nEdição humana persistente: conferir antes de usar."
        }
      }
    });
    expect(edited.statusCode, edited.body).toBe(200);
    const revision = edited.json().draft;
    expect(
      (
        await api.inject({
          method: "POST",
          url: `${draftPath}/decide`,
          headers,
          payload: {
            expectedEvent: revision.event,
            hash: revision.hash,
            confirm: true,
            reviewed: true
          }
        })
      ).statusCode
    ).toBe(200);
    const pdf = await api.inject({
      method: "GET",
      url: `${draftPath}/pdf?hash=${revision.hash}`,
      headers
    });
    expect(pdf.statusCode).toBe(200);
    expect(calls).toBe(2);
    const sourceHash = createHash("sha256").update(corpus.pdf).digest("hex"),
      pdfHash = createHash("sha256").update(pdf.rawPayload).digest("hex");
    await writeFile(resolve(directory, "financial-report.pdf"), pdf.rawPayload);
    await api.close();
    api = undefined;
    await runtime.end();
    runtime = undefined;
    await worker.end();
    worker = undefined;
    const recover = async (
      target: string,
      purpose: "source" | "restore",
      mode: "ready" | "changed" | "revoked"
    ) => {
      const url = new URL(target);
      url.username = runtimeRole;
      url.password = "synthetic-only";
      const path = resolve(directory, `financial-process-${purpose}-${mode}.json`);
      await writeFile(
        path,
        JSON.stringify({
          purpose,
          tenant,
          foreign,
          user,
          other,
          chat,
          id,
          version: item.documentVersionId,
          request,
          draftHash: revision.hash,
          pdfHash,
          sourceHash,
          mode
        })
      );
      const env: Record<string, string> = {
        FINANCIAL_PROCESS_CONFIG: path,
        FINANCIAL_PROCESS_DATABASE_URL: url.toString(),
        FINANCIAL_PROCESS_CONFIRMATION: "synthetic-local-only"
      };
      for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
        if (process.env[key]) env[key] = process.env[key]!;
      const output = await promisify(execFile)(
        process.execPath,
        ["scripts/run-tsx.mjs", "tests/fixtures/financial-report-process.ts"],
        { env, shell: false, windowsHide: true, timeout: 90000, maxBuffer: 1048576 }
      );
      const result = JSON.parse(output.stdout.trim().split(/\r?\n/u).at(-1)!);
      expect(result.passed).toBe(true);
      expect(result.processId).not.toBe(process.pid);
      await writeFile(path.replace(".json", "-result.json"), JSON.stringify(result));
      return result.processId;
    };
    const restartedPid = await recover(source.toString(), "source", "ready");
    const financialDirectory = resolve(".local/pilot-operations", suffix);
    await mkdir(financialDirectory, { recursive: true });
    const restorer = createDocumentLifecycleRestorer({
      sourceUrl: source.toString(),
      restoreUrl: restore.toString(),
      runId: suffix,
      directory: financialDirectory,
      containerName: process.env.PILOT_RECOVERY_DOCKER_CONTAINER!,
      confirmation: "synthetic-local-only"
    });
    await restorer.backup("financial-confirmed");
    const restored = await restorer.restore("financial-confirmed"),
      restoredPid = await recover(restored, "restore", "ready");
    const restoredAdmin = new Pool({ connectionString: restored });
    try {
      await restoredAdmin.query(
        "UPDATE app.document_pages SET extracted_text=extracted_text||E'\\nAlteração sintética tardia.' WHERE condominium_id=$1 AND document_version_id=$2 AND page_number=300",
        [tenant, item.documentVersionId]
      );
      await recover(restored, "restore", "changed");
      await restoredAdmin.query(
        "UPDATE app.memberships SET status='revoked',revoked_at=now() WHERE condominium_id=$1 AND user_id=$2",
        [tenant, user]
      );
      await recover(restored, "restore", "revoked");
      expect(
        (await restoredAdmin.query("SELECT enabled FROM app.operation_budget_policy")).rows.every(
          (r) => r.enabled === false
        )
      ).toBe(true);
    } finally {
      await restoredAdmin.end();
    }
    await writeFile(
      resolve(directory, "financial-report-proof.json"),
      JSON.stringify(
        {
          passed: true,
          runId,
          pages: 300,
          modelPhases: calls,
          providerCalls: 0,
          limitsActive: false,
          processRestart: true,
          restartedPid,
          restoredPid,
          restored: true,
          pdfHash,
          sourceHash,
          humanEditRecovered: true,
          changedPage300Blocked: true,
          revocationBlocked: true,
          activationAuthorized: false
        },
        null,
        2
      )
    );
  } finally {
    await api?.close();
    await Promise.all([runtime?.end(), worker?.end(), db?.end(), admin.end()]);
  }
}, 180000);
