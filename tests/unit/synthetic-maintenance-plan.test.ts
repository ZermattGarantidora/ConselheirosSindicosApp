import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  budgetDigest,
  type StoredBudgetReceipt
} from "../../apps/api/security/operation-budget.js";
import {
  createSyntheticDataControls,
  syntheticMaintenanceConnection
} from "../../apps/api/security/synthetic-data-controls.js";
import {
  loadMaintenancePlan,
  combineConsumptionReceipt,
  persistMaintenancePlan,
  redactHostedConsumption,
  validateMaintenancePlan,
  validateMaintenancePolicy,
  type SyntheticMaintenancePolicy,
  type SyntheticMaintenancePlan
} from "../../apps/api/security/synthetic-maintenance-plan.js";
const a = randomUUID(),
  user = randomUUID(),
  version = randomUUID();
const policy: SyntheticMaintenancePolicy = {
  dataPolicy: "synthetic-local-only",
  revision: budgetDigest("fixture-v1"),
  snapshotDigest: budgetDigest("fixture-backup"),
  migrationDigest: budgetDigest("fixture-catalog"),
  userIds: [user],
  condominiumIds: [a],
  documentVersionIds: [version],
  allowedActions: ["revoke_membership", "purge_document_version"]
};
const empty = (): SyntheticMaintenancePlan => ({
  version: 1,
  policyDigest: budgetDigest(policy),
  snapshotDigest: policy.snapshotDigest,
  fence: { receipts: [], calls: [], daily: [], lastSeenAt: 0, login: [] },
  decisions: [{ id: randomUUID(), action: "revoke_membership", userId: user, condominiumId: a }]
});
const key = new Uint8Array(32).fill(42);
const directories: string[] = [];
afterEach(async () => {
  for (const path of directories.splice(0)) {
    if (
      dirname(resolve(path)) !== resolve(tmpdir()) ||
      !basename(path).startsWith("alvitra-synthetic-plan-")
    )
      throw new Error("Temporário fora do escopo.");
    await rm(path, { recursive: true, force: true });
  }
});
const file = async () => {
  const root = await mkdtemp(join(tmpdir(), "alvitra-synthetic-plan-"));
  directories.push(root);
  return join(root, "plan.json");
};
describe("plano sintético fora do snapshot", () => {
  it("une recibos por prova sem regredir claim, mesmo com timestamps iguais", () => {
    const stamp = "2026-11-11T12:00:00.000Z";
    const base: StoredBudgetReceipt = {
      request: {
        scope: { kind: "tenant", userId: user, condominiumId: a, membershipRevision: "fixture" },
        operationId: randomUUID(),
        kind: "photo_ocr",
        payloadHash: budgetDigest("payload"),
        policyRevision: policy.revision,
        maximumCostMicrounits: 10
      },
      fingerprint: "",
      state: "reserved",
      currency: "USD",
      day: "2026-11-11",
      createdAt: stamp,
      updatedAt: stamp,
      tokenHash: null,
      outputHash: null,
      actualCostMicrounits: null
    };
    base.fingerprint = budgetDigest(base.request);
    const started = {
      ...base,
      state: "started" as const,
      tokenHash: budgetDigest("fixture-token")
    };
    const unknown = { ...started, state: "unknown" as const };
    const completed = {
      ...unknown,
      state: "completed" as const,
      outputHash: budgetDigest("fixture-result"),
      actualCostMicrounits: 10
    };
    const cancelled = { ...unknown, state: "cancelled" as const, tokenHash: null };
    expect(combineConsumptionReceipt(undefined, base)).toEqual(base);
    expect(combineConsumptionReceipt(base, started)).toEqual(started);
    expect(combineConsumptionReceipt(unknown, started)).toEqual(unknown);
    expect(combineConsumptionReceipt(started, unknown)).toEqual(unknown);
    expect(combineConsumptionReceipt(unknown, completed)).toEqual(completed);
    expect(combineConsumptionReceipt(completed, unknown)).toEqual(completed);
    expect(combineConsumptionReceipt(unknown, cancelled)).toEqual(cancelled);
    expect(combineConsumptionReceipt(cancelled, unknown)).toEqual(cancelled);
    expect(() => combineConsumptionReceipt(completed, cancelled)).toThrow();
    expect(() =>
      combineConsumptionReceipt(completed, { ...completed, outputHash: budgetDigest("other") })
    ).toThrow();
    expect(() =>
      combineConsumptionReceipt(unknown, { ...unknown, tokenHash: budgetDigest("other") })
    ).toThrow();
    expect(() => combineConsumptionReceipt(unknown, { ...unknown, currency: "BRL" })).toThrow();
    expect(() => combineConsumptionReceipt(unknown, { ...unknown, tokenHash: null })).toThrow();
    expect(() => combineConsumptionReceipt({ ...unknown, tokenHash: null }, unknown)).toThrow();
    const later = { ...unknown, updatedAt: "2026-11-11T12:00:00.001Z" };
    expect(combineConsumptionReceipt(later, completed)).toEqual({
      ...completed,
      updatedAt: later.updatedAt
    });
  });
  it("persiste exclusivamente, autentica e exige âncora externa", async () => {
    const path = await file(),
      plan = empty();
    const hash = await persistMaintenancePlan(path, plan, policy, key);
    expect(await loadMaintenancePlan(path, hash, policy, key)).toEqual(plan);
    await expect(persistMaintenancePlan(path, plan, policy, key)).rejects.toMatchObject({
      code: "EEXIST"
    });
    expect(await loadMaintenancePlan(path, hash, policy, key)).toEqual(plan);
  });
  it("recusa conteúdo adulterado mesmo com hash recalculado sem a chave", async () => {
    const path = await file();
    await persistMaintenancePlan(path, empty(), policy, key);
    const envelope = JSON.parse(await readFile(path, "utf8"));
    envelope.payload = envelope.payload.replace("revoke_membership", "purge_condominium_content");
    const changed = JSON.stringify(envelope);
    await writeFile(path, changed);
    await expect(loadMaintenancePlan(path, budgetDigest(changed), policy, key)).rejects.toThrow(
      "quarentena"
    );
  });
  it("recusa chave, âncora, política ou snapshot diferentes", async () => {
    const path = await file(),
      hash = await persistMaintenancePlan(path, empty(), policy, key);
    for (const [p, k, h] of [
      [policy, new Uint8Array(32).fill(43), hash],
      [policy, key, budgetDigest("old")],
      [{ ...policy, revision: budgetDigest("B") }, key, hash],
      [{ ...policy, snapshotDigest: budgetDigest("another") }, key, hash]
    ] as const)
      await expect(loadMaintenancePlan(path, h, p, k)).rejects.toThrow("quarentena");
  });
  it("recusa arquivo ausente, inválido, grande, não regular e chave curta", async () => {
    const path = await file();
    await expect(loadMaintenancePlan(path, budgetDigest("missing"), policy, key)).rejects.toThrow(
      "quarentena"
    );
    await writeFile(path, "not-json");
    await expect(loadMaintenancePlan(path, budgetDigest("not-json"), policy, key)).rejects.toThrow(
      "quarentena"
    );
    await writeFile(path, "x".repeat(32 * 1024 * 1024 + 1));
    await expect(loadMaintenancePlan(path, budgetDigest("oversized"), policy, key)).rejects.toThrow(
      "quarentena"
    );
    await expect(
      loadMaintenancePlan(directories[0]!, budgetDigest("directory"), policy, key)
    ).rejects.toThrow("quarentena");
    await expect(
      persistMaintenancePlan(await file(), empty(), policy, new Uint8Array(8))
    ).rejects.toThrow("quarentena");
  });
  it.each([
    (p: SyntheticMaintenancePolicy) => ({ ...p, dataPolicy: "real" }),
    (p: SyntheticMaintenancePolicy) => ({ ...p, revision: "invalid" }),
    (p: SyntheticMaintenancePolicy) => ({ ...p, userIds: [user, user] }),
    (p: SyntheticMaintenancePolicy) => ({ ...p, condominiumIds: ["not-uuid"] }),
    (p: SyntheticMaintenancePolicy) => ({ ...p, allowedActions: ["execute_sql"] }),
    (p: SyntheticMaintenancePolicy) => ({ ...p, unexpected: "content" })
  ])("política inválida nega antes dos efeitos", (mutate) => {
    expect(() => validateMaintenancePolicy(mutate(policy) as SyntheticMaintenancePolicy)).toThrow();
  });
  it.each([
    (p: SyntheticMaintenancePlan) => ({ ...p, version: 2 }),
    (p: SyntheticMaintenancePlan) => ({ ...p, policyDigest: budgetDigest("B") }),
    (p: SyntheticMaintenancePlan) => ({ ...p, snapshotDigest: budgetDigest("old") }),
    (p: SyntheticMaintenancePlan) => ({ ...p, decisions: [...p.decisions, ...p.decisions] }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      decisions: [{ ...p.decisions[0], userId: randomUUID() }]
    }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      decisions: [{ ...p.decisions[0], condominiumId: randomUUID() }]
    }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      decisions: [
        {
          id: randomUUID(),
          action: "purge_document_version",
          condominiumId: a,
          documentVersionId: randomUUID()
        }
      ]
    }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      decisions: [{ id: randomUUID(), action: "revoke_account", userId: user }]
    }),
    (p: SyntheticMaintenancePlan) => ({ ...p, decisions: [{ ...p.decisions[0], sql: "DELETE" }] }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      decisions: [{ id: randomUUID(), action: "revoke_membership", userId: user }]
    }),
    (p: SyntheticMaintenancePlan) => ({ ...p, fence: { ...p.fence, content: "forbidden" } }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      fence: {
        ...p.fence,
        login: [{ key: "global", count: 1001, untilAt: new Date().toISOString() }]
      }
    }),
    (p: SyntheticMaintenancePlan) => ({
      ...p,
      fence: { ...p.fence, login: [{ key: "IP", count: 1, untilAt: new Date().toISOString() }] }
    })
  ])("plano divergente ou escopo extra nega", (mutate) => {
    expect(() =>
      validateMaintenancePlan(mutate(empty()) as SyntheticMaintenancePlan, policy)
    ).toThrow();
  });
  it("exporta cerca de chamada sem resultado nem owner de execução", () => {
    const resultJson = JSON.stringify({ synthetic: "CANARY_DO_NOT_EXPORT" });
    const call = {
      condominiumId: a,
      requestHash: budgetDigest("request"),
      policyRevision: "fixture-v1",
      owner: randomUUID(),
      status: "completed" as const,
      documentVersionIds: [version],
      period: "2026-11-09",
      currency: "USD" as const,
      tariffVersion: "fixture",
      commitment: 10,
      leaseUntil: 100,
      resultJson,
      resultSha256: budgetDigest("irrelevant")
    };
    const row = redactHostedConsumption(call);
    expect(row.status).toBe("uncertain");
    expect(row.owner).not.toBe(call.owner);
    expect(JSON.stringify(row)).not.toContain("CANARY");
    expect(row).not.toHaveProperty("resultSha256");
    const plan = empty();
    plan.fence.calls = [row];
    plan.fence.daily = [{ period: "2026-11-09", committed: 10 }];
    expect(() => validateMaintenancePlan(plan, policy)).not.toThrow();
    expect(redactHostedConsumption({ ...call, status: "cancelled" }).status).toBe("cancelled");
    expect(redactHostedConsumption({ ...call, status: "invalidated", commitment: 0 }).status).toBe(
      "invalidated"
    );
    plan.fence.calls = [{ ...row, resultJson }];
    expect(() => validateMaintenancePlan(plan, policy)).toThrow();
  });
  it("cerca contém só recibos válidos autorizados e não duplica identidade", () => {
    const plan = empty();
    const timestamp = "2026-11-09T10:00:00.000Z";
    const receipt: StoredBudgetReceipt = {
      request: {
        scope: { kind: "tenant", userId: user, condominiumId: a, membershipRevision: "fixture" },
        operationId: randomUUID(),
        kind: "photo_ocr",
        payloadHash: budgetDigest("payload"),
        policyRevision: policy.revision,
        maximumCostMicrounits: 10
      },
      fingerprint: "",
      currency: "USD",
      day: "2026-11-09",
      createdAt: timestamp,
      updatedAt: timestamp,
      state: "unknown",
      tokenHash: budgetDigest("opaque"),
      outputHash: null,
      actualCostMicrounits: null
    };
    receipt.fingerprint = budgetDigest(receipt.request);
    plan.fence.receipts = [receipt];
    expect(() => validateMaintenancePlan(plan, policy)).not.toThrow();
    plan.fence.receipts.push(receipt);
    expect(() => validateMaintenancePlan(plan, policy)).toThrow();
    plan.fence.receipts = [{ ...receipt, tokenHash: null }];
    expect(() => validateMaintenancePlan(plan, policy)).toThrow();
    const foreign = {
      ...receipt,
      request: {
        ...receipt.request,
        scope: { kind: "account" as const, userId: randomUUID() },
        kind: "setup" as const
      }
    };
    foreign.fingerprint = budgetDigest(foreign.request);
    plan.fence.receipts = [foreign];
    expect(() => validateMaintenancePlan(plan, policy)).toThrow();
  });
});
describe("alvo de manutenção nunca descobre conexão do ambiente", () => {
  const valid = `postgresql://postgres:synthetic-only@127.0.0.1:5432/alvitra_ops_source_${"a".repeat(32)}`;
  it("nega elegibilidade ausente antes de abrir conexão", () => {
    expect(() =>
      createSyntheticDataControls({
        connectionString: valid,
        confirmation: "synthetic-local-only",
        policy,
        key
      } as never)
    ).toThrow("quarentena");
  });
  it("aceita somente fixture local exclusiva", () =>
    expect(syntheticMaintenanceConnection(valid, "synthetic-local-only").hostname).toBe(
      "127.0.0.1"
    ));
  it.each([
    valid.replace("127.0.0.1", "db.example.invalid"),
    valid.replace("127.0.0.1", "localhost"),
    valid.replace("synthetic-only", "real-password"),
    valid + "?sslmode=disable",
    valid + "#fragment",
    valid.replace("alvitra_ops_source_", "customer_"),
    valid.replace("postgresql:", "https:")
  ])("nega alvo não autorizado %s", (url) =>
    expect(() => syntheticMaintenanceConnection(url, "synthetic-local-only")).toThrow("quarentena")
  );
  it("nega falta de confirmação", () =>
    expect(() => syntheticMaintenanceConnection(valid, "yes")).toThrow("quarentena"));
});
