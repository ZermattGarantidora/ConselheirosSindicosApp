import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { CreateApiOptions } from "../../apps/api/app/create-api.js";

const captured = vi.hoisted(() => ({ options: [] as CreateApiOptions[], failConnect: false }));
vi.mock("pg", () => ({
  Pool: class {
    async connect() {
      if (captured.failConnect) {
        const error = new Error("DETALHE_PRIVADO");
        error.name = "NOME_PRIVADO";
        throw error;
      }
      return {
        async query() {
          return { rows: [], rowCount: 0 };
        },
        release() {}
      };
    }
    async end() {}
  }
}));
vi.mock("../../apps/api/app/create-api.js", () => ({
  createApi: (options: CreateApiOptions) => {
    captured.options.push(options);
    return Fastify();
  }
}));

import { startServer } from "../../apps/api/app/server.js";
import { startPersistentWorker } from "../../apps/api/worker/worker.js";

const environment = {
  DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/synthetic",
  OPENAI_API_KEY: "synthetic-key-only-in-mocked-test",
  OPENAI_OCR_API_KEY: "synthetic-key-only-in-mocked-test",
  OPENAI_OCR_ENABLED: "true",
  OPENAI_OCR_DATA_POLICY: "synthetic-only",
  OPENAI_IMAGE_ANALYSIS_ENABLED: "true",
  OPENAI_IMAGE_BILLING_CONFIRMED: "true",
  AUTH_ACCOUNT_SECRET_KEY: "11".repeat(32),
  DOCUMENT_WORKER_IN_API: "true"
};

describe("Spec 071 — integração de startup sem autorização real", () => {
  it("AC-7108: falha de processamento/retenção não registra mensagem ou nome nativo", async () => {
    captured.failConnect = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = await startServer(0, environment);
    try {
      expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVADO");
      expect(log).toHaveBeenCalledWith("Falha no processamento documental em segundo plano", {
        code: "document_processing_failed"
      });
      expect(log).toHaveBeenCalledWith("Falha na retenção documental em segundo plano", {
        code: "document_retention_failed"
      });
    } finally {
      captured.failConnect = false;
      await app.close();
      log.mockRestore();
    }
  });

  it("AC-7101: servidor real mantém fotos e síntese hospedada desativadas com flags legadas", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    const app = await startServer(0, environment);
    try {
      const options = captured.options.at(-1)!;
      expect(options.imageUploadsEnabled).toBe(false);
      expect(options.hostedDocumentBatchGateway).toBeUndefined();
      await expect(
        options.operationControl!.execute(
          {
            scope: { kind: "account", userId: "11111111-1111-4111-8111-111111111111" },
            kind: "setup",
            requestKey: "synthetic-only",
            payload: { stage: "welcome" },
            revalidate: async () => true
          },
          async () => "não deve executar"
        )
      ).rejects.toMatchObject({ code: "denied" });
      expect(options.codexDocumentBatchGateway).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
      vi.unstubAllGlobals();
    }
  });

  it("AC-7101: worker persistido ignora opt-in sintético para transferências de uploads", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    try {
      expect(await startPersistentWorker(environment.DATABASE_URL, environment)).toBe("idle");
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
