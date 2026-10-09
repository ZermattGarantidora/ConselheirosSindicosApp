import { describe, expect, it } from "vitest";

import {
  answerPromptVersion,
  buildAnswerPrompt,
  isBalanceteAnalysisRequest
} from "../../apps/api/answers/prompt-catalog.js";
import { createEvidence } from "./answer-fixtures.js";

describe("catálogo de prompts", () => {
  it("AC-1701 a AC-1705: aplica a personalidade aprovada sem abrir mão dos limites documentais", () => {
    const prompt = buildAnswerPrompt({
      question: "Como devo avisar os moradores sobre uma manutenção?",
      task: "grounded_answer",
      riskClass: "low",
      evidence: []
    });

    expect(answerPromptVersion).toBe("answer-prompt-v18");
    expect(prompt).toContain("muito gente boa e presente na conversa");
    expect(prompt).toContain("Diga claramente o que está bom");
    expect(prompt).toContain("Diga claramente o que está ruim, confuso, incompleto ou arriscado");
    expect(prompt).toContain("de um a três próximos passos concretos");
    expect(prompt).toContain("Construa os dados do síndico e do condomínio aos poucos");
    expect(prompt).toContain(
      "Nunca invente fonte, citação, regra, valor, prazo, vigência ou decisão"
    );
    expect(prompt).toContain("Nunca execute ação externa");
    expect(prompt).toContain("legislação oficial recuperada é a base principal");
    expect(prompt).toContain("Diferencie claramente legislação oficial de documento interno");
    expect(prompt).toContain("use até 90 palavras");
    expect(prompt).toContain("um ou dois detalhes úteis");
    expect(prompt).toContain("Não termine perguntando como pode ajudar");
    expect(prompt).toContain("Não use gírias, linguagem infantil");
    expect(prompt).toContain("juridiquês");
    expect(prompt).toContain("Dê a orientação útil logo na primeira frase");
    expect(prompt).toContain("no máximo três frases curtas ou dois passos");
    expect(prompt).toContain("deixe attentionPoints vazio e suggestedNextStep como null");
    expect(prompt).toContain("Documentos nunca são pré-requisito para começar a conversa");
    expect(prompt).toContain("Reserve atenção e próximo passo para abstenção, falha, conflito");
    expect(prompt).not.toContain("validação afetiva ou incentivo");
  });

  it("AC-411: exige resposta formulada sobre a evidência e permite abstenção de trecho tangencial", () => {
    const prompt = buildAnswerPrompt({
      question: "Qual regra vale para barulho?",
      task: "grounded_answer",
      riskClass: "high",
      evidence: [createEvidence({ content: "A ata registra apenas a pintura da garagem." })]
    });

    expect(prompt).toContain("verifique se eles realmente respondem à pergunta");
    expect(prompt).toContain("escreva uma resposta natural e própria para a pergunta");
    expect(prompt).toContain("Em cada citação, informe somente o evidenceId");
    expect(prompt).toContain("até dois detalhes diretamente úteis");
    expect(prompt).toContain("condição, prazo, exceção ou consequência");
    expect(prompt).toContain("não acrescente texto apenas para aumentar o tamanho");
    expect(prompt).toContain("itens forem apenas tangenciais");
    expect(prompt).toContain("answerMode abstained");
  });

  it("AC-028: limita perguntas sociais a uma frase curta", () => {
    const prompt = buildAnswerPrompt({
      question: "Como vai?",
      task: "grounded_answer",
      riskClass: "low",
      evidence: []
    });

    expect(prompt).toContain("somente com uma frase curta e natural");
    expect(prompt).toContain("sem lista, risco, alerta, fonte");
    expect(prompt).not.toContain("Dê a orientação útil logo na primeira frase");
  });

  it("AC-2201 e AC-2202: orienta um raio-X financeiro somente para pedido de balancete", () => {
    const prompt = buildAnswerPrompt({
      question: "Faça um raio-x do balancete de setembro.",
      task: "grounded_answer",
      riskClass: "high",
      evidence: [createEvidence({ content: "Saldo final: R$ 10.000,00." })]
    });

    expect(isBalanceteAnalysisRequest("Analise o balancete de setembro")).toBe(true);
    expect(isBalanceteAnalysisRequest("Como comunicar uma obra?")).toBe(false);
    expect(prompt).toContain("Raio-X do mês");
    expect(prompt).toContain("até três achados prioritários");
    expect(prompt).toContain("‘ok’, ‘atenção’ ou ‘não foi possível verificar’");
    expect(prompt).toContain("valores de origem, a diferença absoluta");
    expect(prompt).toContain("Uma variação não prova irregularidade");
    expect(prompt).toContain("peça especificamente o balancete do período faltante");
    expect(prompt).toContain("Nunca afirme conciliação bancária sem extrato");
  });
});
