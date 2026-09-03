import type { DocumentVersion, DocumentVersionState } from "./document-model.js";

export type DocumentVersionSnapshot = Readonly<{
  version: DocumentVersion;
  state: DocumentVersionState;
}>;

export class DocumentVersionValidityConflictError extends Error {
  public constructor() {
    super("Mais de uma versão pronta está vigente para a mesma data.");
    this.name = "DocumentVersionValidityConflictError";
  }
}

function assertReferenceDate(referenceDate: Date): void {
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("A data de consulta da vigência é inválida.");
  }
}

function assertSameDocumentScope(versions: readonly DocumentVersionSnapshot[]): void {
  const first = versions[0];

  if (
    first !== undefined &&
    versions.some(
      (candidate) =>
        candidate.version.condominiumId !== first.version.condominiumId ||
        candidate.version.documentId !== first.version.documentId
    )
  ) {
    throw new Error("As versões precisam pertencer ao mesmo documento e condomínio.");
  }
}

function isWithinValidity(snapshot: DocumentVersionSnapshot, referenceDate: Date): boolean {
  const { validFrom, validUntil } = snapshot.state;

  return (
    (validFrom === null || Date.parse(validFrom) <= referenceDate.getTime()) &&
    (validUntil === null || referenceDate.getTime() < Date.parse(validUntil))
  );
}

function selectUnique(
  versions: readonly DocumentVersionSnapshot[],
  referenceDate: Date,
  includeSuperseded: boolean
): DocumentVersionSnapshot | undefined {
  assertReferenceDate(referenceDate);
  assertSameDocumentScope(versions);

  const candidates = versions.filter((snapshot) => {
    const validityIsSelectable =
      snapshot.state.validityStatus === "confirmed" ||
      (includeSuperseded && snapshot.state.validityStatus === "superseded");

    return (
      validityIsSelectable &&
      snapshot.state.processingStatus === "ready" &&
      isWithinValidity(snapshot, referenceDate)
    );
  });

  if (candidates.length > 1) {
    throw new DocumentVersionValidityConflictError();
  }

  return candidates[0];
}

export function selectCurrentDocumentVersion(
  versions: readonly DocumentVersionSnapshot[],
  referenceDate: Date = new Date()
): DocumentVersionSnapshot | undefined {
  return selectUnique(versions, referenceDate, false);
}

export function selectDocumentVersionForDate(
  versions: readonly DocumentVersionSnapshot[],
  referenceDate: Date
): DocumentVersionSnapshot | undefined {
  return selectUnique(versions, referenceDate, true);
}
