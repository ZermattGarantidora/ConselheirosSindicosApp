import { createHash } from "node:crypto";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
export type DocumentaryReplayLedger = Readonly<{ version: 1; dependencies: readonly string[] }>;
function fingerprint(source: RetrievalEvidence): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        source.condominiumId,
        source.documentId,
        source.documentVersionId,
        source.pageId,
        source.pageNumber,
        source.id,
        source.contentSha256,
        createHash("sha256").update(source.content).digest("hex"),
        source.sourceScope ?? "condominium",
        source.validityStatus,
        source.validFrom?.toISOString() ?? null,
        source.validUntil?.toISOString() ?? null
      ])
    )
    .digest("hex");
}
export function documentaryReplayLedger(
  evidence: readonly RetrievalEvidence[]
): DocumentaryReplayLedger | undefined {
  if (
    !evidence.length ||
    evidence.length > 8 ||
    evidence.some(
      (source) =>
        source.processingStatus !== "ready" ||
        source.qualityScore < 0.7 ||
        !["confirmed", "not_applicable"].includes(source.validityStatus)
    )
  )
    return undefined;
  return { version: 1, dependencies: [...new Set(evidence.map(fingerprint))] };
}
export function parseDocumentaryReplayLedger(value: unknown): DocumentaryReplayLedger | undefined {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : undefined;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.dependencies) ||
      !parsed.dependencies.length ||
      parsed.dependencies.length > 8 ||
      parsed.dependencies.some(
        (id: unknown) => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)
      )
    )
      return undefined;
    return { version: 1, dependencies: parsed.dependencies };
  } catch {
    return undefined;
  }
}
export function canReplayDocumentaryAnswer(
  ledger: DocumentaryReplayLedger | undefined,
  current: readonly RetrievalEvidence[]
): boolean {
  const available = documentaryReplayLedger(current);
  return (
    ledger?.version === 1 &&
    !!ledger.dependencies.length &&
    !!available &&
    ledger.dependencies.every((dependency) => available.dependencies.includes(dependency))
  );
}
