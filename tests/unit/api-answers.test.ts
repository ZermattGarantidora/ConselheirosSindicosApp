import { describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import type { AnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import type { ScopedRetrievalIndex } from "../../apps/api/retrieval/retrieval-contract.js";
import { createEvidence, fixedIdFactory, fixedNow } from "./answer-fixtures.js";

function configuredApp() {
  const source = createEvidence({ content: "A regra sintética permite o uso da área comum." });
  const index: ScopedRetrievalIndex = {
    async findAuthorizedCandidates() {
      return [source];
    }
  };
  const persistence = createInMemoryAnswerPersistence(fixedIdFactory("api-persist"), fixedNow);
  const answerUseCase = createAnswerUseCase({
    retriever: createScopedTextRetriever(index),
    gateway: createLocalSyntheticAnswerGateway(() => 1),
    persistence,
    now: fixedNow,
    idFactory: fixedIdFactory("api-interaction")
  });
  return {
    app: createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase,
      now: fixedNow
    }),
    persistence
  };
}

async function closeAfter<T>(
  app: ReturnType<typeof createApi>,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } finally {
    await app.close();
  }
}

describe("API de perguntas e feedback", () => {
  it("retorna resposta pública com evidência e não expõe campos internos", async () => {
    const { app } = configuredApp();

    return closeAfter(app, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "Qual é a regra da área comum?" }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        answerMode: "grounded",
        condominiumId: "alameda",
        citations: [{ documentId: "document-1", page: 1 }]
      });
      expect(response.body).not.toContain('"userId"');
      expect(response.body).not.toContain('"claims"');
      expect(response.body).not.toContain('"promptVersion"');
    });
  });

  it("reutiliza a resposta quando o cliente reenvia a mesma chave idempotente", async () => {
    const { app, persistence } = configuredApp();

    return closeAfter(app, async () => {
      const request = {
        method: "POST" as const,
        url: "/v1/condominiums/alameda/questions",
        headers: {
          "x-development-user-id": "sindico-demo",
          "idempotency-key": "consulta-area-comum"
        },
        payload: { question: "Qual é a regra da área comum?" }
      };
      const first = await app.inject(request);
      const repeated = await app.inject(request);

      expect(first.statusCode).toBe(200);
      expect(repeated.statusCode).toBe(200);
      expect(repeated.json().answerId).toBe(first.json().answerId);
      expect(persistence.listInteractions()).toHaveLength(1);
    });
  });

  it("abstém com o adaptador padrão quando não há documentos carregados", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      now: fixedNow
    });

    return closeAfter(app, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "Qual regra existe?" }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ answerMode: "abstained", citations: [] });
    });
  });

  it.each([
    ["body ausente", undefined, 400],
    ["pergunta vazia", { question: "   " }, 400],
    ["pergunta longa", { question: "x".repeat(4_001) }, 400]
  ] as const)("valida %s", async (_description, payload, statusCode) => {
    const { app } = configuredApp();
    return closeAfter(app, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo" },
        ...(payload === undefined ? {} : { payload })
      });
      expect(response.statusCode).toBe(statusCode);
    });
  });

  it.each([
    ["sem identidade", {}, 401],
    ["condomínio não autorizado", { "x-development-user-id": "morador-alameda-demo" }, 403]
  ] as const)("bloqueia pergunta %s", async (_description, headers, statusCode) => {
    const { app } = configuredApp();
    return closeAfter(app, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/bosque/questions",
        headers,
        payload: { question: "Qual é a regra?" }
      });
      expect(response.statusCode).toBe(statusCode);
      expect(response.json().message).toMatch(/autoriz|identidade/iu);
    });
  });

  it("registra feedback para a resposta no mesmo condomínio", async () => {
    const { app } = configuredApp();

    return closeAfter(app, async () => {
      const answerResponse = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "Qual é a regra?" }
      });
      const answer = answerResponse.json();
      const feedbackResponse = await app.inject({
        method: "POST",
        url: `/v1/condominiums/alameda/answers/${answer.answerId}/feedback`,
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { classification: "correct", comment: "Fonte clara." }
      });

      expect(feedbackResponse.statusCode).toBe(201);
      expect(feedbackResponse.json()).toMatchObject({
        answerId: answer.answerId,
        condominiumId: "alameda",
        classification: "correct"
      });
      expect(responseHasInternalFields(feedbackResponse.body)).toBe(false);
    });
  });

  it.each([
    ["body inválido", undefined, 400],
    ["classificação inválida", { classification: "unknown" }, 400],
    ["comentário vazio", { classification: "correct", comment: "   " }, 400],
    ["sem identidade", { classification: "correct" }, 401]
  ] as const)("valida feedback: %s", async (_description, payload, statusCode) => {
    const { app } = configuredApp();
    return closeAfter(app, async () => {
      const headers =
        _description === "sem identidade" ? {} : { "x-development-user-id": "sindico-demo" };
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers/missing/feedback",
        headers,
        ...(payload === undefined ? {} : { payload })
      });
      expect(response.statusCode).toBe(statusCode);
    });
  });

  it("retorna 404 para feedback de resposta ausente e 403 para outro condomínio", async () => {
    const { app } = configuredApp();

    return closeAfter(app, async () => {
      const missing = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers/missing/feedback",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { classification: "correct" }
      });
      const unauthorized = await app.inject({
        method: "POST",
        url: "/v1/condominiums/bosque/answers/missing/feedback",
        headers: { "x-development-user-id": "morador-alameda-demo" },
        payload: { classification: "correct" }
      });

      expect(missing.statusCode).toBe(404);
      expect(unauthorized.statusCode).toBe(403);
    });
  });

  it("converte erro inesperado do caso de uso em resposta segura", async () => {
    const answerUseCase: AnswerUseCase = {
      async ask() {
        throw new Error("internal synthetic failure");
      },
      async submitFeedback() {
        throw new Error("internal synthetic feedback failure");
      }
    };
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase,
      now: fixedNow
    });

    return closeAfter(app, async () => {
      const question = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { question: "Qual é a regra?" }
      });
      const feedback = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/answers/answer/feedback",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { classification: "correct" }
      });

      expect(question.statusCode).toBe(500);
      expect(feedback.statusCode).toBe(500);
      expect(question.body).not.toContain("internal synthetic");
      expect(feedback.body).not.toContain("internal synthetic");
    });
  });
});

function responseHasInternalFields(body: string): boolean {
  return /userId|claims|promptVersion|validationStatus/iu.test(body);
}
