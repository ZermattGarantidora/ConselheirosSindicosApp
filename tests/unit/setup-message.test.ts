import { describe, expect, it, vi } from "vitest";

import {
  generateSetupMessage,
  isSetupMessageRequest,
  type SetupMessageRequest
} from "../../apps/api/answers/setup-message.js";
import type { AnswerGateway, AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";

describe("mensagens geradas da configuração conversacional", () => {
  it.each([
    ["welcome", undefined],
    ["returning", "Ana"],
    ["returning", "Carlos"],
    ["returning", "Alex"],
    ["new_conversation", "Ana"],
    ["new_conversation", "Carlos"],
    ["new_conversation", "Alex"]
  ] as const)("AC-2402/2407: acolhimento sem gênero em %s, nome %s", async (stage, managerName) => {
    const generatedMessage = managerName
      ? `Olá, ${managerName}! Que bom ter você aqui.`
      : "Olá! Como prefere que eu chame você?";
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.question).toContain("use linguagem sem marcação de gênero");
      expect(input.question).toContain("inclusive ao perguntar como ela prefere que você a chame");
      expect(input.question).toContain("Não use 'bem-vindo', 'bem-vinda', variantes com espaço");
      expect(input.question).toContain("nem deduza gênero pelo nome");
      expect(input.question).toContain("sem exigir uma frase fixa");
      expect(input.evidence).toEqual([]);
      return { output: { answer: generatedMessage } };
    });
    const request: SetupMessageRequest = {
      stage,
      ...(managerName === undefined ? {} : { managerName })
    };

    await expect(
      generateSetupMessage({ generate } as unknown as AnswerGateway, request)
    ).resolves.toBe(generatedMessage);
    expect(generate).toHaveBeenCalledOnce();
  });

  it("AC-2601 e AC-2704: pede a próxima fala ao modelo com a etapa e o nome", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.evidence).toEqual([]);
      return { output: { answer: "Ana, quantos condomínios você administra?" } };
    });
    const message = await generateSetupMessage({ generate } as unknown as AnswerGateway, {
      stage: "condominium_count",
      managerName: "Ana"
    });

    expect(message).toBe("Ana, quantos condomínios você administra?");
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toMatchObject({ evidence: [], riskClass: "low" });
    expect(generate.mock.calls[0]?.[0].question).toContain('"managerName":"Ana"');
  });

  it("AC-2704: acrescenta o nome quando o provedor não usa o vocativo", async () => {
    const gateway = {
      generate: async () => ({ output: { answer: "Quantos condomínios você administra?" } })
    } as unknown as AnswerGateway;

    await expect(
      generateSetupMessage(gateway, { stage: "condominium_count", managerName: "Ana" })
    ).resolves.toBe("Ana, quantos condomínios você administra?");
  });

  it("inicia uma conversa nova sem repetir o cadastro", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.question).toContain("abrindo uma conversa nova");
      expect(input.question).toContain('"managerName":"Ana"');
      return { output: { answer: "Olá, Ana. Como posso ajudar você agora?" } };
    });

    await expect(
      generateSetupMessage({ generate } as unknown as AnswerGateway, {
        stage: "new_conversation",
        managerName: "Ana"
      })
    ).resolves.toBe("Olá, Ana. Como posso ajudar você agora?");
  });

  it("AC-2404: explica que os documentos são essenciais e que sem eles fica difícil ajudar", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.question).toContain("enviar os documentos relevantes é essencial");
      expect(input.question).toContain("sem eles, fica difícil oferecer essa ajuda");
      expect(input.question).toContain("Convide a pessoa a enviar o material pela conversa");
      expect(input.question).toContain(
        "sem minimizar sua importância, oferecer adiamento espontâneo"
      );
      expect(input.question).toContain("A orientação geral permanece disponível");
      expect(input.question).not.toContain("não precisa enviar");
      expect(input.question).not.toContain("pode enviá-los aos poucos, depois");
      expect(input.question).not.toContain("documentos são opcionais");
      return {
        output: {
          answer:
            "Ana, enviar os documentos é essencial para eu conhecer o condomínio. Sem eles, fica difícil ajudar com precisão. Envie o material pela conversa."
        }
      };
    });

    await expect(
      generateSetupMessage({ generate } as unknown as AnswerGateway, {
        stage: "complete",
        managerName: "Ana"
      })
    ).resolves.toContain("Sem eles, fica difícil ajudar com precisão");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("AC-2601: rejeita etapas e entradas inválidas", () => {
    expect(isSetupMessageRequest(null)).toBe(false);
    expect(isSetupMessageRequest("complete")).toBe(false);
    expect(isSetupMessageRequest({ stage: "unknown" })).toBe(false);
    expect(isSetupMessageRequest({ stage: "returning", managerName: 12 })).toBe(false);
    expect(isSetupMessageRequest({ stage: "returning", managerName: "A".repeat(101) })).toBe(false);
    expect(isSetupMessageRequest({ stage: "unit_count", condominiumName: 12 })).toBe(false);
    expect(isSetupMessageRequest({ stage: "unit_count", condominiumName: "A".repeat(121) })).toBe(
      false
    );
    expect(isSetupMessageRequest({ stage: "unit_count", condominiumIndex: 0 })).toBe(false);
    expect(isSetupMessageRequest({ stage: "unit_count", condominiumIndex: 101 })).toBe(false);
    expect(isSetupMessageRequest({ stage: "unit_count", condominiumCount: 1.5 })).toBe(false);
    expect(isSetupMessageRequest({ stage: "complete", condominiumCount: 1 })).toBe(true);
    expect(isSetupMessageRequest({ stage: "retry_name_greeting" })).toBe(false);
    expect(isSetupMessageRequest({ stage: "name_example" })).toBe(false);
  });

  it("AC-2606: falha sem provedor ou com saída vazia", async () => {
    await expect(generateSetupMessage(undefined, { stage: "welcome" })).rejects.toThrow(
      "indisponível"
    );
    const gateway = {
      generate: async () => ({ output: { answer: " " } })
    } as unknown as AnswerGateway;
    await expect(generateSetupMessage(gateway, { stage: "welcome" })).rejects.toThrow("inválida");
    const longGateway = {
      generate: async () => ({ output: { answer: "A".repeat(801) } })
    } as unknown as AnswerGateway;
    await expect(generateSetupMessage(longGateway, { stage: "welcome" })).rejects.toThrow(
      "inválida"
    );
  });
});
