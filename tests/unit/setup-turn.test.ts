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

function gatewaySequence(...outputs: unknown[]) {
  const generate = vi.fn(async (input: AnswerGatewayInput) => {
    expect(input.task).toBe("setup_turn");
    return { output: { answer: JSON.stringify(outputs.shift()) } };
  });
  return { gateway: { generate } as unknown as AnswerGateway, generate };
}

const condominiumRequest = request({
  stage: "condominium_name",
  message: "Residencial Fictício",
  managerName: "Pessoa Sintética",
  condominiumCount: 1,
  condominiumIndex: 1
});
const condominiumUpdate = {
  intent: "answer",
  field: "condominium_name",
  value: "Residencial Fictício"
};

describe("AC-2403a — próxima pergunta da configuração", () => {
  it("repara a conclusão prematura após o nome e preserva o dado interpretado", async () => {
    const { gateway, generate } = gatewaySequence(
      {
        ...condominiumUpdate,
        reply: "Salvei o contexto do condomínio. Pode enviar os documentos."
      },
      { ...condominiumUpdate, reply: "Certo. Quantos apartamentos há nesse condomínio?" }
    );
    const result = await interpretSetupTurn(gateway, condominiumRequest);
    expect(result).toEqual({
      intent: "answer",
      update: { field: "condominium_name", value: "Residencial Fictício" },
      message: "Certo. Quantos apartamentos há nesse condomínio?"
    });
    expect(generate).toHaveBeenCalledTimes(2);
    const inputs = generate.mock.calls.map(([input]) => input);
    expect(JSON.parse(inputs[0]!.question).nextFieldByUpdate.condominium_name).toBe("unit_count");
    expect(JSON.parse(inputs[1]!.question).replyRepair).toMatchObject({
      nextField: "unit_count",
      requiredIntent: "answer",
      requiredUpdate: { field: "condominium_name", value: "Residencial Fictício" }
    });
    for (const input of inputs) {
      expect(input.task).toBe("setup_turn");
      expect(input.evidence).toEqual([]);
      expect(input.budget).toEqual({ maximumOutputTokens: 500, maximumCostMicrounits: 100_000 });
    }
  });

  it.each([
    "Certo. Quantos apartamentos há nesse condomínio?",
    "Qual é o número de unidades do residencial?",
    "Você pode informar a quantidade de apartamentos?",
    "Ainda não salvei o contexto. Quantas unidades ele possui?",
    "Anotei o nome. Quantos apartamentos são ao todo?"
  ])("aceita a pergunta de unidades sem outra geração: %s", async (reply) => {
    const { gateway, generate } = gatewaySequence({ ...condominiumUpdate, reply });
    expect((await interpretSetupTurn(gateway, condominiumRequest)).message).toBe(reply);
    expect(generate).toHaveBeenCalledOnce();
  });

  it.each([
    "Salvei o contexto. Pode enviar os documentos.",
    "O cadastro está concluído. Quantos apartamentos há nele?",
    "Quantos documentos você vai enviar?",
    "Você administra quantos condomínios?",
    "O nome tem a palavra Apartamentos?"
  ])("não publica uma segunda fala incompatível: %s", async (reply) => {
    const { gateway, generate } = gatewaySequence(
      { ...condominiumUpdate, reply },
      { ...condominiumUpdate, reply }
    );
    await expect(interpretSetupTurn(gateway, condominiumRequest)).rejects.toThrow(
      "próxima pergunta"
    );
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ...condominiumUpdate, value: "Outro Fictício" },
    { ...condominiumUpdate, intent: "correction" },
    { intent: "question", field: null, value: null }
  ])("não aceita mudar a interpretação durante a reparação: %j", async (changed) => {
    const { gateway, generate } = gatewaySequence(
      { ...condominiumUpdate, reply: "Contexto salvo." },
      { ...changed, reply: "Quantos apartamentos há nesse condomínio?" }
    );
    await expect(interpretSetupTurn(gateway, condominiumRequest)).rejects.toThrow("reparação");
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("mantém a recusa de propriedades extras sem reparar JSON inválido", async () => {
    const { gateway, generate } = gatewaySequence({
      ...condominiumUpdate,
      reply: "Quantos apartamentos há nesse condomínio?",
      risk_class: "low"
    });
    await expect(interpretSetupTurn(gateway, condominiumRequest)).rejects.toThrow("contrato");
    expect(generate).toHaveBeenCalledOnce();
  });

  it.each([
    ["manager_name", "Pessoa Fictícia", "unit_count", "Quantas unidades há nele?"],
    ["condominium_count", 3, "unit_count", "Quantas unidades há nele?"],
    ["condominium_name", "Outro Fictício", "unit_count", "Quantas unidades há nele?"],
    ["unit_count", 48, "condominium_name", "Qual é o nome do próximo condomínio?"]
  ] as const)("retoma a pergunta ao atualizar %s", async (field, value, nextField, reply) => {
    const { gateway, generate } = gatewaySequence({ intent: "correction", field, value, reply });
    await expect(
      interpretSetupTurn(gateway, {
        ...condominiumRequest,
        stage: "unit_count",
        condominiumCount: 2
      })
    ).resolves.toMatchObject({ message: reply, update: { field, value } });
    const input = generate.mock.calls[0]![0];
    expect(JSON.parse(input.question).nextFieldByUpdate[field]).toBe(nextField);
    expect(generate).toHaveBeenCalledOnce();
  });

  it.each([
    { ...condominiumRequest, stage: "unit_count" as const },
    {
      ...condominiumRequest,
      stage: "unit_count" as const,
      condominiumCount: 2,
      condominiumIndex: 2
    }
  ])("permite encerrar só depois das unidades do último condomínio", async (input) => {
    const { gateway, generate } = gatewaySequence({
      intent: "answer",
      field: "unit_count",
      value: 48,
      reply: "Salvei o contexto. Envie os documentos relevantes para eu conhecer o condomínio."
    });
    await expect(interpretSetupTurn(gateway, input)).resolves.toMatchObject({
      update: { field: "unit_count", value: 48 }
    });
    expect(generate).toHaveBeenCalledOnce();
  });

  it("não repete cadastro ao confirmar tratamento com contexto existente", async () => {
    await expect(
      interpretSetupTurn(
        gatewayWith({
          intent: "answer",
          field: "manager_name",
          value: "Síndico",
          reply: "Como posso ajudar?"
        }),
        request({ hasExistingContext: true })
      )
    ).resolves.toMatchObject({ update: { field: "manager_name", value: "Síndico" } });
  });
});

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
