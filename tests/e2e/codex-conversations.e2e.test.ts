import { afterEach, describe, expect, it, vi } from "vitest";
import {
  startSyntheticServer as startServer,
  syntheticAccessHeaders
} from "../fixtures/synthetic-access.js";
import { runCodexProcess } from "../../apps/api/answers/codex-process.js";

vi.mock("../../apps/api/answers/codex-process.js", () => ({ runCodexProcess: vi.fn() }));

describe("toda a conversa local pelo plano Codex — AC-4201/4202", () => {
  afterEach(() => vi.restoreAllMocks());

  it("usa Codex em boas-vindas, interpretação e pergunta, sem fallback mesmo com chaves presentes", async () => {
    const run = vi.mocked(runCodexProcess);
    run.mockImplementation(async (request) => {
      const text = request.input.includes("TASK=setup_turn")
        ? JSON.stringify({
            intent: "answer",
            field: "manager_name",
            value: "Pessoa Sintética",
            reply: "Quantos condomínios você administra?"
          })
        : request.input.includes(
              "Há água entrando no quadro elétrico energizado. Posso secar com pano?"
            )
          ? "Não toque no quadro energizado nem tente secar com pano. Afaste as pessoas e acione um eletricista habilitado."
          : "Posso ajudar a organizar a rotina do condomínio.";
      return [
        { type: "item.completed", item: { type: "agent_message", text } },
        { type: "turn.completed", usage: { input_tokens: 20, output_tokens: 10 } }
      ]
        .map((event) => JSON.stringify(event))
        .join("\n");
    });
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("API externa não autorizada neste teste"));
    const app = await startServer(0, {
      DEMO_MODE: "true",
      CODEX_ANSWER_ENABLED: "true",
      OPENAI_API_KEY: "synthetic-openai",
      GEMINI_API_KEY: "synthetic-gemini"
    });
    try {
      expect((await app.inject({ method: "GET", url: "/v1/runtime" })).json()).toMatchObject({
        aiProvider: "codex"
      });
      const headers = await syntheticAccessHeaders(app);
      const welcome = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-message",
        headers,
        payload: { stage: "welcome" }
      });
      expect(welcome.statusCode).toBe(200);
      const setup = await app.inject({
        method: "POST",
        url: "/v1/chat/setup-turn",
        headers,
        payload: { stage: "manager_name", message: "Pessoa Sintética", history: [] }
      });
      expect(setup.statusCode).toBe(200);
      expect(setup.json()).toMatchObject({
        update: { field: "manager_name", value: "Pessoa Sintética" }
      });
      const question = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: { question: "Como organizar a rotina do síndico?" }
      });
      expect(question.statusCode).toBe(200);
      expect(run).toHaveBeenCalledTimes(3);
      for (const [request] of run.mock.calls) {
        expect(request.args).toContain("gpt-6-luna");
        expect(request.args).toContain('model_reasoning_effort="high"');
      }
      const highRisk = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: {
          question: "Há água entrando no quadro elétrico energizado. Posso secar com pano?"
        }
      });
      expect(highRisk.statusCode).toBe(200);
      expect(highRisk.json().answer).toMatch(/não toque/iu);
      expect(highRisk.json().specialist.required).toBe(true);
      expect(run).toHaveBeenCalledTimes(4);
      expect(run.mock.calls.at(-1)![0].args).toContain("gpt-6.1-sol");
      expect(run.mock.calls.at(-1)![0].args).toContain('model_reasoning_effort="low"');
      run.mockRejectedValue(new Error("Cota sintética esgotada"));
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/chat/setup-message",
            headers,
            payload: { stage: "welcome" }
          })
        ).statusCode
      ).toBe(503);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("recusa opt-in de produção antes de iniciar a aplicação", async () => {
    await expect(
      startServer(0, { DEMO_MODE: "true", APP_ENV: "production", CODEX_ANSWER_ENABLED: "true" })
    ).rejects.toThrow("demonstração pessoal local");
  });
});
