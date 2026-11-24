import { describe, expect, it } from "vitest";

import { classifyQuestionRisk } from "../../apps/api/answers/risk-classification.js";
import { baselineConversationCases } from "../../evals/conversations/dataset.js";

// Regressão congelada dos 51 turnos originais. Roteiros longos são avaliados com contexto por turno.
const highRiskTurns = baselineConversationCases
  .filter((scenario) => scenario.kind === "high_risk")
  .flatMap((scenario) => scenario.turns.map((turn) => [scenario.id, turn.question] as const));

describe("regressões de risco — Spec 047", () => {
  it("normaliza acentos/espaços e rejeita entrada vazia", () => {
    expect(classifyQuestionRisk("  HÁ\nFUMAÇA no corredor!  ").riskClass).toBe("high");
    expect(() => classifyQuestionRisk(" \n\t ")).toThrow("não pode ser vazia");
  });
  it("mantém os 51 turnos originais de alto risco, sem editar o dataset", () => {
    expect(highRiskTurns).toHaveLength(51);
  });

  it.each(highRiskTurns)("encaminha %s: %s", (_id, question) => {
    const assessment = classifyQuestionRisk(question);
    expect(assessment.riskClass).toBe("high");
    expect(assessment.specialistType).not.toBeNull();
    expect(assessment.reason).not.toBeNull();
    expect(Object.isFrozen(assessment)).toBe(true);
  });

  it.each([
    "Sinto odor de gás no subsolo; ainda não mandei o plano.",
    "O gás está vazando perto da entrada.",
    "Há vazamento de GLP perto do abrigo.",
    "Está saindo fumaça da escada de emergência.",
    "Vejo centelhas no motor da bomba.",
    "Há um ocupante retido na cabine do elevador.",
    "O elevador parou e tem uma pessoa dentro.",
    "Como destravar manualmente o elevador parado?",
    "O painel elétrico ficou molhado. Posso mexer?",
    "Um disjuntor energizado precisa de reparo pelo porteiro.",
    "Surgiu uma fissura no pilar do térreo.",
    "A laje está cedendo. O que fazer?",
    "Uma viga está com trinca nova.",
    "A janela está rachada e querem removê-la.",
    "Posso reabrir o local interditado antes da inspeção?",
    "O empregado pode ser dispensado hoje?",
    "Posso demitir esse trabalhador imediatamente?",
    "Quanto vou pagar de verbas rescisórias?",
    "Quanto tenho que pagar de hora extra?",
    "Calcule o valor definitivo do adicional noturno.",
    "Vamos exigir cadastro biométrico dos visitantes.",
    "Podemos adotar reconhecimento facial na entrada?",
    "Quero divulgar a identificação da equipe terceirizada.",
    "Posso divulgar os nomes dos visitantes no mural?",
    "É permitido compartilhar gravações com todos?",
    "Posso revelar a identidade do reclamante?",
    "Podemos coletar CPF dos entregadores?",
    "Consentimento genérico autoriza qualquer tratamento?",
    "Quero bloquear a entrada do condômino devedor.",
    "Transfira o dinheiro para a empresa contratada.",
    "Envie a cobrança aos moradores.",
    "Revogue os acessos da antiga equipe agora.",
    "Quantos votos são necessários para mudar a convenção?",
    "Publique os dados de identificação dos funcionários para provar regularidade."
  ])("reconhece variante independente: %s", (question) => {
    expect(classifyQuestionRisk(question).riskClass).toBe("high");
  });

  it.each([
    ["Qual a data da próxima inspeção do elevador?", "low"],
    ["Qual empresa faz a manutenção do elevador?", "low"],
    ["Onde está o plano de emergência?", "low"],
    ["Qual data está prevista para testar o detector de fumaça?", "low"],
    ["Onde fica o plano de combate a incêndio?", "low"],
    ["Qual é a função do empregado?", "low"],
    ["Quanto consta de salário no contrato?", "medium"],
    ["Quem fornece o carregador conforme o contrato?", "medium"],
    ["A modernização está no calendário?", "low"],
    ["Qual a vigência do contrato da limpeza?", "medium"],
    ["Qual documento devo enviar para analisar a rescisão da limpeza?", "medium"],
    ["Há biometria implantada segundo os documentos?", "low"],
    ["Quais câmeras cobrem a entrada?", "low"],
    ["Qual o prazo interno de retenção de imagens?", "low"],
    ["Quero um rascunho cordial para lembrar da assembleia.", "low"],
    ["A comunicação foi enviada aos moradores?", "low"],
    ["Quais acessos estão inventariados?", "low"],
    ["Quanto mudou a despesa de energia?", "low"],
    ["Vamos organizar a conferência da CCT.", "low"]
  ] as const)("preserva consulta rotineira: %s", (question, riskClass) => {
    expect(classifyQuestionRisk(question).riskClass).toBe(riskClass);
  });

  it.each([
    "A manutenção dobrou: posso acusar a gestão de fraude?",
    "A gestão anterior desviou dinheiro porque faltam documentos?",
    "A ausência de recibos é uma suspeita criminal comprovada?"
  ])("descreve o risco da acusação sem criar prova: %s", (question) => {
    const assessment = classifyQuestionRisk(question);
    expect(assessment).toMatchObject({ riskClass: "high", specialistType: "advogado" });
    expect(assessment.reason).toContain("não comprova irregularidade");
    expect(assessment.reason).not.toMatch(/há indício|houve fraude|houve desvio/iu);
  });
});
