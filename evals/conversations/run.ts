import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { runConversationSuite, type ConversationReport } from "./replay.js";
import { baselineConversationCases, longConversationCases } from "./dataset.js";
import {
  assessConversationReviews,
  createReviewTemplate,
  type ReviewSubmission
} from "./review.js";

const args = process.argv.slice(2);
if (args[0] === "--assess") {
  if (args.length !== 3) throw new Error("Use --assess <relatório> <revisões>.");
  const report = JSON.parse(await readFile(resolve(args[1]!), "utf8")) as ConversationReport;
  const reviews = JSON.parse(
    await readFile(resolve(args[2]!), "utf8")
  ) as readonly ReviewSubmission[];
  const assessment = assessConversationReviews(report, reviews);
  await mkdir(resolve("reports"), { recursive: true });
  await writeFile(
    resolve("reports/conversations-assessment.json"),
    `${JSON.stringify(assessment, null, 2)}\n`,
    "utf8"
  );
  process.stdout.write(`${JSON.stringify(assessment, null, 2)}\n`);
  if (!assessment.approved) process.exitCode = 1;
} else {
  if (
    args.some((arg) => !["--synthetic", "--baseline", "--long"].includes(arg)) ||
    (args.includes("--baseline") && args.includes("--long"))
  )
    throw new Error("Use [--synthetic] [--baseline | --long] ou --assess <relatório> <revisões>.");
  const synthetic = args.includes("--synthetic");
  const cases = args.includes("--baseline")
    ? baselineConversationCases
    : args.includes("--long")
      ? longConversationCases
      : undefined;
  const report = await runConversationSuite({
    ...(synthetic ? { gateway: createLocalSyntheticAnswerGateway(), synthetic: true } : {}),
    ...(cases === undefined ? {} : { cases })
  });
  const directory = resolve("reports");
  const prefix = `conversations${args.includes("--baseline") ? "-baseline" : args.includes("--long") ? "-long" : ""}`;
  const outputPath = resolve(directory, `${prefix}-${synthetic ? "synthetic" : "review"}.json`);
  await mkdir(directory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    resolve(
      directory,
      `${prefix}-${synthetic ? "synthetic-reviews-template" : "reviews-template"}.json`
    ),
    `${JSON.stringify(createReviewTemplate(report), null, 2)}\n`,
    "utf8"
  );
  process.stdout.write(
    `${JSON.stringify({ ...report.summary, status: report.status, executionMode: report.executionMode, providerCalls: report.providerCalls, gatewayInvocations: report.gatewayInvocations, modelQualityEvaluated: false, semanticApproved: null, outputPath }, null, 2)}\n`
  );
  if (report.summary.mechanicalFailures > 0) process.exitCode = 1;
}
