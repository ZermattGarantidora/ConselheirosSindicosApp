import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { localRecoveryConnection } from "./pilot-recovery.js";
import { createPostgresHostedCallLedger } from "../apps/api/documents/postgres-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../apps/api/documents/hosted-document-execution.js";
import { budgetDigest, type BudgetRequest } from "../apps/api/security/operation-budget.js";
import { createPostgresOperationBudgetStore } from "../apps/api/security/postgres-operation-budget-store.js";
import { createBudgetedHostedDocumentControls } from "../apps/api/security/hosted-operation-budget.js";
import { createPostgresAccessCodeStore } from "../apps/api/identity/postgres-access-code-store.js";

type Identity = {
  userId: string;
  condominiumId: string;
  membershipRevision: string;
  chatId: string;
  documentVersionId: string;
  contentSha256: string;
};
type Seed = {
  identities: Identity[];
  requests: BudgetRequest[];
  token: string;
  originHash: string;
  hosted: HostedDocumentTransferRequest;
  uncertain: HostedDocumentTransferRequest;
  lostAck: HostedDocumentTransferRequest;
  ledgerCommitment: string;
  pid: number;
};
const revision = "synthetic-policy-a";
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic-only",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 1000,
  globalDailyLimitMicrounits: 10000
};
let phase = "guards";
const pools: Pool[] = [];
const pool = (connectionString: string) => {
  const value = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 });
  pools.push(value);
  return value;
};
async function asRole<T>(
  value: Pool,
  role: "app_runtime" | "app_worker" | "app_ai_executor",
  condominiumId: string,
  operation: (client: PoolClient) => Promise<T>,
  commit = false
) {
  const client = await value.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${role}`);
    await client.query("SELECT set_config('app.condominium_id',$1,true)", [condominiumId]);
    const result = await operation(client);
    await client.query(commit ? "COMMIT" : "ROLLBACK");
    finished = true;
    return result;
  } finally {
    if (!finished) await client.query("ROLLBACK");
    client.release();
  }
}
const denyCode = (code: string) => (error: unknown) =>
  !!error && typeof error === "object" && "code" in error && error.code === code;

try {
  const args = process.argv.slice(2);
  assert.equal(args.length, 2);
  const stage = args[0];
  const runId = args[1]!;
  assert.ok(stage === "seed" || stage === "verify");
  assert.match(runId, /^[a-f0-9]{32}$/u);
  assert.equal(process.env.PILOT_RECOVERY_CONFIRMATION, "synthetic-local-only");
  const adminUrl = new URL(process.env.PILOT_RECOVERY_ADMIN_URL ?? "");
  assert.equal(adminUrl.pathname, "/postgres");
  const url = new URL(adminUrl);
  url.pathname = `/alvitra_ops_${stage === "seed" ? "source" : "restore"}_${runId}`;
  localRecoveryConnection(
    url.toString(),
    stage === "seed" ? "source" : "restore",
    "synthetic-local-only"
  );
  const directory = resolve(".local", "pilot-operations", runId);
  const admin = pool(url.toString());
  const marker = await admin.query("SELECT purpose,data_policy FROM ops_control.environment");
  assert.deepEqual(marker.rows, [
    { purpose: stage === "seed" ? "source" : "restore", data_policy: "synthetic-local-only" }
  ]);
  phase = "service_pools";
  const servicePools: Record<string, Pool> = {};
  for (const [name, role] of [
    ["runtime", "app_runtime"],
    ["worker", "app_worker"],
    ["ledger", "app_ai_executor"]
  ] as const) {
    const login = `ops_bound_${name}_${runId}`;
    assert.match(login, /^ops_bound_(runtime|worker|ledger)_[a-f0-9]{32}$/u);
    if (stage === "seed") {
      await admin.query(
        `CREATE ROLE "${login}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'synthetic-only'`
      );
      await admin.query(`GRANT ${role} TO "${login}"`);
    }
    const serviceUrl = new URL(url);
    serviceUrl.username = login;
    serviceUrl.password = "synthetic-only";
    servicePools[name] = pool(serviceUrl.toString());
    const memberships = await servicePools[name]!.query(
      "SELECT pg_has_role(current_user,'app_runtime','MEMBER') AS runtime,pg_has_role(current_user,'app_worker','MEMBER') AS worker,pg_has_role(current_user,'app_ai_executor','MEMBER') AS ledger"
    );
    assert.deepEqual(memberships.rows, [
      { runtime: name === "runtime", worker: name === "worker", ledger: name === "ledger" }
    ]);
  }
  const runtime = servicePools.runtime!;
  const worker = servicePools.worker!;
  const ledgerPool = servicePools.ledger!;
  const ledger = () => createPostgresHostedCallLedger(ledgerPool);
  const store = () => createPostgresOperationBudgetStore(runtime);
  const fixturePath = resolve(directory, "ledger-seeded.json");
  const identities = JSON.parse(
    await readFile(resolve(directory, "ledger-identities.json"), "utf8")
  ) as Identity[];
  assert.equal(identities.length, 2);
  const identity = identities[0]!;
  const scope = {
    kind: "tenant" as const,
    userId: identity.userId,
    condominiumId: identity.condominiumId,
    membershipRevision: identity.membershipRevision
  };
  const authorize = (policyRevision: string) => async (request: HostedDocumentTransferRequest) => ({
    allowed: true as const,
    requestHash: hostedDocumentRequestHash(request),
    policyRevision
  });
  const executor = (policyRevision: string, changedScope = scope, failCompletion = false) => {
    const persistent = store();
    return createHostedDocumentExecutor(
      createBudgetedHostedDocumentControls({
        authorize: authorize(policyRevision),
        ledger: ledger(),
        budget: () => budget,
        store: {
          mutate: async (action, ...args) => {
            if (failCompletion && action === "complete")
              throw new Error("synthetic-lost-budget-ack");
            return persistent.mutate(action, ...args);
          }
        },
        resolveScope: async () => {
          const current = await admin.query(
            "SELECT 1 FROM app.memberships m JOIN app.condominiums c ON c.id=m.condominium_id WHERE m.user_id=$1 AND m.condominium_id=$2 AND m.revision=$3 AND m.status='active' AND c.status='active' AND m.valid_from<=now() AND (m.valid_until IS NULL OR m.valid_until>now())",
            [scope.userId, scope.condominiumId, scope.membershipRevision]
          );
          assert.equal(current.rows.length, 1);
          return changedScope;
        }
      })
    );
  };
  const key = (request: HostedDocumentTransferRequest, policyRevision = revision) => ({
    condominiumId: request.condominiumId,
    requestHash: hostedDocumentRequestHash(request),
    policyRevision,
    documentVersionIds: request.documentVersions.map((item) => item.id)
  });
  const request = (): BudgetRequest => ({
    scope,
    operationId: randomUUID(),
    kind: "question",
    payloadHash: budgetDigest(randomUUID()),
    policyRevision: budgetDigest(revision),
    maximumCostMicrounits: 10
  });
  let fixture: Seed;
  if (stage === "seed") {
    phase = "disabled_default";
    await assert.rejects(store().mutate("reserve", request()), denyCode("denied"));
    await admin.query(
      "UPDATE app.operation_budget_policy SET enabled=true,revision=$1,currency='USD',scope_daily_cost=1000,global_daily_cost=10000,scope_daily_operations=100,global_daily_operations=1000,scope_concurrent=1,global_concurrent=1 WHERE singleton",
      [budgetDigest(revision)]
    );
    phase = "budget_concurrency";
    const contenders = [request(), request(), request()];
    const attempts = await Promise.allSettled(
      contenders.map((item) => store().mutate("reserve", item))
    );
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    for (const item of attempts)
      if (item.status === "rejected") assert.ok(denyCode("limit")(item.reason));
    const winner = contenders[attempts.findIndex((item) => item.status === "fulfilled")]!;
    await store().mutate("cancel", winner);
    await assert.rejects(
      store().mutate("reserve", { ...request(), maximumCostMicrounits: 1001 }),
      denyCode("limit")
    );
    await admin.query(
      "UPDATE app.operation_budget_policy SET scope_concurrent=20,global_concurrent=40 WHERE singleton"
    );
    const requests = [request(), request(), request()];
    for (const item of requests) await store().mutate("reserve", item);
    const tokens = [0, 1, 2].map(() => randomBytes(32).toString("base64url"));
    const claims = await Promise.all(
      tokens.map((token) => store().mutate("start", requests[0]!, { token }))
    );
    assert.equal(claims.filter((item) => item.claimed).length, 1);
    await store().mutate("complete", requests[0]!, {
      token: tokens[claims.findIndex((item) => item.claimed)]!,
      outputHash: budgetDigest("synthetic-complete"),
      actualCostMicrounits: 7
    });
    const token = randomBytes(32).toString("base64url");
    assert.equal((await store().mutate("start", requests[1]!, { token })).claimed, true);
    await store().mutate("unknown", requests[1]!, { token });
    phase = "login_concurrency";
    const originHash = budgetDigest("synthetic-origin-only");
    const access = createPostgresAccessCodeStore({
      query: async (text: string, values?: unknown[]) =>
        asRole(runtime, "app_runtime", "", (client) => client.query(text, values), true)
    } as Pick<Pool, "query">);
    const decisions = await Promise.all(
      Array.from({ length: 14 }, () => access.consumeLoginAttempt!(originHash, Date.now()))
    );
    assert.equal(decisions.filter((item) => item.allowed).length, 10);
    assert.equal(decisions.filter((item) => !item.allowed && item.retryAfterSeconds > 0).length, 4);
    const globalAttempts = await Promise.all(
      Array.from({ length: 990 }, (_, index) =>
        access.consumeLoginAttempt!(
          budgetDigest(["synthetic-global-origin", Math.floor(index / 10)]),
          Date.now()
        )
      )
    );
    assert.ok(globalAttempts.every((item) => item.allowed));
    assert.equal(
      (await access.consumeLoginAttempt!(budgetDigest("synthetic-global-overflow"), Date.now()))
        .allowed,
      false
    );
    phase = "hosted_global_race";
    const raceKeys = identities.map((item) => ({
      condominiumId: item.condominiumId,
      requestHash: budgetDigest(["synthetic-global-race", item.condominiumId]),
      policyRevision: revision
    }));
    const ledgerRace = await Promise.allSettled(
      raceKeys.map((item) => ledger().reserve(item, { ...budget, globalDailyLimitMicrounits: 10 }))
    );
    assert.equal(ledgerRace.filter((item) => item.status === "fulfilled").length, 1);
    for (const item of ledgerRace)
      if (item.status === "rejected") assert.ok(denyCode("budget_exceeded")(item.reason));
    const raceIndex = ledgerRace.findIndex((item) => item.status === "fulfilled");
    const raceResult = ledgerRace[raceIndex]!;
    assert.ok(raceResult.status === "fulfilled" && raceResult.value.status === "reserved");
    await ledger().cancel(raceKeys[raceIndex]!, raceResult.value.owner);
    phase = "hosted_composition";
    const hosted: HostedDocumentTransferRequest = {
      purpose: "pdf_ocr",
      destination: hostedDocumentDestination,
      model: "synthetic-only",
      condominiumId: identity.condominiumId,
      userId: identity.userId,
      chatId: identity.chatId,
      membershipRevision: identity.membershipRevision,
      documentVersions: [
        {
          id: identity.documentVersionId,
          contentKind: "original",
          contentSha256: identity.contentSha256
        }
      ],
      payloadSha256: budgetDigest("synthetic-ocr-payload"),
      inputBytes: 1,
      pageCount: 1,
      maximumOutputTokens: 1
    };
    let calls = 0;
    const generate = async () => {
      calls += 1;
      return { createdUnder: revision, text: "Resultado FICTÍCIO persistido" };
    };
    const value = await executor(revision).execute(hosted, generate);
    assert.equal(calls, 1);
    // A failed journal/ACK after a durable result must recover without generation or reservation.
    await assert.rejects(
      Promise.resolve().then(() => {
        throw new Error("synthetic-journal-failure");
      })
    );
    assert.deepEqual(await executor(revision).execute(hosted, generate), value);
    assert.equal(calls, 1);
    await assert.rejects(
      executor("synthetic-policy-b").execute(hosted, generate),
      denyCode("call_policy_conflict")
    );
    assert.equal(calls, 1);
    const uncertain = { ...hosted, payloadSha256: budgetDigest("synthetic-uncertain") };
    let uncertainCalls = 0;
    await assert.rejects(
      executor(revision).execute(uncertain, async () => {
        uncertainCalls += 1;
        throw new Error("synthetic-result-unknown");
      })
    );
    assert.equal(uncertainCalls, 1);
    await assert.rejects(
      executor(revision).execute(uncertain, generate),
      denyCode("call_uncertain")
    );
    const lostAck = { ...hosted, payloadSha256: budgetDigest("synthetic-lost-ack") };
    let ackCalls = 0;
    await assert.rejects(
      executor(revision, scope, true).execute(lostAck, async () => {
        ackCalls += 1;
        return { text: "Resultado FICTÍCIO com ACK perdido" };
      })
    );
    assert.equal(ackCalls, 1);
    const ledgerCommitment = String(
      (await admin.query("SELECT sum(committed)::text AS total FROM app.hosted_call_daily"))
        .rows[0]!.total
    );
    fixture = {
      identities,
      requests,
      token,
      originHash,
      hosted,
      uncertain,
      lostAck,
      ledgerCommitment,
      pid: process.pid
    };
    await writeFile(fixturePath, JSON.stringify(fixture), { flag: "wx", mode: 0o600 });
  } else {
    fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Seed;
    assert.notEqual(fixture.pid, process.pid, "Verificação deve usar outro processo Node.");
    phase = "restored_policy_replay";
    let calls = 0;
    const forbidden = async () => {
      calls += 1;
      throw new Error("synthetic-unexpected-provider-call");
    };
    await assert.rejects(
      executor("synthetic-policy-b").execute(fixture.hosted, forbidden),
      denyCode("call_policy_conflict")
    );
    assert.deepEqual(await executor(revision).execute(fixture.hosted, forbidden), {
      createdUnder: revision,
      text: "Resultado FICTÍCIO persistido"
    });
    await assert.rejects(
      executor(revision).execute(fixture.uncertain, forbidden),
      denyCode("call_uncertain")
    );
    await assert.rejects(
      executor("synthetic-policy-b").execute(fixture.uncertain, forbidden),
      denyCode("call_policy_conflict")
    );
    phase = "restored_lost_ack";
    assert.deepEqual(await executor(revision).execute(fixture.lostAck, forbidden), {
      text: "Resultado FICTÍCIO com ACK perdido"
    });
    phase = "restored_changed_scope";
    for (const changedScope of [
      { ...scope, userId: identities[1]!.userId },
      { ...scope, condominiumId: identities[1]!.condominiumId },
      { ...scope, membershipRevision: "synthetic-revoked" }
    ])
      await assert.rejects(
        executor(revision, changedScope).execute(fixture.hosted, forbidden),
        denyCode("transfer_denied")
      );
    phase = "restored_revocation";
    await admin.query(
      "UPDATE app.memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND condominium_id=$2",
      [scope.userId, scope.condominiumId]
    );
    try {
      await assert.rejects(
        executor(revision).execute(fixture.hosted, forbidden),
        denyCode("transfer_denied")
      );
    } finally {
      await admin.query(
        "UPDATE app.memberships SET status='active',revoked_at=NULL WHERE user_id=$1 AND condominium_id=$2",
        [scope.userId, scope.condominiumId]
      );
    }
    phase = "restored_commitment";
    assert.equal(calls, 0);
    assert.equal(
      String(
        (await admin.query("SELECT sum(committed)::text AS total FROM app.hosted_call_daily"))
          .rows[0]!.total
      ),
      fixture.ledgerCommitment
    );
    phase = "restored_budget";
    assert.equal(
      (await store().mutate("reserve", fixture.requests[0]!)).receipt.state,
      "completed"
    );
    assert.equal((await store().mutate("reserve", fixture.requests[1]!)).receipt.state, "unknown");
    assert.equal(
      (await store().mutate("start", fixture.requests[1]!, { token: fixture.token })).claimed,
      false
    );
    await assert.rejects(store().mutate("cancel", fixture.requests[1]!), denyCode("conflict"));
    const workerStore = createPostgresOperationBudgetStore(worker, "app_worker");
    const token = randomBytes(32).toString("base64url");
    assert.equal(
      (await workerStore.mutate("start", fixture.requests[2]!, { token })).claimed,
      true
    );
    await workerStore.mutate("complete", fixture.requests[2]!, {
      token,
      outputHash: budgetDigest("synthetic-worker-complete"),
      actualCostMicrounits: 4
    });
    await assert.rejects(
      store().mutate("reserve", {
        ...fixture.requests[0]!,
        scope: { ...scope, userId: identities[1]!.userId }
      }),
      denyCode("denied")
    );
    await assert.rejects(
      store().mutate("reserve", {
        ...fixture.requests[0]!,
        scope: { ...scope, condominiumId: identities[1]!.condominiumId }
      }),
      denyCode("denied")
    );
    phase = "restored_login";
    const access = createPostgresAccessCodeStore({
      query: async (text: string, values?: unknown[]) =>
        asRole(runtime, "app_runtime", "", (client) => client.query(text, values), true)
    } as Pick<Pool, "query">);
    assert.equal(
      (await access.consumeLoginAttempt!(fixture.originHash, Date.now())).allowed,
      false
    );
    assert.equal(
      (
        await access.consumeLoginAttempt!(
          budgetDigest("synthetic-new-origin-after-restore"),
          Date.now()
        )
      ).allowed,
      false
    );
    phase = "rls_and_grants";
    for (const [service, role] of [
      [runtime, "app_runtime"],
      [worker, "app_worker"]
    ] as const)
      for (const table of [
        "operation_budget_policy",
        "operation_budget_receipts",
        "hosted_call_records",
        "hosted_call_daily",
        "access_login_attempts"
      ])
        await assert.rejects(
          asRole(service, role, identity.condominiumId, (client) =>
            client.query(`SELECT * FROM app.${table}`)
          ),
          denyCode("42501")
        );
    await asRole(ledgerPool, "app_ai_executor", identities[1]!.condominiumId, async (client) => {
      assert.equal(
        (
          await client.query("SELECT * FROM app.hosted_call_records WHERE condominium_id=$1", [
            identity.condominiumId
          ])
        ).rows.length,
        0
      );
      await assert.rejects(
        client.query(
          "INSERT INTO app.hosted_call_records(condominium_id,request_hash,record) SELECT $1,$2,$3::jsonb",
          [
            identity.condominiumId,
            hostedDocumentRequestHash(fixture.hosted),
            JSON.stringify({
              condominiumId: identity.condominiumId,
              requestHash: hostedDocumentRequestHash(fixture.hosted),
              currency: "USD",
              documentVersionIds: [],
              status: "reserved"
            })
          ]
        ),
        denyCode("42501")
      );
    });
    phase = "version_invalidation";
    assert.equal(
      await ledger().invalidateDocumentVersion(identity.condominiumId, identity.documentVersionId),
      3
    );
    await assert.rejects(
      ledger().reserve(key(fixture.hosted), budget),
      denyCode("call_invalidated")
    );
    const invalidated = await admin.query(
      "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1",
      [identity.condominiumId]
    );
    assert.ok(invalidated.rows.every((row) => row.record.resultJson === undefined));
    assert.equal(
      String(
        (await admin.query("SELECT sum(committed)::text AS total FROM app.hosted_call_daily"))
          .rows[0]!.total
      ),
      fixture.ledgerCommitment
    );
  }
  await writeFile(
    resolve(directory, `ledger-${stage}-result.json`),
    JSON.stringify(
      {
        passed: true,
        stage,
        pid: process.pid,
        sourcePid: fixture.pid,
        providerCalls: 0,
        activationAuthorized: false,
        postgresReal: true,
        separateRestrictedPools: true,
        budgetClaimRace: stage === "seed",
        hostedGlobalRace: stage === "seed",
        loginGlobalThousandLimit: true,
        loginOriginRace: stage === "seed",
        policyChangedReplayDenied: true,
        composedScopeReplayDenied: stage === "verify",
        lostOperationalAckRecovered: stage === "verify",
        uncertainReplayDenied: true,
        restoredCompletedAndPendingReceipts: stage === "verify",
        crossTenantLedgerDenied: stage === "verify",
        originalCommitmentPreserved: stage === "verify"
      },
      null,
      2
    ),
    { flag: "wx", mode: 0o600 }
  );
  console.info(JSON.stringify({ code: "pilot_ledger_recovery_passed", stage, providerCalls: 0 }));
} catch (error) {
  console.error(
    JSON.stringify({
      code: "pilot_ledger_recovery_failed",
      phase,
      sqlState:
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        /^[0-9A-Z]{5}$/u.test(error.code)
          ? error.code
          : undefined
    })
  );
  process.exitCode = 1;
} finally {
  await Promise.all(pools.map((value) => value.end()));
}
