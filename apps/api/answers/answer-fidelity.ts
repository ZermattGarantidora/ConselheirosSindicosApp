import type { GeneratedAnswer } from "./answer-contract.js";
import { literalSentences } from "./literal-sentences.js";
import { monthNames } from "./documentary-dates.js";
import { financialResultRows } from "./financial-result-table.js";
import { implicitFinancialAmounts } from "./source-monetary-amounts.js";
import { financialArithmetic } from "./financial-arithmetic.js";
import {
  permitsIntegralAmount,
  type IntegralSumSummary
} from "../analysis/integral-document-sum.js";
import { hasUnprovenExecution } from "./documentary-execution.js";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();

function amounts(text: string): readonly number[] {
  const monetaryText = text.replaceAll(
    /\b((?:saldo|sal[aá]rio|taxa|pre[cç]o)(?: (?:final|anterior|mensal|ordin[aá]ri[oa]))?\s*(?:(?:e|é|era|de|:)\s*)?)(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?![\d,]|\s*(?:\/|%|horas?\b|dias?\b|meses?\b|anos?\b))/giu,
    (whole, prefix: string, value: string) =>
      /R\$/iu.test(prefix) ? whole : `${prefix}R$ ${value}`
  );
  return [
    ...monetaryText.matchAll(
      /R\$\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?(?:\s+mil\b)?|\b\d+(?:,\d+)?\s+mil\b/giu
    )
  ].map((match) => {
    const value = match[0]
      .replace(/R\$|\s|mil/giu, "")
      .replaceAll(".", "")
      .replace(",", ".");
    return Math.round(Number(value) * (/mil/iu.test(match[0]) ? 100_000 : 100));
  });
}
export const monetaryAmounts = amounts;

function qualified(text: string): boolean {
  const normalized = normalize(text).trim();
  const denialText = normalized.replaceAll(/[*_~]/gu, "");
  if (
    amounts(text).length === 1 &&
    /^(?:(?:estes|esses|os) (?:arquivos|documentos|trechos)|(?:estas|essas|as) fontes|(?:esta|essa|a) (?:convencao|ata)) nao (?:autorizam|autoriza|sustentam|sustenta|permitem|permite) (?:(?:aplicar|cobrar) (?:automaticamente )?|(?:a )?aplicacao (?:automatica )?(?:de )?)?(?:(?:uma|a) )?(?:multa|taxa|cobranca) de r\$\s*[\d.,]+(?: (?:proposta|sugerida|mencionada|indicada))?[.!]?$/u.test(
      denialText
    )
  )
    return true;
  // Relato não comprovado não é confirmação de valor. Limitar a uma menção
  // impede que a mesma cláusula esconda um segundo valor afirmado.
  if (
    amounts(text).length === 1 &&
    (/^(?:(?:o|a) )?(?:relato|afirmacao|alegacao|informacao) de que.{0,100}(?:seria|fosse).{0,45}nao (?:comprova|confirma|altera|muda)\b/u.test(
      normalized
    ) ||
      /^(?:(?:o|a) )?(?:relato|alegacao|informacao) (?:de|sobre) (?:um[ao]? |a |o )?(?:valor|saldo|taxa).{0,100}nao (?:comprova|confirma|altera|muda)\b/u.test(
        normalized
      ) ||
      /^(?:(?:o|a) )?(?:valor|saldo|taxa|informacao).{0,50}(?:mencionad[oa]|relatad[oa]|informad[oa]|dit[oa]|citad[oa]|alegad[oa]).{0,65}nao (?:comprova|confirma|altera|muda|demonstra|define)\b/u.test(
        normalized
      ) ||
      /^(?:(?:o|a) )?(?:mencao|referencia) (?:a|ao)\b[^;.]{0,100}\bnao (?:comprova|confirma|altera|muda|demonstra|define)\b/u.test(
        normalized
      ) ||
      /^(?:se houver|para confirmar|confira|verifique|confirme).{0,120}antes de (?:tratar|afirmar|usar|registrar|aplicar)\b/u.test(
        normalized
      ) ||
      /^para (?:confirmar|verificar|saber|conferir) se\b/u.test(normalized))
  )
    return true;
  if (amounts(text).length === 1) {
    if (
      /^(?:nao ha|nao existe) (?:evidencia|prova|comprovacao)[^,;.]{0,100}\b(?:taxa|saldo|valor|alteracao|mudanca)[^,;.]{0,50}r\$/u.test(
        normalized
      ) ||
      /^[^,;.]{0,65}\bnao (?:comprovam|comprova|confirmam|confirma|demonstram|demonstra)\b[^,;.]{0,55}(?:alteracao|mudanca|taxa|saldo|valor)[^,;.]{0,40}\b(?:para|de)\s*r\$/u.test(
        normalized
      ) ||
      /^(?:os? |as? )?(?:documentos?|trechos?|fontes?)[^,;.]{0,40}\bnao (?:confirmam|confirma|comprovam|comprova|demonstram|demonstra)\b[^,;.]{0,40}(?:alteracao|mudanca|taxa|saldo|valor)[^,;.]{0,40}\b(?:para|de)\s*r\$\s*[\d.,]+/u.test(
        normalized
      ) ||
      /^(?:r\$\s*[\d.,]+(?:\s+mil)?|[\d.,]+\s+mil)\s+nao (?:pode|deve) ser (?:apresentad[oa]|tratad[oa]|registrad[oa]) como (?:saldo|valor|taxa) (?:do |da |documentad|contratad|confirmad|vigente)/u.test(
        normalized
      ) ||
      /^nao (?:vou |posso |devo )?apresentar\b.{0,70}\bcomo (?:valor|saldo|taxa) (?:do |da |documentad)/u.test(
        normalized
      )
    )
      return true;
    const comma = /,(?!\d)/u.exec(text)?.index;
    // Só a menção dentro da condição é qualificada; a consequência não ganha passe.
    if (
      comma !== undefined &&
      amounts(text.slice(0, comma)).length === 1 &&
      /^(?:se|caso)\b.{0,120}(?:aprovad|registrad|formalizad|confirmad).{0,50},\s*(?:confira|verifique|confirme|consulte|solicite|peca)\b/u.test(
        normalized
      )
    )
      return true;
    if (
      /\b(?:anotar|anotad[oa]|registrar|registrad[oa]|mencionar|incluir)\b/u.test(normalized) &&
      /\bcomo (?:um |o )?(?:valor|ajuste|saldo) (?:informad[oa]|dit[oa]|relatad[oa]|mencionad[oa]) (?:pela pessoa|pelo usuario|por voce)\b/u.test(
        normalized
      ) &&
      /separad[oa]|sem atribui|sem substituir|sem confirmar/u.test(normalized) &&
      !/\b(?:confirmad[oa]|comprovad[oa]|vigente|efetiv[oa]|real)\b/u.test(normalized)
    )
      return true;
  }
  if (
    /\bnao (?:trocarei|alterarei|substituirei|mudarei|troco|altero|substituo|mudo)\s+(?:(?:o|esse|este|seu) (?:saldo|valor)|(?:para|por|de)\s*(?:r\$|\d)|r\$|\d)/u.test(
      normalize(text)
    )
  )
    return true;
  return /\b(?:hipotetic[oa]|hipotese|simulacao|exemplo|se fosse|supondo|nao (?:posso |vou |devo )?(?:alterar|trocar|confirmar|afirmar|registrar|usar)|nao e|sem confirmar)\b/u.test(
    normalize(text)
  );
}

function hasLocalSpecificity(text: string): boolean {
  return (
    /\d|R\$/u.test(text) ||
    /\b(?:est[ae]|ess[ae]|dest[ae]|dess[ae]|nest[ae]|ness[ae]|noss[oa])\s+(?:ata|contrato|balancete|convencao|regimento|documento)\b/u.test(
      text
    ) ||
    /\b(?:ata|contrato|balancete|convencao|regimento|documento)\b.{0,40}\b(?:enviad[oa]|anexad[oa]|recebid[oa]|apresentad[oa]|consultad[oa]|do condominio)\b/u.test(
      text
    ) ||
    /\bregistra que\b.{0,100}\b(?:foi|foram|houve|ficou|ficaram)\b/u.test(text)
  );
}

function hasAttributedQualitativeRule(sentence: string): boolean {
  const text = normalize(sentence);
  const recordedRule =
    /\b(?:os registros|as atas|os documentos|as fontes)\b([^.;]{0,40})\b(?:dizem|exigem|determinam|informam|registram)\b(.*)/u.exec(
      text
    );
  if (
    recordedRule &&
    (!/em geral|por definicao/u.test(text) ||
      /enviad|anexad|consultad|disponive|deste condominio|neste condominio/u.test(text)) &&
    !/\bnao\b/u.test(recordedRule[1]!) &&
    !qualified(recordedRule[0]) &&
    /condicao|analise|propostas|aprovacao|prazo|regras?/u.test(recordedRule[2]!)
  )
    return true;
  const attribution =
    /\b(?:convencao|regimento|documentos?|trechos?|fontes?|eles|elas)\b([^.;]{0,55})\b(?:informam|informa|preveem|preve|estabelecem|estabelece|determinam|determina|indicam|indica|dizem|diz)\b(.*)/u.exec(
      text
    );
  if (!attribution || /\bnao\b/u.test(attribution[1]!)) return false;
  if (
    /em geral|por definicao/u.test(text) &&
    !/enviad|anexad|consultad|disponive|deste condominio|neste condominio/u.test(text)
  )
    return false;
  return (
    !qualified(sentence) &&
    /rateio|cobranca|cota|taxa|mandato|horario|silencio|animais|regra|obrigacao|prazo/u.test(
      attribution[2]!
    ) &&
    /\be\b|\bdeve\b|igual|permitid|proibid|obrigatori|vigora/u.test(attribution[2]!)
  );
}

export type FidelityFailure =
  | "unproven_execution_assertion"
  | "unsupported_monetary_assertion"
  | "abstention_local_assertion"
  | "financial_result_scope_mismatch";

type PeriodResult = Readonly<{ index: number; revenue: number; expenses: number; result: number }>;

function financialPeriodResults(generated: GeneratedAnswer): readonly PeriodResult[] | undefined {
  const periods = new Map<number, { version: string; revenue: number; expenses: number }>();
  for (const citation of generated.citations) {
    if (citation.sourceScope === "legislation") continue;
    const text = normalize(citation.excerpt);
    const period = /competencia (\w+) de (\d{4})/u.exec(text);
    const revenue = /receitas(?: recebidas)?\s*:\s*(r\$\s*[\d.,]+)/u.exec(text);
    const expenses = /despesas(?: pagas)?\s*:\s*(r\$\s*[\d.,]+)/u.exec(text);
    const month = monthNames.findIndex((name) => name === period?.[1]);
    if (!period || !revenue || !expenses || month < 0) continue;
    const index = Number(period[2]) * 12 + month;
    const parsed = {
      version: citation.documentVersionId,
      revenue: amounts(revenue[1]!)[0]!,
      expenses: amounts(expenses[1]!)[0]!
    };
    const previous = periods.get(index);
    if (
      previous !== undefined &&
      (previous.version !== parsed.version ||
        previous.revenue !== parsed.revenue ||
        previous.expenses !== parsed.expenses)
    )
      return undefined;
    periods.set(index, parsed);
  }
  return [...periods.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, { revenue, expenses }]) => ({
      index,
      revenue,
      expenses,
      result: revenue - expenses
    }));
}

function zeroQuarterPeriods(
  periods: readonly PeriodResult[] | undefined
): readonly number[] | undefined {
  return periods?.length === 3 &&
    periods[2]!.index - periods[0]!.index === 2 &&
    periods.reduce((sum, { result }) => sum + result, 0) === 0
    ? periods.map(({ index }) => index)
    : undefined;
}

function matchesZeroMonth(label: string, periods: readonly PeriodResult[] | undefined): boolean {
  if (periods === undefined) return false;
  const text = normalize(label);
  const months = [...text.matchAll(new RegExp(`\\b(${monthNames.join("|")})\\b`, "gu"))].map(
    (match) => monthNames.findIndex((name) => name === match[1])
  );
  const years = [...text.replaceAll(/r\$\s*[\d.,]+/gu, "").matchAll(/\b\d{4}\b/gu)].map((match) =>
    Number(match[0])
  );
  if (months.length !== 1 || years.length > 1) return false;
  const matches = periods.filter(
    ({ index }) =>
      index % 12 === months[0] && (years.length === 0 || Math.floor(index / 12) === years[0])
  );
  return matches.length === 1 && matches[0]!.result === 0;
}

function matchesQuarterLabel(label: string, periods: readonly number[]): boolean {
  const normalized = normalize(label).replaceAll(/[ *_]/gu, " ").replaceAll(/\s+/gu, " ").trim();
  const namedMonths = [
    ...normalized.matchAll(new RegExp(`\\b(${monthNames.join("|")})\\b`, "gu"))
  ].map((match) => match[1]);
  const years = [...normalized.replaceAll(/r\$\s*[\d.,]+/gu, "").matchAll(/\b\d{4}\b/gu)].map(
    (match) => Number(match[0])
  );
  const first = periods[0]!,
    last = periods[2]!;
  const quarter = /\b(primeiro|segundo|terceiro|quarto|[1-4][ºo]?) trimestre\b/u.exec(normalized);
  if (quarter) {
    const ordinal = ["primeiro", "segundo", "terceiro", "quarto"].indexOf(quarter[1]!);
    const number = ordinal < 0 ? Number(quarter[1]![0]) : ordinal + 1;
    if (first % 12 !== (number - 1) * 3 || last - first !== 2) return false;
  }
  if (
    namedMonths.length > 0 &&
    !(
      (namedMonths.length === 2 &&
        namedMonths[0] === monthNames[first % 12] &&
        namedMonths[1] === monthNames[last % 12]) ||
      (namedMonths.length === 3 &&
        namedMonths.every((month, index) => month === monthNames[periods[index]! % 12]))
    )
  )
    return false;
  if (
    years.length > 0 &&
    (years.at(-1) !== Math.floor(last / 12) ||
      (years.length > 1 && years[0] !== Math.floor(first / 12)))
  )
    return false;
  return namedMonths.length >= 2 || /\b(?:trimestre|trimestral)\b/u.test(normalized);
}

function derivedFinancialTableRows(
  section: string,
  periods: readonly PeriodResult[] | undefined,
  sourceAmounts: readonly number[]
): ReadonlyMap<number, boolean> {
  const supported = new Map<number, boolean>();
  if (periods === undefined) return supported;
  const indexes = periods.map(({ index }) => index);
  const consecutiveQuarter = indexes.length === 3 && indexes[2]! - indexes[0]! === 2;
  for (const { cells, label, headers, resultColumn, start } of financialResultRows(section)) {
    const quarter =
      consecutiveQuarter &&
      /^(?:fechamento|total|trimestre)/u.test(normalize(label)) &&
      matchesQuarterLabel(label, indexes);
    const zeroMonth =
      new RegExp(`^(?:${monthNames.join("|")})(?: de \\d{4})?$`, "u").test(normalize(label)) &&
      matchesZeroMonth(label, periods);
    if (!quarter && !zeroMonth) continue;
    supported.set(
      start,
      cells.every((cell, index) => {
        const values = amounts(cell);
        if (values.length === 0) return true;
        const header = headers[index] ?? "";
        const field =
          index === resultColumn
            ? "result"
            : /^receitas(?: recebidas)?$/u.test(header)
              ? "revenue"
              : /^despesas(?: pagas)?$/u.test(header)
                ? "expenses"
                : undefined;
        if (field === undefined || (!quarter && field !== "result"))
          return values.every((value) => sourceAmounts.includes(value));
        if (values.length !== 1) return false;
        const expected = quarter ? periods.reduce((sum, period) => sum + period[field], 0) : 0;
        const actual = /[−-]\s*r\$|^\s*\(\s*r\$[\d.,\s]+\)\s*$/iu.test(
          cell.replaceAll(/[*_]/gu, "")
        )
          ? -values[0]!
          : values[0]!;
        return actual === expected;
      })
    );
  }
  return supported;
}

function quarterAggregateValue(
  sentence: string,
  value: number,
  periods: readonly PeriodResult[] | undefined
): boolean | undefined {
  if (
    periods?.length !== 3 ||
    periods[2]!.index - periods[0]!.index !== 2 ||
    !matchesQuarterLabel(
      sentence,
      periods.map(({ index }) => index)
    )
  )
    return undefined;
  const text = normalize(sentence).replaceAll(/[*_]/gu, "");
  const mentions = [
    ...text.matchAll(/r\$\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?(?:\s+mil\b)?/gu)
  ].filter((match) => amounts(match[0])[0] === value);
  if (!mentions.length) return undefined;
  const revenue = periods.reduce((sum, period) => sum + period.revenue, 0),
    expenses = periods.reduce((sum, period) => sum + period.expenses, 0);
  let recognized = false;
  const correct = mentions.every((match) => {
    const before = text.slice(Math.max(0, match.index - 85), match.index),
      after = text.slice(match.index + match[0].length);
    if (/[−-]\s*$/u.test(before)) {
      recognized = true;
      return false;
    }
    if (
      /receitas e despesas(?: do periodo| do trimestre)? (?:somam|somaram|totalizam|totalizaram)\s*$/u.test(
        before
      )
    ) {
      recognized = true;
      return value === revenue && value === expenses;
    }
    const role =
      /\b(receitas(?: recebidas)?|despesas(?: pagas)?|recebimentos|pagamentos)(?:\s+(?:do trimestre|totais|total|somam|somaram|totalizam|foram|de|sao)|\s*:)*\s*$/u.exec(
        before
      )?.[1] ??
      /^\s*(?:(?:de|em)\s+)?(receitas|despesas|recebimentos|pagamentos|recebidos|pagos)\b/u.exec(
        after
      )?.[1];
    if (role === undefined) return false;
    recognized = true;
    return value === (/receita|receb/u.test(role) ? revenue : expenses);
  });
  return recognized ? correct : undefined;
}

function annualContractDifference(
  generated: GeneratedAnswer,
  sentence: string,
  value: number
): boolean {
  const text = normalize(sentence);
  if (
    !/diferenca|acrescimo|impacto|a mais|adicionais/u.test(text) ||
    !/propost|hipotes|hipotet|\bse\b|\bcaso\b/u.test(text) ||
    /multa|saldo|indeniza|salario/u.test(text)
  )
    return false;
  const annual = /\b(?:12|doze)\s+meses\b|\banual\b|\bpor ano\b/u;
  const linked = [...sentence.matchAll(/R\$\s*[\d.,]+(?:\s+mil)?/giu)].some((match) => {
    if (amounts(match[0])[0] !== value) return false;
    const after = normalize(
      sentence.slice(match.index! + match[0].length, match.index! + match[0].length + 70)
    );
    const before = normalize(sentence.slice(Math.max(0, match.index! - 90), match.index));
    return (
      !/^\s*(?:mensais|mensal|por mes)/u.test(after) && (annual.test(after) || annual.test(before))
    );
  });
  if (!linked) return false;
  const prices = generated.citations
    .filter((c) => /contrato|aditivo/iu.test(c.title))
    .flatMap((c) =>
      literalSentences(c.excerpt)
        .filter((part) => /(?:pre[cç]o|valor)\s+(?:mensal|proposto)|mensalidade/iu.test(part.text))
        .flatMap((part) =>
          amounts(part.text).map((price) => ({
            document: c.documentId,
            version: c.documentVersionId,
            price
          }))
        )
    );
  return prices.some((left) =>
    prices.some(
      (right) =>
        left.document === right.document &&
        left.version !== right.version &&
        Math.abs(left.price - right.price) * 12 === value
    )
  );
}

/** Guarda limitada e determinística; não substitui revisão semântica de grounding. */
export function answerFidelityFailure(
  generated: GeneratedAnswer,
  computation?: IntegralSumSummary
): FidelityFailure | undefined {
  if (hasUnprovenExecution(generated)) return "unproven_execution_assertion";
  const sections = [
    generated.answer,
    ...generated.attentionPoints,
    generated.suggestedNextStep ?? ""
  ];
  const abstained = ["abstained", "failed"].includes(generated.answerMode);
  if (
    abstained &&
    sections.some((section) =>
      literalSentences(section)
        .flatMap(({ text }) => text.split(/;|\b(?:mas|por[eé]m|contudo)\b/iu))
        .some((sentence) => {
          const text = normalize(sentence);
          if (hasAttributedQualitativeRule(sentence)) return true;
          if (
            /\b(?:a|o|esta|este|essa|esse)\s+(?:convencao|contrato|documento|ata)\b.{0,65}\bconfirma\b.{0,45}\b(?:quantidade|taxa|valor|prazo|pagamento)\b/u.test(
              text
            ) &&
            !/nao.{0,30}(?:confirmar|afirmar|verificar)|em geral|por definicao/u.test(text)
          )
            return true;
          const recorded =
            /\b(?:o|a|este|esta|esse|essa)\s+(?:termo|ata|contrato|balancete|convencao|regimento|documento|relatorio|parecer)\b.{0,50}?\b(?:registra|registrou|determinou|informa|informou)\b(.*)/u.exec(
              text
            );
          if (
            !qualified(sentence) &&
            recorded &&
            /^\s*que (?:faltavam|faltam|houve|ha|foram|foi)\b/u.test(recorded[1]!) &&
            !/nao.{0,30}(?:confirmar|afirmar|verificar)/u.test(text.slice(0, recorded.index))
          )
            return true;
          return (
            !qualified(sentence) &&
            hasLocalSpecificity(text) &&
            !/nao (?:ha|tenho|consta|foi|encontrei|consegui)|falta|preciso|necessario|envie|enviar|solicite|verifique|confirme|consulte|para confirmar/u.test(
              text
            ) &&
            /(?:contrato|balancete|convencao|regimento|ata|documento|termo|relatorio|parecer).{0,65}(?:informa|informou|mostra|preve|estabelece|fixa|registra|registrou|consta|indica|determina|determinou)|(?:salario contratual|saldo documentado).{0,20}(?:e|de|:)/u.test(
              text
            )
          );
        })
    )
  )
    return "abstention_local_assertion";
  if (abstained) return undefined;
  const implicitAmounts = implicitFinancialAmounts(generated.citations);
  const sourceAmounts = [
    ...amounts(generated.citations.map((citation) => citation.excerpt).join("\n")),
    ...implicitAmounts
  ];
  const calculationAmounts = [...new Set(sourceAmounts)].slice(0, 64);
  const periodResults = financialPeriodResults(generated);
  const quarterPeriods = zeroQuarterPeriods(periodResults);
  const arithmetic = financialArithmetic(sections, sourceAmounts, generated.citations);
  if (arithmetic.invalid) return "unsupported_monetary_assertion";
  for (const section of [
    ...sections,
    ...(generated.claims ?? []).map((claim) => claim.statement)
  ]) {
    if (periodResults?.length || implicitAmounts.length > 0) {
      const ordinaryValues = generated.citations
        .flatMap((citation) => literalSentences(citation.excerpt))
        .filter((part) =>
          /(?:resultado|superavit|deficit|receitas|despesas).{0,20}ordinari/u.test(
            normalize(part.text)
          )
        )
        .flatMap((part) => amounts(part.text));
      if (
        financialResultRows(section, true).some(
          (row) =>
            /ordinario/u.test(row.headers[row.resultColumn]!) &&
            amounts(row.cells[row.resultColumn]!).some((value) => !ordinaryValues.includes(value))
        )
      )
        return "financial_result_scope_mismatch";
    }
    const derivedRows = derivedFinancialTableRows(section, periodResults, sourceAmounts);
    for (const { sentence, start } of literalSentences(section).flatMap(({ text, start }) =>
      text
        .split(/;|\b(?:mas|por[eé]m|contudo)\b/iu)
        .map((sentence) => ({ sentence, start: sentence === text ? start : -1 }))
    )) {
      if (qualified(sentence)) continue;
      const normalizedSentence = normalize(sentence);
      if (
        (periodResults?.length || implicitAmounts.length > 0) &&
        /(?:resultado|superavit|deficit)\s+(?:do caixa\s+)?ordinario/iu.test(normalizedSentence) &&
        amounts(sentence).length
      ) {
        const ordinarySources = generated.citations
          .flatMap((citation) => literalSentences(citation.excerpt))
          .map((part) => normalize(part.text))
          .filter((part) =>
            /(?:resultado|superavit|deficit|receitas|despesas).{0,20}ordinari/u.test(part)
          );
        if (
          !amounts(sentence).every((value) =>
            ordinarySources.some((part) => amounts(part).includes(value))
          )
        )
          return "financial_result_scope_mismatch";
      }
      if (derivedRows.get(start) === false) return "unsupported_monetary_assertion";
      for (const value of amounts(sentence)) {
        if (permitsIntegralAmount(computation, generated, sentence, value)) continue;
        if (sourceAmounts.includes(value)) continue;
        if (arithmetic.tableValues.get(sentence.trim())?.has(value)) continue;
        if (
          arithmetic.computed.has(value) &&
          !/taxa|multa|salario|ordinario|projecao|orcamento/u.test(normalize(sentence))
        )
          continue;
        if (annualContractDifference(generated, sentence, value)) continue;
        if (derivedRows.has(start)) {
          if (derivedRows.get(start)) continue;
          return "unsupported_monetary_assertion";
        }
        const aggregate = quarterAggregateValue(sentence, value, periodResults);
        if (aggregate === true) continue;
        if (aggregate === false) return "unsupported_monetary_assertion";
        if (
          value === 0 &&
          /resultado|superavit|deficit/u.test(normalize(sentence)) &&
          !sentence.includes("|") &&
          (matchesZeroMonth(sentence, periodResults) ||
            (quarterPeriods !== undefined && matchesQuarterLabel(sentence, quarterPeriods)))
        )
          continue;
        // Diferença aritmética explícita, com os dois operandos nos trechos citados.
        if (
          value !== 0 &&
          /diferenca|variacao|reducao|aumento|cresce|cresci|superavit|deficit|resultado|subiria|aumentaria|diminuiria|reduziria|cairia/u.test(
            normalize(sentence)
          ) &&
          calculationAmounts.some((left) =>
            calculationAmounts.some((right) => Math.abs(left - right) === value)
          )
        )
          continue;
        if (/soma|somad|total nominal|sao nominais/u.test(normalize(sentence))) {
          const unique = calculationAmounts;
          const possible = unique.some((left, i) =>
            unique.some(
              (right, j) =>
                i !== j &&
                (left + right === value ||
                  unique.some((third, k) => k !== i && k !== j && left + right + third === value))
            )
          );
          if (possible) continue;
        }
        return "unsupported_monetary_assertion";
      }
    }
  }
  return undefined;
}
