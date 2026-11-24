import { createHash } from "node:crypto";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { RegisteredDocument } from "../documents/document-catalog.js";
import { assertAnalysisLimits, type AnalysisDocument } from "./document-analysis-reader.js";
import type { GeneratedAnswer } from "../answers/answer-contract.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import { monthNames } from "../answers/documentary-dates.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";

export type IntegralDocumentSet = Readonly<{
  catalog: readonly RegisteredDocument[];
  documents: readonly AnalysisDocument[];
}>;
export type IntegralSumSummary = Readonly<{
  status: "verified";
  basis: "server_integral_calculation";
  documentVersionId: string;
  title: string;
  period: string;
  filter: "pago";
  pagesVerified: number;
  rowsVerified: number;
  includedRows: number;
  total: string;
  totalMinor: string;
  receiptSha256: string;
  limitation: string;
}>;
type Row = Readonly<{
  id: string;
  page: number;
  startOffset: number;
  endOffset: number;
  amountMinor: string;
  date: string;
  status: string;
}>;
export type IntegralSumReceipt = Readonly<{
  version: "integral-sum-v1";
  condominiumId: string;
  userId: string;
  documentId: string;
  documentVersionId: string;
  period: string;
  filter: "pago";
  pages: readonly { page: number; sha256: string }[];
  rowsVerified: number;
  included: readonly Row[];
  totalMinor: string;
}>;
const verified = new WeakMap<IntegralSumSummary, IntegralSumReceipt>();
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim();
export const integralMoney = (minor: bigint | string) => {
  const n = BigInt(minor),
    absolute = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}R$ ${(absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ".")},${String(absolute % 100n).padStart(2, "0")}`;
};
export function isIntegralSumQuestion(question: string): boolean {
  const text = normalize(question);
  return (
    /\b(?:soma|some|somar|total)\b/u.test(text) &&
    /\b(?:todos|todas|integral)\b/u.test(text) &&
    /\bpagos?\b/u.test(text) &&
    /financeir|lancamentos?|pagamentos?|balancete/u.test(text)
  );
}
export function integralSumRequest(question: string): Readonly<{ period: string }> | undefined {
  const text = normalize(question);
  if (
    !isIntegralSumQuestion(question) ||
    /\b(?:exceto|somente|apenas|antes|depois|categoria|fornecedor|rubrica|centro|unidade|agua|energia)\b/u.test(
      text
    )
  )
    return undefined;
  const matches = [
    ...text.matchAll(new RegExp(`\\b(${monthNames.join("|")})\\s+(?:de\\s+)?(20\\d{2})\\b`, "gu"))
  ];
  const numeric = [...text.matchAll(/\b(20\d{2})-(0[1-9]|1[0-2])\b/gu)];
  if (matches.length + numeric.length !== 1) return undefined;
  return {
    period: matches.length
      ? `${matches[0]![2]}-${String(monthNames.findIndex((name) => name === matches[0]![1]) + 1).padStart(2, "0")}`
      : `${numeric[0]![1]}-${numeric[0]![2]}`
  };
}
export function integralFinancialCatalog(
  context: AuthorizedCondominiumContext,
  catalog: readonly RegisteredDocument[]
) {
  if (!context.permissions.includes("document:read")) throw new Error("Acesso documental negado.");
  return catalog.filter(
    (d) =>
      d.condominiumId === context.condominiumId &&
      /financeir|balancete|lancamentos|pagamentos/u.test(normalize(d.title))
  );
}
function assertDocument(context: AuthorizedCondominiumContext, set: IntegralDocumentSet) {
  const candidates = integralFinancialCatalog(context, set.catalog);
  if (candidates.length !== 1)
    throw new Error("Origem financeira ausente ou ambígua; identifique o documento.");
  const meta = candidates[0]!;
  if (
    meta.processingStatus !== "ready" ||
    meta.condominiumCheck?.status === "pending" ||
    !["confirmed", "not_applicable"].includes(meta.validityStatus) ||
    !Number.isInteger(meta.expectedPageCount) ||
    !meta.expectedPageCount ||
    meta.expectedPageCount > 500 ||
    meta.processedPageCount !== meta.expectedPageCount ||
    meta.searchablePageCount !== meta.expectedPageCount ||
    meta.extractionCompleteness !== 1 ||
    meta.unreadablePageNumbers.length
  )
    throw new Error("Documento recebido sem cobertura integral confirmada.");
  const docs = set.documents.filter((d) => d.documentVersionId === meta.documentVersionId);
  if (docs.length !== 1) throw new Error("Origem integral indisponível.");
  const doc = docs[0]!;
  if (
    doc.condominiumId !== context.condominiumId ||
    doc.documentId !== meta.documentId ||
    doc.pages.length !== meta.expectedPageCount ||
    doc.pages.some(
      (p, i) =>
        p.pageNumber !== i + 1 ||
        !Number.isFinite(p.qualityScore) ||
        p.qualityScore < 0.7 ||
        !p.extractedText.trim()
    )
  )
    throw new Error("Páginas ausentes, ilegíveis ou fora do escopo.");
  assertAnalysisLimits([doc]);
  return { doc, meta };
}
/** Formato fechado por cabeçalhos. Não adivinha colunas ou ignora linhas inválidas. */
export function computeIntegralSum(
  context: AuthorizedCondominiumContext,
  question: string,
  set: IntegralDocumentSet
) {
  const request = integralSumRequest(question);
  if (!request) throw new Error("Pedido de soma integral não suportado.");
  const { doc, meta } = assertDocument(context, set);
  const rows: Row[] = [],
    ids = new Set<string>();
  let header: string[] | undefined;
  const notes: string[] = [];
  for (const page of doc.pages) {
    if (containsHostileInstruction(page.extractedText))
      throw new Error("Instrução documental bloqueia o cálculo integral.");
    let offset = 0;
    for (const line of page.extractedText.split("\n")) {
      const startOffset = offset;
      offset += Array.from(line).length + 1;
      const cells = line
        .replace(/^\s*\|/u, "")
        .replace(/\|\s*$/u, "")
        .split("|")
        .map((s) => s.trim());
      const labels = cells.map((s) => normalize(s).replace(/^tabela:\s*/u, ""));
      if (
        labels.includes("id") &&
        labels.includes("valor") &&
        labels.includes("data") &&
        labels.some((s) => s === "situacao" || s === "status")
      ) {
        if (new Set(labels).size !== labels.length || (header && digest(header) !== digest(labels)))
          throw new Error("Cabeçalho financeiro ambíguo.");
        header = labels;
        continue;
      }
      if (
        !line.includes("|") ||
        !/^[\p{L}]{1,12}-[\p{L}\p{N}]*\d[\p{L}\p{N}]*$/u.test(cells[0] ?? "")
      ) {
        if (/\|\s*-?R\$/u.test(line) || /^\s*[\p{L}]{1,12}-\S+\s*\|/u.test(line))
          throw new Error("Linha financeira sem identificação legível.");
        notes.push(line);
        continue;
      }
      if (!header || cells.length !== header.length)
        throw new Error("Linha financeira incompleta.");
      const id = cells[header.indexOf("id")]!,
        amount = cells[header.indexOf("valor")]!.replaceAll(/\s/gu, "");
      const date = cells[header.indexOf("data")]!,
        status = normalize(cells[header.findIndex((s) => s === "situacao" || s === "status")]!);
      const money = /^(-?)R\$((?:\d{1,3}(?:\.\d{3})+|\d+)),(\d{2})$/u.exec(amount);
      const parts = /^(\d{2})\/(\d{2})\/(20\d{2})$/u.exec(date);
      if (!money || !parts || !["pago", "pendente", "cancelado"].includes(status) || ids.has(id))
        throw new Error("Valor, data, situação ou ID ilegível/duplicado.");
      const parsed = new Date(Date.UTC(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])));
      if (
        parsed.getUTCFullYear() !== Number(parts[3]) ||
        parsed.getUTCMonth() + 1 !== Number(parts[2]) ||
        parsed.getUTCDate() !== Number(parts[1])
      )
        throw new Error("Data financeira inválida.");
      ids.add(id);
      const minor =
        (BigInt(money[2]!.replaceAll(".", "")) * 100n + BigInt(money[3]!)) * (money[1] ? -1n : 1n);
      if (minor > BigInt(Number.MAX_SAFE_INTEGER) || minor < BigInt(Number.MIN_SAFE_INTEGER))
        throw new Error("Valor excede precisão suportada.");
      rows.push({
        id,
        page: page.pageNumber,
        startOffset,
        endOffset: startOffset + Array.from(line).length,
        amountMinor: String(minor),
        date: `${parts[3]}-${parts[2]}-${parts[1]}`,
        status
      });
    }
  }
  if (!header || !rows.length) throw new Error("Tabela financeira suportada não encontrada.");
  const included = rows.filter((r) => r.status === "pago" && r.date.startsWith(request.period));
  if (
    notes.some(
      (note) =>
        /diverg|retific|cancel|corrig|suspens|conflit/u.test(normalize(note)) &&
        included.some((r) =>
          new RegExp(`(?<![\\p{L}\\p{N}])${r.id}(?![\\p{L}\\p{N}])`, "u").test(note)
        )
    )
  )
    throw new Error("Nota altera lançamento do período; exige conciliação.");
  const total = included.reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER))
    throw new Error("Total excede precisão suportada.");
  const receipt: IntegralSumReceipt = Object.freeze({
    version: "integral-sum-v1",
    condominiumId: context.condominiumId,
    userId: context.userId,
    documentId: doc.documentId,
    documentVersionId: doc.documentVersionId,
    period: request.period,
    filter: "pago",
    pages: Object.freeze(
      doc.pages.map((p) => ({ page: p.pageNumber, sha256: digest(p.extractedText) }))
    ),
    rowsVerified: rows.length,
    included: Object.freeze(included),
    totalMinor: String(total)
  });
  if (Buffer.byteLength(JSON.stringify(receipt)) > 1_000_000)
    throw new Error("Recibo excede limite de análise.");
  const summary: IntegralSumSummary = Object.freeze({
    status: "verified",
    basis: "server_integral_calculation",
    documentVersionId: doc.documentVersionId,
    title: meta.title,
    period: request.period,
    filter: "pago",
    pagesVerified: doc.pages.length,
    rowsVerified: rows.length,
    includedRows: included.length,
    total: integralMoney(total),
    totalMinor: String(total),
    receiptSha256: digest(receipt),
    limitation:
      "Soma dos registros marcados como pagos; não comprova quitação bancária, aprovação das contas ou regularidade."
  });
  verified.set(summary, receipt);
  // Amostras citáveis são originais; a prova completa fica no recibo privado.
  const pageNumbers = [...new Set(included.map((r) => r.page))];
  const samplePages = (pageNumbers.length ? pageNumbers : [1])
    .filter((_, i, all) => all.length <= 8 || i % Math.ceil(all.length / 8) === 0)
    .slice(0, 8);
  const evidence: RetrievalEvidence[] = samplePages.map((number, rank) => {
    const page = doc.pages[number - 1]!,
      chars = Array.from(page.extractedText),
      content = chars.slice(0, 1200).join("");
    return {
      id: `integral:${doc.documentVersionId}:${number}`,
      condominiumId: context.condominiumId,
      documentId: doc.documentId,
      documentVersionId: doc.documentVersionId,
      documentVersionNumber: meta.versionNumber,
      documentTitle: meta.title,
      documentType: meta.documentType,
      sourceKind: "user_upload",
      sourceScope: "condominium",
      pageId: `integral:${number}`,
      pageNumber: number,
      startOffset: 0,
      endOffset: Array.from(content).length,
      content,
      contentSha256: createHash("sha256").update(content).digest("hex"),
      semanticScore: null,
      extractionMethod: page.extractionMethod,
      qualityScore: page.qualityScore,
      processingStatus: "ready",
      validityStatus: meta.validityStatus as "confirmed" | "not_applicable",
      validFrom: null,
      validUntil: null,
      lexicalScore: 1,
      rerankScore: 1,
      rank: rank + 1
    };
  });
  return { summary, receipt, evidence };
}
export function integralReceipt(
  summary: IntegralSumSummary | undefined
): IntegralSumReceipt | undefined {
  return summary && verified.get(summary);
}
export function permitsIntegralAmount(
  summary: IntegralSumSummary | undefined,
  generated: GeneratedAnswer,
  sentence: string,
  amount: number
): boolean {
  const proof = integralReceipt(summary);
  if (
    !proof ||
    Math.abs(Number(proof.totalMinor)) !== Math.abs(amount) ||
    !/soma|total/iu.test(sentence) ||
    /taxa|multa|sal[aá]rio|ordin[aá]ri|or[cç]amento/iu.test(sentence)
  )
    return false;
  return (
    generated.citations.some((c) => c.documentVersionId === proof.documentVersionId) &&
    generated.citations.every((c) => c.documentVersionId === proof.documentVersionId)
  );
}
export function assertIntegralAnswer(summary: IntegralSumSummary, generated: GeneratedAnswer) {
  if (!integralReceipt(summary)) throw new Error("Prova calculada inválida.");
  if (generated.answerMode === "abstained" || generated.answerMode === "failed") return;
  const text = normalize(generated.answer).replaceAll(/[\s*]/gu, "");
  const monetary = [
    ...generated.answer.replaceAll("*", "").matchAll(/(-?)\s*R\$\s*([\d.]+),(\d{2})/gu)
  ].map((m) =>
    String((BigInt(m[2]!.replaceAll(".", "")) * 100n + BigInt(m[3]!)) * (m[1] ? -1n : 1n))
  );
  const periodMonths = [
    ...normalize(generated.answer).matchAll(new RegExp(`\\b(${monthNames.join("|")})\\b`, "gu"))
  ].map((m) => monthNames.findIndex((name) => name === m[1]) + 1);
  const years = [...generated.answer.matchAll(/\b20\d{2}\b/gu)].map((m) => m[0]);
  const unsupportedCertification = [
    ...normalize(generated.answer).matchAll(
      /(?:comprova|certifica|garante|atesta)\s+(?:a\s+)?(?:quitacao|regularidade|aprovacao|pagamento bancario)/gu
    )
  ].some(
    (m) => !/nao|sem/u.test(normalize(generated.answer).slice(Math.max(0, m.index! - 20), m.index))
  );
  if (
    !text.includes(summary.total.replaceAll(/\s/gu, "").toLowerCase()) ||
    !/confer|verific|integral|todas.*paginas/u.test(normalize(generated.answer)) ||
    monetary.some((m) => m !== summary.totalMinor) ||
    periodMonths.some((month) => month !== Number(summary.period.slice(5))) ||
    !/pago/iu.test(generated.answer) ||
    years.some((year) => year !== summary.period.slice(0, 4)) ||
    unsupportedCertification
  )
    throw new Error("Total ou cobertura integral ausente na resposta.");
}
