import { createHash, randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type { CondominiumId } from "../core/condominium-scope.js";
import {
  createScopedDocumentProcessor,
  type DocumentProcessingRepository,
  type StoredDocumentForProcessing
} from "./document-processing.js";
import type { DocumentProcessingStatus, DocumentVersionState } from "./document-model.js";
import type { PrivateDocumentReader } from "./private-document-storage.js";
import type { OcrAdapter } from "./ocr-quality.js";
import { chunkPage } from "../retrieval/retrieval-contract.js";
import {
  createLocalSyntheticEmbeddingAdapter,
  formatPgVector
} from "../retrieval/local-embedding.js";
import type { EmbeddingAdapter } from "../retrieval/retrieval-contract.js";

type PoolLike = Pick<Pool, "connect">;

type DocumentProcessingRow = Readonly<{
  condominium_id: string;
  document_version_id: string;
  storage_object_id: string;
  content_sha256: string;
  processing_status: DocumentProcessingStatus;
  validity_status: DocumentVersionState["validityStatus"];
  valid_from: Date | null;
  valid_until: Date | null;
  ocr_quality_score: number | string | null;
}>;

async function setWorkerContext(
  client: PoolClient,
  condominiumId?: CondominiumId,
  jobId?: string
): Promise<void> {
  await client.query("SET LOCAL ROLE app_worker");
  if (condominiumId !== undefined) {
    await client.query("SELECT set_config('app.condominium_id', $1, true)", [condominiumId]);
  }
  if (jobId !== undefined) {
    await client.query("SELECT set_config('app.processing_job_id', $1, true)", [jobId]);
  }
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

function toDocumentVersionState(row: DocumentProcessingRow): DocumentVersionState {
  return Object.freeze({
    processingStatus: row.processing_status,
    validityStatus: row.validity_status,
    validFrom: row.valid_from === null ? null : new Date(row.valid_from).toISOString(),
    validUntil: row.valid_until === null ? null : new Date(row.valid_until).toISOString(),
    ocrQualityScore: row.ocr_quality_score === null ? null : Number(row.ocr_quality_score)
  });
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createPostgresDocumentProcessingRepository(
  pool: PoolLike,
  storage: PrivateDocumentReader,
  embeddingAdapter: EmbeddingAdapter = createLocalSyntheticEmbeddingAdapter()
): DocumentProcessingRepository {
  return {
    async loadForProcessing(input): Promise<StoredDocumentForProcessing | undefined> {
      const client = await pool.connect();
      let row: DocumentProcessingRow | undefined;

      try {
        await client.query("BEGIN");
        await setWorkerContext(client, input.condominiumId);
        const result = await client.query<DocumentProcessingRow>(
          `
            SELECT
              dv.condominium_id,
              dv.id AS document_version_id,
              dv.storage_object_id,
              dv.content_sha256,
              dvs.processing_status,
              dvs.validity_status,
              dvs.valid_from,
              dvs.valid_until,
              dvs.ocr_quality_score
            FROM app.document_versions AS dv
            JOIN app.storage_objects AS so
              ON so.condominium_id = dv.condominium_id
              AND so.id = dv.storage_object_id
            JOIN app.document_version_states AS dvs
              ON dvs.condominium_id = dv.condominium_id
              AND dvs.document_version_id = dv.id
            WHERE dv.condominium_id = $1
              AND dv.id = $2
            LIMIT 1
          `,
          [input.condominiumId, input.documentVersionId]
        );
        row = result.rows[0];
        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }

      if (row === undefined) {
        return undefined;
      }

      const content = await storage.readOriginal({
        condominiumId: input.condominiumId,
        objectId: row.storage_object_id
      });

      if (sha256(content) !== row.content_sha256) {
        throw new Error("O hash do original documental não confere com a versão persistida.");
      }

      return Object.freeze({
        condominiumId: input.condominiumId,
        documentVersionId: input.documentVersionId,
        content,
        state: toDocumentVersionState(row)
      });
    },

    async saveProcessingResult(input): Promise<void> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await setWorkerContext(client, input.condominiumId, input.jobId);

        const job = await client.query<{ active: number }>(
          `
            SELECT 1 AS active
            FROM app.processing_jobs
            WHERE condominium_id = $1
              AND document_version_id = $2
              AND id = $3
              AND status = 'processing'
              AND attempt_count = $4
            FOR UPDATE
          `,
          [input.condominiumId, input.documentVersionId, input.jobId, input.attemptCount]
        );
        if (job.rows[0] === undefined) {
          throw new Error("O job de processamento não está mais em execução.");
        }

        await client.query(
          `
            DELETE FROM app.document_chunk_embeddings
            WHERE condominium_id = $1 AND document_chunk_id IN (
              SELECT id
              FROM app.document_chunks
              WHERE condominium_id = $1 AND document_version_id = $2
            )
          `,
          [input.condominiumId, input.documentVersionId]
        );
        await client.query(
          `
            DELETE FROM app.document_chunks
            WHERE condominium_id = $1 AND document_version_id = $2
          `,
          [input.condominiumId, input.documentVersionId]
        );
        await client.query(
          `
            DELETE FROM app.document_pages
            WHERE condominium_id = $1 AND document_version_id = $2
          `,
          [input.condominiumId, input.documentVersionId]
        );

        let documentChunkIndex = 0;
        for (const page of input.outcome.pages) {
          const documentPageId = randomUUID();
          await client.query(
            `
              INSERT INTO app.document_pages (
                condominium_id, id, document_version_id, page_index, page_number,
                extracted_text, extraction_method, quality_score, content_sha256
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
              input.condominiumId,
              documentPageId,
              input.documentVersionId,
              page.pageIndex,
              page.pageNumber,
              page.extractedText,
              page.extractionMethod,
              page.qualityScore,
              page.contentSha256
            ]
          );

          for (const chunk of chunkPage({
            condominiumId: input.condominiumId,
            documentVersionId: input.documentVersionId,
            documentPageId,
            pageNumber: page.pageNumber,
            extractedText: page.extractedText
          })) {
            const documentChunkId = randomUUID();
            await client.query(
              `
                INSERT INTO app.document_chunks (
                  condominium_id, id, document_version_id, document_page_id,
                  chunk_index, start_offset, end_offset, content, content_sha256,
                  token_count, search_vector
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  to_tsvector('portuguese', $8))
              `,
              [
                input.condominiumId,
                documentChunkId,
                input.documentVersionId,
                documentPageId,
                documentChunkIndex,
                chunk.startOffset,
                chunk.endOffset,
                chunk.content,
                chunk.contentSha256,
                chunk.tokenCount
              ]
            );
            documentChunkIndex += 1;

            const embedding = await embeddingAdapter.embed({
              content: chunk.content,
              contentSha256: chunk.contentSha256
            });
            if (
              embedding.dimensions !== embeddingAdapter.profile.dimensions ||
              embedding.values.length !== embeddingAdapter.profile.dimensions ||
              embedding.contentSha256 !== chunk.contentSha256
            ) {
              throw new Error("O embedding do chunk não corresponde ao conteúdo indexado.");
            }

            await client.query(
              `
                INSERT INTO app.document_chunk_embeddings (
                  condominium_id, id, document_chunk_id, embedding_profile,
                  provider_key, model_key, model_version, pipeline_version,
                  dimensions, embedding, content_sha256
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11)
              `,
              [
                input.condominiumId,
                randomUUID(),
                documentChunkId,
                embedding.embeddingProfile,
                embedding.providerKey,
                embedding.modelKey,
                embedding.modelVersion,
                embedding.pipelineVersion,
                embedding.dimensions,
                formatPgVector(embedding.values),
                embedding.contentSha256
              ]
            );
          }
        }

        const finalStatus = input.outcome.state.processingStatus;
        const updatedState = await client.query(
          `
            UPDATE app.document_version_states
            SET processing_status = $4,
                ocr_quality_score = $5,
                current_processing_job_id = NULL,
                updated_at = now()
            WHERE condominium_id = $1
              AND document_version_id = $2
              AND (
                current_processing_job_id = $3
                OR current_processing_job_id IS NULL
              )
          `,
          [
            input.condominiumId,
            input.documentVersionId,
            input.jobId,
            finalStatus,
            input.outcome.state.ocrQualityScore
          ]
        );
        if (updatedState.rowCount !== 1) {
          throw new Error("O job de processamento não é a versão ativa do documento.");
        }

        const completedJob = await client.query(
          `
            UPDATE app.processing_jobs
            SET status = $4,
                finished_at = now(),
                leased_at = NULL,
                lease_expires_at = NULL,
                error_code = $5,
                error_metadata = '{}'::jsonb,
                updated_at = now()
            WHERE condominium_id = $1
              AND document_version_id = $2
              AND id = $3
              AND status = 'processing'
              AND attempt_count = $6
          `,
          [
            input.condominiumId,
            input.documentVersionId,
            input.jobId,
            input.outcome.status === "failed" ? "failed" : "completed",
            input.outcome.status === "failed" ? "document_processing_failed" : null,
            input.attemptCount
          ]
        );
        if (completedJob.rowCount !== 1) {
          throw new Error("O job de processamento não está mais em execução.");
        }

        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export function createScopedPostgresDocumentProcessor(
  pool: PoolLike,
  storage: PrivateDocumentReader,
  ocrAdapter?: OcrAdapter
): Readonly<{
  process(
    input: Readonly<{
      condominiumId: CondominiumId;
      documentVersionId: string;
      jobId: string;
      attemptCount: number;
    }>
  ): Promise<void>;
}> {
  const processor = createScopedDocumentProcessor(
    createPostgresDocumentProcessingRepository(pool, storage),
    ocrAdapter
  );

  return Object.freeze({
    async process(input) {
      try {
        await processor.process(input);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message === "A versão documental do job não foi encontrada."
        ) {
          throw new Error("A versão documental do job não possui versão documental carregável.");
        }

        throw error;
      }
    }
  });
}
