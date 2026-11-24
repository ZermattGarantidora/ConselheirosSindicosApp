import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { demoCases, files } from "./cases.js";
import { assessDemoAnswer } from "./assessment.js";
import { demoFixture } from "./fixture.js";
import {
  correctedConditions,
  type ProcessObservation
} from "../conversation-comparison/protocol.js";
import { observedGateway } from "../conversation-comparison/observed-gateway.js";
import {
  freezeFullPageSnapshot,
  validateFullPageSnapshot
} from "../full-page-documents/snapshot.js";
import { readCheckpoint, writeCheckpoint, atomicJson } from "../full-page-documents/checkpoints.js";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
const args = process.argv.slice(2);
const flag = (name: string) =>
  args.find((arg) => arg.startsWith("--" + name + "="))?.slice(name.length + 3);
if (
  args.some(
    (arg) =>
      !["--execute", "--snapshot"].includes(arg) && !/^--(?:round|run-key|concurrency)=/u.test(arg)
  )
)
  throw new Error("Opção desconhecida.");
const round = flag("round") ?? "baseline";
if (round !== "baseline" && round !== "validation") throw new Error("Rodada inválida.");
const cases = demoCases(round);
const runKey = flag("run-key");
const concurrency = Number(flag("concurrency") ?? 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw new Error("Concorrência inválida.");
if (runKey && !/^[a-z0-9-]{1,80}$/u.test(runKey)) throw new Error("Run-key inválido.");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const root = process.cwd();
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
async function extras(source: string) {
  const paths = (await readdir(join(source, "evals/demo-documents")))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => "evals/demo-documents/" + name);
  paths.push(...Object.values(files).map((name) => "tests/fixtures/demo-documents/" + name));
  return Promise.all(
    paths.sort().map(async (path) => ({
      path,
      hash: createHash("sha256")
        .update(await readFile(join(source, path)))
        .digest("hex")
    }))
  );
}
const plan = {
  suite: "demo-documents-v1",
  round,
  conditions: correctedConditions,
  casesPerModel: cases.length,
  responses: cases.length * 2,
  concurrency,
  datasetHash: digest(cases),
  corpus: (await extras(sourceRoot)).filter((item) => item.path.endsWith(".pdf"))
};
if (!args.includes("--execute")) {
  console.log(JSON.stringify({ ...plan, providerCalls: 0, execution: "plan_only" }, null, 2));
  process.exit(0);
}
if (!runKey) throw new Error("Execução exige run-key.");
if (process.env.CODEX_ANSWER_ENABLED !== "true" || process.env.DEMO_MODE !== "true")
  throw new Error("Somente Codex local de demonstração autorizado.");
const directory = resolve(root, ".local/demo-document-evals", runKey);
await mkdir(directory, { recursive: true });
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory);
  const before = await extras(root);
  const extraManifest = join(directory, "demo-snapshot.json");
  const old = await readCheckpoint<typeof before>(extraManifest);
  if (old && digest(old) !== digest(await extras(snapshot)))
    throw new Error("Snapshot extra adulterado.");
  if (!old) {
    for (const item of before) {
      const target = join(snapshot, item.path);
      await mkdir(resolve(target, ".."), { recursive: true });
      await copyFile(join(root, item.path), target);
    }
    if (digest(before) !== digest(await extras(snapshot)))
      throw new Error("Corpus mudou na cópia.");
    await writeCheckpoint(extraManifest, before);
  }
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/demo-documents/run.ts"),
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
  throw new Error("Snapshot obrigatório.");
const sourceFingerprint = await validateFullPageSnapshot(sourceRoot, directory);
const frozen = await readCheckpoint<Awaited<ReturnType<typeof extras>>>(
  join(directory, "demo-snapshot.json")
);
if (!frozen || digest(frozen) !== digest(await extras(sourceRoot)))
  throw new Error("Corpus ou harness alterado.");
const manifest = { ...plan, sourceFingerprint, extraFingerprint: digest(frozen) };
const manifestHash = digest(manifest);
const previous = await readCheckpoint<typeof manifest>(join(directory, "manifest.json"));
if (previous && digest(previous) !== manifestHash) throw new Error("Retomada incompatível.");
if (!previous) await writeCheckpoint(join(directory, "manifest.json"), manifest);
type Point = {
  manifestHash: string;
  caseId: string;
  model: string;
  question: string;
  status: number;
  body: Partial<PublicAnswer>;
  assessment: ReturnType<typeof assessDemoAnswer>;
  inputs: unknown[];
  outputs: unknown[];
  diagnostics: unknown[];
  observations: ProcessObservation[];
};
const points: Point[] = [];
const jobs: { test: (typeof cases)[number]; condition: (typeof correctedConditions)[number] }[] =
  [];
for (const [index, test] of cases.entries())
  for (const condition of index % 2 === 0
    ? correctedConditions
    : [...correctedConditions].reverse()) {
    const key = condition.id + "-" + test.id;
    const saved = await readCheckpoint<Point>(join(directory, key + ".json"));
    if (saved) {
      if (saved.manifestHash !== manifestHash) throw new Error("Checkpoint incompatível.");
      points.push(saved);
    } else jobs.push({ test, condition });
  }
let cursor = 0;
let summaryQueue = Promise.resolve();
function summarize() {
  const snapshot = [...points];
  summaryQueue = summaryQueue.then(() =>
    atomicJson(join(directory, "summary.json"), {
      manifest,
      completed: snapshot.length,
      expected: plan.responses,
      models: correctedConditions.map((condition) => {
        const selected = snapshot.filter((point) => point.model === condition.model);
        const observations = selected.flatMap((point) => point.observations);
        return {
          model: condition.model,
          completed: selected.length,
          complete: selected.filter((point) => point.assessment.complete).length,
          failures: selected
            .filter((point) => !point.assessment.complete)
            .map((point) => ({
              caseId: point.caseId,
              missing: point.assessment.missing,
              absentInInput: point.assessment.absentInInput,
              mechanical: point.assessment.mechanical
            })),
          attempts: observations.length,
          tokens: observations.reduce(
            (sum, item) => ({
              input: sum.input + (item.usage?.input ?? 0),
              output: sum.output + (item.usage?.output ?? 0),
              cached: sum.cached + (item.usage?.cached ?? 0)
            }),
            { input: 0, output: 0, cached: 0 }
          )
        };
      })
    })
  );
  return summaryQueue;
}
await summarize();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]!;
      const observations: ProcessObservation[] = [];
      const gateway = observedGateway(job.condition, observations, {
        executable: process.env.CODEX_CLI_PATH ?? "codex",
        timeoutMs: 300_000
      });
      const fixture = await demoFixture(sourceRoot, gateway);
      try {
        const response = await fixture.ask(job.test.question);
        const body = response.json<Partial<PublicAnswer>>();
        const point: Point = {
          manifestHash,
          caseId: job.test.id,
          model: job.condition.model,
          question: job.test.question,
          status: response.statusCode,
          body,
          assessment: assessDemoAnswer(job.test, body, fixture.inputs),
          inputs: fixture.inputs,
          outputs: fixture.outputs,
          diagnostics: fixture.diagnostics,
          observations
        };
        await writeCheckpoint(
          join(directory, job.condition.id + "-" + job.test.id + ".json"),
          point
        );
        points.push(point);
        await summarize();
        console.log(
          JSON.stringify({
            completed: points.length,
            expected: plan.responses,
            model: job.condition.model,
            case: job.test.id,
            complete: point.assessment.complete,
            missing: point.assessment.missing,
            mechanical: point.assessment.mechanical
          })
        );
      } finally {
        await fixture.app.close();
      }
    }
  })
);
await summaryQueue;
console.log(
  JSON.stringify({
    completed: points.length,
    expected: plan.responses,
    directory,
    complete: points.filter((point) => point.assessment.complete).length
  })
);
