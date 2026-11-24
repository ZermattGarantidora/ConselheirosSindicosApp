import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import {
  createLocalSyntheticEmbeddingAdapter,
  formatPgVector
} from "../../apps/api/retrieval/local-embedding.js";

function cosine(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

describe("baseline local de embeddings", () => {
  it("mantém exatamente o vetor anterior ao contar features repetidas", async () => {
    const content = "💡 Garagem ÁREA garagem garagem\nABC ABC ".repeat(50);
    const normalized = content
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .replaceAll(/\s+/gu, " ")
      .trim();
    const words = normalized.split(/[^\p{L}\p{N}]+/gu).filter((word) => word.length > 1);
    const characters = [...normalized];
    const features = [
      ...words.map((word) => `word:${word}`),
      ...characters.flatMap((_, index) =>
        index + 3 > characters.length ? [] : [`char:${characters.slice(index, index + 3).join("")}`]
      )
    ];
    const expected = new Array<number>(128).fill(0);
    for (const feature of features) {
      const digest = createHash("sha256").update(feature).digest();
      const index = digest.readUInt32BE(0) % 128;
      expected[index] = expected[index]! + (digest[4]! % 2 === 0 ? 1 : -1);
    }
    const norm = Math.sqrt(expected.reduce((sum, value) => sum + value * value, 0));
    const result = await createLocalSyntheticEmbeddingAdapter().embed({
      content,
      contentSha256: "a".repeat(64)
    });
    expect(result.values).toEqual(expected.map((value) => value / norm));
  });
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
