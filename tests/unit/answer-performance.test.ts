import { describe, it, expect } from "vitest";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createCodexAnswerGateway } from "../../apps/api/answers/codex-answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import type {
  AnswerStageTiming,
  CodexGenerationPerformance
} from "../../apps/api/answers/answer-performance.js";
import { createRetrievalResult, managerContext, fixedNow } from "./answer-fixtures.js";

describe("AC7711 — instrumentacao sem interferencia", () => {
  it.each(["observe", "throw", "reject"])(
    "conserva resposta e escopo com observador %s",
    async (kind) => {
      const measured: AnswerStageTiming[] = [],
        gateway = createLocalSyntheticAnswerGateway();
      const useCase = createAnswerUseCase({
        gateway,
        persistence: createInMemoryAnswerPersistence(undefined, fixedNow),
        retriever: { search: async () => createRetrievalResult() },
        chatMemoryEnabled: false,
        onStageTiming: (event) => {
          measured.push(event);
          if (kind === "throw") throw new Error("CANARIO_PRIVADO");
          if (kind === "reject") return Promise.reject(new Error("CANARIO_PRIVADO"));
        }
      });
      const answer = await useCase.ask(managerContext, {
        question: "Qual a regra de uso da área comum?",
        requestId: "perf-synthetic"
      });
      expect(answer.validationStatus).toBe("passed");
      expect(answer.citations).toHaveLength(1);
      expect(measured.map((e) => e.stage).sort()).toEqual(
        ["retrieval", "generation", "validation", "persistence", "total"].sort()
      );
      expect(
        measured.every(
          (e) => e.condominiumId === "alameda" && Number.isFinite(e.durationMs) && e.durationMs >= 0
        )
      ).toBe(true);
      expect(JSON.stringify(measured)).not.toMatch(/CANARIO|área comum|answer|question|document/iu);
    }
  );
  it.each([false, true])(
    "registra falha e etapas indisponiveis sem mudar o erro (async=%s)",
    async (asyncObserver) => {
      const measured: CodexGenerationPerformance[] = [];
      const gateway = createCodexAnswerGateway({
        run: async () => {
          throw new Error("CANARIO_PRIVADO");
        },
        onPerformance: (event) => {
          measured.push(event);
          if (asyncObserver) return Promise.reject(new Error("privado"));
          throw new Error("privado");
        }
      });
      await expect(
        gateway.generate({
          question: "pergunta privada",
          task: "grounded_answer",
          riskClass: "low",
          evidence: [],
          budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
        })
      ).rejects.toMatchObject({ code: "codex_process_failed" });
      expect(measured).toHaveLength(1);
      expect(measured[0]).toMatchObject({
        parsingMs: null,
        process: null,
        referenceFormat: "original"
      });
      expect(measured[0]?.processMs).toBeGreaterThanOrEqual(0);
      expect(measured[0]?.cleanupMs).toBeGreaterThanOrEqual(0);
      expect(JSON.stringify(measured)).not.toMatch(/CANARIO|privad/u);
    }
  );
});
