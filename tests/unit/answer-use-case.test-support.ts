import type { AnswerGatewayTelemetry } from "../../apps/api/answers/answer-gateway.js";

export function createAnswerTelemetry(
  overrides: Partial<AnswerGatewayTelemetry> = {}
): AnswerGatewayTelemetry {
  return Object.freeze({
    providerKey: "synthetic-test",
    modelKey: "synthetic-test-model",
    modelVersion: "1",
    promptVersion: "answer-prompt-v1",
    pipelineVersion: "answer-pipeline-v1",
    taskType: "grounded_answer",
    riskClass: "low",
    routingReason: "teste sintético",
    status: "completed",
    inputTokens: 10,
    outputTokens: 10,
    cachedInputTokens: 0,
    latencyMs: 0,
    estimatedCostMicrounits: 0,
    costCurrency: "BRL",
    inputHash: "c".repeat(64),
    outputHash: "d".repeat(64),
    errorCode: null,
    ...overrides
  });
}
