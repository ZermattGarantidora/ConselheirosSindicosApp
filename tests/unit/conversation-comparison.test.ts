import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createLocalSyntheticAnswerGateway,
  type AnswerGatewayInput
} from "../../apps/api/answers/answer-gateway.js";
import { CodexProcessError } from "../../apps/api/answers/codex-process.js";
import { observedGateway } from "../../evals/conversation-comparison/observed-gateway.js";
import { auditTargets } from "../../evals/conversation-comparison/audit-targets.js";
import {
  conditions,
  measuredConsumption,
  orderedConditions,
  solConditions,
  usageFromEvents,
  type ProcessObservation
} from "../../evals/conversation-comparison/protocol.js";
import { fingerprint, freezeSnapshot, hash } from "../../evals/conversation-comparison/snapshot.js";
import { baselineConversationCases, conversationCases } from "../../evals/conversations/dataset.js";
import { runConversationSuite } from "../../evals/conversations/replay.js";

const usage = { input_tokens: 1_000_000, cached_input_tokens: 400_000, output_tokens: 100_000 };
const question: AnswerGatewayInput = {
  question: "Como organizar uma pauta?",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
};
describe("Spec 050 — consumo, pareamento e isolamento", () => {
  it("compara somente os dois Sol com memória e conserva a tarifa de cada tentativa", async () => {
    expect(solConditions.map((item) => item.model)).toEqual(["gpt-6.1-sol", "gpt-5.6-sol"]);
    expect(solConditions.every((item) => item.memory && item.routing === undefined)).toBe(true);
    const observations: ProcessObservation[] = [];
    const requestedModels: string[][] = [];
    for (const condition of solConditions) {
      const gateway = observedGateway(condition, observations, {
        executable: "ficticio",
        timeoutMs: 1000,
        run: async (request) => {
          requestedModels.push([...request.args]);
          return JSON.stringify({ type: "turn.completed", usage });
        }
      });
      await expect(gateway.generate(question)).rejects.toThrow();
    }
    for (const [index, condition] of solConditions.entries())
      expect(requestedModels[index]).toContain(condition.model);
    expect(measuredConsumption("gpt-6.1-sol", observations)).toMatchObject({
      observedCreditsEquivalent: 170,
      hypotheticalApiUsd: 6.8,
      attemptsByModel: { "gpt-6.1-sol": 1, "gpt-5.6-sol": 1 },
      billedCost: null
    });
  });
  it("reutiliza aplicação histórica sem mudar baseline e recusa sua adulteração", async () => {
    const root = await mkdtemp(join(tmpdir(), "sol-baseline-fixture-"));
    try {
      for (const folder of [
        "apps/api",
        "apps/shared",
        "evals/conversations",
        "evals/conversation-comparison"
      ]) {
        await mkdir(join(root, folder), { recursive: true });
        await writeFile(join(root, folder, "fixture.ts"), "export const version = 1;\n");
      }
      for (const name of ["run.ts", "protocol.ts", "snapshot.ts"])
        await writeFile(
          join(root, "evals/conversation-comparison", name),
          "export const harness = 1;\n"
        );
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      const baselineDirectory = join(root, "historical");
      const baseline = await freezeSnapshot(root, baselineDirectory);
      const original = hash(await fingerprint(baseline));
      await writeFile(join(root, "apps/api/fixture.ts"), "export const version = 2;\n");
      await writeFile(join(root, "evals/conversations/fixture.ts"), "export const version = 2;\n");
      await writeFile(
        join(root, "evals/conversation-comparison/protocol.ts"),
        "export const harness = 2;\n"
      );
      const snapshot = await freezeSnapshot(root, join(root, "new-run"), baselineDirectory);
      expect(await readFile(join(snapshot, "apps/api/fixture.ts"), "utf8")).toContain(
        "version = 1"
      );
      expect(await readFile(join(snapshot, "evals/conversations/fixture.ts"), "utf8")).toContain(
        "version = 1"
      );
      expect(
        await readFile(join(snapshot, "evals/conversation-comparison/protocol.ts"), "utf8")
      ).toContain("harness = 2");
      expect(hash(await fingerprint(baseline))).toBe(original);
      await writeFile(join(baseline, "apps/api/fixture.ts"), "export const tampered = true;\n");
      await expect(
        freezeSnapshot(root, join(root, "rejected-run"), baselineDirectory)
      ).rejects.toThrow("Baseline histórico alterado");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("fixa 80 turnos auditáveis sem seleção posterior de resultados favoráveis", () => {
    expect(auditTargets).toHaveLength(80);
    expect(new Set(auditTargets.map((item) => `${item.caseId}/${item.turn}`)).size).toBe(80);
    for (const target of auditTargets)
      expect(
        conversationCases.find((item) => item.id === target.caseId)?.turns[target.turn - 1]
      ).toBeDefined();
  });
  it("desconta cache da entrada total e não confunde equivalente com cobrança", () => {
    const observations: ProcessObservation[] = [
      {
        inputHash: "ficticio",
        latencyMs: 10,
        status: "completed",
        errorCode: null,
        usage: { input: 1_000_000, cached: 400_000, output: 100_000 }
      }
    ];
    expect(measuredConsumption("gpt-6.1-sol", observations)).toMatchObject({
      observedCreditsEquivalent: 56,
      hypotheticalApiUsd: 2.24,
      billedCost: null,
      usageComplete: true
    });
    expect(measuredConsumption("gpt-6-luna", observations)).toMatchObject({
      observedCreditsEquivalent: 2.85,
      hypotheticalApiUsd: 0.114,
      billedCost: null
    });
    expect(
      measuredConsumption("gpt-6.1-sol", [
        ...observations,
        { ...observations[0]!, usage: null, status: "failed" }
      ])
    ).toMatchObject({
      processAttempts: 2,
      attemptsWithoutUsage: 1,
      usageComplete: false,
      observedCreditsEquivalent: 56
    });
  });
  it.each([
    "texto inválido",
    JSON.stringify({ type: "turn.completed" }),
    JSON.stringify({ type: "turn.completed", usage: { ...usage, cached_input_tokens: 2_000_000 } }),
    JSON.stringify({ type: "turn.completed", usage: { ...usage, input_tokens: -1 } }),
    JSON.stringify({ type: "turn.completed", usage: { ...usage, output_tokens: 1.5 } })
  ])("telemetria inválida permanece desconhecida: %s", (stdout) => {
    expect(usageFromEvents(stdout)).toBeNull();
  });
  it("conta tokens mesmo quando a saída concluída não passa pelo parser", async () => {
    const observations: ProcessObservation[] = [];
    const gateway = observedGateway(conditions[0]!, observations, {
      executable: "ficticio",
      timeoutMs: 1000,
      run: async () => JSON.stringify({ type: "turn.completed", usage })
    });
    await expect(gateway.generate(question)).rejects.toThrow();
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      status: "completed",
      errorCode: "codex_turn_incomplete",
      usage: { input: 1_000_000, cached: 400_000, output: 100_000 }
    });
    expect(measuredConsumption("gpt-6.1-sol", observations).observedCreditsEquivalent).toBe(56);
  });
  it("não copia erro arbitrário ou prompt para a observação", async () => {
    const observations: ProcessObservation[] = [];
    const gateway = observedGateway(conditions[1]!, observations, {
      executable: "ficticio",
      timeoutMs: 1000,
      run: async () => {
        throw new Error("NAO_COPIAR_DETALHE_SINTETICO");
      }
    });
    await expect(gateway.generate(question)).rejects.toThrow();
    expect(JSON.stringify(observations)).not.toContain("NAO_COPIAR_DETALHE_SINTETICO");
    expect(JSON.stringify(observations)).not.toContain(question.question);
    expect(observations[0]).toMatchObject({
      usage: null,
      status: "failed",
      errorCode: "unclassified_process_failure"
    });
  });
  it("preserva código controlado de timeout sem estimar uso zero", async () => {
    const observations: ProcessObservation[] = [];
    const gateway = observedGateway(conditions[0]!, observations, {
      executable: "ficticio",
      timeoutMs: 1000,
      run: async () => {
        throw new CodexProcessError("codex_process_timeout");
      }
    });
    await expect(gateway.generate(question)).rejects.toThrow();
    expect(observations[0]).toMatchObject({ errorCode: "codex_process_timeout", usage: null });
    expect(measuredConsumption("gpt-6.1-sol", observations).usageComplete).toBe(false);
  });
  it("alterna a ordem sem excluir nenhuma configuração", () => {
    for (let index = 0; index < 4; index++)
      expect(new Set(orderedConditions(index, 1).map((item) => item.id))).toEqual(
        new Set(conditions.map((item) => item.id))
      );
    expect(new Set([0, 1, 2, 3].map((index) => orderedConditions(index, 1)[0]!.id)).size).toBe(4);
  });
  it("liga e desliga memória por caso de uso sem mudar o ambiente ou a pergunta", async () => {
    const testCase = baselineConversationCases.find((item) => item.id === "CONV-crosscutting-30")!;
    const setting = process.env.ALVITRA_CHAT_MEMORY_ENABLED;
    for (const enabled of [false, true, false]) {
      const report = await runConversationSuite({
        cases: [testCase],
        gateway: createLocalSyntheticAnswerGateway(),
        synthetic: true,
        chatMemoryEnabled: enabled
      });
      expect(report.chatMemoryEnabled).toBe(enabled);
      const calls = report.results[0]!.turns[1]!.gatewayCalls;
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call.input.question).toBe(testCase.turns[1]!.question);
        if (enabled)
          expect(call.input.conversationContext!.turns[0]!.question).toBe(
            testCase.turns[0]!.question
          );
        else expect(call.input.conversationContext).toBeUndefined();
        expect(call.input).not.toHaveProperty("expected");
      }
      expect(process.env.ALVITRA_CHAT_MEMORY_ENABLED).toBe(setting);
    }
  });
  it("congela fontes sem copiar ambiente e preserva snapshot quando a origem muda", async () => {
    const root = await mkdtemp(join(tmpdir(), "comparison-fixture-"));
    try {
      for (const directory of [
        "apps/api",
        "apps/shared",
        "evals/conversations",
        "evals/conversation-comparison"
      ]) {
        await mkdir(join(root, directory), { recursive: true });
        await writeFile(join(root, directory, "fixture.ts"), "export const synthetic = true;\n");
      }
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      await writeFile(join(root, ".env.local"), "NAO_COPIAR_FIXTURE_AMBIENTE");
      const snapshot = await freezeSnapshot(root, join(root, "output"));
      expect(hash(await fingerprint(snapshot))).toBe(hash(await fingerprint(root)));
      await expect(readFile(join(snapshot, ".env.local"), "utf8")).rejects.toThrow();
      await writeFile(join(root, "apps/api/fixture.ts"), "export const changed = true;");
      expect(hash(await fingerprint(snapshot))).not.toBe(hash(await fingerprint(root)));
      expect(await freezeSnapshot(root, join(root, "output"))).toBe(snapshot);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
