import { describe, expect, it } from "vitest";
import {
  createLocalSyntheticAnswerGateway,
  type AnswerGatewayInput
} from "../../apps/api/answers/answer-gateway.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import {
  validateTaskCoverage,
  withAnswerTaskFocus
} from "../../apps/api/answers/answer-task-context.js";
import type { ConversationContext } from "../../apps/api/answers/conversation-memory.js";
import { syntheticAgendaAnswer } from "../../apps/api/answers/synthetic-agenda.js";
import { createEvidence } from "./answer-fixtures.js";

function request(question: string, turns: ConversationContext["turns"] = []): AnswerGatewayInput {
  const memory: ConversationContext = {
    policyVersion: "recent-chat-v1",
    turns,
    bytes: 0,
    omittedAnswers: 0,
    omittedTurns: 4,
    windowScope: "recent_only_start_unknown"
  };
  return {
    question,
    evidence: [],
    task: "grounded_answer",
    riskClass: "low",
    budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 },
    conversationContext: withAnswerTaskFocus(question, memory, []) ?? memory
  };
}

describe("AC-6005e — pautas no gateway sintético", () => {
  it.each(["Conferência do jardim", "Revisão dos elevadores"])(
    "retoma título e pendência recentes sem depender do benchmark: %s",
    async (title) => {
      const input = request("Feche a pauta corrigida sem afirmar decisões.", [
        { question: "Use apenas Título anterior para a pauta." },
        { question: `Correção do título: use apenas ${title}.` },
        { question: "Acrescente um tópico para conferir as versões discordantes." }
      ]);
      const result = await createLocalSyntheticAnswerGateway().generate(input);
      expect(result.output.answer).toContain(title);
      expect(result.output.answer).not.toContain("Título anterior");
      expect(result.output.answer).toMatch(/versões.*(?:confer|pend)|confer.*versões/u);
      expect(result.output.answer).toContain("rascunho");
      expect(() => validateTaskCoverage(input, result.output)).not.toThrow();
      expect(validateGeneratedAnswer(result.output, []).answerMode).toBe("abstained");
      expect(result.output.attentionPoints).toEqual([]);
      expect(result.output.suggestedNextStep).toBeNull();
    }
  );

  it("retoma somente um rascunho geral que ainda está na janela", async () => {
    const input = request("Finalize a pauta corrigida.", [
      {
        question: "Retome a pauta.",
        answer: "Rascunho — Revisão do telhado\n1. Documentos a conferir."
      },
      { question: "Inclua a conferência das versões como pendência." }
    ]);
    const result = await createLocalSyntheticAnswerGateway().generate(input);
    expect(result.output.answer).toContain("Revisão do telhado");
    expect(input.conversationContext!.turns).toHaveLength(2);
    expect(input.conversationContext!.bytes).toBeLessThanOrEqual(12000);
  });

  it("pede o título ausente sem inventar memória ou procurar documentos", async () => {
    const result = await createLocalSyntheticAnswerGateway().generate(
      request("Feche a pauta corrigida.")
    );
    expect(result.output.answer).toMatch(/confirme.*título|qual.*título/iu);
    expect(result.output.answer).not.toContain("Reunião de conferência");
    expect(result.output.citations).toEqual([]);
  });

  it("não usa o rascunho para responder a uma regra documental ou alterar o cadastro", async () => {
    const input = request("Qual é a multa por ruído?", [
      { question: "Correção do título: use apenas Inspeção mensal." }
    ]);
    const result = await createLocalSyntheticAnswerGateway().generate(input);
    expect(result.output.answer).not.toContain("Inspeção mensal");
    expect(result.output).toMatchObject({ answerMode: "abstained", citations: [] });
  });

  it("uma correção sem novo título não reutiliza o rótulo anterior", async () => {
    const result = await createLocalSyntheticAnswerGateway().generate(
      request("Correção do título da pauta: descarte o título anterior.", [
        { question: "Retome a pauta.", answer: "Rascunho — Nome antigo\n1. Pendências." }
      ])
    );
    expect(result.output.answer).not.toContain("Nome antigo");
    expect(result.output.answer).toContain("confirme o título");
  });

  it("não substitui análise com fontes, setup, risco alto ou rascunho de outra tarefa", () => {
    const input = request("Feche a pauta.");
    for (const other of [
      { ...input, evidence: [createEvidence({ content: "FICTÍCIO. Assunto da pauta." })] },
      { ...input, task: "setup_turn" as const },
      { ...input, riskClass: "high" as const },
      request("Prepare um rascunho de comunicado sobre limpeza."),
      request("A pauta já foi aprovada?"),
      request("Qual documento comprova a aprovação da pauta?")
    ])
      expect(syntheticAgendaAnswer(other)).toBeUndefined();
  });
});
