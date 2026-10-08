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
    async purgeExpiredDocuments(): Promise<number> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_worker");
        const expiredDocuments = await client.query<{
          condominium_id: string;
          document_id: string;
        }>(
          `SELECT condominium_id, id AS document_id
           FROM app.documents
           WHERE status = 'archived'
             AND archived_at <= now() - interval '30 days'
           ORDER BY archived_at, condominium_id, id
           LIMIT 100`
        );

        let purgedCount = 0;
        for (const document of expiredDocuments.rows) {
          await client.query("SELECT set_config('app.condominium_id', $1, true)", [
            document.condominium_id
          ]);
          const result = await client.query<{ purged: boolean }>(
            "SELECT app.purge_expired_document_data($1, $2) AS purged",
            [document.condominium_id, document.document_id]
          );
          if (result.rows[0]?.purged === true) purgedCount += 1;
        }

        await client.query("SELECT app.purge_expired_document_purge_receipts()");
        await client.query("COMMIT");
        return purgedCount;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
