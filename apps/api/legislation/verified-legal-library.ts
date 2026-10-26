import type { DocumentSourceReader } from "../documents/document-source.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { RetrievableChunk, ScopedRetrievalIndex } from "../retrieval/retrieval-contract.js";
import { lexicalScore, normalizeText } from "../retrieval/text-retrieval.js";
import {
  legalContentHash,
  legalContentId,
  validateLegalEdition,
  type VerifiedLegalEdition
} from "./legal-edition-contract.js";
import { verifiedLegalEdition } from "./verified-legal-edition.js";

const genericTerms = new Set(
  "a as ao aos com como da das de deve devem do dos e em entre foi foram ha na nas no nos o os ou para pode posso qual quais quando que quem regra regras sao segundo sem ser sobre um uma uns umas meu minha nosso nossa condominio condominios sindico sindica nome eleito eleita saber preciso gostaria alvitra contrato contratos documento documentos lei leis norma normas".split(
    " "
  )
);

function hasLegalRelevance(query: string, content: string): boolean {
  const terms = [
    ...new Set(
      normalizeText(query)
        .split(/[^\p{L}\p{N}]+/gu)
        .filter((term) => term.length >= 3 && !genericTerms.has(term))
    )
  ];
  if (terms.length === 0) return false;
  const normalizedContent = normalizeText(content);
  const matches = terms.filter((term) => normalizedContent.includes(term)).length;
  return matches >= 2 || matches / terms.length >= 0.5;
}

export type LegalCopyReader = Readonly<{
  getAuthorizedCopy(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      documentId: string;
      documentVersionId: string;
    }>
  ): Buffer | undefined | Promise<Buffer | undefined>;
}>;

export function createVerifiedLegalLibrary(edition: VerifiedLegalEdition = verifiedLegalEdition) {
  const validated = validateLegalEdition(edition);
  const sources = validated.payload.sources;
  return Object.freeze({
    sources,
    getAuthorizedCopy(
      context: AuthorizedCondominiumContext,
      input: Readonly<{
        documentId: string;
        documentVersionId: string;
      }>
    ): Buffer | undefined {
      if (!context.permissions.includes("document:read")) return undefined;
      const source = sources.find(
        (item) => item.id === input.documentId && item.versionId === input.documentVersionId
      );
      return source === undefined ? undefined : Buffer.from(source.pdfBase64, "base64");
    },
    composeReader(privateReader: DocumentSourceReader): DocumentSourceReader {
      return Object.freeze({
        async getAuthorizedPage(
          context: AuthorizedCondominiumContext,
          input: Parameters<DocumentSourceReader["getAuthorizedPage"]>[1]
        ) {
          if (!context.permissions.includes("document:read")) return undefined;
          const source = sources.find(
            (item) => item.id === input.documentId && item.versionId === input.documentVersionId
          );
          if (source === undefined) return privateReader.getAuthorizedPage(context, input);
          const page = source.pages.find((item) => item.pageNumber === input.page);
          return page === undefined
            ? undefined
            : Object.freeze({
                documentId: source.id,
                documentVersionId: source.versionId,
                title: source.title,
                page: page.pageNumber,
                content: page.text,
                officialUrl: source.officialUrl,
                copyLabel:
                  "Paginação da cópia de consulta Alvitra; a origem oficial em HTML não possui estas páginas.",
                verifiedAt: source.verifiedAt,
                reviewDueAt: source.reviewDueAt
              });
        }
      });
    },
    composeIndex(privateIndex: ScopedRetrievalIndex): ScopedRetrievalIndex {
      return Object.freeze({
        async findAuthorizedCandidates(
          context: AuthorizedCondominiumContext,
          input: Parameters<ScopedRetrievalIndex["findAuthorizedCandidates"]>[1]
        ) {
          if (!context.permissions.includes("document:read")) return Object.freeze([]);
          const privateCandidates = await privateIndex.findAuthorizedCandidates(context, input);
          const legalCandidates: RetrievableChunk[] = [];
          for (const source of sources) {
            const validFrom = new Date(source.verifiedAt);
            const validUntil = new Date(source.reviewDueAt);
            if (!(input.asOf >= validFrom && input.asOf < validUntil)) continue;
            for (const page of source.pages) {
              const body = Array.from(page.text).slice(page.startOffset, page.endOffset).join("");
              if (!hasLegalRelevance(input.query, body)) continue;
              legalCandidates.push(
                Object.freeze({
                  id: legalContentId(`${source.versionId}:${page.pageNumber}`),
                  condominiumId: context.condominiumId,
                  documentId: source.id,
                  documentVersionId: source.versionId,
                  documentVersionNumber: 1,
                  documentTitle: `${source.title} - ${page.locator}`,
                  documentType: "other",
                  sourceKind: "administrator_import",
                  sourceScope: "legislation",
                  pageId: legalContentId(`${source.versionId}:page:${page.pageNumber}`),
                  pageNumber: page.pageNumber,
                  startOffset: page.startOffset,
                  endOffset: page.endOffset,
                  content: body,
                  contentSha256: legalContentHash(body),
                  semanticScore: null,
                  extractionMethod: "pdf_text",
                  qualityScore: 1,
                  processingStatus: "ready",
                  validityStatus: "confirmed",
                  validFrom,
                  validUntil
                })
              );
            }
          }
          legalCandidates.sort(
            (left, right) =>
              lexicalScore(input.query, right.content) - lexicalScore(input.query, left.content)
          );
          return Object.freeze([
            ...privateCandidates.filter((item) => item.condominiumId === context.condominiumId),
            ...legalCandidates.slice(0, input.limit)
          ]);
        }
      });
    }
  });
}
