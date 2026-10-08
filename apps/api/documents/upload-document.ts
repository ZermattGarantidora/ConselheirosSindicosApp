import { createHash, randomUUID } from "node:crypto";

import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { DocumentMediaType, DocumentType } from "./document-model.js";
import type { PrivateDocumentStorage } from "./private-document-storage.js";

export const maximumPdfUploadBytes = 25 * 1024 * 1024;
export const maximumImageUploadBytes = 10 * 1024 * 1024;
export const maximumDocumentUploadBytes = maximumPdfUploadBytes;

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
  mediaType: DocumentMediaType;
  uploadedByUserId: AuthorizedCondominiumContext["userId"];
  processingStatus: "uploaded";
  validityStatus: "pending" | "confirmed";
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

function hasPngStructure(content: Buffer): boolean {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (content.length < 45 || !content.subarray(0, 8).equals(signature)) return false;
  const headerLength = content.readUInt32BE(8);
  const width = content.readUInt32BE(16);
  const height = content.readUInt32BE(20);
  if (
    headerLength !== 13 ||
    content.toString("ascii", 12, 16) !== "IHDR" ||
    width < 1 ||
    height < 1 ||
    width * height > 100_000_000
  )
    return false;

  let offset = 8;
  let foundImageData = false;
  while (offset + 12 <= content.length) {
    const length = content.readUInt32BE(offset);
    if (length > content.length - offset - 12) return false;
    const type = content.toString("ascii", offset + 4, offset + 8);
    if (offset === 8 && (type !== "IHDR" || length !== 13)) return false;
    if (type === "IDAT") foundImageData = true;
    offset += length + 12;
    if (type === "IEND") return length === 0 && foundImageData && offset === content.length;
  }
  return false;
}

function hasJpegStructure(content: Buffer): boolean {
  if (
    content.length < 12 ||
    content[0] !== 0xff ||
    content[1] !== 0xd8 ||
    content[content.length - 2] !== 0xff ||
    content[content.length - 1] !== 0xd9
  )
    return false;

  let offset = 2;
  let hasFrame = false;
  let hasScan = false;
  while (offset + 4 <= content.length) {
    if (content[offset] !== 0xff) return false;
    while (content[offset] === 0xff) offset += 1;
    const marker = content[offset];
    offset += 1;
    if (marker === 0xda) {
      hasScan = true;
      break;
    }
    if (marker === 0xd9 || marker === undefined) return false;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > content.length) return false;
    const length = content.readUInt16BE(offset);
    if (length < 2 || offset + length > content.length) return false;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker
      )
    ) {
      if (length < 8) return false;
      const height = content.readUInt16BE(offset + 3);
      const width = content.readUInt16BE(offset + 5);
      if (width < 1 || height < 1 || width * height > 100_000_000) return false;
      hasFrame = true;
    }
    offset += length;
  }
  return hasFrame && hasScan && content.indexOf(Buffer.from([0xff, 0xd9]), offset) >= offset;
}

function assertDocumentContent(content: Buffer, mediaType: DocumentMediaType): void {
  const isTooLarge =
    mediaType === "application/pdf"
      ? content.length > maximumPdfUploadBytes
      : content.length > maximumImageUploadBytes;
  if (content.length === 0 || isTooLarge) {
    throw new InvalidDocumentUploadError("O arquivo excede o limite permitido ou está vazio.");
  }
  const valid =
    mediaType === "application/pdf"
      ? content.subarray(0, 5).equals(Buffer.from("%PDF-"))
      : mediaType === "image/png"
        ? hasPngStructure(content)
        : hasJpegStructure(content);
  if (!valid)
    throw new InvalidDocumentUploadError(
      "O conteúdo do arquivo não corresponde ao formato informado."
    );
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
    mediaType?: DocumentMediaType;
    documentId?: string;
    validityConfirmed?: boolean;
  }>
): Promise<UploadedDocumentRecord> {
  if (!context.permissions.includes("document:upload")) {
    throw new DocumentUploadForbiddenError();
  }

  const mediaType = input.mediaType ?? "application/pdf";
  assertDocumentContent(input.content, mediaType);
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
    content: input.content,
    uploadedByUserId: context.userId
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
    mediaType,
    uploadedByUserId: context.userId,
    processingStatus: "uploaded",
    validityStatus: input.validityConfirmed === true ? "confirmed" : "pending"
  });

  try {
    await repository.recordUploaded(record);
  } catch (error: unknown) {
    await storage.removeOriginal({
      condominiumId: context.condominiumId,
      objectId: storageObjectId,
      uploadedByUserId: context.userId
    });
    throw error;
  }

  return record;
}
