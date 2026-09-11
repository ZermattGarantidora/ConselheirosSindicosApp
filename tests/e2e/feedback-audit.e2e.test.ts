import { describe, expect, it } from "vitest";

import { createAnswerService } from "../../apps/api/answers/answer-service.js";
import { createLocalExtractiveGateway } from "../../apps/api/answers/local-extractive-gateway.js";
import { createInMemoryAnswerTraceStore } from "../../apps/api/answers/answer-trace.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createDevelopmentScopedRetrievalIndex } from "../../apps/api/retrieval/development-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";

const alamedaContext: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "sindico-demo" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "membership-alameda-v1",
  permissions: ["document:read", "document:upload"]
};

describe("feedback e trilha da consulta documental", () => {
  it("retorna um answerId, registra a trilha minimizada e mantém a resposta após feedback", async () => {
    const traceStore = createInMemoryAnswerTraceStore({
      answerIdFactory: () => "answer-synthetic-1",
      feedbackIdFactory: () => "feedback-synthetic-1"
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      retriever: createScopedTextRetriever(createDevelopmentScopedRetrievalIndex()),
      answerService: createAnswerService(createLocalExtractiveGateway()),
      answerTraceStore: traceStore
    });

    try {
      const answerResponse = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "A locação por temporada é permitida?" }
      });
      expect(answerResponse.statusCode).toBe(200);
      const answerBody = answerResponse.json() as {
        answerId: string;
        answer: string;
        answerMode: string;
      };
      expect(answerBody).toMatchObject({ answerId: "answer-synthetic-1", answerMode: "grounded" });

      const trace = await traceStore.get(alamedaContext, answerBody.answerId);
      expect(trace).toMatchObject({
        id: "answer-synthetic-1",
        answerMode: "grounded",
        routing: { providerKey: "local-extractive" },
        usage: { estimatedCostMicros: 0 }
      });
      expect(JSON.stringify(trace)).not.toContain(answerBody.answer);

      const feedbackResponse = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers/answer-synthetic-1/feedback",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { classification: "incorrect", comment: "Revisar a vigência." }
      });
      expect(feedbackResponse.statusCode).toBe(201);
      expect(feedbackResponse.json()).toMatchObject({
        feedbackId: "feedback-synthetic-1",
        answerId: "answer-synthetic-1",
        classification: "incorrect"
      });
      expect(await traceStore.listFeedback(alamedaContext)).toHaveLength(1);
      expect((await traceStore.get(alamedaContext, answerBody.answerId))?.responseSha256).toBe(
        trace?.responseSha256
      );
    } finally {
      await app.close();
    }
  });

  it("registra falha recuperável de retrieval como trace failed", async () => {
    const traceStore = createInMemoryAnswerTraceStore({ answerIdFactory: () => "answer-failed-1" });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      retriever: { search: async () => Promise.reject(new Error("synthetic retrieval failure")) },
      answerService: createAnswerService(createLocalExtractiveGateway()),
      answerTraceStore: traceStore
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "Pergunta sintética indisponível" }
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        answerId: "answer-failed-1",
        message: "Não foi possível consultar os documentos com segurança."
      });
      expect(await traceStore.listFeedback(alamedaContext)).toEqual([]);
      const failedTrace = await traceStore.get(alamedaContext, "answer-failed-1");
      expect(failedTrace).toMatchObject({
        answerMode: "failed",
        retrieval: { selectedCount: 0, sufficiency: "insufficient" }
      });
    } finally {
      await app.close();
    }
  });
});
