import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createHostedDocumentBatchGatewayFactory as createBatchFactory } from "../../apps/api/answers/hosted-document-batch-gateway.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { registerDocumentBatchConversationRoute } from "../../apps/api/app/document-batch-conversation-route.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import {
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer
} from "../../apps/api/documents/hosted-document-execution.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { legacyChatId } from "../../apps/api/chats/chat-repository.js";
import { createEvidence, managerContext, bosque } from "./answer-fixtures.js";
import { answerPromptVersion } from "../../apps/api/answers/prompt-catalog.js";
import { answerPipelineVersion } from "../../apps/api/answers/answer-contract.js";
import type { HostedReplayProof } from "../../apps/api/app/journal-replay-proof.js";

it("AC-7125: replay mantém modelo/pipeline atuais sem transporte ou reserva", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const factory = createBatchFactory({
    apiKey: "synthetic-only",
    syntheticContractOnly: true,
    fetch,
    authorize: async (request) => ({
      allowed: true,
      requestHash: hostedDocumentRequestHash(request),
      policyRevision: "synthetic-policy"
    })
  });
  const proof: HostedReplayProof = {
    policyRevision: "synthetic-policy",
    request: {
      purpose: "batch_synthesis",
      destination: "https://api.openai.com/v1/responses",
      model: "gpt-6.1-sol",
      condominiumId: managerContext.condominiumId,
      userId: managerContext.userId,
      chatId: "synthetic-chat",
      membershipRevision: managerContext.membershipRevision,
      documentVersions: [
        { id: "version-1", contentKind: "evidence_bundle", contentSha256: "b".repeat(64) }
      ],
      payloadSha256: "a".repeat(64),
      inputBytes: 10,
      pageCount: 1,
      maximumOutputTokens: 100,
      processorVersion: `${answerPromptVersion}/${answerPipelineVersion}`
    }
  };
  expect(await factory.revalidateReplay!(managerContext, "synthetic-chat", proof)).toBe(true);
  for (const request of [
    { ...proof.request, model: "previous-model" },
    { ...proof.request, processorVersion: "previous-prompt/pipeline" },
    { ...proof.request, documentVersions: [] }
  ])
    expect(
      await factory.revalidateReplay!(managerContext, "synthetic-chat", { ...proof, request })
    ).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});

const text = "Convenção FICTÍCIA. O mandato é de dois anos.";
const createHostedDocumentBatchGatewayFactory = (
  options: Parameters<typeof createBatchFactory>[0]
) => createBatchFactory({ ...options, syntheticContractOnly: true });
const document: AnalysisDocument = {
  condominiumId: managerContext.condominiumId,
  documentId: "document-1",
  documentVersionId: "version-1",
  documentTitle: "Convenção FICTÍCIA.pdf",
  pages: [{ pageNumber: 1, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
};
const registered: RegisteredDocument = {
  condominiumId: document.condominiumId,
  documentId: document.documentId,
  documentVersionId: document.documentVersionId,
  title: document.documentTitle,
  documentType: "other",
  versionNumber: 1,
  sizeBytes: 100,
  processingStatus: "ready",
  validityStatus: "not_applicable",
  createdAt: "2026-11-09T10:00:00.000Z",
  expectedPageCount: 1,
  processedPageCount: 1,
  searchablePageCount: 1,
  unreadablePageNumbers: [],
  extractionCompleteness: 1,
  extractionMethod: "pdf_text",
  ocrQualityScore: null
};
const allow: HostedDocumentTransferAuthorizer = async (request) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic-only-v1"
});
const input: AnswerGatewayInput = {
  question: "Analise a convenção fictícia.",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [
    createEvidence({
      id: "batch:version-1:1:0",
      content: text,
      documentTitle: document.documentTitle,
      documentType: "other",
      validityStatus: "not_applicable"
    })
  ],
  budget: { maximumOutputTokens: 1200, maximumCostMicrounits: 100000 }
};
function response(
  evidenceId = "batch:version-1:1:0",
  answer = "O mandato é de dois anos. Quer ajuda para conferir os prazos?"
) {
  return Response.json({
    status: "completed",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              answer,
              answerMode: "grounded",
              citations: [{ evidenceId }],
              attentionPoints: [],
              suggestedNextStep: null,
              specialist: { required: false, type: null, reason: null },
              claims: [
                {
                  statement: "O mandato é de dois anos.",
                  claimType: "interpretation",
                  evidenceRequired: true,
                  citationEvidenceIds: [evidenceId]
                }
              ]
            })
          }
        ]
      }
    ],
    usage: { input_tokens: 100, output_tokens: 50 }
  });
}
const url = "/v1/condominiums/alameda/documents/conversation";

describe("Spec 071 — síntese preparada pela API sem fallback", () => {
  it("AC-7101/7106: configuração de dois destinos é recusada sem escolher um deles", async () => {
    const app = Fastify();
    const generate = vi.fn();
    const hostedGateway = vi.fn(() => ({ generate }));
    registerDocumentBatchConversationRoute(app, {
      resolve: async () => managerContext,
      catalog: { listAuthorized: async () => [registered] },
      reader: { readAuthorized: async () => [document] },
      codexGateway: { generate },
      hostedGateway,
      consume: () => {}
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await app.inject({
        method: "POST",
        url,
        payload: { documentVersionIds: ["version-1"] }
      });
      expect(result.statusCode).toBe(503);
      expect(hostedGateway).not.toHaveBeenCalled();
      expect(generate).not.toHaveBeenCalled();
    } finally {
      await app.close();
      log.mockRestore();
    }
  });

  it("AC-7101: chave/modelo configurados não aprovam payload ou destino", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const factory = createHostedDocumentBatchGatewayFactory({ apiKey: "synthetic-key", fetch });
    await expect(factory(managerContext, legacyChatId).generate(input)).rejects.toThrow(
      "indisponível"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("AC-7104/7106: uma geração concorrente no escopo e cache separado por chat/membership", async () => {
    const gate = Promise.withResolvers<void>();
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
      await gate.promise;
      return response();
    });
    const authorize = vi.fn(allow);
    const factory = createHostedDocumentBatchGatewayFactory({
      apiKey: "synthetic-key",
      authorize,
      fetch
    });
    const gateway = factory(managerContext, legacyChatId);
    const first = gateway.generate(input),
      second = gateway.generate(input);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    gate.resolve();
    expect((await first).output.citations[0]).toMatchObject({
      documentId: "document-1",
      documentVersionId: "version-1",
      page: 1,
      excerpt: text
    });
    await second;
    await gateway.generate(input);
    expect(fetch).toHaveBeenCalledOnce();
    await factory(managerContext, "11111111-1111-4111-8111-111111111111").generate(input);
    await factory({ ...managerContext, membershipRevision: "v2" }, legacyChatId).generate(input);
    expect(fetch).toHaveBeenCalledTimes(3);
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(body).toMatchObject({
      model: "gpt-6.1-sol",
      reasoning: { effort: "low" },
      store: false,
      max_output_tokens: 1200
    });
    expect(body).not.toHaveProperty("tools");
    expect(JSON.stringify(authorize.mock.calls)).not.toContain(text);
  });

  it.each(["tenant", "permission", "chat", "task", "empty", "tokens", "size", "versions", "pages"])(
    "AC-7104/7106: recusa %s antes da rede",
    async (kind) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const factory = createHostedDocumentBatchGatewayFactory({
        apiKey: "synthetic-key",
        authorize: allow,
        fetch
      });
      const changed: AnswerGatewayInput = {
        ...input,
        ...(kind === "tenant" ? { evidence: [createEvidence({ condominiumId: bosque })] } : {}),
        ...(kind === "empty" ? { evidence: [] } : {}),
        ...(kind === "tokens" ? { budget: { ...input.budget, maximumOutputTokens: 1201 } } : {}),
        ...(kind === "task" ? { task: "setup_turn" } : {}),
        ...(kind === "size" ? { evidence: [createEvidence({ content: "a".repeat(120001) })] } : {}),
        ...(kind === "versions"
          ? {
              evidence: Array.from({ length: 51 }, (_, i) =>
                createEvidence({ documentVersionId: `v-${i}` })
              )
            }
          : {}),
        ...(kind === "pages"
          ? {
              evidence: Array.from({ length: 501 }, (_, i) => createEvidence({ pageNumber: i + 1 }))
            }
          : {})
      };
      const context =
        kind === "permission" ? { ...managerContext, permissions: [] } : managerContext;
      await expect(
        factory(context, kind === "chat" ? "" : legacyChatId).generate(changed)
      ).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(["citation", "monetary", "http", "network"])(
    "AC-7106/7108: %s é recusado sem fallback nem cache de sucesso",
    async (kind) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
        if (kind === "http") return new Response("DETALHE_PRIVADO", { status: 429 });
        if (kind === "network") throw new Error("DETALHE_PRIVADO");
        if (kind === "citation") return response("fonte-inventada");
        return response(undefined, "O mandato é de dois anos. A taxa é de R$ 999,00.");
      });
      const gateway = createHostedDocumentBatchGatewayFactory({
        apiKey: "synthetic-key",
        authorize: allow,
        fetch
      })(managerContext, legacyChatId);
      for (let attempt = 0; attempt < 2; attempt++) {
        const error = await gateway.generate(input).catch((value: unknown) => value);
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).not.toContain("DETALHE_PRIVADO");
      }
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  it.each(["none", "membership", "catalog", "reader"])(
    "AC-7106: HTTP preserva revalidação e falha de leitura (%s)",
    async (change) => {
      const app = Fastify();
      let revision = "v1";
      const docs = [registered];
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
        if (change === "membership") revision = "v2";
        if (change === "catalog") docs.splice(0);
        return response();
      });
      registerDocumentBatchConversationRoute(app, {
        resolve: async () => ({ ...managerContext, membershipRevision: revision }),
        catalog: { listAuthorized: async () => docs },
        reader: {
          readAuthorized: async () => {
            if (change === "reader") throw new Error("DETALHE_PRIVADO");
            return [document];
          }
        },
        codexGateway: undefined,
        hostedGateway: createHostedDocumentBatchGatewayFactory({
          apiKey: "synthetic-key",
          authorize: allow,
          fetch
        }),
        consume: () => {}
      });
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const result = await app.inject({
          method: "POST",
          url,
          payload: { documentVersionIds: ["version-1"] }
        });
        expect(result.statusCode).toBe(
          change === "none" ? 200 : change === "membership" ? 403 : change === "catalog" ? 409 : 503
        );
        expect(result.body).not.toContain("DETALHE_PRIVADO");
        if (change !== "none") expect(result.json()).not.toHaveProperty("summary");
        if (change === "reader") expect(fetch).not.toHaveBeenCalled();
      } finally {
        await app.close();
        log.mockRestore();
      }
    }
  );

  it("AC-7108: journal falha antes do ACK; retoma sem nova geração local e conserva fala", async () => {
    const store = createInMemoryConversationStore();
    const append = vi.spyOn(store, "append").mockImplementationOnce(async () => {
      throw new Error("falha sintética de gravação");
    });
    // A primeira gravação falha; as seguintes usam a implementação original do store.
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response());
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      conversationStore: store,
      documentCatalogRepository: {
        listAuthorized: async (context) => (context.condominiumId === "alameda" ? [registered] : [])
      },
      documentAnalysisReader: { readAuthorized: async () => [document] },
      hostedDocumentBatchGateway: createHostedDocumentBatchGatewayFactory({
        apiKey: "synthetic-key",
        authorize: allow,
        fetch
      })
    });
    const headers = {
      "x-development-user-id": "sindico-demo",
      "x-conversation-request-id": "synthetic-batch-operation"
    };
    const payload = { documentVersionIds: ["version-1"], message: "Segue a convenção." };
    try {
      const failed = await app.inject({ method: "POST", url, headers, payload });
      expect(failed.statusCode).toBe(503);
      const saved = await app.inject({ method: "POST", url, headers, payload });
      expect(saved.statusCode).toBe(200);
      expect(saved.headers["x-conversation-entry-id"]).toBeDefined();
      const repeated = await app.inject({ method: "POST", url, headers, payload });
      expect(repeated.body).toBe(saved.body);
      expect(fetch).toHaveBeenCalledOnce();
      const history = await app.inject({
        method: "GET",
        url: `/v1/condominiums/alameda/chats/${legacyChatId}/messages`,
        headers
      });
      expect(history.statusCode).toBe(200);
      expect(history.json().entries).toHaveLength(1);
      expect(
        history
          .json()
          .entries[0].messages.map((item: { role: string; text: string }) => [item.role, item.text])
      ).toEqual([
        ["user", payload.message],
        ["assistant", saved.json().summary.answer]
      ]);
      const other = await app.inject({
        method: "GET",
        url: `/v1/condominiums/bosque/chats/${legacyChatId}/messages`,
        headers
      });
      expect(other.statusCode).toBe(404);
      expect(other.body).not.toContain(saved.json().summary.answer);
      expect(store.durable).toBe(false);
    } finally {
      append.mockRestore();
      await app.close();
    }
  });
});
