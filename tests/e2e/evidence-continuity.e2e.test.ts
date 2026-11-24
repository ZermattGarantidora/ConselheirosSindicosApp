import { describe, expect, it } from "vitest";
import { baselineConversationCases } from "../../evals/conversations/dataset.js";
import { runConversationSuite } from "../../evals/conversations/replay.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

describe("Spec 046 — conflito preserva conteúdo específico após reprovação", () => {
  it.each(["CONV-contracts-05", "CONV-contracts-15", "CONV-crosscutting-16"])(
    "%s: degradação conserva preço ou vigência sem promover a proposta",
    async (id) => {
      const report = await runConversationSuite({
        cases: baselineConversationCases.filter((item) => item.id === id),
        gateway: {
          generate: async () => ({
            output: generalAnswer("Orientação geral que não resolve o conflito."),
            telemetry: createAnswerTelemetry()
          })
        }
      });
      const turn = report.results[0]!.turns.at(-1)!;
      expect(turn.mechanicalErrors).toEqual([]);
      expect(turn.response!.answerMode).toBe("conflict");
      expect(turn.response!.answer).toContain("4.400,00");
      expect(turn.response!.answer).toMatch(/pendente/iu);
      if (id === "CONV-contracts-15") expect(turn.response!.answer).toContain("31/12/2026");
      else expect(turn.response!.answer).toContain("4.000,00");
      expect(
        turn.response!.citations.some((citation) => citation.evidenceId.startsWith("cleaning-"))
      ).toBe(true);
    }
  );
  it.each(["CONV-conventions-10", "CONV-conventions-15"])(
    "%s: cita cláusulas de valores e horários, mantendo a minuta pendente",
    async (id) => {
      const report = await runConversationSuite({
        cases: baselineConversationCases.filter((item) => item.id === id),
        gateway: {
          generate: async () => ({
            output: generalAnswer("Orientação geral que não resolve o conflito."),
            telemetry: createAnswerTelemetry()
          })
        }
      });
      const turn = report.results[0]!.turns.at(-1)!;
      expect(turn.mechanicalErrors).toEqual([]);
      expect(turn.response!.answerMode).toBe("conflict");
      expect(turn.gatewayCalls[0]!.input.evidence.some((item) => item.id === "convention-p2")).toBe(
        true
      );
      expect(turn.response!.answer).toContain("150,00");
      expect(turn.response!.answer).toContain("200,00");
      expect(turn.response!.answer).toMatch(/pendente/iu);
      if (id.endsWith("10")) {
        expect(turn.response!.answer).toContain("22h");
        expect(turn.response!.answer).toContain("23h");
      }
      expect(turn.response!.citations.map((citation) => citation.evidenceId)).toEqual([
        "convention-p2",
        "convention-draft-p1"
      ]);
    }
  );
});
