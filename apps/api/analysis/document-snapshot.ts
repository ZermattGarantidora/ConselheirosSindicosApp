import type { AnswerCitation } from "../answers/answer-contract.js";
import type { RegisteredDocument } from "../documents/document-catalog.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { extractStructuredDocument } from "../documents/structured/extract-structured-document.js";
import type { StructuredSourceReference } from "../documents/structured/structured-document-contract.js";
import type { DocumentAnalysisReport, DocumentAnalysisRow } from "./document-analysis.js";
import type { DocumentAnalysisReader } from "./document-analysis-reader.js";
import { validateDocumentAnalysisSources } from "./document-analysis-validation.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";
import { buildFinancialReview } from "./financial-review.js";

export function canSummarizeDocument(document: RegisteredDocument): boolean {
  return (
    document.processingStatus === "ready" &&
    ["confirmed", "not_applicable"].includes(document.validityStatus) &&
    document.condominiumCheck?.status !== "pending"
  );
}

export function financialCatalogRevision(catalog: readonly RegisteredDocument[]): string {
  return JSON.stringify(
    catalog
      .filter(canSummarizeDocument)
      .toSorted((left, right) => left.documentVersionId.localeCompare(right.documentVersionId))
  );
}

const kindLabels = {
  financial_statement: "Balancete / prestação de contas",
  convention: "Convenção",
  internal_rules: "Regimento interno",
  meeting_minutes: "Ata",
  contract: "Contrato",
  unknown: "Tipo não identificado"
};

/** Seleção inicial local; nomes, texto e valores nunca são enviados a um modelo. */
export async function buildDocumentSnapshot(
  reader: DocumentAnalysisReader,
  context: AuthorizedCondominiumContext,
  document: RegisteredDocument,
  catalog: readonly RegisteredDocument[] = [document]
): Promise<DocumentAnalysisReport> {
  if (
    !context.permissions.includes("document:read") ||
    document.condominiumId !== context.condominiumId ||
    !canSummarizeDocument(document)
  )
    throw new Error("Resumo documental não autorizado.");
  const documents = await reader.readAuthorized(context, [document.documentVersionId]);
  if (
    documents.length !== 1 ||
    documents[0]!.documentId !== document.documentId ||
    documents[0]!.documentVersionId !== document.documentVersionId ||
    documents[0]!.documentTitle !== document.title
  )
    throw new Error("A versão recebida não está disponível para resumo.");
  validateDocumentAnalysisSources(context, documents, []);
  const source = documents[0]!;
  if (
    containsHostileInstruction(source.documentTitle) ||
    source.pages.some((page) => containsHostileInstruction(page.extractedText))
  )
    throw new Error("Não foi possível resumir com segurança documental.");
  const pages = source.pages
    .filter((page) => Number.isFinite(page.qualityScore) && page.qualityScore >= 0.7)
    .sort((a, b) => a.pageNumber - b.pageNumber);
  const extraction = extractStructuredDocument({ ...source, pages });
  if (
    extraction.documentKind.state === "known" &&
    extraction.documentKind.value === "financial_statement"
  ) {
    const eligible = catalog.filter(
      (item) =>
        item.condominiumId === context.condominiumId &&
        item.documentVersionId !== document.documentVersionId &&
        canSummarizeDocument(item)
    );
    const additional =
      eligible.length === 0
        ? []
        : await reader.readAuthorized(
            context,
            eligible.map((item) => item.documentVersionId)
          );
    for (const item of additional) {
      const registered = eligible.find(
        (entry) => entry.documentVersionId === item.documentVersionId
      );
      if (
        registered === undefined ||
        item.documentId !== registered.documentId ||
        item.documentTitle !== registered.title
      )
        throw new Error("Fonte de apoio não corresponde ao catálogo autorizado.");
    }
    const report = buildFinancialReview(context, document.documentVersionId, [
      ...documents,
      ...additional
    ]);
    const incomplete = [document, ...eligible].filter((item) => {
      const read = [source, ...additional].find(
        (entry) => entry.documentVersionId === item.documentVersionId
      );
      return (
        read === undefined ||
        (item.expectedPageCount !== null && read.pages.length !== item.expectedPageCount) ||
        item.unreadablePageNumbers.length > 0 ||
        (item.extractionCompleteness !== null && item.extractionCompleteness < 1)
      );
    });
    if (incomplete.length > 0)
      return {
        ...report,
        status: "limited",
        limitations: [
          ...report.limitations,
          "Parte do catálogo autorizado não pôde ser lida integralmente. Envie as páginas faltantes ou a versão legível antes de considerar a conferência completa."
        ]
      };
    return report;
  }
  const rows: DocumentAnalysisRow[] = [];
  const limitations = [
    "Leitura inicial por extração local: os dados e trechos selecionados não substituem a leitura integral nem confirmam vigência ou completude do original.",
    ...extraction.warnings
  ];
  const cite = (reference: StructuredSourceReference): AnswerCitation => ({
    id: `snapshot:${document.documentVersionId}:${reference.pageNumber}:${reference.startOffset}`,
    evidenceId: `snapshot:${reference.pageNumber}:${reference.startOffset}`,
    documentId: document.documentId,
    documentVersionId: document.documentVersionId,
    title: document.title,
    page: reference.pageNumber,
    excerpt: reference.excerpt,
    startOffset: reference.startOffset,
    endOffset: reference.endOffset,
    sourceScope: "condominium"
  });
  const kind = extraction.documentKind;
  if (kind.state === "known" && kind.source !== null)
    rows.push({
      label: "Documento identificado",
      detail: kindLabels[kind.value],
      citations: [cite(kind.source)]
    });
  else limitations.push("O tipo do documento não pôde ser identificado com segurança.");
  if (["meeting_minutes", "convention", "internal_rules", "contract"].includes(kind.value))
    limitations.push(
      "Confira condições e exceções no original; decisões jurídicas ou contratuais de maior risco exigem validação profissional."
    );
  if (pages.length !== source.pages.length)
    limitations.push(
      "Parte das páginas não atingiu o piso de qualidade e ficou fora deste resumo."
    );
  const candidates = pages
    .flatMap((page) =>
      [...page.extractedText.matchAll(/[^\r\n]+/gu)].map((match) => {
        const text = match[0].trim();
        const start = match.index + match[0].indexOf(text);
        return {
          page,
          text,
          start,
          score: [
            ...text.matchAll(
              /delibera|aprovad|decidi|respons[aá]vel|prazo|vencimento|objeto|obriga|rescis|reajuste|regra|exce[cç][aã]o|receita|despesa|saldo|R\$/giu
            )
          ].length
        };
      })
    )
    .filter((candidate) => candidate.text.length > 0);
  const excerpts = candidates
    .sort((a, b) => b.score - a.score)
    .filter(
      (candidate) =>
        !rows.some((row) => row.citations.some((citation) => citation.excerpt === candidate.text))
    )
    .slice(0, 3);
  for (const candidate of excerpts) {
    const excerpt = Array.from(candidate.text).slice(0, 900).join("");
    const startOffset = Array.from(candidate.page.extractedText.slice(0, candidate.start)).length;
    rows.push({
      label: "Trecho em destaque",
      detail: excerpt,
      citations: [
        cite({
          condominiumId: context.condominiumId,
          documentId: document.documentId,
          documentVersionId: document.documentVersionId,
          pageNumber: candidate.page.pageNumber,
          startOffset,
          endOffset: startOffset + Array.from(excerpt).length,
          excerpt,
          extractionMethod: candidate.page.extractionMethod,
          uncertainty: []
        })
      ]
    });
    if (excerpt !== candidate.text)
      limitations.push("Um trecho longo foi abreviado; abra a fonte para conferir a continuação.");
  }
  if (rows.length === 0)
    limitations.push(
      "Não há texto com qualidade suficiente para destacar dados. Envie o original completo e legível."
    );
  limitations.push(
    "Próximo passo: confira as fontes dos destaques e indique o ponto que precisa aprofundar."
  );
  validateDocumentAnalysisSources(context, documents, rows);
  return {
    status: rows.length > 0 ? "available" : "limited",
    title: "Raio-X inicial do arquivo",
    rows,
    limitations: [...new Set(limitations)]
  };
}
