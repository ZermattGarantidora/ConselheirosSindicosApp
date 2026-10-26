import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  ArchivedDocument,
  DocumentCatalogRepository,
  RegisteredDocument
} from "./document-catalog.js";
import type { DocumentProcessingStatus } from "./document-model.js";
import type { DocumentCondominiumCheck } from "./document-condominium-check.js";
import type { DocumentUploadRepository, UploadedDocumentRecord } from "./upload-document.js";

export type DevelopmentDocumentRepository = DocumentUploadRepository & DocumentCatalogRepository;

export function createDevelopmentDocumentUploadRepository(
  initialDocuments: readonly RegisteredDocument[] = []
): DevelopmentDocumentRepository {
  const documents = initialDocuments.map((document) => Object.freeze({ ...document }));
  const archivedAtByDocumentId = new Map<string, string>();

  return {
    async recordUploaded(record: UploadedDocumentRecord) {
      const versionNumber =
        Math.max(
          0,
          ...documents
            .filter(
              (document) =>
                document.condominiumId === record.condominiumId &&
                document.documentId === record.documentId
            )
            .map((document) => document.versionNumber)
        ) + 1;
      documents.push(
        Object.freeze({
          condominiumId: record.condominiumId,
          documentId: record.documentId,
          documentVersionId: record.documentVersionId,
          title: record.title,
          documentType: record.documentType,
          versionNumber,
          sizeBytes: record.sizeBytes,
          mediaType: record.mediaType,
          processingStatus: record.processingStatus,
          validityStatus: record.validityStatus,
          createdAt: new Date().toISOString(),
          expectedPageCount: null,
          processedPageCount: null,
          searchablePageCount: null,
          unreadablePageNumbers: Object.freeze([]),
          extractionCompleteness: null,
          extractionMethod: null,
          ocrQualityScore: null,
          storageObjectId: record.storageObjectId,
          uploadedByCurrentUser: record.uploadedByUserId === "sindico-demo"
        })
      );
    },

    async listAuthorized(context: AuthorizedCondominiumContext) {
      const latestByDocument = new Map<string, RegisteredDocument>();
      for (const document of documents) {
        if (
          document.condominiumId !== context.condominiumId ||
          archivedAtByDocumentId.has(document.documentId)
        )
          continue;
        const current = latestByDocument.get(document.documentId);
        if (current === undefined || document.versionNumber > current.versionNumber) {
          latestByDocument.set(document.documentId, document);
        }
      }
      return Object.freeze(
        [...latestByDocument.values()].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
      );
    },

    async listArchivedAuthorized(context) {
      const latestByDocument = new Map<string, RegisteredDocument>();
      for (const document of documents) {
        if (document.condominiumId !== context.condominiumId) continue;
        const current = latestByDocument.get(document.documentId);
        if (current === undefined || document.versionNumber > current.versionNumber) {
          latestByDocument.set(document.documentId, document);
        }
      }
      return Object.freeze(
        [...latestByDocument.values()]
          .flatMap((document): ArchivedDocument[] => {
            const archivedAt = archivedAtByDocumentId.get(document.documentId);
            return archivedAt === undefined
              ? []
              : [
                  {
                    condominiumId: context.condominiumId,
                    documentId: document.documentId,
                    title: document.title,
                    archivedAt
                  }
                ];
          })
          .sort((left, right) => right.archivedAt.localeCompare(left.archivedAt))
      );
    },

    async updateProcessingStatus(
      context: AuthorizedCondominiumContext,
      input: Readonly<{
        documentVersionId: string;
        processingStatus: DocumentProcessingStatus;
        condominiumCheck?: DocumentCondominiumCheck;
      }>
    ) {
      const index = documents.findIndex(
        (document) =>
          document.condominiumId === context.condominiumId &&
          document.documentVersionId === input.documentVersionId
      );
      const current = documents[index];
      if (current === undefined) return;
      documents[index] = Object.freeze({
        ...current,
        processingStatus: input.processingStatus,
        ...(input.condominiumCheck === undefined
          ? {}
          : { condominiumCheck: input.condominiumCheck })
      });
    },

    async confirmCondominium(context, documentVersionId) {
      if (!context.permissions.includes("document:upload")) return false;
      const index = documents.findIndex(
        (document) =>
          document.condominiumId === context.condominiumId &&
          document.documentVersionId === documentVersionId
      );
      const current = documents[index];
      if (
        current?.condominiumCheck?.status !== "pending" ||
        current.processingStatus !== "needs_review" ||
        archivedAtByDocumentId.has(current.documentId) ||
        documents.some(
          (document) =>
            document.condominiumId === context.condominiumId &&
            document.documentId === current.documentId &&
            document.versionNumber > current.versionNumber
        )
      )
        return false;
      documents[index] = Object.freeze({
        ...current,
        processingStatus: current.condominiumCheck.resumeProcessingStatus,
        condominiumCheck: Object.freeze({
          ...current.condominiumCheck,
          status: "confirmed" as const
        })
      });
      return true;
    },

    async archiveAuthorized(context, documentId) {
      const current = documents.find(
        (document) =>
          document.condominiumId === context.condominiumId && document.documentId === documentId
      );
      if (current === undefined) return false;
      archivedAtByDocumentId.set(documentId, new Date().toISOString());
      return true;
    },

    async restoreAuthorized(context, documentId) {
      const current = documents.find(
        (document) =>
          document.condominiumId === context.condominiumId && document.documentId === documentId
      );
      if (current === undefined || !archivedAtByDocumentId.has(documentId)) return false;
      archivedAtByDocumentId.delete(documentId);
      return true;
    }
  };
}
