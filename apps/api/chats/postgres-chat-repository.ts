import type { Pool, PoolClient } from "pg";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import {
  chatIdPattern,
  type ChatAttachment,
  type ChatRepository,
  type ChatSummary
} from "./chat-repository.js";

type Row = { id: string; title: string; created_at: string | Date };
const mapChat = (row: Row): ChatSummary => ({
  id: row.id,
  title: row.title,
  createdAt: new Date(row.created_at).toISOString()
});

export function createPostgresChatRepository(pool: Pick<Pool, "connect">): ChatRepository {
  async function query<T>(
    context: AuthorizedCondominiumContext,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!context.permissions.includes("document:read")) throw new Error("Acesso não autorizado.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE app_runtime");
      const identity = chatIdPattern.test(context.userId)
        ? undefined
        : await client.query<{ user_id: string }>("SELECT app.resolve_user_id($1) AS user_id", [
            context.userId
          ]);
      const userId = identity === undefined ? context.userId : identity.rows[0]?.user_id;
      if (userId === undefined || userId === null) throw new Error("Acesso não autorizado.");
      await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
      await client.query("SELECT set_config('app.condominium_id', $1, true)", [
        context.condominiumId
      ]);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return {
    list: (context, before) =>
      query(context, async (client) => {
        const result = await client.query<Row>(
          `SELECT id, title, created_at FROM app.chats
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND hidden_at IS NULL
        AND ($1::timestamptz IS NULL OR (created_at, id) < ($1::timestamptz, $2::uuid))
        ORDER BY created_at DESC, id DESC LIMIT 100`,
          [before?.createdAt ?? null, before?.id ?? null]
        );
        return result.rows.map(mapChat);
      }),
    find: (context, chatId) =>
      query(context, async (client) => {
        const result = await client.query<Row>(
          `SELECT id, title, created_at FROM app.chats
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND id = $1 AND hidden_at IS NULL`,
          [chatId]
        );
        return result.rows[0] === undefined ? undefined : mapChat(result.rows[0]);
      }),
    create: (context, input) =>
      query(context, async (client) => {
        await client.query(
          `INSERT INTO app.chats (condominium_id, owner_user_id, id, title)
        VALUES (app.current_condominium_id(), app.current_user_id(), $1, $2) ON CONFLICT DO NOTHING`,
          [input.id, input.title]
        );
        const result = await client.query<Row>(
          `SELECT id, title, created_at FROM app.chats
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND id = $1 AND hidden_at IS NULL`,
          [input.id]
        );
        return result.rows[0] === undefined ? undefined : mapChat(result.rows[0]);
      }),
    rename: (context, chatId, title) =>
      query(context, async (client) => {
        const result = await client.query(
          `UPDATE app.chats SET title = $2, updated_at = now()
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND id = $1 AND hidden_at IS NULL`,
          [chatId, title]
        );
        return result.rowCount === 1;
      }),
    hide: (context, chatId) =>
      query(context, async (client) => {
        const result = await client.query(
          `UPDATE app.chats SET hidden_at = now(), updated_at = now()
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND id = $1 AND hidden_at IS NULL`,
          [chatId]
        );
        return result.rowCount === 1;
      }),
    attachDocument: (context, chatId, attachment) =>
      query(context, async (client) => {
        const result = await client.query(
          `INSERT INTO app.chat_attachments (condominium_id, owner_user_id, chat_id, document_version_id, title, created_at)
        SELECT condominium_id, owner_user_id, id, $2, $3, $4 FROM app.chats
        WHERE condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id() AND id = $1 AND hidden_at IS NULL
        ON CONFLICT DO NOTHING`,
          [chatId, attachment.documentVersionId, attachment.title, attachment.createdAt]
        );
        if (result.rowCount !== 1) throw new Error("Não foi possível vincular o anexo à conversa.");
      }),
    listAttachments: (context, chatId) =>
      query(context, async (client) => {
        const result = await client.query<{
          document_version_id: string;
          title: string;
          created_at: Date;
        }>(
          `SELECT attachment.document_version_id, attachment.title, attachment.created_at
        FROM app.chat_attachments AS attachment JOIN app.chats AS chat
          ON chat.condominium_id = attachment.condominium_id AND chat.owner_user_id = attachment.owner_user_id AND chat.id = attachment.chat_id
        WHERE chat.condominium_id = app.current_condominium_id() AND chat.owner_user_id = app.current_user_id() AND chat.id = $1 AND chat.hidden_at IS NULL
        ORDER BY attachment.created_at, attachment.document_version_id`,
          [chatId]
        );
        return result.rows.map((row): ChatAttachment => ({
          documentVersionId: row.document_version_id,
          title: row.title,
          createdAt: new Date(row.created_at).toISOString()
        }));
      })
  };
}
