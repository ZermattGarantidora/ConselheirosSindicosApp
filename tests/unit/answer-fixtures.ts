import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { evaluateEvidenceSufficiency } from "../../apps/api/retrieval/retrieval-ranking.js";
import type {
  RetrievalEvidence,
  ScopedRetrievalResult
} from "../../apps/api/retrieval/retrieval-contract.js";

export const alameda = createCondominiumId("alameda");
export const bosque = createCondominiumId("bosque");
export const syntheticUserId = "sindico-sintetico" as AuthorizedCondominiumContext["userId"];

export const managerContext: AuthorizedCondominiumContext = Object.freeze({
  condominiumId: alameda,
  userId: syntheticUserId,
  roleKey: "manager",
  membershipRevision: "membership-synthetic-v1",
  permissions: Object.freeze(["document:read", "document:upload"] as const)
});

export const advisorContext: AuthorizedCondominiumContext = Object.freeze({
  condominiumId: alameda,
  userId: "morador-sintetico" as AuthorizedCondominiumContext["userId"],
  roleKey: "advisor",
  membershipRevision: "membership-advisor-v1",
  permissions: Object.freeze(["document:read"] as const)
});

export function createEvidence(overrides: Partial<RetrievalEvidence> = {}): RetrievalEvidence {
  const content = overrides.content ?? "A regra sintética permite o uso da área comum.";
  return Object.freeze({
    id: overrides.id ?? "chunk-1",
    condominiumId: overrides.condominiumId ?? alameda,
    documentId: overrides.documentId ?? "document-1",
    documentVersionId: overrides.documentVersionId ?? "version-1",
    documentVersionNumber: overrides.documentVersionNumber ?? 1,
    documentTitle: overrides.documentTitle ?? "Convenção sintética",
    documentType: overrides.documentType ?? "convention",
    sourceKind: overrides.sourceKind ?? "user_upload",
    pageId: overrides.pageId ?? "page-1",
    pageNumber: overrides.pageNumber ?? 1,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? Array.from(content).length,
    content,
    contentSha256: overrides.contentSha256 ?? "a".repeat(64),
    semanticScore: overrides.semanticScore ?? 0.8,
    extractionMethod: overrides.extractionMethod ?? "pdf_text",
    qualityScore: overrides.qualityScore ?? 0.99,
    processingStatus: overrides.processingStatus ?? "ready",
    validityStatus: overrides.validityStatus ?? "confirmed",
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null,
    lexicalScore: overrides.lexicalScore ?? 0.8,
    rerankScore: overrides.rerankScore ?? 0.8,
    rank: overrides.rank ?? 1
  });
}

export function createRetrievalResult(
  evidence: readonly RetrievalEvidence[] = [createEvidence()],
  overrides: Partial<ScopedRetrievalResult> = {}
): ScopedRetrievalResult {
  const selected = overrides.evidence ?? evidence;
  return Object.freeze({
    pipelineVersion: "hybrid-v1",
    queryHash: overrides.queryHash ?? "b".repeat(64),
    candidateCount: overrides.candidateCount ?? selected.length,
    selectedCount: overrides.selectedCount ?? selected.length,
    sufficiency: overrides.sufficiency ?? evaluateEvidenceSufficiency(selected),
    ...overrides,
    evidence: Object.freeze([...(overrides.evidence ?? selected)])
  });
}

export function fixedIdFactory(prefix = "id"): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

export function fixedNow(): Date {
  return new Date("2026-09-08T12:00:00.000Z");
}
