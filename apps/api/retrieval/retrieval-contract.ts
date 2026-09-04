import { createHash } from "node:crypto";

import type { CondominiumId } from "../core/condominium-scope.js";
import type { DocumentType } from "../documents/document-model.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";

export const retrievalPipelineVersion = "hybrid-v1" as const;

export type EmbeddingProfile = Readonly<{
  embeddingProfile: string;
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  pipelineVersion: string;
  dimensions: number;
}>;

export type GeneratedEmbedding = Readonly<
  EmbeddingProfile & {
    values: readonly number[];
    contentSha256: string;
  }
>;

export interface EmbeddingAdapter {
  readonly profile: EmbeddingProfile;
  embed(input: Readonly<{ content: string; contentSha256: string }>): Promise<GeneratedEmbedding>;
}

export type RetrievalSearchInput = Readonly<{
  query: string;
  maxResults?: number;
  minimumQualityScore?: number;
  asOf?: Date;
}>;

export type RetrievableChunk = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  documentVersionNumber: number;
  documentTitle: string;
  documentType: DocumentType;
  sourceKind: "user_upload" | "administrator_import";
  pageId: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  content: string;
  contentSha256: string;
  semanticScore: number | null;
  extractionMethod: "pdf_text" | "ocr";
  qualityScore: number;
  processingStatus: "ready" | "needs_review";
  validityStatus: "confirmed" | "not_applicable" | "pending" | "disputed" | "superseded";
  validFrom: Date | null;
  validUntil: Date | null;
}>;

export type RetrievalEvidence = Readonly<
  RetrievableChunk & {
    lexicalScore: number;
    semanticScore: number | null;
    rerankScore: number;
    rank: number;
  }
>;

export type EvidenceSufficiency = Readonly<{
  status: "sufficient" | "weak" | "insufficient";
  reason: "enough_relevance" | "low_relevance" | "no_evidence";
  supportingEvidenceCount: number;
}>;

export type ScopedRetrievalResult = Readonly<{
  pipelineVersion: typeof retrievalPipelineVersion;
  queryHash: string;
  candidateCount: number;
  selectedCount: number;
  evidence: readonly RetrievalEvidence[];
  sufficiency: EvidenceSufficiency;
}>;

export interface ScopedRetrievalIndex {
  findAuthorizedCandidates(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      query: string;
      limit: number;
      minimumQualityScore: number;
      asOf: Date;
    }>
  ): Promise<readonly RetrievableChunk[]>;
}

export type PageChunkInput = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  documentPageId: string;
  pageNumber: number;
  extractedText: string;
}>;

export type PageChunk = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  documentPageId: string;
  pageNumber: number;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  content: string;
  contentSha256: string;
  tokenCount: number;
}>;

export type ChunkingOptions = Readonly<{
  maximumCharacters?: number;
  overlapCharacters?: number;
}>;

function assertChunkingOptions(options: Required<ChunkingOptions>): void {
  if (!Number.isInteger(options.maximumCharacters) || options.maximumCharacters < 1) {
    throw new Error("O limite de caracteres do chunk deve ser um inteiro positivo.");
  }

  if (
    !Number.isInteger(options.overlapCharacters) ||
    options.overlapCharacters < 0 ||
    options.overlapCharacters >= options.maximumCharacters
  ) {
    throw new Error("A sobreposição do chunk deve ser menor que o limite de caracteres.");
  }
}

function countTokens(content: string): number {
  return Math.max(1, content.trim().split(/\s+/u).length);
}

function findBreakOffset(characters: readonly string[], startOffset: number, endOffset: number) {
  if (endOffset === characters.length) {
    return endOffset;
  }

  const minimumBreak = startOffset + Math.floor((endOffset - startOffset) / 2);
  for (let offset = endOffset; offset > minimumBreak; offset -= 1) {
    if (/\s/u.test(characters[offset - 1] ?? "")) {
      return offset;
    }
  }

  return endOffset;
}

function nextChunkStart(
  characters: readonly string[],
  chunkStart: number,
  chunkEnd: number,
  overlapCharacters: number
): number {
  const desiredStart = Math.max(chunkStart + 1, chunkEnd - overlapCharacters);
  let start = desiredStart;

  while (start < chunkEnd && /\s/u.test(characters[start] ?? "")) {
    start += 1;
  }

  return start;
}

/**
 * Divide uma página em chunks sem atravessar a fronteira da página.
 * Os offsets são contados em code points, a mesma unidade usada pelo
 * PostgreSQL para substring e pelas citações que serão validadas depois.
 */
export function chunkPage(
  input: PageChunkInput,
  options: ChunkingOptions = {}
): readonly PageChunk[] {
  if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1) {
    throw new Error("A página do chunk deve ser um inteiro positivo.");
  }

  const resolvedOptions = {
    maximumCharacters: options.maximumCharacters ?? 1_200,
    overlapCharacters: options.overlapCharacters ?? 160
  };
  assertChunkingOptions(resolvedOptions);

  const characters = Array.from(input.extractedText);
  if (characters.length === 0) {
    return Object.freeze([]);
  }

  const chunks: PageChunk[] = [];
  let startOffset = 0;

  while (startOffset < characters.length) {
    const proposedEnd = Math.min(
      startOffset + resolvedOptions.maximumCharacters,
      characters.length
    );
    const endOffset = findBreakOffset(characters, startOffset, proposedEnd);
    const content = characters.slice(startOffset, endOffset).join("");

    if (content.trim().length > 0) {
      chunks.push(
        Object.freeze({
          condominiumId: input.condominiumId,
          documentVersionId: input.documentVersionId,
          documentPageId: input.documentPageId,
          pageNumber: input.pageNumber,
          chunkIndex: chunks.length,
          startOffset,
          endOffset,
          content,
          contentSha256: createHash("sha256").update(content).digest("hex"),
          tokenCount: countTokens(content)
        })
      );
    }

    if (endOffset >= characters.length) {
      break;
    }

    const nextStart = nextChunkStart(
      characters,
      startOffset,
      endOffset,
      resolvedOptions.overlapCharacters
    );
    if (nextStart <= startOffset) {
      throw new Error("O chunking não conseguiu avançar na página.");
    }
    startOffset = nextStart;
  }

  return Object.freeze(chunks);
}

export function retrievalQueryHash(query: string): string {
  return createHash("sha256").update(query.trim()).digest("hex");
}
