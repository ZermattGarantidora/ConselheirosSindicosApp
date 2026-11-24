import { createHash } from "node:crypto";
import {
  documentAuthoringVersion,
  type DocumentAuthoringRequest,
  type DocumentAuthoringSource,
  type DocumentProposalPlan,
  type DocumentProposalReference
} from "../../shared/document-proposal.js";
import { DocumentDraftError } from "./document-drafts.js";
export const authoringHash = (value: unknown): string => {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)])
          )
        : v;
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
};
export const authoringLimits = Object.freeze({
  sourceCharacters: 80_000,
  sources: 20,
  outputCharacters: 80_000,
  planBytes: 110_000,
  requestBytes: 200_000
});
export function authoringInvalid(
  message = "A proposta não passou pela conferência de fontes e alterações."
): never {
  throw new DocumentDraftError(422, message);
}
const text = (v: unknown, max: number, empty = false): v is string =>
  typeof v === "string" &&
  (empty || v.trim().length > 0) &&
  v.length <= max &&
  !/\p{Cc}/u.test(v.replace(/[\r\n\t]/gu, ""));
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> =>
  Boolean(
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v).length === keys.length &&
    Object.keys(v).every((k) => keys.includes(k))
  );
const list = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max;
const id = (v: unknown): v is string => typeof v === "string" && /^[a-z][a-z0-9_-]{0,59}$/u.test(v);
const unique = (values: readonly string[]) => new Set(values).size === values.length;
const numbers = (s: string): string[] => s.match(/[+-]?\d[\d.,:/-]*/gu) ?? [];
export function validateAuthoringRequest(v: unknown): asserts v is DocumentAuthoringRequest {
  if (
    !exact(v, ["title", "documentKind", "operation", "request", "report", "documentVersionIds"]) ||
    !text(v.title, 200) ||
    !text(v.documentKind, 80) ||
    !text(v.request, 2000) ||
    !text(v.report, 4000, true) ||
    !["create", "revise", "improve"].includes(String(v.operation)) ||
    !list(v.documentVersionIds, 10) ||
    !v.documentVersionIds.every((x) => text(x, 100)) ||
    !unique(v.documentVersionIds as string[])
  )
    authoringInvalid("Informe título, tipo, pedido e versões autorizadas dentro dos limites.");
}
export function validateDocumentPlan(
  raw: unknown,
  request: DocumentAuthoringRequest,
  sources: readonly DocumentAuthoringSource[]
): DocumentProposalPlan {
  if (
    !exact(raw, [
      "version",
      "status",
      "message",
      "title",
      "documentKind",
      "operation",
      "paragraphs",
      "changes",
      "coverage",
      "pending",
      "requiresSpecialist"
    ]) ||
    raw.version !== documentAuthoringVersion ||
    !["ready", "needs_context"].includes(String(raw.status)) ||
    raw.title !== request.title ||
    raw.documentKind !== request.documentKind ||
    raw.operation !== request.operation ||
    !text(raw.message, 2000) ||
    !list(raw.paragraphs, 40) ||
    !list(raw.changes, 40) ||
    !list(raw.coverage, 20) ||
    !list(raw.pending, 20) ||
    !raw.pending.every((p) => text(p, 500)) ||
    (raw.pending as string[]).join("\n").length > 1500 ||
    typeof raw.requiresSpecialist !== "boolean" ||
    Buffer.byteLength(JSON.stringify(raw)) > authoringLimits.planBytes
  )
    authoringInvalid();
  const plan = raw as unknown as DocumentProposalPlan;
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  function reference(v: unknown): asserts v is DocumentProposalReference {
    if (
      !exact(v, ["sourceId", "startOffset", "endOffset", "quote"]) ||
      !text(v.sourceId, 150) ||
      !text(v.quote, 1000) ||
      !Number.isSafeInteger(v.startOffset) ||
      !Number.isSafeInteger(v.endOffset)
    )
      authoringInvalid();
    const ref = v as unknown as DocumentProposalReference,
      source = sourceMap.get(ref.sourceId);
    if (
      !source ||
      ref.startOffset < 0 ||
      ref.endOffset <= ref.startOffset ||
      ref.endOffset > source.text.length ||
      source.text.slice(ref.startOffset, ref.endOffset) !== ref.quote
    )
      authoringInvalid("Uma referência não corresponde ao trecho autorizado.");
  }
  const paragraphMap = new Map<string, DocumentProposalPlan["paragraphs"][number]>();
  for (const p of plan.paragraphs) {
    if (
      !exact(p, ["id", "text", "provenance", "references"]) ||
      !id(p.id) ||
      !text(p.text, 20000) ||
      !["document_fact", "user_report", "draft_wording"].includes(p.provenance) ||
      !list(p.references, 4)
    )
      authoringInvalid();
    p.references.forEach(reference);
    if (
      p.provenance === "document_fact" &&
      (!p.references.length ||
        p.references.some((r) => sourceMap.get(r.sourceId)?.kind !== "document"))
    )
      authoringInvalid("Um fato documental exige fonte documental autorizada.");
    if (
      p.provenance === "user_report" &&
      !p.references.some((r) => sourceMap.get(r.sourceId)?.kind === "user_report")
    )
      authoringInvalid("O relato deve apontar para a informação declarada pelo usuário.");
    const supported = numbers(p.references.map((r) => r.quote).join(" "));
    if (numbers(p.text).some((n) => !supported.includes(n)))
      authoringInvalid("Há número ou prazo sem apoio literal nas fontes.");
    if (paragraphMap.has(p.id)) authoringInvalid();
    paragraphMap.set(p.id, p);
  }
  if (plan.paragraphs.map((p) => p.text).join("\n\n").length > authoringLimits.outputCharacters)
    authoringInvalid("O texto excede o limite; nenhum trecho foi cortado.");
  for (const c of plan.changes) {
    if (
      !exact(c, ["id", "paragraphId", "before", "after", "kind", "reason", "references"]) ||
      !id(c.id) ||
      !paragraphMap.has(c.paragraphId) ||
      c.after !== paragraphMap.get(c.paragraphId)!.text ||
      !["editorial", "factual", "substantive"].includes(c.kind) ||
      !text(c.reason, 1000) ||
      !list(c.references, 4)
    )
      authoringInvalid();
    c.references.forEach(reference);
    if (c.before !== null) {
      reference(c.before);
      if (sourceMap.get(c.before.sourceId)?.kind !== "document") authoringInvalid();
    }
    if (request.operation !== "create" && c.before === null)
      authoringInvalid("Revisão exige apontar o trecho original de cada alteração.");
    if (c.kind !== "editorial" && !c.references.length)
      authoringInvalid("Alteração factual ou substantiva exige apoio explícito.");
    if (
      numbers(c.reason).some(
        (n) =>
          !numbers([...c.references.map((r) => r.quote), c.before?.quote ?? ""].join(" ")).includes(
            n
          )
      )
    )
      authoringInvalid("A justificativa contém número sem apoio literal.");
  }
  if (!unique(plan.changes.map((c) => c.id)) || !unique(plan.changes.map((c) => c.paragraphId)))
    authoringInvalid();
  if (plan.changes.length !== plan.paragraphs.length)
    authoringInvalid("O texto contém parágrafo sem alteração correspondente.");
  for (const c of plan.coverage) {
    if (
      !exact(c, ["sourceId", "disposition", "paragraphIds", "reason"]) ||
      !sourceMap.has(c.sourceId) ||
      !["represented", "pending", "non_material"].includes(c.disposition) ||
      !text(c.reason, 500) ||
      !list(c.paragraphIds, 40) ||
      !unique(c.paragraphIds) ||
      c.paragraphIds.some((p) => !paragraphMap.has(p))
    )
      authoringInvalid();
    if (
      c.disposition === "represented" &&
      (!c.paragraphIds.length ||
        c.paragraphIds.some(
          (p) => !paragraphMap.get(p)!.references.some((r) => r.sourceId === c.sourceId)
        ))
    )
      authoringInvalid();
    if (c.disposition !== "represented" && c.paragraphIds.length) authoringInvalid();
    if (c.disposition === "pending" && !plan.pending.length) authoringInvalid();
  }
  if (!unique(plan.coverage.map((c) => c.sourceId)) || plan.coverage.length !== sources.length)
    authoringInvalid("A cobertura não representa todo o material recebido.");
  const sourceNumbers = numbers(sources.map((s) => s.text).join(" "));
  if (
    numbers([plan.message, ...plan.pending, ...plan.coverage.map((c) => c.reason)].join(" ")).some(
      (n) => !sourceNumbers.includes(n)
    )
  )
    authoringInvalid("As explicações contêm número sem apoio nas fontes.");
  const refs = [
    ...plan.paragraphs.flatMap((p) => p.references),
    ...plan.changes.flatMap((c) => [...(c.before ? [c.before] : []), ...c.references])
  ].filter((r) => sourceMap.get(r.sourceId)?.kind === "document");
  if (new Set(refs.map((r) => authoringHash(r))).size > 20)
    authoringInvalid("A proposta excede vinte referências documentais; delimite o pedido.");
  const literalReproduction =
    plan.paragraphs.length > 0 &&
    plan.paragraphs.every((p) =>
      p.references.some(
        (r) =>
          sourceMap.get(r.sourceId)?.text.trim() === p.text.trim() &&
          r.quote.trim() === p.text.trim()
      )
    );
  const simpleLiteralCreation =
    literalReproduction &&
    request.operation === "create" &&
    /^(comunicado|relato|relatorio de ocorrencia)$/u.test(
      request.documentKind
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036f]/gu, "")
        .toLowerCase()
    ) &&
    plan.changes.every((c) => c.kind === "editorial") &&
    sources.every((s) => !["convention", "contract"].includes(s.documentType ?? ""));
  const specialist =
    !simpleLiteralCreation &&
    (sources.some((s) =>
      ["convention", "internal_rules", "contract"].includes(s.documentType ?? "")
    ) ||
      plan.changes.some((c) => c.kind === "substantive"));
  if (specialist && !plan.requiresSpecialist)
    authoringInvalid("Esta proposta deve explicitar revisão especializada.");
  if (plan.status === "ready" && !plan.paragraphs.length) authoringInvalid();
  if (
    plan.status === "needs_context" &&
    (!plan.pending.length || plan.paragraphs.length || plan.changes.length)
  )
    authoringInvalid("Falta de contexto não pode produzir rascunho aplicável.");
  return structuredClone({
    ...plan,
    requiresSpecialist: simpleLiteralCreation ? false : plan.requiresSpecialist
  });
}
export type DocumentAuthoringReview = Readonly<{
  version: typeof documentAuthoringVersion;
  planHash: string;
  sourceHash: string;
  accepted: boolean;
  paragraphs: readonly { id: string; supported: boolean; provenanceCorrect: boolean }[];
  changes: readonly { id: string; supported: boolean; beforeAfterCorrect: boolean }[];
  sources: readonly { sourceId: string; coverageAdequate: boolean }[];
  messageSupported: boolean;
  issues: readonly string[];
}>;
export function validateDocumentReview(
  raw: unknown,
  plan: DocumentProposalPlan,
  sources: readonly DocumentAuthoringSource[],
  sourceHash: string
): DocumentAuthoringReview {
  if (
    !exact(raw, [
      "version",
      "planHash",
      "sourceHash",
      "accepted",
      "paragraphs",
      "changes",
      "sources",
      "messageSupported",
      "issues"
    ]) ||
    raw.version !== documentAuthoringVersion ||
    raw.planHash !== authoringHash(plan) ||
    raw.sourceHash !== sourceHash ||
    raw.accepted !== true ||
    raw.messageSupported !== true ||
    !list(raw.issues, 20) ||
    raw.issues.length ||
    !list(raw.paragraphs, 40) ||
    !list(raw.changes, 40) ||
    !list(raw.sources, 20)
  )
    authoringInvalid("A conferência não aprovou integralmente a proposta.");
  const review = raw as unknown as DocumentAuthoringReview;
  const validateRows = (
    rows: readonly Record<string, unknown>[],
    ids: readonly string[],
    key: string,
    flags: string[]
  ) => {
    if (
      rows.length !== ids.length ||
      rows.some(
        (r) =>
          !exact(r, [key, ...flags]) ||
          !ids.includes(String(r[key])) ||
          flags.some((f) => r[f] !== true)
      ) ||
      !unique(rows.map((r) => String(r[key])))
    )
      authoringInvalid("A conferência omitiu ou rejeitou parte do plano.");
  };
  validateRows(
    review.paragraphs,
    plan.paragraphs.map((p) => p.id),
    "id",
    ["supported", "provenanceCorrect"]
  );
  validateRows(
    review.changes,
    plan.changes.map((c) => c.id),
    "id",
    ["supported", "beforeAfterCorrect"]
  );
  validateRows(
    review.sources,
    sources.map((s) => s.id),
    "sourceId",
    ["coverageAdequate"]
  );
  return structuredClone(review);
}
