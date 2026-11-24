import { monthNames } from "./documentary-dates.js";
import { normalizeQueryText } from "../retrieval/retrieval-query.js";
import type { GeneratedCitation } from "./answer-contract.js";

const number = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?!\d|,|\.\d)`;
const money = String.raw`[+−-]?\s*R\$\s*${number}`;
const side = `${money}(?:\\s*[+−-]\\s*R\\$\\s*${number})*`;
const clean = (text: string) => text.replaceAll(/[*_]/gu, "");
function cells(text: string): readonly number[] {
  return [...text.matchAll(new RegExp(`([+−-]?)\\s*R\\$\\s*(${number})`, "gu"))].map((match) => {
    const minor = Number(match[2]!.replaceAll(".", "").replace(",", ""));
    return match[1] === "-" || match[1] === "−" ? -minor : minor;
  });
}
const total = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);
type Statement = Readonly<{
  month: number;
  year: number;
  version: string;
  revenue: number;
  expenses: number;
  result: number;
}>;
function statements(citations: readonly GeneratedCitation[]): readonly Statement[] {
  const result: Statement[] = [];
  for (const citation of citations) {
    if (citation.sourceScope === "legislation") continue;
    const text = normalizeQueryText(citation.excerpt);
    const period = new RegExp(`\\b(${monthNames.join("|")}) de (\\d{4})\\b`, "u").exec(
      text.slice(0, 500)
    );
    const summary =
      /saldo anterior entradas saidas resultado do mes saldo final\s*\n([^\n]+)/u.exec(text);
    if (!period || !summary || /[-(]\s*\d/u.test(summary[1]!)) continue;
    const row = [...summary[1]!.matchAll(new RegExp(number, "gu"))].map((match) =>
      Number(match[0].replaceAll(".", "").replace(",", ""))
    );
    if (
      row.length !== 5 ||
      !row.every(Number.isSafeInteger) ||
      row[1]! - row[2]! !== row[3] ||
      row[0]! + row[3]! !== row[4]
    )
      continue;
    result.push({
      month: monthNames.findIndex((name) => name === period[1]),
      year: Number(period[2]),
      version: citation.documentVersionId,
      revenue: row[1]!,
      expenses: row[2]!,
      result: row[3]!
    });
  }
  const unique = new Map<number, Statement>();
  for (const row of result) {
    const key = row.year * 12 + row.month,
      previous = unique.get(key);
    if (
      previous &&
      (previous.version !== row.version ||
        previous.revenue !== row.revenue ||
        previous.expenses !== row.expenses)
    )
      return [];
    unique.set(key, row);
  }
  return [...unique.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
const field = (header: string) =>
  /^(?:entradas|receitas)$/u.test(header)
    ? "revenue"
    : /^(?:saidas|despesas)$/u.test(header)
      ? "expenses"
      : /^resultado(?: do mes)?$/u.test(header)
        ? "result"
        : undefined;

/** Provas aritméticas fechadas, com operandos citados e sem avaliar código do modelo. */
export function financialArithmetic(
  sections: readonly string[],
  sourceAmounts: readonly number[],
  citations: readonly GeneratedCitation[] = []
): Readonly<{
  invalid: boolean;
  computed: ReadonlySet<number>;
  tableValues: ReadonlyMap<string, ReadonlySet<number>>;
}> {
  const known = new Set(sourceAmounts);
  const computed = new Set<number>();
  const tableValues = new Map<string, ReadonlySet<number>>();
  const periods = statements(citations);
  if (sections.some((section) => new RegExp(`=\\s*${money}\\s*=`, "u").test(clean(section))))
    return { invalid: true, computed, tableValues };
  const equations = sections.flatMap((section) => [
    ...clean(section).matchAll(new RegExp(`(${side})\\s*=\\s*(${side})`, "gu"))
  ]);
  for (const equation of equations) {
    const left = cells(equation[1]!),
      right = cells(equation[2]!);
    if (
      left.length > 8 ||
      right.length > 8 ||
      ![...left, ...right, total(left), total(right)].every(Number.isSafeInteger) ||
      total(left) !== total(right)
    )
      return { invalid: true, computed, tableValues };
  }
  for (let round = 0; round < equations.length; round++) {
    for (const equation of equations) {
      const left = cells(equation[1]!),
        right = cells(equation[2]!);
      for (const [operands, result] of [
        [left, right],
        [right, left]
      ] as const) {
        if (
          operands.length < 2 ||
          result.length !== 1 ||
          !operands.every((value) => known.has(Math.abs(value)))
        )
          continue;
        const value = Math.abs(result[0]!);
        known.add(value);
        computed.add(value);
      }
    }
  }
  for (const section of sections) {
    let headers: string[] = [];
    let previousCells: string[] = [];
    let prior: { month: number; values: readonly (number | undefined)[] } | undefined;
    const monthRows: { month: number; values: readonly (number | undefined)[] }[] = [];
    for (const raw of section.split("\n")) {
      const line = clean(raw).trim();
      if (!line.startsWith("|") || !line.endsWith("|")) {
        headers = [];
        previousCells = [];
        prior = undefined;
        monthRows.length = 0;
        continue;
      }
      const row = line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
      if (row.every((cell) => /^:?-{3,}:?$/u.test(cell)) && row.length === previousCells.length) {
        headers = previousCells.map(normalizeQueryText);
        previousCells = row;
        continue;
      }
      previousCells = row;
      if (row.length !== headers.length || headers.length < 2) continue;
      const month = monthNames.findIndex((name) =>
        new RegExp(`^${name}(?: de)?(?: \\d{4})?$`, "u").test(normalizeQueryText(row[0]!))
      );
      const values = row.map((cell) => (cells(cell).length === 1 ? cells(cell)[0] : undefined));
      if (month >= 0) {
        const year = /\b(\d{4})$/u.exec(row[0]!);
        const matching = periods.filter(
          (item) => item.month === month && (!year || item.year === Number(year[1]))
        );
        if (
          periods.length &&
          matching.length !== 1 &&
          headers.some((header) => field(header) !== undefined)
        )
          return { invalid: true, computed, tableValues };
        if (matching.length === 1)
          for (let column = 1; column < headers.length; column++) {
            const key = field(headers[column]!);
            if (key && values[column] !== undefined && values[column] !== matching[0]![key])
              return { invalid: true, computed, tableValues };
          }
        const difference = headers.findIndex((header) => /^diferenca/u.test(header));
        if (
          difference > 1 &&
          prior &&
          month === prior.month + 1 &&
          values[difference] !== undefined
        ) {
          const current = values[difference - 1],
            previous = prior.values[difference - 1];
          if (
            current !== undefined &&
            previous !== undefined &&
            known.has(Math.abs(current)) &&
            known.has(Math.abs(previous))
          ) {
            if (values[difference] !== current - previous)
              return { invalid: true, computed, tableValues };
            tableValues.set(raw.trim(), new Set([Math.abs(values[difference]!)]));
            computed.add(Math.abs(values[difference]!));
          }
        }
        prior = { month, values };
        monthRows.push(prior);
        if (
          difference > 1 &&
          monthRows.length === 3 &&
          monthRows[2]!.month - monthRows[0]!.month === 2
        ) {
          const first = monthRows[0]!.values[difference - 1],
            last = values[difference - 1];
          if (
            first !== undefined &&
            last !== undefined &&
            known.has(Math.abs(first)) &&
            known.has(Math.abs(last))
          )
            computed.add(Math.abs(last - first));
        }
      } else if (
        /^total(?: do periodo| dos tres meses)?$/u.test(normalizeQueryText(row[0]!)) &&
        monthRows.length === 3 &&
        monthRows[2]!.month - monthRows[0]!.month === 2 &&
        monthRows[1]!.month === monthRows[0]!.month + 1
      ) {
        const accepted = new Set<number>();
        for (let column = 1; column < headers.length; column++) {
          if (
            !/^(?:entradas|saidas|receitas|despesas|resultado(?: do mes)?|rendimentos financeiros|contribuicoes ao fundo de reserva)$/u.test(
              headers[column]!
            )
          )
            continue;
          const operands = monthRows.map((item) => item.values[column]);
          const actual = values[column];
          if (
            actual === undefined ||
            operands.some((value) => value === undefined || !known.has(Math.abs(value)))
          )
            continue;
          if (total(operands as number[]) !== actual)
            return { invalid: true, computed, tableValues };
          accepted.add(Math.abs(actual));
          computed.add(Math.abs(actual));
        }
        tableValues.set(raw.trim(), accepted);
      }
    }
  }
  return { invalid: false, computed, tableValues };
}
