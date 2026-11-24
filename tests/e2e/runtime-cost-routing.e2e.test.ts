import { afterEach, describe, expect, it, vi } from "vitest";
import {
  startSyntheticServer as startServer,
  syntheticAccessHeaders
} from "../fixtures/synthetic-access.js";

describe("Spec 061 — roteamento da API pelo servidor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("usa Luna high na conversa simples e Sol low no risco, sem duplicar chamadas", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body)) as {
        reasoning: { effort: string };
        input: { content: unknown }[];
      };
      const text = JSON.stringify(body.input).includes("TASK=setup_turn")
        ? JSON.stringify({
            intent: "answer",
            field: "manager_name",
            value: "Pessoa Sintética",
            reply: "Quantos condomínios você administra?"
          })
        : "Posso ajudar a organizar a rotina. Em risco elétrico, afaste-se e acione o responsável técnico.";
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text }] }],
          usage: { input_tokens: 20, output_tokens: 10 }
        })
      );
    });
    const app = await startServer(0, { DEMO_MODE: "true", OPENAI_API_KEY: "synthetic-key" });
    try {
      const headers = await syntheticAccessHeaders(app);
      for (const [url, payload] of [
        ["/v1/chat/setup-message", { stage: "welcome" }],
        [
          "/v1/chat/setup-turn",
          { stage: "manager_name", message: "Pessoa Sintética", history: [] }
        ],
        ["/v1/condominiums/alameda/questions", { question: "Como organizar a rotina do síndico?" }],
        [
          "/v1/condominiums/alameda/questions",
          { question: "Há água entrando no quadro elétrico energizado. Posso secar com pano?" }
        ]
      ] as const) {
        expect((await app.inject({ method: "POST", url, headers, payload })).statusCode).toBe(200);
      }
      expect(fetch).toHaveBeenCalledTimes(4);
      const requests = fetch.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
      expect(requests).toMatchObject([
        { model: "gpt-6-luna", reasoning: { effort: "high" } },
        { model: "gpt-6-luna", reasoning: { effort: "high" } },
        { model: "gpt-6-luna", reasoning: { effort: "high" } },
        { model: "gpt-6.1-sol", reasoning: { effort: "low" } }
      ]);
      expect(requests.every((item) => item.store === false)).toBe(true);
    } finally {
      await app.close();
    }
  });
});
