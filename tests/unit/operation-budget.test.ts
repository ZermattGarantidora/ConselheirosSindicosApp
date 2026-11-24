import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  budgetDigest,
  createBudgetedOperationRunner,
  mutateBudgetLedger,
  validateBudgetLedger,
  validateBudgetPolicy,
  type BudgetLedger,
  type BudgetPolicy,
  type BudgetRequest,
  type OperationBudgetStore
} from "../../apps/api/security/operation-budget.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import { createPostgresOperationBudgetStore } from "../../apps/api/security/postgres-operation-budget-store.js";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const condominiumId = "10000000-0000-4000-8000-000000000001";
const otherCondominium = "10000000-0000-4000-8000-000000000002";
const policy: BudgetPolicy = {
  enabled: true,
  revision: "a".repeat(64),
  currency: "BRL",
  scopeDailyCost: 1000,
  globalDailyCost: 2000,
  scopeDailyOperations: 20,
  globalDailyOperations: 40,
  scopeConcurrent: 4,
  globalConcurrent: 8
};
const request = (overrides: Partial<BudgetRequest> = {}): BudgetRequest => ({
  scope: { kind: "tenant", userId, condominiumId, membershipRevision: "synthetic-v1" },
  operationId: randomUUID(),
  kind: "question",
  payloadHash: budgetDigest("PAYLOAD FICTÍCIO PRIVADO"),
  policyRevision: policy.revision,
  maximumCostMicrounits: 100,
  ...overrides
});
const directories: string[] = [];
async function fixture(overrides: Partial<BudgetPolicy> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-budget-synthetic-"));
  directories.push(directory);
  let time = new Date("2026-11-09T12:00:00Z");
  const options = {
    directory,
    confirmation: "synthetic-only" as const,
    policy: { ...policy, ...overrides },
    now: () => time
  };
  return {
    directory,
    store: createLocalOperationBudgetStore(options),
    recreate: () => createLocalOperationBudgetStore(options),
    advance: (value: string) => {
      time = new Date(value);
    }
  };
}
const operation = () =>
  vi.fn(async () => ({
    value: "RESULTADO FICTÍCIO PRIVADO",
    outputHash: budgetDigest("RESULTADO FICTÍCIO PRIVADO"),
    actualCostMicrounits: 50
  }));
const runner = (store: OperationBudgetStore, authorize = async () => true) =>
  createBudgetedOperationRunner({ store, authorize });
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    expect(resolve(dirname(directory))).toBe(resolve(tmpdir()));
    expect(basename(directory)).toMatch(/^alvitra-budget-synthetic-/u);
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Spec 072 — reserva durável e idempotência", () => {
  it("AC-7209: relógio regressivo não renova cota; OCR de foto mantém finalidade própria", async () => {
    const { store, recreate, advance } = await fixture();
    const item = request({ kind: "photo_ocr" });
    expect((await store.mutate("reserve", item)).receipt.request.kind).toBe("photo_ocr");
    advance("2026-11-08T12:00:00Z");
    await expect(recreate().mutate("reserve", request())).rejects.toMatchObject({
      code: "unavailable"
    });
  });
  it("AC-7201: default negativo e política disabled/divergente não executam", async () => {
    const { directory, store } = await fixture();
    const execute = operation();
    await expect(
      createBudgetedOperationRunner({ store }).execute(request(), execute)
    ).rejects.toMatchObject({ code: "denied" });
    const denied = createLocalOperationBudgetStore({ directory, confirmation: "synthetic-only" });
    await expect(runner(denied).execute(request(), execute)).rejects.toMatchObject({
      code: "denied"
    });
    await expect(
      runner(store).execute(request({ policyRevision: "b".repeat(64) }), execute)
    ).rejects.toMatchObject({ code: "denied" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("AC-7202: usuários do mesmo condomínio e instâncias compartilham concorrência", async () => {
    const { store, recreate } = await fixture({ scopeConcurrent: 2 });
    const requests = Array.from({ length: 12 }, (_, index) =>
      request({
        scope: {
          kind: "tenant",
          userId: index % 2 ? userId : otherUser,
          condominiumId,
          membershipRevision: "synthetic-v1"
        }
      })
    );
    const results = await Promise.allSettled(
      requests.map((item, index) => (index % 2 ? store : recreate()).mutate("reserve", item))
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    for (const result of results.filter((entry) => entry.status === "rejected"))
      expect(result.reason).toMatchObject({ code: "limit" });
    await expect(recreate().mutate("reserve", request())).rejects.toMatchObject({ code: "limit" });
  });

  it.each([
    "scopeDailyCost",
    "globalDailyCost",
    "scopeDailyOperations",
    "globalDailyOperations",
    "globalConcurrent"
  ] as const)("AC-7202: respeita teto %s", async (key) => {
    const { store } = await fixture({ [key]: key.includes("Cost") ? 100 : 1 });
    await store.mutate("reserve", request());
    await expect(store.mutate("reserve", request())).rejects.toMatchObject({ code: "limit" });
  });

  it("AC-7203: corrida e recriação executam a mesma operação apenas uma vez", async () => {
    const { store, recreate } = await fixture();
    const item = request();
    const execute = operation();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        runner(index % 2 ? store : recreate()).execute(item, execute)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
    await expect(runner(recreate()).execute(item, execute)).rejects.toMatchObject({
      code: "already_completed"
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("AC-7203: processos Node independentes compartilham o claim durável", async () => {
    const { directory } = await fixture();
    const item = request();
    const env: NodeJS.ProcessEnv = { BUDGET_TEST_CONFIRMATION: "synthetic-only" };
    for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
      if (process.env[key]) env[key] = process.env[key];
    const runs = await Promise.all(
      Array.from({ length: 4 }, () =>
        promisify(execFile)(
          process.execPath,
          [
            "scripts/run-tsx.mjs",
            "tests/fixtures/operation-budget-client.ts",
            directory,
            JSON.stringify(item),
            JSON.stringify(policy)
          ],
          { env, windowsHide: true }
        )
      )
    );
    const results = runs.map(
      (run) => JSON.parse(run.stdout) as { completed: boolean; code?: string }
    );
    expect(results.filter((result) => result.completed)).toHaveLength(1);
    expect(
      results
        .filter((result) => !result.completed)
        .every((result) => ["in_progress", "already_completed"].includes(result.code!))
    ).toBe(true);
    expect(
      (await readFile(join(directory, "dispatch-count.txt"), "utf8")).trim().split("\n")
    ).toEqual(["synthetic-dispatch"]);
  }, 15_000);

  it("AC-7203/7207: payload/usuário diferente conflita; outro condomínio possui recibo próprio", async () => {
    const { store } = await fixture();
    const item = request();
    const first = await store.mutate("reserve", item);
    expect((await store.mutate("reserve", { ...item })).receipt.fingerprint).toBe(
      first.receipt.fingerprint
    );
    await expect(
      store.mutate("reserve", { ...item, payloadHash: "b".repeat(64) })
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(
      store.mutate("reserve", {
        ...item,
        scope: {
          kind: "tenant",
          userId: otherUser,
          condominiumId,
          membershipRevision: "synthetic-v1"
        }
      })
    ).rejects.toMatchObject({ code: "conflict" });
    const other = {
      ...item,
      scope: {
        kind: "tenant" as const,
        userId,
        condominiumId: otherCondominium,
        membershipRevision: "synthetic-v1"
      }
    };
    expect((await store.mutate("reserve", other)).receipt.request.scope).toEqual(other.scope);
  });

  it("AC-7204: cancelar libera custo/concorrência mas não devolve tentativa", async () => {
    const { store } = await fixture({
      scopeDailyCost: 100,
      scopeDailyOperations: 2,
      scopeConcurrent: 1
    });
    const first = request();
    await store.mutate("reserve", first);
    await store.mutate("cancel", first);
    const second = request();
    await store.mutate("reserve", second);
    await store.mutate("cancel", second);
    await expect(store.mutate("reserve", request())).rejects.toMatchObject({ code: "limit" });
  });

  it("AC-7204: conclusão conserva o máximo reservado e token só por hash", async () => {
    const { directory, store } = await fixture({ scopeDailyCost: 100 });
    const item = request();
    const token = "T".repeat(43);
    await store.mutate("reserve", item);
    expect((await store.mutate("start", item, { token })).claimed).toBe(true);
    expect((await store.mutate("start", item, { token: "X".repeat(43) })).claimed).toBe(false);
    await expect(store.mutate("cancel", item)).rejects.toMatchObject({ code: "conflict" });
    await expect(
      store.mutate("complete", item, {
        token: "X".repeat(43),
        outputHash: "b".repeat(64),
        actualCostMicrounits: 50
      })
    ).rejects.toMatchObject({ code: "denied" });
    const details = { token, outputHash: "b".repeat(64), actualCostMicrounits: 50 };
    expect((await store.mutate("complete", item, details)).receipt.state).toBe("completed");
    expect((await store.mutate("complete", item, details)).receipt.state).toBe("completed");
    await expect(
      store.mutate("complete", item, { ...details, actualCostMicrounits: 51 })
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(
      store.mutate("reserve", request({ maximumCostMicrounits: 1 }))
    ).rejects.toMatchObject({ code: "limit" });
    const raw = await readFile(join(directory, "operation-budgets.json"), "utf8");
    expect(raw).not.toContain(token);
    expect(raw).not.toContain("PAYLOAD FICTÍCIO PRIVADO");
    expect(raw).not.toContain("RESULTADO FICTÍCIO PRIVADO");
    expect(raw).toContain(budgetDigest(token));
  });

  it("AC-7204/7205: falha conserva unknown através de reinício/dia novo", async () => {
    const { store, recreate, advance } = await fixture({ scopeConcurrent: 1 });
    const item = request();
    const execute = vi.fn(async () => {
      throw new Error("FICTICIO-ERRO-NATIVO-PRIVADO");
    });
    await expect(runner(store).execute(item, execute)).rejects.toMatchObject({
      code: "unavailable"
    });
    advance("2026-11-10T00:00:00Z");
    await expect(runner(recreate()).execute(item, execute)).rejects.toMatchObject({
      code: "unknown"
    });
    await expect(recreate().mutate("reserve", request())).rejects.toMatchObject({ code: "limit" });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("AC-7205: reserva de outro dia não inicia; cancelar permite nova reserva diária", async () => {
    const { store, advance } = await fixture({ scopeDailyOperations: 1, scopeConcurrent: 1 });
    const item = request();
    await store.mutate("reserve", item);
    advance("2026-11-10T00:00:00Z");
    await expect(store.mutate("start", item, { token: "T".repeat(43) })).rejects.toMatchObject({
      code: "denied"
    });
    await store.mutate("cancel", item);
    expect((await store.mutate("reserve", request())).receipt.day).toBe("2026-11-10");
  });

  it("AC-7206: geração concluída e journal falho não geram novamente", async () => {
    const { store, recreate } = await fixture();
    const item = request();
    const execute = operation();
    const journal = vi.fn(async (result: string) => {
      expect(result).toBe("RESULTADO FICTÍCIO PRIVADO");
      throw new Error("FICTICIO-JOURNAL");
    });
    const runAndJournal = async () => {
      const result = await runner(store).execute(item, execute);
      await journal(result);
    };
    await expect(runAndJournal()).rejects.toThrow("FICTICIO-JOURNAL");
    expect(journal).toHaveBeenCalledWith("RESULTADO FICTÍCIO PRIVADO");
    await expect(runner(recreate()).execute(item, execute)).rejects.toMatchObject({
      code: "already_completed"
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "AC-7206: perda da confirmação de conclusão, commit observado=%s, não repete",
    async (committed) => {
      const { store, recreate } = await fixture();
      const item = request();
      const mutate = store.mutate.bind(store);
      vi.spyOn(store, "mutate").mockImplementation(async (action, input, details) => {
        if (action === "complete") {
          if (committed) await mutate(action, input, details);
          throw new Error("FICTICIO-RESPOSTA-DO-BANCO-PERDIDA");
        }
        return mutate(action, input, details);
      });
      const execute = operation();
      await expect(runner(store).execute(item, execute)).rejects.toMatchObject({
        code: "unavailable"
      });
      await expect(runner(recreate()).execute(item, execute)).rejects.toMatchObject({
        code: committed ? "already_completed" : "unknown"
      });
      expect(execute).toHaveBeenCalledTimes(1);
    }
  );

  it("AC-7206: revogação após geração contabiliza e não entrega resultado", async () => {
    const { store } = await fixture();
    const authorize = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const execute = operation();
    const item = request();
    await expect(runner(store, authorize).execute(item, execute)).rejects.toMatchObject({
      code: "denied"
    });
    expect((await store.mutate("reserve", item)).receipt.state).toBe("completed");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("AC-7207: setup é conta; documento sem condomínio e conteúdo extra são negados", async () => {
    const { store } = await fixture();
    const setup = request({ scope: { kind: "account", userId }, kind: "setup" });
    expect((await store.mutate("reserve", setup)).receipt.request.scope).toEqual(setup.scope);
    await expect(
      store.mutate("reserve", { ...setup, operationId: randomUUID(), kind: "pdf_ocr" })
    ).rejects.toMatchObject({ code: "denied" });
    await expect(
      store.mutate("reserve", { ...request(), payload: "FICTICIO-NAO-PERSISTIR" } as BudgetRequest)
    ).rejects.toMatchObject({ code: "denied" });
  });

  it("AC-7201: corrupção, política trocada e confirmação inválida falham sem apagar ledger", async () => {
    const { store, directory } = await fixture();
    expect(() =>
      createLocalOperationBudgetStore({ directory, confirmation: "invalid" as "synthetic-only" })
    ).toThrow();
    const item = request();
    await store.mutate("reserve", item);
    const changed = createLocalOperationBudgetStore({
      directory,
      confirmation: "synthetic-only",
      policy: { ...policy, globalDailyCost: 1 }
    });
    await expect(changed.mutate("reserve", request())).rejects.toMatchObject({
      code: "unavailable"
    });
    await writeFile(join(directory, "operation-budgets.json"), "FICTICIO-CORRUPTO");
    const execute = operation();
    await expect(runner(store).execute(item, execute)).rejects.toMatchObject({
      code: "unavailable"
    });
    expect(execute).not.toHaveBeenCalled();
    expect(await readFile(join(directory, "operation-budgets.json"), "utf8")).toBe(
      "FICTICIO-CORRUPTO"
    );
  });

  it("rejeita formatos, custos, revisões e estados incoerentes; canonicaliza ordem de propriedades", () => {
    const item = request();
    const ledger: BudgetLedger = { policy, receipts: [] };
    const receipt = mutateBudgetLedger(
      ledger,
      "reserve",
      item,
      {},
      new Date("2026-11-09T12:00:00Z")
    ).receipt;
    expect(budgetDigest({ b: 2, a: 1 })).toBe(budgetDigest({ a: 1, b: 2 }));
    for (const bad of [-1, NaN, 0.5, Number.MAX_SAFE_INTEGER])
      expect(() =>
        mutateBudgetLedger(
          ledger,
          "reserve",
          { ...item, maximumCostMicrounits: bad },
          {},
          new Date()
        )
      ).toThrow();
    for (const invalid of [
      { ...policy, currency: "EUR" },
      { ...policy, scopeConcurrent: 0 },
      { ...policy, revision: "bad" }
    ])
      expect(() => validateBudgetPolicy(invalid as BudgetPolicy)).toThrow();
    for (const invalid of [
      { policy, receipts: [{ ...receipt, tokenHash: "bad" }] },
      { policy, receipts: [{ ...receipt, tokenHash: null, state: "completed" }] },
      { policy: { ...policy, currency: "USD" }, receipts: [{ ...receipt, tokenHash: null }] },
      {
        policy,
        receipts: [
          { ...receipt, tokenHash: null },
          { ...receipt, tokenHash: null }
        ]
      }
    ])
      expect(() => validateBudgetLedger(invalid as BudgetLedger)).toThrow();
  });

  it("AC-7207: objeto não serializável e autorizador com erro não expõem conteúdo nativo", async () => {
    const { store } = await fixture();
    const execute = operation();
    const malformed = { ...request(), payload: () => "FICTICIO-CANARIO-PRIVADO" } as BudgetRequest;
    await expect(runner(store).execute(malformed, execute)).rejects.toMatchObject({
      code: "denied"
    });
    await expect(
      runner(store, async () => {
        throw new Error("FICTICIO-CANARIO-PRIVADO");
      }).execute(request(), execute)
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("Spec 072 — contrato PostgreSQL sem conexão externa", () => {
  it("AC-7208: transação, contexto, fingerprint e token em hash; sem leitura direta", async () => {
    const item = request();
    const value = mutateBudgetLedger(
      { policy, receipts: [] },
      "reserve",
      item,
      {},
      new Date("2026-11-09T12:00:00Z")
    );
    const query = vi.fn(async (sql: string) => ({
      rows: sql.includes("mutate_operation_budget") ? [{ result: value }] : []
    }));
    const release = vi.fn();
    const store = createPostgresOperationBudgetStore({
      connect: vi.fn(async () => ({ query, release }))
    } as never);
    expect(await store.mutate("reserve", item)).toEqual(value);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      "SET LOCAL statement_timeout = '5s'",
      "SELECT set_config('app.user_id',$1,true), set_config('app.condominium_id',$2,true)",
      "SELECT app.mutate_operation_budget($1,$2,$3,$4,$5) AS result",
      "COMMIT"
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it.each(["budget_limit", "budget_denied", "budget_conflict", "FICTICIO-ERRO-PRIVADO"])(
    "AC-7208: rollback e erro seguro em %s",
    async (message) => {
      const query = vi.fn(async (sql: string) => {
        if (sql.includes("mutate_operation_budget")) throw new Error(message);
        return { rows: [] };
      });
      const release = vi.fn();
      const store = createPostgresOperationBudgetStore({
        connect: vi.fn(async () => ({ query, release }))
      } as never);
      await expect(store.mutate("reserve", request())).rejects.toMatchObject({
        code: message.startsWith("budget_") ? message.slice(7) : "unavailable"
      });
      expect(query).toHaveBeenCalledWith("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    }
  );

  it("AC-7208: worker usa papel fechado e não envia token aberto ao SQL", async () => {
    const item = request({ scope: { kind: "account", userId }, kind: "setup" });
    const ledger: BudgetLedger = { policy, receipts: [] };
    mutateBudgetLedger(ledger, "reserve", item, {}, new Date("2026-11-09T12:00:00Z"));
    const token = "T".repeat(43);
    const value = mutateBudgetLedger(
      ledger,
      "start",
      item,
      { token },
      new Date("2026-11-09T12:00:00Z")
    );
    const query = vi.fn(async (sql: string, _values?: unknown[]) => {
      void _values;
      return { rows: sql.includes("mutate_operation_budget") ? [{ result: value }] : [] };
    });
    const release = vi.fn();
    const pool = { connect: vi.fn(async () => ({ query, release })) } as never;
    const store = createPostgresOperationBudgetStore(pool, "app_worker");
    expect((await store.mutate("start", item, { token })).claimed).toBe(true);
    expect(query).toHaveBeenCalledWith("SET LOCAL ROLE app_worker");
    const values = query.mock.calls.find(([sql]) => sql.includes("mutate_operation_budget"))![1]!;
    expect(values[2]).toBe(budgetDigest(token));
    expect(JSON.stringify(values)).not.toContain(token);
    await expect(store.mutate("start", item, { token: "bad" })).rejects.toMatchObject({
      code: "denied"
    });
    expect(() => createPostgresOperationBudgetStore(pool, "postgres" as "app_worker")).toThrow();
  });

  it("AC-7208: resultado ausente/malformado ou de outro escopo é falha fechada", async () => {
    const item = request();
    const value = mutateBudgetLedger(
      { policy, receipts: [] },
      "reserve",
      item,
      {},
      new Date("2026-11-09T12:00:00Z")
    );
    let rows: unknown[] = [];
    const query = vi.fn(async (sql: string) => ({
      rows: sql.includes("mutate_operation_budget") ? rows : []
    }));
    const release = vi.fn();
    const pool = { connect: vi.fn(async () => ({ query, release })) };
    const store = createPostgresOperationBudgetStore(pool as never);
    for (const invalid of [
      [],
      [{ result: { ...value, extra: "FICTICIO-NAO-DEVOLVER" } }],
      [{ result: { ...value, receipt: { ...value.receipt, fingerprint: "b".repeat(64) } } }],
      [{ result: { ...value, claimed: true } }],
      [{ result: { ...value, receipt: { ...value.receipt, tokenHash: "b".repeat(64) } } }],
      [
        {
          result: { ...value, receipt: { ...value.receipt, request: { ...item, kind: "invalid" } } }
        }
      ]
    ]) {
      rows = invalid;
      await expect(store.mutate("reserve", item)).rejects.toMatchObject({ code: "unavailable" });
    }
    pool.connect.mockRejectedValueOnce(new Error("FICTICIO-BANCO-PRIVADO"));
    await expect(store.mutate("reserve", item)).rejects.toMatchObject({ code: "unavailable" });
  });
});
