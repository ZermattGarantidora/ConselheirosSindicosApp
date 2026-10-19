import { replaySemanticCases } from "./replay.js";
import { createLocalSyntheticAnswerGateway } from "../../../apps/api/answers/answer-gateway.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Não configura gateway por ambiente: toda avaliação probabilística exige injeção explícita pelo integrador.
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--synthetic"))
  throw new Error("Use somente --synthetic para replay local sem provedor.");
const synthetic = args.includes("--synthetic");
const report = await replaySemanticCases(
  synthetic ? createLocalSyntheticAnswerGateway() : undefined
);
const outputPath = resolve(
  "reports",
  synthetic ? "documentary-semantic-synthetic.json" : "documentary-semantic-review.json"
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      ...report,
      generatedAt: new Date().toISOString(),
      executionMode: synthetic ? "synthetic_contract_only" : "prepare_only",
      providerCalls: 0,
      modelQualityEvaluated: false,
      semanticApproved: 0,
      reviewerForm: {
        reviewerId: null,
        qualification: null,
        reviewedAt: null,
        caseId: null,
        decision: null,
        citationSupported: null,
        extrapolation: null,
        abstentionConflictEscalation: null,
        justification: null
      }
    },
    null,
    2
  )}\n`,
  "utf8"
);
process.stdout.write(
  `${JSON.stringify(
    {
      total: report.total,
      replayed: report.replayed,
      mechanicallyValid: report.mechanicallyValid,
      status: report.status,
      executionMode: synthetic ? "synthetic_contract_only" : "prepare_only",
      providerCalls: 0,
      semanticApproved: 0,
      outputPath
    },
    null,
    2
  )}\n`
);
if (synthetic && report.mechanicallyValid !== report.total) process.exitCode = 1;
