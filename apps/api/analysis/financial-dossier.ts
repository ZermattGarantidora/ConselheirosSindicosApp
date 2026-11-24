import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { AnswerCitation } from "../answers/answer-contract.js";
import { type AnalysisDocument, assertAnalysisLimits } from "./document-analysis-reader.js";
import { validateDocumentAnalysisSources } from "./document-analysis-validation.js";
import { buildFinancialReview } from "./financial-review.js";
import { extractStructuredDocument } from "../documents/structured/extract-structured-document.js";
import { authoringHash } from "../authoring/document-authoring-contract.js";

function segmentFinancialDossier(
  context: AuthorizedCondominiumContext,
  originals: readonly AnalysisDocument[]
) {
  assertAnalysisLimits(originals);
  validateDocumentAnalysisSources(context, originals, []);
  const logical = new Map<string, AnalysisDocument>();
  const origins = new Map<string, AnalysisDocument>();
  const inventory: {
    documentVersionId: string;
    page: number;
    logicalDocumentKey: string;
    sha256: string;
    financialEntries: number;
  }[] = [];
  for (const original of originals) {
    for (const [index, page] of original.pages.entries()) {
      if (
        page.pageNumber !== index + 1 ||
        page.qualityScore < 0.7 ||
        !Number.isFinite(page.qualityScore) ||
        !page.extractedText.trim()
      )
        throw new Error("Caderno sem cobertura integral legível.");
      const headings = [
        ...page.extractedText.matchAll(/^Documento integrante:\s*([A-Za-z0-9_-]{1,80})\s*$/gmu)
      ];
      if (headings.length !== 1)
        throw new Error("Cada página precisa identificar um único documento integrante.");
      const key = headings[0]![1]!;
      const titles = [...page.extractedText.matchAll(/^Título do documento:[ \t]*(.+)$/gmu)];
      const title = titles[0]?.[1]?.trim();
      if (!title || titles.length !== 1)
        throw new Error("Documento integrante sem título único explícito.");
      const id = `dossier-${authoringHash([original.documentVersionId, key]).slice(0, 32)}`;
      const old = logical.get(key);
      if (old && (old.documentVersionId !== id || old.documentTitle !== title))
        throw new Error("Identificação integrante conflitante.");
      const document = {
        condominiumId: context.condominiumId,
        documentId: id,
        documentVersionId: id,
        documentTitle: title,
        pages: [...(old?.pages ?? []), page]
      };
      logical.set(key, document);
      origins.set(id, original);
      const extraction = extractStructuredDocument({ ...document, pages: [page] });
      inventory.push({
        documentVersionId: original.documentVersionId,
        page: page.pageNumber,
        logicalDocumentKey: key,
        sha256: authoringHash(page.extractedText),
        financialEntries: extraction.financialEntries.length
      });
    }
  }
  return { logical, origins, inventory };
}
export function financialDossierCandidates(
  context: AuthorizedCondominiumContext,
  originals: readonly AnalysisDocument[]
) {
  const { logical } = segmentFinancialDossier(context, originals);
  return [...logical]
    .filter(([, d]) => d.pages.some((p) => /^Balancete\b/imu.test(p.extractedText)))
    .map(([key, d]) => ({ key, title: d.documentTitle, page: d.pages[0]!.pageNumber }));
}
export function analyzeFinancialDossier(
  context: AuthorizedCondominiumContext,
  originals: readonly AnalysisDocument[],
  currentDocumentKey: string
) {
  if (!/^[A-Za-z0-9_-]{1,80}$/u.test(currentDocumentKey))
    throw new Error("Identificação do balancete inválida.");
  const { logical, origins, inventory } = segmentFinancialDossier(context, originals);
  const current = logical.get(currentDocumentKey);
  if (!current) throw new Error("Balancete principal não encontrado no caderno.");
  const documents = [...logical.values()];
  const report = buildFinancialReview(context, current.documentVersionId, documents);
  if (report.status !== "available")
    throw new Error("A competência ou leitura do balancete exige esclarecimento.");
  const voucherAudit: {
    key: string;
    page: number;
    itemCount: number;
    declaredMinor: string;
    itemSumMinor: string;
    matches: boolean;
  }[] = [];
  const problems: AnswerCitation[] = [];
  const minor = (text: string): bigint => {
    const value = text.replaceAll(".", "").replace(",", ".");
    const [whole, cents] = value.split(".");
    return BigInt(whole!) * 100n + BigInt(cents!);
  };
  for (const [key, document] of logical) {
    const lines = document.pages.flatMap((page) => page.extractedText.split("\n"));
    const totals = lines.flatMap((line) =>
      [...line.matchAll(/^Valor:\s*R\$\s*([\d.]+,\d{2})\s*$/gu)].map((m) => minor(m[1]!))
    );
    const items = lines.flatMap((line) =>
      [...line.matchAll(/^Item \d{2,3}[^:]*:\s*R\$\s*([\d.]+,\d{2})\s*$/gu)].map((m) =>
        minor(m[1]!)
      )
    );
    const itemLines = lines.filter((line) => /^Item\b/u.test(line));
    if (
      items.length !== itemLines.length ||
      new Set(itemLines.map((line) => line.match(/^Item (\d{2,3})/u)?.[1])).size !== items.length
    )
      throw new Error("Item financeiro ilegível ou duplicado; não foi ignorado.");
    if (!items.length) continue;
    if (totals.length !== 1) throw new Error("Comprovante detalhado sem total único.");
    const total = items.reduce((a, b) => a + b, 0n),
      matches = total === totals[0];
    voucherAudit.push({
      key,
      page: document.pages[0]!.pageNumber,
      itemCount: items.length,
      declaredMinor: String(totals[0]),
      itemSumMinor: String(total),
      matches
    });
    if (!matches) {
      const page = document.pages[0]!;
      const startOffset = Array.from(
        page.extractedText.slice(0, page.extractedText.indexOf("Valor:"))
      ).length;
      if (document.pages.length !== 1)
        throw new Error(
          "Comprovante detalhado divergente exige referência por página; selecione o documento individual."
        );
      const lastItem = [
        ...page.extractedText.matchAll(/^Item \d{2,3}[^:]*:\s*R\$\s*[\d.]+,\d{2}\s*$/gmu)
      ].at(-1)!;
      const endOffset = Array.from(
        page.extractedText.slice(0, lastItem.index! + lastItem[0].trimEnd().length)
      ).length;
      problems.push({
        id: `items:${document.documentVersionId}:${page.pageNumber}`,
        evidenceId: `items:${document.documentVersionId}:${page.pageNumber}`,
        documentId: document.documentId,
        documentVersionId: document.documentVersionId,
        title: document.documentTitle,
        page: page.pageNumber,
        excerpt: Array.from(page.extractedText).slice(startOffset, endOffset).join(""),
        startOffset,
        endOffset,
        sourceScope: "condominium"
      });
    }
  }
  const mismatches = voucherAudit.filter((v) => !v.matches);
  const checks = report.financialReview!.checks.map((check) =>
    check.id !== "support"
      ? check
      : {
          ...check,
          status: mismatches.length ? ("atenção" as const) : check.status,
          detail: `${check.detail} Conferidos ${voucherAudit.length} documentos com itens discriminados (incluindo eventuais memoriais, sem certificar validade); ${mismatches.length} divergência(s) entre itens e total.${mismatches.map((m) => ` ${m.key}, página ${m.page}: total declarado ${formatMinor(m.declaredMinor)}, soma dos itens ${formatMinor(m.itemSumMinor)}.`).join("")}`,
          citations: [...check.citations, ...problems],
          nextSteps: [
            ...check.nextSteps,
            ...(mismatches.length
              ? [
                  "Solicite os comprovantes corrigidos e a memória das diferenças ao responsável contábil."
                ]
              : [])
          ]
        }
  );
  const remap = (citation: AnswerCitation): AnswerCitation => {
    const original = origins.get(citation.documentVersionId);
    if (!original) throw new Error("Fonte lógica desconhecida.");
    return {
      ...citation,
      id: `dossier:${original.documentVersionId}:${citation.page}:${citation.startOffset}`,
      evidenceId: `dossier:${original.documentVersionId}:${citation.page}:${citation.startOffset}`,
      documentId: original.documentId,
      documentVersionId: original.documentVersionId,
      title: original.documentTitle
    };
  };
  const mapped = {
    ...report,
    rows: report.rows.map((row) => ({ ...row, citations: row.citations.map(remap) })),
    financialReview: {
      ...report.financialReview!,
      checks: checks.map((check) => ({ ...check, citations: check.citations.map(remap) }))
    }
  };
  validateDocumentAnalysisSources(context, originals, [
    ...mapped.rows,
    ...mapped.financialReview.checks.filter((c) => c.citations.length)
  ]);
  return {
    report: mapped,
    inventory,
    voucherAudit,
    snapshotHash: authoringHash(originals),
    logicalDocuments: documents.length,
    entryCount: inventory.reduce((n, p) => n + p.financialEntries, 0)
  };
}
export function formatMinor(value: string | bigint): string {
  const n = BigInt(value),
    absolute = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}R$ ${(absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ".")},${String(absolute % 100n).padStart(2, "0")}`;
}
