import { describe, expect, it, vi } from "vitest";

import {
  generateSetupMessage,
  isSetupMessageRequest
} from "../../apps/api/answers/setup-message.js";
import type { AnswerGateway, AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";

describe("mensagens geradas da configuração conversacional", () => {
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

  it("AC-2404: conclui sem exigir envio imediato e sem chamar documentos de opcionais", async () => {
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.question).toContain("não precisa enviar documentos agora");
      expect(input.question).toContain("necessários para você conhecer o condomínio");
      expect(input.question).toContain("pode enviá-los aos poucos, depois");
      expect(input.question).toContain("nunca chame os documentos de opcionais");
      expect(input.question).not.toContain("documentos são opcionais");
      return {
        output: {
          answer:
            "Você pode enviar os documentos depois; eles são necessários para eu conhecer o condomínio."
        }
      };
    });

    await expect(
      generateSetupMessage({ generate } as unknown as AnswerGateway, {
        stage: "complete",
        managerName: "Ana"
      })
    ).resolves.toContain("necessários");
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
