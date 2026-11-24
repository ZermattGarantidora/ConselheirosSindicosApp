import { describe, expect, it, vi } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";

const source = createEvidence({ content: "Convenção FICTÍCIA: não há contrato com garantidora." });
const recommendation: GeneratedAnswer = {
  answer: "Compare o custo, as coberturas e as condições antes de escolher uma garantidora.",
  answerMode: "abstained",
  citations: [],
  claims: [
    {
      statement: "Compare o custo, as coberturas e as condições.",
      claimType: "recommendation",
      evidenceRequired: false,
      citationEvidenceIds: []
    }
  ],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
};
const request: AnswerGatewayInput = {
  question: "Qual garantidora você recomenda?",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [source],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
};
const documentary = structuredAnswer(
  JSON.stringify({
    ...recommendation,
    answer: "A convenção informa que não há contrato com garantidora.",
    answerMode: "grounded",
    citations: [{ evidenceId: source.id }],
    claims: [
      {
        statement: "Não há contrato com garantidora.",
        claimType: "condominium_fact",
        evidenceRequired: true,
        citationEvidenceIds: [source.id]
      }
    ]
  }),
  request
);

describe("AC-4601c/6607 — reparo de modo e citações", () => {
  it.each([
    { ...recommendation, answerMode: "grounded" as const },
    { ...recommendation, citations: documentary.citations }
  ])(
    "corrige incompatibilidade sem histórico, sem publicar a saída recusada: %#",
    async (invalid) => {
      const persistence = createInMemoryAnswerPersistence();
      const generate = vi
        .fn<
          (input: AnswerGatewayInput) => Promise<{
            output: GeneratedAnswer;
            telemetry: ReturnType<typeof createAnswerTelemetry>;
          }>
        >()
        .mockResolvedValueOnce({ output: invalid, telemetry: createAnswerTelemetry() })
        .mockResolvedValueOnce({ output: recommendation, telemetry: createAnswerTelemetry() });
      const useCase = createAnswerUseCase({
        retriever: { search: async () => createRetrievalResult([source]) },
        gateway: { generate },
        persistence,
        chatMemoryEnabled: false
      });
      const result = await useCase.ask(managerContext, {
        question: request.question,
        requestId: "recommendation-repair"
      });
      expect(result.answer).toContain("Compare o custo");
      expect(result.answer).not.toMatch(/validar|valida[cç][aã]o|n[aã]o consegui/iu);
      expect(result.answerMode).toBe("abstained");
      expect(result.citations).toEqual([]);
      expect(generate).toHaveBeenCalledTimes(2);
      const repair = generate.mock.calls[1]![0];
      expect(repair.validationFeedback).toBe("mode_citation_mismatch");
      expect(repair.evidence).toEqual([source]);
      expect(repair.conversationContext?.turns).toEqual([]);
      expect(repair.conversationContext?.bytes).toBeLessThanOrEqual(12000);
      expect(
        repair.conversationContext?.taskFocus?.validationContract?.repairInstruction
      ).toContain("grounded requires at least one");
      const saved = persistence.getInteraction(result.answerId)!;
      expect(saved.invocations.map((call) => [call.status, call.errorCode])).toEqual([
        ["failed", "mode_citation_mismatch"],
        ["completed", null]
      ]);
    }
  );

  it("duas respostas inválidas não expõem diagnóstico interno nem geram terceira chamada", async () => {
    const generate = vi.fn(async () => ({
      output: { ...recommendation, answerMode: "grounded" as const },
      telemetry: createAnswerTelemetry()
    }));
    const persistence = createInMemoryAnswerPersistence();
    const diagnostics = vi.fn();
    const result = await createAnswerUseCase({
      retriever: { search: async () => createRetrievalResult([source]) },
      gateway: { generate },
      persistence,
      onValidationFailure: diagnostics
    }).ask(managerContext, { question: request.question, requestId: "failed-repair" });
    expect(result.answer).toContain("não consegui concluir esta resposta");
    expect(
      JSON.stringify({
        answer: result.answer,
        points: result.attentionPoints,
        next: result.suggestedNextStep
      })
    ).not.toMatch(/validar|valida[cç][aã]o|reenv|mode_citation_mismatch/iu);
    expect(result.answerMode).toBe("abstained");
    expect(result.citations).toEqual([]);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(diagnostics).toHaveBeenCalledWith({ code: "mode_citation_mismatch", attemptCount: 2 });
    expect(
      persistence
        .getInteraction(result.answerId)!
        .invocations.map((call) => [call.status, call.errorCode])
    ).toEqual([
      ["failed", "mode_citation_mismatch"],
      ["failed", "mode_citation_mismatch"],
      ["skipped", "mode_citation_mismatch"]
    ]);
  });
});
