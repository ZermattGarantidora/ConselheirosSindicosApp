import { documentVersionFromUpload, processDocumentVersion } from "./document-processing.js";
import type { UploadedDocumentRecord } from "./upload-document.js";
import { createInMemoryScopedRetrievalIndex } from "../retrieval/in-memory-scoped-retrieval.js";
import {
  chunkPage,
  type RetrievableChunk,
  type ScopedRetrievalIndex
} from "../retrieval/retrieval-contract.js";

export type DevelopmentDocumentMemoryStatus =
  "ready" | "pending_confirmation" | "needs_review" | "failed";

export type DevelopmentDocumentMemory = Readonly<{
  index: ScopedRetrievalIndex;
  indexUploaded(
    input: Readonly<{
      record: UploadedDocumentRecord;
      content: Buffer;
      validityConfirmed: boolean;
    }>
  ): Promise<DevelopmentDocumentMemoryStatus>;
}>;

export function createDevelopmentDocumentMemory(
  initialChunks: readonly RetrievableChunk[] = []
): DevelopmentDocumentMemory {
  const chunks: RetrievableChunk[] = [...initialChunks];
  const index = createInMemoryScopedRetrievalIndex(chunks);

  return Object.freeze({
    index,
    async indexUploaded({ record, content, validityConfirmed }) {
      const document = documentVersionFromUpload(record);
      const outcome = await processDocumentVersion({
        condominiumId: record.condominiumId,
        documentVersionId: record.documentVersionId,
        content,
        currentState: document.state
      });

      if (outcome.status === "failed") return "failed";
      if (outcome.status === "needs_review") return "needs_review";

      for (const page of outcome.pages) {
        for (const pageChunk of chunkPage({
          condominiumId: record.condominiumId,
          documentVersionId: record.documentVersionId,
          documentPageId: page.id,
          pageNumber: page.pageNumber,
          extractedText: page.extractedText
        })) {
          chunks.push(
            Object.freeze({
              id: `${record.documentVersionId}:${page.pageNumber}:${pageChunk.chunkIndex}`,
              condominiumId: record.condominiumId,
              documentId: record.documentId,
              documentVersionId: record.documentVersionId,
              documentVersionNumber: 1,
              documentTitle: record.title,
              documentType: record.documentType,
              sourceKind: "user_upload" as const,
              pageId: page.id,
              pageNumber: page.pageNumber,
              startOffset: pageChunk.startOffset,
              endOffset: pageChunk.endOffset,
              content: pageChunk.content,
              contentSha256: pageChunk.contentSha256,
              semanticScore: null,
              extractionMethod: page.extractionMethod,
              qualityScore: page.qualityScore,
              processingStatus: "ready" as const,
              validityStatus: validityConfirmed ? ("confirmed" as const) : ("pending" as const),
              validFrom: null,
              validUntil: null
            })
          );
        }
      }

      return validityConfirmed ? "ready" : "pending_confirmation";
    }
  });
}
