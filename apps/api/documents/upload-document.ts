import { createHash, randomUUID } from "node:crypto";

import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { DocumentType } from "./document-model.js";
import type { PrivateDocumentStorage } from "./private-document-storage.js";

export const maximumPdfUploadBytes = 10 * 1024 * 1024;

export type UploadedDocumentRecord = Readonly<{
  condominiumId: AuthorizedCondominiumContext["condominiumId"];
  documentId: string;
  documentVersionId: string;
  storageObjectId: string;
  storageKey: string;
  title: string;
  documentType: DocumentType;
  contentSha256: string;
  sizeBytes: number;
  uploadedByUserId: AuthorizedCondominiumContext["userId"];
  processingStatus: "uploaded";
  validityStatus: "pending";
}>;

export interface DocumentUploadRepository {
  recordUploaded(input: UploadedDocumentRecord): Promise<void>;
}

export class InvalidDocumentUploadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidDocumentUploadError";
  }
}

export class DocumentUploadForbiddenError extends Error {
  public constructor() {
    super("O usuário não possui permissão para enviar documentos.");
    this.name = "DocumentUploadForbiddenError";
  }
}

const documentTypes: readonly DocumentType[] = [
  "convention",
  "internal_rules",
  "meeting_minutes",
  "contract",
  "other"
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertPdf(content: Buffer): void {
  if (content.length === 0 || content.length > maximumPdfUploadBytes) {
    throw new InvalidDocumentUploadError("O PDF excede o limite permitido.");
  }

  if (!content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new InvalidDocumentUploadError("O arquivo não possui uma assinatura PDF válida.");
  }
}

function validateMetadata(input: Readonly<{ title: string; documentType: string }>): DocumentType {
  if (input.title.trim().length === 0 || input.title.trim().length > 200) {
    throw new InvalidDocumentUploadError(
      "O título do documento é obrigatório e deve ter até 200 caracteres."
    );
  }

  if (!documentTypes.includes(input.documentType as DocumentType)) {
    throw new InvalidDocumentUploadError("O tipo de documento não é permitido.");
  }

  return input.documentType as DocumentType;
}

export async function uploadDocument(
  storage: PrivateDocumentStorage,
  repository: DocumentUploadRepository,
  context: AuthorizedCondominiumContext,
  input: Readonly<{
    title: string;
    documentType: string;
    content: Buffer;
    documentId?: string;
  }>
): Promise<UploadedDocumentRecord> {
  if (!context.permissions.includes("document:upload")) {
    throw new DocumentUploadForbiddenError();
  }

  assertPdf(input.content);
  const documentType = validateMetadata(input);
  const documentId = input.documentId?.trim() || randomUUID();
  if (!uuidPattern.test(documentId)) {
    throw new InvalidDocumentUploadError("O identificador do documento é inválido.");
  }
  const documentVersionId = randomUUID();
  const storageObjectId = randomUUID();
  const stored = await storage.storeOriginal({
    condominiumId: context.condominiumId,
    objectId: storageObjectId,
    content: input.content
  });
  const record: UploadedDocumentRecord = Object.freeze({
    condominiumId: context.condominiumId,
    documentId,
    documentVersionId,
    storageObjectId,
    storageKey: stored.storageKey,
    title: input.title.trim(),
    documentType,
    contentSha256: createHash("sha256").update(input.content).digest("hex"),
    sizeBytes: input.content.length,
    uploadedByUserId: context.userId,
    processingStatus: "uploaded",
    validityStatus: "pending"
  });

  try {
    await repository.recordUploaded(record);
  } catch (error: unknown) {
    await storage.removeOriginal({
      condominiumId: context.condominiumId,
      objectId: storageObjectId
    });
    throw error;
  }

  return record;
}
