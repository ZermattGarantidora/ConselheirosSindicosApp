import { describe, expect, it } from "vitest";

import { answerPromptVersion, buildAnswerPrompt } from "../../apps/api/answers/prompt-catalog.js";
import { createEvidence } from "./answer-fixtures.js";

describe("catálogo de prompts", () => {
  it("AC-506: orienta a agente a usar português simples, cordial e pouco formal", () => {
    const prompt = buildAnswerPrompt({
      question: "Como devo avisar os moradores sobre uma manutenção?",
      task: "grounded_answer",
      riskClass: "low",
      evidence: []
    });

    expect(answerPromptVersion).toBe("answer-prompt-v15");
    expect(prompt).toContain("tom cordial, próximo e pouco formal");
    expect(prompt).toContain("palavras comuns, frases curtas e voz ativa");
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
    expect(prompt).toContain("Reserve atenção e próximo passo para abstenção, falha, conflito");
    expect(prompt).not.toContain("clara e impessoal");
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
});
