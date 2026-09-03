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
  validFrom: string | null;
  validUntil: string | null;
  ocrQualityScore: number | null;
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
    state: Object.freeze({
      processingStatus: "uploaded",
      validityStatus: "pending",
      validFrom: null,
      validUntil: null,
      ocrQualityScore: null
    })
  });
}

const allowedProcessingTransitions: Readonly<
  Record<DocumentProcessingStatus, readonly DocumentProcessingStatus[]>
> = Object.freeze({
  uploaded: ["processing", "failed"],
  processing: ["ready", "needs_review", "failed"],
  ready: [],
  needs_review: ["processing", "failed"],
  failed: ["processing"]
});

function freezeState(state: DocumentVersionState): DocumentVersionState {
  return Object.freeze({ ...state });
}

function assertValidDateRange(validFrom: Date | null, validUntil: Date | null): void {
  if (validFrom !== null && Number.isNaN(validFrom.getTime())) {
    throw new Error("A data inicial de vigência é inválida.");
  }

  if (validUntil !== null && Number.isNaN(validUntil.getTime())) {
    throw new Error("A data final de vigência é inválida.");
  }

  if (validFrom !== null && validUntil !== null && validUntil <= validFrom) {
    throw new Error("A data final de vigência deve ser posterior à data inicial.");
  }
}

export function transitionDocumentProcessing(
  state: DocumentVersionState,
  processingStatus: DocumentProcessingStatus,
  ocrQualityScore: number | null = state.ocrQualityScore
): DocumentVersionState {
  if (!allowedProcessingTransitions[state.processingStatus].includes(processingStatus)) {
    throw new Error("Transição de processamento documental não permitida.");
  }

  if (
    ocrQualityScore !== null &&
    (!Number.isFinite(ocrQualityScore) || ocrQualityScore < 0 || ocrQualityScore > 1)
  ) {
    throw new Error("A qualidade de OCR deve estar entre 0 e 1.");
  }

  if (processingStatus === "ready" && state.validityStatus === "superseded") {
    throw new Error("Uma versão substituída não pode voltar a ficar pronta para consulta.");
  }

  return freezeState({ ...state, processingStatus, ocrQualityScore });
}

export function confirmDocumentValidity(
  state: DocumentVersionState,
  input: Readonly<{ validFrom: Date | null; validUntil: Date | null }>
): DocumentVersionState {
  if (state.validityStatus !== "pending") {
    throw new Error("Somente uma vigência pendente pode ser confirmada.");
  }

  assertValidDateRange(input.validFrom, input.validUntil);

  return freezeState({
    ...state,
    validityStatus: "confirmed",
    validFrom: input.validFrom === null ? null : input.validFrom.toISOString(),
    validUntil: input.validUntil === null ? null : input.validUntil.toISOString()
  });
}

export function markDocumentVersionSuperseded(state: DocumentVersionState): DocumentVersionState {
  if (state.validityStatus !== "confirmed") {
    throw new Error("Somente uma versão com vigência confirmada pode ser substituída.");
  }

  return freezeState({ ...state, validityStatus: "superseded" });
}
