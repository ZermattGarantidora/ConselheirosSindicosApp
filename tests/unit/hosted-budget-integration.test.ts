import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBudgetedHostedDocumentControls } from "../../apps/api/security/hosted-operation-budget.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import {
  budgetDigest,
  type BudgetPolicy,
  type OperationBudgetStore
} from "../../apps/api/security/operation-budget.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "alvitra-hosted-budget-"));
});
afterEach(async () => {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-hosted-budget-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
});
const userId = "11111111-1111-4111-8111-111111111111";
const condominiumId = "22222222-2222-4222-8222-222222222222";
const scope = {
  kind: "tenant" as const,
  userId,
  condominiumId,
  membershipRevision: "synthetic-membership-v1"
};
const revision = "synthetic-policy-v1";
const policy: BudgetPolicy = {
  enabled: true,
  revision: budgetDigest(revision),
  currency: "USD",
  scopeDailyCost: 20,
  globalDailyCost: 30,
  scopeDailyOperations: 2,
  globalDailyOperations: 3,
  scopeConcurrent: 1,
  globalConcurrent: 2
};
const request: HostedDocumentTransferRequest = {
  purpose: "pdf_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic-only",
  condominiumId,
  documentVersions: [
    { id: "synthetic-version", contentKind: "original", contentSha256: "a".repeat(64) }
  ],
  payloadSha256: "b".repeat(64),
  inputBytes: 1,
  pageCount: 1,
  maximumOutputTokens: 1
};
const tariff = {
  currency: "USD" as const,
  tariffVersion: "synthetic-v1",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 100,
  globalDailyLimitMicrounits: 100
};
const allow = async (input: HostedDocumentTransferRequest) => ({
  allowed: true as const,
  requestHash: hostedDocumentRequestHash(input),
  policyRevision: revision
});
const store = (configuration = policy) =>
  createLocalOperationBudgetStore({
    directory: join(directory, "budget"),
    confirmation: "synthetic-only",
    policy: configuration
  });
function build(options: Partial<Parameters<typeof createBudgetedHostedDocumentControls>[0]> = {}) {
  return createHostedDocumentExecutor(
    createBudgetedHostedDocumentControls({
      store: store(),
      ledger: createSyntheticFileHostedCallLedger({
        directory: join(directory, "calls"),
        confirmation: "synthetic-only"
      }),
      budget: () => tariff,
      resolveScope: async () => scope,
      authorize: allow,
      ...options
    })
  );
}
async function records() {
  return JSON.parse(
    await readFile(join(directory, "budget", "operation-budgets.json"), "utf8")
  ) as {
    receipts: Array<{
      state: string;
      request: { maximumCostMicrounits: number };
      actualCostMicrounits: number;
    }>;
  };
}

describe("AC-7118/7210 — consumo, resultado e retomada compostos", () => {
  it("duas instâncias conservam um envio, recibo e compromisso; replay precede nova reserva", async () => {
    const gate = Promise.withResolvers<void>();
    const operation = vi.fn(async () => {
      await gate.promise;
      return { text: "FICTÍCIO: resultado integral." };
    });
    const first = build().execute(request, operation);
    await vi.waitFor(() => expect(operation).toHaveBeenCalledOnce());
    await expect(build().execute(request, operation)).rejects.toMatchObject({
      code: "call_in_progress"
    });
    gate.resolve();
    const value = await first;
    expect(await build().execute(request, operation)).toEqual(value);
    expect(operation).toHaveBeenCalledOnce();
    const saved = await records();
    expect(saved.receipts).toHaveLength(1);
    expect(saved.receipts[0]).toMatchObject({
      state: "completed",
      actualCostMicrounits: 10,
      request: { maximumCostMicrounits: 10 }
    });
    expect(JSON.stringify(saved)).not.toContain(value.text);
  });

  it.each(["cost", "quantity", "currency", "disabled"])("nega %s antes do envio", async (kind) => {
    const configuration = {
      ...policy,
      ...(kind === "cost"
        ? { scopeDailyCost: 9 }
        : kind === "quantity"
          ? { scopeDailyOperations: 1 }
          : kind === "currency"
            ? { currency: "BRL" as const }
            : { enabled: false })
    };
    const operation = vi.fn(async () => "sintetico");
    const executor = build({ store: store(configuration) });
    if (kind === "quantity") await executor.execute(request, operation);
    await expect(
      executor.execute({ ...request, payloadSha256: "c".repeat(64) }, operation)
    ).rejects.toHaveProperty("code");
    expect(operation).toHaveBeenCalledTimes(kind === "quantity" ? 1 : 0);
  });

  it.each(["tenant", "user", "membership", "resolver"])(
    "escopo %s divergente não envia nem lê replay",
    async (kind) => {
      const operation = vi.fn(async () => "sintetico");
      const contextual = { ...request, userId, membershipRevision: scope.membershipRevision };
      await build().execute(contextual, operation);
      const changed = {
        ...scope,
        ...(kind === "tenant"
          ? { condominiumId: "33333333-3333-4333-8333-333333333333" }
          : kind === "user"
            ? { userId: "44444444-4444-4444-8444-444444444444" }
            : { membershipRevision: "revoked" })
      };
      await expect(
        build({
          resolveScope: async () => {
            if (kind === "resolver") throw new Error("FICTICIO-PRIVADO");
            return changed;
          }
        }).execute(contextual, operation)
      ).rejects.toMatchObject({ code: "transfer_denied" });
      expect(operation).toHaveBeenCalledOnce();
    }
  );

  it.each([false, true])(
    "falha de conclusão operacional (commit=%s) não regenera resultado confirmado",
    async (committed) => {
      const persistent = store();
      const broken: OperationBudgetStore = {
        mutate: async (action, ...args) => {
          if (action === "complete") {
            if (committed) await persistent.mutate(action, ...args);
            throw new Error("FICTICIO-ACK-PERDIDO");
          }
          return persistent.mutate(action, ...args);
        }
      };
      const operation = vi.fn(async () => ({ text: "FICTÍCIO: salvo no ledger." }));
      await expect(build({ store: broken }).execute(request, operation)).rejects.toHaveProperty(
        "code"
      );
      expect(await build().execute(request, operation)).toEqual({
        text: "FICTÍCIO: salvo no ledger."
      });
      expect(operation).toHaveBeenCalledOnce();
      expect((await records()).receipts[0]?.state).toBe(committed ? "completed" : "unknown");
    }
  );

  it("falha do transporte conserva os dois recibos e impede novo envio após recriação", async () => {
    const operation = vi.fn(async () => {
      throw new Error("FICTICIO-ERRO-PRIVADO");
    });
    await expect(build().execute(request, operation)).rejects.toMatchObject({
      code: "ledger_unavailable"
    });
    await expect(build().execute(request, operation)).rejects.toMatchObject({
      code: "call_uncertain"
    });
    expect(operation).toHaveBeenCalledOnce();
    expect((await records()).receipts[0]?.state).toBe("unknown");
  });

  it("erro no journal após geração recupera o texto, sem nova chamada/reserva", async () => {
    const operation = vi.fn(async () => "FICTÍCIO: fala original da Alvitra.");
    const append = vi
      .fn()
      .mockRejectedValueOnce(new Error("FICTICIO-JOURNAL"))
      .mockResolvedValue(undefined);
    const turn = async () => {
      const value = await build().execute(request, operation);
      await append(value);
      return value;
    };
    await expect(turn()).rejects.toThrow("FICTICIO-JOURNAL");
    expect(await turn()).toBe("FICTÍCIO: fala original da Alvitra.");
    expect(append.mock.calls[0]).toEqual(append.mock.calls[1]);
    expect(operation).toHaveBeenCalledOnce();
    expect((await records()).receipts).toHaveLength(1);
  });

  it("autorização ausente ou divergente não liga o controle", async () => {
    const operation = vi.fn();
    const denied = createBudgetedHostedDocumentControls({
      store: store(),
      ledger: createSyntheticFileHostedCallLedger({
        directory: join(directory, "calls"),
        confirmation: "synthetic-only"
      }),
      budget: () => tariff,
      resolveScope: async () => scope
    });
    await expect(
      createHostedDocumentExecutor(denied).execute(request, operation)
    ).rejects.toMatchObject({ code: "transfer_denied" });
    await expect(
      build({
        authorize: async () => ({ ...(await allow(request)), requestHash: "0".repeat(64) })
      }).execute(request, operation)
    ).rejects.toMatchObject({ code: "transfer_denied" });
    expect(operation).not.toHaveBeenCalled();
  });

  it("embedding usa finalidade operacional própria", async () => {
    const operation = vi.fn(async () => [0.5, 0.5]);
    await build().execute({ ...request, purpose: "document_embedding" }, operation);
    const raw = await readFile(join(directory, "budget", "operation-budgets.json"), "utf8");
    expect(raw).toContain('"kind":"embedding"');
  });
});
