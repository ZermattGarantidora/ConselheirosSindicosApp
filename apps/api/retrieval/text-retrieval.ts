import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { evaluateEvidenceSufficiency } from "./retrieval-ranking.js";
import {
  retrievalPipelineVersion,
  retrievalQueryHash,
  type RetrievalEvidence,
  type RetrievalSearchInput,
  type ScopedRetrievalIndex,
  type ScopedRetrievalResult
} from "./retrieval-contract.js";
import { rerankScore } from "./retrieval-ranking.js";

const defaultMaximumResults = 8;
const defaultMinimumQualityScore = 0.7;
const portugueseStopWords = new Set([
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

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function queryTerms(query: string): readonly string[] {
  return Object.freeze([
    ...new Set(
      normalizeText(query)
        .split(/[^\p{L}\p{N}]+/gu)
        .filter((term) => term.length > 1 && !portugueseStopWords.has(term))
    )
  ]);
}

function expandRetrievalQuery(query: string): string {
  const expansions: string[] = [];
  if (/multa|cobrança|processar|contesta/iu.test(query)) {
    expansions.push("notificação manifestação contestação cobrança");
  }
  if (/parede|estrutur|retirada|obra|intervenção/iu.test(query)) {
    expansions.push("intervenções documentação técnica aprovações segurança");
  }
  return expansions.length === 0 ? query : `${query} ${expansions.join(" ")}`;
}

function termMatches(term: string, normalizedContent: string): boolean {
  if (normalizedContent.includes(term)) {
    return true;
  }

  const contentTerms = normalizedContent.split(/[^\p{L}\p{N}]+/gu);
  const prefix = term.slice(0, Math.min(7, term.length));
  return (
    prefix.length >= 6 &&
    contentTerms.some(
      (contentTerm) =>
        contentTerm.length >= 6 &&
        (contentTerm.startsWith(prefix) || term.startsWith(contentTerm.slice(0, 7)))
    )
  );
}

function validateInput(input: RetrievalSearchInput): void {
  if (input.query.trim().length === 0) {
    throw new Error("A pergunta de retrieval não pode ser vazia.");
  }

  if (
    input.maxResults !== undefined &&
    (!Number.isInteger(input.maxResults) || input.maxResults < 1 || input.maxResults > 50)
  ) {
    throw new Error("A quantidade de resultados deve estar entre 1 e 50.");
  }

  if (
    input.minimumQualityScore !== undefined &&
    (input.minimumQualityScore < 0 || input.minimumQualityScore > 1)
  ) {
    throw new Error("A qualidade mínima deve estar entre 0 e 1.");
  }

  if (input.asOf !== undefined && Number.isNaN(input.asOf.getTime())) {
    throw new Error("A data de referência do retrieval deve ser válida.");
  }
}

function isTemporallyApplicable(
  validFrom: Date | null,
  validUntil: Date | null,
  asOf: Date
): boolean {
  return (validFrom === null || validFrom <= asOf) && (validUntil === null || validUntil > asOf);
}

function lexicalScore(query: string, content: string): number {
  const normalizedQuery = normalizeText(query).trim();
  const normalizedContent = normalizeText(content);
  const terms = queryTerms(query);

  if (terms.length === 0) {
    return 0;
  }

  const matchedTerms = terms.filter((term) => termMatches(term, normalizedContent));
  const coverage = matchedTerms.length / terms.length;
  const frequency = matchedTerms.reduce((total, term) => {
    return total + (normalizedContent.split(term).length - 1);
  }, 0);
  const frequencyScore = Math.min(1, frequency / terms.length);
  const phraseBoost = normalizedContent.includes(normalizedQuery) ? 0.25 : 0;

  return Math.min(1, Math.sqrt(coverage) * 0.6 + frequencyScore * 0.15 + phraseBoost);
}

function compareEvidence(left: RetrievalEvidence, right: RetrievalEvidence): number {
  return (
    right.rerankScore - left.rerankScore ||
    right.qualityScore - left.qualityScore ||
    right.documentVersionNumber - left.documentVersionNumber ||
    left.pageNumber - right.pageNumber ||
    left.id.localeCompare(right.id)
  );
}

export function createScopedTextRetriever(index: ScopedRetrievalIndex): Readonly<{
  search(
    context: AuthorizedCondominiumContext,
    input: RetrievalSearchInput
  ): Promise<ScopedRetrievalResult>;
}> {
  return Object.freeze({
    async search(context, input) {
      validateInput(input);
      const maxResults = input.maxResults ?? defaultMaximumResults;
      const minimumQualityScore = input.minimumQualityScore ?? defaultMinimumQualityScore;
      const asOf = input.asOf ?? new Date();

      if (!context.permissions.includes("document:read")) {
        return Object.freeze({
          pipelineVersion: retrievalPipelineVersion,
          queryHash: retrievalQueryHash(input.query),
          candidateCount: 0,
          selectedCount: 0,
          evidence: Object.freeze([]) as readonly RetrievalEvidence[],
          sufficiency: evaluateEvidenceSufficiency([])
        });
      }

      // O índice recebe o contexto autorizado, não um ID livre do cliente. A
      // checagem repetida aqui é uma defesa adicional antes de qualquer score.
      const candidates = await index.findAuthorizedCandidates(context, {
        query: expandRetrievalQuery(input.query),
        limit: Math.max(maxResults, 50),
        minimumQualityScore,
        asOf
      });
      const scopedCandidates = candidates.filter(
        (candidate) => candidate.condominiumId === context.condominiumId
      );
      const evidence = scopedCandidates
        .filter((candidate) => candidate.processingStatus === "ready")
        .filter(
          (candidate) =>
            candidate.validityStatus === "confirmed" ||
            candidate.validityStatus === "not_applicable"
        )
        .filter((candidate) => candidate.qualityScore >= minimumQualityScore)
        .filter((candidate) =>
          isTemporallyApplicable(candidate.validFrom, candidate.validUntil, asOf)
        )
        .map((candidate) => {
          const score = lexicalScore(
            expandRetrievalQuery(input.query),
            `${candidate.documentTitle} ${candidate.content}`
          );
          return Object.freeze({
            ...candidate,
            lexicalScore: score,
            semanticScore: candidate.semanticScore,
            rerankScore: rerankScore({
              lexicalScore: score,
              semanticScore: candidate.semanticScore,
              qualityScore: candidate.qualityScore
            }),
            rank: 0
          });
        })
        .filter(
          (candidate) =>
            candidate.lexicalScore > 0 ||
            (candidate.semanticScore !== null && candidate.semanticScore > 0)
        )
        .sort(compareEvidence)
        .slice(0, maxResults)
        .map((candidate, index) => Object.freeze({ ...candidate, rank: index + 1 }));

      return Object.freeze({
        pipelineVersion: retrievalPipelineVersion,
        queryHash: retrievalQueryHash(input.query),
        candidateCount: scopedCandidates.length,
        selectedCount: evidence.length,
        evidence: Object.freeze(evidence),
        sufficiency: evaluateEvidenceSufficiency(evidence)
      });
    }
  });
}

export { lexicalScore, normalizeText };
