import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { renderFullPagePdf } from "../../tests/fixtures/full-page-documents.js";
import { observedGateway } from "../conversation-comparison/observed-gateway.js";
import {
  measuredConsumption,
  type ProcessObservation
} from "../conversation-comparison/protocol.js";
import {
  freezeFullPageSnapshot,
  validateFullPageSnapshot
} from "../full-page-documents/snapshot.js";
import { atomicJson, readCheckpoint, writeCheckpoint } from "../full-page-documents/checkpoints.js";
import { prepareDocument } from "../full-page-documents/replay.js";
import { sha256 } from "../full-page-documents/protocol.js";
import { createDenseLedger, renderDenseCorpus, denseCorpusVersion, denseKinds } from "./corpus.js";
import { createDenseCases } from "./oracle.js";
import { replayDenseCase, type DensePrepared } from "./replay.js";
import { validateDenseCaseCheckpoint, validateDensePreparedCheckpoint } from "./state.js";

const args = process.argv.slice(2);
if (
  args.some((a) => !["--execute", "--prepare", "--snapshot"].includes(a) && !/^--run-key=/u.test(a))
)
  throw new Error("Opcoes: --prepare ou --execute --run-key=<id>.");
if (args.includes("--prepare") && args.includes("--execute"))
  throw new Error("Selecione somente preparacao ou execucao.");
const runKey = args.find((a) => a.startsWith("--run-key="))?.slice(10);
const execute = args.includes("--execute"),
  prepare = args.includes("--prepare");
if ((execute || prepare) && (!runKey || !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(runKey)))
  throw new Error("run-key explicito invalido.");
const ledger = createDenseLedger(),
  corpus = renderDenseCorpus(ledger),
  cases = createDenseCases(ledger);
const config = {
  version: denseCorpusVersion,
  dataPolicy: "synthetic-only",
  runKey: runKey ?? null,
  documents: 5,
  pages: 120,
  records: ledger.length,
  questions: cases.length,
  minimumNonWhitespaceCharacters: Math.min(
    ...corpus.flatMap((d) => d.pages.map((p) => p.expectedText.replaceAll(/\s/gu, "").length))
  ),
  corpusSha256: sha256(corpus),
  oracleSha256: sha256(cases),
  ledgerSha256: sha256(ledger),
  condition: {
    id: "dense-sol61-low",
    model: "gpt-6.1-sol" as const,
    reasoningEffort: "low" as const,
    memory: false
  }
};
if (!execute && !prepare) {
  console.log(JSON.stringify({ ...config, mode: "plan_only", providerCalls: 0 }, null, 2));
  process.exit(0);
}
if (execute && !createCodexAnswerGatewayFromEnvironment())
  throw new Error("Ative somente o Codex pessoal local autorizado; sem fallback pago.");
const root = process.cwd(),
  directory = resolve(root, ".local/dense-documents", runKey!);
await mkdir(directory, { recursive: true });
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const extra = async (base: string) =>
  Promise.all(
    (await readdir(join(base, "evals/dense-documents")))
      .filter((p) => p.endsWith(".ts"))
      .sort()
      .map(async (name) => ({
        name,
        sha256: sha256(await readFile(join(base, "evals/dense-documents", name), "utf8"))
      }))
  );
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory);
  const manifestPath = join(directory, "dense-snapshot.json");
  const previous = await readCheckpoint<Awaited<ReturnType<typeof extra>>>(manifestPath);
  if (!previous) {
    const files = await extra(root);
    await mkdir(join(snapshot, "evals/dense-documents"), { recursive: true });
    for (const file of files)
      await copyFile(
        join(root, "evals/dense-documents", file.name),
        join(snapshot, "evals/dense-documents", file.name)
      );
    if (sha256(files) !== sha256(await extra(snapshot))) throw new Error("Snapshot inconsistente.");
    await writeCheckpoint(manifestPath, files);
  }
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/dense-documents/run.ts"),
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
  throw new Error("Execucao exige snapshot proprio.");
const baseHash = await validateFullPageSnapshot(sourceRoot, directory);
const files = await readCheckpoint<Awaited<ReturnType<typeof extra>>>(
  join(directory, "dense-snapshot.json")
);
if (sha256(files) !== sha256(await extra(sourceRoot))) throw new Error("Snapshot denso alterado.");
const manifest = { ...config, sourceFingerprint: sha256({ baseHash, files }) };
const savedManifest = await readCheckpoint<typeof manifest>(join(directory, "manifest.json"));
if (savedManifest && sha256(savedManifest) !== sha256(manifest))
  throw new Error("Retomada incompatível.");
if (!savedManifest) await writeCheckpoint(join(directory, "manifest.json"), manifest);
const preparedCheckpoint = await readCheckpoint<{
  manifestHash: string;
  documents: DensePrepared[];
}>(join(directory, "prepared.json"));
if (preparedCheckpoint) validateDensePreparedCheckpoint(preparedCheckpoint, sha256(manifest));
let prepared = preparedCheckpoint?.documents;
if (!prepared) {
  prepared = [];
  const output = resolve(root, "output/pdf", `dense-documents-${runKey}`);
  await mkdir(output, { recursive: true });
  await writeCheckpoint(join(directory, "ledger.json"), ledger);
  await writeCheckpoint(join(directory, "oracle.json"), cases);
  for (const [index, document] of corpus.entries()) {
    await writeFile(join(output, `${document.id}.pdf`), renderFullPagePdf(document));
    const actual = await prepareDocument(document, {
      validityConfirmed: denseKinds[index] !== "draft"
    });
    prepared.push({ ...actual, kind: denseKinds[index]! });
    console.log(
      JSON.stringify({
        event: "document_prepared",
        document: document.id,
        pages: actual.pages.length,
        originalVerified: true,
        allTextVerified: true
      })
    );
  }
  await writeCheckpoint(join(directory, "prepared.json"), {
    manifestHash: sha256(manifest),
    documents: prepared
  });
}
if (prepare) {
  console.log(
    JSON.stringify(
      {
        ...manifest,
        mode: "prepared",
        providerCalls: 0,
        pagesVerified: prepared.reduce((n, d) => n + d.pages.length, 0)
      },
      null,
      2
    )
  );
  process.exit(0);
}
const results: unknown[] = [];
let unavailable = 0;
for (const testCase of cases) {
  const path = join(directory, `${testCase.id}.json`);
  const previous = await readCheckpoint<{
    manifestHash: string;
    result: Awaited<ReturnType<typeof replayDenseCase>>;
    observations: ProcessObservation[];
  }>(path);
  if (previous) {
    validateDenseCaseCheckpoint(previous, sha256(manifest), testCase);
    results.push(previous);
    continue;
  }
  const observations: ProcessObservation[] = [];
  const gateway = observedGateway(config.condition, observations, {
    executable: process.env.CODEX_CLI_PATH ?? "codex",
    timeoutMs: Number(process.env.CODEX_ANSWER_TIMEOUT_MS ?? 120000)
  });
  const result = await replayDenseCase(testCase, prepared, gateway);
  const value = { manifestHash: sha256(manifest), result, observations };
  await writeCheckpoint(path, value);
  results.push(value);
  console.log(
    JSON.stringify({
      event: "case_completed",
      caseId: testCase.id,
      completed: results.length,
      total: cases.length,
      retrieved: result.assessment.retrievedSources,
      required: result.assessment.requiredSources,
      automaticComplete: result.assessment.automaticCoverageComplete,
      attempts: observations.length
    })
  );
  unavailable =
    observations.length > 0 && observations.every((o) => o.status === "failed")
      ? unavailable + 1
      : 0;
  const progress = {
    ...manifest,
    completed: results.length,
    expected: cases.length,
    complete: results.length === cases.length,
    results,
    billedCost: null,
    specialistApproved: false
  };
  await atomicJson(join(directory, "progress.json"), progress);
  if (unavailable >= 3)
    throw new Error("Infraestrutura indisponível repetidamente; rodada preservada.");
}
const all = results as {
  observations: ProcessObservation[];
  result: Awaited<ReturnType<typeof replayDenseCase>>;
}[];
await atomicJson(join(directory, "summary.json"), {
  ...manifest,
  complete: results.length === cases.length,
  results: all,
  consumption: measuredConsumption(
    config.condition.model,
    all.flatMap((r) => r.observations)
  ),
  technicalReview: "pending",
  billedCost: null
});
if (sha256(files) !== sha256(await extra(sourceRoot)))
  throw new Error("Snapshot alterado durante execucao.");
console.log(
  JSON.stringify({
    event: "finished",
    complete: true,
    cases: results.length,
    consumption: measuredConsumption(
      config.condition.model,
      all.flatMap((r) => r.observations)
    )
  })
);
