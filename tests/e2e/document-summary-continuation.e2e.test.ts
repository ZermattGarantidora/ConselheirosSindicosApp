import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { renderFullPagePdf } from "../fixtures/full-page-documents.js";
import {
  createConventionContinuationDocument,
  subscriptionStatement
} from "../fixtures/convention-continuation.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

const headers = { "x-development-user-id": "sindico-demo" };
const chatId = "00000000-0000-4000-8000-000000005815";
const priorSummary = "A minuta informa coleta pendente. Quer ajuda para organizar a conferência?";

function grounded(input: AnswerGatewayInput, answer: string) {
  const source = input.evidence.find((item) => item.content.includes(subscriptionStatement));
  if (!source) return generalAnswer("Não há trecho atual suficiente para essa conferência.");
  return {
    answer,
    answerMode: "grounded" as const,
    citations: [
      {
        evidenceId: source.id,
        documentId: source.documentId,
        documentVersionId: source.documentVersionId,
        title: source.documentTitle,
        page: source.pageNumber,
        excerpt: source.content
      }
    ],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null },
    claims: [
      {
        statement: "A minuta informa coleta pendente.",
        claimType: "interpretation" as const,
        evidenceRequired: true,
        citationEvidenceIds: [source.id]
      }
    ]
  };
}

async function fixture() {
  const memory = createDevelopmentDocumentMemory();
  const repository = createDevelopmentDocumentUploadRepository();
  const retriever = createScopedTextRetriever(memory.index);
  let unavailable = false;
  const search = vi.fn(async (...args: Parameters<typeof retriever.search>) => {
    const result = await retriever.search(...args);
    return unavailable
      ? {
          ...result,
          evidence: [],
          selectedCount: 0,
          sufficiency: {
            status: "insufficient" as const,
            reason: "no_evidence" as const,
            supportingEvidenceCount: 0
          }
        }
      : result;
  });
  const generate = vi.fn(async (input: AnswerGatewayInput) => ({
    output: grounded(
      input,
      "A minuta informa coleta pendente. Confira as subscrições com o original e registre os comprovantes."
    ),
    telemetry: createAnswerTelemetry()
  }));
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    documentCatalogRepository: repository,
    documentUploadRepository: repository,
    developmentDocumentMemory: memory,
    answerUseCase: createAnswerUseCase({
      retriever: { search },
      gateway: { generate },
      persistence: createInMemoryAnswerPersistence(),
      chatMemoryEnabled: true
    }),
    codexDocumentBatchGateway: {
      generate: async (input) => ({
        output: grounded(input, priorSummary),
        telemetry: createAnswerTelemetry()
      })
    },
    documentStorage: {
      async storeOriginal() {
        return { storageKey: "synthetic-convention" };
      },
      async removeOriginal() {}
    }
  });
  const created = await app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/chats",
    headers,
    payload: { id: chatId, title: "Continuação documental fictícia" }
  });
  expect(created.statusCode).toBe(201);
  const document = createConventionContinuationDocument();
  expect(
    document.pages.every(
      (page) => page.lines.length >= 50 && page.expectedText.replaceAll(/\s/gu, "").length >= 3000
    )
  ).toBe(true);
  const uploaded = await app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/documents",
    headers: {
      ...headers,
      "x-chat-id": chatId,
      "content-type": "application/pdf",
      "x-document-title": encodeURIComponent(document.title),
      "x-document-type": "convention",
      "x-document-validity-confirmed": "true"
    },
    payload: renderFullPagePdf(document)
  });
  expect(uploaded.statusCode).toBe(202);
  const versionId = uploaded.json().documentVersionId as string;
  await expect
    .poll(async () => {
      const catalog = await app.inject({ url: "/v1/condominiums/alameda/documents", headers });
      return catalog
        .json()
        .documents.find(
          (entry: { documentVersionId: string }) => entry.documentVersionId === versionId
        );
    })
    .toMatchObject({
      processingStatus: "ready",
      expectedPageCount: 8,
      searchablePageCount: 8,
      extractionCompleteness: 1
    });
  const summary = await app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/documents/conversation",
    headers: { ...headers, "x-chat-id": chatId },
    payload: { documentVersionIds: [versionId] }
  });
  expect(summary.statusCode).toBe(200);
  expect(summary.json().summary.citations[0].page).toBe(8);
  return {
    app,
    search,
    generate,
    removeEvidence() {
      unavailable = true;
    },
    ask: (question: string, target = chatId) =>
      app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: { question, chatId: target }
      })
  };
}

describe("AC-5815 — aceitar ajuda depois da análise de um PDF preenchido", () => {
  it.each(["quero ajuda", "sim, por favor", "pode me ajudar"])(
    "%s recupera o assunto com evidência atual",
    async (question) => {
      const f = await fixture();
      try {
        const response = await f.ask(question);
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
          answerMode: "grounded",
          citations: [expect.objectContaining({ page: 8 })]
        });
        const input = f.generate.mock.calls[0]![0];
        expect(input.question).toBe(question);
        expect(input.conversationContext?.taskFocus?.acceptedAssistantOffer).toEqual({
          question: "Quer ajuda para organizar a conferência?",
          source: "server_document_comment"
        });
        expect(
          input.evidence.some((source) => source.content.includes(subscriptionStatement))
        ).toBe(true);
        expect(f.search.mock.calls[0]![1].query).toContain(subscriptionStatement);
        expect(JSON.stringify(input.conversationContext)).not.toContain(priorSummary);
        expect(JSON.stringify(input.conversationContext)).not.toContain(subscriptionStatement);
      } finally {
        await f.app.close();
      }
    }
  );
  it("fonte não recuperada não reaparece como fato da conversa", async () => {
    const f = await fixture();
    try {
      f.removeEvidence();
      const response = await f.ask("quero ajuda");
      expect(response.json().answerMode).toBe("abstained");
      expect(response.json().citations).toEqual([]);
      expect(JSON.stringify(f.generate.mock.calls[0]![0])).not.toContain(subscriptionStatement);
      expect(JSON.stringify(f.generate.mock.calls[0]![0])).not.toContain(priorSummary);
      expect(
        f.generate.mock.calls[0]![0].conversationContext?.taskFocus?.acceptedAssistantOffer
      ).toBeUndefined();
    } finally {
      await f.app.close();
    }
  });
  it("reparo limitado conserva a oferta aceita e valida as fontes novamente", async () => {
    const f = await fixture();
    try {
      f.generate.mockImplementationOnce(async (input) => {
        const output = grounded(input, "A minuta informa coleta pendente.");
        return {
          output: {
            ...output,
            citations: output.citations.map((citation) => ({
              ...citation,
              documentId: "documento-inexistente"
            }))
          },
          telemetry: createAnswerTelemetry()
        };
      });
      const response = await f.ask("quero ajuda");
      expect(response.json().answerMode).toBe("grounded");
      expect(f.generate).toHaveBeenCalledTimes(2);
      expect(
        f.generate.mock.calls[1]![0].conversationContext?.taskFocus?.acceptedAssistantOffer
          ?.question
      ).toBe("Quer ajuda para organizar a conferência?");
      expect(f.generate.mock.calls[1]![0].evidence).toEqual(f.generate.mock.calls[0]![0].evidence);
    } finally {
      await f.app.close();
    }
  });
  it("outro chat e nova pergunta independente não herdam as referências do comentário", async () => {
    const f = await fixture();
    try {
      const otherChat = "00000000-0000-4000-8000-000000005816";
      await f.app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/chats",
        headers,
        payload: { id: otherChat, title: "Outro chat" }
      });
      await f.ask("quero ajuda", otherChat);
      expect(f.search.mock.calls[0]![1].query).toBe("quero ajuda");
      await f.ask("Como organizar uma escala de limpeza?");
      expect(f.search.mock.calls[1]![1].query).toBe("Como organizar uma escala de limpeza?");
      await f.ask("sim, por favor");
      expect(f.search.mock.calls[2]![1].query).not.toContain(subscriptionStatement);
    } finally {
      await f.app.close();
    }
  });
});
