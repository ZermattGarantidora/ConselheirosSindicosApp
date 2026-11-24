import { expect, it } from "vitest";
import { validateDocumentPlan } from "../../apps/api/authoring/document-authoring-contract.js";
import {
  originalIsUnchanged,
  validateOriginalImprovement
} from "../../apps/api/authoring/original-document-improvements.js";
import { syntheticDocumentPlan } from "../fixtures/document-authoring.js";
import type {
  DocumentAuthoringRequest,
  DocumentAuthoringSource,
  DocumentProposalPlan
} from "../../apps/shared/document-proposal.js";
const request: DocumentAuthoringRequest = {
  title: "FICTÍCIO",
  documentKind: "Comunicado",
  operation: "improve",
  request: "Organize espaços.",
  report: "",
  documentVersionIds: ["synthetic-version"]
};
const sources: readonly DocumentAuthoringSource[] = [1, 2].map((page) => ({
  id: `document:synthetic-version:${page}`,
  kind: "document",
  title: "FICTÍCIO",
  text: `FICTÍCIO.  Não aprovar a despesa de R$ ${page}0,00 sem revisão.`,
  documentId: "synthetic-document",
  documentVersionId: "synthetic-version",
  page
}));
function plan(unchanged = false): DocumentProposalPlan {
  const base = syntheticDocumentPlan(request, sources);
  const paragraphs = base.paragraphs.map((p, i) => ({
    ...p,
    text: unchanged ? sources[i]!.text : sources[i]!.text.replace(/ {2,}/gu, " ")
  }));
  return {
    ...base,
    paragraphs,
    changes: base.changes.map((c, i) => ({
      ...c,
      before: {
        sourceId: sources[i]!.id,
        startOffset: 0,
        endOffset: sources[i]!.text.length,
        quote: sources[i]!.text
      },
      after: paragraphs[i]!.text
    }))
  };
}
it("AC-7338: preserva todos os blocos e distingue texto idêntico de organização", () => {
  for (const unchanged of [false, true]) {
    const p = validateDocumentPlan(plan(unchanged), request, sources);
    expect(() => validateOriginalImprovement(p, sources)).not.toThrow();
    expect(originalIsUnchanged(p, sources)).toBe(unchanged);
  }
});
it.each([
  "words",
  "number",
  "punctuation",
  "joining",
  "order",
  "omit",
  "pending",
  "factual",
  "before",
  "coverage",
  "report"
] as const)("AC-7338/40: %s bloqueia a oferta conservadora", (mode) => {
  type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
  const p = structuredClone(plan()) as Mutable<DocumentProposalPlan>; // Mutação proposital de saída não confiável.
  if (mode === "words") p.paragraphs[0]!.text = p.paragraphs[0]!.text.replace("Não ", "");
  if (mode === "number") p.paragraphs[0]!.text = p.paragraphs[0]!.text.replace("10,00", "20,00");
  if (mode === "punctuation") p.paragraphs[0]!.text = p.paragraphs[0]!.text.replace(".", "!");
  if (mode === "joining")
    p.paragraphs[0]!.text = p.paragraphs[0]!.text.replace("Não aprovar", "Nãoaprovar");
  if (mode === "order") p.paragraphs.reverse();
  if (mode === "omit") p.paragraphs.pop();
  if (mode === "pending") p.pending = ["Dado ausente."];
  if (mode === "factual") p.changes[0]!.kind = "factual";
  if (mode === "before") p.changes[0]!.before!.endOffset--;
  if (mode === "coverage") p.coverage[0]!.paragraphIds.push(p.paragraphs[1]!.id);
  const input =
    mode === "report" ? sources.map((s) => ({ ...s, kind: "user_report" as const })) : sources;
  expect(() => validateOriginalImprovement(p, input)).toThrow();
});
it("AC-7339: falta de contexto não produz texto aplicável", () => {
  const p: DocumentProposalPlan = {
    ...plan(),
    status: "needs_context",
    paragraphs: [],
    changes: [],
    pending: ["Confira o original."],
    coverage: sources.map((s) => ({
      sourceId: s.id,
      disposition: "pending",
      paragraphIds: [],
      reason: "É necessário contexto."
    }))
  };
  expect(() =>
    validateOriginalImprovement(validateDocumentPlan(p, request, sources), sources)
  ).not.toThrow();
  expect(originalIsUnchanged(p, sources)).toBe(false);
});
