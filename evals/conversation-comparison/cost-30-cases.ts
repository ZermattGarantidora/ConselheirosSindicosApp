import { conversationCases, type ConversationCase } from "../conversations/dataset.js";

const general = [
  ["Bom dia, Alvitra!", "Cumprimentar naturalmente e oferecer ajuda sem inventar dados locais."],
  [
    "Como posso organizar minha semana como síndico?",
    "Orientação prática de agenda e prioridades sem alegar obrigações locais não comprovadas."
  ],
  [
    "Me ajude a escrever um lembrete cordial para economizar água.",
    "Produzir um lembrete cordial sem inventar consumo, multa ou regra local."
  ],
  [
    "Que informações devo separar antes de pedir um orçamento de pintura?",
    "Pedir escopo, áreas, estado e prazos, sem inventar metragem ou orçamento."
  ],
  [
    "Como preparar uma pauta objetiva para conversar com a administradora?",
    "Sugerir organização dos assuntos, responsáveis e pendências sem inventar decisões."
  ],
  [
    "Explique de forma simples a diferença entre receita e despesa.",
    "Explicar entradas e gastos com exemplo identificado, sem apresentar valor fictício como fato do condomínio."
  ]
].map(([question, expected], i): ConversationCase => ({
  id: `COST-general-${String(i + 1).padStart(2, "0")}`,
  topic: "duties",
  title: question!,
  kind: "general",
  priority: "P1",
  requiredReviewers: ["síndico"],
  turns: [{ question: question!, expected: expected!, documents: [], legalLibrary: false }]
}));

// Amostra pré-fixada: seis cenários por grupo. Não selecionar após ver respostas.
export const cost30Groups = Object.freeze({
  general: general.map((c) => c.id),
  documentary: [1, 2, 3, 4, 6, 7].map((i) => `CONV-conventions-${String(i).padStart(2, "0")}`),
  financial: [1, 2, 3, 5, 6, 9].map((i) => `CONV-financial-${String(i).padStart(2, "0")}`),
  abstentionConflict: [
    "CONV-conventions-08",
    "CONV-conventions-09",
    "CONV-conventions-10",
    "CONV-financial-11",
    "CONV-contracts-05",
    "CONV-handover-03"
  ],
  continuity: [
    "CONV-financial-15",
    "CONV-duties-15",
    "CONV-meetings-15",
    "CONV-conventions-15",
    "CONV-contracts-15",
    "CONV-handover-15"
  ]
});
const available = [...general, ...conversationCases];
export const cost30Cases: readonly ConversationCase[] = Object.freeze(
  Object.values(cost30Groups)
    .flat()
    .map((id) => {
      const testCase = available.find((c) => c.id === id);
      if (!testCase) throw new Error("Caso da amostra de custo ausente.");
      return testCase;
    })
);
