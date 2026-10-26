import { describe, expect, it, vi } from "vitest";

import type { AnswerGateway, AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import {
  interpretSetupTurn,
  isSetupTurnRequest,
  type SetupTurnRequest
} from "../../apps/api/answers/setup-turn.js";

function request(overrides: Partial<SetupTurnRequest> = {}): SetupTurnRequest {
  return {
    stage: "manager_name",
    message: "Pode me dar um exemplo?",
    history: [{ role: "assistant", text: "Como você prefere que eu te chame?" }],
    ...overrides
  };
}

function gatewayWith(output: unknown): AnswerGateway {
  return {
    generate: vi.fn(async () => ({ output: { answer: JSON.stringify(output) } }))
  } as unknown as AnswerGateway;
}

describe("interpretação contextual da configuração", () => {
  it.each(["teste4", "Teste4", "gestora2"])(
    "aceita o apelido confirmado %s sem alterar sua grafia",
    async (nickname) => {
      const result = await interpretSetupTurn(
        gatewayWith({
          intent: "answer",
          field: "manager_name",
          value: nickname,
          reply: `Certo, ${nickname}. Quantos condomínios você administra?`
        }),
        request({ message: `Quero que me chame de ${nickname}` })
      );
      expect(result.update).toEqual({ field: "manager_name", value: nickname });
      expect(result.message).toContain(nickname);
    }
  );

  it.each(["1234", "<script>teste4</script>", "teste\n4"])(
    "continua rejeitando um nome interpretado inválido: %s",
    async (nickname) => {
      await expect(
        interpretSetupTurn(
          gatewayWith({
            intent: "answer",
            field: "manager_name",
            value: nickname,
            reply: "Certo."
          }),
          request()
        )
      ).rejects.toThrow("nome interpretado");
    }
  );

  it("AC-2601 e AC-2703: responde a uma pergunta sem transformá-la em nome", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.task).toBe("setup_turn");
      expect(input.evidence).toEqual([]);
      expect(JSON.parse(input.question)).toMatchObject({
        stage: "manager_name",
        currentMessage: "Pode me dar um exemplo?",
        recentHistory: [{ role: "assistant", text: "Como você prefere que eu te chame?" }]
      });
      return {
        output: {
          answer: JSON.stringify({
            intent: "question",
            field: null,
            value: null,
            reply:
              "Pode ser seu primeiro nome ou um apelido que você usa no dia a dia. Como prefere que eu te chame?"
          })
        }
      };
    });

    await expect(
      interpretSetupTurn({ generate } as unknown as AnswerGateway, request())
    ).resolves.toEqual({
      intent: "question",
      update: null,
      message:
        "Pode ser seu primeiro nome ou um apelido que você usa no dia a dia. Como prefere que eu te chame?"
    });
  });

  it("AC-2703: entende quantidade em linguagem natural e devolve atualização validada", async () => {
    const result = await interpretSetupTurn(
      gatewayWith({
        intent: "answer",
        field: "condominium_count",
        value: 2,
        reply: "Entendi. Qual é o nome do primeiro condomínio?"
      }),
      request({
        stage: "condominium_count",
        message: "Hoje eu cuido de dois",
        managerName: "Alex"
      })
    );

    expect(result.update).toEqual({ field: "condominium_count", value: 2 });
    expect(result.message).toBe("Entendi. Qual é o nome do primeiro condomínio?");
  });

  it("AC-2703: aceita correção contextual do nome sem perder a etapa atual", async () => {
    const result = await interpretSetupTurn(
      gatewayWith({
        intent: "correction",
        field: "manager_name",
        value: "rui",
        reply: "Combinado, Rui. Quantos condomínios você administra hoje?"
      }),
      request({
        stage: "condominium_count",
        message: "Na verdade, prefiro que me chame de Rui",
        managerName: "Alex"
      })
    );

    expect(result.update).toEqual({ field: "manager_name", value: "Rui" });
  });

  it("AC-2703: permite corrigir um dado anterior e retomar a pergunta atual", async () => {
    const result = await interpretSetupTurn(
      gatewayWith({
        intent: "correction",
        field: "condominium_count",
        value: 3,
        reply: "Certo, são três. Continuando: qual é o nome do primeiro condomínio?"
      }),
      request({
        stage: "condominium_name",
        message: "Corrigindo: na verdade são três condomínios",
        managerName: "Rui",
        condominiumCount: 2,
        condominiumIndex: 1
      })
    );

    expect(result.update).toEqual({ field: "condominium_count", value: 3 });
  });

  it("remove marcas de Markdown da fala antes de exibi-la", async () => {
    const result = await interpretSetupTurn(
      gatewayWith({
        intent: "small_talk",
        field: null,
        value: null,
        reply: "**Oi!** Que bom falar com você. Como prefere que eu te chame?"
      }),
      request({ message: "Oi" })
    );

    expect(result.message).toBe("Oi! Que bom falar com você. Como prefere que eu te chame?");
  });

  it("rejeita atualização incompatível, incompleta ou fora dos limites", async () => {
    await expect(
      interpretSetupTurn(
        gatewayWith({
          intent: "answer",
          field: "unit_count",
          value: 20,
          reply: "Certo."
        }),
        request()
      )
    ).rejects.toThrow("etapa atual");
    await expect(
      interpretSetupTurn(
        gatewayWith({
          intent: "answer",
          field: "condominium_count",
          value: 101,
          reply: "Certo."
        }),
        request({ stage: "condominium_count" })
      )
    ).rejects.toThrow("quantidade");
    await expect(
      interpretSetupTurn(
        gatewayWith({ intent: "question", field: null, value: "Alex", reply: "Certo." }),
        request()
      )
    ).rejects.toThrow("incompleta");
    await expect(
      interpretSetupTurn(
        gatewayWith({
          intent: "question",
          field: null,
          value: null,
          reply: "Certo.",
          unexpected: true
        }),
        request()
      )
    ).rejects.toThrow("contrato");
  });

  it("valida o contrato e limita o histórico enviado", () => {
    expect(isSetupTurnRequest(request())).toBe(true);
    expect(isSetupTurnRequest({ ...request(), stage: "complete" })).toBe(false);
    expect(isSetupTurnRequest({ ...request(), message: " " })).toBe(false);
    expect(
      isSetupTurnRequest({
        ...request(),
        history: Array.from({ length: 13 }, () => ({ role: "user", text: "mensagem" }))
      })
    ).toBe(false);
    expect(
      isSetupTurnRequest({ ...request(), history: [{ role: "system", text: "mensagem" }] })
    ).toBe(false);
  });
});
