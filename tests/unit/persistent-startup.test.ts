import Fastify from "fastify";
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateApiOptions } from "../../apps/api/app/create-api.js";
import { hashAccessSecret } from "../../apps/api/identity/access-code.js";

type CredentialRow = { user_id: string; revision: string; code_hash: string };

const captured = vi.hoisted(() => ({
  options: [] as CreateApiOptions[],
  pools: [] as { options: Record<string, unknown>; end: ReturnType<typeof vi.fn> }[],
  ready: true,
  listenCount: 0,
  statements: [] as string[],
  credential: undefined as CredentialRow | undefined,
  sessions: new Map<string, CredentialRow>()
}));
vi.mock("pg", () => ({
  Pool: class {
    end = vi.fn(async () => {});
    constructor(options: Record<string, unknown>) {
      captured.pools.push({ options, end: this.end });
    }
    async connect() {
      let role: "app_runtime" | "app_worker" | undefined;
      return {
        async query(sql: string, values?: unknown[]) {
          captured.statements.push(sql);
          if (sql.startsWith("BEGIN")) role = undefined;
          if (sql === "SET LOCAL ROLE app_runtime") role = "app_runtime";
          if (sql === "SET LOCAL ROLE app_worker") role = "app_worker";
          if (
            (sql.includes("AS ready") && role !== "app_runtime") ||
            (sql.includes("app.") && role === undefined)
          )
            throw new Error("permission denied for schema app");
          if (sql === "COMMIT" || sql === "ROLLBACK") role = undefined;
          if (sql.startsWith("SELECT * FROM app.consume_access_login_attempt("))
            return { rows: [{ allowed: true, retry_after_seconds: 0 }] };
          if (sql.includes("find_access_code"))
            return {
              rows: captured.credential?.code_hash === values?.[0] ? [captured.credential] : []
            };
          if (sql.includes("create_device_session") && captured.credential)
            captured.sessions.set(String(values?.[2]), captured.credential);
          if (sql.includes("resolve_device_session")) {
            const credential = captured.sessions.get(String(values?.[0]));
            return { rows: credential ? [credential] : [] };
          }
          if (sql.includes("revoke_device_session")) captured.sessions.delete(String(values?.[0]));
          return {
            rows: sql.includes("AS ready") ? [{ ready: captured.ready }] : []
          };
        },
        release() {}
      };
    }
  }
}));
vi.mock("../../apps/api/app/create-api.js", () => ({
  createApi: (options: CreateApiOptions) => {
    captured.options.push(options);
    const app = Fastify();
    vi.spyOn(app, "listen").mockImplementation(async () => {
      captured.listenCount += 1;
      await app.ready();
      return "synthetic-no-listener";
    });
    return app;
  }
}));
import { startServer } from "../../apps/api/app/server.js";

const userId = "11111111-1111-4111-8111-111111111111";
const policy = {
  version: 1,
  approvalReference: "synthetic-only-078",
  dataPolicyRevision: "synthetic-v1",
  expiresAt: "2099-11-26T12:00:00.000Z",
  currency: "USD",
  allowedUserIds: [userId],
  provider: "openai",
  answerModel: "gpt-6.1-sol",
  maximumCostMicrounits: { setup: 10, question: 10, upload: 0 }
};
const environment = {
  DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/synthetic?sslmode=require",
  OPENAI_API_KEY: "synthetic-test-key",
  OPENAI_ANSWER_ROUTING: "single",
  AUTH_ACCOUNT_SECRET_KEY: "11".repeat(32),
  ACCESS_CODE_SECRET: "22".repeat(32),
  ALVITRA_PERSISTENT_EXECUTION_POLICY: JSON.stringify(policy)
};
beforeEach(() => {
  captured.options = [];
  captured.pools = [];
  captured.ready = true;
  captured.listenCount = 0;
  captured.statements = [];
  captured.credential = undefined;
  captured.sessions = new Map();
});
describe("AC-7807/7808 — composição real do startup persistente", () => {
  it("AC-7810: compõe entrada, sessões independentes e os três stores com papel runtime local", async () => {
    const revision = "22222222-2222-4222-8222-222222222222";
    const code = createHmac("sha256", Buffer.from(environment.ACCESS_CODE_SECRET, "hex"))
      .update(JSON.stringify(["alvitra-access-v1", userId, revision]))
      .digest("hex")
      .slice(0, 32)
      .toUpperCase();
    captured.credential = { user_id: userId, revision, code_hash: hashAccessSecret(code) };
    const app = await startServer(0, environment);
    try {
      const options = captured.options.at(-1)!;
      const access = options.accessCodeAuth!;
      expect(await access.consumeLoginAttempt("synthetic-origin", new Date())).toEqual({
        allowed: true,
        retryAfterSeconds: 0
      });
      const first = (await access.login(code))!;
      const second = (await access.login(code))!;
      expect(first.userId).toBe(userId);
      expect(first.token).not.toBe(second.token);
      expect((await access.authenticate(first.token))?.userId).toBe(userId);
      await access.logout(first.token);
      expect(await access.authenticate(first.token)).toBeUndefined();
      expect((await access.authenticate(second.token))?.userId).toBe(userId);
      await options.accountAuth!.logout("synthetic-session-token");
      await options.accountSecurity!.requestPasswordReset("synthetic@example.invalid");
      expect(captured.statements.some((sql) => sql.includes("revoke_auth_session"))).toBe(true);
      expect(
        captured.statements.some((sql) => sql.includes("find_account_security_by_email"))
      ).toBe(true);
    } finally {
      await app.close();
    }
  });
  it.each(["5432", "6543"])(
    "aceita pooler Supabase %s e verifica TLS/CA também na sessão",
    async (port) => {
      const ca = "-----BEGIN CERTIFICATE-----\nSYNTHETIC\n-----END CERTIFICATE-----";
      const app = await startServer(0, {
        ...environment,
        DATABASE_URL: `postgresql://synthetic:synthetic@aws-0-region.pooler.supabase.com:${port}/synthetic?sslmode=verify-full`,
        DATABASE_SSL_CA: ca
      });
      try {
        expect(captured.pools).toHaveLength(2);
        expect(new URL(String(captured.pools[0]!.options.connectionString)).port).toBe(port);
        expect(new URL(String(captured.pools[1]!.options.connectionString)).port).toBe("5432");
        for (const pool of captured.pools)
          expect(pool.options.ssl).toEqual({ rejectUnauthorized: true, ca });
        expect(captured.listenCount).toBe(1);
      } finally {
        await app.close();
      }
    }
  );
  it("preserva o provedor Gemini autorizado na composição hospedada", async () => {
    const app = await startServer(0, {
      ...environment,
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "synthetic-test-key",
      ALVITRA_PERSISTENT_EXECUTION_POLICY: JSON.stringify({
        ...policy,
        provider: "gemini",
        answerModel: "gemini-3.5-flash-lite"
      })
    });
    try {
      expect(captured.options.at(-1)?.aiProvider).toBe("gemini");
    } finally {
      await app.close();
    }
  });
  it("liga stores persistidos após preflight e mantém guardas documentais", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const app = await startServer(0, environment);
    try {
      const options = captured.options.at(-1)!;
      expect(options.conversationStore).toBeDefined();
      expect(options.chatRepository).toBeDefined();
      expect(options.documentStorage).toBeDefined();
      expect(options.operationControl?.replayProof).toBeTypeOf("function");
      expect(options.developmentMembershipRegistry).toBeUndefined();
      expect(options.accessCodeAuth).toBeDefined();
      expect(options.imageUploadsEnabled).toBe(false);
      expect(options.hostedDocumentBatchGateway).toBeUndefined();
      expect(captured.listenCount).toBe(1);
      expect(captured.pools).toHaveLength(2);
      for (const pool of captured.pools) {
        expect(pool.options.ssl).toEqual({ rejectUnauthorized: true });
        expect(pool.options.connectionString).not.toContain("sslmode");
      }
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
      vi.unstubAllGlobals();
    }
    for (const pool of captured.pools) expect(pool.end).toHaveBeenCalledOnce();
  });
  it("schema/roles incompatíveis fecham ambos os pools sem abrir listener", async () => {
    captured.ready = false;
    await expect(startServer(0, environment)).rejects.toThrow(
      "O banco não atende aos contratos do runtime persistente."
    );
    expect(captured.options).toEqual([]);
    expect(captured.listenCount).toBe(0);
    expect(captured.pools).toHaveLength(2);
    for (const pool of captured.pools) expect(pool.end).toHaveBeenCalledOnce();
  });
  it("não permite perfil autorizado sem autenticação por código", async () => {
    await expect(startServer(0, { ...environment, ACCESS_CODE_SECRET: "" })).rejects.toThrow(
      "O runtime persistente autorizado exige autenticação por código."
    );
    expect(captured.pools).toEqual([]);
    expect(captured.options).toEqual([]);
  });
  it("não abre pool com TLS inseguro", async () => {
    await expect(
      startServer(0, {
        ...environment,
        DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/db?sslmode=no-verify"
      })
    ).rejects.toThrow("A conexão persistente exige PostgreSQL e TLS remoto verificado.");
    expect(captured.pools).toEqual([]);
  });
  it("não abre pool com chave de conta inválida", async () => {
    await expect(
      startServer(0, { ...environment, AUTH_ACCOUNT_SECRET_KEY: "invalid" })
    ).rejects.toThrow("O runtime persistente autorizado exige chave de conta válida.");
    expect(captured.pools).toEqual([]);
  });
  it("manifesto em demo é erro antes de criar credenciais ou pools", async () => {
    await expect(startServer(0, { ...environment, DEMO_MODE: "true" })).rejects.toThrow(
      "Configuração de execução persistente inválida."
    );
    expect(captured.pools).toEqual([]);
    expect(captured.options).toEqual([]);
  });
});
