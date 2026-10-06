import type { Pool, PoolClient } from "pg";

type PoolLike = Pick<Pool, "connect">;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}

export function createPostgresDocumentRetentionRepository(pool: PoolLike) {
  return {
    async purgeExpiredOriginals(): Promise<number> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_worker");
        const result = await client.query(
          `DELETE FROM app.document_original_contents AS contents
           USING app.document_versions AS versions
           JOIN app.documents AS documents
             ON documents.condominium_id = versions.condominium_id
            AND documents.id = versions.document_id
           WHERE contents.condominium_id = versions.condominium_id
             AND contents.storage_object_id = versions.storage_object_id
             AND documents.status = 'archived'
             AND documents.archived_at <= now() - interval '30 days'`
        );
        await client.query("COMMIT");
        return result.rowCount as number;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
