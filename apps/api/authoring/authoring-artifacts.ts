import { Pool, type PoolClient } from "pg";
import type { ConversationEntry, ConversationScope } from "../answers/conversation-store.js";
import { DocumentDraftError } from "./document-drafts.js";
export type AuthoringScope = Extract<ConversationScope, { kind: "chat" }>;
export interface AuthoringArtifactStore {
  list(scope: AuthoringScope): Promise<readonly ConversationEntry[]>;
  scrub(scope: AuthoringScope, ids: readonly string[]): Promise<void>;
}
const metadataKeys = [
  "documentDraftId",
  "documentAuthoringId",
  "minutesRequestId",
  "audioInputId"
] as const;
/** Retenção do artefato não é exclusão da conversa confirmada como salva. */
export function scrubAuthoringEntry(entry: ConversationEntry): ConversationEntry {
  return {
    ...entry,
    response: { status: "purged" },
    messages:
      entry.metadata.internalAuthoring === true
        ? entry.messages.map(({ id, role, kind }) => ({
            id,
            role,
            kind,
            text: "Registro interno de artefato excluído."
          }))
        : entry.messages,
    metadata: Object.fromEntries(
      Object.entries(entry.metadata).filter(([key]) =>
        [...metadataKeys, "internalAuthoring"].includes(key)
      )
    )
  };
}
export const matchesAuthoringRoot = (entry: ConversationEntry, id: string): boolean =>
  metadataKeys.some((k) => entry.metadata[k] === id);
/** Somente pai → filhos. Nunca segue audioSource/authoringSource de volta ao pai. */
export function authoringFamily(entries: readonly ConversationEntry[], root: string): string[] {
  const ids = new Set([root]);
  for (let pass = 0; pass < 100; pass++) {
    let changed = false;
    for (const entry of entries) {
      const draft = entry.response.draft as
        | {
            id?: string;
            audioSource?: { inputId?: string };
            authoringSource?: { proposalId?: string };
          }
        | undefined;
      if (
        ![...ids].some(
          (id) =>
            matchesAuthoringRoot(entry, id) ||
            draft?.audioSource?.inputId === id ||
            draft?.authoringSource?.proposalId === id
        )
      )
        continue;
      for (const child of [
        entry.metadata.documentDraftId,
        entry.metadata.documentAuthoringId,
        entry.metadata.minutesRequestId,
        draft?.id
      ]) {
        if (typeof child === "string" && !ids.has(child)) {
          ids.add(child);
          changed = true;
        }
      }
      if (ids.size > 100)
        throw new DocumentDraftError(503, "Família de derivados excede o limite de manutenção.");
    }
    if (!changed) return [...ids];
  }
  throw new DocumentDraftError(503, "Não foi possível delimitar os derivados.");
}
/** Fábrica exclusiva de ensaio: não aceita remoto, parâmetros de conexão ou banco de cliente. */
export function createSyntheticPostgresAuthoringArtifacts(options: {
  databaseUrl: string;
  confirmation: "synthetic-local-only";
}) {
  const url = new URL(options.databaseUrl);
  if (
    options.confirmation !== "synthetic-local-only" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.search ||
    url.hash ||
    !/^\/alvitra_ops_(source|restore)_[a-f0-9]{32}$/u.test(url.pathname)
  )
    throw new DocumentDraftError(503, "Composição sintética de derivados inválida.");
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  async function tx<T>(scope: AuthoringScope, action: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE app_runtime");
      await client.query(
        "SELECT set_config('app.user_id',$1,true),set_config('app.condominium_id',$2,true)",
        [scope.userId, scope.condominiumId]
      );
      const chat = await client.query(
        "SELECT id FROM app.chats WHERE condominium_id=$1 AND owner_user_id=$2 AND id=$3 AND hidden_at IS NULL",
        [scope.condominiumId, scope.userId, scope.chatId]
      );
      if (chat.rowCount !== 1) throw new DocumentDraftError(404, "Conversa indisponível.");
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof DocumentDraftError) throw error;
      throw new DocumentDraftError(503, "Derivados indisponíveis ou em quarentena.");
    } finally {
      client.release();
    }
  }
  return {
    close: () => pool.end(),
    list: (scope: AuthoringScope) =>
      tx(scope, async (client) => {
        const result = await client.query<{
          id: string;
          sequence: string;
          created_at: Date;
          request_key: string;
          input_hash: string;
          messages: ConversationEntry["messages"];
          response: ConversationEntry["response"];
          metadata: ConversationEntry["metadata"];
        }>(
          "SELECT id,sequence,created_at,request_key,input_hash,messages,response,metadata FROM app.conversation_entries WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 ORDER BY sequence LIMIT 10001",
          [scope.condominiumId, scope.userId, scope.chatId]
        );
        if (result.rows.length > 10000)
          throw new DocumentDraftError(503, "Histórico excede o lote seguro de manutenção.");
        return result.rows.map((row) => ({
          id: row.id,
          scope,
          sequence: Number(row.sequence),
          createdAt: row.created_at.toISOString(),
          requestKey: row.request_key,
          inputHash: row.input_hash,
          messages: row.messages,
          response: row.response,
          metadata: row.metadata
        }));
      }),
    scrub: (scope: AuthoringScope, ids: readonly string[]) =>
      tx(scope, async (client) => {
        if (!ids.length || ids.length > 100)
          throw new DocumentDraftError(400, "Lote de derivados inválido.");
        await client.query(
          `UPDATE app.conversation_entries SET response='{"status":"purged"}'::jsonb,
        messages=CASE WHEN metadata->'internalAuthoring'='true'::jsonb THEN
          (SELECT jsonb_agg(jsonb_build_object('id',m->'id','role',m->'role','kind',m->'kind','text','Registro interno de artefato excluído.')) FROM jsonb_array_elements(messages) AS m)
          ELSE messages END,
        metadata=jsonb_strip_nulls(jsonb_build_object('documentDraftId',metadata->'documentDraftId','documentAuthoringId',metadata->'documentAuthoringId','minutesRequestId',metadata->'minutesRequestId','audioInputId',metadata->'audioInputId','internalAuthoring',metadata->'internalAuthoring'))
        WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND
        (metadata->>'documentDraftId'=ANY($4::text[]) OR metadata->>'documentAuthoringId'=ANY($4::text[]) OR metadata->>'minutesRequestId'=ANY($4::text[]) OR metadata->>'audioInputId'=ANY($4::text[]))`,
          [scope.condominiumId, scope.userId, scope.chatId, ids]
        );
        await client.query(
          "UPDATE app.audio_originals SET state='purged',content=NULL,transcript=NULL WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id::text=ANY($4::text[])",
          [scope.condominiumId, scope.userId, scope.chatId, ids]
        );
      })
  } satisfies AuthoringArtifactStore & { close(): Promise<void> };
}
