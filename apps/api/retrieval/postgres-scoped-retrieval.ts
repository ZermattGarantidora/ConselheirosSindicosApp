import type { Pool, PoolClient } from "pg";

import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { createLocalSyntheticEmbeddingAdapter } from "./local-embedding.js";
import { formatPgVector } from "./local-embedding.js";
import {
  type EmbeddingAdapter,
  type RetrievableChunk,
  type ScopedRetrievalIndex
} from "./retrieval-contract.js";

type PoolLike = Pick<Pool, "connect">;

type RetrievalRow = Readonly<{
  chunk_id: string;
  condominium_id: string;
  document_id: string;
  document_version_id: string;
  version_number: number | string;
  document_title: string;
  document_type: RetrievableChunk["documentType"];
  source_kind: RetrievableChunk["sourceKind"];
  page_id: string;
  page_number: number | string;
  start_offset: number | string;
  end_offset: number | string;
  content: string;
  content_sha256: string;
  semantic_score: number | string | null;
  extraction_method: "pdf_text" | "ocr";
  quality_score: number | string;
  processing_status: "ready" | "needs_review";
  validity_status: RetrievableChunk["validityStatus"];
  valid_from: Date | null;
  valid_until: Date | null;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

async function setRuntimeContext(
  client: PoolClient,
  context: AuthorizedCondominiumContext
): Promise<void> {
  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId: string = context.userId;
  if (!uuidPattern.test(databaseUserId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [context.userId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade da busca não está cadastrada como usuário ativo.");
  }

  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [context.condominiumId]);
}

function mapRow(row: RetrievalRow): RetrievableChunk {
  return Object.freeze({
    id: row.chunk_id,
    condominiumId: row.condominium_id as RetrievableChunk["condominiumId"],
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    documentVersionNumber: Number(row.version_number),
    documentTitle: row.document_title,
    documentType: row.document_type,
    sourceKind: row.source_kind,
    pageId: row.page_id,
    pageNumber: Number(row.page_number),
    startOffset: Number(row.start_offset),
    endOffset: Number(row.end_offset),
    content: row.content,
    contentSha256: row.content_sha256,
    semanticScore: row.semantic_score === null ? null : Number(row.semantic_score),
    extractionMethod: row.extraction_method,
    qualityScore: Number(row.quality_score),
    processingStatus: row.processing_status,
    validityStatus: row.validity_status,
    validFrom: row.valid_from === null ? null : new Date(row.valid_from),
    validUntil: row.valid_until === null ? null : new Date(row.valid_until)
  });
}

export function createPostgresScopedRetrievalIndex(
  pool: PoolLike,
  embeddingAdapter: EmbeddingAdapter = createLocalSyntheticEmbeddingAdapter()
): ScopedRetrievalIndex {
  return {
    async findAuthorizedCandidates(context, input): Promise<readonly RetrievableChunk[]> {
      if (!context.permissions.includes("document:read")) {
        return Object.freeze([]);
      }
      if (input.query.trim().length === 0) {
        throw new Error("A consulta de retrieval não pode ser vazia.");
      }

      const queryEmbedding = await embeddingAdapter.embed({
        content: input.query,
        contentSha256: "0".repeat(64)
      });
      if (
        queryEmbedding.dimensions !== embeddingAdapter.profile.dimensions ||
        queryEmbedding.values.length !== embeddingAdapter.profile.dimensions
      ) {
        throw new Error("O embedding da consulta não corresponde ao perfil configurado.");
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, context);
        const result = await client.query<RetrievalRow>(
          `
            WITH authorized_chunks AS (
              SELECT
                dc.id AS chunk_id,
                dc.condominium_id,
                dc.document_version_id,
                dc.document_page_id AS page_id,
                dc.start_offset,
                dc.end_offset,
                dc.content,
                dp.page_number,
                dp.extraction_method,
                dp.quality_score,
                d.id AS document_id,
                d.title AS document_title,
                d.document_type,
                dv.source_kind,
                dv.version_number,
                dvs.processing_status,
                dvs.validity_status,
                dvs.valid_from,
                dvs.valid_until,
                dc.search_vector,
                CASE
                  WHEN dce.embedding IS NULL THEN NULL
                  ELSE 1 - (dce.embedding <=> $5::vector)
                END AS semantic_score
              FROM app.document_chunks AS dc
              JOIN app.document_pages AS dp
                ON dp.condominium_id = dc.condominium_id
                AND dp.id = dc.document_page_id
                AND dp.document_version_id = dc.document_version_id
              JOIN app.document_versions AS dv
                ON dv.condominium_id = dc.condominium_id
                AND dv.id = dc.document_version_id
              JOIN app.documents AS d
                ON d.condominium_id = dv.condominium_id
                AND d.id = dv.document_id
              JOIN app.document_version_states AS dvs
                ON dvs.condominium_id = dv.condominium_id
                AND dvs.document_version_id = dv.id
              LEFT JOIN app.document_chunk_embeddings AS dce
                ON dce.condominium_id = dc.condominium_id
                AND dce.document_chunk_id = dc.id
                AND dce.embedding_profile = $6
                AND dce.content_sha256 = dc.content_sha256
              WHERE dc.condominium_id = app.current_condominium_id()
                AND dvs.processing_status = 'ready'
                AND dvs.validity_status IN ('confirmed', 'not_applicable')
                AND dp.quality_score >= $4
                AND (dvs.valid_from IS NULL OR dvs.valid_from <= $3::timestamptz)
                AND (dvs.valid_until IS NULL OR dvs.valid_until > $3::timestamptz)
                AND d.status = 'active'
            )
            SELECT
              chunk_id,
              condominium_id,
              document_id,
              document_version_id,
              version_number,
              document_title,
              document_type,
              source_kind,
              page_id,
              page_number,
              start_offset,
              end_offset,
              content,
              content_sha256,
              extraction_method,
              quality_score,
              processing_status,
              validity_status,
              valid_from,
              valid_until
            FROM authorized_chunks
            WHERE search_vector @@ plainto_tsquery('portuguese', $1)
              OR semantic_score IS NOT NULL
            ORDER BY ts_rank_cd(search_vector, plainto_tsquery('portuguese', $1)) DESC,
              semantic_score DESC NULLS LAST,
              version_number DESC,
              page_number ASC,
              chunk_id ASC
            LIMIT $2
          `,
          [
            input.query,
            input.limit,
            input.asOf.toISOString(),
            input.minimumQualityScore,
            formatPgVector(queryEmbedding.values),
            embeddingAdapter.profile.embeddingProfile
          ]
        );
        await client.query("COMMIT");
        return Object.freeze(result.rows.map(mapRow));
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
