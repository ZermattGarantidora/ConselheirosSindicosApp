import {
  documentAuthoringVersion,
  type DocumentAuthoringRequest,
  type DocumentAuthoringSource,
  type DocumentProposalPlan
} from "../../apps/shared/document-proposal.js";
import type { DocumentAuthoringModel } from "../../apps/api/authoring/document-authoring.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
export const syntheticAuthoringText =
  "FICTÍCIO. Para usar o salão, solicite reserva com antecedência de 24 horas.";
export function syntheticAuthoringDocument(
  context: AuthorizedCondominiumContext
): RegisteredDocument {
  return {
    condominiumId: context.condominiumId,
    documentId: "synthetic-document",
    documentVersionId: "synthetic-version",
    title: "FICTÍCIO. Regimento",
    documentType: "internal_rules",
    versionNumber: 1,
    sizeBytes: 100,
    processingStatus: "ready",
    validityStatus: "confirmed",
    createdAt: "2026-11-16T12:00:00Z",
    expectedPageCount: 1,
    processedPageCount: 1,
    searchablePageCount: 1,
    extractionCompleteness: 1,
    unreadablePageNumbers: [],
    extractionMethod: "pdf_text",
    ocrQualityScore: null
  };
}
import {
  authoringHash,
  type DocumentAuthoringReview
} from "../../apps/api/authoring/document-authoring-contract.js";
export function syntheticDocumentPlan(
  request: DocumentAuthoringRequest,
  sources: readonly DocumentAuthoringSource[]
): DocumentProposalPlan {
  const ref = (s: DocumentAuthoringSource) => ({
    sourceId: s.id,
    startOffset: 0,
    endOffset: s.text.length,
    quote: s.text
  });
  const paragraphs = sources.map((s, index) => ({
    id: `paragraph_${index}`,
    text:
      s.kind === "document"
        ? `Proposta para conferência: ${s.text}`
        : `Segundo o relato declarado: ${s.text}`,
    provenance: s.kind === "document" ? ("document_fact" as const) : ("user_report" as const),
    references: [ref(s)]
  }));
  const original = sources.find((s) => s.kind === "document");
  const ready = Boolean(sources.length && (request.operation === "create" || original));
  return {
    version: documentAuthoringVersion,
    status: ready ? "ready" : "needs_context",
    message: ready
      ? "Preparei uma proposta sintética com as fontes indicadas, para sua conferência."
      : "Preciso do documento ou relato para fundamentar a proposta.",
    title: request.title,
    documentKind: request.documentKind,
    operation: request.operation,
    paragraphs: ready ? paragraphs : [],
    changes: ready
      ? paragraphs.map((p, index) => ({
          id: `change_${index}`,
          paragraphId: p.id,
          before: original ? ref(original) : null,
          after: p.text,
          kind: "editorial" as const,
          reason: "Reorganização da redação com apoio no trecho indicado.",
          references: p.references
        }))
      : [],
    coverage: sources.map((s, index) => ({
      sourceId: s.id,
      disposition: ready ? "represented" : "pending",
      paragraphIds: ready ? [paragraphs[index]!.id] : [],
      reason: ready
        ? "Trecho contemplado explicitamente na proposta."
        : "É necessário conferir o documento original."
    })),
    pending: ready ? [] : ["Forneça a base necessária antes de preparar o texto."],
    requiresSpecialist: sources.some((s) =>
      ["convention", "internal_rules", "contract"].includes(s.documentType ?? "")
    )
  };
}
export function approvedDocumentReview(
  plan: DocumentProposalPlan,
  sources: readonly DocumentAuthoringSource[],
  sourceHash = authoringHash(sources)
): DocumentAuthoringReview {
  return {
    version: documentAuthoringVersion,
    planHash: authoringHash(plan),
    sourceHash,
    accepted: true,
    messageSupported: true,
    issues: [],
    paragraphs: plan.paragraphs.map((p) => ({
      id: p.id,
      supported: true,
      provenanceCorrect: true
    })),
    changes: plan.changes.map((c) => ({ id: c.id, supported: true, beforeAfterCorrect: true })),
    sources: sources.map((s) => ({ sourceId: s.id, coverageAdequate: true }))
  };
}
export function syntheticDocumentAuthoringModel(
  onCall?: (input: Parameters<DocumentAuthoringModel["complete"]>[0]) => unknown
): DocumentAuthoringModel {
  return {
    enabled: true,
    key: "synthetic-document-authoring-v1",
    async complete(input) {
      const override = await onCall?.(input);
      if (override !== undefined) return override;
      const data = input.data as {
        request: DocumentAuthoringRequest;
        sources: DocumentAuthoringSource[];
        plan?: DocumentProposalPlan;
        sourceHash: string;
      };
      return input.phase === "write"
        ? syntheticDocumentPlan(data.request, data.sources)
        : approvedDocumentReview(data.plan!, data.sources, data.sourceHash);
    }
  };
}
