import { describe, expect, it, vi } from "vitest";
import { Client, type Pool } from "pg";
import type { ApiOperation } from "../../apps/api/app/operation-control.js";
import {
  assertPersistentRuntimeReady,
  createPersistentApiOperationControl,
  persistentExecutionConfiguration,
  type PersistentExecutionPolicy
} from "../../apps/api/security/persistent-execution.js";
import { persistentDatabaseConfiguration } from "../../apps/api/security/persistent-database.js";
import {
  budgetDigest,
  mutateBudgetLedger,
  type BudgetLedger,
  type OperationBudgetStore
} from "../../apps/api/security/operation-budget.js";

const userId = "11111111-1111-4111-8111-111111111111";
const condominiumId = "22222222-2222-4222-8222-222222222222";
const now = Date.parse("2026-11-25T12:00:00.000Z");
const policy: PersistentExecutionPolicy = {
  version: 1,
  approvalReference: "synthetic-only-078",
  dataPolicyRevision: "synthetic-v1",
  expiresAt: "2026-11-26T12:00:00.000Z",
  currency: "USD",
  allowedUserIds: [userId],
  provider: "openai",
  answerModel: "gpt-6.1-sol",
  maximumCostMicrounits: { setup: 10, question: 10, upload: 0 }
};
const environment = (value: unknown = policy): NodeJS.ProcessEnv => ({
  ALVITRA_PERSISTENT_EXECUTION_POLICY: JSON.stringify(value),
  OPENAI_API_KEY: "synthetic-not-a-key",
  OPENAI_ANSWER_ROUTING: "single"
});
const input: ApiOperation = {
  scope: { kind: "tenant", userId, condominiumId, membershipRevision: "synthetic-v1" },
  kind: "question",
  requestKey: "synthetic-078",
  payload: { question: "FICTÍCIO" },
  revalidate: async () => true
};
function database() {
  const state = { allowed: true, ready: true, fail: false };
  const client = {
    query: vi.fn(async (sql: string) => {
      if (state.fail && sql !== "ROLLBACK") throw new Error("PRIVATE_DATABASE_DETAILS");
      if (sql.includes("AS allowed")) return { rows: [{ allowed: state.allowed }] };
      if (sql.includes("AS ready")) return { rows: [{ ready: state.ready }] };
      return { rows: [] };
    }),
    release: vi.fn()
  };
  const pool = { connect: vi.fn(async () => client) } as unknown as Pick<Pool, "connect">;
  return { state, client, pool };
}
function fixture() {
  const db = database(),
    configuration = persistentExecutionConfiguration(environment())!;
  const ledger: BudgetLedger = {
    policy: {
      enabled: true,
      revision: configuration.revision,
      currency: "USD",
      scopeDailyCost: 100,
      globalDailyCost: 100,
      scopeDailyOperations: 10,
      globalDailyOperations: 10,
      scopeConcurrent: 2,
      globalConcurrent: 2
    },
    receipts: []
  };
  const store: OperationBudgetStore = {
    mutate: async (action, request, details) =>
      mutateBudgetLedger(ledger, action, request, details ?? {}, new Date(now))
  };
  let clock = now;
  const control = createPersistentApiOperationControl({
    pool: db.pool,
    configuration,
    store,
    now: () => clock
  });
  return {
    ...db,
    ledger,
    control,
    setClock: (value: number) => {
      clock = value;
    }
  };
}

describe("Spec 078 — runtime persistente autorizado", () => {
  it("AC-7802: conserva Gemini quando esse é o provedor aprovado, sem fallback", () => {
    const value = { ...policy, provider: "gemini", answerModel: "gemini-3.5-flash-lite" };
    const env = { ...environment(value), OPENAI_API_KEY: "", GEMINI_API_KEY: "synthetic" };
    expect(persistentExecutionConfiguration(env)?.policy.provider).toBe("gemini");
    expect(() =>
      persistentExecutionConfiguration({ ...env, OPENAI_API_KEY: "synthetic" })
    ).toThrow();
    expect(() => persistentExecutionConfiguration({ ...env, GEMINI_ENABLED: "false" })).toThrow();
    expect(() =>
      persistentExecutionConfiguration({ ...env, GEMINI_MODEL: "other-model" })
    ).toThrow();
    expect(() =>
      persistentExecutionConfiguration(environment({ ...policy, provider: "unknown" }))
    ).toThrow();
  });
  it("AC-7801: ausência de manifesto mantém execução negada", async () => {
    const db = database(),
      operation = vi.fn();
    expect(persistentExecutionConfiguration({})).toBeUndefined();
    await expect(
      createPersistentApiOperationControl({ pool: db.pool }).execute(input, operation)
    ).rejects.toMatchObject({ code: "denied" });
    expect(operation).not.toHaveBeenCalled();
    expect(db.pool.connect).not.toHaveBeenCalled();
  });
  it("AC-7802: revisão é canônica, snapshot imutável e sem custos do HTTP", () => {
    const value = persistentExecutionConfiguration(environment())!;
    expect(value.revision).toBe(budgetDigest(policy));
    expect(Object.isFrozen(value.policy.maximumCostMicrounits)).toBe(true);
    expect(Object.isFrozen(value.policy.allowedUserIds)).toBe(true);
    expect(
      persistentExecutionConfiguration(
        environment({ ...policy, maximumCostMicrounits: { upload: 0, question: 10, setup: 10 } })
      )?.revision
    ).toBe(value.revision);
  });
  it.each([
    ["campo extra", { ...policy, bypass: true }],
    ["versão", { ...policy, version: 2 }],
    ["aprovação", { ...policy, approvalReference: "" }],
    ["dados", { ...policy, dataPolicyRevision: "PRIVATE DATA" }],
    ["expiração", { ...policy, expiresAt: "2026-11-25" }],
    ["moeda", { ...policy, currency: "EUR" }],
    ["sem contas", { ...policy, allowedUserIds: [] }],
    ["conta inválida", { ...policy, allowedUserIds: ["private-user"] }],
    ["contas duplicadas", { ...policy, allowedUserIds: [userId, userId] }],
    ["modelo", { ...policy, answerModel: "not-configured" }],
    [
      "custo negativo",
      { ...policy, maximumCostMicrounits: { setup: 10, question: -1, upload: 0 } }
    ],
    [
      "custo zero de IA",
      { ...policy, maximumCostMicrounits: { setup: 0, question: 10, upload: 0 } }
    ],
    [
      "custo fracionário",
      { ...policy, maximumCostMicrounits: { setup: 1.2, question: 10, upload: 0 } }
    ],
    [
      "custo desconhecido",
      { ...policy, maximumCostMicrounits: { setup: 10, question: 10, upload: 0, extra: 0 } }
    ],
    ["objeto nulo", null],
    ["array", []]
  ])("AC-7801: recusa %s sem reproduzir a entrada", (_label, value) => {
    expect(() => persistentExecutionConfiguration(environment(value))).toThrow(
      "Configuração de execução persistente inválida."
    );
  });
  it.each([
    { ALVITRA_PERSISTENT_EXECUTION_POLICY: "{" },
    { ALVITRA_PERSISTENT_EXECUTION_POLICY: "x".repeat(32_769) },
    { DEMO_MODE: "true" },
    { OPENAI_API_KEY: "" },
    { OPENAI_ANSWER_ENABLED: "false" },
    { CODEX_ANSWER_ENABLED: "true" },
    { GEMINI_API_KEY: "synthetic" },
    { OPENAI_ANSWER_ROUTING: "hybrid" },
    { OPENAI_ANSWER_ROUTING: "" }
  ])("AC-7801/7802: configuração de ambiente incompatível é recusada", (override) => {
    expect(() => persistentExecutionConfiguration({ ...environment(), ...override })).toThrow(
      "Configuração de execução persistente inválida."
    );
  });
  it("AC-7803/7805: reserva antes do efeito, conclui depois e impede duplicação", async () => {
    const { control, ledger, client } = fixture();
    const operation = vi.fn(async () => {
      expect(ledger.receipts[0]?.state).toBe("started");
      return "FALA-PRIVADA-FICTICIA";
    });
    expect(await control.execute(input, operation)).toBe("FALA-PRIVADA-FICTICIA");
    expect(ledger.receipts[0]?.state).toBe("completed");
    expect(JSON.stringify(ledger)).not.toContain("FALA-PRIVADA-FICTICIA");
    await expect(control.execute(input, operation)).rejects.toMatchObject({
      code: "already_completed"
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(client.query.mock.calls.some(([sql]) => sql === "BEGIN READ ONLY")).toBe(true);
  });
  it.each(["conta", "expiração", "contexto", "política", "banco"])(
    "AC-7804: %s nega efeito e replay",
    async (kind) => {
      const f = fixture(),
        operation = vi.fn(async () => "synthetic");
      const candidate = {
        ...input,
        ...(kind === "conta" ? { scope: { ...input.scope, userId: condominiumId } } : {}),
        ...(kind === "contexto" ? { revalidate: async () => false } : {})
      };
      if (kind === "expiração") f.setClock(Date.parse(policy.expiresAt));
      if (kind === "política") f.state.allowed = false;
      if (kind === "banco") f.state.fail = true;
      await expect(f.control.execute(candidate, operation)).rejects.toMatchObject({
        code: "denied"
      });
      expect(
        await f.control.authorizeReplay!(f.control.replayProof!(candidate), candidate.revalidate)
      ).toBe(false);
      expect(operation).not.toHaveBeenCalled();
      expect(f.ledger.receipts).toEqual([]);
    }
  );
  it("AC-7804: revogação entre reserva e claim conserva reserva sem efeito", async () => {
    const f = fixture(),
      operation = vi.fn(),
      query = f.client.query;
    let checks = 0;
    query.mockImplementation(async (sql: string) => ({
      rows: sql.includes("AS allowed") ? [{ allowed: ++checks === 1 }] : []
    }));
    await expect(f.control.execute(input, operation)).rejects.toMatchObject({ code: "denied" });
    expect(operation).not.toHaveBeenCalled();
    expect(f.ledger.receipts[0]?.state).toBe("reserved");
  });
  it("AC-7805: efeito incerto conserva compromisso sem novo envio", async () => {
    const f = fixture(),
      operation = vi.fn(async () => {
        throw new Error("PRIVATE");
      });
    await expect(f.control.execute(input, operation)).rejects.toMatchObject({
      code: "unavailable"
    });
    await expect(f.control.execute(input, operation)).rejects.toMatchObject({ code: "unknown" });
    expect(operation).toHaveBeenCalledOnce();
    expect(f.ledger.receipts[0]?.state).toBe("unknown");
  });
  it("AC-7807: preflight apenas lê e libera conexão", async () => {
    const db = database();
    await assertPersistentRuntimeReady(db.pool);
    expect(db.client.query.mock.calls[0]?.[0]).toBe("BEGIN READ ONLY");
    expect(db.client.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(db.client.release).toHaveBeenCalledOnce();
  });
  it.each(["schema", "consulta", "conexão"])("AC-7807: falha de %s é segura", async (kind) => {
    const db = database();
    if (kind === "schema") db.state.ready = false;
    if (kind === "consulta") db.state.fail = true;
    if (kind === "conexão") vi.mocked(db.pool.connect).mockRejectedValue(new Error("PRIVATE"));
    await expect(assertPersistentRuntimeReady(db.pool)).rejects.toThrow(
      "O banco não atende aos contratos do runtime persistente."
    );
    if (kind !== "conexão") expect(db.client.release).toHaveBeenCalledOnce();
  });
});

describe("AC-7806 — conexões persistentes", () => {
  it("mantém loopback sintético sem TLS", () => {
    const url = "postgresql://synthetic:synthetic@127.0.0.1/synthetic";
    expect(persistentDatabaseConfiguration(url)).toEqual({ connectionString: url });
  });
  it.each(["require", "verify-full"])("verifica certificados mesmo com sslmode=%s", (mode) => {
    const value = persistentDatabaseConfiguration(
      `postgresql://synthetic@synthetic.invalid/db?sslmode=${mode}`
    );
    expect(value.ssl).toEqual({ rejectUnauthorized: true });
    expect(value.connectionString).not.toContain("sslmode");
    const client = new Client(value);
    expect(client.host).toBe("synthetic.invalid");
    expect(client.ssl).toEqual({ rejectUnauthorized: true });
  });
  it("CA explícita não enfraquece verificação", () => {
    const ca = "-----BEGIN CERTIFICATE-----\nSYNTHETIC\n-----END CERTIFICATE-----";
    expect(
      persistentDatabaseConfiguration(
        "postgresql://synthetic@synthetic.invalid/db?sslmode=require",
        ca
      ).ssl
    ).toEqual({ rejectUnauthorized: true, ca });
  });
  it.each([
    "not a URL",
    "https://synthetic.invalid/db",
    "postgresql://synthetic.invalid/",
    "postgresql://synthetic.invalid/db",
    "postgresql://synthetic.invalid/db?sslmode=no-verify",
    "postgresql://synthetic.invalid/db?sslmode=require&sslrootcert=private-file",
    "postgresql://synthetic.invalid/db?sslmode=require&uselibpqcompat=true",
    "postgresql://localhost/db?host=synthetic.invalid&sslmode=disable",
    "postgresql://localhost/db?%68ost=synthetic.invalid&sslmode=disable",
    "postgresql://localhost/db?hostaddr=synthetic.invalid&sslmode=disable",
    "postgresql://localhost/db?sslmode=disable&sslmode=require",
    "postgresql://synthetic.invalid/db?sslmode=require&ssl=false"
  ])("recusa conexão insegura sem reproduzir URI", (value) => {
    expect(() => persistentDatabaseConfiguration(value)).toThrow(
      "A conexão persistente exige PostgreSQL e TLS remoto verificado."
    );
  });
  it("recusa CA inválida", () => {
    expect(() =>
      persistentDatabaseConfiguration(
        "postgresql://synthetic.invalid/db?sslmode=require",
        "PRIVATE"
      )
    ).toThrow("A conexão persistente exige PostgreSQL e TLS remoto verificado.");
  });
});
