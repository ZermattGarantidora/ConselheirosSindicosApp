import type { Pool } from "pg";
import type { LegalCopyReader } from "./verified-legal-library.js";

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;

export function createPostgresLegalCopyReader(pool: Pick<Pool, "connect">): LegalCopyReader {
  return Object.freeze({
    async getAuthorizedCopy(context, input) {
      if (
        !context.permissions.includes("document:read") ||
        !uuidPattern.test(context.condominiumId) ||
        !uuidPattern.test(input.documentId) ||
        !uuidPattern.test(input.documentVersionId)
      )
        return undefined;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        let userId: string = context.userId;
        if (!uuidPattern.test(userId)) {
          const resolved = await client.query<{ user_id: string | null }>(
            "SELECT app.resolve_user_id($1) AS user_id",
            [userId]
          );
          userId = resolved.rows[0]?.user_id ?? "";
        }
        if (!uuidPattern.test(userId)) {
          await client.query("COMMIT");
          return undefined;
        }
        await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
        await client.query("SELECT set_config('app.condominium_id', $1, true)", [
          context.condominiumId
        ]);
        const result = await client.query<{ consultation_pdf: Buffer | null }>(
          `
          SELECT version.consultation_pdf
          FROM app.legal_source_versions AS version
          JOIN app.legal_sources AS source ON source.id = version.legal_source_id
          WHERE source.id = $1 AND version.id = $2 AND source.status = 'active'
        `,
          [input.documentId, input.documentVersionId]
        );
        await client.query("COMMIT");
        return result.rows[0]?.consultation_pdf ?? undefined;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* Preserva o erro original. */
        }
        throw error;
      } finally {
        client.release();
      }
    }
  });
}
