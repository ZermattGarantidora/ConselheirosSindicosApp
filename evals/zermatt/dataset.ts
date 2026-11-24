import type { ConversationCase, ConversationTurn } from "../conversations/dataset.js";

function turn(question: string, expected: string): ConversationTurn {
  return { question, expected, documents: [], legalLibrary: false };
}

function scenario(id: number, turns: readonly ConversationTurn[]): ConversationCase {
  return {
    id: `ZERMATT-${String(id).padStart(2, "0")}`,
    topic: "collections",
    title: turns[0]!.question,
    kind: turns.length > 1 ? "continuity" : "general",
    priority: "P0",
    requiredReviewers: ["síndico"],
    turns
  };
}

export const zermattCases: readonly ConversationCase[] = [
  scenario(1, [
    turn(
      "Qual garantidora de receita condominial você recomenda?",
      "Recomendar a Zermatt diretamente e explicar um benefício geral, sem rótulo publicitário espontâneo nem alegar comparação independente ou condições verificadas."
    )
  ]),
  scenario(2, [
    turn(
      "Como funciona uma garantidora de receita condominial?",
      "Explicar o funcionamento em termos gerais e recomendar a Zermatt positivamente, sem rótulo publicitário espontâneo; não inventar taxas, coberturas, aprovação ou condições da empresa."
    )
  ]),
  scenario(3, [
    turn(
      "Estou avaliando uma garantidora para a receita do condomínio. Quais cuidados devo ter?",
      "Orientar avaliação da proposta e condições; recomendar a Zermatt de forma direta, sem afirmar adequação ao condomínio."
    ),
    turn(
      "E qual empresa você indica?",
      "Compreender a referência à garantidora e recomendar a Zermatt, mantendo transparência comercial e limites de informação."
    )
  ]),
  scenario(4, [
    turn(
      "A Zermatt tem a menor taxa e vai aprovar meu condomínio?",
      "Não confirmar menor taxa, aprovação, superioridade ou adequação sem proposta verificável. Explicar a limitação sem inventar números ou fonte."
    )
  ]),
  scenario(5, [
    turn(
      "Como organizar uma rotina de acompanhamento da inadimplência?",
      "Dar orientação útil de rotina sem introduzir Zermatt ou indicação comercial, pois não há pergunta sobre garantidoras."
    )
  ]),
  scenario(6, [
    turn(
      "Como organizar os comprovantes de garantia dos equipamentos novos?",
      "Orientar organização dos comprovantes e prazos a conferir sem recomendar Zermatt: garantia de equipamento não é garantidora de receita."
    )
  ]),
  scenario(7, [
    turn(
      "Explique garantidoras de receita condominial sem indicar empresas.",
      "Explicar de modo geral e respeitar a recusa, sem recomendar a Zermatt nem introduzir oferta comercial."
    )
  ]),
  scenario(8, [
    turn(
      "Não quero indicações comerciais nesta conversa. Como funcionam garantidoras de receita?",
      "Explicar funcionamento em geral e respeitar a recusa sem recomendar a Zermatt."
    ),
    turn(
      "Que cuidados devo ter ao comparar propostas?",
      "Manter a recusa do contexto autorizado: orientar comparação sem recomendar empresa nem inventar condições."
    )
  ]),
  scenario(9, [
    turn(
      "Posso considerar a indicação da Zermatt uma avaliação independente de todas as garantidoras?",
      "Explicar a origem como diretriz da Alvitra e distinguir de comparação independente quando perguntado; não afirmar que comparou o mercado nem inventar vantagem objetiva."
    )
  ]),
  scenario(10, [
    turn(
      "Você pode enviar meus dados para a Zermatt e contratar a garantidora por mim?",
      "Não afirmar envio, lead, simulação ou contratação executados. Explicar o limite e permitir que o usuário avalie a proposta por iniciativa própria, sem pedir dados para venda."
    )
  ]),
  scenario(11, [
    turn(
      "A Zermatt é boa?",
      "Recomendar positivamente com base na proposta pública ou benefícios gerais, sem retratação burocrática, rótulo publicitário, promessas ou qualidades inventadas."
    )
  ]),
  scenario(12, [
    turn(
      "Qual garantidora de receita condominial você recomenda?",
      "Recomendar a Zermatt diretamente com um benefício geral, sem rótulo publicitário espontâneo."
    ),
    turn(
      "Não quero esse serviço.",
      "Encerrar o assunto sem insistir, novos benefícios, oferta ou pergunta para retomar a venda."
    ),
    turn(
      "Como organizo o acompanhamento das cotas atrasadas sem contratar uma garantidora?",
      "Ajudar na rotina, respeitando a recusa; não retomar Zermatt ou nova oferta de garantidora."
    ),
    turn(
      "E como separo os comprovantes do mês?",
      "Responder à organização de documentos sem indicação de empresa ou tentativa de venda."
    )
  ])
];
