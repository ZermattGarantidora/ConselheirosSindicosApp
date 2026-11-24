import type { DocumentUploadProgress } from "./ChatDocumentAttachments.js";
import type { DocumentToView } from "./DocumentViewer.js";
import type { LibraryDocument } from "./document-library.js";

/** A recovered upload is reconciled only with its current tenant and exact version. */
export function recoveredDocumentProgress(
  document: DocumentToView | undefined,
  local: DocumentUploadProgress | undefined,
  catalog: readonly LibraryDocument[] | undefined,
  pending: boolean,
  error?: string
): DocumentUploadProgress | undefined {
  if (document === undefined) return local;
  const base = local ?? {
    id: `recorded:${document.condominiumId}:${document.documentVersionId}`,
    name: document.title,
    document,
    phase: "processing" as const
  };
  if (error) return { ...base, error };
  const registered = catalog?.find(
    (item) =>
      item.condominiumId === document.condominiumId &&
      item.documentVersionId === document.documentVersionId
  );
  if (registered !== undefined) {
    const status = registered.processingStatus;
    const phase =
      registered.condominiumCheck?.status === "pending"
        ? "needs_review"
        : status === "ready" || status === "needs_review" || status === "failed"
          ? status
          : "processing";
    return {
      id: base.id,
      name: base.name,
      document,
      phase,
      ...(local?.phase === "ready" && phase === "ready" && local.error
        ? { error: local.error }
        : {})
    };
  }
  if (pending || catalog === undefined) return base;
  return { ...base, phase: "failed", error: "Documento indisponível neste condomínio." };
}
