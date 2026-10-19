import type { DocumentExtractionMethod } from "../document-model.js";
import type {
  StructuredDocumentExtraction,
  StructuredDocumentKind,
  StructuredDocumentKindResult,
  StructuredFinancialEntry,
  StructuredFinancialPeriod,
  StructuredSourceReference,
  StructuredTable,
  StructuredTableRow
} from "./structured-document-contract.js";
import type { CondominiumId } from "../../core/condominium-scope.js";

export type StructuredExtractionPage = Readonly<{
  pageNumber: number;
  extractedText: string;
  extractionMethod: DocumentExtractionMethod;
  qualityScore: number;
}>;

const monthNumbers: Readonly<Record<string, number>> = Object.freeze({
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12
});

const kindPatterns: readonly Readonly<{ kind: StructuredDocumentKind; pattern: RegExp }>[] = [
  { kind: "financial_statement", pattern: /\bbalancete\b|\bprestação\s+de\s+contas\b/iu },
  {
    kind: "convention",
    pattern: /\bconven[cç][aã]o\s+(?:do|de)\s+condom[ií]nio\b|\bconven[cç][aã]o\s+condominial\b/iu
  },
  { kind: "internal_rules", pattern: /\bregimento\s+interno\b/iu },
  {
    kind: "meeting_minutes",
    pattern: /\bata\s+(?:da|de)\s+(?:assembleia|reuni[aã]o)\b|\bata\s+de\s+assembleia\b/iu
  },
  {
    kind: "contract",
    pattern: /\bcontrato\s+(?:de|para)\b|\bcontratante\b[\s\S]{0,400}\bcontratada\b/iu
  }
];

function source(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    page: StructuredExtractionPage;
    startOffset: number;
    endOffset: number;
    uncertainty?: readonly string[];
  }>
): StructuredSourceReference {
  const codePoints = Array.from(input.page.extractedText);
  const startOffset = Array.from(input.page.extractedText.slice(0, input.startOffset)).length;
  const endOffset = Array.from(input.page.extractedText.slice(0, input.endOffset)).length;
  const qualityUncertainty = pageQualityUncertainty(input.page);
  return Object.freeze({
    condominiumId: input.condominiumId,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    pageNumber: input.page.pageNumber,
    startOffset,
    endOffset,
    excerpt: codePoints.slice(startOffset, endOffset).join(""),
    extractionMethod: input.page.extractionMethod,
    uncertainty: Object.freeze([...qualityUncertainty, ...(input.uncertainty ?? [])])
  });
}

function pageQualityUncertainty(page: StructuredExtractionPage): readonly string[] {
  return !Number.isFinite(page.qualityScore) || page.qualityScore < 0.7
    ? Object.freeze(["A qualidade da página está abaixo do piso para fato estruturado."])
    : Object.freeze([]);
}

function unknownPeriod(): StructuredFinancialPeriod {
  return Object.freeze({ state: "unknown", year: null, month: null, source: null });
}

function findDocumentKind(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    pages: readonly StructuredExtractionPage[];
  }>
): StructuredDocumentKindResult {
  const matches: Array<
    Readonly<{ kind: StructuredDocumentKind; source: StructuredSourceReference }>
  > = [];
  for (const page of input.pages) {
    for (const rule of kindPatterns) {
      const match = rule.pattern.exec(page.extractedText);
      if (match?.index !== undefined) {
        matches.push(
          Object.freeze({
            kind: rule.kind,
            source: source({
              ...input,
              page,
              startOffset: match.index,
              endOffset: match.index + match[0].length
            })
          })
        );
      }
    }
  }
  const kinds = new Set(matches.map((match) => match.kind));
  if (kinds.size !== 1) {
    return Object.freeze({
      value: "unknown",
      state: kinds.size === 0 ? "unknown" : "needs_review",
      source: null
    });
  }
  const matched = matches[0];
  if (matched === undefined) throw new Error("Identificação documental inconsistente.");
  return Object.freeze({
    value: matched.kind,
    state: matched.source.uncertainty.length === 0 ? "known" : "needs_review",
    source: matched.source
  });
}

function findFinancialPeriod(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    pages: readonly StructuredExtractionPage[];
  }>
): StructuredFinancialPeriod {
  const candidates: Array<
    Readonly<{ year: number; month: number; source: StructuredSourceReference }>
  > = [];
  const pattern =
    /\b(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(20\d{2})\b|\b(0[1-9]|1[0-2])\/(20\d{2})\b/giu;
  for (const page of input.pages) {
    for (const match of page.extractedText.matchAll(pattern)) {
      const month =
        match[1] === undefined
          ? Number(match[3])
          : monthNumbers[match[1].toLocaleLowerCase("pt-BR")];
      const year = Number(match[2] ?? match[4]);
      if (month === undefined || !Number.isInteger(year)) continue;
      candidates.push(
        Object.freeze({
          year,
          month,
          source: source({
            ...input,
            page,
            startOffset: match.index,
            endOffset: (match.index ?? 0) + match[0].length
          })
        })
      );
    }
  }
  const periods = new Set(candidates.map((candidate) => `${candidate.year}-${candidate.month}`));
  if (periods.size !== 1)
    return Object.freeze({
      state: periods.size === 0 ? "unknown" : "needs_review",
      year: null,
      month: null,
      source: null
    });
  const period = candidates[0];
  if (period === undefined) return unknownPeriod();
  if (period.source.uncertainty.length > 0) {
    return Object.freeze({ state: "needs_review", year: null, month: null, source: period.source });
  }
  return Object.freeze({
    state: "known",
    year: period.year,
    month: period.month,
    source: period.source
  });
}

function parseBrazilianAmount(input: string): string | null {
  if (/[-()]/u.test(input)) return null;
  const normalized = input.replace(/\s/g, "").replace(/^R\$/iu, "");
  if (!/^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(normalized)) return null;
  const [whole, cents] = normalized.replaceAll(".", "").split(",");
  if (whole === undefined || cents === undefined) return null;
  return `${BigInt(whole) * 100n + BigInt(cents)}`;
}

type TableAssessment = Readonly<{
  tables: readonly StructuredTable[];
  unsafeLineOffsets: ReadonlySet<string>;
  multilineLabels: ReadonlyMap<string, Readonly<{ label: string; startOffset: number }>>;
}>;

function tableKey(pageNumber: number, offset: number): string {
  return `${pageNumber}:${offset}`;
}

function assessTables(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    pages: readonly StructuredExtractionPage[];
  }>
): TableAssessment {
  const tables: StructuredTable[] = [];
  const unsafeLineOffsets = new Set<string>();
  const multilineLabels = new Map<string, Readonly<{ label: string; startOffset: number }>>();
  for (const page of input.pages) {
    const lines = page.extractedText.split("\n");
    let offset = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (!line.includes("|")) {
        offset += line.length + 1;
        continue;
      }
      const group: Array<Readonly<{ text: string; offset: number }>> = [];
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        const text = lines[index] ?? "";
        group.push(Object.freeze({ text, offset }));
        offset += text.length + 1;
        index += 1;
      }
      index -= 1;
      const counts = group.map((item) => item.text.split("|").length);
      const cut =
        group.some((item) => /^\s*\||\|\s*$/u.test(item.text)) || new Set(counts).size !== 1;
      const rows: StructuredTableRow[] = group.map((item) => {
        let cellOffset = item.offset;
        const cells = item.text.split("|").map((raw) => {
          const leading = raw.length - raw.trimStart().length;
          const startOffset = cellOffset + leading;
          cellOffset += raw.length + 1;
          return Object.freeze({
            text: raw.trim(),
            source: source({
              ...input,
              page,
              startOffset,
              endOffset: startOffset + raw.trim().length
            })
          });
        });
        return Object.freeze({
          source: source({
            ...input,
            page,
            startOffset: item.offset,
            endOffset: item.offset + item.text.length
          }),
          cells: Object.freeze(cells)
        });
      });
      const tableSource = source({
        ...input,
        page,
        startOffset: group[0]!.offset,
        endOffset: group.at(-1)!.offset + group.at(-1)!.text.length,
        uncertainty: cut ? ["A tabela possui coluna cortada ou incompatível."] : []
      });
      tables.push(
        Object.freeze({
          state: cut ? "needs_review" : "known",
          source: tableSource,
          lines: Object.freeze(group.map((item) => item.text)),
          rows: Object.freeze(rows),
          warning: cut ? "A tabela parece cortada ou tem colunas inconsistentes." : null
        })
      );
      for (const item of group) {
        if (cut) unsafeLineOffsets.add(tableKey(page.pageNumber, item.offset));
      }
      const first = group[0];
      const prior = lines[index - group.length];
      if (
        !cut &&
        first !== undefined &&
        prior !== undefined &&
        !prior.includes("|") &&
        prior.trim().length > 0 &&
        /^[a-záàâãéêíóôõúç]/u.test(first.text.trim())
      ) {
        const priorOffset = first.offset - prior.length - 1;
        multilineLabels.set(
          tableKey(page.pageNumber, first.offset),
          Object.freeze({
            label: `${prior.trim()}\n${first.text.split("|")[0]?.trim() ?? ""}`,
            startOffset: priorOffset
          })
        );
      }
    }
  }
  return Object.freeze({ tables: Object.freeze(tables), unsafeLineOffsets, multilineLabels });
}

function extractFinancialEntries(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    pages: readonly StructuredExtractionPage[];
  }>,
  tableAssessment: TableAssessment
): Readonly<{
  entries: readonly StructuredFinancialEntry[];
  tables: readonly StructuredTable[];
  warnings: readonly string[];
}> {
  const entries: StructuredFinancialEntry[] = [];
  const tables: StructuredTable[] = [];
  const warnings: string[] = [];
  const moneyPattern =
    /(?:-\s*)?R\$\s*(?:-\s*)?(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?![\d,])/giu;
  for (const page of input.pages) {
    let offset = 0;
    for (const line of page.extractedText.split("\n")) {
      const lineKey = tableKey(page.pageNumber, offset);
      if (tableAssessment.unsafeLineOffsets.has(lineKey)) {
        offset += line.length + 1;
        continue;
      }
      const amounts = [...line.matchAll(moneyPattern)];
      const currencyMarkers = [...line.matchAll(/R\$/giu)].length;
      if (currencyMarkers !== amounts.length) {
        warnings.push("A linha contém valor monetário inválido ou incompleto e foi recusada.");
      } else if (amounts.length > 1) {
        tables.push(
          Object.freeze({
            state: "needs_review",
            source: source({
              ...input,
              page,
              startOffset: offset,
              endOffset: offset + line.length,
              uncertainty: ["A linha contém mais de um valor monetário."]
            }),
            lines: Object.freeze([line]),
            rows: Object.freeze([]),
            warning: "A associação entre rubrica e colunas não foi inferida."
          })
        );
      } else if (amounts.length === 1) {
        const amount = amounts[0];
        const start = amount?.index;
        const rawAmount = amount?.[0];
        if (start !== undefined && rawAmount !== undefined) {
          const inferredLabel = line
            .slice(0, start)
            .replace(/[\s:–|-]+$/u, "")
            .trim();
          const multiline = tableAssessment.multilineLabels.get(lineKey);
          const label = multiline?.label ?? inferredLabel;
          const isParenthesized =
            line.slice(0, start).trimEnd().endsWith("(") ||
            line
              .slice(start + rawAmount.length)
              .trimStart()
              .startsWith(")");
          const hasUnparsedSuffix = line.slice(start + rawAmount.length).trim().length > 0;
          const amountMinor =
            isParenthesized || hasUnparsedSuffix ? null : parseBrazilianAmount(rawAmount);
          if (label.length > 0 && !/^(sub)?total\b/iu.test(label) && amountMinor !== null) {
            entries.push(
              Object.freeze({
                originalLabel: label,
                originalAmount: rawAmount,
                amountMinor,
                currency: "BRL",
                source: source({
                  ...input,
                  page,
                  startOffset: multiline?.startOffset ?? offset,
                  endOffset: offset + line.length
                })
              })
            );
          } else {
            warnings.push(
              "Uma linha com valor monetário não tinha rubrica inequívoca ou continha sinal negativo."
            );
          }
        }
      }
      offset += line.length + 1;
    }
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    tables: Object.freeze(tables),
    warnings: Object.freeze(warnings)
  });
}

export function extractStructuredDocument(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    pages: readonly StructuredExtractionPage[];
  }>
): StructuredDocumentExtraction {
  const documentKind = findDocumentKind(input);
  const financialPeriod = findFinancialPeriod(input);
  const tableAssessment = assessTables(input);
  const financial = extractFinancialEntries(input, tableAssessment);
  const qualityWarnings = input.pages
    .filter((page) => pageQualityUncertainty(page).length > 0)
    .map((page) => `A página ${page.pageNumber} exige revisão por qualidade insuficiente.`);
  return Object.freeze({
    condominiumId: input.condominiumId,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    documentKind,
    financialPeriod,
    financialEntries: financial.entries,
    tables: Object.freeze([...tableAssessment.tables, ...financial.tables]),
    warnings: Object.freeze([...qualityWarnings, ...financial.warnings])
  });
}
