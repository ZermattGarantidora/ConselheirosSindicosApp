import type { Pool, PoolClient } from "pg";
import type { DocumentPurgeDecision } from "./synthetic-document-recovery-journal.js";

type PoolLike = Pick<Pool, "connect">;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}

export function createPostgresDocumentRetentionRepository(
  pool: PoolLike,
  beforePurge?: (decision: DocumentPurgeDecision) => Promise<void>
) {
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

        const prepared: typeof expiredDocuments.rows = [];
        for (const document of expiredDocuments.rows) {
          if (beforePurge) {
            await client.query("SELECT set_config('app.condominium_id', $1, true)", [
              document.condominium_id
            ]);
            // Recheck and lock before persisting a decision outside this transaction.
            const eligible = await client.query<{ archived_at: Date }>(
              `SELECT archived_at FROM app.documents WHERE condominium_id=$1 AND id=$2
               AND status='archived' AND archived_at <= clock_timestamp() - interval '30 days'
               FOR UPDATE`,
              [document.condominium_id, document.document_id]
            );
            if (!eligible.rows[0]) continue;
            const versions = await client.query<{ id: string }>(
              "SELECT id FROM app.document_versions WHERE condominium_id=$1 AND document_id=$2 ORDER BY id",
              [document.condominium_id, document.document_id]
            );
            await beforePurge({
              condominiumId: document.condominium_id,
              documentId: document.document_id,
              documentVersionIds: versions.rows.map((row) => row.id),
              archivedAt: eligible.rows[0].archived_at.toISOString()
            });
          }
          prepared.push(document);
        }
        // Finish every external journal/ledger operation BEFORE a purge trigger acquires
        // hosted_call_control in this transaction. Otherwise the next external pool deadlocks.
        let purgedCount = 0;
        for (const document of prepared) {
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
