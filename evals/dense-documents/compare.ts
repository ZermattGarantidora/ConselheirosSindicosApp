import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, copyFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  freezeFullPageSnapshot,
  validateFullPageSnapshot
} from "../full-page-documents/snapshot.js";
import { readCheckpoint, writeCheckpoint, atomicJson } from "../full-page-documents/checkpoints.js";
import { sha256 } from "../full-page-documents/protocol.js";
import { prepareDocument } from "../full-page-documents/replay.js";
import { renderFullPagePdf } from "../../tests/fixtures/full-page-documents.js";
import { createDenseLedger, renderDenseCorpus, denseKinds } from "./corpus.js";
import { createDenseCasesV2, createVariedCorpus } from "./varied.js";
import { scannedCases, scannedSource } from "./scan-fixture.js";
import { prepareRealScan, renderScannedFixture } from "./scan.js";
import { replayDenseCase, type DensePrepared } from "./replay.js";
import { assessDenseV2 } from "./assessment-v2.js";
import { observedGateway } from "../conversation-comparison/observed-gateway.js";
import {
  measuredConsumption,
  type Condition,
  type ProcessObservation
} from "../conversation-comparison/protocol.js";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { validateDenseCaseCheckpoint } from "./state.js";
import { createProgressWriter } from "./progress.js";
import { createDurableDenseProcess } from "./attempts.js";

const args = process.argv.slice(2),
  execute = args.includes("--execute"),
  prepare = args.includes("--prepare"),
  preflight = args.includes("--preflight");
if (
  args.some(
    (a) =>
      !["--execute", "--prepare", "--preflight", "--snapshot"].includes(a) &&
      !/^--(?:run-key|python)=/u.test(a)
  )
)
  throw new Error("Opções inválidas.");
if ([execute, prepare, preflight].filter(Boolean).length > 1)
  throw new Error("Escolha preparação, preflight ou execução.");
const key = args.find((a) => a.startsWith("--run-key="))?.slice(10);
const python =
  args.find((a) => a.startsWith("--python="))?.slice(9) ?? process.env.DENSE_PYTHON ?? "python";
const conditions: readonly Condition[] = [
  { id: "sol-fixed", model: "gpt-6.1-sol", reasoningEffort: "low", memory: false },
  {
    id: "hybrid-runtime",
    model: "gpt-6-luna",
    routing: "hybrid",
    runtimeEfforts: true,
    memory: false
  }
];
const ledger = createDenseLedger(),
  base = renderDenseCorpus(ledger),
  varied = createVariedCorpus(),
  cases = [...createDenseCasesV2(ledger), ...scannedCases()];
const config = {
  version: "dense-comparison-v2",
  dataPolicy: "synthetic-only",
  caseCount: cases.length,
  conditions,
  baselineCases: 32,
  unseenCases: 24,
  ocrCases: 4,
  nativePages: 132,
  scannedPages: 2,
  concurrency: 2,
  corpusSha256: sha256({ base, varied, scanned: scannedSource() }),
  oracleSha256: sha256(cases),
  ledgerSha256: sha256(ledger)
};
if (!execute && !prepare && !preflight) {
  console.log(JSON.stringify({ ...config, mode: "plan_only", providerCalls: 0 }, null, 2));
  process.exit(0);
}
if (!key || !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(key)) throw new Error("run-key explícito inválido.");
if (execute && !createCodexAnswerGatewayFromEnvironment())
  throw new Error("Somente Codex local autorizado; sem fallback pago.");
const root = process.cwd(),
  directory = resolve(root, ".local/dense-documents", key),
  output = resolve(root, "output/pdf", `dense-documents-${key}`);
await mkdir(directory, { recursive: true });
await mkdir(output, { recursive: true });
const extra = async (base: string) =>
  Promise.all(
    (await readdir(join(base, "evals/dense-documents")))
      .filter((name) => /\.(?:ts|py)$/u.test(name))
      .sort()
      .map(async (name) => ({
        name,
        sha256: sha256(await readFile(join(base, "evals/dense-documents", name), "utf8"))
      }))
  );
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory),
    saved = await readCheckpoint<Awaited<ReturnType<typeof extra>>>(
      join(directory, "comparison-snapshot.json")
    );
  if (!saved) {
    const files = await extra(root);
    await mkdir(join(snapshot, "evals/dense-documents"), { recursive: true });
    for (const file of files)
      await copyFile(
        join(root, "evals/dense-documents", file.name),
        join(snapshot, "evals/dense-documents", file.name)
      );
    if (sha256(files) !== sha256(await extra(snapshot))) throw new Error("Copia inconsistente.");
    await writeCheckpoint(join(directory, "comparison-snapshot.json"), files);
  }
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/dense-documents/compare.ts"),
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
if (resolve(fileURLToPath(new URL("../../", import.meta.url))) !== resolve(directory, "snapshot"))
  throw new Error("Snapshot próprio obrigatório.");
const files = await readCheckpoint<Awaited<ReturnType<typeof extra>>>(
  join(directory, "comparison-snapshot.json")
);
const baseHash = await validateFullPageSnapshot(resolve(directory, "snapshot"), directory);
if (sha256(files) !== sha256(await extra(resolve(directory, "snapshot"))))
  throw new Error("Snapshot alterado.");
const manifest = { ...config, runKey: key, sourceFingerprint: sha256({ baseHash, files }) };
const previous = await readCheckpoint<typeof manifest>(join(directory, "manifest.json"));
if (previous && sha256(previous) !== sha256(manifest)) throw new Error("Retomada incompatível.");
if (!previous) {
  await writeCheckpoint(join(directory, "manifest.json"), manifest);
  await writeCheckpoint(join(directory, "oracle.json"), cases);
  await writeCheckpoint(join(directory, "ledger.json"), ledger);
}
const manifestHash = sha256(manifest);
let saved = await readCheckpoint<{ manifestHash: string; documents: DensePrepared[] }>(
  join(directory, "prepared.json")
);
if (saved && saved.manifestHash !== manifestHash) throw new Error("Preparação de outra rodada.");
if (!saved) {
  const documents: DensePrepared[] = [];
  for (const [i, document] of base.entries()) {
    await writeFile(join(output, `${document.id}.pdf`), renderFullPagePdf(document));
    documents.push({
      ...(await prepareDocument(document, { validityConfirmed: denseKinds[i] !== "draft" })),
      kind: denseKinds[i]!
    });
  }
  for (const { kind, document } of varied) {
    await writeFile(join(output, `${document.id}.pdf`), renderFullPagePdf(document));
    documents.push({ ...(await prepareDocument(document)), kind });
  }
  await renderScannedFixture(output, python);
  saved = { manifestHash, documents };
  await writeCheckpoint(join(directory, "prepared.json"), saved);
  console.log(
    JSON.stringify({ event: "prepared", documents: 8, nativePages: 132, providerCalls: 0 })
  );
}
const documents = [...saved.documents];
if (prepare) process.exit(0);
if (preflight) {
  const results = [];
  for (const testCase of cases.filter((c) => c.category !== "real_ocr")) {
    const docs = testCase.id.startsWith("DENSE-") ? documents.slice(0, 5) : documents;
    const result = await replayDenseCase(testCase, docs, createLocalSyntheticAnswerGateway());
    results.push({
      id: testCase.id,
      retrieved: result.assessment.retrievedSources,
      required: result.assessment.requiredSources,
      computation: result.computation ?? null
    });
  }
  await atomicJson(join(directory, "preflight.json"), results);
  console.log(JSON.stringify(results));
  process.exit(0);
}
documents.push(
  await prepareRealScan(
    directory,
    output,
    python,
    process.env.CODEX_CLI_PATH ?? "codex",
    manifestHash
  )
);
const jobs = cases.flatMap((testCase, index) =>
  (index % 2 ? [conditions[1]!, conditions[0]!] : conditions).map((condition) => ({
    testCase,
    condition
  }))
);
let cursor = 0,
  completed = 0,
  infrastructureFailures = 0;
const updateProgress = createProgressWriter(join(directory, "progress.json"));
const all: {
  condition: string;
  result: Awaited<ReturnType<typeof replayDenseCase>>;
  assessmentV2: ReturnType<typeof assessDenseV2>;
  observations: ProcessObservation[];
}[] = [];
async function worker() {
  while (cursor < jobs.length) {
    if (infrastructureFailures >= 3)
      throw new Error("Infraestrutura falhou repetidamente; resultados preservados.");
    const job = jobs[cursor++]!,
      path = join(directory, `${job.condition.id}-${job.testCase.id}.json`);
    const prior = await readCheckpoint<{
      manifestHash: string;
      condition: string;
      result: Awaited<ReturnType<typeof replayDenseCase>>;
      assessmentV2: ReturnType<typeof assessDenseV2>;
      observations: ProcessObservation[];
    }>(path);
    if (prior) {
      validateDenseCaseCheckpoint(prior, manifestHash, job.testCase);
      if (prior.condition !== job.condition.id) throw new Error("Braço de outro checkpoint.");
      all.push(prior);
      completed++;
      continue;
    }
    const observations: ProcessObservation[] = [];
    let recoveredProviderResults = 0;
    const gateway = observedGateway(job.condition, observations, {
      executable: process.env.CODEX_CLI_PATH ?? "codex",
      timeoutMs: Number(process.env.CODEX_ANSWER_TIMEOUT_MS ?? 120000),
      run: createDurableDenseProcess(
        directory,
        { manifestHash, condition: job.condition.id, caseId: job.testCase.id },
        undefined,
        () => {
          recoveredProviderResults++;
        }
      )
    });
    const selected = job.testCase.id.startsWith("DENSE-") ? documents.slice(0, 5) : documents;
    const result = await replayDenseCase(job.testCase, selected, gateway);
    const assessmentV2 = assessDenseV2(
      job.testCase,
      result.response,
      result.gatewayCalls.at(-1)?.input.evidence ?? [],
      selected,
      ledger,
      result.assessment.mechanicalErrors,
      result.computation,
      result.computationReceipt
    );
    const value = {
      manifestHash,
      condition: job.condition.id,
      result,
      assessmentV2,
      observations,
      recoveredProviderResults
    };
    await writeCheckpoint(path, value);
    all.push(value);
    completed++;
    infrastructureFailures =
      observations.length && observations.every((o) => o.status === "failed")
        ? infrastructureFailures + 1
        : 0;
    console.log(
      JSON.stringify({
        event: "case_completed",
        condition: job.condition.id,
        id: job.testCase.id,
        completed,
        total: jobs.length,
        automatic: assessmentV2.automaticCoverageComplete,
        attempts: observations.length
      })
    );
    await updateProgress({
      ...manifest,
      completed,
      total: jobs.length,
      complete: completed === jobs.length
    });
  }
}
await Promise.all([worker(), worker()]);
const byCondition = conditions.map((condition) => {
  const results = all.filter((r) => r.condition === condition.id);
  return {
    condition: condition.id,
    cases: results.length,
    consumption: measuredConsumption(
      condition.model,
      results.flatMap((r) => r.observations)
    ),
    results
  };
});
if (sha256(files) !== sha256(await extra(resolve(directory, "snapshot"))))
  throw new Error("Snapshot alterado durante a execução.");
await atomicJson(join(directory, "comparison.json"), {
  ...manifest,
  complete: all.length === jobs.length,
  byCondition,
  billedCost: null,
  technicalReview: "pending",
  specialistApproved: false
});
console.log(JSON.stringify({ event: "finished", complete: true, casesPerCondition: cases.length }));
