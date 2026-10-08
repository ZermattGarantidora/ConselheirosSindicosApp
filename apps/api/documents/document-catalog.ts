import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  DocumentExtractionMethod,
  DocumentMediaType,
  DocumentProcessingStatus,
  DocumentType,
  DocumentValidityStatus
} from "./document-model.js";

export type RegisteredDocument = Readonly<{
  condominiumId: AuthorizedCondominiumContext["condominiumId"];
  documentId: string;
  documentVersionId: string;
  title: string;
  documentType: DocumentType;
  versionNumber: number;
  sizeBytes: number;
  mediaType?: DocumentMediaType;
  processingStatus: DocumentProcessingStatus;
  validityStatus: DocumentValidityStatus;
  createdAt: string;
  expectedPageCount: number | null;
  processedPageCount: number | null;
  searchablePageCount: number | null;
  unreadablePageNumbers: readonly number[];
  extractionCompleteness: number | null;
  extractionMethod: DocumentExtractionMethod | null;
  ocrQualityScore: number | null;
  storageObjectId?: string;
  uploadedByCurrentUser?: boolean;
}>;

export type ArchivedDocument = Readonly<{
  condominiumId: AuthorizedCondominiumContext["condominiumId"];
  documentId: string;
  title: string;
  archivedAt: string;
}>;

export interface DocumentCatalogRepository {
  listAuthorized(context: AuthorizedCondominiumContext): Promise<readonly RegisteredDocument[]>;
  listArchivedAuthorized?(
    context: AuthorizedCondominiumContext
  ): Promise<readonly ArchivedDocument[]>;
  updateProcessingStatus?(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      documentVersionId: string;
      processingStatus: DocumentProcessingStatus;
    }>
  ): Promise<void>;
  archiveAuthorized?(context: AuthorizedCondominiumContext, documentId: string): Promise<boolean>;
  restoreAuthorized?(context: AuthorizedCondominiumContext, documentId: string): Promise<boolean>;
}

export class DocumentCatalogForbiddenError extends Error {
  public constructor() {
    super("O usuário não possui permissão para consultar documentos.");
    this.name = "DocumentCatalogForbiddenError";
  }
}

export async function listRegisteredDocuments(
  repository: DocumentCatalogRepository,
  context: AuthorizedCondominiumContext
): Promise<readonly RegisteredDocument[]> {
  if (!context.permissions.includes("document:read")) {
    throw new DocumentCatalogForbiddenError();
  }

  const documents = await repository.listAuthorized(context);
  return Object.freeze(
    documents
      .filter((document) => document.condominiumId === context.condominiumId)
      .map((document) => Object.freeze({ ...document }))
  );
}
