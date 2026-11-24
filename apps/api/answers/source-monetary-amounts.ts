import type { GeneratedCitation } from "./answer-contract.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";

const normalize = (text: string) => text.normalize("NFD").replaceAll(/\p{M}/gu, "").toLowerCase();
const versionKey = (source: GeneratedCitation) =>
  JSON.stringify([source.documentId, source.documentVersionId]);
const declaresBrl = (text: string) =>
  /\bvalores\s+(?:(?:expressos|apresentados)\s+)?em\s+(?:reais|brl)\b|\b(?:valores?|entradas?|saidas?)\s*[[(]\s*r\$\s*[\])]/u.test(
    text
  );
const foreignCurrency = /\b(?:eur|usd|euros|dolares)\b|€|us\$/u;
const financialDocument =
  /\b(?:balancete|extrato bancario|demonstrativo financeiro|prestacao de contas)\b/u;
const financialColumns =
  /\bsaldo (?:anterior|final)\b|\bentradas?\b|\bsaidas?\b|\breceitas\b|\bdespesas\b|\bresultado(?: do mes| do periodo)?\b|\bcota(?: ordinaria)?\b|\breserva\b|\bvalor\b/gu;
const sectionHeading =
  /^(?:receitas(?: recebidas)?|despesas(?: pagas)?(?: por grupo)?|recebimentos|pagamentos)\s*:?$/u;
const scalarLabel =
  /^(?:(?:total(?: de)?\s+)?(?:receitas|despesas|entradas|saidas|recebimentos|pagamentos)|saldo (?:anterior|final)(?: em aberto)?|resultado(?: do mes| do periodo)?|(?:total(?: de)?\s+)?(?:cotas? ordinarias?|fundo de reserva))\s*:?$/u;
const nonMonetaryUnit =
  /%|\bm(?:2|²)(?![\p{L}\p{N}])|\b(?:kg|km|metros|horas|meses|unidades|percentual)\b/u;

/** Acrescenta apenas contexto de moeda já recuperado e da mesma versão citada. */
export function withFinancialCurrencyCitations(
  citations: readonly GeneratedCitation[],
  evidence: readonly RetrievalEvidence[]
): readonly GeneratedCitation[] {
  const versions = new Set(
    citations
      .filter((citation) => citation.sourceScope !== "legislation")
      .filter((citation) =>
        financialDocument.test(normalize(citation.title).replaceAll(/[_-]/gu, " "))
      )
      .map(versionKey)
  );
  const eligible = evidence.filter(
    (source) =>
      source.sourceScope !== "legislation" &&
      source.processingStatus === "ready" &&
      source.qualityScore >= 0.7 &&
      ["confirmed", "not_applicable"].includes(source.validityStatus) &&
      versions.has(JSON.stringify([source.documentId, source.documentVersionId])) &&
      citations.some(
        (citation) =>
          citation.documentId === source.documentId &&
          citation.documentVersionId === source.documentVersionId &&
          evidence.some(
            (item) => item.id === citation.evidenceId && item.condominiumId === source.condominiumId
          )
      ) &&
      !citations.some((citation) => citation.evidenceId === source.id)
  );
  const additions = eligible.filter(
    (source) =>
      declaresBrl(normalize(source.content)) ||
      foreignCurrency.test(normalize(source.content)) ||
      citations.some(
        (citation) =>
          source.documentId === citation.documentId &&
          source.documentVersionId === citation.documentVersionId &&
          source.pageNumber === citation.page &&
          citation.startOffset !== undefined &&
          citation.endOffset !== undefined &&
          source.startOffset <= citation.endOffset &&
          source.endOffset >= citation.startOffset
      )
  );
  return [
    ...citations,
    ...additions.map((source) => ({
      evidenceId: source.id,
      documentId: source.documentId,
      documentVersionId: source.documentVersionId,
      title: source.documentTitle,
      page: source.pageNumber,
      excerpt: source.content,
      sourceScope: source.sourceScope ?? "condominium",
      startOffset: source.startOffset,
      endOffset: source.endOffset
    }))
  ];
}

/** Une somente cobertura literal contígua da mesma página; não herda cabeçalho por versão. */
function contiguousCitations(
  citations: readonly GeneratedCitation[]
): readonly GeneratedCitation[] {
  const joined: GeneratedCitation[] = [];
  for (const source of [...citations].sort(
    (a, b) =>
      versionKey(a).localeCompare(versionKey(b)) ||
      a.page - b.page ||
      (a.startOffset ?? 0) - (b.startOffset ?? 0)
  )) {
    const previous = joined.at(-1);
    if (
      previous &&
      versionKey(previous) === versionKey(source) &&
      previous.page === source.page &&
      previous.startOffset !== undefined &&
      previous.endOffset !== undefined &&
      source.startOffset !== undefined &&
      source.endOffset !== undefined &&
      source.startOffset >= previous.startOffset &&
      source.startOffset <= previous.endOffset
    ) {
      const content = Array.from(source.excerpt);
      const prior = Array.from(previous.excerpt);
      const overlap = Math.min(previous.endOffset - source.startOffset, content.length);
      const relative = source.startOffset - previous.startOffset;
      if (
        content.slice(0, overlap).every((character, index) => prior[relative + index] === character)
      ) {
        joined[joined.length - 1] = {
          ...previous,
          excerpt: prior.join("") + content.slice(overlap).join(""),
          endOffset: Math.max(previous.endOffset, source.endOffset)
        };
        continue;
      }
    }
    joined.push(source);
  }
  return joined;
}

/** Lê somente células literais; não altera fontes nem infere moeda pelo título. */
export function implicitFinancialAmounts(
  citations: readonly GeneratedCitation[]
): readonly number[] {
  const declared = new Set(
    citations
      .filter(
        (source) => source.sourceScope !== "legislation" && declaresBrl(normalize(source.excerpt))
      )
      .map(versionKey)
  );
  const foreign = new Set(
    citations.filter((source) => foreignCurrency.test(normalize(source.excerpt))).map(versionKey)
  );
  const values: number[] = [];
  for (const citation of contiguousCitations(citations)) {
    if (
      citation.sourceScope === "legislation" ||
      !declared.has(versionKey(citation)) ||
      foreign.has(versionKey(citation))
    )
      continue;
    if (
      !financialDocument.test(normalize(citation.title).replaceAll(/[_-]/gu, " ")) &&
      !financialDocument.test(normalize(citation.excerpt.slice(0, 700)))
    )
      continue;
    let table = false;
    let trailingDays = false;
    let transactions = false;
    let continued = false;
    for (const rawLine of citation.excerpt.split(/\r?\n/u)) {
      const line = normalize(rawLine).replaceAll(/[|*]/gu, " ").trim();
      if (table && /^[-:\s]+$/u.test(line)) continue;
      const header =
        !/[.!?;]/u.test(line.replaceAll(/\b(?:ref|dt)\./gu, "")) &&
        line.length <= 140 &&
        !/\d/u.test(line) &&
        !nonMonetaryUnit.test(line) &&
        ((line.match(financialColumns)?.length ?? 0) >= 2 ||
          /^(?:descricao|rubrica|historico)\s+valor$/u.test(line));
      if (header || sectionHeading.test(line)) {
        table = true;
        trailingDays = /\bdias$/u.test(line);
        transactions = /\bdata\b.*\bhistorico\b/u.test(line);
        continued = false;
        continue;
      }
      // A coluna de dias permanece quantidade; só as células com duas casas são lidas.
      const row = table && trailingDays ? line.replace(/\s+\d+\s*$/u, "") : line;
      const tail = /(?:^|\s)((?:(?:[-(]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\)?)(?:\s+|$))+)$/.exec(
        row
      );
      const label = tail === null ? "" : row.slice(0, tail.index).trim();
      const standaloneTransaction =
        /^\d{2}\/\d{2}\s+[\p{L}\p{N}]+-[\p{L}\p{N}-]+\s+.+\s+(?:op|fr)$/u.test(label) &&
        (tail?.[1]?.match(/\d+,\d{2}/gu)?.length ?? 0) === 2;
      const unitCountInHistory =
        (transactions || standaloneTransaction) &&
        /^\d{2}\/\d{2}\s+\S+\s/u.test(label) &&
        !/%|\b(?:area|prazo|percentual|quantidade|kg|km|metros|horas|meses)\b/u.test(label);
      const financialHistory =
        /^(?:\([+-]\)\s*)?(?:principal recebido|cotas? (?:ordinarias?|anteriores))/u.test(label) &&
        !/%|\b(?:area|prazo|percentual|quantidade|kg|km|metros|horas)\b/u.test(label);
      if (
        tail !== null &&
        (!nonMonetaryUnit.test(line) || unitCountInHistory || financialHistory) &&
        (table || standaloneTransaction || scalarLabel.test(label))
      ) {
        for (const match of tail[1]!.matchAll(/(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/gu)) {
          const minor = Math.round(Number(match[0].replaceAll(".", "").replace(",", ".")) * 100);
          if (Number.isSafeInteger(minor)) values.push(minor);
        }
        continued = false;
      } else if (
        table &&
        transactions &&
        !continued &&
        /^\d{2}\/\d{2}\s+\S+\s/u.test(line) &&
        !/\d+,\d{2}/u.test(line)
      ) {
        // Uma linha de histórico pode quebrar antes das colunas Entrada/Saída.
        continued = true;
      } else {
        table = false;
        trailingDays = false;
        transactions = false;
        continued = false;
      }
    }
  }
  return values;
}
