import type { AnalysisDocument } from "./document-analysis-reader.js";
import type { FinancialPeriod } from "./financial-analysis.js";
import type { StructuredFinancialEntry } from "../documents/structured/structured-document-contract.js";
import { extractStructuredDocument } from "../documents/structured/extract-structured-document.js";

/** Aceita somente declarações delimitadas; não interpreta negações ou menções incidentais. */
export function literalFinancialDeclarations(
  line: string
): readonly { field: string; value: string }[] {
  const results: { field: string; value: string }[] = [];
  for (const match of line.matchAll(
    /(?:^|[.;]\s+)Regime (?:de )?(caixa|compet[eê]ncia)(?=[.;]|$)/giu
  ))
    results.push({ field: "regime", value: match[1]! });
  for (const match of line.matchAll(
    /(?:^|[.;]\s+)Plano de contas ([\p{L}\p{N}][\p{L}\p{N}_/-]{0,63})(?=[.;]|$)/giu
  ))
    results.push({ field: "plano de contas", value: match[1]! });
  return results;
}

/** Mantém a extração original; retira do histórico apenas vencimentos futuros comprováveis. */
export function realizedHistoryEntries(
  document: AnalysisDocument,
  period: FinancialPeriod | null,
  entries: readonly StructuredFinancialEntry[]
): readonly StructuredFinancialEntry[] {
  if (period === null) return entries;
  const excluded = new Set<StructuredFinancialEntry>();
  for (const page of document.pages) {
    if (!Number.isFinite(page.qualityScore) || page.qualityScore < 0.7) continue;
    const pageEntries = new Map(
      entries
        .filter((entry) => entry.source.pageNumber === page.pageNumber)
        .map((entry) => [entry.source.startOffset, entry])
    );
    let scheduledPeriod: string | undefined;
    let offset = 0;
    for (const line of page.extractedText.split("\n")) {
      if (/^\s*(?:compromissos conhecidos de|obriga[cç][oõ]es (?:conhecidas )?de)\b/iu.test(line)) {
        const declared = extractStructuredDocument({
          ...document,
          pages: [{ ...page, extractedText: line }]
        }).financialPeriod;
        scheduledPeriod =
          declared.state === "known" && !/\be\b/iu.test(line)
            ? `${declared.year}-${String(declared.month).padStart(2, "0")}`
            : undefined;
      } else if (
        !/R\$/iu.test(line) &&
        /^\s*(?:\d+[.)]\s*)?(?:receitas\b|despesas\b|pagamentos\b|resumo da movimenta[cç][aã]o\b|composi[cç][aã]o por conta\b|inadimpl[eê]ncia\b|registro de fechamento\b)/iu.test(
          line
        )
      ) {
        scheduledPeriod = undefined;
      }
      const entry = pageEntries.get(offset);
      const date = entry?.originalLabel.match(/^(\d{2})\/(\d{2})\/(20\d{2})\s*[-:]/u);
      if (
        entry !== undefined &&
        date !== undefined &&
        date !== null &&
        scheduledPeriod !== undefined &&
        scheduledPeriod > period
      ) {
        const [, day, month, year] = date;
        const iso = `${year}-${month}-${day}`;
        const parsed = new Date(`${iso}T00:00:00Z`);
        if (
          Number.isFinite(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === iso &&
          `${year}-${month}` === scheduledPeriod
        )
          excluded.add(entry);
      }
      offset += Array.from(line).length + 1;
    }
  }
  return entries.filter((entry) => !excluded.has(entry));
}
