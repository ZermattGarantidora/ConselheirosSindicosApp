import { createCondominiumId } from "../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { RetrievableChunk, ScopedRetrievalIndex } from "./retrieval-contract.js";

const alameda = createCondominiumId("alameda");
const bosque = createCondominiumId("bosque");

export const developmentChunks: readonly RetrievableChunk[] = Object.freeze([
  Object.freeze({
    id: "alameda-convencao-pagina-3",
    condominiumId: alameda,
    documentId: "alameda-convencao",
    documentVersionId: "alameda-convencao-v1",
    documentVersionNumber: 1,
    documentTitle: "Convenção do Condomínio Alameda",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "alameda-convencao-pagina-3",
    pageNumber: 3,
    startOffset: 0,
    endOffset: 106,
    content:
      "A locação por temporada depende de autorização em assembleia e deve respeitar as regras de sossego.",
    contentSha256: "a".repeat(64),
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null
  }),
  Object.freeze({
    id: "bosque-convencao-pagina-4",
    condominiumId: bosque,
    documentId: "bosque-convencao",
    documentVersionId: "bosque-convencao-v1",
    documentVersionNumber: 1,
    documentTitle: "Convenção do Condomínio Bosque",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "bosque-convencao-pagina-4",
    pageNumber: 4,
    startOffset: 0,
    endOffset: 83,
    content: "No Bosque, visitantes podem usar a vaga comum somente quando houver disponibilidade.",
    contentSha256: "b".repeat(64),
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null
  })
]);

export function createDevelopmentScopedRetrievalIndex(
  chunks: readonly RetrievableChunk[] = developmentChunks
): ScopedRetrievalIndex {
  return Object.freeze({
    async findAuthorizedCandidates(
      context: AuthorizedCondominiumContext
    ): Promise<readonly RetrievableChunk[]> {
      return Object.freeze(
        chunks.filter(
          (chunk) =>
            context.permissions.includes("document:read") &&
            chunk.condominiumId === context.condominiumId
        )
      );
    }
  });
}
