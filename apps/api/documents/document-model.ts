import type { CondominiumId } from "../core/condominium-scope.js";

export type DocumentType =
  "convention" | "internal_rules" | "meeting_minutes" | "contract" | "other";

export type DocumentProcessingStatus =
  "uploaded" | "processing" | "ready" | "needs_review" | "failed";

export type DocumentValidityStatus =
  "pending" | "confirmed" | "disputed" | "superseded" | "not_applicable";

export type DocumentRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  title: string;
  type: DocumentType;
}>;

export type DocumentVersion = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  documentId: string;
  versionNumber: number;
  contentSha256: string;
  mediaType: "application/pdf";
  sizeBytes: number;
}>;

export type DocumentVersionState = Readonly<{
  processingStatus: DocumentProcessingStatus;
  validityStatus: DocumentValidityStatus;
}>;

export type DocumentPage = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  documentVersionId: string;
  pageIndex: number;
  pageNumber: number;
}>;

export type DocumentChunk = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  documentVersionId: string;
  documentPageId: string;
  chunkIndex: number;
}>;

export type ProcessingJobRecord = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  documentVersionId: string;
  jobType: "extract_text" | "ocr" | "chunk" | "embed";
}>;

export function createDocumentVersion(
  input: DocumentVersion
): Readonly<{ version: DocumentVersion; state: DocumentVersionState }> {
  if (!Number.isInteger(input.versionNumber) || input.versionNumber < 1) {
    throw new Error("DocumentVersion.versionNumber deve ser um inteiro positivo.");
  }

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1) {
    throw new Error("DocumentVersion.sizeBytes deve ser um inteiro positivo.");
  }

  if (!/^[a-f0-9]{64}$/i.test(input.contentSha256)) {
    throw new Error("DocumentVersion.contentSha256 deve ser um SHA-256 hexadecimal.");
  }

  return Object.freeze({
    version: Object.freeze({ ...input }),
    state: Object.freeze({ processingStatus: "uploaded", validityStatus: "pending" })
  });
}
