import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { createLocalSyntheticEmbeddingAdapter } from "./local-embedding.js";
import type {
  EmbeddingAdapter,
  RetrievableChunk,
  ScopedRetrievalIndex
} from "./retrieval-contract.js";

const stopWords = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "como",
  "da",
  "das",
  "de",
  "deve",
  "devem",
  "do",
  "dos",
  "e",
  "em",
  "entre",
  "foi",
  "foram",
  "ha",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "pode",
  "posso",
  "qual",
  "quando",
  "que",
  "quem",
  "regra",
  "regras",
  "sao",
  "segundo",
  "sem",
  "ser",
  "sobre",
  "um",
  "uma",
  "uns",
  "umas",
  "ir"
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function queryTerms(query: string): readonly string[] {
  return normalize(query)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

function hasLexicalOverlap(query: string, chunk: RetrievableChunk): boolean {
  const terms = queryTerms(query);
  const searchableText = normalize(`${chunk.documentTitle} ${chunk.content}`);
  const contentTerms = searchableText.split(/[^\p{L}\p{N}]+/gu);

  return terms.some(
    (term) =>
      searchableText.includes(term) ||
      (term.length >= 6 &&
        contentTerms.some(
          (contentTerm) =>
            contentTerm.length >= 6 &&
            (contentTerm.startsWith(term.slice(0, 7)) || term.startsWith(contentTerm.slice(0, 7)))
        ))
  );
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) {
    return 0;
  }

  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, dot / (leftNorm * rightNorm)));
}

/**
 * Índice determinístico para desenvolvimento e evals. O filtro de tenant é
 * aplicado antes de qualquer representação semântica; o caso de uso repete
 * os filtros de qualidade, vigência e estado como defesa adicional.
 */
export function createInMemoryScopedRetrievalIndex(
  chunks: readonly RetrievableChunk[],
  embeddingAdapter: EmbeddingAdapter = createLocalSyntheticEmbeddingAdapter()
): ScopedRetrievalIndex {
  return Object.freeze({
    async findAuthorizedCandidates(
      context: AuthorizedCondominiumContext,
      input: Readonly<{
        query: string;
        limit: number;
        minimumQualityScore: number;
        asOf: Date;
      }>
    ): Promise<readonly RetrievableChunk[]> {
      if (!context.permissions.includes("document:read")) {
        return Object.freeze([]);
      }

      const authorized = chunks
        .filter((chunk) => chunk.condominiumId === context.condominiumId)
        .filter((chunk) => hasLexicalOverlap(input.query, chunk));
      if (authorized.length === 0) {
        return Object.freeze([]);
      }

      const queryEmbedding = await embeddingAdapter.embed({
        content: input.query,
        contentSha256: "0".repeat(64)
      });
      const scored: RetrievableChunk[] = [];

      for (const chunk of authorized) {
        const embedding = await embeddingAdapter.embed({
          content: chunk.content,
          contentSha256: chunk.contentSha256
        });
        scored.push(
          Object.freeze({
            ...chunk,
            semanticScore: cosineSimilarity(queryEmbedding.values, embedding.values)
          })
        );
      }

      return Object.freeze(scored);
    }
  });
}
