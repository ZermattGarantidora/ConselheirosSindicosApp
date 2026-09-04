import { describe, expect, it } from "vitest";

import {
  evaluateEvidenceSufficiency,
  rerankScore
} from "../../apps/api/retrieval/retrieval-ranking.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";

function evidence(rerank: number): RetrievalEvidence {
  return {
    id: `evidence-${rerank}`,
    condominiumId: createCondominiumId("alameda"),
    documentId: "document-1",
    documentVersionId: "version-1",
    documentVersionNumber: 1,
    documentTitle: "Convenção sintética",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "page-1",
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    content: "Regra sintética",
    contentSha256: "a".repeat(64),
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null,
    lexicalScore: rerank,
    rerankScore: rerank,
    rank: 1
  };
}

describe("reranking e suficiência do retrieval", () => {
  it("combina sinais lexicais, semânticos e de qualidade", () => {
    expect(rerankScore({ lexicalScore: 0.5, semanticScore: null, qualityScore: 1 })).toBeCloseTo(
      0.6
    );
    expect(rerankScore({ lexicalScore: 0.4, semanticScore: 0.9, qualityScore: 1 })).toBeCloseTo(
      0.64
    );
  });

  it("diferencia ausência de evidência de evidência fraca e suficiente", () => {
    expect(evaluateEvidenceSufficiency([])).toMatchObject({
      status: "insufficient",
      reason: "no_evidence",
      supportingEvidenceCount: 0
    });
    expect(evaluateEvidenceSufficiency([evidence(0.2)])).toMatchObject({
      status: "weak",
      reason: "low_relevance"
    });
    expect(evaluateEvidenceSufficiency([evidence(0.8)])).toMatchObject({
      status: "sufficient",
      reason: "enough_relevance",
      supportingEvidenceCount: 1
    });
  });
});
