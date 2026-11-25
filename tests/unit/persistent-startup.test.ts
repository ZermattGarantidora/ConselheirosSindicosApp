import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateApiOptions } from "../../apps/api/app/create-api.js";

const captured = vi.hoisted(() => ({
  options: [] as CreateApiOptions[],
  pools: [] as { options: Record<string, unknown>; end: ReturnType<typeof vi.fn> }[],
  ready: true,
  listenCount: 0
}));
vi.mock("pg", () => ({
  Pool: class {
    end = vi.fn(async () => {});
    constructor(options: Record<string, unknown>) {
      captured.pools.push({ options, end: this.end });
    }
    async connect() {
      return {
        async query(sql: string) {
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
});
describe("AC-7807/7808 — composição real do startup persistente", () => {
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
