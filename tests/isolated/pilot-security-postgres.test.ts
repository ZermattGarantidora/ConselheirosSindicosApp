import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { Client, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateDatabase } from "../../scripts/database-migrations.js";
import { backupLocalApplication, restoreLocalApplication } from "../../scripts/pilot-recovery.js";
import {
  createDockerRecoveryRunner,
  localRecoveryDockerHost
} from "../../scripts/pilot-recovery-docker.js";
import { createPostgresOperationBudgetStore } from "../../apps/api/security/postgres-operation-budget-store.js";
import {
  budgetDigest,
  serializeBudgetValue,
  type BudgetRequest
} from "../../apps/api/security/operation-budget.js";
import { hostedCallResultHash } from "../../apps/api/documents/hosted-call-ledger.js";
import { createPostgresAccessCodeStore } from "../../apps/api/identity/postgres-access-code-store.js";
import { createAccessCodeService, accessCookie } from "../../apps/api/identity/access-code.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { hostedDocumentDestination } from "../../apps/api/documents/hosted-document-execution.js";
import { createPostgresHostedCallLedger } from "../../apps/api/documents/postgres-hosted-call-ledger.js";
import {
  createSyntheticDataControls,
  maintenanceInventoryDigest
} from "../../apps/api/security/synthetic-data-controls.js";
import {
  persistMaintenancePlan,
  type SyntheticMaintenancePlan,
  type SyntheticMaintenancePolicy
} from "../../apps/api/security/synthetic-maintenance-plan.js";
import { hostedOperationId } from "../../apps/api/security/hosted-operation-budget.js";

const confirmation = "synthetic-local-only";
const runId = randomUUID().replaceAll("-", "");
const root = resolve(".local/pilot-operations");
const output = join(root, `security-${runId}`);
const environment: Record<string, string> = { PILOT_SECURITY_CONFIRMATION: confirmation };
for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TMP", "TEMP"])
  if (process.env[name]) environment[name] = process.env[name]!;
const actors = Array.from({ length: 3 }, () => ({
  userId: randomUUID(),
  condominiumId: randomUUID(),
  membershipRevision: "synthetic-v1"
}));
const revision = "synthetic-policy-v1";
const hostedVersionId = randomUUID();
let source: Pool, restored: Pool, sourceUrl: string, restoreUrl: string;
let run: Awaited<ReturnType<typeof createDockerRecoveryRunner>>;
const migrations: Record<string, string> = {};
const context = (index: number) => ({
  userId: createUserId(actors[index]!.userId),
  condominiumId: createCondominiumId(actors[index]!.condominiumId),
  membershipRevision: actors[index]!.membershipRevision,
  roleKey: "manager" as const,
  permissions: ["document:read", "document:upload"] as const
});
const request = (index = 0): BudgetRequest => ({
  scope: { kind: "tenant", ...actors[index]! },
  operationId: randomUUID(),
  kind: "question",
  payloadHash: "a".repeat(64),
  policyRevision: budgetDigest(revision),
  maximumCostMicrounits: 10
});

beforeAll(async () => {
  if (process.env.PILOT_SECURITY_CONFIRMATION !== confirmation)
    throw new Error("Confirmação local sintética obrigatória.");
  const report = resolve(process.env.PILOT_SECURITY_CONTAINER_REPORT ?? "");
  if (!/^container-[a-f0-9]{32}[\\/]result\.json$/u.test(relative(root, report)))
    throw new Error("Recibo fora da saída local guardada.");
  const wrapper = JSON.parse(await readFile(report, "utf8"));
  if (
    wrapper.passed !== true ||
    wrapper.dataPolicy !== confirmation ||
    wrapper.activationAuthorized !== false ||
    wrapper.keptByRequest !== true ||
    !/^alvitra-ops-[a-f0-9]{32}$/u.test(wrapper.containerName)
  )
    throw new Error("Container local não confirmado.");
  await mkdir(output, { mode: 0o700 });
  const config = join(output, "empty-docker-config");
  await mkdir(config, { mode: 0o700 });
  const docker = async (args: readonly string[]) =>
    (
      await promisify(execFile)(
        "docker",
        ["--config", config, "--host", localRecoveryDockerHost, ...args],
        { env: environment, shell: false, windowsHide: true, timeout: 60000, maxBuffer: 2097152 }
      )
    ).stdout;
  const metadata = (
    await docker([
      "inspect",
      "--format",
      '{{json .NetworkSettings.Ports}}\n{{.Config.Image}}\n{{index .Config.Labels "app.alvitra.purpose"}}',
      wrapper.containerName
    ])
  )
    .trim()
    .split(/\r?\n/u);
  const ports = JSON.parse(metadata[0] ?? "null")?.["5432/tcp"];
  if (
    metadata.length !== 3 ||
    metadata[1] !== "pgvector/pgvector:pg17" ||
    metadata[2] !== "synthetic-local-recovery" ||
    ports?.length !== 1 ||
    ports[0].HostIp !== "127.0.0.1" ||
    !/^\d{1,5}$/u.test(ports[0].HostPort)
  )
    throw new Error("Porta/imagem/label local incompatível.");
  sourceUrl = `postgresql://postgres:synthetic-only@127.0.0.1:${ports[0].HostPort}/alvitra_ops_source_${runId}`;
  restoreUrl = `postgresql://postgres:synthetic-only@127.0.0.1:${ports[0].HostPort}/alvitra_ops_restore_${runId}`;
  run = await createDockerRecoveryRunner({
    containerName: wrapper.containerName,
    outputDirectory: root,
    transport: docker
  });
  // The transport inspects local labels, mounts, image and port before any database is created.
  const parsed = new URL(sourceUrl);
  await run({
    executable: "pg_dump",
    args: ["--version"],
    environment: {
      PGDATABASE: parsed.pathname.slice(1),
      PGHOST: "127.0.0.1",
      PGUSER: "postgres",
      PGPORT: parsed.port
    }
  });
  const admin = new Client({
    connectionString: new URL("/postgres", sourceUrl).toString(),
    connectionTimeoutMillis: 5000
  });
  await admin.connect();
  try {
    for (const [purpose, url] of [
      ["source", sourceUrl],
      ["restore", restoreUrl]
    ] as const) {
      const name = new URL(url).pathname.slice(1);
      if (!/^alvitra_ops_(source|restore)_[a-f0-9]{32}$/u.test(name)) throw new Error();
      await admin.query(`CREATE DATABASE "${name}"`);
      const client = new Client({ connectionString: url });
      await client.connect();
      try {
        await client.query("CREATE SCHEMA ops_control");
        await client.query(
          "CREATE TABLE ops_control.environment(purpose text NOT NULL,data_policy text NOT NULL)"
        );
        await client.query("INSERT INTO ops_control.environment VALUES($1,$2)", [
          purpose,
          confirmation
        ]);
        await client.query(
          "CREATE TABLE ops_control.synthetic_dispatches(id bigserial PRIMARY KEY)"
        );
        if (purpose === "source") {
          const names = await migrateDatabase(client);
          for (const name of names)
            migrations[name] = budgetDigest(
              await readFile(join("infrastructure/database", name), "utf8")
            );
        } else await client.query("CREATE EXTENSION vector");
      } finally {
        await client.end();
      }
    }
  } finally {
    await admin.end();
  }
  source = new Pool({ connectionString: sourceUrl, max: 8, connectionTimeoutMillis: 5000 });
  restored = new Pool({ connectionString: restoreUrl, max: 3, connectionTimeoutMillis: 5000 });
  for (const actor of actors) {
    await source.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
      actor.userId,
      `synthetic-${actor.userId}`
    ]);
    await source.query(
      "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTÍCIO: condomínio de ensaio','active')",
      [actor.condominiumId]
    );
    await source.query(
      "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day',$4)",
      [actor.condominiumId, randomUUID(), actor.userId, actor.membershipRevision]
    );
  }
  await source.query(
    "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'advisor','active',now()-interval '1 day','synthetic-v1')",
    [actors[0]!.condominiumId, randomUUID(), actors[1]!.userId]
  );
  await source.query(
    "UPDATE app.operation_budget_policy SET enabled=true,revision=$1,currency='USD',scope_daily_cost=30,global_daily_cost=100,scope_daily_operations=3,global_daily_operations=20,scope_concurrent=2,global_concurrent=4",
    [budgetDigest(revision)]
  );
}, 60000);
afterAll(async () => {
  await source?.end();
  await restored?.end();
});

async function runtime(sql: string, values: unknown[] = [], actor = actors[0]!, commit = false) {
  const client = await source.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query(
      "SELECT set_config('app.user_id',$1,true),set_config('app.condominium_id',$2,true)",
      [actor.userId, actor.condominiumId]
    );
    const result = await client.query(sql, values);
    await client.query(commit ? "COMMIT" : "ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function child(url: string, policy = revision) {
  const actor = actors[2]!;
  const transfer = {
    purpose: "pdf_ocr",
    destination: hostedDocumentDestination,
    model: "synthetic-only",
    condominiumId: actor.condominiumId,
    documentVersions: [
      { id: hostedVersionId, contentKind: "original", contentSha256: "a".repeat(64) }
    ],
    payloadSha256: "b".repeat(64),
    inputBytes: 1,
    pageCount: 1,
    maximumOutputTokens: 1
  };
  const result = await promisify(execFile)(
    process.execPath,
    [
      "scripts/run-tsx.mjs",
      "tests/fixtures/postgres-hosted-budget-client.ts",
      url,
      JSON.stringify(transfer),
      JSON.stringify({ kind: "tenant", ...actor }),
      policy
    ],
    { env: environment, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 1048576 }
  );
  return JSON.parse(result.stdout) as { status: string; code?: string; value?: { text: string } };
}
async function inventoryParts(client: Pick<Pool, "query">) {
  const parts: Record<string, string> = {};
  await maintenanceInventoryDigest({
    query: async (sql: string) => {
      const result = await client.query(sql);
      for (const row of result.rows)
        parts[`${row.kind ?? "migration"}:${row.name}`] = budgetDigest(row);
      return result;
    }
  } as never);
  return parts;
}

describe.sequential("SQL real local — migrations 039/040 e recuperação composta", () => {
  it("reserva/claim atômicos entre conexões, cota comum e isolamento", async () => {
    const stores = [
      createPostgresOperationBudgetStore(source),
      createPostgresOperationBudgetStore(source, "app_worker")
    ];
    const inputs = Array.from({ length: 8 }, () => request());
    const results = await Promise.allSettled(
      inputs.map((item, i) => stores[i % 2]!.mutate("reserve", item))
    );
    const accepted = results.flatMap((result, i) =>
      result.status === "fulfilled" ? [inputs[i]!] : []
    );
    expect(accepted).toHaveLength(2);
    expect(results.filter((value) => value.status === "rejected")).toHaveLength(6);
    const first = accepted[0]!;
    const tokens = ["A".repeat(43), "B".repeat(43)];
    const claims = await Promise.all(
      tokens.map((token, i) => stores[i]!.mutate("start", first, { token }))
    );
    expect(claims.filter((value) => value.claimed)).toHaveLength(1);
    await stores[0]!.mutate("complete", first, {
      token: tokens[claims.findIndex((value) => value.claimed)]!,
      outputHash: budgetDigest("synthetic"),
      actualCostMicrounits: 10
    });
    await stores[0]!.mutate("cancel", accepted[1]!);
    const third = request();
    await stores[1]!.mutate("reserve", third);
    await expect(stores[0]!.mutate("reserve", request())).rejects.toMatchObject({ code: "limit" });
    await stores[0]!.mutate("start", third, { token: "C".repeat(43) });
    await stores[0]!.mutate("unknown", third, { token: "C".repeat(43) });
    expect((await stores[1]!.mutate("reserve", third)).receipt.state).toBe("unknown");
    await expect(stores[0]!.mutate("cancel", third)).rejects.toMatchObject({ code: "conflict" });
    await expect(
      stores[0]!.mutate("reserve", {
        ...request(),
        scope: { kind: "tenant", ...actors[1]!, condominiumId: actors[0]!.condominiumId }
      })
    ).rejects.toMatchObject({ code: "limit" });
    await expect(
      stores[1]!.mutate("reserve", {
        ...first,
        scope: { kind: "tenant", ...actors[1]!, condominiumId: actors[0]!.condominiumId }
      })
    ).rejects.toMatchObject({ code: "conflict" });
    await stores[0]!.mutate("reserve", request(1));
    await expect(
      stores[0]!.mutate("reserve", {
        ...request(),
        scope: { kind: "tenant", ...actors[0]!, condominiumId: actors[1]!.condominiumId }
      })
    ).rejects.toMatchObject({ code: "denied" });
    for (const table of [
      "operation_budget_policy",
      "operation_budget_receipts",
      "hosted_call_records"
    ])
      await expect(runtime(`SELECT * FROM app.${table}`)).rejects.toMatchObject({ code: "42501" });
    const rls = await source.query(
      "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('app.operation_budget_policy'::regclass,'app.operation_budget_receipts'::regclass,'app.hosted_call_records'::regclass)"
    );
    expect(rls.rows).toHaveLength(3);
    expect(rls.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
  });

  it("login compartilha dez por origem e mil globais com função privada", async () => {
    const adapter = {
      query: (sql: string, values?: unknown[]) => runtime(sql, values, actors[0]!, true)
    } as never;
    const stores = [createPostgresAccessCodeStore(adapter), createPostgresAccessCodeStore(adapter)];
    const outcomes = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        stores[i % 2]!.consumeLoginAttempt("c".repeat(64), Date.now())
      )
    );
    expect(outcomes.filter((result) => result.allowed)).toHaveLength(10);
    expect(outcomes.filter((result) => !result.allowed)).toHaveLength(2);
    const global = await runtime(
      "SELECT r.* FROM generate_series(1,1005) i CROSS JOIN LATERAL app.consume_access_login_attempt(encode(sha256(convert_to(i::text,'UTF8')),'hex')) r",
      [],
      actors[0]!,
      true
    );
    expect(global.rows.filter((result) => result.allowed)).toHaveLength(990);
    expect(
      Number(
        (await source.query("SELECT count FROM app.access_login_attempts WHERE key='global'"))
          .rows[0].count
      )
    ).toBe(1000);
  });

  it("AC-6821: sessão UUID reconhece membership com auth_subject distinto, sem colisão de alias", async () => {
    const actor = actors[0]!,
      collision = randomUUID();
    await source.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
      collision,
      actor.userId
    ]);
    await source.query(
      "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','fixture-collision')",
      [actors[2]!.condominiumId, randomUUID(), collision]
    );
    const service = createAccessCodeService(createPostgresAccessCodeStore(source), "a".repeat(64));
    const code = await service.provision(actor.userId),
      login = await service.login(code);
    expect(login?.userId).toBe(actor.userId);
    const repository = createPostgresMembershipRepository(source);
    const api = createApi({ accessCodeAuth: service, membershipRepository: repository });
    try {
      const cookie = accessCookie(login!.token, false).split(";")[0]!;
      expect((await api.inject({ url: "/v1/access/session", headers: { cookie } })).json()).toEqual(
        { userId: actor.userId }
      );
      const own = await api.inject({
        url: `/v1/condominiums/${actor.condominiumId}/documents`,
        headers: { cookie, "x-development-user-id": collision }
      });
      expect(own.statusCode).toBe(200);
      const directory = await runtime(
        "SELECT condominium_id FROM app.list_authorized_condominiums($1)",
        [actor.userId],
        actor
      );
      expect(directory.rows.map((row) => row.condominium_id)).toEqual([actor.condominiumId]);
      const domainClient = await source.connect();
      try {
        await domainClient.query("BEGIN");
        await domainClient.query("SET LOCAL ROLE app_runtime");
        await domainClient.query("SELECT set_config('app.user_id',$1,true)", [actor.userId]);
        for (const action of ["delete", "leave"] as const) {
          const createdId = randomUUID();
          await domainClient.query(
            "SELECT * FROM app.create_condominium_for_user($1,$2,$3,'FICTÍCIO: identidade canônica',NULL,'{}',NULL,5,'{}')",
            [actor.userId, createdId, randomUUID()]
          );
          await domainClient.query("SELECT set_config('app.condominium_id',$1,true)", [createdId]);
          expect(
            (
              await domainClient.query(
                "SELECT user_id FROM app.memberships WHERE condominium_id=$1",
                [createdId]
              )
            ).rows.map((row) => row.user_id)
          ).toEqual([actor.userId]);
          await domainClient.query(
            'SELECT app.update_condominium_profile($1,$2,\'FICTÍCIO: perfil próprio\',\'{"city":"Cidade Fictícia","state":"SP"}\',NULL,5,\'{}\',NULL)',
            [actor.userId, createdId]
          );
          if (action === "leave") {
            // Real creation/leave use separate requests. This rollback fixture holds now() at BEGIN.
            await domainClient.query("SET LOCAL ROLE NONE");
            await domainClient.query(
              "UPDATE app.memberships SET valid_from=valid_from-interval '1 minute' WHERE condominium_id=$1",
              [createdId]
            );
            await domainClient.query("SET LOCAL ROLE app_runtime");
          }
          const operation =
            action === "delete" ? "delete_condominium_for_user" : "leave_condominium_for_user";
          expect(
            (
              await domainClient.query(`SELECT app.${operation}($1,$2) AS done`, [
                actor.userId,
                createdId
              ])
            ).rows[0].done
          ).toBe(true);
          if (action === "leave")
            expect(
              (
                await domainClient.query(
                  "SELECT status FROM app.memberships WHERE condominium_id=$1",
                  [createdId]
                )
              ).rows[0].status
            ).toBe("revoked");
          else
            expect(
              (await domainClient.query("SELECT id FROM app.condominiums WHERE id=$1", [createdId]))
                .rowCount
            ).toBe(0);
        }
      } finally {
        await domainClient.query("ROLLBACK");
        domainClient.release();
      }
      expect(
        (
          await api.inject({
            url: `/v1/condominiums/${actors[2]!.condominiumId}/documents`,
            headers: { cookie, "x-development-user-id": collision }
          })
        ).statusCode
      ).toBe(403);
      expect(
        await repository.findMembership({
          userId: createUserId(`synthetic-${actor.userId}`),
          condominiumId: createCondominiumId(actor.condominiumId)
        })
      ).toHaveProperty("roleKey", "manager");
      await source.query("UPDATE app.users SET status='blocked' WHERE id=$1", [actor.userId]);
      expect(
        await repository.findMembership({
          userId: createUserId(actor.userId),
          condominiumId: createCondominiumId(actors[2]!.condominiumId)
        })
      ).toBeUndefined();
      expect(await service.authenticate(login!.token)).toBeUndefined();
    } finally {
      await api.close();
      await source.query("UPDATE app.users SET status='active' WHERE id=$1", [actor.userId]);
    }
  });

  it("AC-7126: contraprova independente exclui condomínio com resultado, preservando recibo/custo/unknown", async () => {
    const client = await source.connect(),
      userId = randomUUID(),
      condominiumId = randomUUID();
    try {
      await client.query("BEGIN");
      const beforeB = (
        await client.query("SELECT to_jsonb(c) AS value FROM app.condominiums c WHERE id=$1", [
          actors[1]!.condominiumId
        ])
      ).rows[0].value;
      await client.query("INSERT INTO app.users(id,auth_subject,status) VALUES($1,$2,'active')", [
        userId,
        `fixture-delete-${userId}`
      ]);
      await client.query(
        "INSERT INTO app.condominiums(id,display_name,status) VALUES($1,'FICTÍCIO: exclusão com ledger','active')",
        [condominiumId]
      );
      await client.query(
        "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'manager','active',now()-interval '1 day','fixture-delete-v1')",
        [condominiumId, randomUUID(), userId]
      );
      const requestHash = budgetDigest(randomUUID()),
        resultJson = JSON.stringify({ synthetic: "PRIVATE_RESULT_TO_PURGE" }),
        period = new Date().toISOString().slice(0, 10);
      const record = {
        condominiumId,
        requestHash,
        policyRevision: revision,
        owner: randomUUID(),
        status: "completed",
        documentVersionIds: [],
        period,
        currency: "USD",
        tariffVersion: "synthetic-only",
        commitment: 10,
        leaseUntil: 0,
        resultJson,
        resultSha256: hostedCallResultHash(resultJson)
      };
      await client.query(
        "INSERT INTO app.hosted_call_daily(period,committed) VALUES($1,10) ON CONFLICT(period) DO UPDATE SET committed=app.hosted_call_daily.committed+10",
        [period]
      );
      await client.query("INSERT INTO app.hosted_call_records VALUES($1,$2,$3)", [
        condominiumId,
        requestHash,
        record
      ]);
      const req: BudgetRequest = {
        scope: { kind: "tenant", userId, condominiumId, membershipRevision: "fixture-delete-v1" },
        operationId: randomUUID(),
        kind: "photo_ocr",
        payloadHash: requestHash,
        policyRevision: budgetDigest(revision),
        maximumCostMicrounits: 10
      };
      await client.query("SET LOCAL ROLE app_runtime");
      await client.query(
        "SELECT set_config('app.user_id',$1,true),set_config('app.condominium_id',$2,true)",
        [userId, condominiumId]
      );
      await client.query("SELECT app.mutate_operation_budget('reserve',$1,NULL,NULL,NULL)", [
        serializeBudgetValue(req)
      ]);
      await client.query("SELECT app.mutate_operation_budget('start',$1,$2,NULL,NULL)", [
        serializeBudgetValue(req),
        budgetDigest("fixture-delete-token")
      ]);
      await client.query("SELECT app.mutate_operation_budget('unknown',$1,$2,NULL,NULL)", [
        serializeBudgetValue(req),
        budgetDigest("fixture-delete-token")
      ]);
      expect(
        (
          await client.query("SELECT app.delete_condominium_for_user($1,$2) AS deleted", [
            userId,
            condominiumId
          ])
        ).rows[0].deleted
      ).toBe(true);
      await client.query("SAVEPOINT deleted_scope");
      await expect(
        client.query("SELECT app.mutate_operation_budget('reserve',$1,NULL,NULL,NULL)", [
          serializeBudgetValue(req)
        ])
      ).rejects.toMatchObject({ message: "budget_denied" });
      await client.query("ROLLBACK TO deleted_scope");
      await client.query("SET LOCAL ROLE app_ai_executor");
      expect(
        (
          await client.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [
            condominiumId
          ])
        ).rows
      ).toEqual([]);
      await client.query("SET LOCAL ROLE NONE");
      const retained = (
        await client.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [
          condominiumId
        ])
      ).rows[0].record;
      expect(retained).toMatchObject({ status: "invalidated", commitment: 10 });
      expect(retained).not.toHaveProperty("resultJson");
      expect(retained).not.toHaveProperty("resultSha256");
      expect(
        (
          await client.query(
            "SELECT state,(request->>'maximumCostMicrounits')::int AS cost FROM app.operation_budget_receipts WHERE condominium_id=$1",
            [condominiumId]
          )
        ).rows
      ).toEqual([{ state: "unknown", cost: 10 }]);
      expect(
        (
          await client.query("SELECT to_jsonb(c) AS value FROM app.condominiums c WHERE id=$1", [
            actors[1]!.condominiumId
          ])
        ).rows[0].value
      ).toEqual(beforeB);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("processos separados recuperam resultado; política B não reusa, journal e backup conservam os dois lados", async () => {
    const first = await child(sourceUrl);
    expect(first.status).toBe("completed");
    expect(await child(sourceUrl)).toEqual(first);
    expect(await child(sourceUrl, "synthetic-policy-b")).toMatchObject({
      status: "blocked",
      code: "call_policy_conflict"
    });
    expect(
      Number(
        (await source.query("SELECT count(*) AS count FROM ops_control.synthetic_dispatches"))
          .rows[0].count
      )
    ).toBe(1);
    const chatId = randomUUID(),
      ctx = context(2);
    await createPostgresChatRepository(source).create(ctx, {
      id: chatId,
      title: "FICTÍCIO: conversa preservada"
    });
    const scope = {
      kind: "chat" as const,
      userId: ctx.userId,
      condominiumId: ctx.condominiumId,
      chatId
    };
    const entry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      requestKey: randomUUID(),
      inputHash: budgetDigest("synthetic"),
      messages: [
        {
          id: randomUUID(),
          role: "user" as const,
          kind: "document_summary" as const,
          text: "FICTÍCIO: confira o documento."
        },
        {
          id: randomUUID(),
          role: "assistant" as const,
          kind: "document_summary" as const,
          text: first.value!.text
        }
      ],
      response: { value: first.value },
      metadata: { kind: "document_summary" }
    };
    const journal = createPostgresConversationStore(source);
    await journal.append(scope, entry);
    const client = new Client({ connectionString: sourceUrl }),
      target = new Client({ connectionString: restoreUrl });
    await client.connect();
    await target.connect();
    try {
      const backup = join(output, "backup");
      await backupLocalApplication(client, sourceUrl, backup, confirmation, run);
      await restoreLocalApplication(target, restoreUrl, backup, confirmation, run);
    } finally {
      await client.end();
      await target.end();
    }
    expect(await child(restoreUrl)).toEqual(first);
    expect(await child(restoreUrl, "synthetic-policy-b")).toMatchObject({
      status: "blocked",
      code: "call_policy_conflict"
    });
    expect(
      Number(
        (await restored.query("SELECT count(*) AS count FROM ops_control.synthetic_dispatches"))
          .rows[0].count
      )
    ).toBe(0);
    const recovered = await createPostgresConversationStore(restored).list(scope);
    expect(recovered.entries[0]?.messages).toEqual(entry.messages);
    expect(
      Number(
        (
          await restored.query(
            "SELECT count(*) AS count FROM app.operation_budget_receipts WHERE state='unknown'"
          )
        ).rows[0].count
      )
    ).toBe(1);
    await expect(
      createPostgresConversationStore(restored).list({
        ...scope,
        userId: createUserId(actors[0]!.userId)
      })
    ).rejects.toHaveProperty("statusCode");
    for (const [name, hash] of Object.entries(migrations))
      expect(budgetDigest(await readFile(join("infrastructure/database", name), "utf8"))).toBe(
        hash
      );
    await writeFile(
      join(output, "security-result.json"),
      JSON.stringify(
        {
          passed: true,
          providerCalls: 0,
          realSql: true,
          processRestart: true,
          policyIsolation: true,
          fullAppRestore: true,
          historyBothSides: true,
          activationAuthorized: false,
          databases: [new URL(sourceUrl).pathname.slice(1), new URL(restoreUrl).pathname.slice(1)],
          migrations
        },
        null,
        2
      ),
      { flag: "wx", mode: 0o600 }
    );
  });

  it("plano fora do snapshot reaplica revogações/expurgo, conserva consumo e reconcilia somente prova durável", async () => {
    const actor = actors[2]!,
      other = actors[1]!;
    const chat = randomUUID();
    await createPostgresChatRepository(source).create(context(1), {
      id: chat,
      title: "FICTÍCIO: preservado B"
    });
    const scopeB = {
      kind: "chat" as const,
      userId: createUserId(other.userId),
      condominiumId: createCondominiumId(other.condominiumId),
      chatId: chat
    };
    const entryB = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      requestKey: randomUUID(),
      inputHash: budgetDigest("fixture B"),
      messages: [
        {
          id: randomUUID(),
          role: "assistant" as const,
          kind: "question_answer" as const,
          text: "FICTÍCIO: fala B preservada"
        }
      ],
      response: { synthetic: true },
      metadata: { kind: "question" }
    };
    await createPostgresConversationStore(source).append(scopeB, entryB);
    await source.query(
      "INSERT INTO app.memberships(condominium_id,id,user_id,role_key,status,valid_from,revision) VALUES($1,$2,$3,'advisor','active',now()-interval '1 day','synthetic-v1')",
      [other.condominiumId, randomUUID(), actor.userId]
    );
    for (const identity of [actors[0]!, other]) {
      const accessRevision = randomUUID();
      await source.query("SELECT app.provision_access_code($1,$2,$3)", [
        identity.userId,
        accessRevision,
        budgetDigest(["fixture-code", identity.userId])
      ]);
      await source.query("SELECT app.create_device_session($1,$2,$3)", [
        identity.userId,
        accessRevision,
        budgetDigest(["fixture-device", identity.userId])
      ]);
      await source.query(
        "INSERT INTO app.auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [identity.userId, budgetDigest(["fixture-session", identity.userId])]
      );
      await source.query(
        "INSERT INTO app.auth_mfa_challenges(user_id,token_hash,device_label,expires_at) VALUES($1,$2,'FICTÍCIO',now()+interval '1 hour')",
        [identity.userId, budgetDigest(["fixture-challenge", identity.userId])]
      );
    }
    await source.query(
      "UPDATE app.operation_budget_policy SET scope_daily_cost=1000,global_daily_cost=10000,scope_daily_operations=100,global_daily_operations=200,scope_concurrent=100,global_concurrent=200"
    );
    const ledger = createPostgresHostedCallLedger(source),
      store = createPostgresOperationBudgetStore(source);
    const budget = {
      currency: "USD" as const,
      tariffVersion: "synthetic-only",
      maximumCostMicrounits: 10,
      tenantDailyLimitMicrounits: 1000,
      globalDailyLimitMicrounits: 10000
    };
    const reconcileEvents = [];
    for (const state of ["completed", "cancelled", "uncertain"] as const) {
      const requestHash = budgetDigest([state, randomUUID()]);
      const key = {
        condominiumId: actor.condominiumId,
        requestHash,
        policyRevision: revision,
        documentVersionIds: [hostedVersionId]
      };
      const reservation = await ledger.reserve(key, budget);
      expect(reservation.status).toBe("reserved");
      if (reservation.status !== "reserved") throw new Error();
      const req = {
        ...request(2),
        operationId: hostedOperationId(actor.condominiumId, requestHash),
        kind: "photo_ocr" as const,
        payloadHash: requestHash
      };
      await store.mutate("reserve", req);
      await store.mutate("start", req, { token: "R".repeat(43) });
      if (state === "cancelled") await ledger.cancel(key, reservation.owner);
      else {
        await ledger.dispatch(key, reservation.owner);
        if (state === "completed")
          await ledger.complete(key, reservation.owner, { synthetic: "confirmed" });
        else await ledger.uncertain(key, reservation.owner);
      }
      await store.mutate("unknown", req, { token: "R".repeat(43) });
      reconcileEvents.push({
        id: randomUUID(),
        action: "reconcile_hosted_operation" as const,
        condominiumId: actor.condominiumId,
        userId: actor.userId,
        requestHash,
        policyRevision: revision
      });
    }
    // The backup intentionally precedes the decisions and one last consumption record.
    await source.query("UPDATE app.operation_budget_policy SET enabled=false");
    const backup = join(output, "pre-decision-backup"),
      client = new Client({ connectionString: sourceUrl });
    await client.connect();
    try {
      await backupLocalApplication(client, sourceUrl, backup, confirmation, run);
    } finally {
      await client.end();
    }
    await source.query("UPDATE app.operation_budget_policy SET enabled=true");
    const late = request(1);
    await store.mutate("reserve", late);
    await store.mutate("start", late, { token: "L".repeat(43) });
    await store.mutate("unknown", late, { token: "L".repeat(43) });
    const lateHash = budgetDigest(["post-snapshot-call", randomUUID()]);
    const lateKey = {
      condominiumId: other.condominiumId,
      requestHash: lateHash,
      policyRevision: revision,
      documentVersionIds: []
    };
    const lateReservation = await ledger.reserve(lateKey, budget);
    if (lateReservation.status !== "reserved") throw new Error();
    const lateCall = {
      ...request(1),
      operationId: hostedOperationId(other.condominiumId, lateHash),
      kind: "photo_ocr" as const,
      payloadHash: lateHash
    };
    await store.mutate("reserve", lateCall);
    await store.mutate("start", lateCall, { token: "P".repeat(43) });
    await ledger.dispatch(lateKey, lateReservation.owner);
    await ledger.complete(lateKey, lateReservation.owner, {
      synthetic: "CANARY_RESULT_NOT_IN_CHECKPOINT"
    });
    await store.mutate("complete", lateCall, {
      token: "P".repeat(43),
      outputHash: budgetDigest({ synthetic: "CANARY_RESULT_NOT_IN_CHECKPOINT" }),
      actualCostMicrounits: 10
    });
    const lateOrigin = budgetDigest("fixture-post-snapshot-origin");
    await source.query(
      "INSERT INTO app.access_login_attempts(key,count,until_at) VALUES($1,4,now()+interval '15 minutes')",
      [lateOrigin]
    );
    await source.query("UPDATE app.operation_budget_policy SET enabled=false");
    const versions = (
      await source.query(
        "SELECT DISTINCT jsonb_array_elements_text(record->'documentVersionIds') AS id FROM app.hosted_call_records"
      )
    ).rows.map((row) => row.id as string);
    const policy: SyntheticMaintenancePolicy = {
      dataPolicy: confirmation,
      revision: budgetDigest("fixture-maintenance-v1"),
      snapshotDigest: budgetDigest(await readFile(join(backup, "manifest.json"), "utf8")),
      migrationDigest: await maintenanceInventoryDigest(source),
      userIds: actors.map((row) => row.userId),
      condominiumIds: actors.map((row) => row.condominiumId),
      documentVersionIds: versions,
      allowedActions: [
        "revoke_account",
        "revoke_membership",
        "purge_condominium_content",
        "reconcile_hosted_operation"
      ]
    };
    const sourceInventoryParts = await inventoryParts(source);
    const key = new Uint8Array(32).fill(42);
    const callback = async (sql: PoolClient, event: { condominiumId?: string }) => {
      await sql.query("DELETE FROM app.conversation_entries WHERE condominium_id=$1", [
        event.condominiumId
      ]);
    };
    const original = createSyntheticDataControls({
      connectionString: sourceUrl,
      confirmation,
      policy,
      key,
      eligible: async () => true,
      applyDocumentDecision: callback
    });
    const plan: SyntheticMaintenancePlan = {
      version: 1,
      policyDigest: budgetDigest(policy),
      snapshotDigest: policy.snapshotDigest,
      fence: await original.captureFence(),
      decisions: [
        ...reconcileEvents,
        {
          id: randomUUID(),
          action: "purge_condominium_content",
          condominiumId: actor.condominiumId
        },
        {
          id: randomUUID(),
          action: "revoke_membership",
          userId: actor.userId,
          condominiumId: actor.condominiumId
        },
        { id: randomUUID(), action: "revoke_account", userId: actors[0]!.userId }
      ]
    };
    const path = join(output, "post-snapshot-decisions.json"),
      hash = await persistMaintenancePlan(path, plan, policy, key);
    expect(await readFile(path, "utf8")).not.toContain("CANARY_RESULT_NOT_IN_CHECKPOINT");
    const beforeFailure = await original.captureFence();
    const countA = Number(
      (
        await source.query(
          "SELECT count(*) AS n FROM app.conversation_entries WHERE condominium_id=$1",
          [actor.condominiumId]
        )
      ).rows[0].n
    );
    const rollbackPlan = {
      ...plan,
      decisions: [
        {
          id: randomUUID(),
          action: "revoke_membership" as const,
          userId: other.userId,
          condominiumId: other.condominiumId
        },
        {
          id: randomUUID(),
          action: "purge_condominium_content" as const,
          condominiumId: actor.condominiumId
        }
      ]
    };
    const rollbackPath = join(output, "callback-failure-plan.json"),
      rollbackHash = await persistMaintenancePlan(rollbackPath, rollbackPlan, policy, key);
    const failing = createSyntheticDataControls({
      connectionString: sourceUrl,
      confirmation,
      policy,
      key,
      eligible: async () => true,
      applyDocumentDecision: async (sql, event) => {
        await callback(sql, event);
        throw new Error("PRIVATE_CALLBACK_CANARY");
      }
    });
    try {
      await expect(failing.applyPlan(rollbackPath, rollbackHash)).rejects.toThrow("quarentena");
    } finally {
      await failing.close();
    }
    expect(
      (
        await source.query(
          "SELECT status FROM app.memberships WHERE user_id=$1 AND condominium_id=$2",
          [other.userId, other.condominiumId]
        )
      ).rows[0].status
    ).toBe("active");
    expect(
      Number(
        (
          await source.query(
            "SELECT count(*) AS n FROM app.conversation_entries WHERE condominium_id=$1",
            [actor.condominiumId]
          )
        ).rows[0].n
      )
    ).toBe(countA);
    expect((await original.captureFence()).receipts).toEqual(beforeFailure.receipts);
    const applied = await original.applyPlan(path, hash);
    expect(applied.decisions.slice(0, 3).map((row) => row.outcome)).toEqual([
      "completed",
      "cancelled",
      "pending"
    ]);
    expect((await original.applyPlan(path, hash)).decisions).toEqual(applied.decisions);
    expect(await ledger.invalidateDocumentVersion(actor.condominiumId, hostedVersionId)).toBe(4);
    expect((await original.applyPlan(path, hash)).decisions).toEqual(applied.decisions);
    expect(
      (
        await source.query("SELECT record FROM app.hosted_call_records WHERE condominium_id=$1", [
          actor.condominiumId
        ])
      ).rows.every(
        (row) => row.record.status === "invalidated" && row.record.resultJson === undefined
      )
    ).toBe(true);
    await original.close();
    const targetId = randomUUID().replaceAll("-", "");
    const targetUrl = new URL(restoreUrl);
    targetUrl.pathname = `/alvitra_ops_restore_${targetId}`;
    const admin = new Client({ connectionString: new URL("/postgres", sourceUrl).toString() });
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE "alvitra_ops_restore_${targetId}"`);
    } finally {
      await admin.end();
    }
    const target = new Client({ connectionString: targetUrl.toString() });
    const targetPool = new Pool({
      connectionString: targetUrl.toString(),
      max: 2,
      connectionTimeoutMillis: 5000
    });
    await target.connect();
    try {
      await target.query(
        "CREATE SCHEMA ops_control; CREATE TABLE ops_control.environment(purpose text,data_policy text); INSERT INTO ops_control.environment VALUES('restore','synthetic-local-only'); CREATE EXTENSION vector"
      );
      // Simulate surviving external decision receipts: they must never suppress reapplication after restore.
      await target.query(
        "CREATE TABLE ops_control.maintenance_decisions(id uuid PRIMARY KEY,fingerprint text NOT NULL,outcome text NOT NULL)"
      );
      for (const event of plan.decisions)
        await target.query(
          "INSERT INTO ops_control.maintenance_decisions VALUES($1,$2,'applied')",
          [event.id, budgetDigest([plan.policyDigest, event])]
        );
      await restoreLocalApplication(target, targetUrl.toString(), backup, confirmation, run);
      const restoredInventoryParts = await inventoryParts(target as never);
      const differences = Object.keys({
        ...sourceInventoryParts,
        ...restoredInventoryParts
      }).filter((name) => sourceInventoryParts[name] !== restoredInventoryParts[name]);
      if (differences.length)
        await writeFile(
          join(output, "maintenance-inventory-diff.json"),
          JSON.stringify(
            { differences, source: sourceInventoryParts, restored: restoredInventoryParts },
            null,
            2
          ),
          { flag: "wx", mode: 0o600 }
        );
      expect(differences).toEqual([]);
      const controls = createSyntheticDataControls({
        connectionString: targetUrl.toString(),
        confirmation,
        policy,
        key,
        eligible: async () => true,
        onDiagnostic: (phase) => process.stderr.write(`synthetic_maintenance_phase=${phase}\n`),
        applyDocumentDecision: callback
      });
      try {
        const replay = await controls.applyPlan(path, hash);
        expect(replay.decisions.slice(0, 3).map((row) => row.outcome)).toEqual([
          "completed",
          "cancelled",
          "pending"
        ]);
        const after = await controls.captureFence();
        expect(after.receipts).toHaveLength(plan.fence.receipts.length);
        expect(
          after.receipts.find((row) => row.request.operationId === late.operationId)?.state
        ).toBe("unknown");
        expect(after.login.find((row) => row.key === lateOrigin)?.count).toBe(4);
        expect(after.calls.find((row) => row.requestHash === lateHash)?.status).toBe("uncertain");
        const missingResult = (
          await target.query(
            "SELECT record FROM app.hosted_call_records WHERE condominium_id=$1 AND request_hash=$2",
            [other.condominiumId, lateHash]
          )
        ).rows[0].record;
        expect(missingResult).not.toHaveProperty("resultJson");
        await expect(
          createPostgresHostedCallLedger(targetPool).reserve(lateKey, budget)
        ).rejects.toMatchObject({ code: "call_uncertain" });
        for (const table of [
          "access_codes",
          "device_sessions",
          "auth_sessions",
          "auth_mfa_challenges"
        ]) {
          expect(
            Number(
              (
                await target.query(`SELECT count(*) AS n FROM app.${table} WHERE user_id=$1`, [
                  actors[0]!.userId
                ])
              ).rows[0].n
            )
          ).toBe(0);
          expect(
            Number(
              (
                await target.query(`SELECT count(*) AS n FROM app.${table} WHERE user_id=$1`, [
                  other.userId
                ])
              ).rows[0].n
            )
          ).toBe(1);
        }
        expect(
          (
            await target.query(
              "SELECT status FROM app.memberships WHERE user_id=$1 AND condominium_id=$2",
              [actor.userId, other.condominiumId]
            )
          ).rows[0].status
        ).toBe("active");
        expect(
          (await target.query("SELECT status FROM app.users WHERE id=$1", [actor.userId])).rows[0]
            .status
        ).toBe("active");
        expect(
          (
            await target.query(
              "SELECT count(*)::int AS n FROM app.conversation_entries WHERE condominium_id=$1",
              [actor.condominiumId]
            )
          ).rows[0].n
        ).toBe(0);
        expect(
          (await createPostgresConversationStore(targetPool).list(scopeB)).entries[0]?.messages
        ).toEqual(entryB.messages);
        expect(
          (
            await target.query(
              "SELECT status FROM app.memberships WHERE user_id=$1 AND condominium_id=$2",
              [actor.userId, actor.condominiumId]
            )
          ).rows[0].status
        ).toBe("revoked");
        expect(
          (await target.query("SELECT status FROM app.users WHERE id=$1", [actors[0]!.userId]))
            .rows[0].status
        ).toBe("blocked");
        expect((await controls.applyPlan(path, hash)).decisions).toEqual(replay.decisions);
        expect((await controls.captureFence()).receipts).toEqual(after.receipts);
        await expect(controls.applyPlan(path, budgetDigest("wrong anchor"))).rejects.toThrow(
          "quarentena"
        );
        expect(
          (await target.query("SELECT enabled FROM app.operation_budget_policy")).rows[0].enabled
        ).toBe(false);
        const bad = createSyntheticDataControls({
          connectionString: targetUrl.toString(),
          confirmation,
          policy,
          key,
          eligible: async () => false
        });
        try {
          await expect(bad.captureFence()).rejects.toThrow("quarentena");
        } finally {
          await bad.close();
        }
        await target.query("ALTER TABLE app.users DISABLE ROW LEVEL SECURITY");
        try {
          await expect(controls.captureFence()).rejects.toThrow("quarentena");
        } finally {
          await target.query("ALTER TABLE app.users ENABLE ROW LEVEL SECURITY");
        }
        await writeFile(
          join(output, "maintenance-result.json"),
          JSON.stringify(
            {
              passed: true,
              syntheticOnly: true,
              providerCalls: 0,
              postSnapshotReapplication: true,
              survivingDecisionReceiptsReapplied: true,
              tenantBPreserved: true,
              unknownRetained: true,
              callbackRollback: true,
              credentialsRevoked: true,
              lostResultFenced: true,
              loginAfterSnapshotPreserved: true,
              schemaTamperingDenied: true,
              reconciled: ["completed", "cancelled", "pending"],
              activationAuthorized: false
            },
            null,
            2
          ),
          { flag: "wx", mode: 0o600 }
        );
      } finally {
        await controls.close();
      }
    } finally {
      await target.end();
      await targetPool.end();
    }
  });
});
