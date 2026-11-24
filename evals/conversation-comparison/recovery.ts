import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { runCodexProcess } from "../../apps/api/answers/codex-process.js";
import {
  validateGeneratedAnswer,
  InvalidAnswerValidationError
} from "../../apps/api/answers/citation-validator.js";
import {
  validateTaskCoverage,
  withValidationContract
} from "../../apps/api/answers/answer-task-context.js";
import { conversationCases } from "../conversations/dataset.js";
import { loadConversationCorpus } from "../conversations/corpus.js";
import {
  recoveryTargets,
  recoveryConditions,
  answerQualityConditions,
  answerQualityTargets,
  prepareRecoveryInput,
  assertRecoverySeed,
  recoveryExpected
} from "./recovery-cases.js";
import { observedGateway } from "./observed-gateway.js";
import {
  measuredConsumption,
  priceCard,
  orderedConditions,
  type ProcessObservation,
  type Condition
} from "./protocol.js";
import { freezeSnapshot, fingerprint, hash } from "./snapshot.js";
import { createVerifiedLegalLibrary } from "../../apps/api/legislation/verified-legal-library.js";
import {
  legalContentId,
  legalContentHash
} from "../../apps/api/legislation/legal-edition-contract.js";

const args = process.argv.slice(2);
if (
  args.some(
    (item) =>
      !["--execute", "--snapshot"].includes(item) &&
      !/^--(?:run-key|reference|stage|concurrency)=/u.test(item)
  )
)
  throw new Error("Opção inválida.");
const flag = (name: string, fallback: string) =>
  args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const stage = flag("stage", "targeted"),
  reference = flag(
    "reference",
    stage === "blockers" ? "2026-10-28-luna-quality-r4" : "2026-10-28-luna-quality-r3"
  ),
  runKey = flag(
    "run-key",
    `recovery-${stage}-${stage === "blockers" ? "2026-10-29" : "2026-10-28"}`
  );
const concurrency = Number(flag("concurrency", "2"));
if (
  !["targeted", "matrix", "blockers"].includes(stage) ||
  ![1, 2].includes(concurrency) ||
  ![reference, runKey].every((value) => /^[a-z0-9][a-z0-9-]{0,79}$/u.test(value))
)
  throw new Error("Configuração inválida.");
const conditions =
  stage === "blockers"
    ? answerQualityConditions
    : stage === "matrix"
      ? recoveryConditions
      : recoveryConditions.slice(0, 1);
const targets = stage === "blockers" ? answerQualityTargets : recoveryTargets;
const root = process.cwd(),
  directory = resolve(root, ".local/conversation-recovery", runKey);
const plan = {
  protocol: "conversation-recovery-v1",
  runKey,
  stage,
  reference,
  concurrency,
  rounds: 1,
  conditions,
  targets,
  targetSetSha256: hash(targets),
  priceCard,
  syntheticOnly: true,
  completeScenarios: false,
  expectedPoints: conditions.length * targets.length,
  comparableTargetsPerCondition: targets.filter(
    (target) => !("oracleExcluded" in target && target.oracleExcluded)
  ).length,
  billedCost: null
};
if (!args.includes("--execute")) {
  console.log(JSON.stringify({ ...plan, execution: "plan_only", providerCalls: 0 }, null, 2));
  process.exit(0);
}
if (!args.includes("--snapshot")) {
  const snapshot = await freezeSnapshot(root, directory);
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/conversation-comparison/recovery.ts"),
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
if (createCodexAnswerGatewayFromEnvironment() === undefined)
  throw new Error("Exige Codex pessoal local autorizado.");
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const frozen = JSON.parse(await readFile(join(directory, "snapshot-manifest.json"), "utf8"));
if (hash(await fingerprint(sourceRoot)) !== frozen.fingerprint)
  throw new Error("Snapshot alterado.");
const referenceDirectory = resolve(root, ".local/conversation-comparisons", reference);
const referenceSummary = JSON.parse(
  await readFile(resolve(root, "reports", `conversations-comparison-${reference}.json`), "utf8")
);
const referenceManifest = JSON.parse(
  await readFile(join(referenceDirectory, "run-manifest.json"), "utf8")
);
const corpus = await loadConversationCorpus();
const legalEvidence = createVerifiedLegalLibrary().sources.flatMap((source) =>
  source.pages.map((page) => {
    const content = Array.from(page.text).slice(page.startOffset, page.endOffset).join("");
    return {
      id: legalContentId(`${source.versionId}:${page.pageNumber}`),
      documentId: source.id,
      documentVersionId: source.versionId,
      pageNumber: page.pageNumber,
      content,
      contentSha256: legalContentHash(content)
    };
  })
);
if (
  !referenceSummary.complete ||
  referenceSummary.completedScenarios !== 280 ||
  referenceManifest.corpusSha256 !== corpus.sha256
)
  throw new Error("Referência deve ser bateria sintética completa compatível.");
const seeds = await Promise.all(
  targets.map(async (target) => {
    const saved = JSON.parse(
      await readFile(join(referenceDirectory, `luna-memory-on-r1-${target.caseId}.json`), "utf8")
    );
    const result = saved.value.report.results[0];
    if (
      hash(saved.value) !== saved.sha256 ||
      saved.value.manifestHash !== hash(referenceManifest) ||
      saved.value.report.dataPolicy !== "synthetic-only" ||
      hash(result.case) !== hash(conversationCases.find((item) => item.id === target.caseId))
    )
      throw new Error("Origem não sintética ou alterada.");
    const turn = result.turns[target.turn - 1];
    if (
      turn.gatewayCalls.length === 0 ||
      turn.gatewayCalls[0].input.question !== turn.request.question
    )
      throw new Error("Semente sem geração válida.");
    assertRecoverySeed(
      turn.gatewayCalls[0].input,
      result.case.turns.slice(0, target.turn).map((item: { question: string }) => item.question),
      [...corpus.chunks, ...legalEvidence]
    );
    const input = prepareRecoveryInput(turn.gatewayCalls[0].input, target);
    if (
      input.evidence.some((source) => source.condominiumId !== turn.tenant) ||
      Object.hasOwn(input, "expected")
    )
      throw new Error("Input fora do escopo.");
    return { target, input, inputSha256: hash(input), expected: recoveryExpected(target) };
  })
);
const manifest = {
  ...plan,
  sourceFingerprint: frozen.fingerprint,
  referenceSourceFingerprint: referenceManifest.sourceFingerprint,
  seedsSha256: hash(seeds),
  corpusSha256: corpus.sha256
};
async function save(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, path);
}
try {
  if (
    hash(JSON.parse(await readFile(join(directory, "run-manifest.json"), "utf8"))) !==
    hash(manifest)
  )
    throw new Error("Retomada divergente.");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  await writeFile(join(directory, "run-manifest.json"), JSON.stringify(manifest, null, 2), {
    flag: "wx"
  });
}
type Cell = {
  target: (typeof targets)[number];
  condition: Condition;
  input: (typeof seeds)[number]["input"];
  inputSha256: string;
  expected: string;
  attempts: unknown[];
  raw: string[];
  observations: ProcessObservation[];
  validated: boolean;
};
const completed = new Map<string, Cell>(),
  jobs: { key: string; seed: (typeof seeds)[number]; condition: Condition }[] = [];
for (const [index, seed] of seeds.entries())
  for (const condition of orderedConditions(index, 1, conditions)) {
    const key = `${condition.id}-${seed.target.id}`;
    try {
      const saved = JSON.parse(await readFile(join(directory, `${key}.json`), "utf8"));
      if (
        saved.sha256 !== hash(saved.value) ||
        saved.manifestHash !== hash(manifest) ||
        saved.value.inputSha256 !== seed.inputSha256
      )
        throw new Error("Checkpoint alterado.");
      completed.set(key, saved.value);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      jobs.push({ key, seed, condition });
    }
  }
let cursor = 0,
  unavailable = 0,
  stopped = false;
async function summarize() {
  const cells = conditions.map((condition) => {
    const rows = [...completed.values()].filter((cell) => cell.condition.id === condition.id);
    return {
      condition,
      points: rows.length,
      validated: rows.filter((cell) => cell.validated).length,
      consumption: measuredConsumption(
        condition.model,
        rows.flatMap((cell) => cell.observations)
      )
    };
  });
  const output = {
    ...manifest,
    complete: completed.size === manifest.expectedPoints,
    completedPoints: completed.size,
    cells,
    stopped,
    semanticApproved: null,
    quality: "pending_technical_review"
  };
  await save(join(directory, "progress.json"), output);
  await mkdir(resolve(root, "reports"), { recursive: true });
  await save(resolve(root, "reports", `conversations-${runKey}-summary.json`), output);
}
console.log(JSON.stringify({ event: "started", ...manifest, resumed: completed.size }));
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (;;) {
      if (stopped) return;
      const job = jobs[cursor++];
      if (!job) return;
      const observations: ProcessObservation[] = [],
        raw: string[] = [],
        attempts: unknown[] = [];
      const gateway = observedGateway(job.condition, observations, {
        executable: process.env.CODEX_CLI_PATH ?? "codex",
        timeoutMs: Number(process.env.CODEX_ANSWER_TIMEOUT_MS ?? 120000),
        run: async (request) => {
          const expectedSetting = `model_reasoning_effort="${job.condition.reasoningEffort ?? "low"}"`;
          if (
            !request.args.includes(expectedSetting) ||
            request.args[request.args.indexOf("--model") + 1] !== job.condition.model
          )
            throw new Error("Esforço/modelo divergente.");
          const stdout = await runCodexProcess(request);
          for (const line of stdout.split(/\r?\n/u)) {
            try {
              const event = JSON.parse(line);
              if (
                event.type === "item.completed" &&
                event.item?.type === "agent_message" &&
                typeof event.item.text === "string"
              )
                raw.push(event.item.text);
            } catch {}
          }
          return stdout;
        }
      });
      let input = job.seed.input,
        validated = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const generated = await gateway.generate(input);
          if (input.task === "document_conflict" && generated.output.answerMode !== "conflict")
            throw new InvalidAnswerValidationError("Modo incompatível.", "mode_incompatible");
          const response = validateGeneratedAnswer(generated.output, input.evidence);
          validateTaskCoverage(input, generated.output);
          attempts.push({ passed: true, response });
          validated = true;
          break;
        } catch (error) {
          const code =
            error instanceof InvalidAnswerValidationError ? error.code : "process_or_other_failure";
          attempts.push({ passed: false, code });
          if (attempt === 0 && error instanceof InvalidAnswerValidationError)
            input = withValidationContract(
              { ...input, documentaryState: "answer_not_validated" },
              error.code,
              error.missingCoverageKeys
            );
          else break;
        }
      }
      const cell: Cell = {
        ...job.seed,
        condition: job.condition,
        attempts,
        raw,
        observations,
        validated
      };
      await save(join(directory, `${job.key}.json`), {
        manifestHash: hash(manifest),
        value: cell,
        sha256: hash(cell)
      });
      completed.set(job.key, cell);
      unavailable = observations.some((item) => item.status === "failed") ? unavailable + 1 : 0;
      if (unavailable >= 4) stopped = true;
      console.log(
        JSON.stringify({
          event: "point_completed",
          completed: completed.size,
          total: manifest.expectedPoints,
          condition: job.condition.id,
          id: job.seed.target.id,
          validated,
          codes: (attempts as { code?: string }[]).map((item) => item.code ?? "passed"),
          credits: measuredConsumption(job.condition.model, observations).observedCreditsEquivalent
        })
      );
      await summarize();
    }
  })
);
await summarize();
if (hash(await fingerprint(sourceRoot)) !== manifest.sourceFingerprint)
  throw new Error("Snapshot alterado durante execução.");
console.log(
  JSON.stringify({
    event: "finished",
    complete: completed.size === manifest.expectedPoints,
    completed: completed.size,
    expected: manifest.expectedPoints
  })
);
if (completed.size !== manifest.expectedPoints) process.exitCode = 1;
