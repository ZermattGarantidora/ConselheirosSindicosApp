import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { CondominiumId } from "../core/condominium-scope.js";
import {
  chunkPage,
  type EmbeddingAdapter,
  type GeneratedEmbedding
} from "../retrieval/retrieval-contract.js";
import { formatPgVector } from "../retrieval/local-embedding.js";
import type { DocumentProcessingOutcome } from "./document-processing.js";

const maximumInsertRows = 100;
const maximumPreparedPages = 25;

// Statements and column names are constants owned by the application; only values are dynamic.
async function insertRows(
  client: PoolClient,
  statement: string,
  rows: readonly (readonly unknown[])[],
  vectorColumn?: number,
  includeSearchVector = false
): Promise<void> {
  for (let start = 0; start < rows.length; start += maximumInsertRows) {
    const batch = rows.slice(start, start + maximumInsertRows);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      const rowStart = values.length;
      const parameters = row.map((value, index) => {
        values.push(value);
        const parameter = `$${values.length}`;
        return index === vectorColumn ? `${parameter}::vector` : parameter;
      });
      if (includeSearchVector) parameters.push(`to_tsvector('portuguese', $${rowStart + 8})`);
      return `(${parameters.join(", ")})`;
    });
    await client.query(`${statement} VALUES ${tuples.join(", ")}`, values);
  }
}

function embeddingRow(
  condominiumId: CondominiumId,
  chunkId: string,
  embedding: GeneratedEmbedding
): readonly unknown[] {
  if (embedding.dimensions !== embedding.values.length) {
    throw new Error("O vetor do chunk é inválido.");
  }
  return [
    condominiumId,
    randomUUID(),
    chunkId,
    embedding.embeddingProfile,
    embedding.providerKey,
    embedding.modelKey,
    embedding.modelVersion,
    embedding.pipelineVersion,
    embedding.dimensions,
    formatPgVector(embedding.values),
    embedding.contentSha256
  ];
}

/** Called inside the worker transaction; no partial batch becomes visible before COMMIT. */
export async function persistDocumentPages(
  client: PoolClient,
  input: Readonly<{
    condominiumId: CondominiumId;
    documentVersionId: string;
    outcome: DocumentProcessingOutcome;
  }>,
  embeddingAdapter: EmbeddingAdapter
): Promise<void> {
  let chunkIndex = 0;
  for (let start = 0; start < input.outcome.pages.length; start += maximumPreparedPages) {
    const pages: (readonly unknown[])[] = [];
    const chunks: (readonly unknown[])[] = [];
    const embeddings: (readonly unknown[])[] = [];
    for (const page of input.outcome.pages.slice(start, start + maximumPreparedPages)) {
      if (
        page.condominiumId !== input.condominiumId ||
        page.documentVersionId !== input.documentVersionId
      ) {
        throw new Error("A página não pertence à versão e ao condomínio do processamento.");
      }
      const pageId = randomUUID();
      pages.push([
        input.condominiumId,
        pageId,
        input.documentVersionId,
        page.pageIndex,
        page.pageNumber,
        page.extractedText,
        page.extractionMethod,
        page.qualityScore,
        page.contentSha256,
        page.visualDescription ?? null,
        page.recognizedText ?? null,
        page.analysisLimitations ?? null
      ]);
      if (input.outcome.status !== "completed") continue;
      for (const chunk of chunkPage({
        condominiumId: input.condominiumId,
        documentVersionId: input.documentVersionId,
        documentPageId: pageId,
        pageNumber: page.pageNumber,
        extractedText: page.extractedText
      })) {
        const chunkId = randomUUID();
        chunks.push([
          input.condominiumId,
          chunkId,
          input.documentVersionId,
          pageId,
          chunkIndex++,
          chunk.startOffset,
          chunk.endOffset,
          chunk.content,
          chunk.contentSha256,
          chunk.tokenCount
        ]);
        const multimodal = page.multimodalEmbeddings?.find(
          (candidate) => candidate.contentSha256 === chunk.contentSha256
        );
        if (multimodal !== undefined)
          embeddings.push(embeddingRow(input.condominiumId, chunkId, multimodal));
        const embedding = await embeddingAdapter.embed({
          content: chunk.content,
          contentSha256: chunk.contentSha256
        });
        if (
          embedding.dimensions !== embeddingAdapter.profile.dimensions ||
          embedding.contentSha256 !== chunk.contentSha256
        ) {
          throw new Error("O embedding do chunk não corresponde ao conteúdo indexado.");
        }
        embeddings.push(embeddingRow(input.condominiumId, chunkId, embedding));
      }
    }
    await insertRows(
      client,
      `INSERT INTO app.document_pages (
      condominium_id, id, document_version_id, page_index, page_number, extracted_text,
      extraction_method, quality_score, content_sha256, visual_description, recognized_text, analysis_limitations
    )`,
      pages
    );
    await insertRows(
      client,
      `INSERT INTO app.document_chunks (
      condominium_id, id, document_version_id, document_page_id, chunk_index,
      start_offset, end_offset, content, content_sha256, token_count, search_vector
    )`,
      chunks,
      undefined,
      true
    );
    await insertRows(
      client,
      `INSERT INTO app.document_chunk_embeddings (
      condominium_id, id, document_chunk_id, embedding_profile, provider_key, model_key,
      model_version, pipeline_version, dimensions, embedding, content_sha256
    )`,
      embeddings,
      9
    );
  }
}
