import { Ajv } from "ajv";
import { describe, expect, it, vi } from "vitest";
import { createGeminiAnswerGateway } from "../../apps/api/answers/gemini-answer-gateway.js";
import { interpretSetupTurn, type SetupTurnStage } from "../../apps/api/answers/setup-turn.js";

const cases: readonly { stage: SetupTurnStage; value: string | number | null }[] = [
  { stage: "manager_name", value: "Alex" },
  { stage: "condominium_count", value: 2 },
  { stage: "condominium_name", value: "Condomínio Fictício Horizonte" },
  { stage: "unit_count", value: 24 },
  { stage: "manager_name", value: null }
];

describe("contrato de transporte da configuração Gemini", () => {
  it.each(cases)("solicita JSON estrito para $stage/$value", async ({ stage, value }) => {
    const output = {
      intent: value === null ? "question" : "answer",
      field: value === null ? null : stage,
      value,
      reply: "Qual é a próxima informação que deseja confirmar?"
    };
    const fetch = vi.fn<typeof globalThis.fetch>(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      const schema = body.generationConfig.responseJsonSchema;
      expect(schema).toMatchObject({
        type: "object",
        additionalProperties: false,
        required: ["intent", "field", "value", "reply"]
      });
      expect(Object.keys(schema.properties).sort()).toEqual(["field", "intent", "reply", "value"]);
      const validate = new Ajv({ allowUnionTypes: true }).compile(schema);
      expect(validate(output)).toBe(true);
      expect(validate({ ...output, risk_class: "low" })).toBe(false);
      for (const field of ["intent", "field", "value", "reply"]) {
        const missing = { ...output } as Record<string, unknown>;
        delete missing[field];
        expect(validate(missing)).toBe(false);
      }
      expect(validate({ ...output, intent: "unexpected" })).toBe(false);
      expect(validate({ ...output, field: "permissions" })).toBe(false);
      expect(validate({ ...output, value: {} })).toBe(false);
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }]
      });
    });
    const gateway = createGeminiAnswerGateway({
      apiKey: "synthetic-key",
      fetch,
      maximumAttempts: 1
    });
    await expect(
      interpretSetupTurn(gateway, {
        stage,
        message: "Informação fictícia de teste",
        history: []
      })
    ).resolves.toEqual({
      message: output.reply,
      intent: output.intent,
      update: value === null ? null : { field: stage, value }
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("não relaxa o validador quando um provedor ignora o schema", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: "answer",
                    field: "manager_name",
                    value: "Alex",
                    reply: "Quantos condomínios administra?",
                    risk_class: "low"
                  })
                }
              ]
            }
          }
        ]
      })
    );
    const gateway = createGeminiAnswerGateway({
      apiKey: "synthetic-key",
      fetch,
      maximumAttempts: 1
    });
    await expect(
      interpretSetupTurn(gateway, {
        stage: "manager_name",
        message: "Pode me chamar de Alex.",
        history: []
      })
    ).rejects.toThrow("não respeitou o contrato");
    expect(fetch).toHaveBeenCalledOnce();
  });
});
