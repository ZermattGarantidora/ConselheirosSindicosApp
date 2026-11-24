import { expect, it } from "vitest";
import {
  assessCost30,
  type TechnicalDecision
} from "../../evals/conversation-comparison/cost-30-assessment.js";
import { runConversationSuite } from "../../evals/conversations/replay.js";
import { cost30Cases } from "../../evals/conversation-comparison/cost-30-cases.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import type { ProcessObservation } from "../../evals/conversation-comparison/protocol.js";

it("AC-7407/7408: soma custo de falhas no numerador e exige revisão vinculada de todos os turnos", async () => {
  const report = await runConversationSuite({
    cases: cost30Cases.slice(0, 2),
    gateway: createLocalSyntheticAnswerGateway(),
    synthetic: true
  });
  const decisions: TechnicalDecision[] = report.results.map((r, i) => ({
    caseId: r.case.id,
    turn: 1,
    responseSha256: r.turns[0]!.responseSha256,
    outcome: i === 0 ? "pass" : "fail",
    reason: "Auditoria técnica sintética."
  }));
  const observations: ProcessObservation[] = ["completed", "failed"].map((status) => ({
    model: "gpt-6.1-sol",
    status: status as "completed" | "failed",
    errorCode: null,
    inputHash: "synthetic",
    latencyMs: 10,
    usage: { input: 3000, cached: 0, output: 500 }
  }));
  const assessed = assessCost30(report, observations, decisions);
  expect(assessed).toMatchObject({
    auditComplete: true,
    approvedTurns: 1,
    approvedScenarios: 1,
    estimatedApiUsdPerApprovedTurn: 0.022
  });
  expect(
    assessCost30(report, [{ ...observations[0]!, usage: null }], decisions)
      .estimatedApiUsdPerApprovedTurn
  ).toBeNull();
  expect(assessCost30(report, observations, decisions.slice(0, 1))).toMatchObject({
    auditComplete: false,
    estimatedApiUsdPerApprovedTurn: null
  });
  expect(
    assessCost30(
      report,
      observations,
      decisions.map((d) => ({ ...d, outcome: "fail" }))
    ).estimatedApiUsdPerApprovedTurn
  ).toBeNull();
  expect(() => assessCost30(report, observations, [decisions[0]!, decisions[0]!])).toThrow(
    "Auditoria"
  );
  expect(() =>
    assessCost30(report, observations, [{ ...decisions[0]!, responseSha256: "different" }])
  ).toThrow("Auditoria");
  const bad = {
    ...report,
    results: report.results.map((r) => ({
      ...r,
      turns: r.turns.map((t) => ({ ...t, mechanicalErrors: ["invalid_citation"] }))
    }))
  };
  expect(() => assessCost30(bad, observations, decisions)).toThrow("Falha mecânica");
});
