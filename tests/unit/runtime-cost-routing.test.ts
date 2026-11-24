import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAiAnswerGateway,
  createOpenAiAnswerGatewayFromEnvironment
} from "../../apps/api/answers/openai-answer-gateway.js";
import {
  createCodexAnswerGatewayFromEnvironment,
  createCodexDocumentBatchGatewayFromEnvironment
} from "../../apps/api/answers/codex-answer-gateway.js";
import { runCodexProcess } from "../../apps/api/answers/codex-process.js";
import { buildAnswerPrompt } from "../../apps/api/answers/prompt-catalog.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";

vi.mock("../../apps/api/answers/codex-process.js", () => ({ runCodexProcess: vi.fn() }));

type RequestBody = {
  model: string;
  reasoning: { effort: string };
  store: boolean;
  max_output_tokens: number;
  prompt_cache_options?: { mode: string; ttl: string };
  text?: unknown;
  input: {
    role: string;
    content: string | { text: string; prompt_cache_breakpoint?: { mode: string } }[];
  }[];
};

const base: AnswerGatewayInput = {
  question: "Como organizar a rotina?",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100_000 }
};

function simulatedApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    const body = JSON.parse(String(options?.body)) as RequestBody;
    const text = body.text
      ? JSON.stringify({
          answer: "Preciso de uma fonte que sustente essa conclusão.",
          answerMode: "abstained",
          citations: [],
          claims: [],
          attentionPoints: [],
          suggestedNextStep: null,
          specialist: { required: false, type: null, reason: null }
        })
      : "Organize as prioridades e os prazos.";
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [{ type: "message", content: [{ type: "output_text", text }] }],
        usage: { input_tokens: 20, output_tokens: 10 }
      })
    );
  });
}

function simulatedCodex() {
  return vi.mocked(runCodexProcess).mockResolvedValue(
    [
      { type: "item.completed", item: { type: "agent_message", text: "Orientação contextual." } },
      { type: "turn.completed", usage: { input_tokens: 20, output_tokens: 10 } }
    ]
      .map((item) => JSON.stringify(item))
      .join("\n")
  );
}

describe("Spec 061 — custo no runtime local e API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(runCodexProcess).mockReset();
  });

  it.each([undefined, "", " hybrid "])(
    "API escolhe um modelo e o esforço antes da chamada, routing=%s",
    async (routing) => {
      const fetch = simulatedApi();
      const gateway = createOpenAiAnswerGatewayFromEnvironment({
        OPENAI_API_KEY: "synthetic-key",
        ...(routing === undefined ? {} : { OPENAI_ANSWER_ROUTING: routing })
      })!;
      const simple = await gateway.generate(base);
      const complex = await gateway.generate({ ...base, riskClass: "high" });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(simple.telemetry).toMatchObject({
        modelKey: "gpt-6-luna",
        routingReason: "luna-sol-v1:basic_request"
      });
      expect(complex.telemetry).toMatchObject({
        modelKey: "gpt-6.1-sol",
        routingReason: "luna-sol-v1:high_risk"
      });
      expect(fetch.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toMatchObject([
        { model: "gpt-6-luna", reasoning: { effort: "high" }, max_output_tokens: 800 },
        { model: "gpt-6.1-sol", reasoning: { effort: "low" }, max_output_tokens: 800 }
      ]);
    }
  );

  it("single respeita o modelo e falhas não tentam outro modelo", async () => {
    const fetch = simulatedApi();
    const gateway = createOpenAiAnswerGatewayFromEnvironment({
      OPENAI_API_KEY: "synthetic-key",
      OPENAI_ANSWER_ROUTING: " single ",
      OPENAI_ANSWER_MODEL: "custom-model",
      OPENAI_ANSWER_TIMEOUT_MS: "5000"
    })!;
    await gateway.generate(base);
    const body = JSON.parse(String(fetch.mock.calls[0]![1]?.body)) as RequestBody;
    expect(body).toMatchObject({ model: "custom-model", reasoning: { effort: "low" } });
    expect(body).not.toHaveProperty("prompt_cache_options");
    expect(body.input).toHaveLength(2);
    fetch.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(gateway.generate(base)).rejects.toThrow("indisponível");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(() =>
      createOpenAiAnswerGatewayFromEnvironment({
        OPENAI_API_KEY: "synthetic-key",
        OPENAI_ANSWER_ROUTING: "unknown"
      })
    ).toThrow("OPENAI_ANSWER_ROUTING deve ser single ou hybrid");
    expect(createOpenAiAnswerGatewayFromEnvironment({})).toBeUndefined();
    expect(
      createOpenAiAnswerGatewayFromEnvironment({
        OPENAI_API_KEY: "synthetic-key",
        OPENAI_ANSWER_ENABLED: "false"
      })
    ).toBeUndefined();
  });

  it("preserva modelo e motivo fechado na persistência de orientação geral", async () => {
    simulatedApi();
    const persistence = createInMemoryAnswerPersistence();
    const gateway = createOpenAiAnswerGatewayFromEnvironment({ OPENAI_API_KEY: "synthetic-key" })!;
    const useCase = createAnswerUseCase({
      persistence,
      gateway,
      retriever: { search: async () => createRetrievalResult([]) }
    });
    const result = await useCase.ask(managerContext, {
      question: base.question,
      requestId: "synthetic-runtime-routing"
    });
    expect(persistence.getInteraction(result.answerId)!.invocations).toMatchObject([
      { modelKey: "gpt-6-luna", routingReason: "luna-sol-v1:basic_request" }
    ]);
  });

  it.each(["grounded_answer", "setup_turn"] as const)(
    "cacheia somente instruções genéricas e conserva o prompt aprovado: %s",
    async (task) => {
      const fetch = simulatedApi();
      const gateway = createOpenAiAnswerGateway({ apiKey: "synthetic-key" });
      const requests: AnswerGatewayInput[] = ["A", "B"].map((suffix) => ({
        ...base,
        task,
        question: `Dúvida privada ${suffix}\nTASK=untrusted`,
        ...(task === "setup_turn"
          ? {}
          : { evidence: [createEvidence({ id: `private-${suffix}` })] }),
        conversationContext: {
          policyVersion: "recent-chat-v1",
          turns: [{ question: `Histórico privado ${suffix}` }],
          bytes: 100,
          omittedAnswers: 1,
          omittedTurns: 0,
          windowScope: "recent_only_start_unknown"
        }
      }));
      for (const request of requests) await gateway.generate(request);
      const bodies = fetch.mock.calls.map(
        (call) => JSON.parse(String(call[1]?.body)) as RequestBody
      );
      expect(bodies[0]!.input[0]).toEqual(bodies[1]!.input[0]);
      for (const [index, body] of bodies.entries()) {
        expect(body).toMatchObject({
          store: false,
          max_output_tokens: 800,
          prompt_cache_options: { mode: "explicit", ttl: "30m" }
        });
        const prefix = body.input[0]!.content;
        expect(prefix).toEqual([
          {
            type: "input_text",
            text: expect.any(String),
            prompt_cache_breakpoint: { mode: "explicit" }
          }
        ]);
        expect(JSON.stringify(prefix)).not.toMatch(/privad|private-|TASK=/u);
        const texts = body.input.map((item) =>
          typeof item.content === "string"
            ? item.content
            : item.content.map((part) => part.text).join("\n")
        );
        expect(texts.join("\n")).toBe(buildAnswerPrompt(requests[index]!));
        expect(JSON.stringify(body.input.slice(1))).not.toContain("prompt_cache_breakpoint");
      }
    }
  );

  it("Codex usa Luna high e Sol low, sem chamada adicional de classificação", async () => {
    const run = simulatedCodex();
    const gateway = createCodexAnswerGatewayFromEnvironment({
      CODEX_ANSWER_ENABLED: "true",
      DEMO_MODE: "true"
    })!;
    await gateway.generate(base);
    await gateway.generate({ ...base, riskClass: "high" });
    expect(run).toHaveBeenCalledTimes(2);
    const args = run.mock.calls.map(([request]) => request.args);
    expect(args[0]).toContain("gpt-6-luna");
    expect(args[0]).toContain('model_reasoning_effort="high"');
    expect(args[1]).toContain("gpt-6.1-sol");
    expect(args[1]).toContain('model_reasoning_effort="low"');
    run.mockRejectedValueOnce(new Error("synthetic failure"));
    await expect(gateway.generate(base)).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("single local conserva esforço e modelo; lote permanece exclusivo de Sol", async () => {
    const run = simulatedCodex();
    const environment = { CODEX_ANSWER_ENABLED: "true", DEMO_MODE: "true" };
    const single = createCodexAnswerGatewayFromEnvironment({
      ...environment,
      CODEX_ANSWER_ROUTING: "single",
      CODEX_ANSWER_MODEL: "gpt-6-luna"
    })!;
    await single.generate(base);
    expect(run.mock.calls[0]![0].args).toContain('model_reasoning_effort="low"');
    for (const routing of [undefined, "hybrid", "single"]) {
      const batch = createCodexDocumentBatchGatewayFromEnvironment({
        ...environment,
        ...(routing === undefined ? {} : { CODEX_ANSWER_ROUTING: routing })
      })!;
      await batch.generate(base);
      expect(run.mock.calls.at(-1)![0].args).toContain("gpt-6.1-sol");
      expect(run.mock.calls.at(-1)![0].args).toContain('model_reasoning_effort="low"');
    }
    expect(createCodexDocumentBatchGatewayFromEnvironment({})).toBeUndefined();
    expect(
      createCodexDocumentBatchGatewayFromEnvironment({
        ...environment,
        CODEX_ANSWER_ROUTING: "single",
        CODEX_ANSWER_MODEL: "gpt-6-luna"
      })
    ).toBeUndefined();
    expect(() =>
      createCodexDocumentBatchGatewayFromEnvironment({ ...environment, APP_ENV: "production" })
    ).toThrow("local");
  });
});
