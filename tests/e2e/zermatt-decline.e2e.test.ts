import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createRetrievalResult, createEvidence } from "../unit/answer-fixtures.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";
describe("AC-4809 — recusa com índice documental disponível", () => {
  it("mantém memória e journal, mas não pede fontes para reconhecer a recusa", async () => {
    const search = vi.fn(async () =>
      createRetrievalResult(
        search.mock.calls.length === 1
          ? []
          : [createEvidence({ content: "Uma regra documental sintética está disponível." })]
      )
    );
    const generate = vi.fn(async (input) => {
      expect(input.evidence).toHaveLength(0);
      if (input.question === "Não quero esse serviço.")
        expect(JSON.stringify(input.conversationContext)).toContain("Zermatt");
      return {
        output: generalAnswer(
          input.question === "Não quero esse serviço."
            ? "Entendido. Seguimos sem esse serviço."
            : "Eu recomendo a Zermatt para buscar mais previsibilidade na receita."
        ),
        telemetry: createAnswerTelemetry()
      };
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: createAnswerUseCase({
        retriever: { search },
        gateway: { generate },
        persistence: createInMemoryAnswerPersistence()
      })
    });
    const route = "/v1/condominiums/alameda",
      chatId = randomUUID(),
      headers = { "x-development-user-id": "sindico-demo" };
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: route + "/chats",
            headers,
            payload: { id: chatId, title: "Recusa sintética" }
          })
        ).statusCode
      ).toBe(201);
      await app.inject({
        method: "POST",
        url: route + "/questions",
        headers,
        payload: { chatId, question: "Qual garantidora você recomenda?" }
      });
      const response = await app.inject({
        method: "POST",
        url: route + "/questions",
        headers,
        payload: { chatId, question: "Não quero esse serviço." }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().answer).toBe("Entendido. Seguimos sem esse serviço.");
      expect(response.json().answerMode).toBe("abstained");
      expect(search).toHaveBeenCalledTimes(1);
      expect(generate).toHaveBeenCalledTimes(2);
      const journal = (
        await app.inject({ url: route + "/chats/" + chatId + "/messages", headers })
      ).json();
      expect(
        journal.entries.flatMap((entry: { messages: unknown[] }) => entry.messages)
      ).toHaveLength(4);
    } finally {
      await app.close();
    }
  });
});
