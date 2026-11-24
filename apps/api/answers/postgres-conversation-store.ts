import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { chatIdPattern } from "../chats/chat-repository.js";
import type { UserId } from "../identity/authorized-condominium-context.js";
import {
  ConversationStoreError,
  cursorFor,
  parseConversationCursor,
  scopeKey,
  validateConversationWrite,
  type ConversationEntry,
  type ConversationScope,
  type ConversationStore
} from "./conversation-store.js";

type EntryRow = {
  id: string;
  sequence: string | number;
  created_at: Date;
  request_key: string;
  input_hash: string;
  messages: ConversationEntry["messages"];
  response: ConversationEntry["response"];
  metadata: ConversationEntry["metadata"];
};
/** O schema alternativo é restrito a ensaios de restauração, nunca vem de HTTP. */
export function createPostgresConversationStore(
  pool: Pick<Pool, "connect">,
  schema = "app"
): ConversationStore {
  if (schema !== "app" && !/^history_restore_[a-f0-9]{32}$/u.test(schema))
    throw new Error("Destino de histórico inválido.");
  const entries = `"${schema}".conversation_entries`,
    sessions = `"${schema}".conversation_setup_sessions`;
  async function transaction<T>(
    userId: UserId,
    condominiumId: string | undefined,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE app_runtime");
      const resolved = chatIdPattern.test(userId)
        ? userId
        : (
            await client.query<{ user_id: string | null }>(
              "SELECT app.resolve_user_id($1) AS user_id",
              [userId]
            )
          ).rows[0]?.user_id;
      if (!resolved) throw new ConversationStoreError(404);
      await client.query(
        "SELECT set_config('app.user_id', $1, true), set_config('app.condominium_id', $2, true)",
        [resolved, condominiumId ?? ""]
      );
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* Não expor erro de conexão ou conteúdo. */
      }
      if (error instanceof ConversationStoreError) throw error;
      throw new ConversationStoreError(503);
    } finally {
      client.release();
    }
  }
  async function checkScope(
    client: PoolClient,
    scope: ConversationScope,
    lockSetup = false
  ): Promise<void> {
    const result =
      scope.kind === "setup"
        ? await client.query(
            `SELECT id FROM ${sessions} WHERE id=$1 AND owner_user_id=app.current_user_id() AND condominium_id IS NULL${lockSetup ? " FOR UPDATE" : ""}`,
            [scope.setupSessionId]
          )
        : await client.query(
            "SELECT id FROM app.chats WHERE condominium_id=app.current_condominium_id() AND owner_user_id=app.current_user_id() AND id=$1 AND hidden_at IS NULL",
            [scope.chatId]
          );
    if (result.rowCount !== 1) throw new ConversationStoreError(404);
  }
  function map(row: EntryRow, scope: ConversationScope): ConversationEntry {
    const sequence = Number(row.sequence);
    if (!Number.isSafeInteger(sequence) || sequence < 1) throw new ConversationStoreError(503);
    return {
      id: row.id,
      scope,
      sequence,
      createdAt: new Date(row.created_at).toISOString(),
      requestKey: row.request_key,
      inputHash: row.input_hash,
      messages: row.messages,
      response: row.response,
      metadata: row.metadata
    };
  }
  return {
    durable: true,
    beginSetup: (userId) =>
      transaction(userId, undefined, async (client) => {
        await client.query(
          `INSERT INTO ${sessions} (id,owner_user_id) VALUES ($1,app.current_user_id()) ON CONFLICT (owner_user_id) WHERE condominium_id IS NULL DO NOTHING`,
          [randomUUID()]
        );
        const result = await client.query<{ id: string }>(
          `SELECT id FROM ${sessions} WHERE owner_user_id=app.current_user_id() AND condominium_id IS NULL`
        );
        if (!result.rows[0]) throw new ConversationStoreError(503);
        return result.rows[0].id;
      }),
    pendingSetup: (userId) =>
      transaction(
        userId,
        undefined,
        async (client) =>
          (
            await client.query<{ id: string }>(
              `SELECT id FROM ${sessions} WHERE owner_user_id=app.current_user_id() AND condominium_id IS NULL`
            )
          ).rows[0]?.id
      ),
    bindSetup: (userId, sessionId, target) =>
      transaction(userId, target.condominiumId, async (client) => {
        if (target.userId !== userId) throw new ConversationStoreError(404);
        await checkScope(client, target);
        const result = await client.query<{
          condominium_id: string | null;
          chat_id: string | null;
        }>(
          `SELECT condominium_id,chat_id FROM ${sessions} WHERE id=$1 AND owner_user_id=app.current_user_id() FOR UPDATE`,
          [sessionId]
        );
        const session = result.rows[0];
        if (!session) throw new ConversationStoreError(404);
        if (session.condominium_id !== null) {
          if (session.condominium_id !== target.condominiumId || session.chat_id !== target.chatId)
            throw new ConversationStoreError(409);
          return;
        }
        // Atualizar primeiro as entradas: elas ainda precisam da sessão não associada na política USING.
        await client.query(
          `UPDATE ${entries} SET condominium_id=app.current_condominium_id(),chat_id=$2,scope_key=$3 WHERE setup_session_id=$1 AND owner_user_id=app.current_user_id() AND condominium_id IS NULL`,
          [sessionId, target.chatId, scopeKey(target)]
        );
        await client.query(
          `UPDATE ${sessions} SET condominium_id=app.current_condominium_id(),chat_id=$2 WHERE id=$1 AND owner_user_id=app.current_user_id()`,
          [sessionId, target.chatId]
        );
      }),
    find: (scope, key) =>
      transaction(
        scope.userId,
        scope.kind === "chat" ? scope.condominiumId : undefined,
        async (client) => {
          await checkScope(client, scope);
          const result = await client.query<EntryRow>(
            `SELECT * FROM ${entries} WHERE owner_user_id=app.current_user_id() AND scope_key=$1 AND request_key=$2`,
            [scopeKey(scope), key]
          );
          return result.rows[0] ? map(result.rows[0], scope) : undefined;
        }
      ),
    append: (scope, entry) =>
      transaction(
        scope.userId,
        scope.kind === "chat" ? scope.condominiumId : undefined,
        async (client) => {
          validateConversationWrite(entry);
          await checkScope(client, scope, true);
          await client.query(
            `INSERT INTO ${entries} (id,owner_user_id,condominium_id,chat_id,setup_session_id,scope_key,request_key,input_hash,created_at,messages,response,metadata) VALUES ($1,app.current_user_id(),$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb) ON CONFLICT (owner_user_id,scope_key,request_key) DO NOTHING`,
            [
              entry.id,
              scope.kind === "chat" ? scope.condominiumId : null,
              scope.kind === "chat" ? scope.chatId : null,
              scope.kind === "setup" ? scope.setupSessionId : null,
              scopeKey(scope),
              entry.requestKey,
              entry.inputHash,
              entry.createdAt,
              JSON.stringify(entry.messages),
              JSON.stringify(entry.response),
              JSON.stringify(entry.metadata)
            ]
          );
          const result = await client.query<EntryRow>(
            `SELECT * FROM ${entries} WHERE owner_user_id=app.current_user_id() AND scope_key=$1 AND request_key=$2`,
            [scopeKey(scope), entry.requestKey]
          );
          const row = result.rows[0];
          if (!row) throw new ConversationStoreError(503);
          if (row.input_hash !== entry.inputHash)
            throw new ConversationStoreError(409, "A chave já foi usada para outra mensagem.");
          return map(row, scope);
        }
      ),
    list: (scope, limit = 50, cursor) =>
      transaction(
        scope.userId,
        scope.kind === "chat" ? scope.condominiumId : undefined,
        async (client) => {
          await checkScope(client, scope);
          const before = parseConversationCursor(scope, cursor);
          if (!Number.isInteger(limit) || limit < 1 || limit > 100)
            throw new ConversationStoreError(400);
          const result = await client.query<EntryRow>(
            `SELECT * FROM ${entries} WHERE owner_user_id=app.current_user_id() AND scope_key=$1 AND ($2::timestamptz IS NULL OR (created_at,sequence)<($2::timestamptz,$3::bigint)) ORDER BY created_at DESC,sequence DESC LIMIT $4`,
            [scopeKey(scope), before?.time ?? null, before?.sequence ?? null, limit + 1]
          );
          const rows = result.rows.slice(0, limit).map((row) => map(row, scope));
          return {
            entries: rows.toReversed(),
            nextCursor: result.rows.length > limit ? cursorFor(scope, rows.at(-1)!) : null
          };
        }
      )
  };
}
