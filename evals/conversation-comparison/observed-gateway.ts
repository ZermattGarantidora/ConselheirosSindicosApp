import { createHash } from "node:crypto";
import {
  createCodexAnswerGateway,
  CodexAnswerGatewayUnavailableError
} from "../../apps/api/answers/codex-answer-gateway.js";
import {
  CodexProcessError,
  runCodexProcess,
  type CodexProcessRequest
} from "../../apps/api/answers/codex-process.js";
import { usageFromEvents, type Condition, type ProcessObservation } from "./protocol.js";
import {
  createRoutedAnswerGateway,
  routedReasoningEfforts
} from "../../apps/api/answers/answer-model-routing.js";
import type { AnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import type { CodexReferenceFormat } from "../../apps/api/answers/codex-reference-layout.js";

export function observedGateway(
  condition: Condition,
  observations: ProcessObservation[],
  options: {
    executable: string;
    timeoutMs: number;
    run?: (request: CodexProcessRequest) => Promise<string>;
    referenceFormat?: CodexReferenceFormat;
  }
): AnswerGateway {
  if (condition.routing === "hybrid")
    return createRoutedAnswerGateway({
      "gpt-6-luna": observedGateway(
        {
          id: condition.id,
          model: "gpt-6-luna",
          memory: condition.memory,
          ...(condition.runtimeEfforts
            ? { reasoningEffort: routedReasoningEfforts["gpt-6-luna"] }
            : condition.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: condition.reasoningEffort })
        },
        observations,
        options
      ),
      "gpt-6.1-sol": observedGateway(
        {
          id: condition.id,
          model: "gpt-6.1-sol",
          memory: condition.memory,
          ...(condition.runtimeEfforts
            ? { reasoningEffort: routedReasoningEfforts["gpt-6.1-sol"] }
            : condition.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: condition.reasoningEffort })
        },
        observations,
        options
      )
    });
  const run = options.run ?? runCodexProcess;
  const gateway = createCodexAnswerGateway({
    ...(options.referenceFormat === undefined ? {} : { referenceFormat: options.referenceFormat }),
    model: condition.model,
    ...(condition.reasoningEffort === undefined
      ? {}
      : { reasoningEffort: condition.reasoningEffort }),
    executable: options.executable,
    timeoutMs: options.timeoutMs,
    run: async (request) => {
      const started = Date.now();
      const inputHash = createHash("sha256").update(request.input).digest("hex");
      try {
        const stdout = await run(request);
        observations.push({
          model: condition.model,
          reasoningEffort: condition.reasoningEffort ?? "low",
          inputHash,
          latencyMs: Date.now() - started,
          usage: usageFromEvents(stdout),
          status: "completed",
          errorCode: null
        });
        return stdout;
      } catch (error) {
        observations.push({
          model: condition.model,
          reasoningEffort: condition.reasoningEffort ?? "low",
          inputHash,
          latencyMs: Date.now() - started,
          usage: null,
          status: "failed",
          errorCode:
            error instanceof CodexProcessError ? error.code : "unclassified_process_failure"
        });
        throw error;
      }
    }
  });
  return {
    async generate(input: Parameters<typeof gateway.generate>[0]) {
      try {
        return await gateway.generate(input);
      } catch (error) {
        const latest = observations.at(-1);
        if (latest && latest.status === "completed")
          observations[observations.length - 1] = {
            ...latest,
            ...(error instanceof CodexAnswerGatewayUnavailableError && error.protocol
              ? { protocol: error.protocol }
              : {}),
            errorCode:
              error instanceof CodexAnswerGatewayUnavailableError
                ? error.code
                : "answer_validation_rejected"
          };
        throw error;
      }
    }
  };
}
