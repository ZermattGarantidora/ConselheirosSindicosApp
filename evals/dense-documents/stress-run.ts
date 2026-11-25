import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
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
import { createStressFixture } from "./stress-fixture.js";
import { replayDenseCase, type DensePrepared } from "./replay.js";
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
import { codexReferenceFormat } from "../../apps/api/answers/codex-reference-layout.js";

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
  throw new Error("Opcoes invalidas.");
if ([execute, prepare, preflight].filter(Boolean).length > 1)
  throw new Error("Escolha uma operacao.");
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
const fixture = createStressFixture();
const config = {
  referenceFormat: codexReferenceFormat(process.env.CODEX_ANSWER_REFERENCE_FORMAT),
  version: "dense-stress-v1",
  dataPolicy: "synthetic-only",
  caseCount: fixture.cases.length,
  conditions,
  nativePages: 350,
  records: fixture.ledger.length,
  rowsPerPage: 72,
  concurrency: 2,
  corpusSha256: sha256(fixture.documents),
  oracleSha256: sha256(fixture.cases),
  ledgerSha256: sha256(fixture.ledger)
};
if (!execute && !prepare && !preflight) {
  console.log(JSON.stringify({ ...config, mode: "plan_only", providerCalls: 0 }, null, 2));
  process.exit(0);
}
if (!key || !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(key)) throw new Error("run-key explicito invalido.");
if (execute && !createCodexAnswerGatewayFromEnvironment())
  throw new Error("Somente Codex local autorizado, sem fallback pago.");
const root = process.cwd(),
  directory = resolve(root, ".local/dense-stress", key),
  output = resolve(root, "output/pdf", `dense-stress-${key}`);
await mkdir(directory, { recursive: true });
await mkdir(output, { recursive: true });
const extra = async (base: string) =>
  Promise.all(
    (await readdir(join(base, "evals/dense-documents")))
      .filter((n) => /\.(?:ts|py)$/u.test(n))
      .sort()
      .map(async (name) => ({
        name,
        sha256: sha256(await readFile(join(base, "evals/dense-documents", name), "utf8"))
      }))
  );
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory);
  if (!(await readCheckpoint(join(directory, "comparison-snapshot.json")))) {
    const files = await extra(root);
    await mkdir(join(snapshot, "evals/dense-documents"), { recursive: true });
    for (const f of files)
      await copyFile(
        join(root, "evals/dense-documents", f.name),
        join(snapshot, "evals/dense-documents", f.name)
      );
    if (sha256(files) !== sha256(await extra(snapshot))) throw new Error("Copia inconsistente.");
    await writeCheckpoint(join(directory, "comparison-snapshot.json"), files);
  }
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/dense-documents/stress-run.ts"),
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
  throw new Error("Snapshot proprio obrigatorio.");
const files = await readCheckpoint<Awaited<ReturnType<typeof extra>>>(
  join(directory, "comparison-snapshot.json")
);
const baseHash = await validateFullPageSnapshot(resolve(directory, "snapshot"), directory);
if (sha256(files) !== sha256(await extra(resolve(directory, "snapshot"))))
  throw new Error("Snapshot alterado.");
const manifest = { ...config, runKey: key, sourceFingerprint: sha256({ baseHash, files }) },
  manifestHash = sha256(manifest);
const previous = await readCheckpoint(join(directory, "manifest.json"));
if (previous && sha256(previous) !== manifestHash) throw new Error("Retomada incompativel.");
if (!previous) {
  await writeCheckpoint(join(directory, "manifest.json"), manifest);
  await writeCheckpoint(join(directory, "oracle.json"), fixture.cases);
  await writeCheckpoint(join(directory, "ledger.json"), fixture.ledger);
}
let saved = await readCheckpoint<{ manifestHash: string; documents: DensePrepared[] }>(
  join(directory, "prepared.json")
);
if (saved && saved.manifestHash !== manifestHash) throw new Error("Preparacao de outra rodada.");
if (!saved) {
  const corpusPath = join(directory, "corpus.json");
  await writeFile(corpusPath, JSON.stringify(fixture.documents));
  const rendered = await promisify(execFile)(
    python,
    [fileURLToPath(new URL("./stress-pdf.py", import.meta.url)), corpusPath, output],
    { windowsHide: true, maxBuffer: 1024 * 1024 }
  );
  console.log(rendered.stdout.trim());
  const documents: DensePrepared[] = [];
  for (const item of fixture.documents) {
    const d = await prepareDocument(item.document, {
      validityConfirmed: item.kind !== "draft",
      content: await readFile(join(output, `${item.document.id}.pdf`))
    });
    documents.push({ ...d, kind: item.kind });
    console.log(
      JSON.stringify({
        event: "document_verified",
        kind: item.kind,
        pages: d.pages.length,
        chunks: d.chunks.length
      })
    );
  }
  saved = { manifestHash, documents };
  await writeCheckpoint(join(directory, "prepared.json"), saved);
}
const documents = saved.documents;
if (prepare) process.exit(0);
if (preflight) {
  const rows = [];
  for (const c of fixture.cases) {
    const r = await replayDenseCase(c, documents, createLocalSyntheticAnswerGateway());
    rows.push({
      id: c.id,
      required: r.assessment.requiredSources,
      retrieved: r.assessment.retrievedSources,
      evidence: r.gatewayCalls[0]?.input.evidence.map((e) => ({
        kind: documents.find((d) => d.documentVersionId === e.documentVersionId)?.kind,
        page: e.pageNumber
      })),
      mechanical: r.assessment.mechanicalErrors
    });
  }
  await atomicJson(join(directory, "preflight.json"), rows);
  console.log(JSON.stringify({ event: "preflight", cases: rows.length, providerCalls: 0 }));
  process.exit(0);
}
const jobs = fixture.cases.flatMap((testCase, i) =>
  (i % 2 ? [conditions[1]!, conditions[0]!] : conditions).map((condition) => ({
    testCase,
    condition
  }))
);
let cursor = 0,
  completed = 0,
  infrastructureFailures = 0;
const all: {
  condition: string;
  result: Awaited<ReturnType<typeof replayDenseCase>>;
  observations: ProcessObservation[];
  recoveredProviderResults: number;
}[] = [];
const update = createProgressWriter(join(directory, "progress.json"));
async function worker() {
  while (cursor < jobs.length) {
    if (infrastructureFailures >= 3)
      throw new Error("Infraestrutura falhou repetidamente; resultados preservados.");
    const job = jobs[cursor++]!,
      path = join(directory, `${job.condition.id}-${job.testCase.id}.json`);
    const prior = await readCheckpoint<(typeof all)[number] & { manifestHash: string }>(path);
    if (prior) {
      validateDenseCaseCheckpoint(prior, manifestHash, job.testCase);
      if (prior.condition !== job.condition.id) throw new Error("Outro braco.");
      all.push(prior);
      completed++;
      continue;
    }
    const observations: ProcessObservation[] = [];
    let recoveredProviderResults = 0;
    const gateway = observedGateway(job.condition, observations, {
      referenceFormat: config.referenceFormat,
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
    const result = await replayDenseCase(job.testCase, documents, gateway);
    const value = {
      manifestHash,
      condition: job.condition.id,
      result,
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
        automatic: result.assessment.automaticCoverageComplete,
        attempts: observations.length
      })
    );
    await update({
      ...manifest,
      completed,
      total: jobs.length,
      complete: completed === jobs.length
    });
  }
}
await Promise.all([worker(), worker()]);
await validateFullPageSnapshot(resolve(directory, "snapshot"), directory);
if (sha256(files) !== sha256(await extra(resolve(directory, "snapshot"))))
  throw new Error("Snapshot alterado durante execucao.");
await atomicJson(join(directory, "comparison.json"), {
  ...manifest,
  complete: all.length === jobs.length,
  byCondition: conditions.map((c) => ({
    condition: c.id,
    cases: all.filter((r) => r.condition === c.id).length,
    consumption: measuredConsumption(
      c.model,
      all.filter((r) => r.condition === c.id).flatMap((r) => r.observations)
    )
  })),
  billedCost: null,
  technicalReview: "pending",
  specialistApproved: false
});
console.log(JSON.stringify({ event: "finished", casesPerCondition: fixture.cases.length }));
