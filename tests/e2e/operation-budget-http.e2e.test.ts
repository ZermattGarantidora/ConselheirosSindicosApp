import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApi, type CreateApiOptions } from "../../apps/api/app/create-api.js";
import { createApiOperationControl } from "../../apps/api/app/operation-control.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import { budgetDigest, type BudgetPolicy } from "../../apps/api/security/operation-budget.js";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "alvitra-api-budget-"));
});
afterEach(async () => {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-api-budget-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
});
const userId = "11111111-1111-4111-8111-111111111111";
const condominiumId = createCondominiumId("22222222-2222-4222-8222-222222222222");
const policy: BudgetPolicy = {
  enabled: true,
  revision: budgetDigest("synthetic-policy"),
  currency: "USD",
  scopeDailyCost: 20,
  globalDailyCost: 30,
  scopeDailyOperations: 4,
  globalDailyOperations: 5,
  scopeConcurrent: 1,
  globalConcurrent: 2
};
async function fixture(override: Partial<BudgetPolicy> = {}) {
  const auth = await createLocalAccessCodeService(join(directory, "access"));
  const login = await auth.login(await auth.provision(userId));
  if (!login) throw new Error("Sessão fictícia não criada.");
  const headers = {
    cookie: `alvitra_device=${login.token}`,
    "x-conversation-request-id": "synthetic-attempt"
  };
  let active = true;
  const local = createLocalSyntheticAnswerGateway();
  const generate = vi.fn(async (input: Parameters<typeof local.generate>[0]) => {
    const result = await local.generate(input);
    return {
      ...result,
      output: { ...result.output, answer: "Olá! Como prefere que eu chame você?" }
    };
  });
  const journal = createInMemoryConversationStore();
  const store = () =>
    createLocalOperationBudgetStore({
      directory: join(directory, "budget"),
      confirmation: "synthetic-only",
      policy: { ...policy, ...override }
    });
  const original = vi.fn(async () => ({ storageKey: "synthetic-private-key" }));
  const repository = createDevelopmentDocumentUploadRepository();
  const options: CreateApiOptions = {
    accessCodeAuth: auth,
    membershipRepository: {
      findMembership: async (input) =>
        active && input.userId === userId && input.condominiumId === condominiumId
          ? {
              ...input,
              roleKey: "manager",
              status: "active",
              validFrom: new Date("2026-01-01"),
              revision: "synthetic-membership"
            }
          : undefined
    },
    conversationStore: journal,
    setupMessageGateway: { generate },
    documentStorage: { storeOriginal: original, removeOriginal: async () => {} },
    documentUploadRepository: repository,
    documentCatalogRepository: repository,
    operationControl: createApiOperationControl({
      store: store(),
      policyRevision: policy.revision,
      maximumCostMicrounits: { setup: 10, question: 10, upload: 0 },
      authorize: async () => true
    })
  };
  return {
    headers,
    auth,
    login,
    generate,
    journal,
    original,
    options,
    revoke: () => {
      active = false;
    },
    app: () => createApi(options),
    receipts: async () =>
      JSON.parse(await readFile(join(directory, "budget", "operation-budgets.json"), "utf8"))
  };
}
describe("AC-7119 — consumo durável ligado ao HTTP sintético", () => {
  it("setup usa conta da sessão e journal salvo evita nova reserva/chamada", async () => {
    const f = await fixture(),
      app = f.app();
    try {
      const request = {
        method: "POST" as const,
        url: "/v1/chat/setup-message",
        headers: { ...f.headers, "x-development-user-id": "99999999-9999-4999-8999-999999999999" },
        payload: { stage: "welcome", maximumCostMicrounits: 0, policyRevision: "forjada" }
      };
      expect((await app.inject(request)).statusCode).toBe(200);
      expect((await app.inject(request)).statusCode).toBe(200);
      expect(f.generate).toHaveBeenCalledOnce();
      const saved = await f.receipts();
      expect(saved.receipts).toHaveLength(1);
      expect(saved.receipts[0]).toMatchObject({
        state: "completed",
        request: {
          scope: { kind: "account", userId },
          maximumCostMicrounits: 10,
          policyRevision: policy.revision
        }
      });
    } finally {
      await app.close();
    }
  });
  it("falha do journal depois do setup e novo servidor conservam recibo e negam regeneração", async () => {
    const f = await fixture();
    let app = f.app();
    const append = vi
      .spyOn(f.journal, "append")
      .mockRejectedValueOnce(new Error("FICTICIO-JOURNAL"));
    const request = {
      method: "POST" as const,
      url: "/v1/chat/setup-message",
      headers: f.headers,
      payload: { stage: "welcome" }
    };
    try {
      expect((await app.inject(request)).statusCode).toBe(503);
      append.mockRestore();
      await app.close();
      app = f.app();
      expect((await app.inject(request)).statusCode).toBe(503);
      expect(f.generate).toHaveBeenCalledOnce();
      expect((await f.receipts()).receipts[0].state).toBe("completed");
    } finally {
      await app.close();
    }
  });
  it("cota de setup é anterior à geração e não vem do payload", async () => {
    const f = await fixture({ globalDailyCost: 9 }),
      app = f.app();
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/chat/setup-turn",
            headers: f.headers,
            payload: {
              stage: "manager_name",
              message: "Pessoa Fictícia",
              history: [],
              maximumCostMicrounits: 0
            }
          })
        ).statusCode
      ).toBe(503);
      expect(f.generate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it("revogação da sessão durante setup nega publicação após geração", async () => {
    const f = await fixture();
    const original = f.generate.getMockImplementation()!;
    f.generate.mockImplementation(async (input) => {
      const result = await original(input);
      await f.auth.logout(f.login.token);
      return result;
    });
    const app = f.app();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers: f.headers,
        payload: { stage: "welcome" }
      });
      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain("prefere");
      expect((await f.receipts()).receipts[0].state).toBe("completed");
    } finally {
      await app.close();
    }
  });
  it("pergunta e upload usam tenant/membership atuais e compartilham o mesmo orçamento", async () => {
    const f = await fixture(),
      app = f.app();
    try {
      const question = await app.inject({
        method: "POST",
        url: `/v1/condominiums/${condominiumId}/questions`,
        headers: f.headers,
        payload: { question: "Olá" }
      });
      expect(question.statusCode).toBe(200);
      const upload = {
        method: "POST" as const,
        url: `/v1/condominiums/${condominiumId}/documents`,
        headers: {
          ...f.headers,
          "x-conversation-request-id": "synthetic-upload",
          "content-type": "application/pdf",
          "x-document-title": "Documento ficticio",
          "x-document-type": "other"
        },
        payload: createSyntheticTextPdf()
      };
      expect((await app.inject(upload)).statusCode).toBe(202);
      expect((await app.inject(upload)).statusCode).toBe(202);
      expect(f.original).toHaveBeenCalledOnce();
      const saved = await f.receipts();
      expect(saved.receipts).toHaveLength(2);
      expect(saved.receipts.map((row: { request: { kind: string } }) => row.request.kind)).toEqual([
        "question",
        "upload"
      ]);
      expect(saved.receipts[1].request.payloadHash).toBe(
        budgetDigest([
          "upload",
          createHash("sha256").update(upload.payload).digest("hex"),
          "application/pdf",
          undefined,
          undefined,
          "Documento ficticio",
          "other",
          undefined,
          undefined
        ])
      );
      expect(
        saved.receipts.every(
          (row: { request: { scope: unknown } }) =>
            JSON.stringify(row.request.scope) ===
            JSON.stringify({
              kind: "tenant",
              userId,
              condominiumId,
              membershipRevision: "synthetic-membership"
            })
        )
      ).toBe(true);
      f.revoke();
      expect(
        (
          await app.inject({
            ...upload,
            headers: { ...upload.headers, "x-conversation-request-id": "synthetic-other" }
          })
        ).statusCode
      ).toBe(403);
      expect(f.original).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });
  it("armazenamento indisponível e ausência de chave impedem trabalho", async () => {
    const f = await fixture();
    const denied = vi.fn(async () => {
      throw new Error("FICTICIO-STORE");
    });
    const app = createApi({
      ...f.options,
      operationControl: createApiOperationControl({
        store: { mutate: denied },
        policyRevision: policy.revision,
        maximumCostMicrounits: { setup: 10, question: 10, upload: 0 },
        authorize: async () => true
      })
    });
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/chat/setup-message",
            headers: { cookie: f.headers.cookie },
            payload: { stage: "welcome" }
          })
        ).statusCode
      ).toBe(503);
      expect(denied).not.toHaveBeenCalled();
      expect(f.generate).not.toHaveBeenCalled();
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/chat/setup-message",
            headers: f.headers,
            payload: { stage: "welcome" }
          })
        ).statusCode
      ).toBe(503);
      expect(denied).toHaveBeenCalledOnce();
      expect(f.generate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
