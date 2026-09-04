import { describe, expect, it } from "vitest";

import {
  createLocalSyntheticEmbeddingAdapter,
  formatPgVector
} from "../../apps/api/retrieval/local-embedding.js";

function cosine(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

describe("baseline local de embeddings", () => {
  it("é determinístico, versionado e preserva semelhança de texto normalizado", async () => {
    const adapter = createLocalSyntheticEmbeddingAdapter();
    const first = await adapter.embed({
      content: "Regra de locação por temporada",
      contentSha256: "a".repeat(64)
    });
    const second = await adapter.embed({
      content: "regra de locacao por temporada",
      contentSha256: "b".repeat(64)
    });

    expect(first).toMatchObject({
      embeddingProfile: "synthetic-local-hash-128",
      providerKey: "local",
      dimensions: 128,
      contentSha256: "a".repeat(64)
    });
    expect(first.values).toHaveLength(128);
    expect(cosine(first.values, second.values)).toBeGreaterThan(0.95);
  });

  it("formata vetores para pgvector e rejeita dados não finitos", () => {
    expect(formatPgVector([0, 0.5, -1])).toBe("[0,0.5,-1]");
    expect(() => formatPgVector([])).toThrow("valores numéricos");
    expect(() => formatPgVector([Number.NaN])).toThrow("valores numéricos");
  });
});
