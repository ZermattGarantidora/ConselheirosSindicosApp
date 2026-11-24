export const protocolVersion = "model-memory-comparison-v1";
export type ComparisonModel = "gpt-6.1-sol" | "gpt-5.6-sol" | "gpt-6-luna";
export type Condition = Readonly<{
  id: string;
  model: ComparisonModel;
  memory: boolean;
  reasoningEffort?: "low" | "high";
  routing?: "hybrid";
  runtimeEfforts?: boolean;
}>;
export const lunaConditions: readonly Condition[] = Object.freeze([
  { id: "luna-memory-on", model: "gpt-6-luna", memory: true }
]);
export const solConditions: readonly Condition[] = Object.freeze([
  { id: "sol61-memory-on", model: "gpt-6.1-sol", memory: true },
  { id: "sol56-memory-on", model: "gpt-5.6-sol", memory: true }
]);
export const correctedConditions: readonly Condition[] = Object.freeze([
  { id: "luna-high-memory-on", model: "gpt-6-luna", memory: true, reasoningEffort: "high" },
  { id: "sol61-low-memory-on", model: "gpt-6.1-sol", memory: true, reasoningEffort: "low" }
]);
export const hybridConditions: readonly Condition[] = Object.freeze([
  { id: "luna-memory-on", model: "gpt-6-luna", memory: true },
  { id: "hybrid-memory-on", model: "gpt-6-luna", memory: true, routing: "hybrid" }
]);
export const conditions: readonly Condition[] = Object.freeze([
  { id: "sol-memory-off", model: "gpt-6.1-sol", memory: false },
  { id: "sol-memory-on", model: "gpt-6.1-sol", memory: true },
  { id: "luna-memory-off", model: "gpt-6-luna", memory: false },
  { id: "luna-memory-on", model: "gpt-6-luna", memory: true }
]);
export const priceCard = Object.freeze({
  checkedAt: "2026-10-30",
  speed: "standard",
  currency: "USD",
  codexSource: "https://learn.chatgpt.com/docs/pricing",
  apiSource: "https://developers.openai.com/api/docs/pricing",
  models: {
    "gpt-5.6-sol": {
      credits: { input: 100, cached: 10, output: 500 },
      api: { input: 4, cached: 0.4, output: 20 }
    },
    "gpt-6.1-sol": {
      credits: { input: 50, cached: 2.5, output: 250 },
      api: { input: 2, cached: 0.1, output: 10 }
    },
    "gpt-6-luna": {
      credits: { input: 2.5, cached: 0.25, output: 12.5 },
      api: { input: 0.1, cached: 0.01, output: 0.5 }
    }
  }
});
export type Usage = Readonly<{ input: number; cached: number; output: number }>;
export type ProcessObservation = Readonly<{
  protocol?: Readonly<{ eventKind: string; itemKind?: string }>;
  model?: ComparisonModel;
  reasoningEffort?: "low" | "high";
  inputHash: string;
  latencyMs: number;
  usage: Usage | null;
  status: "completed" | "failed";
  errorCode: string | null;
}>;
export function usageFromEvents(stdout: string): Usage | null {
  let usage: Usage | null = null;
  for (const line of stdout.split(/\r?\n/u).filter((item) => item.trim() !== "")) {
    try {
      const event = JSON.parse(line) as {
        type?: string;
        usage?: { input_tokens?: unknown; cached_input_tokens?: unknown; output_tokens?: unknown };
      };
      if (event?.type !== "turn.completed") continue;
      const raw = event.usage;
      if (
        !raw ||
        ![raw.input_tokens, raw.cached_input_tokens, raw.output_tokens].every(
          (value) => Number.isSafeInteger(value) && Number(value) >= 0
        )
      )
        return null;
      if (Number(raw.cached_input_tokens) > Number(raw.input_tokens)) return null;
      usage = {
        input: Number(raw.input_tokens),
        cached: Number(raw.cached_input_tokens),
        output: Number(raw.output_tokens)
      };
    } catch {
      /* Uma linha inválida não é log nem estimativa de custo zero. */
    }
  }
  return usage;
}
export function measuredConsumption(
  model: ComparisonModel,
  observations: readonly ProcessObservation[]
) {
  const known = observations.flatMap((item) => (item.usage === null ? [] : [item.usage]));
  const tokens = known.reduce(
    (sum, item) => ({
      input: sum.input + item.input,
      cached: sum.cached + item.cached,
      output: sum.output + item.output
    }),
    { input: 0, cached: 0, output: 0 }
  );
  const equivalent = (kind: "credits" | "api") =>
    Number(
      observations
        .reduce((sum, item) => {
          if (item.usage === null) return sum;
          const rate = priceCard.models[item.model ?? model][kind];
          const usage = item.usage;
          return (
            sum +
            ((usage.input - usage.cached) * rate.input +
              usage.cached * rate.cached +
              usage.output * rate.output) /
              1_000_000
          );
        }, 0)
        .toFixed(8)
    );
  return {
    processAttempts: observations.length,
    attemptsWithUsage: known.length,
    attemptsWithoutUsage: observations.length - known.length,
    usageComplete: observations.length > 0 && known.length === observations.length,
    tokens,
    observedCreditsEquivalent: equivalent("credits"),
    hypotheticalApiUsd: equivalent("api"),
    attemptsByModel: Object.fromEntries(
      ["gpt-6-luna", "gpt-6.1-sol", "gpt-5.6-sol"].map((key) => [
        key,
        observations.filter((item) => (item.model ?? model) === key).length
      ])
    ),
    billedCost: null,
    priceCardDate: priceCard.checkedAt,
    limitation:
      "Créditos equivalentes e preço hipotético de API sobre tokens observados; não são valor faturado nem medição da franquia. Tentativas sem usage não valem zero."
  };
}
export function orderedConditions(
  caseIndex: number,
  round: number,
  selected: readonly Condition[] = conditions
): readonly Condition[] {
  const offset = (caseIndex + round - 1) % selected.length;
  return [...selected.slice(offset), ...selected.slice(0, offset)];
}
