import { describe, expect, it } from "vitest";

import { runSyntheticEvalSuite, syntheticEvalThresholds } from "../../evals/synthetic-adapter.js";

describe("adapter executável dos 20 evals sintéticos", () => {
  it("chama o endpoint real e mantém P0 sem regressão", async () => {
    const report = await runSyntheticEvalSuite();

    expect(report).toMatchObject({
      suiteVersion: "spec-001-synthetic-v1",
      dataPolicy: "synthetic-only",
      cases: 20,
      passed: 20,
      failed: 0,
      p0PassRate: 1,
      providerCalls: 0,
      estimatedAiCostMicros: 0,
      externalActionsExecuted: false,
      commercialContactTriggered: false
    });
    expect(report.p0PassRate).toBeGreaterThanOrEqual(syntheticEvalThresholds.minimumP0PassRate);
    expect(report.passed / report.cases).toBeGreaterThanOrEqual(
      syntheticEvalThresholds.minimumOverallPassRate
    );
    expect(report.latencyMs.p95).toBeLessThanOrEqual(syntheticEvalThresholds.maximumP95LatencyMs);
    expect(report.results.find((result) => result.id === "EVAL-020")).toMatchObject({
      operation: "submit_feedback",
      statusCode: 201,
      passed: true
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  });
});
