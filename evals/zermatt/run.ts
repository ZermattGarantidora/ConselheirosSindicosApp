import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createCodexAnswerGatewayFromEnvironment } from "../../apps/api/answers/codex-answer-gateway.js";
import { answerPromptVersion } from "../../apps/api/answers/prompt-catalog.js";
import { runConversationSuite } from "../conversations/replay.js";
import { createReviewTemplate } from "../conversations/review.js";
import { zermattCases } from "./dataset.js";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !["--synthetic", "--codex"].includes(arg)))
  throw new Error("Use evals:zermatt [--synthetic | --codex].");
const synthetic = args.includes("--synthetic");
const codex = args.includes("--codex");
const gateway = synthetic
  ? createLocalSyntheticAnswerGateway()
  : codex
    ? createCodexAnswerGatewayFromEnvironment()
    : undefined;
if (codex && gateway === undefined)
  throw new Error("O modo Codex exige o opt-in local já autorizado na Spec 042/ADR 0031.");
const report = await runConversationSuite({
  cases: zermattCases,
  ...(gateway === undefined ? {} : { gateway }),
  ...(synthetic ? { synthetic: true } : {})
});
const mode = synthetic ? "synthetic" : codex ? "codex" : "prepared";
const directory = resolve("reports/zermatt");
await mkdir(directory, { recursive: true });
const outputPath = resolve(directory, `${answerPromptVersion}-${mode}.json`);
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(
  resolve(directory, `${answerPromptVersion}-${mode}-reviews.json`),
  `${JSON.stringify(createReviewTemplate(report), null, 2)}\n`,
  "utf8"
);
process.stdout.write(
  `${JSON.stringify(
    {
      suite: "spec-048-zermatt",
      promptVersion: answerPromptVersion,
      mode,
      scenarios: report.summary.scenarios,
      turns: report.summary.turns,
      executedTurns: report.summary.executedTurns,
      mechanicalFailures: report.summary.mechanicalFailures,
      failedAnswers: report.summary.failedAnswers,
      status: report.status,
      outputPath,
      modelQualityEvaluated: false,
      semanticApproved: null
    },
    null,
    2
  )}\n`
);
if (report.summary.mechanicalFailures > 0 || report.summary.failedAnswers > 0) process.exitCode = 1;
