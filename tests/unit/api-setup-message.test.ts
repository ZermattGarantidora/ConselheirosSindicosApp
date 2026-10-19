import { describe, expect, it, vi } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import type { AnswerGateway, AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";

describe("API de mensagens de configuração", () => {
  it("exige identidade e valida a etapa antes de gerar uma fala", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.evidence).toEqual([]);
      return { output: { answer: "Olá, como prefere ser chamado?" } };
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      setupMessageGateway: { generate } as unknown as AnswerGateway
    });
    try {
      const unauthenticated = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        payload: { stage: "welcome" }
      });
      const invalid = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { stage: "unknown" }
      });
      const valid = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { stage: "welcome" }
      });

      expect(unauthenticated.statusCode).toBe(401);
      expect(invalid.statusCode).toBe(400);
      expect(valid.statusCode).toBe(200);
      expect(valid.json()).toEqual({ message: "Olá, como prefere ser chamado?" });
      expect(generate).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it("AC-2704: usa o nome confirmado na conversa, não o identificador da entrada", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.question).toContain('"managerName":"Marina"');
      expect(input.question).not.toContain("acesso-marina");
      return { output: { answer: "Marina, quantos condomínios você administra?" } };
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      setupMessageGateway: { generate } as unknown as AnswerGateway
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers: {
          "x-development-user-id": "demo-acesso-marina",
          "x-development-user-name": encodeURIComponent("acesso-marina")
        },
        payload: { stage: "condominium_count", managerName: "Marina" }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: "Marina, quantos condomínios você administra?"
      });
    } finally {
      await app.close();
    }
  });

  it("AC-2606: informa indisponibilidade quando não há provedor, sem fala pronta", async () => {
    const app = createApi({ membershipRepository: createDevelopmentIdentityRepository() });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers: {
          "x-development-user-id": "sindico-demo",
          "x-development-user-name": encodeURIComponent("Ana")
        },
        payload: { stage: "condominium_count" }
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ message: "A Alvitra está indisponível no momento." });
    } finally {
      await app.close();
    }
  });

  it("AC-2601 e AC-2703: interpreta um turno contextual somente para uma identidade válida", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.task).toBe("setup_turn");
      return {
        output: {
          answer: JSON.stringify({
            intent: "question",
            field: null,
            value: null,
            reply: "Pode ser seu primeiro nome ou um apelido. Como prefere que eu te chame?"
          })
        }
      };
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      setupMessageGateway: { generate } as unknown as AnswerGateway
    });
    try {
      const unauthenticated = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-turn",
        payload: { stage: "manager_name", message: "Pode me dar um exemplo?", history: [] }
      });
      const invalid = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-turn",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: { stage: "complete", message: "Olá", history: [] }
      });
      const valid = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-turn",
        headers: { "x-development-user-id": "sindico-demo" },
        payload: {
          stage: "manager_name",
          message: "Pode me dar um exemplo?",
          history: [{ role: "assistant", text: "Como prefere que eu te chame?" }]
        }
      });

      expect(unauthenticated.statusCode).toBe(401);
      expect(invalid.statusCode).toBe(400);
      expect(valid.statusCode).toBe(200);
      expect(valid.json()).toEqual({
        intent: "question",
        update: null,
        message: "Pode ser seu primeiro nome ou um apelido. Como prefere que eu te chame?"
      });
      expect(generate).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });
});
