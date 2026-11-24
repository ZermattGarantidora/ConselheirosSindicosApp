import { readFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import {
  corpusVersion,
  homologationCases,
  reviewChecks,
  type HomologationCase
} from "../../evals/authoring-homologation/corpus.js";
import {
  assessReviews,
  bindExecutionInputs,
  packetHash,
  preparePacket,
  validateCorpus,
  verifyPreparedInputs,
  wordErrorRate,
  type ReviewRow
} from "../../evals/authoring-homologation/protocol.js";
import { validateOperationalProposal } from "../../evals/authoring-homologation/operations.js";
import { rehearseOperations } from "../../evals/authoring-homologation/rehearsal.js";
import {
  assembleSpeechAudio,
  readSpeechReceipt
} from "../../evals/authoring-homologation/audio.js";
import { inspectPcmWav } from "../../apps/api/authoring/audio-transcription.js";
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
it("AC-7347: gabarito revisado conserva origem da execução; fonte/escopo/ID divergente impede reuso", () => {
  const packet = preparePacket(homologationCases);
  const previous = structuredClone(packet.inputs);
  for (const entry of previous) entry.corpusHash = "a".repeat(64);
  expect(bindExecutionInputs(previous, packet.inputs)).toEqual({
    executionCorpusHash: "a".repeat(64),
    evaluationCorpusHash: packet.corpusHash,
    rubricRevised: true
  });
  for (const mutate of [
    (v: typeof previous) => {
      v.pop();
    },
    (v: typeof previous) => {
      v[0]!.input.scope.chatId = "foreign";
    },
    (v: typeof previous) => {
      v[0]!.id = "other";
    },
    (v: typeof previous) => {
      v[0]!.corpusHash = "b".repeat(64);
    }
  ]) {
    const divergent = structuredClone(previous);
    mutate(divergent);
    expect(() => bindExecutionInputs(divergent, packet.inputs)).toThrow();
  }
});
it("AC-7319/7347: ata conflitante permite rascunho com conflito explícito, sem confirmar aprovação", () => {
  const c = homologationCases.find((c) => c.id === "audio-conflicting-speech")!;
  expect(c.gold.outcome).toBe("draft");
  expect(c.gold.checks).toEqual(expect.arrayContaining(["conflicts", "abstention", "negation"]));
  expect(c.gold.forbidden).toContain("A aprovação está confirmada.");
  expect(c.gold.pending).toContain("Conferir registro de votação.");
  expect(packetHash(c.input)).toBe(
    "889190ed2d0a13d265c629f1a04b970038b9d675c21a83e1e591f8a7714d3f64"
  );
});
it("AC-7342/44: entrada modificada antes da síntese não pode usar o hash antigo", () => {
  const packet = preparePacket(homologationCases),
    input = {
      corpusVersion,
      corpusHash: packet.corpusHash,
      syntheticOnly: true,
      cases: structuredClone(packet.inputs)
    };
  expect(() => verifyPreparedInputs(input, homologationCases)).not.toThrow();
  input.cases[12]!.input.sources[0]!.text = "Texto divergente.";
  expect(() => verifyPreparedInputs(input, homologationCases)).toThrow("divergiram");
});
it("AC-7344: recibo UTF-8 com BOM do Windows conserva vínculo e recusa voz/origem divergente", () => {
  const hash = packetHash("corpus"),
    receipt = {
      corpusHash: hash,
      voice: "Microsoft Maria Desktop",
      culture: "pt-BR",
      engine: "Windows System.Speech offline"
    };
  expect(readSpeechReceipt("\uFEFF" + JSON.stringify(receipt), hash).voice).toBe(receipt.voice);
  expect(() => readSpeechReceipt(JSON.stringify({ ...receipt, culture: "en-US" }), hash)).toThrow();
  expect(() => readSpeechReceipt(JSON.stringify(receipt), packetHash("other"))).toThrow();
});
function reviewed(executionKind: ReviewRow["executionKind"] = "simulated"): ReviewRow[] {
  return preparePacket(homologationCases).reviewForm.map((r) => ({
    ...r,
    executionKind,
    candidate: {
      modelKey: "synthetic-model",
      promptHash: packetHash("prompt"),
      outputHash: packetHash(r.caseId),
      revisionHash: packetHash(corpusVersion)
    },
    reviewerId: "synthetic-reviewer",
    qualification: "Revisão fictícia para teste do protocolo.",
    reviewedAt: "2026-11-17T12:00:00Z",
    checks: Object.fromEntries(reviewChecks.map((k) => [k, true])) as ReviewRow["checks"],
    usabilityScore: 2,
    justification: "SIMULADO. Nenhuma avaliação humana foi realizada."
  }));
}
it("AC-7342: separa entradas e gabaritos, com fontes verificáveis e formulários pendentes", () => {
  const p = preparePacket(homologationCases);
  expect(p.inputs).toHaveLength(24);
  expect(p.inputs.filter((c) => c.input.mode === "document")).toHaveLength(12);
  expect(p.inputs.filter((c) => c.input.mode !== "document")).toHaveLength(12);
  for (const input of p.inputs) {
    expect(Object.keys(input)).toEqual(["id", "corpusVersion", "corpusHash", "inputHash", "input"]);
    expect(input).not.toHaveProperty("gold");
    expect(input).not.toHaveProperty("outcome");
    expect(input.inputHash).toBe(packetHash(input.input));
  }
  expect(p.reviewerPacket.every((c) => c.gold.forbidden.length > 0)).toBe(true);
  expect(
    p.reviewForm.every(
      (r) =>
        r.executionKind === "not_executed" &&
        r.reviewerId === null &&
        Object.values(r.checks).every((v) => v === null)
    )
  ).toBe(true);
  expect(assessReviews(homologationCases, p.reviewForm)).toMatchObject({
    status: "pending",
    semanticApproved: 0,
    productionAuthorized: false
  });
});
it.each([
  "quote",
  "scope",
  "foreign-source",
  "duplicate",
  "missing-context",
  "uncertain-fact",
  "audio-marker"
] as const)("AC-7342: gabarito %s inválido impede pacote", (mode) => {
  const cases = structuredClone(homologationCases) as Mutable<HomologationCase>[];
  if (mode === "quote") cases[0]!.gold.material[0]!.quote = "Trecho inexistente.";
  if (mode === "scope") cases[0]!.input.scope.condominiumId = "foreign";
  if (mode === "foreign-source")
    cases[0]!.input.sources[0]!.condominiumId = "44444444-4444-4444-a444-444444444444";
  if (mode === "duplicate") cases[1]!.id = cases[0]!.id;
  if (mode === "missing-context") cases[3]!.gold.pending = [];
  if (mode === "uncertain-fact") cases[0]!.input.sources[0]!.uncertain = true;
  if (mode === "audio-marker")
    cases.find((c) => c.id === "audio-unclear")!.input.audioEligible = true;
  expect(() => validateCorpus(cases)).toThrow();
});
it("AC-7343: revisão simulada positiva e registro de artefato nunca aprovam semântica ou produção", () => {
  for (const kind of ["simulated", "provided_artifact"] as const) {
    const assessment = assessReviews(homologationCases, reviewed(kind));
    expect(assessment.semanticApproved).toBe(0);
    expect(assessment.productionAuthorized).toBe(false);
    expect(assessment.status).toBe(
      kind === "simulated" ? "pending" : "requires_independent_signoff"
    );
  }
});
it.each(reviewChecks)("AC-7343: falha crítica %s não é compensada pela média", (check) => {
  const rows = reviewed("provided_artifact");
  rows[0]!.checks[check] = false;
  expect(assessReviews(homologationCases, rows).status).toBe("rejected");
});
it.each([
  "missing-row",
  "duplicate-row",
  "corpus",
  "input",
  "no-reviewer",
  "no-output",
  "bad-score",
  "bad-date"
] as const)("AC-7343: protocolo %s incompleto/divergente é recusado", (mode) => {
  const rows = reviewed("provided_artifact");
  if (mode === "missing-row") rows.pop();
  if (mode === "duplicate-row") rows[1] = rows[0]!;
  if (mode === "corpus") rows[0]!.corpusHash = "a".repeat(64);
  if (mode === "input") rows[0]!.inputHash = "b".repeat(64);
  if (mode === "no-reviewer") rows[0]!.reviewerId = null;
  if (mode === "no-output") rows[0]!.candidate = null;
  if (mode === "bad-score") rows[0]!.usabilityScore = 3;
  if (mode === "bad-date") rows[0]!.reviewedAt = "invalid";
  expect(() => assessReviews(homologationCases, rows)).toThrow();
});
it("AC-7343: WER calcula inserção, deleção e substituição; negação crítica bloqueia mesmo com WER baixo", () => {
  expect(wordErrorRate("a b c d", "a x c d")).toMatchObject({
    errors: 1,
    referenceWords: 4,
    rate: 0.25
  });
  expect(wordErrorRate("a b", "a b c").errors).toBe(1);
  expect(wordErrorRate("a b", "a").errors).toBe(1);
  expect(wordErrorRate("Ata, FICTÍCIA!", "ata fictícia").rate).toBe(0);
  expect(() => wordErrorRate("", "texto")).toThrow();
  const reference = "não " + Array.from({ length: 20 }, (_, i) => `palavra${i}`).join(" ");
  expect(wordErrorRate(reference, reference.slice(4)).rate).toBeLessThan(0.1);
  const rows = reviewed();
  rows[0]!.checks.negation = false;
  expect(assessReviews(homologationCases, rows).status).toBe("rejected");
});
function speechClip(seconds: number, silent = false) {
  const wav = Buffer.alloc(44 + seconds * 32000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  if (!silent) for (let i = 44; i < wav.length; i += 2) wav.writeInt16LE(1000, i);
  return wav;
}
it("AC-7344: normaliza somente WAVEFORMATEX local vazio sem relaxar o validador de produção", () => {
  const original = speechClip(1),
    extended = Buffer.concat([original.subarray(0, 36), Buffer.alloc(2), original.subarray(36)]);
  extended.writeUInt32LE(extended.length - 8, 4);
  extended.writeUInt32LE(18, 16);
  expect(() => inspectPcmWav(extended)).toThrow();
  const canonical = assembleSpeechAudio([extended]);
  expect(canonical.wav).toEqual(original);
  expect(canonical.durationSeconds).toBe(1);
  extended.writeUInt16LE(1, 36);
  expect(() => assembleSpeechAudio([extended])).toThrow("Formato");
});
it("AC-7344: reúne PCM com tempos medidos e hashes; silêncio e formatos divergentes falham", () => {
  const result = assembleSpeechAudio([speechClip(1), speechClip(2)]);
  expect(inspectPcmWav(result.wav).durationSeconds).toBe(3.5);
  expect(result.segments.map((s) => [s.startSeconds, s.endSeconds])).toEqual([
    [0, 1],
    [1.5, 3.5]
  ]);
  expect(result.sha256).toHaveLength(64);
  expect(() => assembleSpeechAudio([speechClip(1, true)])).toThrow("Silêncio");
  expect(() => assembleSpeechAudio([])).toThrow();
  expect(() => assembleSpeechAudio([Buffer.alloc(44)])).toThrow();
  const wrong = speechClip(1);
  wrong.writeUInt32LE(8000, 24);
  wrong.writeUInt32LE(16000, 28);
  expect(() => assembleSpeechAudio([wrong])).toThrow("16 kHz");
});
it("AC-7345: ensaio usa cercas e orçamento reais locais, artefatos em memória e nenhuma rede", async () => {
  const network = vi.fn();
  vi.stubGlobal("fetch", network);
  try {
    const report = await rehearseOperations();
    expect(report.steps).toHaveLength(8);
    expect(report.steps.every((s) => s.passed)).toBe(true);
    expect(report).toMatchObject({
      activationAuthorized: false,
      realProviderCalls: 0,
      policyApplied: false,
      simulatedCallbacks: 7
    });
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
it.each([
  "enabled",
  "spending",
  "provider",
  "retention",
  "limit",
  "maintenance",
  "custody",
  "history",
  "retry",
  "approval"
] as const)("AC-7345: proposta %s não ativa ou supera capacidade", async (mode) => {
  const p = JSON.parse(
    await readFile("docs/specs/073-agente-documental-e-pdf/proposta-operacional.json", "utf8")
  );
  expect(validateOperationalProposal(p)).toMatchObject({
    valid: true,
    activationAuthorized: false
  });
  if (mode === "enabled") p.enabled = true;
  if (mode === "spending") p.externalSpendingMicrounits = 1;
  if (mode === "provider") p.provider = "external";
  if (mode === "retention") p.retentionProposed.draftSeconds = 604801;
  if (mode === "limit") p.limitsProposed.maximumSources = 21;
  if (mode === "maintenance") p.maintenanceProposed.scheduled = true;
  if (mode === "custody") p.recoveryProposed.cofreOutsideDump = false;
  if (mode === "history") p.historyProposed.permanentConversation = false;
  if (mode === "retry") p.recoveryProposed.retryUnknownDispatch = true;
  if (mode === "approval") p.approvals.release = true;
  expect(() => validateOperationalProposal(p)).toThrow();
  for (const path of ["apps/api/app/server.ts", "apps/api/worker/worker.ts"]) {
    const source = await readFile(path, "utf8");
    expect(source).not.toContain("proposta-operacional");
    expect(source).not.toContain("authoring-homologation");
  }
});
