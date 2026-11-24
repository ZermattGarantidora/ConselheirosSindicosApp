import type { GeneratedAnswer } from "./answer-contract.js";
import { literalSentences } from "./literal-sentences.js";
const normalize = (text: string) => text.normalize("NFD").replaceAll(/\p{M}/gu, "").toLowerCase();
function completedEvents(text: string): string[] {
  const result: string[] = [];
  for (const { text: sentence } of literalSentences(normalize(text))) {
    for (const clause of sentence.split(/;|\b(?:mas|porem|contudo)\b/u)) {
      if (
        /\b(?:nao|sem comprova|se |caso |hipotetic|supondo|para confirmar|para verificar)\b/u.test(
          clause
        )
      )
        continue;
      for (const match of clause.matchAll(
        /\b(?:o|a|os|as)\s+(piloto|obra|servico)s?\b[^.;!?\n]{0,55}?\b(?:ocorreu|ocorreram|aconteceu|aconteceram|foi realizad[oa]|foram realizad[oa]s|foi executad[oa]|foram executad[oa]s|foi concluid[oa]|foram concluid[oa]s|estava concluid[oa]|terminou|terminaram)\b/gu
      ))
        result.push(match[1]!);
    }
  }
  return result;
}
/** Guarda lexical limitada: planejamento não confirma execução. Não é verificação semântica geral. */
export function hasUnprovenExecution(generated: GeneratedAnswer): boolean {
  const claimed = completedEvents(
    [generated.answer, ...generated.attentionPoints, generated.suggestedNextStep ?? ""].join("\n")
  );
  const excerpts = generated.citations.map((citation) => normalize(citation.excerpt));
  return claimed.some(
    (event) =>
      excerpts.some(
        (text) =>
          new RegExp("\\b" + event + "s?\\b", "u").test(text) &&
          /\b(?:previst|previsao|sera|devera|aprovad|autorizacao|nao comprova)/u.test(text)
      ) && !excerpts.some((text) => completedEvents(text).includes(event))
  );
}
/** Remove apenas referência decorativa isolada; fontes verificáveis ficam no contrato de citações. */
export function cleanTrailingSourceMarker(answer: string, hasCitations: boolean): string {
  if (!hasCitations) return answer;
  return answer
    .replace(
      /(?<=[.!?])(?:[ \t]+|\n)【(?:Ata|Conven[cç][aã]o|Regimento|Balancete|Contrato|Relat[oó]rio|Fonte)\b[^【】.!?\n]{0,120}】[ \t]*$/iu,
      ""
    )
    .trimEnd();
}
