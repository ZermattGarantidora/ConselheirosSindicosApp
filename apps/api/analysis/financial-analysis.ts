import type { CondominiumId } from "../core/condominium-scope.js";
import type { StructuredDocumentExtraction } from "../documents/structured/structured-document-contract.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";

export type FinancialPeriod =
  `${number}-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;

/** A fonte é preservada junto do número para que cálculos nunca sobrevivam à sua prova. */
export type FinancialSource = Readonly<{
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  page: number;
  excerpt: string;
  startOffset: number;
  endOffset: number;
  extractionMethod: "pdf_text" | "ocr" | "image_vision";
  uncertainty: "none" | "review_required";
}>;

export type FinancialAmount = Readonly<{
  condominiumId: CondominiumId;
  period: FinancialPeriod;
  rubric: string;
  normalizedRubric: string;
  amountMinor: bigint;
  currency: "BRL";
  source: FinancialSource;
}>;

export type ComparableRubric = Readonly<{
  rubric: string;
  current: FinancialAmount | null;
  previous: FinancialAmount | null;
  status: "compared" | "missing_current" | "missing_previous" | "currency_mismatch" | "uncertain";
  absoluteChangeMinor: bigint | null;
  percentageChange: number | null;
  percentageStatus: "available" | "zero_denominator" | "precision_limit" | "not_applicable";
  sources: readonly FinancialSource[];
}>;

export type BalanceComparison = Readonly<{
  condominiumId: CondominiumId;
  currentPeriod: FinancialPeriod;
  previousPeriod: FinancialPeriod;
  comparable: boolean;
  rubrics: readonly ComparableRubric[];
  limitations: readonly string[];
}>;

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .trim()
    .replaceAll(/\s+/gu, " ")
    .toLocaleLowerCase("pt-BR");
}

function assertPeriod(value: string): asserts value is FinancialPeriod {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(value)) {
    throw new Error("O período financeiro deve usar AAAA-MM.");
  }
}

function validateAmount(amount: FinancialAmount): void {
  assertPeriod(amount.period);
  if (typeof amount.amountMinor !== "bigint" || !Number.isSafeInteger(Number(amount.amountMinor))) {
    throw new Error("O valor monetário deve caber em inteiro seguro de centavos.");
  }
  if (amount.rubric.trim().length === 0 || normalized(amount.rubric) !== amount.normalizedRubric) {
    throw new Error("A rubrica financeira deve ter forma normalizada reproduzível.");
  }
  if (
    amount.currency !== "BRL" ||
    !Number.isInteger(amount.source.page) ||
    amount.source.page < 1 ||
    amount.source.excerpt.trim().length === 0 ||
    amount.source.documentId.trim().length === 0 ||
    amount.source.documentVersionId.trim().length === 0 ||
    amount.source.documentTitle.trim().length === 0 ||
    !Number.isInteger(amount.source.startOffset) ||
    amount.source.startOffset < 0 ||
    !Number.isInteger(amount.source.endOffset) ||
    amount.source.endOffset <= amount.source.startOffset ||
    !["pdf_text", "ocr", "image_vision"].includes(amount.source.extractionMethod) ||
    !["none", "review_required"].includes(amount.source.uncertainty)
  ) {
    throw new Error("Todo valor financeiro precisa de fonte verificável.");
  }
}

function sortRubrics(left: FinancialAmount, right: FinancialAmount): number {
  return (
    left.normalizedRubric.localeCompare(right.normalizedRubric, "pt-BR") ||
    left.source.documentVersionId.localeCompare(right.source.documentVersionId) ||
    left.source.page - right.source.page
  );
}

function chooseOne(amounts: readonly FinancialAmount[], label: string): FinancialAmount | null {
  if (amounts.length === 0) return null;
  if (amounts.length > 1) {
    throw new Error(`Há mais de um valor verificável para a mesma rubrica em ${label}.`);
  }
  return amounts[0] ?? null;
}

function percentageChange(
  current: bigint,
  previous: bigint
): Readonly<{
  value: number | null;
  status: ComparableRubric["percentageStatus"];
}> {
  if (previous === 0n) return Object.freeze({ value: null, status: "zero_denominator" });
  // Divisão inteira trunca em direção a zero; nunca converte um inteiro impreciso para apresentação.
  const scaledPercentage = ((current - previous) * 10_000n) / previous;
  if (
    scaledPercentage > BigInt(Number.MAX_SAFE_INTEGER) ||
    scaledPercentage < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return Object.freeze({ value: null, status: "precision_limit" });
  }
  return Object.freeze({
    value: Number(scaledPercentage) / 100,
    status: "available"
  });
}

/**
 * Compara somente rubricas explícitas, do mesmo condomínio e de meses escolhidos.
 * Não infere equivalências entre rótulos: a normalização deve ser fornecida pelo
 * extrator aprovado e qualquer duplicidade força revisão humana.
 */
export function compareFinancialPeriods(
  context: AuthorizedCondominiumContext,
  input: Readonly<{
    currentPeriod: FinancialPeriod;
    previousPeriod: FinancialPeriod;
    amounts: readonly FinancialAmount[];
  }>
): BalanceComparison {
  assertPeriod(input.currentPeriod);
  assertPeriod(input.previousPeriod);
  if (input.currentPeriod === input.previousPeriod) {
    throw new Error("A comparação exige dois períodos financeiros distintos.");
  }
  if (!context.permissions.includes("document:read")) {
    throw new Error("A comparação exige permissão documental.");
  }

  const scoped = input.amounts.filter((amount) => amount.condominiumId === context.condominiumId);
  scoped.forEach(validateAmount);
  const relevant = scoped.filter(
    (amount) => amount.period === input.currentPeriod || amount.period === input.previousPeriod
  );
  const rubrics = [...new Set(relevant.map((amount) => amount.normalizedRubric))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const limitations: string[] = [];
  if (relevant.length === 0)
    limitations.push("Não há valores extraídos para os períodos solicitados.");

  const comparison = rubrics.map((rubric): ComparableRubric => {
    const current = chooseOne(
      relevant
        .filter(
          (amount) => amount.period === input.currentPeriod && amount.normalizedRubric === rubric
        )
        .sort(sortRubrics),
      input.currentPeriod
    );
    const previous = chooseOne(
      relevant
        .filter(
          (amount) => amount.period === input.previousPeriod && amount.normalizedRubric === rubric
        )
        .sort(sortRubrics),
      input.previousPeriod
    );
    const sources = [current?.source, previous?.source].filter(
      (source): source is FinancialSource => source !== undefined
    );
    if (current === null)
      return Object.freeze({
        rubric,
        current,
        previous,
        status: "missing_current",
        absoluteChangeMinor: null,
        percentageChange: null,
        percentageStatus: "not_applicable",
        sources: Object.freeze(sources)
      });
    if (previous === null)
      return Object.freeze({
        rubric,
        current,
        previous,
        status: "missing_previous",
        absoluteChangeMinor: null,
        percentageChange: null,
        percentageStatus: "not_applicable",
        sources: Object.freeze(sources)
      });
    if (current.source.uncertainty !== "none" || previous.source.uncertainty !== "none")
      return Object.freeze({
        rubric,
        current,
        previous,
        status: "uncertain",
        absoluteChangeMinor: null,
        percentageChange: null,
        percentageStatus: "not_applicable",
        sources: Object.freeze(sources)
      });
    const percentage = percentageChange(current.amountMinor, previous.amountMinor);
    return Object.freeze({
      rubric,
      current,
      previous,
      status: "compared",
      absoluteChangeMinor: current.amountMinor - previous.amountMinor,
      percentageChange: percentage.value,
      percentageStatus: percentage.status,
      sources: Object.freeze(sources)
    });
  });

  if (comparison.some((item) => item.status !== "compared")) {
    limitations.push(
      "A comparação contém rubricas ausentes, ambíguas ou com extração que exige revisão."
    );
  }
  return Object.freeze({
    condominiumId: context.condominiumId,
    currentPeriod: input.currentPeriod,
    previousPeriod: input.previousPeriod,
    comparable: comparison.some((item) => item.status === "compared"),
    rubrics: Object.freeze(comparison),
    limitations: Object.freeze(limitations)
  });
}

export function normalizeFinancialRubric(rubric: string): string {
  const result = normalized(rubric);
  if (result.length === 0) throw new Error("A rubrica não pode ser vazia.");
  return result;
}

/**
 * Converte o contrato documental público sem alterar a sua semântica. A falta
 * de período ou a ambiguidade permanece uma recusa, e não um palpite da camada
 * de análise.
 */
export function financialAmountsFromStructuredExtraction(
  extraction: StructuredDocumentExtraction,
  documentTitle: string
): readonly FinancialAmount[] {
  if (
    extraction.documentKind.value !== "financial_statement" ||
    extraction.documentKind.state !== "known" ||
    extraction.financialPeriod.state !== "known" ||
    extraction.financialPeriod.year === null ||
    extraction.financialPeriod.month === null
  ) {
    return Object.freeze([]);
  }
  const period = `${extraction.financialPeriod.year}-${String(extraction.financialPeriod.month).padStart(2, "0")}`;
  assertPeriod(period);
  if (documentTitle.trim().length === 0) throw new Error("O documento financeiro exige título.");
  return Object.freeze(
    extraction.financialEntries.map((entry) => {
      if (
        entry.source.condominiumId !== extraction.condominiumId ||
        entry.source.documentId !== extraction.documentId ||
        entry.source.documentVersionId !== extraction.documentVersionId
      ) {
        throw new Error("A fonte estruturada não pertence ao documento financeiro.");
      }
      return Object.freeze({
        condominiumId: extraction.condominiumId,
        period,
        rubric: entry.originalLabel,
        normalizedRubric: normalizeFinancialRubric(entry.originalLabel),
        amountMinor: BigInt(entry.amountMinor),
        currency: entry.currency,
        source: Object.freeze({
          documentId: entry.source.documentId,
          documentVersionId: entry.source.documentVersionId,
          documentTitle,
          page: entry.source.pageNumber,
          excerpt: entry.source.excerpt,
          startOffset: entry.source.startOffset,
          endOffset: entry.source.endOffset,
          extractionMethod: entry.source.extractionMethod,
          uncertainty: entry.source.uncertainty.length === 0 ? "none" : "review_required"
        })
      });
    })
  );
}
