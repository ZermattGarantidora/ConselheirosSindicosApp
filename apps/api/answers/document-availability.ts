import type { GeneratedAnswer } from "./answer-contract.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import { normalizeQueryText } from "../retrieval/retrieval-query.js";
import { literalSentences } from "./literal-sentences.js";

const quantities = [
  "um",
  "uma",
  "dois",
  "duas",
  "tres",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez"
];
const reference = `(?:(?:o|a|os|as|ao|aos|nenhum|nenhuma|esses|essas|estes|estas|seus|suas|${quantities.join("|")}|\\d+)\\s+)*(?:balancetes?|documentos?|arquivos?|anexos?)`;
// Qualificações de período, aprovação, leitura ou assunto ficam fora desta guarda.
const context =
  "(?:(?:para mim|para consulta|aqui|por aqui|nesta conversa|neste chat|na conversa|no chat|do condominio|enviados?|anexados?|recebidos?)\\s*)*";
const absencePatterns = [
  new RegExp(
    `\\bnao consigo (?:acessar|consultar|localizar)\\s+(${reference})\\s+para (?:conferir|analisar|ler|consultar|verificar)\\b`,
    "gu"
  ),
  new RegExp(
    `\\bnao (?:recebi|tenho(?: acesso)?|encontrei|localizei|consigo (?:acessar|consultar|localizar))\\s+(${reference})(?=\\s*${context}(?:[.!?;,]|$))`,
    "gu"
  ),
  new RegExp(
    `\\b(${reference})\\s+(?:(?:enviados|anexados|recebidos|que voce (?:enviou|anexou))\\s+)?nao (?:estao|esta|foram|foi) (?:disponiveis|disponivel|acessiveis|acessivel|recebidos|recebido|enviados|enviado|anexados|anexado)(?=\\s*${context}(?:[.!?;,]|$))`,
    "gu"
  )
];

function mentionedCount(reference: string): number {
  const tokens = reference.split(/\s+/u);
  const numeric = tokens.find((token) => /^\d+$/u.test(token));
  if (numeric !== undefined) return Math.max(1, Number(numeric));
  const word = tokens.find((token) => quantities.includes(token));
  if (word === undefined) return 1;
  return ["um", "uma"].includes(word)
    ? 1
    : ["dois", "duas"].includes(word)
      ? 2
      : quantities.indexOf(word) - 1;
}

/** Contradições explícitas de disponibilidade; não avalia suficiência do conteúdo. */
export function contradictsDocumentAvailability(
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[]
): boolean {
  const local = evidence.filter((source) => source.sourceScope !== "legislation");
  if (local.length === 0) return false;
  const sections = [
    generated.answer,
    ...generated.attentionPoints,
    generated.suggestedNextStep ?? ""
  ];
  return sections.some((section) =>
    literalSentences(normalizeQueryText(section).replaceAll(/[*_~]/gu, "")).some(({ text }) =>
      absencePatterns.some((pattern) =>
        [...text.matchAll(pattern)].some((match) => {
          // Relatos, hipóteses e citações de outra fala não são negações da assistente.
          if (
            /\b(?:se|caso|quando|disse|relatou|relato|exemplo)\b|["'“”]/u.test(
              text.slice(0, match.index)
            )
          )
            return false;
          const requested = match[1]!;
          const sources = /balancete/u.test(requested)
            ? local.filter((source) =>
                /\bbalancetes?\b/u.test(normalizeQueryText(source.documentTitle))
              )
            : local;
          return (
            new Set(sources.map((source) => source.documentId)).size >= mentionedCount(requested)
          );
        })
      )
    )
  );
}
