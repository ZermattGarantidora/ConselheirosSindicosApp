import { describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cost30Cases, cost30Groups } from "../../evals/conversation-comparison/cost-30-cases.js";
import { observedGateway } from "../../evals/conversation-comparison/observed-gateway.js";
import type { ProcessObservation } from "../../evals/conversation-comparison/protocol.js";

describe("Spec 074 — comparação pareada", () => {
  it("AC-7405: fixa trinta cenários, cinco grupos e 36 turnos sem alterar o corpus histórico", () => {
    expect(cost30Cases).toHaveLength(30);
    expect(new Set(cost30Cases.map((c) => c.id)).size).toBe(30);
    expect(Object.values(cost30Groups).map((g) => g.length)).toEqual([6, 6, 6, 6, 6]);
    expect(cost30Cases.reduce((sum, c) => sum + c.turns.length, 0)).toBe(36);
    expect(cost30Cases.filter((c) => c.kind === "continuity")).toHaveLength(6);
  });
  it("AC-7405/7406: híbrido reproduz esforços high/low do runtime; histórico continua low", async () => {
    const run = vi.fn(async () =>
      [
        { type: "item.completed", item: { type: "agent_message", text: "Orientação contextual." } },
        {
          type: "turn.completed",
          usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 10 }
        }
      ]
        .map((e) => JSON.stringify(e))
        .join("\n")
    );
    const observations: ProcessObservation[] = [];
    const input = {
      question: "Como organizar a rotina?",
      task: "grounded_answer" as const,
      riskClass: "low" as const,
      evidence: [],
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100_000 }
    };
    const gateway = observedGateway(
      {
        id: "hybrid-runtime",
        model: "gpt-6-luna",
        memory: true,
        routing: "hybrid",
        runtimeEfforts: true
      },
      observations,
      { executable: "synthetic", timeoutMs: 1000, run }
    );
    await gateway.generate(input);
    await gateway.generate({ ...input, riskClass: "high" });
    const historical = observedGateway(
      { id: "historical", model: "gpt-6-luna", memory: true, routing: "hybrid" },
      observations,
      { executable: "synthetic", timeoutMs: 1000, run }
    );
    await historical.generate(input);
    expect(observations.map((o) => [o.model, o.reasoningEffort])).toEqual([
      ["gpt-6-luna", "high"],
      ["gpt-6.1-sol", "low"],
      ["gpt-6-luna", "low"]
    ]);
    expect(run).toHaveBeenCalledTimes(3);
  });
  it("AC-7405: comando padrão prepara plano com zero chamadas", async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["scripts/run-tsx.mjs", "evals/conversation-comparison/run.ts", "--suite=cost30"],
      { windowsHide: true, timeout: 30000 }
    );
    const plan = JSON.parse(stdout);
    expect(plan).toMatchObject({
      suite: "cost30",
      execution: "plan_only",
      providerCalls: 0,
      conversations: 60,
      turns: 72,
      maximumProcessAttempts: 144,
      fullDataset: false
    });
    expect(plan.conditions.map((c: { id: string }) => c.id)).toEqual([
      "sol-fixed",
      "hybrid-runtime"
    ]);
    expect(plan.auditTargets).toHaveLength(36);
    expect(plan.priceCard.checkedAt).toBe("2026-11-23");
  }, 35000);
});
