import { createHash } from "node:crypto";

import { type EmbeddingAdapter, type GeneratedEmbedding } from "./retrieval-contract.js";

const dimensions = 128;

export const localSyntheticEmbeddingProfile = Object.freeze({
  embeddingProfile: "synthetic-local-hash-128",
  providerKey: "local",
  modelKey: "character-ngram-hash",
  modelVersion: "1",
  pipelineVersion: "embedding-v1",
  dimensions
});

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/\s+/gu, " ")
    .trim();
}

function* features(content: string): Generator<string> {
  const normalized = normalizeText(content);
  const words = normalized.split(/[^\p{L}\p{N}]+/gu).filter((word) => word.length > 1);
  for (const word of words) yield `word:${word}`;
  const characters = [...normalized];
  for (let index = 0; index + 3 <= characters.length; index += 1) {
    yield `char:${characters[index]}${characters[index + 1]}${characters[index + 2]}`;
  }
}

function vectorFor(content: string): readonly number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const counts = new Map<string, number>();
  for (const feature of features(content)) {
    counts.set(feature, (counts.get(feature) ?? 0) + 1);
  }
  for (const [feature, count] of counts) {
    const digest = createHash("sha256").update(feature).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = digest[4] !== undefined && digest[4] % 2 === 0 ? 1 : -1;
    vector[index] = (vector[index] ?? 0) + sign * count;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return Object.freeze(vector);
  }

  return Object.freeze(vector.map((value) => value / norm));
}

export function createLocalSyntheticEmbeddingAdapter(): EmbeddingAdapter {
  return Object.freeze({
    profile: localSyntheticEmbeddingProfile,
    async embed(
      input: Readonly<{ content: string; contentSha256: string }>
    ): Promise<GeneratedEmbedding> {
      return Object.freeze({
        ...localSyntheticEmbeddingProfile,
        values: vectorFor(input.content),
        contentSha256: input.contentSha256
      });
    }
  });
}

export function formatPgVector(values: readonly number[]): string {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("O embedding deve conter valores numéricos finitos.");
  }

  return `[${values.join(",")}]`;
}
