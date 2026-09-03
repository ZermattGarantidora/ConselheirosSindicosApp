import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type { DocumentUploadRepository, UploadedDocumentRecord } from "./upload-document.js";

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

export function createPostgresDocumentUploadRepository(pool: PoolLike): DocumentUploadRepository {
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
            VALUES ($1, $2, 'uploaded', 'pending')
          `,
          [record.condominiumId, record.documentVersionId]
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
    }
  };
}
