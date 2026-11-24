import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homologationCases, type HomologationCase } from "./corpus.js";
import { preparePacket, packetHash, wordErrorRate, bindExecutionInputs } from "./protocol.js";
import { createLocalCodexAuthoringModels } from "../../apps/api/authoring/codex-authoring-model.js";
import { createLocalWhisperTranscriber } from "../../apps/api/authoring/local-whisper-transcriber.js";
import { runCodexProcess } from "../../apps/api/answers/codex-process.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentAuthoringService } from "../../apps/api/authoring/document-authoring.js";
import {
  createDocumentDraftService,
  DocumentDraftError
} from "../../apps/api/authoring/document-drafts.js";
import { createAudioInputService } from "../../apps/api/authoring/audio-inputs.js";
import { createAudioMinutesService } from "../../apps/api/authoring/audio-minutes.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { createReplaySafeSyntheticStorage } from "./local-storage.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type { AudioInput } from "../../apps/api/authoring/audio-inputs.js";

// Nunca carregado pela CI/startup, nunca lê .env. Execução externa exige o opt-in abaixo.
const args = process.argv.slice(2).filter((argument) => argument !== "--");
assert.ok(
  args.includes("--confirm-synthetic-local"),
  "Informe --confirm-synthetic-local para consumir somente o plano Codex e ASR offline."
);
assert.ok(
  args.every(
    (a) =>
      a === "--confirm-synthetic-local" ||
      /^--(?:resume=run-[a-f0-9]{32}|case=[a-z0-9-]+)$/u.test(a)
  ),
  "Argumento inválido."
);
const runId =
  args.find((a) => a.startsWith("--resume="))?.slice(9) ??
  `run-${randomUUID().replaceAll("-", "")}`;
const root = resolve(".local/authoring-homologation/real"),
  directory = join(root, runId);
await mkdir(join(directory, "receipts"), { recursive: true });
const packet = preparePacket(homologationCases);
const inputPath = join(directory, "inputs.json");
async function savedJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
const oldInputs = await savedJson(inputPath);
const lineage = bindExecutionInputs(oldInputs ?? packet.inputs, packet.inputs);
if (oldInputs === undefined)
  await writeFile(inputPath, JSON.stringify(packet.inputs, null, 2), { flag: "wx" });
await writeFile(
  join(directory, "evaluation-inputs.json"),
  JSON.stringify({ lineage, inputs: packet.inputs }, null, 2)
);
await writeFile(join(root, "latest.json"), JSON.stringify({ runId, directory }, null, 2));
let calls = 0,
  recoveredCalls = 0;
const models = createLocalCodexAuthoringModels({
  confirmation: "synthetic-local-only",
  timeoutMs: 60_000,
  async run(request) {
    const schemaIndex = request.args.indexOf("--output-schema");
    const schema = await readFile(request.args[schemaIndex + 1]!, "utf8");
    const hash = packetHash([
      request.args.filter((_, i) => i !== schemaIndex + 1),
      schema,
      request.input
    ]);
    const path = join(directory, "receipts", hash);
    const saved = await savedJson(`${path}.result.json`);
    if (saved !== undefined) {
      recoveredCalls++;
      return (saved as { stdout: string }).stdout;
    }
    await writeFile(
      `${path}.dispatch.json`,
      JSON.stringify({
        inputHash: hash,
        startedAt: new Date().toISOString(),
        model: models.model,
        externalApiBilling: false
      }),
      { flag: "wx" }
    );
    calls++;
    const started = Date.now();
    const stdout = await runCodexProcess(request);
    await writeFile(
      `${path}.result.json`,
      JSON.stringify({ stdout, latencyMs: Date.now() - started, inputHash: hash }),
      { flag: "wx" }
    );
    return stdout;
  }
});
const tools = resolve(".local/authoring-homologation/tools");
const transcriber = createLocalWhisperTranscriber({
  confirmation: "synthetic-local-only",
  executable: join(tools, "whisper-b5454/Release/whisper-cli.exe"),
  executableSha256: "331dba46d6427105d2b802cdbc7eae916ea1c5abf9b0d3b5cfe460d8db8e4366",
  model: join(tools, "ggml-small-q5_1.bin"),
  modelSha256: "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb"
});
const latestAudio = JSON.parse(
  await readFile(resolve(".local/authoring-homologation/audio/latest.json"), "utf8")
) as { directory: string; manifest: string };
const audioManifest = JSON.parse(await readFile(latestAudio.manifest, "utf8")) as {
  corpusHash: string;
  samples: {
    caseId: string;
    inputHash: string;
    file: string;
    originalSha256: string;
    durationSeconds: number;
  }[];
};
for (const sample of audioManifest.samples) {
  const c = homologationCases.find((c) => c.id === sample.caseId);
  assert.ok(c && c.input.audioEligible, "Amostra fora do corpus autorizado.");
  assert.equal(sample.inputHash, packetHash(c.input), "Entrada da amostra mudou.");
  assert.equal(sample.file, `${sample.caseId}.wav`);
}
const now = () => new Date("2026-11-18T12:00:00Z");
const stableId = (caseId: string, kind: string) => {
  const hash = packetHash([runId, caseId, kind]);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
const rows: Record<string, unknown>[] = [];
let asrCalls = 0;
const selection = args.find((a) => a.startsWith("--case="))?.slice(7);
const cases = homologationCases.filter((c) => !selection || c.id === selection);
assert.ok(cases.length > 0, "Caso desconhecido.");
for (const c of cases) {
  const started = Date.now(),
    callStart = calls;
  console.log(`Iniciando ${c.id}`);
  const result: Record<string, unknown> = {
    caseId: c.id,
    inputHash: packetHash(c.input),
    corpusHash: packet.corpusHash,
    executionCorpusHash: lineage.executionCorpusHash,
    audioPreparationCorpusHash: audioManifest.corpusHash,
    model: models.model,
    promptHash: models.promptHash,
    humanApproved: false,
    operationalReleased: false
  };
  const context: AuthorizedCondominiumContext = {
    condominiumId: createCondominiumId(c.input.scope.condominiumId),
    userId: createUserId(c.input.scope.userId),
    roleKey: "manager",
    membershipRevision: "synthetic-local-v1",
    permissions: ["document:read", "document:upload"]
  };
  const scope = {
    kind: "chat" as const,
    ...c.input.scope,
    condominiumId: context.condominiumId,
    userId: context.userId
  };
  const store = createInMemoryConversationStore();
  const chats = createInMemoryChatRepository(now);
  await chats.create(context, { id: scope.chatId, title: c.title });
  const catalog = { listAuthorized: async () => documents(c, context) };
  const sources = {
    getAuthorizedPage: async (
      _context: AuthorizedCondominiumContext,
      ref: { documentVersionId: string; page: number }
    ) => {
      const source = c.input.sources.find(
        (s) =>
          s.condominiumId === context.condominiumId &&
          s.documentVersionId === ref.documentVersionId &&
          s.locator === ref.page
      );
      return source
        ? {
            documentId: source.documentId!,
            documentVersionId: source.documentVersionId!,
            title: c.title,
            page: source.locator,
            content: source.text
          }
        : undefined;
    }
  };
  let audioInput: AudioInput | undefined;
  const audioOrigins = new Map<string, AudioInput>();
  const drafts = createDocumentDraftService({
    store,
    catalog,
    sources,
    now,
    authoringSource: (actor, s, id) => authoring.reference(actor, s, id),
    audioSource: async (_context, _scope, id) => {
      const input = audioOrigins.get(id);
      assert.ok(input);
      return input;
    }
  });
  const authoring = createDocumentAuthoringService({
    store,
    catalog,
    sources,
    drafts,
    model: models.document,
    now,
    authorize: async () => context,
    timeoutMs: 60_000
  });
  try {
    if (c.input.mode === "document") {
      const request = {
        title: c.title,
        documentKind: c.input.documentKind,
        operation: c.input.operation,
        request: c.input.task,
        report: c.input.sources
          .filter((s) => s.kind === "user_report")
          .map((s) => s.text)
          .join("\n"),
        documentVersionIds: [
          ...new Set(
            c.input.sources.filter((s) => s.documentVersionId).map((s) => s.documentVersionId!)
          )
        ]
      };
      if (!c.input.selectionAvailable)
        request.documentVersionIds = ["unavailable-selected-version"];
      const id = stableId(c.id, "document");
      const proposal =
        c.id === "doc-original-unchanged"
          ? await authoring.original(context, scope, request.documentVersionIds)
          : await authoring.prepare(context, scope, id, request);
      assert.ok(proposal, "O original não gerou avaliação.");
      result.proposal = proposal;
      result.outcome =
        proposal.status === "unchanged"
          ? "unchanged"
          : proposal.status === "needs_context"
            ? "needs_context"
            : "draft";
      if (proposal.status === "offered") {
        const draft = (await authoring.decide(context, scope, proposal.id, proposal.hash, true))
          .draft!;
        await assert.rejects(drafts.download(context, scope, draft.id, draft.hash));
        const confirmed = await drafts.decide(
          context,
          scope,
          draft.id,
          draft.event,
          draft.hash,
          true,
          true
        );
        const pdf = await drafts.download(context, scope, draft.id, confirmed.hash);
        await writeFile(join(directory, `${c.id}.pdf`), pdf);
        result.pdfHash = createHash("sha256").update(pdf).digest("hex");
        result.confirmationTest = "synthetic_human_interaction";
        assert.equal((await authoring.prepare(context, scope, id, request)).hash, proposal.hash);
      }
    } else {
      const sample = audioManifest.samples.find((s) => s.caseId === c.id);
      if (sample) {
        const wav = await readFile(join(latestAudio.directory, sample.file));
        assert.equal(createHash("sha256").update(wav).digest("hex"), sample.originalSha256);
        const storage = createReplaySafeSyntheticStorage(join(directory, "originals", c.id));
        const asrPath = join(directory, `${c.id}.asr.json`);
        const previous = await savedJson(asrPath);
        if (previous !== undefined)
          assert.equal(
            (previous as { originalSha256: string }).originalSha256,
            sample.originalSha256
          );
        const audio = createAudioInputService({
          store,
          storage,
          reader: storage,
          chats,
          now,
          transcriber: {
            async transcribe(input) {
              if (previous !== undefined)
                return (previous as { result: Awaited<ReturnType<typeof transcriber.transcribe>> })
                  .result;
              await writeFile(`${asrPath}.dispatch`, sample.originalSha256, { flag: "wx" });
              asrCalls++;
              const output = await transcriber.transcribe(input);
              await writeFile(
                asrPath,
                JSON.stringify({ originalSha256: sample.originalSha256, result: output }, null, 2),
                { flag: "wx" }
              );
              return output;
            }
          }
        });
        audioInput = await audio.receive(
          context,
          scope,
          stableId(c.id, "audio"),
          c.title,
          c.input.mode,
          wav,
          c.input.task
        );
        result.asr = {
          wordErrorRate: wordErrorRate(
            c.input.sources.map((s) => s.text).join(" "),
            audioInput.segments.map((s) => s.text).join(" ")
          ),
          uncertainSegments: audioInput.segments.filter((s) => s.uncertain).length,
          segments: audioInput.segments,
          durationSeconds: audioInput.durationSeconds
        };
      }
      // O gabarito semântico foi escrito para este roteiro exato. Hipóteses/incertezas
      // acrescentadas pelo ASR são medidas separadamente, sem trocar a entrada avaliada.
      audioInput = {
        id: stableId(c.id, "script-audio"),
        title: c.title,
        mode: c.input.mode,
        originalSha256: packetHash(c.input),
        durationSeconds: c.input.sources.length * 5,
        segments: c.input.sources.map((s, i) => ({
          startSeconds: i * 5,
          endSeconds: (i + 1) * 5,
          text: s.text,
          speaker: "Falante não identificado",
          uncertain: s.uncertain
        })),
        provenance: "Roteiro sintético; somente semântica, sem prova acústica.",
        pending: "Conferir dados da reunião."
      };
      result.semanticInput = "verbatim_corpus_script";
      result.acousticNotEvaluated = !sample;
      audioOrigins.set(audioInput.id, audioInput);
      const input = audioInput;
      const minutes = createAudioMinutesService({
        store,
        drafts,
        now,
        model: models.minutes,
        authorize: async () => context,
        audio: { read: async () => input, durableSupported: true } as unknown as ReturnType<
          typeof createAudioInputService
        >
      });
      const draft = await minutes.prepare(
        context,
        scope,
        input.id,
        stableId(c.id, "minutes"),
        c.input.task
      );
      result.draft = draft;
      await assert.rejects(drafts.download(context, scope, draft.id, draft.hash));
      const confirmed = await drafts.decide(
        context,
        scope,
        draft.id,
        draft.event,
        draft.hash,
        true,
        true
      );
      const pdf = await drafts.download(context, scope, draft.id, confirmed.hash);
      await writeFile(join(directory, `${c.id}.pdf`), pdf);
      result.pdfHash = createHash("sha256").update(pdf).digest("hex");
      result.outcome = "draft";
      result.confirmationTest = "synthetic_human_interaction";
    }
    result.contractPassed = true;
  } catch (error) {
    result.outcome = "blocked";
    if (
      error instanceof DocumentDraftError &&
      [409, 422].includes(error.statusCode) &&
      c.input.mode === "document" &&
      calls === callStart &&
      c.input.sources.some((s) => s.validity === "unconfirmed")
    ) {
      result.outcome = "needs_context";
      result.contextRequestedByGuard = true;
    }
    result.error =
      error instanceof DocumentDraftError
        ? { statusCode: error.statusCode, message: error.message }
        : { message: "Falha técnica local; consultar recibos, sem retry automático." };
    result.contractPassed = result.outcome === c.gold.outcome;
  }
  result.goldOutcome = c.gold.outcome;
  result.outcomeMatchesGold = result.outcome === c.gold.outcome;
  result.newCodexCalls = calls - callStart;
  result.latencyMs = Date.now() - started;
  // Journal do domínio é evidência, sem afirmar persistência de produto a partir de RAM.
  result.journal = (await store.list(scope, 100)).entries;
  result.candidateHash = packetHash(result);
  rows.push(result);
  await writeFile(join(directory, `${c.id}.result.json`), JSON.stringify(result, null, 2));
  console.log(
    `${c.id}: ${result.outcome}; contrato=${result.contractPassed}; esperado=${result.outcomeMatchesGold}`
  );
  await summary();
}
await summary();
if (rows.some((row) => !row.contractPassed || !row.outcomeMatchesGold)) process.exitCode = 1;
async function summary() {
  const report = {
    runId,
    directory,
    corpusHash: packet.corpusHash,
    model: models.model,
    promptHash: models.promptHash,
    executionKind: "real_codex_subscription_and_local_whisper",
    additionalApiBilling: false,
    syntheticOnly: true,
    operationalProposalAdopted: false,
    realDataAuthorized: false,
    productionAuthorized: false,
    humanApproved: false,
    selectedCases: cases.map((c) => c.id),
    completeCorpus: rows.length === homologationCases.length,
    technicalPassed:
      rows.length === cases.length && rows.every((r) => r.contractPassed && r.outcomeMatchesGold),
    newCodexCalls: calls,
    recoveredCodexCalls: recoveredCalls,
    localAsrCalls: asrCalls,
    cases: rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([key]) => !["journal", "proposal", "draft", "asr"].includes(key)
        )
      )
    ),
    contractsPassed: rows.filter((r) => r.contractPassed).length,
    outcomesMatched: rows.filter((r) => r.outcomeMatchesGold).length
  };
  await writeFile(join(directory, "results.json"), JSON.stringify(report, null, 2));
}
function documents(
  c: HomologationCase,
  context: AuthorizedCondominiumContext
): RegisteredDocument[] {
  if (!c.input.selectionAvailable) return [];
  const versions = [
    ...new Set(
      c.input.sources
        .filter((s) => s.documentVersionId && s.condominiumId === context.condominiumId)
        .map((s) => s.documentVersionId!)
    )
  ];
  return versions.map((version) => {
    const pages = c.input.sources.filter((s) => s.documentVersionId === version),
      first = pages[0]!;
    return {
      condominiumId: context.condominiumId,
      documentId: first.documentId!,
      documentVersionId: version,
      title: c.title,
      documentType:
        c.input.documentKind === "Regimento"
          ? "internal_rules"
          : c.input.documentKind === "Contrato"
            ? "contract"
            : "other",
      versionNumber: 1,
      sizeBytes: 100,
      processingStatus: "ready",
      validityStatus: first.validity === "unconfirmed" ? "pending" : "confirmed",
      createdAt: now().toISOString(),
      expectedPageCount: c.input.complete ? pages.length : pages.length + 1,
      processedPageCount: pages.length,
      searchablePageCount: pages.length,
      extractionCompleteness: c.input.complete ? 1 : 0.5,
      unreadablePageNumbers: c.input.complete ? [] : [pages.length + 1],
      extractionMethod: first.kind === "word_block" ? "docx_text" : "pdf_text",
      ocrQualityScore: null
    };
  });
}
