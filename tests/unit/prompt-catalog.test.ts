import { describe, expect, it } from "vitest";

import {
  answerPromptVersion,
  buildAnswerPrompt,
  isBalanceteAnalysisRequest
} from "../../apps/api/answers/prompt-catalog.js";
import { createEvidence } from "./answer-fixtures.js";

describe("catálogo de prompts", () => {
  it("AC-5715: distingue registro, aprovação documentada e ausência de comprovação", () => {
    const prompt = buildAnswerPrompt({
      question: "O que este envio de convenção permite confirmar?",
      task: "grounded_answer",
      riskClass: "high",
      evidence: [
        createEvidence({
          content: "Convenção FICTÍCIA aprovada e subscrita. Registro não informado."
        })
      ]
    });
    expect(prompt).toContain("Diferencie aprovação e subscrição de registro em cartório");
    expect(prompt).toContain(
      "A ausência de registro, isoladamente, não comprova falta de vigência"
    );
    expect(prompt).toContain("não afirme que não ocorreram");
    expect(prompt).toContain("fonte oficial autorizada e verificável");
    expect(prompt).toContain("Convenção FICTÍCIA aprovada e subscrita. Registro não informado.");
  });

  it("AC-5714: comentário automático de convenção não vira análise financeira por cláusulas de rateio", () => {
    const prompt = buildAnswerPrompt({
      question: "Faça um comentário automático do arquivo recebido.",
      task: "grounded_answer",
      riskClass: "high",
      evidence: [
        createEvidence({ content: "Convenção FICTÍCIA: rateio das despesas e orçamento anual." })
      ]
    });
    expect(prompt).toContain("No comentário automático de um envio sem análise financeira");
    expect(prompt).toContain(
      "não introduza balancetes, comparações financeiras nem a ausência desses arquivos"
    );
    expect(prompt).toContain(
      "Uma convenção com regras de orçamento ou rateio não é, por isso, um balancete"
    );
    expect(prompt).not.toContain("Relacione os balancetes disponíveis usando somente");
  });

  it("AC-1701 a AC-1705: aplica a personalidade aprovada sem abrir mão dos limites documentais", () => {
    const prompt = buildAnswerPrompt({
      question: "Como devo avisar os moradores sobre uma manutenção?",
      task: "grounded_answer",
      riskClass: "low",
      evidence: []
    });

    expect(answerPromptVersion).toBe("answer-prompt-v29");
    expect(prompt).toContain("muito gente boa e presente na conversa");
    expect(prompt).toContain("Diga claramente o que está bom");
    expect(prompt).toContain("Diga claramente o que está ruim, confuso, incompleto ou arriscado");
    expect(prompt).toContain("de um a três próximos passos concretos");
    expect(prompt).toContain("Construa os dados do síndico e do condomínio aos poucos");
    expect(prompt).toContain(
      "Nunca invente fonte, citação, regra, valor, prazo, vigência ou decisão"
    );
    expect(prompt).toContain("Nunca execute ação externa");
    expect(prompt).toContain(
      "Use a legislação oficial recuperada quando for relevante e necessária"
    );
    expect(prompt).toContain("Cite lei ou documento apenas quando a fonte for necessária");
    expect(prompt).toContain("Os documentos relevantes são essenciais para conhecer o condomínio");
    expect(prompt).toContain("sem eles, fica difícil ajudar com precisão");
    expect(prompt).toContain("sem condicionar essa orientação a um upload");
    expect(prompt).not.toContain("nem precisa acontecer durante o cadastro inicial");
    expect(prompt).not.toContain("a pessoa pode enviá-lo depois");
    expect(prompt).not.toContain("documentos são opcionais");
    expect(prompt).toContain("Diferencie claramente legislação oficial de documento interno");
    expect(prompt).toContain("use até 90 palavras");
    expect(prompt).toContain("um ou dois detalhes úteis");
    expect(prompt).toContain("uma pergunta de ajuda específica sobre um ponto encontrado");
    expect(prompt).toContain("analise todos os arquivos efetivamente disponibilizados");
    expect(prompt).toContain("não diga que analisou tudo");
    expect(prompt).toContain("problema comprovável na convenção");
    expect(prompt).toContain("proponha uma solução proporcional");
    expect(prompt).toContain("Não use gírias, linguagem infantil");
    expect(prompt).toContain("juridiquês");
    expect(prompt).toContain("Dê a orientação útil logo na primeira frase");
    expect(prompt).toContain("no máximo três frases curtas ou dois passos");
    expect(prompt).toContain("deixe attentionPoints vazio e suggestedNextStep como null");
    expect(prompt).toContain("convenção vigente, completa e legível como a principal referência");
    expect(prompt).toContain("página ilegível, OCR incerto, trecho ausente ou versão conflitante");
    expect(prompt).toContain("PDF original completo, as páginas faltantes ou uma versão posterior");
    expect(prompt).toContain("Reserve atenção e próximo passo para abstenção, falha, conflito");
    expect(prompt).not.toContain("validação afetiva ou incentivo");
  });

  it("AC-2601 e AC-2703: interpreta a configuração como conversa e exige decisão estruturada", () => {
    const prompt = buildAnswerPrompt({
      question: JSON.stringify({
        stage: "manager_name",
        currentMessage: "Pode me dar um exemplo?"
      }),
      task: "setup_turn",
      riskClass: "low",
      evidence: []
    });

    expect(prompt).toContain("conversa normal");
    expect(prompt).toContain("resposta à pergunta atual, correção de um dado, dúvida");
    expect(prompt).toContain("não decida por uma lista de frases");
    expect(prompt).toContain("Responda somente com um objeto JSON válido");
    expect(prompt).toContain("manager_name, condominium_count, condominium_name, unit_count");
    expect(prompt).toContain('"currentMessage":"Pode me dar um exemplo?"');
    expect(prompt).toContain("enviar os documentos relevantes é essencial");
    expect(prompt).toContain("sem eles, fica difícil oferecer essa ajuda");
    expect(prompt).toContain("Convide a pessoa a enviar o material pela conversa");
    expect(prompt).toContain("sem minimizar sua importância, oferecer adiamento espontâneo");
    expect(prompt).toContain("A orientação geral permanece disponível");
    expect(prompt).not.toContain("não precisa enviar");
    expect(prompt).not.toContain("pode enviá-los aos poucos, depois");
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
    expect(prompt).toContain("use os dez pontos como método de análise");
    expect(prompt).toContain("sem transformar cada ponto em tópico obrigatório da fala");
    expect(prompt).toContain("Não imponha quantidade fixa de achados");
    expect(prompt).not.toContain("comece por até três achados prioritários e, depois, cubra");
    expect(prompt).toContain("valores de origem, a diferença absoluta");
    expect(prompt).toContain("Uma variação não prova irregularidade");
    expect(prompt).toContain("peça especificamente o balancete do período faltante");
    expect(prompt).toContain("Nunca afirme conciliação bancária sem extrato");
  });
});
