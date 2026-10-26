import { documentVersionFromUpload, processDocumentVersion } from "./document-processing.js";
import type { UploadedDocumentRecord } from "./upload-document.js";
import type { DocumentCondominiumCheck } from "./document-condominium-check.js";
import {
  createMemoryDocumentAnalysisReader,
  type DocumentAnalysisReader
} from "../analysis/document-analysis-reader.js";
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
  analysisReader: DocumentAnalysisReader;
  getCondominiumCheck(
    condominiumId: string,
    documentVersionId: string
  ): DocumentCondominiumCheck | undefined;
  confirmCondominium(condominiumId: string, documentVersionId: string): void;
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
  const condominiumChecks = new Map<string, DocumentCondominiumCheck>();

  return Object.freeze({
    index,
    analysisReader: createMemoryDocumentAnalysisReader(chunks),
    getCondominiumCheck: (condominiumId: string, documentVersionId: string) =>
      condominiumChecks.get(`${condominiumId}:${documentVersionId}`),
    confirmCondominium(condominiumId: string, documentVersionId: string) {
      const check = condominiumChecks.get(`${condominiumId}:${documentVersionId}`);
      if (check?.status !== "pending") return;
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index]!;
        if (chunk.condominiumId === condominiumId && chunk.documentVersionId === documentVersionId)
          chunks[index] = Object.freeze({
            ...chunk,
            processingStatus: check.resumeProcessingStatus
          });
      }
      condominiumChecks.set(
        `${condominiumId}:${documentVersionId}`,
        Object.freeze({ ...check, status: "confirmed" })
      );
    },
    async indexUploaded({ record, content, validityConfirmed }) {
      const document = documentVersionFromUpload(record);
      const outcome = await processDocumentVersion({
        condominiumId: record.condominiumId,
        documentId: record.documentId,
        documentVersionId: record.documentVersionId,
        content,
        mediaType: record.mediaType,
        currentState: document.state,
        title: record.title,
        ...(record.selectedCondominiumName === undefined
          ? {}
          : { selectedCondominiumName: record.selectedCondominiumName })
      });

      if (outcome.condominiumCheck !== undefined)
        condominiumChecks.set(
          `${record.condominiumId}:${record.documentVersionId}`,
          outcome.condominiumCheck
        );

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
              documentType: outcome.documentIdentification?.documentType ?? record.documentType,
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
              processingStatus:
                outcome.condominiumCheck?.status === "pending"
                  ? ("needs_review" as const)
                  : ("ready" as const),
              validityStatus: validityConfirmed ? ("confirmed" as const) : ("pending" as const),
              validFrom: null,
              validUntil: null
            })
          );
        }
      }

      return outcome.condominiumCheck?.status === "pending"
        ? "needs_review"
        : validityConfirmed
          ? "ready"
          : "pending_confirmation";
    }
  });
}
