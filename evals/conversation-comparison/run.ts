import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { conversationCases } from "../conversations/dataset.js";
import {
  runConversationSuite,
  summarizeCases,
  type ConversationReport
} from "../conversations/replay.js";
import { createReviewTemplate } from "../conversations/review.js";
import { observedGateway } from "./observed-gateway.js";
import { auditTargets as baselineAuditTargets } from "./audit-targets.js";
import { cost30Cases, cost30Groups } from "./cost-30-cases.js";
import { answerPriceCard } from "../../apps/api/answers/usage-accounting.js";
import {
  conditions as memoryConditions,
  hybridConditions,
  lunaConditions,
  solConditions,
  correctedConditions,
  measuredConsumption,
  orderedConditions,
  priceCard,
  protocolVersion,
  type Condition,
  type ProcessObservation
} from "./protocol.js";
import { fingerprint, freezeSnapshot, hash } from "./snapshot.js";
import {
  selectAnswerModel,
  routingPolicyVersion
} from "../../apps/api/answers/answer-model-routing.js";

const args = process.argv.slice(2);
const flag = (key: string, fallback: string) =>
  args
    .find((item) => item.startsWith(`--${key}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? fallback;
if (
  args.some(
    (item) =>
      !["--execute", "--snapshot"].includes(item) &&
      !/^--(?:run-key|rounds|concurrency|case|suite|baseline-run)=/u.test(item)
  )
)
  throw new Error("Opções: --execute --run-key=<id> --rounds=1 --concurrency=4 [--case=<id>].");
const rounds = Number(flag("rounds", "1"));
const suite = flag("suite", "memory");
if (!["memory", "hybrid", "luna", "sol", "corrected", "cost30"].includes(suite))
  throw new Error("suite deve ser memory, hybrid, luna, sol, corrected ou cost30.");
const conditions =
  suite === "cost30"
    ? ([
        { id: "sol-fixed", model: "gpt-6.1-sol", memory: true, reasoningEffort: "low" },
        {
          id: "hybrid-runtime",
          model: "gpt-6-luna",
          memory: true,
          routing: "hybrid",
          runtimeEfforts: true
        }
      ] as readonly Condition[])
    : suite === "corrected"
      ? correctedConditions
      : suite === "sol"
        ? solConditions
        : suite === "luna"
          ? lunaConditions
          : suite === "hybrid"
            ? hybridConditions
            : memoryConditions;
const concurrency = Number(flag("concurrency", suite === "cost30" ? "1" : "4"));
if (suite === "cost30" && (rounds !== 1 || concurrency !== 1))
  throw new Error("A amostra cost30 exige uma rodada sequencial para comparar latência.");
if (
  !Number.isInteger(rounds) ||
  rounds < 1 ||
  rounds > 3 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 4
)
  throw new Error("Rodadas devem ser 1–3 e concorrência 1–4.");
const runKey = flag("run-key", `model-memory-${new Date().toISOString().slice(0, 10)}`);
if (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(runKey)) throw new Error("run-key inválido.");
const baselineRun = flag("baseline-run", "");
if (
  baselineRun !== "" &&
  (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(baselineRun) || baselineRun === runKey)
)
  throw new Error("baseline-run inválido ou igual à execução atual.");
const selectedId = flag("case", "");
const population = suite === "cost30" ? cost30Cases : conversationCases;
const cases = selectedId === "" ? population : population.filter((item) => item.id === selectedId);
if (cases.length === 0) throw new Error("Cenário não encontrado.");
const auditTargets =
  suite === "cost30"
    ? cases.flatMap((c) => c.turns.map((_, i) => ({ caseId: c.id, turn: i + 1 })))
    : baselineAuditTargets;
const root = process.cwd();
const directory = resolve(root, ".local/conversation-comparisons", runKey);
const prepared = await runConversationSuite({ cases });
const config = {
  protocolVersion,
  suite,
  routingPolicyVersion: ["hybrid", "cost30"].includes(suite) ? routingPolicyVersion : null,
  runKey,
  ...(baselineRun === "" ? {} : { baselineRun }),
  rounds,
  concurrency,
  conditions,
  priceCard: suite === "cost30" ? { ...priceCard, checkedAt: answerPriceCard.date } : priceCard,
  ...(suite === "cost30"
    ? {
        sampleGroups: cost30Groups,
        costBasis: "hypothetical_api_usd_without_cache_writes",
        maximumProcessAttempts: prepared.summary.turns * 2 * conditions.length
      }
    : {}),
  datasetSha256: prepared.datasetSha256,
  corpusSha256: prepared.corpusSha256,
  scenariosPerCell: cases.length,
  turnsPerCell: prepared.summary.turns,
  reasoningEffort: ["corrected", "cost30"].includes(suite) ? "per_condition" : "low",
  fullDataset: selectedId === "" && suite !== "cost30",
  analysisStatus: "pending_specialist_review",
  auditTargets
};
if (!args.includes("--execute")) {
  process.stdout.write(
    JSON.stringify(
      {
        ...config,
        execution: "plan_only",
        providerCalls: 0,
        cells: conditions.length * rounds,
        conversations: cases.length * conditions.length * rounds,
        turns: prepared.summary.turns * conditions.length * rounds,
        billedCost: null,
        limitation:
          "Uma rodada é exploratória; decisão de configuração exige três rodadas e revisão especializada."
      },
      null,
      2
    ) + "\n"
  );
  process.exit(0);
}
if (createCodexAnswerGatewayFromEnvironment() === undefined)
  throw new Error("Ative o Codex local conforme ADR 0031; nenhuma API alternativa será chamada.");
await mkdir(directory, { recursive: true });
if (!args.includes("--snapshot")) {
  const snapshot = await freezeSnapshot(
    root,
    directory,
    baselineRun === "" ? undefined : resolve(root, ".local/conversation-comparisons", baselineRun)
  );
  const exitCode = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/conversation-comparison/run.ts"),
        ...args,
        "--snapshot"
      ],
      { cwd: root, windowsHide: true, stdio: "inherit" }
    );
    child.on("error", reject);
    child.on("exit", (code) => done(code ?? 1));
  });
  process.exit(exitCode);
}
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const snapshotManifest = JSON.parse(
  await readFile(join(directory, "snapshot-manifest.json"), "utf8")
) as { fingerprint: string };
if (hash(await fingerprint(sourceRoot)) !== snapshotManifest.fingerprint)
  throw new Error("Snapshot alterado; execução recusada.");
const manifest = { ...config, sourceFingerprint: snapshotManifest.fingerprint };
const manifestPath = join(directory, "run-manifest.json");
try {
  if (hash(JSON.parse(await readFile(manifestPath, "utf8"))) !== hash(manifest))
    throw new Error("Retomada incompatível.");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: "wx" });
}
type Checkpoint = {
  manifestHash: string;
  condition: Condition;
  round: number;
  report: ConversationReport;
  observations: ProcessObservation[];
};
const completed = new Map<string, Checkpoint>();
const jobs: { condition: Condition; round: number; caseIndex: number; key: string }[] = [];
for (let round = 1; round <= rounds; round++)
  for (const [caseIndex, testCase] of cases.entries())
    for (const condition of orderedConditions(caseIndex, round, conditions)) {
      const key = `${condition.id}-r${round}-${testCase.id}`;
      try {
        const saved = JSON.parse(await readFile(join(directory, `${key}.json`), "utf8")) as {
          sha256: string;
          value: Checkpoint;
        };
        if (
          saved.sha256 !== hash(saved.value) ||
          saved.value.manifestHash !== hash(manifest) ||
          hash(saved.value.report.results[0]?.case) !== hash(testCase) ||
          saved.value.condition.id !== condition.id ||
          saved.value.round !== round ||
          saved.value.report.chatMemoryEnabled !== condition.memory
        )
          throw new Error("Checkpoint incompatível ou adulterado.");
        completed.set(key, saved.value);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        jobs.push({ condition, round, caseIndex, key });
      }
    }
const totalJobs = rounds * conditions.length * cases.length;
let cursor = 0;
let unavailableInRow = 0;
let stopped = false;
const errors: string[] = [];
const timeoutMs = Number(process.env.CODEX_ANSWER_TIMEOUT_MS ?? 120000);
const executable = process.env.CODEX_CLI_PATH ?? "codex";
async function save(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, path);
}
function cellSummary(condition: Condition, round: number) {
  const cell = [...completed.values()].filter(
    (item) => item.condition.id === condition.id && item.round === round
  );
  const results = cases.flatMap(
    (testCase) =>
      cell.find((item) => item.report.results[0]?.case.id === testCase.id)?.report.results ?? []
  );
  const observations = cell.flatMap((item) => item.observations);
  const turns = results.flatMap((item) => item.turns);
  const latencies = turns
    .flatMap((item) => (item.latencyMs === null ? [] : [item.latencyMs]))
    .sort((a, b) => a - b);
  const percentile = (p: number) =>
    latencies.length === 0 ? null : latencies[Math.max(0, Math.ceil(latencies.length * p) - 1)]!;
  return {
    condition,
    round,
    completedScenarios: results.length,
    expectedScenarios: cases.length,
    complete: results.length === cases.length,
    summary: summarizeCases(results),
    consumption: measuredConsumption(condition.model, observations),
    latencyMs: {
      mean: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
      median: percentile(0.5),
      p95: percentile(0.95),
      max: latencies.at(-1) ?? null
    },
    callsWithNonemptyMemory: turns
      .flatMap((item) => item.gatewayCalls)
      .filter((item) => (item.input.conversationContext?.turns.length ?? 0) > 0).length,
    validationFailures: Object.fromEntries(
      [...new Set(turns.flatMap((item) => item.validationFailures ?? []))].map((code) => [
        code,
        turns.filter((item) => item.validationFailures?.includes(code)).length
      ])
    ),
    errors: Object.fromEntries(
      [
        ...new Set(
          observations.flatMap((item) => (item.errorCode === null ? [] : [item.errorCode]))
        )
      ].map((code) => [code, observations.filter((item) => item.errorCode === code).length])
    )
  };
}
async function summary() {
  const cells = conditions.flatMap((condition) =>
    Array.from({ length: rounds }, (_, index) => cellSummary(condition, index + 1))
  );
  const value = {
    ...manifest,
    complete: completed.size === totalJobs,
    completedScenarios: completed.size,
    expectedScenarios: totalJobs,
    cells,
    technicalQuality: "pending_review",
    semanticApproved: null,
    billedCost: null,
    stopped,
    errors
  };
  await save(join(directory, "progress.json"), value);
  await mkdir(resolve(root, "reports"), { recursive: true });
  await save(resolve(root, "reports", `conversations-comparison-${runKey}.json`), value);
}
process.stdout.write(
  JSON.stringify({ event: "started", ...manifest, resumed: completed.size, pending: jobs.length }) +
    "\n"
);
async function worker() {
  while (!stopped) {
    const job = jobs[cursor++];
    if (!job) return;
    const observations: ProcessObservation[] = [];
    const gateway = observedGateway(job.condition, observations, { executable, timeoutMs });
    try {
      const report = await runConversationSuite({
        cases: [cases[job.caseIndex]!],
        gateway,
        chatMemoryEnabled: job.condition.memory
      });
      const calls = report.results.flatMap((item) =>
        item.turns.flatMap((turn) => turn.gatewayCalls)
      );
      if (
        report.corpusSha256 !== manifest.corpusSha256 ||
        calls.some(
          (call) =>
            call.telemetry !== null &&
            (call.telemetry.providerKey !== "codex" ||
              call.telemetry.modelKey !==
                (job.condition.routing === "hybrid"
                  ? selectAnswerModel(call.input).model
                  : job.condition.model))
        )
      )
        throw new Error("Configuração ou corpus divergente.");
      if (
        !job.condition.memory &&
        calls.some((call) => call.input.conversationContext !== undefined)
      )
        throw new Error("Memória presente na célula desligada.");
      const value: Checkpoint = {
        manifestHash: hash(manifest),
        condition: job.condition,
        round: job.round,
        report,
        observations
      };
      await save(join(directory, `${job.key}.json`), { value, sha256: hash(value) });
      completed.set(job.key, value);
      const unavailable =
        observations.length > 0 && observations.every((item) => item.status === "failed");
      unavailableInRow = unavailable ? unavailableInRow + 1 : 0;
      if (unavailableInRow >= 4) {
        stopped = true;
        errors.push("repeated_provider_unavailable");
      }
      const cost = measuredConsumption(job.condition.model, observations);
      process.stdout.write(
        JSON.stringify({
          event: "case_completed",
          completed: completed.size,
          total: totalJobs,
          condition: job.condition.id,
          round: job.round,
          caseId: cases[job.caseIndex]!.id,
          failedAnswers: report.summary.failedAnswers,
          mechanicalFailures: report.summary.mechanicalFailures,
          processAttempts: observations.length,
          creditsEquivalent: cost.observedCreditsEquivalent,
          missingUsage: cost.attemptsWithoutUsage
        }) + "\n"
      );
      if (completed.size % 12 === 0 || stopped) await summary();
    } catch {
      stopped = true;
      errors.push("comparison_internal_failure");
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
await summary();
for (const condition of conditions)
  for (let round = 1; round <= rounds; round++) {
    const cell = [...completed.values()].filter(
      (item) => item.condition.id === condition.id && item.round === round
    );
    const results = cases.flatMap(
      (testCase) =>
        cell.find((item) => item.report.results[0]?.case.id === testCase.id)?.report.results ?? []
    );
    const report: ConversationReport = {
      ...prepared,
      chatMemoryEnabled: condition.memory,
      generatedAt: new Date().toISOString(),
      runId: hash({ manifest, condition, round }),
      executionMode: "injected_gateway",
      status: "pending_specialist_review",
      providerCalls: null,
      results,
      datasetSha256: hash(results.map((item) => item.case)),
      gatewayInvocations: results.flatMap((item) => item.turns.flatMap((turn) => turn.gatewayCalls))
        .length,
      summary: summarizeCases(results)
    };
    const path = resolve(root, "reports", `conversations-${runKey}-${condition.id}-r${round}`);
    await save(`${path}.json`, report);
    await save(`${path}-reviews-template.json`, createReviewTemplate(report));
  }
if (hash(await fingerprint(sourceRoot)) !== manifest.sourceFingerprint)
  throw new Error("Snapshot mudou durante a execução; resultados não comparáveis.");
await save(resolve(root, "reports", `conversations-${runKey}-technical-audit-template.json`), {
  authorType: "technical_ai_review",
  status: "pending",
  specialistApproved: false,
  targetsSha256: hash(auditTargets),
  populationTurnsPerCondition: prepared.summary.turns,
  plannedTargetsPerCondition: auditTargets.length,
  records: [...completed.values()].flatMap((cell) =>
    cell.report.results.flatMap((result) =>
      result.turns
        .filter((turn) =>
          auditTargets.some(
            (target) => target.caseId === result.case.id && target.turn === turn.turn
          )
        )
        .map((turn) => ({
          condition: cell.condition.id,
          round: cell.round,
          caseId: result.case.id,
          turn: turn.turn,
          responseSha256: turn.responseSha256,
          question: turn.request.question,
          expected: turn.request.expected,
          statusCode: turn.statusCode,
          response: turn.response,
          outcome: null,
          reason: null
        }))
    )
  )
});
process.stdout.write(
  JSON.stringify({
    event: "finished",
    complete: completed.size === totalJobs,
    completed: completed.size,
    expected: totalJobs,
    errors
  }) + "\n"
);
if (completed.size !== totalJobs) process.exitCode = 1;
