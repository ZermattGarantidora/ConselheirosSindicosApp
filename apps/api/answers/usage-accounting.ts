/** Tarifa Standard por milhão, conferida nas páginas oficiais dos modelos em 23/11/2026. */
export const answerPriceCard = Object.freeze({
  date: "2026-11-23",
  currency: "USD" as const,
  source: "https://developers.openai.com/api/docs/pricing",
  models: {
    "gpt-6.1-sol": { input: 2, cached: 0.1, output: 10 },
    "gpt-6-luna": { input: 0.1, cached: 0.01, output: 0.5 }
  }
});

export type AccountedUsage = Readonly<{
  inputTokens: number;
  cachedInputTokens: number;
  cacheWrite30mTokens: number;
  cacheWrite12hTokens: number;
  outputTokens: number;
  reasoningTokens: number | null;
}>;
export type UsageAccounting = Readonly<{
  version: "openai-usage-v1";
  currency: "USD";
  priceCardDate: string;
  usage: AccountedUsage | null;
  estimatedCostUsd: number | null;
  unavailableReason: "usage_missing" | "usage_invalid" | "price_unavailable" | null;
}>;

const counter = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export function accountOpenAiUsage(model: string, raw: unknown): UsageAccounting {
  const base = {
    version: "openai-usage-v1" as const,
    currency: "USD" as const,
    priceCardDate: answerPriceCard.date
  };
  const unknown = (reason: UsageAccounting["unavailableReason"]): UsageAccounting =>
    Object.freeze({ ...base, usage: null, estimatedCostUsd: null, unavailableReason: reason });
  const data = object(raw);
  if (!data) return unknown("usage_missing");
  const details = object(data.input_tokens_details);
  // O pedido usa TTL 30m. Sem os contadores de cache não presumir cobrança zero.
  if (!details || details.cached_tokens === undefined || details.cache_write_tokens === undefined)
    return unknown("usage_missing");
  const writes = object(details.cache_write_tokens_details);
  if (details.cache_write_tokens_details !== undefined && !writes) return unknown("usage_invalid");
  const write30m = writes ? writes.ttl_30m_tokens : details.cache_write_tokens;
  const write12h = writes ? writes.ttl_12h_tokens : 0;
  const reasoning = object(data.output_tokens_details)?.reasoning_tokens ?? null;
  if (
    !counter(data.input_tokens) ||
    !counter(data.output_tokens) ||
    !counter(details.cached_tokens) ||
    !counter(details.cache_write_tokens) ||
    !counter(write30m) ||
    !counter(write12h) ||
    write30m + write12h !== details.cache_write_tokens ||
    details.cached_tokens + write30m + write12h > data.input_tokens ||
    (reasoning !== null && (!counter(reasoning) || reasoning > data.output_tokens))
  )
    return unknown("usage_invalid");
  const usage: AccountedUsage = Object.freeze({
    inputTokens: data.input_tokens,
    cachedInputTokens: details.cached_tokens,
    cacheWrite30mTokens: write30m,
    cacheWrite12hTokens: write12h,
    outputTokens: data.output_tokens,
    reasoningTokens: reasoning as number | null
  });
  const rate = Object.hasOwn(answerPriceCard.models, model)
    ? answerPriceCard.models[model as keyof typeof answerPriceCard.models]
    : undefined;
  if (!rate)
    return Object.freeze({
      ...base,
      usage,
      estimatedCostUsd: null,
      unavailableReason: "price_unavailable"
    });
  // Nanodólares inteiros evitam arredondar mensagens econômicas para zero.
  const ordinary = usage.inputTokens - usage.cachedInputTokens - write30m - write12h;
  const inputMultiplier = usage.inputTokens > 272_000 ? 2 : 1;
  const outputMultiplier = usage.inputTokens > 272_000 ? 1.5 : 1;
  const nanos =
    BigInt(ordinary) * BigInt(Math.round(rate.input * inputMultiplier * 1000)) +
    BigInt(usage.cachedInputTokens) * BigInt(Math.round(rate.cached * inputMultiplier * 1000)) +
    BigInt(write30m) * BigInt(Math.round(rate.input * inputMultiplier * 1.25 * 1000)) +
    BigInt(write12h) * BigInt(Math.round(rate.input * inputMultiplier * 2.5 * 1000)) +
    BigInt(usage.outputTokens) * BigInt(Math.round(rate.output * outputMultiplier * 1000));
  if (nanos > BigInt(Number.MAX_SAFE_INTEGER)) return unknown("usage_invalid");
  return Object.freeze({
    ...base,
    usage,
    estimatedCostUsd: Number(nanos) / 1_000_000_000,
    unavailableReason: null
  });
}
