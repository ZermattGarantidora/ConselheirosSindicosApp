import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, expect, it } from "vitest";
import {
  documentLifecycleFixture,
  lifecycleTenant as tenant,
  lifecycleForeign as foreign,
  lifecycleUser as user,
  lifecycleOtherUser as otherUser
} from "../fixtures/document-lifecycle-postgres.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAccessCodeService } from "../../apps/api/identity/access-code.js";
import { createPostgresAccessCodeStore } from "../../apps/api/identity/postgres-access-code-store.js";
import {
  resolveAuthorizedCondominiumContext,
  createUserId
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createPostgresPrivateDocumentStorage } from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import { createPostgresDocumentAnalysisReader } from "../../apps/api/analysis/document-analysis-reader.js";
import {
  createPostgresDocumentSourceReader,
  createDocumentSourceUrl
} from "../../apps/api/documents/document-source.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createPostgresScopedRetrievalIndex } from "../../apps/api/retrieval/postgres-scoped-retrieval.js";
import { openAiImageEmbeddingProfile } from "../../apps/api/retrieval/openai-image-embedding.js";
import {
  createPostgresDocumentExporter,
  createDocumentPurgeObserver,
  reapplyDocumentPurges
} from "../../apps/api/documents/postgres-document-lifecycle.js";
import { createPostgresDocumentRetentionRepository } from "../../apps/api/documents/postgres-document-retention-repository.js";
import { createPostgresCondominiumDirectory } from "../../apps/api/identity/postgres-condominium-directory.js";
import { createSyntheticDocumentDecisionApplier } from "../../apps/api/documents/synthetic-document-decisions.js";
import { syntheticPhotoTranscript } from "../fixtures/synthetic-document-photo.js";
import { conversationHash } from "../../apps/api/answers/conversation-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import { createDocumentLifecycleRestorer } from "../fixtures/document-lifecycle-restore.js";
import { localRecoveryConnection } from "../../scripts/pilot-recovery.js";
import { createPostgresHostedCallLedger } from "../../apps/api/documents/postgres-hosted-call-ledger.js";

let f = documentLifecycleFixture();
const directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY!;
afterAll(() => f.close());
const env: Record<string, string> = {};
for (const name of [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "PILOT_DOCUMENTS_SOURCE_DATABASE_URL",
  "PILOT_DOCUMENTS_RESTORE_DATABASE_URL",
  "PILOT_DOCUMENTS_RUN_ID",
  "PILOT_RECOVERY_CONFIRMATION",
  "PILOT_LOCAL_REPORT_DIRECTORY"
])
  if (process.env[name]) env[name] = process.env[name]!;
const databaseName = localRecoveryConnection(
  process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL,
  "source",
  process.env.PILOT_RECOVERY_CONFIRMATION
).pathname.slice(1);
const restorer = createDocumentLifecycleRestorer({
  sourceUrl: process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL!,
  restoreUrl: process.env.PILOT_DOCUMENTS_RESTORE_DATABASE_URL!,
  runId: process.env.PILOT_DOCUMENTS_RUN_ID!,
  directory,
  containerName: process.env.PILOT_RECOVERY_DOCKER_CONTAINER!,
  confirmation: "synthetic-local-only"
});
const restoredTargets: string[] = [];
async function dump(name: string) {
  await restorer.backup(name);
}
async function restore(name: string) {
  const target = await restorer.restore(name);
  const database = new URL(target).pathname.slice(1);
  expect(restoredTargets).not.toContain(database);
  restoredTargets.push(database);
  await f.close();
  f = documentLifecycleFixture("restore", target);
}
async function runWorker() {
  const result = await promisify(execFile)(
    process.execPath,
    ["scripts/run-tsx.mjs", "tests/fixtures/document-lifecycle-worker-process.ts"],
    { env, shell: false, windowsHide: true, timeout: 60000, maxBuffer: 2 * 1024 * 1024 }
  );
  return JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!);
}

it("AC-7120–7126: sessão/HTTP, fotos/OCR, worker separado, vetores/fontes, exclusão e restore guardados", async () => {
  const runId = process.env.PILOT_DOCUMENTS_RUN_ID;
  if (!runId || !/^[a-f0-9]{32}$/u.test(runId) || databaseName !== `alvitra_ops_source_${runId}`)
    throw new Error("Synthetic run mismatch");
  for (const [kind, role] of [
    ["api", "app_runtime"],
    ["worker", "app_worker"],
    ["ai", "app_ai_executor"]
  ]) {
    await f.admin.query(
      `CREATE ROLE "doc_${kind}_${runId}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
    );
    await f.admin.query(`GRANT ${role} TO "doc_${kind}_${runId}"`);
  }
  await f.journal.initialize();
  await f.admin.query(
    "INSERT INTO app.users(id,auth_subject,status) VALUES($1,'FICTICIO-USER','active'),($2,'FICTICIO-OTHER','active')",
    [user, otherUser]
  );
  await f.admin.query(
    "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTICIO-A','active'),($2,'FICTICIO-B','active')",
    [tenant, foreign]
  );
  for (const condominiumId of [tenant, foreign])
    for (const userId of [user, otherUser])
      await f.admin.query(
        "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','synthetic-membership')",
        [condominiumId, randomUUID(), userId]
      );
  await f.admin.query(
    "UPDATE app.operation_budget_policy SET enabled=true,revision=$1,currency='USD',scope_daily_cost=10000,global_daily_cost=10000,scope_daily_operations=1000,global_daily_operations=1000,scope_concurrent=1,global_concurrent=1",
    [budgetDigest("synthetic-lifecycle-v1")]
  );
  const operator = createAccessCodeService(createPostgresAccessCodeStore(f.admin), "d".repeat(64));
  const auth = createAccessCodeService(createPostgresAccessCodeStore(f.api), "d".repeat(64));
  const session = await auth.login(await operator.provision(user));
  if (!session) throw new Error("Synthetic session missing");
  const headers = { cookie: `alvitra_device=${session.token}` },
    chatId = randomUUID();
  const context = await resolveAuthorizedCondominiumContext(f.membership, {
    condominiumId: createCondominiumId(tenant),
    userId: createUserId(user),
    now: new Date()
  });
  const chats = createPostgresChatRepository(f.api),
    history = createPostgresConversationStore(f.api);
  await chats.create(context, { id: chatId, title: "FICTICIO-CHAT" });
  const createApp = () =>
    createApi({
      assertDocumentRecovery: () => f.guard(),
      accessCodeAuth: createAccessCodeService(createPostgresAccessCodeStore(f.api), "d".repeat(64)),
      membershipRepository: f.membership,
      documentCatalogRepository: createPostgresDocumentUploadRepository(f.api),
      documentUploadRepository: createPostgresDocumentUploadRepository(f.api),
      documentStorage: createPostgresPrivateDocumentStorage(f.api),
      imageUploadsEnabled: true,
      chatRepository: createPostgresChatRepository(f.api),
      conversationStore: createPostgresConversationStore(f.api),
      documentAnalysisReader: createPostgresDocumentAnalysisReader(f.api),
      documentSourceReader: createPostgresDocumentSourceReader(f.api)
    });
  let app = createApp();
  const uploaded: Array<{ documentId: string; documentVersionId: string; photo: Buffer }> = [];
  try {
    await dump("before-calls");
    for (const format of ["jpg", "png"]) {
      const photo = await readFile(`tests/fixtures/synthetic-document-page.${format}`);
      const response = await app.inject({
        method: "POST",
        url: `/v1/condominiums/${tenant}/documents`,
        headers: {
          ...headers,
          "content-type": format === "jpg" ? "image/jpeg" : "image/png",
          "x-document-title": `FICTICIO-${format}`,
          "x-document-type": "other",
          "x-document-validity-confirmed": "true",
          "x-chat-id": chatId,
          "x-conversation-request-id": `FICTICIO-${format}`
        },
        payload: photo
      });
      expect(response.statusCode, response.body).toBe(202);
      uploaded.push({ ...response.json(), photo });
      const worker = await runWorker();
      expect(worker.result).toBe("processed");
      expect(worker.simulatedTransports).toBeGreaterThan(1);
      expect(worker.realProviderCalls).toBe(0);
    }
    await app.close();
    app = createApp(); // Real DB stores and session survive a new API instance.
    for (const item of uploaded) {
      const original = await app.inject({
        method: "GET",
        url: `/v1/condominiums/${tenant}/documents/${item.documentVersionId}/file`,
        headers
      });
      expect(original.statusCode).toBe(200);
      expect(original.rawPayload).toEqual(item.photo);
      const source = await app.inject({
        method: "GET",
        url: createDocumentSourceUrl(context.condominiumId, { ...item, page: 1 }),
        headers
      });
      expect(source.statusCode).toBe(200);
      expect(source.json().content).toBe(syntheticPhotoTranscript);
      const denied = await app.inject({
        method: "GET",
        url: `/v1/condominiums/${foreign}/documents/${item.documentVersionId}/file`,
        headers
      });
      expect(denied.statusCode).toBe(404);
    }
    const index = createPostgresScopedRetrievalIndex(f.api, {
      profile: openAiImageEmbeddingProfile,
      embed: async (input) => ({
        ...openAiImageEmbeddingProfile,
        contentSha256: input.contentSha256,
        values: Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))
      })
    });
    const candidates = await index.findAuthorizedCandidates(context, {
      query: "utilização espaço comum registro administração",
      limit: 10,
      minimumQualityScore: 0.8,
      asOf: new Date()
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((row) => row.condominiumId === tenant)).toBe(true);
    const candidate = candidates[0]!;
    expect(
      Array.from(syntheticPhotoTranscript)
        .slice(candidate.startOffset, candidate.endOffset)
        .join("")
    ).toBe(candidate.content);
    const ownScope = {
      kind: "chat" as const,
      condominiumId: tenant,
      userId: context.userId,
      chatId
    };
    await history.append(ownScope, {
      id: randomUUID(),
      requestKey: "synthetic-history",
      inputHash: conversationHash("FICTICIO"),
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: randomUUID(),
          role: "user",
          kind: "question_answer",
          text: "FICTICIO-PERGUNTA-LITERAL"
        },
        {
          id: randomUUID(),
          role: "assistant",
          kind: "question_answer",
          text: "FICTICIO-RESPOSTA-LITERAL"
        }
      ],
      response: { private: "FICTICIO-NAO-EXPORTAR" },
      metadata: { private: "FICTICIO-SEGREDO-NAO-EXPORTAR" }
    });
    const exporter = createPostgresDocumentExporter({
      pool: f.api,
      authorize: async () => true,
      assertRecovered: f.guard
    });
    const exported = await exporter({ context, documentId: uploaded[0]!.documentId, chatId });
    expect(f.sha256(Buffer.from(exported.payload))).toBe(exported.sha256);
    const content = JSON.parse(exported.payload);
    expect(Buffer.from(content.versions[0].contentBase64, "base64")).toEqual(uploaded[0]!.photo);
    expect(content.pages[0].extracted_text).toBe(syntheticPhotoTranscript);
    expect(content.vectors.length).toBeGreaterThan(0);
    expect(exported.payload).toContain("FICTICIO-RESPOSTA-LITERAL");
    expect(exported.payload).not.toContain("FICTICIO-NAO-EXPORTAR");
    expect(exported.payload).not.toContain("FICTICIO-SEGREDO-NAO-EXPORTAR");
    await expect(
      exporter({
        context: { ...context, condominiumId: createCondominiumId(foreign) },
        documentId: uploaded[0]!.documentId,
        chatId
      })
    ).rejects.toThrow();
    await expect(
      exporter({
        context: { ...context, userId: createUserId(otherUser) },
        documentId: uploaded[0]!.documentId,
        chatId
      })
    ).rejects.toThrow();
    await expect(
      createPostgresDocumentExporter({ pool: f.api, assertRecovered: f.guard })({
        context,
        documentId: uploaded[0]!.documentId,
        chatId
      })
    ).rejects.toThrow();
    const callCount = (
      await f.admin.query("SELECT count(*)::int AS count FROM app.hosted_call_records")
    ).rows[0].count;
    const committed = (
      await f.admin.query("SELECT sum(committed)::int AS value FROM app.hosted_call_daily")
    ).rows[0].value;
    const receipts = (
      await f.admin.query("SELECT count(*)::int AS count FROM app.operation_budget_receipts")
    ).rows[0].count;
    expect(callCount).toBe(receipts);
    expect(committed).toBe(callCount * 10);
    const idle = await runWorker();
    expect(idle.result).toBe("idle");
    expect(idle.simulatedTransports).toBe(0);
    await dump("before-purge");
    const target = uploaded[0]!;
    const oldJob = (
      await f.admin.query(
        'SELECT id AS "jobId",attempt_count AS "attemptCount" FROM app.processing_jobs WHERE condominium_id=$1 AND document_version_id=$2',
        [tenant, target.documentVersionId]
      )
    ).rows[0];
    expect(oldJob).toBeDefined();
    for (const item of uploaded) {
      expect(
        (
          await app.inject({
            method: "DELETE",
            url: `/v1/condominiums/${tenant}/documents/${item.documentId}`,
            headers
          })
        ).statusCode
      ).toBe(204);
      await f.admin.query(
        "UPDATE app.documents SET archived_at=now()-interval '31 days' WHERE condominium_id=$1 AND id=$2",
        [tenant, item.documentId]
      );
    }
    expect(
      await createPostgresDocumentRetentionRepository(
        f.worker,
        createDocumentPurgeObserver(f.journal, f.ledger)
      ).purgeExpiredDocuments()
    ).toBe(2);
    expect(
      (await history.list(ownScope)).entries.some(
        (entry) => entry.requestKey === "synthetic-history"
      )
    ).toBe(true);
    await expect(exporter({ context, documentId: target.documentId, chatId })).rejects.toThrow();
    await app.close();
    await restore("before-purge"); // Separate database, quarantined until external decisions reapply.
    await expect(f.guard()).rejects.toThrow();
    app = createApp();
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/condominiums/${tenant}/documents/${target.documentVersionId}/file`,
          headers
        })
      ).statusCode
    ).toBe(503);
    await app.close();
    await expect(
      reapplyDocumentPurges({ pool: f.worker, journal: f.journal, ledger: f.ledger })
    ).rejects.toThrow();
    expect(
      await reapplyDocumentPurges({
        pool: f.worker,
        journal: f.journal,
        ledger: f.ledger,
        authorizeQuarantine: async () => true
      })
    ).toBe(2);
    expect(
      await reapplyDocumentPurges({
        pool: f.worker,
        journal: f.journal,
        ledger: f.ledger,
        authorizeQuarantine: async () => true
      })
    ).toBe(0);
    await f.guard();
    await expect(
      f.processor.process({
        jobId: oldJob.jobId,
        attemptCount: Number(oldJob.attemptCount),
        condominiumId: context.condominiumId,
        documentVersionId: target.documentVersionId,
        signal: new AbortController().signal
      })
    ).rejects.toThrow();
    expect(f.transports()).toBe(0);
    await expect(
      f.guard({ condominiumId: tenant, documentVersionIds: [target.documentVersionId] })
    ).rejects.toThrow();
    app = createApp();
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/condominiums/${tenant}/documents/${target.documentVersionId}/file`,
          headers
        })
      ).statusCode
    ).toBe(404);
    const callbackUpload = await app.inject({
      method: "POST",
      url: `/v1/condominiums/${tenant}/documents`,
      headers: {
        ...headers,
        "content-type": "image/png",
        "x-document-title": "FICTICIO-CALLBACK",
        "x-document-type": "other",
        "x-document-validity-confirmed": "true",
        "x-conversation-request-id": "FICTICIO-CALLBACK"
      },
      payload: uploaded[1]!.photo
    });
    expect(callbackUpload.statusCode).toBe(202);
    const callbackVersion = callbackUpload.json().documentVersionId as string;
    const orphan = async (condominiumId: string, registerObject: boolean) => {
      const objectId = randomUUID(),
        photo = uploaded[1]!.photo;
      const stored = await createPostgresPrivateDocumentStorage(f.api).storeOriginal({
        condominiumId: createCondominiumId(condominiumId),
        objectId,
        content: photo,
        uploadedByUserId: context.userId
      });
      if (registerObject)
        await f.admin.query(
          "INSERT INTO app.storage_objects(condominium_id,id,object_kind,storage_key,content_sha256,size_bytes,media_type,created_by_user_id) VALUES($1,$2,'document_original',$3,$4,$5,'image/png',$6)",
          [condominiumId, objectId, stored.storageKey, f.sha256(photo), photo.length, user]
        );
      return objectId;
    };
    const orphanIds = [await orphan(tenant, false), await orphan(tenant, true)];
    const foreignOrphan = await orphan(foreign, true);
    const foreignBytesBefore = conversationHash(
      (
        await f.admin.query(
          "SELECT content FROM app.document_original_contents WHERE condominium_id=$1 AND storage_object_id=$2",
          [foreign, foreignOrphan]
        )
      ).rows
    );
    // Transactional callback rolls back ALL effects, then reapplies exactly one version.
    const apply = createSyntheticDocumentDecisionApplier({
      confirmation: "synthetic-local-only",
      condominiumIds: [tenant],
      documentVersionIds: [...uploaded.map((row) => row.documentVersionId), callbackVersion],
      history: "preserve-as-historical"
    });
    const client = await f.admin.connect();
    try {
      await client.query("BEGIN");
      await apply(client, {
        id: randomUUID(),
        action: "purge_document_version",
        condominiumId: tenant,
        documentVersionId: callbackVersion
      });
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM app.document_original_contents WHERE condominium_id=$1 AND storage_object_id=ANY($2::uuid[])",
            [tenant, orphanIds]
          )
        ).rows[0].count
      ).toBe(2);
      await client.query("ROLLBACK");
      expect(
        (await f.admin.query("SELECT id FROM app.document_versions WHERE id=$1", [callbackVersion]))
          .rowCount
      ).toBe(1);
      await client.query("BEGIN");
      await apply(client, {
        id: randomUUID(),
        action: "purge_condominium_content",
        condominiumId: tenant
      });
      await client.query("COMMIT");
      // Reintroduce an orphan-only state as a synthetic older snapshot, without reopening API/worker.
      await orphan(tenant, true);
      await client.query("BEGIN");
      await apply(client, {
        id: randomUUID(),
        action: "purge_condominium_content",
        condominiumId: tenant
      });
      await client.query("COMMIT");
      await client.query("BEGIN");
      await apply(client, {
        id: randomUUID(),
        action: "purge_condominium_content",
        condominiumId: tenant
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    expect(
      (
        await f.admin.query("SELECT id FROM app.document_versions WHERE condominium_id=$1", [
          tenant
        ])
      ).rowCount
    ).toBe(0);
    expect(
      (
        await f.admin.query(
          "SELECT count(*)::int AS count FROM app.document_original_contents WHERE condominium_id=$1",
          [tenant]
        )
      ).rows[0].count
    ).toBe(0);
    expect(
      (
        await f.admin.query(
          "SELECT count(*)::int AS count FROM app.storage_objects WHERE condominium_id=$1",
          [tenant]
        )
      ).rows[0].count
    ).toBe(0);
    expect(
      conversationHash(
        (
          await f.admin.query(
            "SELECT content FROM app.document_original_contents WHERE condominium_id=$1 AND storage_object_id=$2",
            [foreign, foreignOrphan]
          )
        ).rows
      )
    ).toBe(foreignBytesBefore);
    expect(
      (await f.admin.query("SELECT count(*)::int AS count FROM app.operation_budget_receipts"))
        .rows[0].count
    ).toBe(receipts);
    const foreignBefore = conversationHash(
      (await f.admin.query("SELECT * FROM app.condominiums WHERE id=$1", [foreign])).rows
    );
    await createPostgresCondominiumDirectory(f.api).deleteForUser(
      createUserId(user),
      createCondominiumId(tenant)
    );
    const callsAfter = (
      await f.admin.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [
        tenant
      ])
    ).rows;
    expect(callsAfter).toHaveLength(callCount);
    expect(
      callsAfter.every(
        (row) =>
          row.record.status === "invalidated" &&
          row.record.resultJson === undefined &&
          row.record.resultSha256 === undefined
      )
    ).toBe(true);
    expect(
      (await f.admin.query("SELECT sum(committed)::int AS value FROM app.hosted_call_daily"))
        .rows[0].value
    ).toBe(committed);
    expect(
      conversationHash(
        (await f.admin.query("SELECT * FROM app.condominiums WHERE id=$1", [foreign])).rows
      )
    ).toBe(foreignBefore);
    await expect(
      f.ledger.reserve(
        {
          condominiumId: tenant,
          requestHash: "f".repeat(64),
          policyRevision: "synthetic-lifecycle-v1"
        },
        {
          currency: "USD",
          tariffVersion: "synthetic",
          maximumCostMicrounits: 10,
          tenantDailyLimitMicrounits: 10000,
          globalDailyLimitMicrounits: 10000
        }
      )
    ).rejects.toThrow();
    await app.close();
    await restore("before-calls");
    await expect(f.guard()).rejects.toThrow();
    app = createApp();
    expect(
      (await app.inject({ method: "GET", url: `/v1/condominiums/${foreign}/documents`, headers }))
        .statusCode
    ).toBe(503);
    expect(new Set(restoredTargets).size).toBe(2);
    const probe = await f.controls.authorize({
      purpose: "photo_ocr",
      destination: "https://api.openai.com/v1/responses",
      model: "synthetic",
      condominiumId: foreign,
      documentVersions: [],
      payloadSha256: "a".repeat(64),
      inputBytes: 1,
      pageCount: 1,
      maximumOutputTokens: 1
    });
    expect(probe.allowed).toBe(false);
    await writeFile(
      resolve(directory, "document-lifecycle-proof.json"),
      JSON.stringify(
        {
          passed: true,
          runId,
          providerCalls: 0,
          multiplePurgesVerified: 2,
          boundedSeparateLedgerLocks: true,
          orphanOnlyAndMixedPurgesVerified: true,
          foreignOrphanIntact: true,
          restoredTargets,
          freshTargetsOnly: true,
          quarantinedHttpDenied: true,
          oldJobDenied: true,
          sessionPostgres: true,
          formats: ["JPEG", "PNG"],
          workerSeparateProcesses: 3,
          originalAndFullPageVerified: true,
          matchingSyntheticQueryProfile: true,
          exportChecksumVerified: true,
          historyPreservedByDocumentPurge: true,
          transactionalCallbackRollback: true,
          domainDeletionPreservesConsumption: true,
          oldSnapshotQuarantinedAndPurgesReapplied: true,
          missingReceiptsDenyGlobally: true,
          simulatedTransports: callCount,
          realProviderCalls: 0,
          activationAuthorized: false
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
});

it("AC-7126: exclusão real invalida conteúdo completed/unknown/cancelled e conserva compromisso de A/B", async () => {
  const a = randomUUID(),
    b = randomUUID(),
    owner = randomUUID();
  await f.admin.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
    owner,
    `FICTICIO-DELETE-${owner}`
  ]);
  for (const id of [a, b]) {
    await f.admin.query(
      "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTICIO-DELETE','active')",
      [id]
    );
    await f.admin.query(
      "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','synthetic-delete')",
      [id, randomUUID(), owner]
    );
  }
  const ledger = createPostgresHostedCallLedger(f.admin);
  const budget = {
    currency: "USD" as const,
    tariffVersion: "synthetic-delete",
    maximumCostMicrounits: 10,
    tenantDailyLimitMicrounits: 100000,
    globalDailyLimitMicrounits: 100000
  };
  for (const [id, hash, state] of [
    [a, "1", "completed"],
    [a, "2", "uncertain"],
    [a, "3", "cancelled"],
    [b, "4", "completed"]
  ]) {
    const key = {
      condominiumId: id!,
      requestHash: hash!.repeat(64),
      policyRevision: "synthetic-delete"
    };
    const reservation = await ledger.reserve(key, budget);
    if (reservation.status !== "reserved") throw new Error();
    if (state === "cancelled") await ledger.cancel(key, reservation.owner);
    else {
      await ledger.dispatch(key, reservation.owner);
      if (state === "completed")
        await ledger.complete(key, reservation.owner, { text: "FICTICIO-PRIVATE-DELETE" });
      else await ledger.uncertain(key, reservation.owner);
    }
  }
  const dailyBefore = (await f.admin.query("SELECT * FROM app.hosted_call_daily ORDER BY period"))
    .rows;
  const bBefore = (
    await f.admin.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [b])
  ).rows;
  await createPostgresCondominiumDirectory(f.admin).deleteForUser(
    createUserId(owner),
    createCondominiumId(a)
  );
  const records = (
    await f.admin.query(
      "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 ORDER BY request_hash",
      [a]
    )
  ).rows.map((row) => row.record);
  expect(records).toHaveLength(3);
  expect(records.map((row) => row.commitment)).toEqual([10, 10, 0]);
  expect(
    records.every(
      (row) =>
        row.status === "invalidated" &&
        row.resultJson === undefined &&
        row.resultSha256 === undefined
    )
  ).toBe(true);
  expect(records[1].invalidatedFrom).toBe("uncertain");
  expect((await f.admin.query("SELECT * FROM app.hosted_call_daily ORDER BY period")).rows).toEqual(
    dailyBefore
  );
  expect(
    (await f.admin.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [b]))
      .rows
  ).toEqual(bBefore);
  expect((await f.admin.query("SELECT id FROM app.condominiums WHERE id=$1", [a])).rowCount).toBe(
    0
  );
  await expect(
    ledger.reserve(
      { condominiumId: a, requestHash: "f".repeat(64), policyRevision: "synthetic-delete" },
      budget
    )
  ).rejects.toThrow();
});
