import { normalizeQueryText } from "../retrieval/retrieval-query.js";

export const monthNames = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
] as const;

/** Datas explícitas, sem resolver prazos relativos nem inferir vigência atual. */
export function documentaryDates(text: string): readonly string[] {
  const dates: { date: string; start: number }[] = [];
  function add(day: number, month: number, year: number, start: number) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
      dates.push({ date: date.toISOString().slice(0, 10), start });
  }
  const normalized = normalizeQueryText(text);
  for (const match of normalized.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/gu))
    add(Number(match[1]), Number(match[2]), Number(match[3]), match.index);
  for (const match of normalized.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/gu))
    add(Number(match[3]), Number(match[2]), Number(match[1]), match.index);
  for (const match of normalized.matchAll(/\b(\d{1,2}) de (\w+) de (\d{4})\b/gu)) {
    const month = monthNames.findIndex((name) => name === match[2]);
    if (month >= 0) add(Number(match[1]), month + 1, Number(match[3]), match.index);
  }
  return Object.freeze([
    ...new Set(dates.sort((left, right) => left.start - right.start).map(({ date }) => date))
  ]);
}
