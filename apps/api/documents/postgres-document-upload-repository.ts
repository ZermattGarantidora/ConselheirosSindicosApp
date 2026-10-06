import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type {
  ArchivedDocument,
  DocumentCatalogRepository,
  RegisteredDocument
} from "./document-catalog.js";
import type { DocumentUploadRepository, UploadedDocumentRecord } from "./upload-document.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";

type PoolLike = Pick<Pool, "connect">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function setRuntimeContext(
  client: PoolClient,
  input: Readonly<{ condominiumId: string; userId: string }>
): Promise<string> {
  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId = input.userId;
  if (!uuidPattern.test(input.userId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [input.userId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade do upload não está cadastrada como usuário ativo.");
  }
  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [input.condominiumId]);
  return databaseUserId;
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

type DocumentCatalogRow = Readonly<{
  condominium_id: string;
  document_id: string;
  document_version_id: string;
  title: string;
  document_type: RegisteredDocument["documentType"];
  version_number: number | string;
  size_bytes: number | string;
  processing_status: RegisteredDocument["processingStatus"];
  validity_status: RegisteredDocument["validityStatus"];
  created_at: Date | string;
  expected_page_count: number | string | null;
  processed_page_count: number | string | null;
  searchable_page_count: number | string | null;
  unreadable_page_numbers: readonly number[] | null;
  extraction_completeness: number | string | null;
  extraction_method: "pdf_text" | "ocr" | null;
  ocr_quality_score: number | string | null;
  storage_object_id: string;
  uploaded_by_current_user: boolean;
}>;

export function createPostgresDocumentUploadRepository(
  pool: PoolLike
): DocumentUploadRepository & DocumentCatalogRepository {
  return {
    async recordUploaded(record: UploadedDocumentRecord): Promise<void> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, {
          condominiumId: record.condominiumId,
          userId: record.uploadedByUserId
        });

        await client.query(
          `
            INSERT INTO app.storage_objects (
              condominium_id, id, object_kind, storage_key, content_sha256,
              size_bytes, media_type, created_by_user_id
            )
            VALUES ($1, $2, 'document_original', $3, $4, $5, 'application/pdf', $6)
          `,
          [
            record.condominiumId,
            record.storageObjectId,
            record.storageKey,
            record.contentSha256,
            record.sizeBytes,
            databaseUserId
          ]
        );

        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2, 0))", [
          record.condominiumId,
          record.documentId
        ]);
        const existingDocument = await client.query<{ status: "active" | "archived" }>(
          `
            SELECT status
            FROM app.documents
            WHERE condominium_id = $1 AND id = $2
          `,
          [record.condominiumId, record.documentId]
        );

        let versionNumber = 1;
        if (existingDocument.rows[0] === undefined) {
          await client.query(
            `
              INSERT INTO app.documents (
                condominium_id, id, title, document_type, status, created_by_user_id
              )
              VALUES ($1, $2, $3, $4, 'active', $5)
            `,
            [
              record.condominiumId,
              record.documentId,
              record.title,
              record.documentType,
              databaseUserId
            ]
          );
        } else {
          if (existingDocument.rows[0]?.status !== "active") {
            throw new Error("Não é possível adicionar versão a um documento arquivado.");
          }

          const nextVersion = await client.query<{ version_number: number | string }>(
            `
              SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
              FROM app.document_versions
              WHERE condominium_id = $1 AND document_id = $2
            `,
            [record.condominiumId, record.documentId]
          );
          versionNumber = Number(nextVersion.rows[0]?.version_number ?? 0);
          if (!Number.isInteger(versionNumber) || versionNumber < 2) {
            throw new Error("Não foi possível calcular a próxima versão documental.");
          }
        }

        await client.query(
          `
            INSERT INTO app.document_versions (
              condominium_id, id, document_id, version_number, storage_object_id,
              content_sha256, media_type, size_bytes, source_kind, uploaded_by_user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', $7, 'user_upload', $8)
          `,
          [
            record.condominiumId,
            record.documentVersionId,
            record.documentId,
            versionNumber,
            record.storageObjectId,
            record.contentSha256,
            record.sizeBytes,
            databaseUserId
          ]
        );

        await client.query(
          `
            INSERT INTO app.document_version_states (
              condominium_id, document_version_id, processing_status, validity_status
            )
            VALUES ($1, $2, 'uploaded', $3)
          `,
          [record.condominiumId, record.documentVersionId, record.validityStatus]
        );

        const jobId = randomUUID();
        await client.query(
          `
            INSERT INTO app.processing_jobs (
              condominium_id, id, document_version_id, job_type, status,
              attempt_count, max_attempts, idempotency_key
            )
            VALUES ($1, $2, $3, 'extract_text', 'queued', 0, 3, $4)
          `,
          [
            record.condominiumId,
            jobId,
            record.documentVersionId,
            `${record.documentVersionId}:extract_text`
          ]
        );

        await client.query(
          `
            UPDATE app.document_version_states
            SET current_processing_job_id = $3, updated_at = now()
            WHERE condominium_id = $1 AND document_version_id = $2
          `,
          [record.condominiumId, record.documentVersionId, jobId]
        );

        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async listAuthorized(
      context: AuthorizedCondominiumContext
    ): Promise<readonly RegisteredDocument[]> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, {
          condominiumId: context.condominiumId,
          userId: context.userId
        });
        const result = await client.query<DocumentCatalogRow>(
          `
            SELECT
              documents.condominium_id,
              documents.id AS document_id,
              latest_version.id AS document_version_id,
              documents.title,
              documents.document_type,
              latest_version.version_number,
              latest_version.size_bytes,
              latest_version.storage_object_id,
              version_state.processing_status,
              version_state.validity_status,
              version_state.expected_page_count,
              version_state.processed_page_count,
              version_state.searchable_page_count,
              version_state.unreadable_page_numbers,
              version_state.extraction_completeness,
              version_state.extraction_method,
              version_state.ocr_quality_score,
              latest_version.created_at
            FROM app.documents AS documents
            JOIN LATERAL (
              SELECT id, version_number, size_bytes, created_at, storage_object_id,
                uploaded_by_user_id = app.current_user_id() AS uploaded_by_current_user
              FROM app.document_versions
              WHERE condominium_id = documents.condominium_id
                AND document_id = documents.id
              ORDER BY version_number DESC
              LIMIT 1
            ) AS latest_version ON true
            JOIN app.document_version_states AS version_state
              ON version_state.condominium_id = documents.condominium_id
             AND version_state.document_version_id = latest_version.id
            WHERE documents.condominium_id = $1
              AND documents.status = 'active'
            ORDER BY latest_version.created_at DESC, documents.title ASC
          `,
          [context.condominiumId]
        );
        await client.query("COMMIT");

        return Object.freeze(
          result.rows.map((row) =>
            Object.freeze({
              condominiumId: context.condominiumId,
              documentId: row.document_id,
              documentVersionId: row.document_version_id,
              title: row.title,
              documentType: row.document_type,
              versionNumber: Number(row.version_number),
              sizeBytes: Number(row.size_bytes),
              processingStatus: row.processing_status,
              validityStatus: row.validity_status,
              createdAt: new Date(row.created_at).toISOString(),
              expectedPageCount:
                row.expected_page_count == null ? null : Number(row.expected_page_count),
              processedPageCount:
                row.processed_page_count == null ? null : Number(row.processed_page_count),
              searchablePageCount:
                row.searchable_page_count == null ? null : Number(row.searchable_page_count),
              unreadablePageNumbers: Object.freeze(row.unreadable_page_numbers ?? []),
              extractionCompleteness:
                row.extraction_completeness == null ? null : Number(row.extraction_completeness),
              extractionMethod: row.extraction_method ?? null,
              ocrQualityScore: row.ocr_quality_score == null ? null : Number(row.ocr_quality_score),
              storageObjectId: row.storage_object_id,
              uploadedByCurrentUser: row.uploaded_by_current_user
            })
          )
        );
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async archiveAuthorized(context, documentId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, {
          condominiumId: context.condominiumId,
          userId: context.userId
        });
        const result = await client.query(
          `UPDATE app.documents AS documents
           SET status = 'archived', archived_at = now(), updated_at = now()
           WHERE documents.condominium_id = $1
             AND documents.id = $2
             AND documents.status = 'active'`,
          [context.condominiumId, documentId]
        );
        await client.query("COMMIT");
        return result.rowCount === 1;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async listArchivedAuthorized(context): Promise<readonly ArchivedDocument[]> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, {
          condominiumId: context.condominiumId,
          userId: context.userId
        });
        const result = await client.query<{
          document_id: string;
          title: string;
          archived_at: Date | string;
        }>(
          `SELECT documents.id AS document_id, documents.title, documents.archived_at
           FROM app.documents AS documents
           WHERE documents.condominium_id = $1
             AND documents.status = 'archived'
             AND EXISTS (
               SELECT 1
               FROM app.document_versions AS versions
               JOIN app.document_original_contents AS contents
                 ON contents.condominium_id = versions.condominium_id
                AND contents.storage_object_id = versions.storage_object_id
               WHERE versions.condominium_id = documents.condominium_id
                 AND versions.document_id = documents.id
             )
           ORDER BY archived_at DESC`,
          [context.condominiumId]
        );
        await client.query("COMMIT");
        return Object.freeze(
          result.rows.map((row) =>
            Object.freeze({
              condominiumId: context.condominiumId,
              documentId: row.document_id,
              title: row.title,
              archivedAt: new Date(row.archived_at).toISOString()
            })
          )
        );
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async restoreAuthorized(context, documentId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, {
          condominiumId: context.condominiumId,
          userId: context.userId
        });
        const result = await client.query(
          `UPDATE app.documents AS documents
           SET status = 'active', archived_at = NULL, updated_at = now()
           WHERE documents.condominium_id = $1
             AND documents.id = $2
             AND documents.status = 'archived'
             AND EXISTS (
               SELECT 1
               FROM app.document_versions AS versions
               JOIN app.document_original_contents AS contents
                 ON contents.condominium_id = versions.condominium_id
                AND contents.storage_object_id = versions.storage_object_id
               WHERE versions.condominium_id = documents.condominium_id
                 AND versions.document_id = documents.id
             )`,
          [context.condominiumId, documentId]
        );
        await client.query("COMMIT");
        return result.rowCount === 1;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
