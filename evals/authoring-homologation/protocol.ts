import { createHash } from "node:crypto";
import { corpusVersion, reviewChecks, type HomologationCase, type ReviewCheck } from "./corpus.js";
export const packetHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hashPattern = /^[a-f0-9]{64}$/u;
export type ReviewRow = {
  caseId: string;
  corpusHash: string;
  inputHash: string;
  executionKind: "not_executed" | "simulated" | "provided_artifact";
  candidate: {
    modelKey: string;
    promptHash: string;
    outputHash: string;
    revisionHash: string;
  } | null;
  reviewerId: string | null;
  qualification: string | null;
  reviewedAt: string | null;
  checks: Record<ReviewCheck, boolean | null>;
  usabilityScore: number | null;
  justification: string | null;
};
export function validateCorpus(cases: readonly HomologationCase[]) {
  if (cases.length < 24 || new Set(cases.map((c) => c.id)).size !== cases.length)
    throw new Error("Corpus incompleto ou com identidade duplicada.");
  for (const c of cases) {
    if (
      !/^[a-z][a-z0-9-]{2,79}$/u.test(c.id) ||
      !c.title.trim() ||
      !c.input.task.trim() ||
      !c.ac.length ||
      c.ac.some((ac) => !/^AC-73\d{2}$/u.test(ac))
    )
      throw new Error("Identificação/rastreabilidade do caso inválida.");
    if (
      Object.values(c.input.scope).some(
        (v) => !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(v)
      )
    )
      throw new Error("Escopo sintético inválido.");
    if (
      !c.gold.forbidden.length ||
      !c.gold.notes ||
      c.gold.checks.length !== reviewChecks.length ||
      reviewChecks.some((k) => !c.gold.checks.includes(k))
    )
      throw new Error("Gabarito ou rubrica incompletos.");
    if (!c.input.sources.length && c.gold.outcome !== "blocked")
      throw new Error("Caso sem fonte deve bloquear preparação.");
    if (["blocked", "needs_context"].includes(c.gold.outcome) && !c.gold.pending.length)
      throw new Error("Abstenção exige próximo passo explícito.");
    for (const f of c.gold.material) {
      const s = c.input.sources.find((s) => s.id === f.sourceId);
      if (
        !s ||
        s.uncertain ||
        !f.text ||
        !f.quote ||
        s.text.slice(f.startOffset, f.endOffset) !== f.quote ||
        f.startOffset < 0 ||
        f.endOffset <= f.startOffset
      )
        throw new Error("Gabarito sem apoio literal verificável.");
    }
    if (
      c.input.sources.some(
        (s, i) =>
          s.locator !== i + 1 ||
          !s.text.trim() ||
          s.condominiumId !== c.input.scope.condominiumId ||
          (["pdf_page", "word_block", "photo_page"].includes(s.kind) &&
            (!s.documentId || !s.documentVersionId))
      ) ||
      new Set(c.input.sources.map((s) => s.id)).size !== c.input.sources.length
    )
      throw new Error("Fonte ou locador inválido.");
    if (
      c.input.audioEligible &&
      (c.input.mode === "document" ||
        c.input.sources.some(
          (s) => s.uncertain || s.kind !== "audio_script" || /\[inaudível\]/iu.test(s.text)
        ))
    )
      throw new Error("Roteiro não representa amostra limpa de voz única.");
  }
  if (
    !["document", "dictation", "meeting"].every((mode) => cases.some((c) => c.input.mode === mode))
  )
    throw new Error("Corpus precisa cobrir documentos, relato e reunião.");
  return packetHash({ version: corpusVersion, cases });
}
export function preparePacket(cases: readonly HomologationCase[]) {
  const corpusHash = validateCorpus(cases);
  const inputs = cases.map((c) => ({
    id: c.id,
    corpusVersion,
    corpusHash,
    inputHash: packetHash(c.input),
    input: c.input
  }));
  const reviewerPacket = cases.map((c) => ({
    id: c.id,
    title: c.title,
    ac: c.ac,
    corpusHash,
    inputHash: packetHash(c.input),
    gold: c.gold,
    input: c.input
  }));
  const reviewForm: ReviewRow[] = cases.map((c) => ({
    caseId: c.id,
    corpusHash,
    inputHash: packetHash(c.input),
    executionKind: "not_executed",
    candidate: null,
    reviewerId: null,
    qualification: null,
    reviewedAt: null,
    checks: Object.fromEntries(reviewChecks.map((k) => [k, null])) as ReviewRow["checks"],
    usabilityScore: null,
    justification: null
  }));
  return { corpusHash, inputs, reviewerPacket, reviewForm };
}
/** Revisão de gabarito pode reavaliar execução existente, sem reatribuir sua origem ou mudar entradas. */
export function bindExecutionInputs(
  raw: unknown,
  current: ReturnType<typeof preparePacket>["inputs"]
) {
  if (!Array.isArray(raw) || raw.length !== current.length || !raw.length)
    throw new Error("Entradas de execução incompletas.");
  const executionCorpusHash = (raw[0] as { corpusHash?: unknown })?.corpusHash;
  if (typeof executionCorpusHash !== "string" || !/^[a-f0-9]{64}$/u.test(executionCorpusHash))
    throw new Error("Vínculo de execução inválido.");
  for (const [i, expected] of current.entries()) {
    const entry = raw[i];
    if (
      !entry ||
      typeof entry !== "object" ||
      entry.corpusHash !== executionCorpusHash ||
      entry.corpusVersion !== expected.corpusVersion ||
      entry.id !== expected.id ||
      entry.inputHash !== expected.inputHash ||
      packetHash(entry.input) !== expected.inputHash
    )
      throw new Error("Entradas mudaram; não reutilizar a execução.");
  }
  return {
    executionCorpusHash,
    evaluationCorpusHash: current[0]!.corpusHash,
    rubricRevised: executionCorpusHash !== current[0]!.corpusHash
  };
}
export function verifyPreparedInputs(raw: unknown, cases: readonly HomologationCase[]) {
  const packet = preparePacket(cases),
    input = raw as {
      corpusVersion?: unknown;
      corpusHash?: unknown;
      syntheticOnly?: unknown;
      cases?: unknown;
    } | null;
  if (
    !input ||
    input.corpusVersion !== corpusVersion ||
    input.corpusHash !== packet.corpusHash ||
    input.syntheticOnly !== true ||
    packetHash(input.cases) !== packetHash(packet.inputs)
  )
    throw new Error(
      "Entradas preparadas divergiram do corpus; gere novamente o pacote antes de sintetizar áudio."
    );
}
/** Registra revisão humana; nunca autoriza operação, transporte ou aprovação semântica final. */
export function assessReviews(cases: readonly HomologationCase[], rows: readonly ReviewRow[]) {
  const corpusHash = validateCorpus(cases);
  if (rows.length !== cases.length || new Set(rows.map((r) => r.caseId)).size !== cases.length)
    throw new Error("Revisão deve identificar cada caso uma única vez.");
  const states = cases.map((c) => {
    const r = rows.find((r) => r.caseId === c.id);
    if (!r || r.corpusHash !== corpusHash || r.inputHash !== packetHash(c.input))
      throw new Error("Revisão vinculada a outro corpus, caso ou entrada.");
    if (
      !["not_executed", "simulated", "provided_artifact"].includes(r.executionKind) ||
      !r.checks ||
      Object.keys(r.checks).length !== reviewChecks.length ||
      reviewChecks.some((k) => ![true, false, null].includes(r.checks[k])) ||
      !(r.usabilityScore === null || [0, 1, 2].includes(r.usabilityScore))
    )
      throw new Error("Rubrica inválida.");
    const failures = reviewChecks.filter((k) => r.checks[k] === false);
    if (failures.length) return { caseId: c.id, status: "rejected", failures };
    if (
      r.executionKind === "not_executed" ||
      reviewChecks.some((k) => r.checks[k] === null) ||
      r.usabilityScore === null
    )
      return { caseId: c.id, status: "pending", failures };
    if (
      !r.candidate ||
      !r.candidate.modelKey.trim() ||
      ![r.candidate.promptHash, r.candidate.outputHash, r.candidate.revisionHash].every((v) =>
        hashPattern.test(v)
      ) ||
      !r.reviewerId?.trim() ||
      !r.qualification?.trim() ||
      !r.justification?.trim() ||
      !r.reviewedAt ||
      !Number.isFinite(Date.parse(r.reviewedAt))
    )
      throw new Error(
        "Revisão concluída exige artefato, versão, justificativa e revisor identificáveis."
      );
    return {
      caseId: c.id,
      status:
        r.executionKind === "simulated"
          ? "simulation_only"
          : r.usabilityScore < 2
            ? "needs_revision"
            : "review_recorded",
      failures
    };
  });
  return {
    status: states.some((s) => s.status === "rejected")
      ? "rejected"
      : states.every((s) => s.status === "review_recorded")
        ? "requires_independent_signoff"
        : "pending",
    semanticApproved: 0,
    productionAuthorized: false,
    states
  };
}
export function wordErrorRate(reference: string, hypothesis: string) {
  const words = (text: string) =>
    text
      .normalize("NFC")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
  const expected = words(reference),
    observed = words(hypothesis);
  if (!expected.length) throw new Error("Gabarito de transcrição vazio.");
  let previous = Array.from({ length: observed.length + 1 }, (_, i) => i);
  for (let i = 0; i < expected.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < observed.length; j++)
      next.push(
        Math.min(
          next[j]! + 1,
          previous[j + 1]! + 1,
          previous[j]! + (expected[i] === observed[j] ? 0 : 1)
        )
      );
    previous = next;
  }
  return {
    errors: previous[observed.length]!,
    referenceWords: expected.length,
    rate: previous[observed.length]! / expected.length
  };
}
