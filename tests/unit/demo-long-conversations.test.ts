import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { longScenarios } from "../../evals/demo-documents/long-cases.js";
import { assessLongTurn } from "../../evals/demo-documents/long-assessment.js";
import { demoFixture } from "../../evals/demo-documents/fixture.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
describe("AC-6406–6409 — conversas longas", () => {
  it("AC-6410: fallback não vazio com recusa definitiva não conta como completo", () => {
    const turn = longScenarios[0]!.turns[0]!;
    const body = { answer: "Encontrei fontes, mas não consegui validar uma resposta segura." };
    const result = assessLongTurn(
      turn,
      body,
      [],
      [{ code: "mode_citation_mismatch", attemptCount: 2 }]
    );
    expect(result.outcome).toBe("needs_review");
    expect(result.complete).toBe(false);
    expect(result.mechanical).toContain("final_validation_failure");
    expect(
      assessLongTurn(turn, { answer: "Certo, vou usar o nome informado." }, [], []).outcome
    ).toBe("automatic_complete");
    const distant = longScenarios[0]!.turns[27]!;
    const rejectedRecall = assessLongTurn(
      distant,
      { answer: "Não tenho essa informação no contexto disponível." },
      [],
      [{ code: "mode_citation_mismatch" }]
    );
    expect(rejectedRecall.outcome).toBe("needs_review");
    expect(rejectedRecall.complete).toBe(false);
  });
  it("fixa três roteiros de 30 turnos, com retomada e fechamento", () => {
    expect(longScenarios).toHaveLength(3);
    expect(longScenarios.reduce((sum, item) => sum + item.turns.length, 0) * 2).toBe(180);
    for (const scenario of longScenarios) {
      expect(scenario.turns).toHaveLength(30);
      expect(scenario.turns.at(-1)?.tag).toBe("final_completeness");
      expect(scenario.turns[27]?.tag).toBe("distant_recall");
    }
  });
  it("separa nota visível esquecida de janela sem a nota", () => {
    const turn = longScenarios[0]!.turns[3]!;
    const input: AnswerGatewayInput = {
      question: turn.question,
      task: "grounded_answer",
      riskClass: "low",
      evidence: [],
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 },
      conversationContext: {
        policyVersion: "recent-chat-v1",
        turns: [{ question: "Minha lista se chama Cedro." }],
        bytes: 45,
        omittedAnswers: 0,
        omittedTurns: 0
      }
    };
    expect(assessLongTurn(turn, { answer: "A lista se chama Cedro." }, [input]).outcome).toBe(
      "automatic_complete"
    );
    expect(assessLongTurn(turn, { answer: "Não lembro." }, [input]).mechanical).toContain(
      "visible_note_not_recalled"
    );
    const absent = {
      ...input,
      conversationContext: { ...input.conversationContext!, turns: [], omittedTurns: 20 }
    };
    expect(
      assessLongTurn(turn, { answer: "Não tenho essa informação no contexto disponível." }, [
        absent
      ]).outcome
    ).toBe("limited_context");
    expect(
      assessLongTurn(turn, { answer: "A lista se chama Cedro." }, [absent]).mechanical
    ).toContain("unsupported_memory_claim");
  });
  it("usa memória real no mesmo chat e preserva os dois lados", async () => {
    const fixture = await demoFixture(process.cwd(), {
      async generate() {
        return {
          output: {
            answer: "Certo, posso continuar.",
            answerMode: "abstained",
            citations: [],
            claims: [],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          },
          telemetry: createAnswerTelemetry()
        };
      }
    });
    const route = "/v1/condominiums/demo-docs";
    const chatId = randomUUID();
    try {
      await fixture.app.inject({
        method: "POST",
        url: route + "/chats",
        headers: fixture.headers,
        payload: { id: chatId, title: "Continuidade sintética" }
      });
      for (const question of [
        "Minha anotação de teste é Cedro.",
        "Retome minha anotação anterior."
      ]) {
        const response = await fixture.app.inject({
          method: "POST",
          url: route + "/questions",
          headers: fixture.headers,
          payload: { question, chatId }
        });
        expect(response.statusCode).toBe(200);
      }
      expect(JSON.stringify(fixture.inputs.at(-1)?.conversationContext)).toContain("Cedro");
      const history = (
        await fixture.app.inject({
          url: route + "/chats/" + chatId + "/messages",
          headers: fixture.headers
        })
      ).json();
      expect(
        history.entries.flatMap((entry: { messages: unknown[] }) => entry.messages)
      ).toHaveLength(4);
      const other = randomUUID();
      await fixture.app.inject({
        method: "POST",
        url: route + "/chats",
        headers: fixture.headers,
        payload: { id: other, title: "Outro chat" }
      });
      await fixture.app.inject({
        method: "POST",
        url: route + "/questions",
        headers: fixture.headers,
        payload: { question: "Olá", chatId: other }
      });
      expect(fixture.inputs.at(-1)?.conversationContext?.turns ?? []).toHaveLength(0);
    } finally {
      await fixture.app.close();
    }
  });
});
