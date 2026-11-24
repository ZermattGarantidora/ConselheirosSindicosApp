import { randomUUID } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { documentLifecycleFixture } from "../fixtures/document-lifecycle-postgres.js";
import { createDocumentLifecycleRestorer } from "../fixtures/document-lifecycle-restore.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import { createPostgresPrivateDocumentStorage } from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresDocumentSourceReader } from "../../apps/api/documents/document-source.js";
import { createScopedPostgresDocumentProcessor } from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";
import { syntheticDocx, syntheticWav } from "../fixtures/synthetic-authoring.js";
import { createSyntheticPostgresAudioStorage } from "../../apps/api/authoring/postgres-audio-storage.js";
import { createSyntheticAudioRecoveryJournal } from "../../apps/api/authoring/audio-recovery-journal.js";
import {
  simpleMinutesSegments,
  simpleMinutesPlan,
  syntheticMinutesModel
} from "../fixtures/semantic-minutes.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { docxMediaType } from "../../apps/api/documents/extract-docx-text.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import { syntheticDocumentAuthoringModel } from "../fixtures/document-authoring.js";
import {
  createSyntheticAuthoringOperations,
  createSyntheticAuthoringLifecycleJournal,
  authoringOperationKinds
} from "../../apps/api/authoring/authoring-operations.js";
import { createSyntheticAuthoringBudget } from "../../apps/api/authoring/authoring-budget.js";
import { createSyntheticPostgresAuthoringArtifacts } from "../../apps/api/authoring/authoring-artifacts.js";
import { syntheticAuthoringPolicies } from "../fixtures/authoring-operations.js";
import { createPostgresOperationBudgetStore } from "../../apps/api/security/postgres-operation-budget-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import { resolveAuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
let authoringRestorer: ReturnType<typeof createDocumentLifecycleRestorer> | undefined;

it("AC-7324: Word e rascunho confirmado sobrevivem a nova API e restore com RLS e fonte atual", async () => {
  const f = documentLifecycleFixture(),
    directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY!;
  const tenant = randomUUID(),
    foreign = randomUUID(),
    user = randomUUID(),
    other = randomUUID(),
    chat = randomUUID(),
    otherChat = randomUUID(),
    draftId = randomUUID();
  const runId = process.env.PILOT_DOCUMENTS_RUN_ID!;
  const source = process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL!;
  const workerUrl = new URL(source);
  const runtimeRole = `author_runtime_${runId}`,
    workerRole = `author_worker_${runId}`;
  let apiPool: Pool | undefined, workerPool: Pool | undefined;
  let app: ReturnType<typeof createApi> | undefined;
  const restorer = (authoringRestorer ??= createDocumentLifecycleRestorer({
    sourceUrl: source,
    restoreUrl: process.env.PILOT_DOCUMENTS_RESTORE_DATABASE_URL!,
    runId,
    directory,
    containerName: process.env.PILOT_RECOVERY_DOCKER_CONTAINER!,
    confirmation: "synthetic-local-only"
  }));
  const headers = { "x-development-user-id": user };
  const proposalId = randomUUID();
  const proposalBase = `/v1/condominiums/${tenant}/chats/${chat}/document-proposals/${proposalId}`;
  let simulatedAuthoringCalls = 0;
  let clock = new Date();
  const policies = syntheticAuthoringPolicies();
  const lifecycle = createSyntheticAuthoringLifecycleJournal({
    directory: resolve(directory, "authoring-decisions-outside-dump"),
    journalId: randomUUID(),
    confirmation: "synthetic-local-only"
  });
  await lifecycle.initialize();
  const budget = createSyntheticAuthoringBudget({
    directory: resolve(directory, "authoring-budget-outside-dump"),
    confirmation: "synthetic-local-only",
    policy: policies.budget,
    now: () => clock
  });
  await budget.initialize();
  const artifactPools: ReturnType<typeof createSyntheticPostgresAuthoringArtifacts>[] = [];
  let operations: ReturnType<typeof createSyntheticAuthoringOperations>;
  const operationalScope = {
    kind: "chat" as const,
    userId: createUserId(user),
    condominiumId: tenant,
    chatId: chat
  };
  const context = () =>
    resolveAuthorizedCondominiumContext(createPostgresMembershipRepository(apiPool!), {
      userId: createUserId(user),
      condominiumId: createCondominiumId(tenant),
      now: clock
    });
  const base = `/v1/condominiums/${tenant}/chats/${chat}/document-drafts/${draftId}`;
  const open = (url: string) => {
    const runtime = new URL(url);
    runtime.username = runtimeRole;
    runtime.password = "synthetic-only";
    apiPool = new Pool({ connectionString: runtime.toString() });
    const artifacts = createSyntheticPostgresAuthoringArtifacts({
      databaseUrl: runtime.toString(),
      confirmation: "synthetic-local-only"
    });
    artifactPools.push(artifacts);
    operations = createSyntheticAuthoringOperations({
      confirmation: "synthetic-local-only",
      journal: lifecycle,
      artifacts,
      budget: budget.store,
      policy: policies.authoring,
      now: () => clock,
      authorize: (ctx, scope) =>
        resolveAuthorizedCondominiumContext(createPostgresMembershipRepository(apiPool!), {
          userId: ctx.userId,
          condominiumId: createCondominiumId(scope.condominiumId),
          now: clock
        })
    });
    app = createApi({
      syntheticAuthoringOperations: operations,
      membershipRepository: createPostgresMembershipRepository(apiPool),
      chatRepository: createPostgresChatRepository(apiPool),
      conversationStore: createPostgresConversationStore(apiPool),
      documentUploadRepository: createPostgresDocumentUploadRepository(apiPool),
      documentCatalogRepository: createPostgresDocumentUploadRepository(apiPool),
      documentStorage: createPostgresPrivateDocumentStorage(apiPool),
      documentSourceReader: createPostgresDocumentSourceReader(apiPool),
      documentAuthoringModel: syntheticDocumentAuthoringModel(() => {
        simulatedAuthoringCalls++;
      })
    });
  };
  try {
    for (const [login, role] of [
      [runtimeRole, "app_runtime"],
      [workerRole, "app_worker"]
    ]) {
      await f.admin.query(
        `CREATE ROLE "${login}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
      );
      await f.admin.query(`GRANT ${role} TO "${login}"`);
    }
    await f.admin.query(
      "INSERT INTO app.users(id,auth_subject,status) VALUES($1,$3,'active'),($2,$4,'active')",
      [user, other, `FICTICIO-${user}`, `FICTICIO-${other}`]
    );
    await f.admin.query(
      "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTÍCIO-A','active'),($2,'FICTÍCIO-B','active')",
      [tenant, foreign]
    );
    for (const t of [tenant, foreign])
      for (const u of [user, other])
        await f.admin.query(
          "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','synthetic-authoring')",
          [t, randomUUID(), u]
        );
    open(source);
    await f.admin.query(
      "UPDATE app.operation_budget_policy SET enabled=true,revision=$1,currency='BRL',scope_daily_cost=10000,global_daily_cost=20000,scope_daily_operations=100,global_daily_operations=200,scope_concurrent=5,global_concurrent=10",
      [policies.budget.revision]
    );
    const sqlBudget = createPostgresOperationBudgetStore(apiPool!);
    for (const kind of authoringOperationKinds) {
      const request = {
        scope: {
          kind: "tenant" as const,
          userId: user,
          condominiumId: tenant,
          membershipRevision: "synthetic-authoring"
        },
        operationId: randomUUID(),
        kind,
        payloadHash: budgetDigest(kind),
        policyRevision: policies.budget.revision,
        maximumCostMicrounits: 10
      };
      await sqlBudget.mutate("reserve", request);
      expect((await sqlBudget.mutate("start", request, { token: "s".repeat(43) })).claimed).toBe(
        true
      );
      expect(
        (
          await sqlBudget.mutate("complete", request, {
            token: "s".repeat(43),
            outputHash: budgetDigest(kind),
            actualCostMicrounits: 10
          })
        ).receipt.state
      ).toBe("completed");
    }
    await f.admin.query(
      "UPDATE app.memberships SET role_key='advisor' WHERE condominium_id=$1 AND user_id=$2",
      [tenant, other]
    );
    await expect(
      sqlBudget.mutate("reserve", {
        scope: {
          kind: "tenant",
          userId: other,
          condominiumId: tenant,
          membershipRevision: "synthetic-authoring"
        },
        operationId: randomUUID(),
        kind: "document_write",
        payloadHash: budgetDigest("advisor"),
        policyRevision: policies.budget.revision,
        maximumCostMicrounits: 10
      })
    ).rejects.toHaveProperty("code", "denied");
    await f.admin.query(
      "UPDATE app.memberships SET role_key='manager' WHERE condominium_id=$1 AND user_id=$2",
      [tenant, other]
    );
    await f.admin.query("UPDATE app.operation_budget_policy SET enabled=false");
    for (const id of [chat, otherChat])
      expect(
        (
          await app!.inject({
            method: "POST",
            url: `/v1/condominiums/${tenant}/chats`,
            headers,
            payload: { id, title: "FICTÍCIO" }
          })
        ).statusCode
      ).toBe(201);
    const bytes = syntheticDocx(
      "<w:p><w:r><w:t>FICTÍCIO. Comunicado de manutenção. Conferir a data antes de usar.</w:t></w:r></w:p>"
    );
    const upload = await app!.inject({
      method: "POST",
      url: `/v1/condominiums/${tenant}/documents`,
      headers: {
        ...headers,
        "content-type": docxMediaType,
        "x-document-title": "FICTICIO.docx",
        "x-document-type": "other",
        "x-document-validity-confirmed": "true",
        "x-chat-id": chat
      },
      payload: bytes
    });
    expect(upload.statusCode, upload.body).toBe(202);
    const item = upload.json();
    workerUrl.username = workerRole;
    workerUrl.password = "synthetic-only";
    workerPool = new Pool({ connectionString: workerUrl.toString() });
    const queue = createPostgresProcessingJobQueue(workerPool);
    const job = await queue.claimNext();
    expect(job).toBeDefined();
    await createScopedPostgresDocumentProcessor(
      workerPool,
      createPostgresPrivateDocumentStorage(workerPool)
    ).process(job!);
    const contextSource = await app!.inject({
      method: "GET",
      url: `/v1/condominiums/${tenant}/documents/${item.documentId}/versions/${item.documentVersionId}/pages/1`,
      headers
    });
    expect(contextSource.statusCode, contextSource.body).toBe(200);
    const text = contextSource.json().content as string;
    expect(text).toContain("Comunicado de manutenção");
    const content = {
      title: "Comunicado sintético",
      documentKind: "Comunicado",
      operation: "revise",
      text,
      sources: [
        {
          documentId: item.documentId,
          documentVersionId: item.documentVersionId,
          page: 1,
          excerpt: text
        }
      ],
      changes: "Conferência local.",
      pending: "Conferir data antes de usar."
    };
    const proposed = await app!.inject({
      method: "POST",
      url: base,
      headers,
      payload: { expectedEvent: 0, content }
    });
    expect(proposed.statusCode, proposed.body).toBe(200);
    const draft = proposed.json().draft;
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${base}/decide`,
          headers,
          payload: { expectedEvent: 1, hash: draft.hash, confirm: true, reviewed: true }
        })
      ).statusCode
    ).toBe(200);
    await restorer.backup("before-authoring-operations");
    const general = await app!.inject({
      method: "POST",
      url: proposalBase,
      headers,
      payload: {
        title: "FICTÍCIO. Proposta geral",
        documentKind: "Comunicado",
        operation: "revise",
        request: "Reorganize o comunicado com fundamento no original.",
        report: "",
        documentVersionIds: [item.documentVersionId]
      }
    });
    expect(general.statusCode, general.body).toBe(200);
    const proposal = general.json().proposal;
    const accepted = await app!.inject({
      method: "POST",
      url: `${proposalBase}/decide`,
      headers,
      payload: { hash: proposal.hash, accept: true }
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    const generalDraft = accepted.json().draft;
    expect(generalDraft.status).toBe("awaiting_confirmation");
    const generalBase = base.replace(draftId, proposalId);
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${generalBase}/decide`,
          headers,
          payload: { expectedEvent: 1, hash: generalDraft.hash, confirm: true, reviewed: true }
        })
      ).statusCode
    ).toBe(200);
    await restorer.backup("before-calls");
    await app!.close();
    await apiPool!.end();
    open(source);
    async function verify() {
      const recoveredProposal = await app!.inject({ method: "GET", url: proposalBase, headers });
      expect(recoveredProposal.statusCode, recoveredProposal.body).toBe(200);
      expect(recoveredProposal.json()).toMatchObject({
        durable: true,
        proposal: { hash: proposal.hash, status: "accepted" }
      });
      const replay = await app!.inject({
        method: "POST",
        url: `${proposalBase}/decide`,
        headers,
        payload: { hash: proposal.hash, accept: true }
      });
      expect(replay.statusCode, replay.body).toBe(200);
      expect(replay.json().draft).toMatchObject({ status: "confirmed", hash: generalDraft.hash });
      expect(simulatedAuthoringCalls).toBe(2);
      const proposedPdf = await app!.inject({
        method: "GET",
        url: `${generalBase}/pdf?hash=${generalDraft.hash}`,
        headers
      });
      expect(proposedPdf.statusCode, proposedPdf.body).toBe(200);
      expect(
        (await extractPdfTextByPage(proposedPdf.rawPayload)).map((p) => p.extractedText).join(" ")
      ).toContain("Origem: proposta documental");
      for (const [url, h] of [
        [proposalBase.replace(chat, otherChat), headers],
        [proposalBase, { "x-development-user-id": other }],
        [proposalBase.replace(tenant, foreign), headers]
      ] as const)
        expect((await app!.inject({ method: "GET", url, headers: h })).statusCode).not.toBe(200);
      const read = await app!.inject({ method: "GET", url: base, headers });
      expect(read.statusCode, read.body).toBe(200);
      expect(read.json()).toMatchObject({
        durable: true,
        draft: { status: "confirmed", hash: draft.hash }
      });
      const original = await app!.inject({
        method: "GET",
        url: `/v1/condominiums/${tenant}/documents/${item.documentVersionId}/file`,
        headers
      });
      expect(original.statusCode).toBe(200);
      expect(original.rawPayload).toEqual(bytes);
      const pdf = await app!.inject({
        method: "GET",
        url: `${base}/pdf?hash=${draft.hash}`,
        headers
      });
      expect(pdf.statusCode, pdf.body).toBe(200);
      expect(
        (await extractPdfTextByPage(pdf.rawPayload)).map((p) => p.extractedText).join(" ")
      ).toContain("Comunicado de manutenção");
      expect(
        (await extractPdfTextByPage(pdf.rawPayload)).map((p) => p.extractedText).join(" ")
      ).toContain("Word usa blocos de leitura");
      for (const [url, h] of [
        [base.replace(chat, otherChat), headers],
        [base, { "x-development-user-id": other }],
        [base.replace(tenant, foreign), headers]
      ] as const)
        expect((await app!.inject({ method: "GET", url, headers: h })).statusCode).not.toBe(200);
    }
    await verify();
    const early = await restorer.restore("before-authoring-operations");
    await app!.close();
    await apiPool!.end();
    open(early);
    const replayEarly = await app!.inject({
      method: "POST",
      url: proposalBase,
      headers,
      payload: {
        title: "FICTÍCIO. Proposta geral",
        documentKind: "Comunicado",
        operation: "revise",
        request: "Reorganize o comunicado com fundamento no original.",
        report: "",
        documentVersionIds: [item.documentVersionId]
      }
    });
    expect(replayEarly.statusCode, replayEarly.body).toBe(503);
    expect(simulatedAuthoringCalls).toBe(2);
    expect(
      (await app!.inject({ method: "GET", url: `${base}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(200);
    const restored = await restorer.restore("before-calls");
    await app!.close();
    await apiPool!.end();
    open(restored);
    await verify();
    const restoredAdmin = new Pool({ connectionString: restored });
    try {
      await restoredAdmin.query(
        "UPDATE app.documents SET status='archived',archived_at=now() WHERE condominium_id=$1 AND id=$2",
        [tenant, item.documentId]
      );
      expect(
        (await app!.inject({ method: "GET", url: `${base}/pdf?hash=${draft.hash}`, headers }))
          .statusCode
      ).toBe(409);
      expect((await app!.inject({ method: "GET", url: proposalBase, headers })).statusCode).toBe(
        404
      );
      expect(
        (
          await app!.inject({
            method: "GET",
            url: `${generalBase}/pdf?hash=${generalDraft.hash}`,
            headers
          })
        ).statusCode
      ).not.toBe(200);
    } finally {
      await restoredAdmin.end();
    }
    const completedAgain = await restorer.restore("before-calls");
    await app!.close();
    await apiPool!.end();
    open(completedAgain);
    const exported = await app!.inject({ method: "GET", url: `${proposalBase}/export`, headers });
    expect(exported.statusCode, exported.body).toBe(200);
    expect(
      exported.json().entries.some((e: { response: { draft?: unknown } }) => e.response.draft)
    ).toBe(true);
    const historyStore = createPostgresConversationStore(apiPool!);
    const beforePurge = await historyStore.list(operationalScope, 100);
    const publicMessages = beforePurge.entries
      .filter((e) => e.metadata.internalAuthoring !== true)
      .map(({ id, sequence, createdAt, messages }) => ({ id, sequence, createdAt, messages }));
    const internalId = randomUUID();
    await historyStore.append(operationalScope, {
      id: internalId,
      createdAt: clock.toISOString(),
      requestKey: `synthetic-internal-purge:${internalId}`,
      inputHash: budgetDigest(internalId),
      messages: [
        {
          id: randomUUID(),
          role: "user",
          kind: "question_answer",
          text: "FICTÍCIO. TEXTO INTERNO PRIVADO PARA EXPURGO."
        }
      ],
      response: { text: "FICTÍCIO. PAYLOAD DERIVADO PARA EXPURGO." },
      metadata: { documentAuthoringId: proposalId, internalAuthoring: true }
    });
    expect((await app!.inject({ method: "DELETE", url: proposalBase, headers })).statusCode).toBe(
      200
    );
    const afterPurge = await historyStore.list(operationalScope, 100);
    expect(
      afterPurge.entries
        .filter((e) => e.id !== internalId && e.metadata.internalAuthoring !== true)
        .map(({ id, sequence, createdAt, messages }) => ({ id, sequence, createdAt, messages }))
    ).toEqual(publicMessages);
    const internalAfterPurge = afterPurge.entries.find((e) => e.id === internalId)!;
    expect(internalAfterPurge.metadata.internalAuthoring).toBe(true);
    expect(JSON.stringify(internalAfterPurge)).not.toContain("PARA EXPURGO");
    const publicPageAfterPurge = await app!.inject({
      method: "GET",
      url: `/v1/condominiums/${tenant}/chats/${chat}/messages?limit=100`,
      headers
    });
    expect(publicPageAfterPurge.statusCode).toBe(200);
    expect(
      publicPageAfterPurge.json().entries.find((e: { id: string }) => e.id === internalId).messages
    ).toEqual([]);
    expect((await app!.inject({ method: "GET", url: proposalBase, headers })).statusCode).toBe(404);
    const purgedSnapshot = await restorer.restore("before-calls");
    await app!.close();
    await apiPool!.end();
    open(purgedSnapshot);
    expect((await app!.inject({ method: "GET", url: base, headers })).statusCode).toBe(503);
    await operations!.maintain(await context(), operationalScope);
    expect((await app!.inject({ method: "GET", url: proposalBase, headers })).statusCode).toBe(404);
    expect(
      (await app!.inject({ method: "GET", url: `${base}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(200);
    const persistedLedger = JSON.parse(
      await readFile(
        resolve(directory, "authoring-budget-outside-dump", "operation-budgets.json"),
        "utf8"
      )
    );
    expect(persistedLedger.receipts).toHaveLength(2);
    expect(persistedLedger.receipts.every((r: { state: string }) => r.state === "completed")).toBe(
      true
    );
    clock = new Date(clock.getTime() + 3600000);
    expect((await app!.inject({ method: "GET", url: base, headers })).statusCode).toBe(404);
    await operations!.maintain(await context(), operationalScope);
    const scrubbed = await createPostgresConversationStore(apiPool!).list(operationalScope, 50);
    expect(
      scrubbed.entries
        .filter(
          (e) => e.metadata.documentDraftId === draftId || e.metadata.documentDraftId === proposalId
        )
        .every((e) => e.response.status === "purged")
    ).toBe(true);
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `/v1/condominiums/${tenant}/documents/${item.documentVersionId}/file`,
          headers
        })
      ).rawPayload
    ).toEqual(bytes);
    await writeFile(
      resolve(directory, "authoring-proof.json"),
      JSON.stringify({
        passed: true,
        runId,
        providerCalls: 0,
        activationAuthorized: false,
        wordRestore: true,
        generalAuthoringRestore: true,
        preDispatchRestoreFence: true,
        operationalPurgeRestore: true,
        permanentHistoryAfterPurge: true,
        retentionExpire: true,
        kindSqlParity: true,
        simulatedAuthoringCalls
      })
    );
  } finally {
    await app?.close();
    await apiPool?.end();
    await workerPool?.end();
    await Promise.all(artifactPools.map((p) => p.close()));
    await f.close();
  }
});

it("AC-7325/7326: áudio durável, consumo único, exportação, expiração, purga e decisões após restore", async () => {
  const f = documentLifecycleFixture(),
    directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY!,
    runId = process.env.PILOT_DOCUMENTS_RUN_ID!;
  const source = process.env.PILOT_DOCUMENTS_SOURCE_DATABASE_URL!;
  const tenant = randomUUID(),
    foreign = randomUUID(),
    user = randomUUID(),
    other = randomUUID(),
    chat = randomUUID(),
    otherChat = randomUUID();
  const inputId = randomUUID(),
    draftId = randomUUID(),
    foreignInput = randomUUID();
  const login = `audio_runtime_${runId}`;
  const headers = { "x-development-user-id": user };
  const scope = {
    kind: "chat" as const,
    condominiumId: tenant,
    userId: createUserId(user),
    chatId: chat
  };
  const foreignScope = { ...scope, condominiumId: foreign, chatId: otherChat };
  const journal = createSyntheticAudioRecoveryJournal({
    directory: resolve(directory, "audio-decisions-outside-dump"),
    journalId: randomUUID(),
    confirmation: "synthetic-local-only"
  });
  await journal.initialize();
  let clock = new Date(),
    transcriptions = 0,
    modelCalls = 0;
  const audioPolicies = syntheticAuthoringPolicies();
  const audioLifecycle = createSyntheticAuthoringLifecycleJournal({
    directory: resolve(directory, "audio-authoring-lifecycle"),
    journalId: randomUUID(),
    confirmation: "synthetic-local-only"
  });
  await audioLifecycle.initialize();
  const audioBudget = createSyntheticAuthoringBudget({
    directory: resolve(directory, "audio-authoring-budget"),
    confirmation: "synthetic-local-only",
    policy: audioPolicies.budget,
    now: () => clock
  });
  await audioBudget.initialize();
  let audioArtifacts: ReturnType<typeof createSyntheticPostgresAuthoringArtifacts> | undefined;
  let pool: Pool | undefined,
    storage: ReturnType<typeof createSyntheticPostgresAudioStorage> | undefined,
    app: ReturnType<typeof createApi> | undefined;
  const open = (database: string) => {
    const url = new URL(database);
    url.username = login;
    url.password = "synthetic-only";
    pool = new Pool({ connectionString: url.toString() });
    audioArtifacts = createSyntheticPostgresAuthoringArtifacts({
      databaseUrl: url.toString(),
      confirmation: "synthetic-local-only"
    });
    const audioOperations = createSyntheticAuthoringOperations({
      confirmation: "synthetic-local-only",
      journal: audioLifecycle,
      artifacts: audioArtifacts,
      budget: audioBudget.store,
      policy: audioPolicies.authoring,
      now: () => clock,
      authorize: (ctx, requested) =>
        resolveAuthorizedCondominiumContext(createPostgresMembershipRepository(pool!), {
          userId: ctx.userId,
          condominiumId: createCondominiumId(requested.condominiumId),
          now: clock
        })
    });
    storage = createSyntheticPostgresAudioStorage({
      databaseUrl: url.toString(),
      confirmation: "synthetic-local-only",
      journal,
      retentionSeconds: 3600,
      maximumDailyInputs: 10,
      maximumConcurrent: 2,
      now: () => clock
    });
    app = createApi({
      membershipRepository: createPostgresMembershipRepository(pool),
      chatRepository: createPostgresChatRepository(pool),
      conversationStore: createPostgresConversationStore(pool),
      documentCatalogRepository: { listAuthorized: async () => [] },
      syntheticDurableAudio: storage,
      syntheticAuthoringOperations: audioOperations,
      documentImprovementAgent: {
        async suggest(draft) {
          return {
            message:
              "Posso separar a apresentação dos assuntos desta ata. Quer conferir a sugestão editorial sintética?",
            text: draft.text.replace("2. Assuntos", "2.  Assuntos"),
            changes: "Ajuste de espaçamento do título, preservando o texto."
          };
        }
      },
      now: () => clock,
      audioTranscriber: {
        async transcribe(input) {
          expect(input.content).toEqual(syntheticWav(2));
          transcriptions++;
          if (input.chatId === otherChat && input.mode === "dictation")
            throw new Error("FICTÍCIO: transporte incerto");
          return { processedDurationSeconds: 2, truncated: false, segments: simpleMinutesSegments };
        }
      },
      audioMinutesModel: syntheticMinutesModel({
        plan: () => simpleMinutesPlan(),
        onCall: () => {
          modelCalls++;
        }
      })
    });
  };
  const close = async () => {
    await app?.close();
    await pool?.end();
    await storage?.close();
    await audioArtifacts?.close();
    app = undefined;
    pool = undefined;
    storage = undefined;
  };
  const restorer = (authoringRestorer ??= createDocumentLifecycleRestorer({
    sourceUrl: source,
    restoreUrl: process.env.PILOT_DOCUMENTS_RESTORE_DATABASE_URL!,
    runId,
    directory,
    containerName: process.env.PILOT_RECOVERY_DOCKER_CONTAINER!,
    confirmation: "synthetic-local-only"
  }));
  const base = `/v1/condominiums/${tenant}/chats/${chat}/audio-inputs/${inputId}`;
  const draftBase = `/v1/condominiums/${tenant}/chats/${chat}/document-drafts/${draftId}`;
  async function receive(url = base, mode = "meeting") {
    return app!.inject({
      method: "POST",
      url: `${url}?mode=${mode}&title=FICTICIO`,
      headers: { ...headers, "content-type": "audio/wav" },
      payload: syntheticWav(2)
    });
  }
  try {
    await f.admin.query(
      `CREATE ROLE "${login}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
    );
    await f.admin.query(`GRANT app_runtime TO "${login}"`);
    await f.admin.query(
      "INSERT INTO app.users(id,auth_subject,status) VALUES($1,$3,'active'),($2,$4,'active')",
      [user, other, `FICTICIO-${user}`, `FICTICIO-${other}`]
    );
    await f.admin.query(
      "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTÍCIO-AUDIO-A','active'),($2,'FICTÍCIO-AUDIO-B','active')",
      [tenant, foreign]
    );
    for (const t of [tenant, foreign])
      for (const u of [user, other])
        await f.admin.query(
          "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','synthetic-audio')",
          [t, randomUUID(), u]
        );
    open(source);
    for (const [t, c] of [
      [tenant, chat],
      [tenant, otherChat],
      [foreign, otherChat]
    ])
      expect(
        (
          await app!.inject({
            method: "POST",
            url: `/v1/condominiums/${t}/chats`,
            headers,
            payload: { id: c, title: "FICTÍCIO-ÁUDIO" }
          })
        ).statusCode
      ).toBe(201);
    const uploaded = await receive();
    expect(uploaded.statusCode, uploaded.body).toBe(200);
    expect((await receive()).statusCode).toBe(200);
    expect(transcriptions).toBe(1);
    const minutes = await app!.inject({
      method: "POST",
      url: `${base}/minutes/${draftId}`,
      headers,
      payload: { request: "Prepare a ata sintética para revisar." }
    });
    expect(minutes.statusCode, minutes.body).toBe(200);
    const draft = minutes.json().draft;
    const editorial = await app!.inject({
      method: "POST",
      url: `${draftBase}/improvement`,
      headers,
      payload: { expectedEvent: draft.event }
    });
    expect(editorial.statusCode, editorial.body).toBe(200);
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${draftBase}/decide`,
          headers,
          payload: { expectedEvent: draft.event, hash: draft.hash, confirm: true, reviewed: true }
        })
      ).statusCode
    ).toBe(200);
    const foreignBase = `/v1/condominiums/${foreign}/chats/${otherChat}/audio-inputs/${foreignInput}`;
    expect((await receive(foreignBase)).statusCode).toBe(200);
    expect(transcriptions).toBe(2);
    expect(modelCalls).toBe(2);
    const exported = await app!.inject({ method: "GET", url: `${base}/export`, headers });
    expect(exported.statusCode, exported.body).toBe(200);
    expect(Buffer.from(exported.json().data.original, "base64")).toEqual(syntheticWav(2));
    expect(JSON.stringify(exported.json().data)).toContain("Não houve votação");
    expect(JSON.stringify(exported.json().data)).toContain("sugestão editorial sintética");
    for (const [url, h] of [
      [base.replace(chat, otherChat), headers],
      [base, { "x-development-user-id": other }],
      [base.replace(tenant, foreign), headers]
    ] as const)
      expect((await app!.inject({ method: "GET", url, headers: h })).statusCode).not.toBe(200);
    await restorer.backup("before-purge");
    await close();
    open(source);
    expect((await receive()).statusCode).toBe(200);
    expect(transcriptions).toBe(2);
    expect(
      (await app!.inject({ method: "GET", url: `${draftBase}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(200);
    // Uma tentativa posterior ao backup não pode ser reenviada após restore.
    const uncertainId = randomUUID();
    const uncertainBase = `/v1/condominiums/${tenant}/chats/${otherChat}/audio-inputs/${uncertainId}`;
    expect((await receive(uncertainBase, "dictation")).statusCode).toBe(503);
    expect((await receive(uncertainBase, "dictation")).statusCode).toBe(503);
    expect(transcriptions).toBe(3);
    expect(
      (
        await app!.inject({
          method: "DELETE",
          url: `/v1/condominiums/${tenant}/chats/${otherChat}`,
          headers
        })
      ).statusCode
    ).toBe(204);
    const limitedUrl = new URL(source);
    limitedUrl.username = login;
    limitedUrl.password = "synthetic-only";
    const limited = createSyntheticPostgresAudioStorage({
      databaseUrl: limitedUrl.toString(),
      confirmation: "synthetic-local-only",
      journal,
      retentionSeconds: 3600,
      maximumDailyInputs: 10,
      maximumConcurrent: 1,
      now: () => clock
    });
    try {
      await expect(
        limited.reserve(scope, randomUUID(), "a".repeat(64), syntheticWav(2))
      ).rejects.toMatchObject({ statusCode: 429 });
    } finally {
      await limited.close();
    }
    const conversationBeforeAudioPurge = await f.admin.query(
      "SELECT id,messages FROM app.conversation_entries WHERE condominium_id=$1 AND chat_id=$2 ORDER BY sequence",
      [tenant, chat]
    );
    expect((await app!.inject({ method: "DELETE", url: base, headers })).statusCode).toBe(200);
    expect((await app!.inject({ method: "GET", url: base, headers })).statusCode).toBe(404);
    expect(
      (await app!.inject({ method: "GET", url: `${draftBase}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).not.toBe(200);
    const erased = await f.admin.query(
      "SELECT content,transcript,state,execution_state FROM app.audio_originals WHERE condominium_id=$1 AND id=$2",
      [tenant, inputId]
    );
    expect(erased.rows[0]).toEqual({
      content: null,
      transcript: null,
      state: "purged",
      execution_state: "completed"
    });
    const entries = await f.admin.query(
      "SELECT id,response,messages FROM app.conversation_entries WHERE condominium_id=$1 AND chat_id=$2 ORDER BY sequence",
      [tenant, chat]
    );
    // RQ-7323: apagar payload não autoriza apagar falas públicas já salvas.
    // A asserção antiga misturava esses dois contratos e exigia perda de histórico.
    expect(JSON.stringify(entries.rows.map((e) => e.response))).not.toContain("Não houve votação");
    expect(JSON.stringify(entries.rows.map((e) => e.response))).not.toContain(
      "sugestão editorial sintética"
    );
    expect(entries.rows.map(({ id, messages }) => ({ id, messages }))).toEqual(
      conversationBeforeAudioPurge.rows
    );
    const unrelatedId = randomUUID();
    expect(
      (
        await app!.inject({
          method: "POST",
          url: draftBase.replace(draftId, unrelatedId),
          headers,
          payload: {
            expectedEvent: 0,
            content: {
              title: "Comunicado independente",
              documentKind: "Comunicado",
              operation: "create",
              text: "FICTÍCIO. Rascunho sem áudio.",
              changes: "Criação.",
              pending: "Revisar.",
              sources: []
            }
          }
        })
      ).statusCode
    ).toBe(200);
    const unrelatedList = await app!.inject({
      method: "GET",
      url: draftBase.slice(0, draftBase.lastIndexOf("/")),
      headers
    });
    expect(unrelatedList.statusCode, unrelatedList.body).toBe(200);
    expect(unrelatedList.json().drafts.map((d: { id: string }) => d.id)).toEqual([unrelatedId]);
    const restored = await restorer.restore("before-purge");
    await close();
    open(restored);
    // O journal externo bloqueia inclusive a cópia anterior à exclusão.
    expect((await app!.inject({ method: "GET", url: base, headers })).statusCode).toBe(503);
    await storage!.reconcile();
    expect((await app!.inject({ method: "GET", url: base, headers })).statusCode).toBe(404);
    expect((await receive()).statusCode).not.toBe(200);
    expect((await receive(uncertainBase, "dictation")).statusCode).not.toBe(200);
    expect(transcriptions).toBe(3);
    expect(modelCalls).toBe(2);
    const audioLedger = JSON.parse(
      await readFile(resolve(directory, "audio-authoring-budget", "operation-budgets.json"), "utf8")
    );
    expect(
      audioLedger.receipts.map((r: { request: { kind: string } }) => r.request.kind).sort()
    ).toEqual(
      [
        "audio_transcription",
        "audio_transcription",
        "audio_transcription",
        "audio_minutes_write",
        "audio_minutes_review",
        "document_improvement"
      ].sort()
    );
    expect(
      audioLedger.receipts.filter((r: { state: string }) => r.state === "unknown")
    ).toHaveLength(1);
    expect((await app!.inject({ method: "GET", url: foreignBase, headers })).statusCode).toBe(200);
    const restoredAdmin = new Pool({ connectionString: restored });
    try {
      const tombstone = (
        await restoredAdmin.query(
          "SELECT content,transcript,state FROM app.audio_originals WHERE condominium_id=$1 AND id=$2",
          [tenant, uncertainId]
        )
      ).rows[0];
      expect(tombstone).toEqual({ content: null, transcript: null, state: "unknown" });
      await restoredAdmin.query(
        "UPDATE app.memberships SET status='revoked',revoked_at=now() WHERE condominium_id=$1 AND user_id=$2",
        [foreign, user]
      );
      expect((await app!.inject({ method: "GET", url: foreignBase, headers })).statusCode).toBe(
        403
      );
      await restoredAdmin.query(
        "UPDATE app.memberships SET status='active',revoked_at=NULL WHERE condominium_id=$1 AND user_id=$2",
        [foreign, user]
      );
      clock = new Date(clock.getTime() + 3600001);
      expect((await app!.inject({ method: "GET", url: foreignBase, headers })).statusCode).toBe(
        404
      );
      await storage!.purge(foreignScope, foreignInput);
      expect(
        (
          await restoredAdmin.query(
            "SELECT content,transcript FROM app.audio_originals WHERE condominium_id=$1 AND id=$2",
            [foreign, foreignInput]
          )
        ).rows[0]
      ).toEqual({ content: null, transcript: null });
    } finally {
      await restoredAdmin.end();
    }
    const wordProof = JSON.parse(
      await readFile(resolve(directory, "authoring-proof.json"), "utf8")
    );
    await writeFile(
      resolve(directory, "authoring-proof.json"),
      JSON.stringify({
        ...wordProof,
        audioRestore: true,
        postSnapshotPurge: true,
        unknownNotRetried: true,
        simulatedTranscriptions: transcriptions,
        audioOperationalBudget: true,
        providerCalls: 0,
        activationAuthorized: false
      })
    );
  } finally {
    await close();
    await f.close();
  }
});
