import { normalizeQueryText } from "../retrieval/retrieval-query.js";

type ResultRow = Readonly<{
  start: number;
  label: string;
  cells: readonly string[];
  headers: readonly string[];
  resultColumn: number;
}>;

/** Reconhece a coluna da mesma tabela; não calcula nem confirma seus valores. */
export function financialResultRows(
  section: string,
  includeOrdinary = false
): readonly ResultRow[] {
  const rows: ResultRow[] = [];
  let previous: string[] = [],
    headers: string[] = [],
    resultColumn = -1,
    width = 0,
    offset = 0;
  for (const line of section.split("\n")) {
    const row = line.trim(),
      start = offset + line.indexOf(row);
    offset += line.length + 1;
    if (!row.startsWith("|") || !row.endsWith("|")) {
      previous = [];
      headers = [];
      resultColumn = -1;
      continue;
    }
    const cells = row
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{3,}:?$/u.test(cell)) && cells.length === previous.length) {
      headers = previous.map((cell) =>
        normalizeQueryText(cell)
          .replaceAll(/[*_]/gu, "")
          .replace(/(?:[¹²³⁴⁵⁶⁷⁸⁹⁰]+|\[\^?\d+\])$/u, "")
          .trim()
      );
      resultColumn = headers.findIndex((cell) =>
        /^(?:resultado(?: do periodo| do mes| do trimestre| de caixa| acumulado| mensal| trimestral| financeiro)?|superavit|deficit)$/u.test(
          includeOrdinary ? cell.replace(/ ordinario$/u, "") : cell
        )
      );
      width = cells.length;
    } else if (resultColumn > 0 && cells.length === width) {
      rows.push(
        Object.freeze({
          start,
          label: cells[0]!.replaceAll(/[*_]/gu, "").trim(),
          cells: Object.freeze(cells),
          headers: Object.freeze([...headers]),
          resultColumn
        })
      );
    }
    previous = cells;
  }
  return Object.freeze(rows);
}
