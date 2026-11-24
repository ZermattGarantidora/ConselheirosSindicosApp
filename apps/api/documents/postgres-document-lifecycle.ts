import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { HostedCallLedger } from "./hosted-call-ledger.js";
import {
  DocumentRecoveryError,
  recoveryDigest,
  type DocumentPurgeDecision,
  type DocumentRecoveryJournal
} from "./synthetic-document-recovery-journal.js";

type PoolLike = Pick<Pool, "connect">;
type ExportScope = { context: AuthorizedCondominiumContext; documentId: string; chatId: string };
export type DocumentExport = Readonly<{ payload: string; sha256: string; sizeBytes: number }>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
async function transaction<T>(
  pool: PoolLike,
  operation: (client: PoolClient) => Promise<T>,
  consistentRead = false
): Promise<T> {
  const client = await pool.connect();
  try {
    // Export reads one consistent snapshot. Purge uses current row locks and may invalidate
    // an independently connected ledger before the trigger locks that same control row.
    await client.query(consistentRead ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN");
    const value = await operation(client);
    await client.query("COMMIT");
    return value;
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* Preserve quarantine, no raw error. */
    }
    throw new DocumentRecoveryError();
  } finally {
    client.release();
  }
}

/** Internal export only. Authorization/recovery checks run again before delivering bytes. */
export function createPostgresDocumentExporter(options: {
  pool: PoolLike;
  authorize?: (scope: ExportScope) => Promise<boolean>;
  assertRecovered: (scope: { condominiumId: string; documentId: string }) => Promise<unknown>;
}) {
  return async (scope: ExportScope): Promise<DocumentExport> => {
    scope = structuredClone(scope);
    const { context, documentId, chatId } = scope;
    if (
      ![context.condominiumId, context.userId, documentId, chatId].every((id) => uuid.test(id)) ||
      !context.permissions.includes("document:read") ||
      !options.authorize ||
      !(await options.authorize(scope))
    )
      throw new DocumentRecoveryError();
    const checkedScope = { condominiumId: context.condominiumId, documentId };
    await options.assertRecovered(checkedScope);
    const payload = await transaction(
      options.pool,
      async (client) => {
        await client.query("SET LOCAL ROLE app_runtime");
        await client.query(
          "SELECT set_config('app.user_id',$1,true),set_config('app.condominium_id',$2,true)",
          [context.userId, context.condominiumId]
        );
        const chat = await client.query(
          "SELECT id FROM app.chats WHERE condominium_id=$1 AND id=$2 AND owner_user_id=$3 AND hidden_at IS NULL",
          [context.condominiumId, chatId, context.userId]
        );
        const document = await client.query(
          "SELECT id,title,document_type,status FROM app.documents WHERE condominium_id=$1 AND id=$2 AND status='active'",
          [context.condominiumId, documentId]
        );
        if (chat.rowCount !== 1 || document.rowCount !== 1) throw new DocumentRecoveryError();
        // Bound before loading originals/derivatives. No internal metadata or arbitrary row serialization.
        const size = await client.query<{ total: string; versions: string; originals: string }>(
          `SELECT COALESCE(sum(octet_length(c.content)),0)::text AS total,count(v.id)::text AS versions,count(c.storage_object_id)::text AS originals FROM app.document_versions v LEFT JOIN app.document_original_contents c ON c.condominium_id=v.condominium_id AND c.storage_object_id=v.storage_object_id WHERE v.condominium_id=$1 AND v.document_id=$2`,
          [context.condominiumId, documentId]
        );
        const sourceSize = size.rows[0];
        if (
          !sourceSize ||
          sourceSize.versions !== sourceSize.originals ||
          !Number.isSafeInteger(Number(sourceSize.total)) ||
          Number(sourceSize.total) < 0 ||
          Number(sourceSize.total) > 32 * 1024 * 1024
        )
          throw new DocumentRecoveryError();
        const versions = await client.query<{
          id: string;
          content_sha256: string;
          content: Buffer;
          [key: string]: unknown;
        }>(
          `SELECT v.id,v.version_number,v.content_sha256,v.media_type,v.size_bytes,c.content
         FROM app.document_versions v JOIN app.document_original_contents c ON c.condominium_id=v.condominium_id AND c.storage_object_id=v.storage_object_id
         WHERE v.condominium_id=$1 AND v.document_id=$2 ORDER BY v.version_number LIMIT 101`,
          [context.condominiumId, documentId]
        );
        if (!versions.rows.length || versions.rows.length > 100) throw new DocumentRecoveryError();
        const ids = versions.rows.map((row) => row.id);
        const derivatives = await client.query<{ total: string }>(
          `SELECT sum(bytes)::text AS total FROM (
        SELECT COALESCE(sum(octet_length(extracted_text)),0) AS bytes FROM app.document_pages WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])
        UNION ALL SELECT COALESCE(sum(octet_length(content)),0) FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])
        UNION ALL SELECT COALESCE(sum(octet_length(e.embedding::text)),0) FROM app.document_chunk_embeddings e JOIN app.document_chunks c ON c.condominium_id=e.condominium_id AND c.id=e.document_chunk_id WHERE c.condominium_id=$1 AND c.document_version_id=ANY($2::uuid[])
        UNION ALL SELECT COALESCE(sum(octet_length(messages::text)),0) FROM app.conversation_entries WHERE condominium_id=$1 AND chat_id=$3 AND owner_user_id=$4
      ) bounded`,
          [context.condominiumId, ids, chatId, context.userId]
        );
        if (
          !Number.isSafeInteger(Number(derivatives.rows[0]?.total)) ||
          Number(derivatives.rows[0]?.total) > 16 * 1024 * 1024
        )
          throw new DocumentRecoveryError();
        const pages = await client.query(
          `SELECT id,document_version_id,page_number,printed_label,extracted_text,extraction_method,content_sha256 FROM app.document_pages WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]) ORDER BY document_version_id,page_number LIMIT 10001`,
          [context.condominiumId, ids]
        );
        const chunks = await client.query(
          `SELECT id,document_version_id,document_page_id,start_offset,end_offset,content,content_sha256 FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]) ORDER BY document_version_id,chunk_index LIMIT 10001`,
          [context.condominiumId, ids]
        );
        const vectors = await client.query(
          `SELECT e.document_chunk_id,e.embedding_profile,e.dimensions,e.embedding::text FROM app.document_chunk_embeddings e JOIN app.document_chunks c ON c.condominium_id=e.condominium_id AND c.id=e.document_chunk_id WHERE c.condominium_id=$1 AND c.document_version_id=ANY($2::uuid[]) ORDER BY e.document_chunk_id,e.embedding_profile LIMIT 10001`,
          [context.condominiumId, ids]
        );
        const history = await client.query(
          `SELECT sequence,created_at,messages FROM app.conversation_entries WHERE condominium_id=$1 AND chat_id=$2 AND owner_user_id=$3 ORDER BY sequence LIMIT 10001`,
          [context.condominiumId, chatId, context.userId]
        );
        if ([pages, chunks, vectors, history].some((result) => result.rows.length > 10_000))
          throw new DocumentRecoveryError();
        const originals = versions.rows.map(({ content, ...version }) => {
          if (
            !Buffer.isBuffer(content) ||
            content.length !== Number(version.size_bytes) ||
            // The original checksum is over bytes, not the exported base64 representation.
            version.content_sha256 !== recoveryDigestBytes(content)
          )
            throw new DocumentRecoveryError();
          return { ...version, contentBase64: content.toString("base64") };
        });
        // Message envelope allowlist excludes response, metadata, request hashes and private traces.
        const conversations = history.rows.map((row) => ({
          sequence: row.sequence,
          createdAt: row.created_at,
          messages: (row.messages as Array<{ role: string; kind: string; text: string }>).map(
            (message) => ({ role: message.role, kind: message.kind, text: message.text })
          )
        }));
        return JSON.stringify({
          version: 1,
          condominiumId: context.condominiumId,
          document: document.rows[0],
          versions: originals,
          pages: pages.rows,
          chunks: chunks.rows,
          vectors: vectors.rows,
          history: conversations
        });
      },
      true
    );
    if (Buffer.byteLength(payload) > 64 * 1024 * 1024) throw new DocumentRecoveryError();
    await options.assertRecovered(checkedScope);
    if (!(await options.authorize(scope))) throw new DocumentRecoveryError();
    return { payload, sha256: recoveryDigest(payload), sizeBytes: Buffer.byteLength(payload) };
  };
}

const recoveryDigestBytes = (content: Buffer) => createHash("sha256").update(content).digest("hex");

/** Observer runs after the existing DB eligibility/row lock, before purge and ACK. */
export function createDocumentPurgeObserver(
  journal: DocumentRecoveryJournal,
  ledger: HostedCallLedger
) {
  return async (decision: DocumentPurgeDecision) => {
    await journal.recordPurge(decision);
    for (const version of decision.documentVersionIds)
      await ledger.invalidateDocumentVersion(decision.condominiumId, version);
  };
}

/** Only in a quarantined restore; trusted decisions reapply the original DB eligibility. */
export async function reapplyDocumentPurges(options: {
  pool: PoolLike;
  journal: DocumentRecoveryJournal;
  ledger: HostedCallLedger;
  authorizeQuarantine?: () => Promise<boolean>;
}): Promise<number> {
  if (!options.authorizeQuarantine || !(await options.authorizeQuarantine()))
    throw new DocumentRecoveryError();
  const snapshot = await options.journal.read();
  // No database purge/trigger lock is held while the separately connected ledger commits.
  // Pending external decisions keep the environment quarantined if the following DB work fails.
  for (const decision of snapshot.purges)
    for (const version of decision.documentVersionIds)
      await options.ledger.invalidateDocumentVersion(decision.condominiumId, version);
  return transaction(options.pool, async (client) => {
    await client.query("SET LOCAL ROLE app_worker");
    let purged = 0;
    for (const decision of snapshot.purges) {
      await client.query("SELECT set_config('app.condominium_id',$1,true)", [
        decision.condominiumId
      ]);
      // Version membership is checked before changing the restored archive timestamp.
      const extra = await client.query(
        "SELECT id FROM app.document_versions WHERE condominium_id=$1 AND document_id=$2 AND NOT(id=ANY($3::uuid[]))",
        [decision.condominiumId, decision.documentId, decision.documentVersionIds]
      );
      if (extra.rows.length) throw new DocumentRecoveryError();
      await client.query(
        "UPDATE app.documents SET status='archived',archived_at=$3::timestamptz WHERE condominium_id=$1 AND id=$2",
        [decision.condominiumId, decision.documentId, decision.archivedAt]
      );
      const result = await client.query<{ purged: boolean }>(
        "SELECT app.purge_expired_document_data($1,$2) AS purged",
        [decision.condominiumId, decision.documentId]
      );
      if (result.rows[0]?.purged) purged++;
      const remaining = await client.query(
        "SELECT id FROM app.documents WHERE condominium_id=$1 AND id=$2",
        [decision.condominiumId, decision.documentId]
      );
      if (remaining.rows.length) throw new DocumentRecoveryError();
    }
    return purged;
  });
}
