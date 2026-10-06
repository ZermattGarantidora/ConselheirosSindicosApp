import type { Pool, PoolClient } from "pg";

import type { CondominiumId } from "../core/condominium-scope.js";
import {
  createPrivateStorageKey,
  type PrivateDocumentReader,
  type PrivateDocumentStorage
} from "./private-document-storage.js";

type PoolLike = Pick<Pool, "connect">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class DocumentOriginalNotFoundError extends Error {
  public constructor() {
    super("O PDF original não está disponível no banco de dados.");
    this.name = "DocumentOriginalNotFoundError";
  }
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error.
  }
}

async function setRuntimeContext(
  client: PoolClient,
  input: Readonly<{ condominiumId: CondominiumId; userId: string }>
): Promise<string> {
  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId = input.userId;
  if (!uuidPattern.test(databaseUserId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [input.userId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade do documento não está cadastrada como usuário ativo.");
  }
  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [input.condominiumId]);
  return databaseUserId;
}

async function setWorkerContext(client: PoolClient, condominiumId: CondominiumId): Promise<void> {
  await client.query("SET LOCAL ROLE app_worker");
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [condominiumId]);
}

export function createPostgresPrivateDocumentStorage(
  pool: PoolLike
): PrivateDocumentStorage & PrivateDocumentReader {
  return {
    async storeOriginal({ condominiumId, objectId, content, uploadedByUserId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, {
          condominiumId,
          userId: uploadedByUserId
        });
        await client.query(
          `
            INSERT INTO app.document_original_contents (
              condominium_id, storage_object_id, content, created_by_user_id
            )
            VALUES ($1, $2, $3, $4)
          `,
          [condominiumId, objectId, content, databaseUserId]
        );
        await client.query("COMMIT");
        return Object.freeze({ storageKey: createPrivateStorageKey(condominiumId, objectId) });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async removeOriginal({ condominiumId, objectId, uploadedByUserId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { condominiumId, userId: uploadedByUserId });
        await client.query(
          `
            DELETE FROM app.document_original_contents
            WHERE condominium_id = $1 AND storage_object_id = $2
          `,
          [condominiumId, objectId]
        );
        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async readOriginal({ condominiumId, objectId, userId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (userId === undefined) {
          await setWorkerContext(client, condominiumId);
        } else {
          await setRuntimeContext(client, { condominiumId, userId });
        }
        const result = await client.query<{ content: Buffer }>(
          `
            SELECT contents.content
            FROM app.document_original_contents AS contents
            JOIN app.storage_objects AS objects
              ON objects.condominium_id = contents.condominium_id
             AND objects.id = contents.storage_object_id
            WHERE contents.condominium_id = $1
              AND contents.storage_object_id = $2
            LIMIT 1
          `,
          [condominiumId, objectId]
        );
        const content = result.rows[0]?.content;
        if (content === undefined) throw new DocumentOriginalNotFoundError();
        await client.query("COMMIT");
        return Buffer.from(content);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
