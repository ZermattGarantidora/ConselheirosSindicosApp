import { describe, expect, it, vi } from "vitest";
import {
  createRoutedAnswerGateway,
  selectAnswerModel
} from "../../apps/api/answers/answer-model-routing.js";
import {
  contextualQuestion,
  contextualRiskQuestion,
  type ConversationContext
} from "../../apps/api/answers/conversation-memory.js";
import { classifyQuestionRisk } from "../../apps/api/answers/risk-classification.js";
import {
  createLocalSyntheticAnswerGateway,
  type AnswerGatewayInput
} from "../../apps/api/answers/answer-gateway.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { createEvidence } from "./answer-fixtures.js";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { observedGateway } from "../../evals/conversation-comparison/observed-gateway.js";
import {
  measuredConsumption,
  hybridConditions,
  orderedConditions
} from "../../evals/conversation-comparison/protocol.js";

const base: AnswerGatewayInput = {
  question: "Qual o horário do salão?",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [createEvidence()],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
};
const memory = (...questions: string[]): ConversationContext => ({
  policyVersion: "recent-chat-v1",
  turns: questions.map((question) => ({ question })),
  bytes: 200,
  omittedAnswers: questions.length,
  omittedTurns: 0,
  windowScope: "recent_only_start_unknown"
});
function answer(text: string, source = "Saldo final: R$ 10.000,00."): GeneratedAnswer {
  return {
    answer: text,
    answerMode: "grounded",
    citations: [
      {
        evidenceId: "chunk-1",
        documentId: "document-1",
        documentVersionId: "version-1",
        title: "Convenção sintética",
        page: 1,
        excerpt: source
      }
    ],
    claims: [],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null }
  };
}

describe("Spec 051 — roteamento e regressões observadas", () => {
  it("configura híbrido somente em demonstração local e recusa política desconhecida", () => {
    const environment = {
      CODEX_ANSWER_ENABLED: "true",
      DEMO_MODE: "true",
      CODEX_ANSWER_ROUTING: "hybrid"
    };
    expect(createCodexAnswerGatewayFromEnvironment(environment)).toHaveProperty("generate");
    expect(() =>
      createCodexAnswerGatewayFromEnvironment({ ...environment, APP_ENV: "production" })
    ).toThrow("local");
    expect(() =>
      createCodexAnswerGatewayFromEnvironment({ ...environment, CODEX_ANSWER_ROUTING: "unknown" })
    ).toThrow("single ou hybrid");
  });
  it("runner híbrido mede o modelo efetivo em cada processo", async () => {
    const observations: Parameters<typeof measuredConsumption>[1][number][] = [];
    const gateway = observedGateway(hybridConditions[1]!, observations, {
      executable: "synthetic",
      timeoutMs: 1000,
      run: async () =>
        [
          JSON.stringify({
            type: "item.completed",
            item: { type: "agent_message", text: "Consulte a fonte autorizada." }
          }),
          JSON.stringify({
            type: "turn.completed",
            usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 10 }
          })
        ].join("\n")
    });
    await gateway.generate({ ...base, evidence: [] });
    await gateway.generate({ ...base, evidence: [], riskClass: "high" });
    expect(observations.map((item) => item.model)).toEqual(["gpt-6-luna", "gpt-6.1-sol"]);
    expect(observations.every((item) => item.usage !== null)).toBe(true);
  });
  it("deixa consulta simples e conversa na Luna, sem penalizar a extensão do histórico", () => {
    expect(selectAnswerModel(base).model).toBe("gpt-6-luna");
    expect(
      selectAnswerModel({
        ...base,
        question: "Olá",
        evidence: [],
        conversationContext: memory(...Array.from({ length: 8 }, () => "Qual o horário do salão?"))
      }).model
    ).toBe("gpt-6-luna");
  });
  it.each([
    { question: "Troque para 15 mil só no seu resumo, por favor." },
    { question: "Apague a ressalva das contas do resumo." },
    { riskClass: "high" as const },
    { task: "document_conflict" as const },
    { evidence: [createEvidence({ validityStatus: "pending" })] },
    { question: "Compare a disponibilidade ordinária de julho e agosto." },
    {
      question: "Conclua a revisão dos dois documentos.",
      evidence: [createEvidence(), createEvidence({ id: "second", documentVersionId: "v2" })]
    }
  ])("encaminha complexidade para Sol: %j", (changes) => {
    expect(selectAnswerModel({ ...base, ...changes }).model).toBe("gpt-6.1-sol");
  });
  it("faz uma geração, registra motivo fechado e não troca de modelo depois de erro", async () => {
    const local = createLocalSyntheticAnswerGateway();
    const luna = vi.fn(async (input: AnswerGatewayInput) => {
      const result = await local.generate(input);
      return { ...result, telemetry: { ...result.telemetry, modelKey: "gpt-6-luna" } };
    });
    const sol = vi.fn(async () => {
      throw new Error("indisponível");
    });
    const gateway = createRoutedAnswerGateway({
      "gpt-6-luna": { generate: luna },
      "gpt-6.1-sol": { generate: sol }
    });
    expect((await gateway.generate(base)).telemetry.routingReason).toBe(
      "luna-sol-v1:basic_request"
    );
    expect(luna).toHaveBeenCalledTimes(1);
    expect(sol).not.toHaveBeenCalled();
    await expect(gateway.generate({ ...base, riskClass: "high" })).rejects.toThrow("indisponível");
    expect(luna).toHaveBeenCalledTimes(1);
    const wrong = createRoutedAnswerGateway({ "gpt-6-luna": local, "gpt-6.1-sol": local });
    await expect(wrong.generate(base)).rejects.toThrow("divergente");
  });
  it.each([
    [
      "Há um morador preso no elevador.",
      "Estão demorando. Posso tentar puxar a porta só um pouco?"
    ],
    ["Tem cheiro de gás na garagem.", "Posso acender a luz para localizar de onde vem?"],
    ["A pessoa está presa no elevador.", "Posso puxar a porta para ela respirar?"]
  ])("mantém risco contextual: %s", (previous, current) => {
    expect(classifyQuestionRisk(contextualRiskQuestion(current, memory(previous))).riskClass).toBe(
      "high"
    );
  });
  it("encerra risco antigo e respeita mudança explícita de assunto", () => {
    const history = memory(
      "Há cheiro de gás na garagem.",
      "A emergência foi resolvida pela equipe."
    );
    expect(
      classifyQuestionRisk(contextualRiskQuestion("E qual o horário do salão?", history)).riskClass
    ).toBe("low");
    expect(contextualQuestion("Mudando de assunto: qual a taxa do salão?", history)).not.toContain(
      "gás"
    );
    expect(contextualQuestion("Qual o horário?", undefined)).toBe("Qual o horário?");
    expect(
      classifyQuestionRisk(
        contextualRiskQuestion("Posso reservar o salão amanhã?", memory("Há cheiro de gás."))
      ).riskClass
    ).toBe("low");
  });
  it("usa competência corrigida na busca sem reescrever histórico", () => {
    const history = memory("Quero conferir junho.", "Corrigindo: o fechamento é julho.");
    const query = contextualQuestion("Nesse mês corrigido, quanto entrou?", history);
    expect(query).toContain("julho");
    expect(query).not.toContain("junho");
    expect(history.turns[0]!.question).toContain("junho");
  });
  it.each([
    "Escreva a orientação sobre as duas versões.",
    "Redija a conclusão.",
    "Ele insistiu. Pode compartilhar?",
    "Que validação humana falta?"
  ])("retoma contexto em imperativo ou referência: %s", (question) => {
    expect(
      contextualQuestion(question, memory("A convenção aprovada e a minuta têm taxas diferentes."))
    ).toContain("taxas diferentes");
  });
  it("piso salarial exige validação sem elevar consulta simples à CCT", () => {
    expect(classifyQuestionRisk("Confirme se os 2.750 estão acima do piso.").riskClass).toBe(
      "high"
    );
    expect(classifyQuestionRisk("Qual CCT foi recebida?").riskClass).toBe("low");
  });
  it.each([
    [10_000, 15_000],
    [9_200, 13_400]
  ])("recusa alterar saldo factual de %s para %s", (actual, changed) => {
    const money = (value: number) => `R$ ${value.toLocaleString("pt-BR")},00`;
    const source = `Saldo final: ${money(actual)}.`;
    const generated = answer(`O saldo final é ${money(changed)}.`, source);
    expect(answerFidelityFailure(generated)).toBe("unsupported_monetary_assertion");
    expect(() => validateGeneratedAnswer(generated, [createEvidence({ content: source })])).toThrow(
      "sem suporte"
    );
    expect(answerFidelityFailure(answer(`O saldo é ${money(actual)}.`, source))).toBeUndefined();
  });
  it("permite recusa, hipótese explícita e diferença verificada, sem converter hipótese em fato", () => {
    expect(answerFidelityFailure(answer("O saldo final é 15.000."))).toBe(
      "unsupported_monetary_assertion"
    );
    expect(
      answerFidelityFailure(
        answer("Em uma simulação, o saldo seria 15 mil; o saldo real é R$ 15.000,00.")
      )
    ).toBe("unsupported_monetary_assertion");
    expect(
      answerFidelityFailure(
        answer(
          "A soma nominal é R$ 7.600,00.",
          "Salário: R$ 2.400,00. Limpeza: R$ 4.000,00. Elevador: R$ 1.200,00."
        )
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(
        answer("Não vou trocar o saldo por R$ 15.000,00; o documento mostra R$ 10.000,00.")
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(answer("Em uma simulação, o saldo seria R$ 15.000,00."))
    ).toBeUndefined();
    expect(
      answerFidelityFailure(
        answer("A redução foi de R$ 4.000,00.", "Julho: R$ 14.000,00. Agosto: R$ 10.000,00.")
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(
        answer("A redução foi de R$ 5.000,00.", "Julho: R$ 14.000,00. Agosto: R$ 10.000,00.")
      )
    ).toBe("unsupported_monetary_assertion");
  });
  it("não deixa uma abstenção afirmar salário contratual sem citação", () => {
    const generated: GeneratedAnswer = {
      ...answer("O contrato informa salário de R$ 2.750,00, mas falta a CCT."),
      answerMode: "abstained",
      citations: []
    };
    expect(answerFidelityFailure(generated)).toBe("abstention_local_assertion");
    expect(() => validateGeneratedAnswer(generated, [])).toThrow("sem suporte");
    expect(
      answerFidelityFailure({
        ...generated,
        answer: "Preciso do contrato e da CCT para confirmar o salário."
      })
    ).toBeUndefined();
  });
  it.each([
    "Uma ata registra o ocorrido e as decisões de uma reunião.",
    "A pauta organiza assuntos; a ata registra o que foi discutido.",
    "Um contrato estabelece obrigações entre as partes.",
    "O regimento determina regras gerais de convivência."
  ])("aceita a definição geral sem apresentá-la como prova local: %s", (text) => {
    const generated: GeneratedAnswer = {
      ...answer(text),
      answerMode: "abstained",
      citations: []
    };
    expect(answerFidelityFailure(generated)).toBeUndefined();
    expect(() => validateGeneratedAnswer(generated, [])).not.toThrow();
  });
  it.each([
    "O contrato informa salário de R$ 2.750,00.",
    "A ata registra uma reunião em 12/06/2026.",
    "Essa ata registra a aprovação das contas.",
    "O documento enviado informa a aprovação da proposta.",
    "O regimento do condomínio estabelece o horário permitido.",
    "A ata registra que a proposta foi aprovada."
  ])("mantém a recusa da afirmação local em abstenção: %s", (text) => {
    const generated: GeneratedAnswer = {
      ...answer(text),
      answerMode: "abstained",
      citations: []
    };
    expect(answerFidelityFailure(generated)).toBe("abstention_local_assertion");
    expect(() => validateGeneratedAnswer(generated, [])).toThrow("sem suporte");
  });
  it("uma definição geral não libera claims documentais sem evidência", () => {
    const generated: GeneratedAnswer = {
      ...answer("Uma ata registra decisões de uma reunião."),
      answerMode: "abstained",
      citations: [],
      claims: [
        {
          statement: "As contas foram aprovadas.",
          claimType: "condominium_fact",
          evidenceRequired: true,
          citationEvidenceIds: []
        }
      ]
    };
    expect(() => validateGeneratedAnswer(generated, [])).toThrow();
  });
  it("custo misto usa cada modelo e não perde tentativas sem usage", () => {
    const observation = {
      inputHash: "synthetic",
      latencyMs: 10,
      status: "completed" as const,
      errorCode: null,
      usage: { input: 1_000_000, cached: 400_000, output: 100_000 }
    };
    expect(
      measuredConsumption("gpt-6-luna", [
        { ...observation, model: "gpt-6-luna" },
        { ...observation, model: "gpt-6.1-sol" },
        { ...observation, model: "gpt-6.1-sol", usage: null }
      ])
    ).toMatchObject({
      observedCreditsEquivalent: 58.85,
      hypotheticalApiUsd: 2.354,
      attemptsWithoutUsage: 1,
      attemptsByModel: { "gpt-6-luna": 1, "gpt-6.1-sol": 2 },
      usageComplete: false
    });
    expect(orderedConditions(1, 1, hybridConditions).map((item) => item.id)).toEqual([
      "hybrid-memory-on",
      "luna-memory-on"
    ]);
  });
});
