import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { observedGateway } from "../conversation-comparison/observed-gateway.js";
import type { Condition, ProcessObservation } from "../conversation-comparison/protocol.js";
import {
  createFullPageDocumentCorpus,
  renderFullPagePdf
} from "../../tests/fixtures/full-page-documents.js";
import { atomicJson, readCheckpoint, writeCheckpoint } from "./checkpoints.js";
import { conditions, pageEvalCases, sha256, suiteVersion } from "./protocol.js";
import { prepareCorpus, replayPage, type PreparedDocument } from "./replay.js";
import { freezeFullPageSnapshot, validateFullPageSnapshot } from "./snapshot.js";

const args = process.argv.slice(2);
const flag = (key: string) =>
  args.find((arg) => arg.startsWith(`--${key}=`))?.slice(key.length + 3);
if (
  args.some(
    (arg) =>
      !["--execute", "--snapshot"].includes(arg) && !/^--(?:run-key|concurrency|case)=/u.test(arg)
  )
)
  throw new Error("Opções: --execute --run-key=<id> --concurrency=4 [--case=<id>].");
const execute = args.includes("--execute");
const runKey = flag("run-key");
if ((execute && !runKey) || (runKey && !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(runKey)))
  throw new Error("Execução exige run-key explícito e válido.");
const concurrency = Number(flag("concurrency") ?? "4");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw new Error("Concorrência deve ser de 1 a 4.");
const allCases = pageEvalCases();
const cases = flag("case") ? allCases.filter((item) => item.id === flag("case")) : allCases;
if (!cases.length) throw new Error("Pergunta não encontrada.");
const fixtureHashes = createFullPageDocumentCorpus().map((document) => ({
  id: document.id,
  bytes: sha256(renderFullPagePdf(document).toString("base64"))
}));
const config = {
  suiteVersion,
  runKey: runKey ?? null,
  conditions,
  concurrency,
  fullDataset: cases.length === 80,
  datasetSha256: sha256(cases),
  corpusSha256: sha256(fixtureHashes),
  documents: new Set(cases.map((item) => item.documentId)).size,
  questionsPerModel: cases.length,
  expectedResponses: cases.length * conditions.length
};
if (!execute) {
  process.stdout.write(
    JSON.stringify(
      { ...config, execution: "plan_only", providerCalls: 0, semanticApproved: null },
      null,
      2
    ) + "\n"
  );
  process.exit(0);
}
if (!createCodexAnswerGatewayFromEnvironment())
  throw new Error("Ative somente o Codex local autorizado no ADR 0031.");
const root = process.cwd();
const directory = resolve(root, ".local/full-page-document-evals", runKey!);
await mkdir(directory, { recursive: true });
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory);
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/full-page-documents/run.ts"),
        ...args,
        "--snapshot"
      ],
      { cwd: root, windowsHide: true, stdio: "inherit" }
    );
    child.on("error", reject);
    child.on("exit", (code) => done(code ?? 1));
  });
  process.exit(code);
}
if (resolve(sourceRoot) !== resolve(directory, "snapshot"))
  throw new Error("Execução real exige snapshot.");
const sourceFingerprint = await validateFullPageSnapshot(sourceRoot, directory);
const manifest = { ...config, sourceFingerprint };
const manifestPath = join(directory, "run-manifest.json");
const previousManifest = await readCheckpoint<typeof manifest>(manifestPath);
if (previousManifest && sha256(previousManifest) !== sha256(manifest))
  throw new Error("Retomada incompatível.");
if (!previousManifest) await writeCheckpoint(manifestPath, manifest);
const preparedPath = join(directory, "prepared-corpus.json");
let prepared = await readCheckpoint<{
  manifestHash: string;
  documents: readonly PreparedDocument[];
}>(preparedPath);
if (prepared && prepared.manifestHash !== sha256(manifest)) throw new Error("Corpus incompatível.");
if (!prepared) {
  prepared = { manifestHash: sha256(manifest), documents: await prepareCorpus() };
  await writeCheckpoint(preparedPath, prepared);
}
const documents = new Map(prepared.documents.map((document) => [document.key, document]));
type Result = Awaited<ReturnType<typeof replayPage>>;
type Checkpoint = {
  manifestHash: string;
  condition: Condition;
  caseId: string;
  pageCount: number;
  result: Result | null;
  observations: ProcessObservation[];
  errorCode: string | null;
};
const completed = new Map<string, Checkpoint>();
const jobs: { condition: Condition; testCase: (typeof cases)[number]; key: string }[] = [];
for (const [index, testCase] of cases.entries()) {
  const ordered = index % 2 === 0 ? conditions : [...conditions].reverse();
  for (const condition of ordered) {
    const key = `${condition.id}-${testCase.id}`;
    const saved = await readCheckpoint<Checkpoint>(join(directory, `${key}.json`));
    if (
      saved &&
      (saved.manifestHash !== sha256(manifest) ||
        saved.caseId !== testCase.id ||
        sha256(saved.condition) !== sha256(condition))
    )
      throw new Error("Checkpoint incompatível.");
    if (saved) completed.set(key, saved);
    else jobs.push({ condition, testCase, key });
  }
}
let cursor = 0;
let stopped = false;
let unavailableInRow = 0;
const errors: string[] = [];
const reportPath = resolve(root, "reports", `full-page-evals-${runKey}.json`);
await mkdir(resolve(root, "reports"), { recursive: true });
let summaryWriter = Promise.resolve();
function summary() {
  summaryWriter = summaryWriter.then(async () => {
    const cells = conditions.map((condition) => {
      const points = [...completed.values()].filter((point) => point.condition.id === condition.id);
      const observations = points.flatMap((point) => point.observations);
      const known = observations.flatMap((item) => (item.usage ? [item.usage] : []));
      const outcomes = (selected: typeof points) =>
        Object.fromEntries(
          ["automatic_complete", "automatic_partial", "failed", "internal_failure"].map((key) => [
            key,
            selected.filter(
              (point) => (point.result?.assessment.outcome ?? "internal_failure") === key
            ).length
          ])
        );
      return {
        condition,
        completed: points.length,
        expected: cases.length,
        outcomes: outcomes(points),
        byPageCount: Object.fromEntries(
          [1, 2, 8].map((count) => [
            count,
            outcomes(points.filter((point) => point.pageCount === count))
          ])
        ),
        sourceIncomplete: points.filter((point) =>
          point.result?.assessment.sourceCoverage.some((source) => !source.present)
        ).length,
        mechanicalFailures: points.filter(
          (point) => (point.result?.assessment.mechanicalErrors.length ?? 1) > 0
        ).length,
        generatedResponses: points.filter((point) => (point.result?.gatewayCalls.length ?? 0) > 0)
          .length,
        processAttempts: observations.length,
        attemptsWithoutUsage: observations.length - known.length,
        tokens: known.reduce(
          (sum, item) => ({
            input: sum.input + item.input,
            cached: sum.cached + item.cached,
            output: sum.output + item.output
          }),
          { input: 0, cached: 0, output: 0 }
        ),
        totalResponseLatencyMs: points.reduce(
          (sum, point) => sum + (point.result?.latencyMs ?? 0),
          0
        ),
        errors: Object.fromEntries(
          [
            ...new Set(observations.flatMap((item) => (item.errorCode ? [item.errorCode] : [])))
          ].map((code) => [code, observations.filter((item) => item.errorCode === code).length])
        )
      };
    });
    const value = {
      ...manifest,
      generatedAt: new Date().toISOString(),
      complete: completed.size === config.expectedResponses,
      completed: completed.size,
      stopped,
      errors,
      cells,
      technicalReview: "pending",
      semanticApproved: null,
      billedCost: null,
      limitation:
        "Uma rodada sintética com revisão técnica pendente; checks automáticos não equivalem a acurácia semântica global. Tokens não medem fatura ou franquia.",
      results: [...completed.values()]
    };
    await atomicJson(join(directory, "progress.json"), value);
    await atomicJson(reportPath, value);
  });
  return summaryWriter;
}
const executable = process.env.CODEX_CLI_PATH ?? "codex";
const timeoutMs = Number(process.env.CODEX_ANSWER_TIMEOUT_MS ?? "120000");
process.stdout.write(
  JSON.stringify({ event: "started", ...manifest, resumed: completed.size, pending: jobs.length }) +
    "\n"
);
async function worker() {
  while (!stopped) {
    const job = jobs[cursor++];
    if (!job) return;
    const observations: ProcessObservation[] = [];
    let result: Result | null = null;
    let errorCode: string | null = null;
    try {
      result = await replayPage(
        job.testCase,
        documents.get(job.testCase.documentId)!,
        observedGateway(job.condition, observations, { executable, timeoutMs })
      );
      if (
        result.gatewayCalls.some(
          (call) =>
            call.telemetry &&
            (call.telemetry.providerKey !== "codex" ||
              call.telemetry.modelKey !== job.condition.model)
        )
      )
        throw new Error("Modelo inesperado.");
    } catch {
      errorCode = "eval_internal_failure";
    }
    const value: Checkpoint = {
      manifestHash: sha256(manifest),
      condition: job.condition,
      caseId: job.testCase.id,
      pageCount: job.testCase.pageCount,
      result,
      observations,
      errorCode
    };
    await writeCheckpoint(join(directory, `${job.key}.json`), value);
    completed.set(job.key, value);
    const unavailable =
      observations.length > 0 && observations.every((item) => item.status === "failed");
    unavailableInRow = unavailable || errorCode ? unavailableInRow + 1 : 0;
    if (unavailableInRow >= 4) {
      stopped = true;
      errors.push("repeated_unavailable_or_internal_failure");
    }
    process.stdout.write(
      JSON.stringify({
        event: "page_completed",
        completed: completed.size,
        total: config.expectedResponses,
        model: job.condition.id,
        caseId: job.testCase.id,
        outcome: result?.assessment.outcome ?? "internal_failure",
        attempts: observations.length
      }) + "\n"
    );
    await summary();
  }
}
await summary();
await Promise.all(Array.from({ length: concurrency }, worker));
await summary();
process.exitCode = completed.size === config.expectedResponses ? 0 : 1;
