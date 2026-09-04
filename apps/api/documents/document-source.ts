import type { Pool, PoolClient } from "pg";

import type { CondominiumId } from "../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { RetrievableChunk } from "../retrieval/retrieval-contract.js";

export type DocumentSourcePage = Readonly<{
  documentId: string;
  documentVersionId: string;
  title: string;
  page: number;
  content: string;
}>;

export interface DocumentSourceReader {
  getAuthorizedPage(
    context: AuthorizedCondominiumContext,
    input: Readonly<{ documentId: string; documentVersionId: string; page: number }>
  ): Promise<DocumentSourcePage | undefined>;
}

export function createDevelopmentDocumentSourceReader(
  chunks: readonly RetrievableChunk[]
): DocumentSourceReader {
  return Object.freeze({
    async getAuthorizedPage(
      context: AuthorizedCondominiumContext,
      input: Readonly<{ documentId: string; documentVersionId: string; page: number }>
    ) {
      const chunk = chunks.find(
        (item) =>
          context.permissions.includes("document:read") &&
          item.condominiumId === context.condominiumId &&
          item.documentId === input.documentId &&
          item.documentVersionId === input.documentVersionId &&
          item.pageNumber === input.page
      );
      return chunk === undefined
        ? undefined
        : Object.freeze({
            documentId: chunk.documentId,
            documentVersionId: chunk.documentVersionId,
            title: chunk.documentTitle,
            page: chunk.pageNumber,
            content: chunk.content
          });
    }
  });
}

type PoolLike = Pick<Pool, "connect">;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserva o erro original de leitura.
  }
}

export function createPostgresDocumentSourceReader(pool: PoolLike): DocumentSourceReader {
  return Object.freeze({
    async getAuthorizedPage(
      context: AuthorizedCondominiumContext,
      input: Readonly<{ documentId: string; documentVersionId: string; page: number }>
    ) {
      if (
        !context.permissions.includes("document:read") ||
        !uuidPattern.test(context.condominiumId)
      ) {
        return undefined;
      }
      if (!uuidPattern.test(input.documentId) || !uuidPattern.test(input.documentVersionId)) {
        return undefined;
      }
      if (!Number.isInteger(input.page) || input.page < 1) {
        return undefined;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        let databaseUserId: string = context.userId;
        if (!uuidPattern.test(databaseUserId)) {
          const user = await client.query<{ user_id: string | null }>(
            "SELECT app.resolve_user_id($1) AS user_id",
            [context.userId]
          );
          databaseUserId = user.rows[0]?.user_id ?? "";
        }
        if (!uuidPattern.test(databaseUserId)) {
          await client.query("COMMIT");
          return undefined;
        }
        await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
        await client.query("SELECT set_config('app.condominium_id', $1, true)", [
          context.condominiumId
        ]);
        const result = await client.query<{
          document_id: string;
          document_version_id: string;
          title: string;
          page: number;
          content: string;
        }>(
          `
            SELECT d.id AS document_id, dv.id AS document_version_id, d.title,
              dp.page_number AS page, dp.extracted_text AS content
            FROM app.document_pages AS dp
            JOIN app.document_versions AS dv
              ON dv.condominium_id = dp.condominium_id AND dv.id = dp.document_version_id
            JOIN app.documents AS d
              ON d.condominium_id = dv.condominium_id AND d.id = dv.document_id
            WHERE dp.condominium_id = app.current_condominium_id()
              AND d.id = $1 AND dv.id = $2 AND dp.page_number = $3
              AND d.status = 'active'
            LIMIT 1
          `,
          [input.documentId, input.documentVersionId, input.page]
        );
        await client.query("COMMIT");
        const row = result.rows[0];
        return row === undefined
          ? undefined
          : Object.freeze({
              documentId: row.document_id,
              documentVersionId: row.document_version_id,
              title: row.title,
              page: Number(row.page),
              content: row.content
            });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  });
}

export function createDocumentSourceUrl(
  condominiumId: CondominiumId,
  input: Readonly<{ documentId: string; documentVersionId: string; page: number }>
): string {
  return `/v1/condominiums/${encodeURIComponent(condominiumId)}/documents/${encodeURIComponent(input.documentId)}/versions/${encodeURIComponent(input.documentVersionId)}/pages/${input.page}`;
}
