import type { EvidenceSufficiency, RetrievalEvidence } from "./retrieval-contract.js";

export type SufficiencyOptions = Readonly<{
  minimumEvidence?: number;
  minimumScore?: number;
}>;

export function rerankScore(
  input: Readonly<{
    lexicalScore: number;
    semanticScore: number | null;
    qualityScore: number;
  }>
): number {
  if (input.semanticScore === null) {
    return Math.min(1, input.lexicalScore * 0.8 + input.qualityScore * 0.2);
  }

  return Math.min(
    1,
    input.lexicalScore * 0.55 + input.semanticScore * 0.3 + input.qualityScore * 0.15
  );
}

export function evaluateEvidenceSufficiency(
  evidence: readonly RetrievalEvidence[],
  options: SufficiencyOptions = {}
): EvidenceSufficiency {
  const minimumEvidence = options.minimumEvidence ?? 1;
  const minimumScore = options.minimumScore ?? 0.35;
  const supportingEvidenceCount = evidence.filter(
    (item) => item.rerankScore >= minimumScore
  ).length;

  if (evidence.length === 0) {
    return Object.freeze({
      status: "insufficient" as const,
      reason: "no_evidence" as const,
      supportingEvidenceCount
    });
  }

  if (supportingEvidenceCount < minimumEvidence) {
    return Object.freeze({
      status: "weak" as const,
      reason: "low_relevance" as const,
      supportingEvidenceCount
    });
  }

  return Object.freeze({
    status: "sufficient" as const,
    reason: "enough_relevance" as const,
    supportingEvidenceCount
  });
}
