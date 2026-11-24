import type { AnswerPayload } from "./answer-contract.js";
import { documentaryDates } from "./documentary-dates.js";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/[*_~]/gu, "")
    .replaceAll(/(\d)[º°]/gu, "$1");
/** Verifica somente a comparação explícita mandato/posse versus assembleia. Não resolve cronologias ambíguas. */
export function hasContradictoryTemporalOrder(
  question: string,
  answer: Pick<AnswerPayload, "answer" | "citations">
): boolean {
  const relation =
    /\b(?:mandato|posse)\b.{0,80}\b(antes|depois)\b.{0,60}\b(?:assembleia|eleicao)\b/u.exec(
      normalize(question)
    );
  const verdict = /^(?:[\p{L}][\p{L} ]{1,50},\s*)?(sim|nao)\b/u.exec(
    normalize(answer.answer).trim()
  );
  if (!relation || !verdict) return false;
  let start: string | undefined;
  let assembly: string | undefined;
  for (const clause of normalize(answer.answer).split(/[.;\n]|,\s*|\s+e\s+(?:o|a)\s+/u)) {
    const dates = documentaryDates(clause);
    if (dates.length !== 1) continue;
    if (
      /\b(?:mandato|posse)\b/u.test(clause) &&
      /\b(?:comeca|inicio|inicia|iniciou)\b/u.test(clause)
    )
      start = dates[0];
    else if (/\b(?:assembleia|eleicao)\b/u.test(clause)) assembly = dates[0];
  }
  if (!start || !assembly) return false;
  const citedDates = new Set(
    answer.citations.flatMap((citation) => documentaryDates(normalize(citation.excerpt)))
  );
  if (!citedDates.has(start) || !citedDates.has(assembly)) return false;
  const expected = relation[1] === "antes" ? start < assembly : start > assembly;
  return (verdict[1] === "sim") !== expected;
}
