import type {
  DocumentAuthoringSource,
  DocumentProposalPlan
} from "../../shared/document-proposal.js";
import { authoringInvalid } from "./document-authoring-contract.js";

// O subconjunto automático só organiza espaços: pontuação também pode mudar obrigações.
const compact = (text: string) => text.replace(/\s+/gu, " ").trim();
export function validateOriginalImprovement(
  plan: DocumentProposalPlan,
  sources: readonly DocumentAuthoringSource[]
): void {
  if (plan.status === "needs_context") return;
  if (plan.paragraphs.length !== sources.length || plan.pending.length)
    authoringInvalid("A oferta automática exige preservar todos os blocos, sem pendências.");
  for (const [index, source] of sources.entries()) {
    const paragraph = plan.paragraphs[index]!;
    const change = plan.changes.find((c) => c.paragraphId === paragraph.id);
    const coverage = plan.coverage.find((c) => c.sourceId === source.id);
    if (
      source.kind !== "document" ||
      !change ||
      change.kind !== "editorial" ||
      change.before?.sourceId !== source.id ||
      change.before.startOffset !== 0 ||
      change.before.endOffset !== source.text.length ||
      change.before.quote !== source.text ||
      compact(paragraph.text) !== compact(source.text) ||
      coverage?.disposition !== "represented" ||
      coverage.paragraphIds.length !== 1 ||
      coverage.paragraphIds[0] !== paragraph.id
    )
      authoringInvalid(
        "A oferta automática só pode organizar espaços e quebras, preservando integralmente cada bloco na ordem original."
      );
  }
}
export function originalIsUnchanged(
  plan: DocumentProposalPlan,
  sources: readonly DocumentAuthoringSource[]
) {
  return plan.status === "ready" && plan.paragraphs.every((p, i) => p.text === sources[i]?.text);
}
