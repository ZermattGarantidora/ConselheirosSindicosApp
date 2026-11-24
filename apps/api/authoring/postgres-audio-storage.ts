import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { AudioInput } from "./audio-inputs.js";
import type {
  AudioScope,
  AudioRecoveryJournal,
  AudioRecoveryDecision
} from "./audio-recovery-journal.js";
import { DocumentDraftError } from "./document-drafts.js";

export interface DurableAudioStorage {
  readonly syntheticOnly: true;
  reserve(scope: AudioScope, id: string, commandHash: string, content: Buffer): Promise<void>;
  start(scope: AudioScope, id: string): Promise<void>;
  complete(scope: AudioScope, id: string, input: AudioInput): Promise<void>;
  read(scope: AudioScope, id: string): Promise<{ content: Buffer; input?: AudioInput }>;
  purge(scope: AudioScope, id: string): Promise<void>;
  export(scope: AudioScope, id: string): Promise<unknown>;
}
const fail = (status: number, message: string): never => {
  throw new DocumentDraftError(status, message);
};
const sha256 = (content: Buffer) => createHash("sha256").update(content).digest("hex");
type Row = {
  content: Buffer | null;
  transcript: AudioInput | null;
  original_sha256: string;
  command_hash: string;
  expires_at: Date;
  state: string;
};
/** Somente loopback, DB sintético dedicado e composição explícita. Não importado pelo startup. */
export function createSyntheticPostgresAudioStorage(options: {
  databaseUrl: string;
  confirmation: "synthetic-local-only";
  journal: AudioRecoveryJournal;
  retentionSeconds: number;
  maximumDailyInputs: number;
  maximumConcurrent: number;
  now: () => Date;
}) {
  const url = new URL(options.databaseUrl);
  if (
    options.confirmation !== "synthetic-local-only" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    Boolean(url.search || url.hash) ||
    !/^\/alvitra_ops_(source|restore)_[a-f0-9]{32}$/u.test(url.pathname) ||
    ![options.retentionSeconds, options.maximumDailyInputs, options.maximumConcurrent].every(
      (n) => Number.isSafeInteger(n) && n > 0
    ) ||
    options.retentionSeconds > 604800 ||
    options.maximumDailyInputs > 100 ||
    options.maximumConcurrent > 10
  )
    fail(503, "Composição sintética de áudio inválida.");
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  const values = (scope: AudioScope, id: string) => [
    scope.condominiumId,
    scope.userId,
    scope.chatId,
    id
  ];
  async function tx<T>(scope: AudioScope, action: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE app_runtime");
      await client.query(
        "SELECT set_config('app.user_id',$1,true),set_config('app.condominium_id',$2,true)",
        [scope.userId, scope.condominiumId]
      );
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof DocumentDraftError) throw error;
      return fail(503, "Não foi possível persistir ou recuperar o áudio.");
    } finally {
      client.release();
    }
  }
  const select = async (client: PoolClient, scope: AudioScope, id: string) =>
    (
      await client.query<Row>(
        "SELECT * FROM app.audio_originals WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4 FOR UPDATE",
        values(scope, id)
      )
    ).rows[0];
  const decisionOf = (
    kind: AudioRecoveryDecision["kind"],
    scope: AudioScope,
    id: string,
    row: Row
  ): AudioRecoveryDecision => ({
    kind,
    scope,
    id,
    sha256: row.original_sha256,
    commandHash: row.command_hash,
    expiresAt: row.expires_at.toISOString()
  });
  async function recovered(client: PoolClient, scope: AudioScope) {
    for (const d of await options.journal.read()) {
      if (
        d.scope.userId !== scope.userId ||
        d.scope.condominiumId !== scope.condominiumId ||
        d.scope.chatId !== scope.chatId
      )
        continue;
      const row = await select(client, scope, d.id);
      if (
        !row ||
        row.original_sha256 !== d.sha256 ||
        row.command_hash !== d.commandHash ||
        row.expires_at.toISOString() !== d.expiresAt ||
        (d.kind === "dispatch" && row.state === "reserved") ||
        (d.kind === "purge" && row.state !== "purged")
      )
        fail(503, "Restauração de áudio em quarentena. Reaplique as decisões externas ao backup.");
    }
  }
  async function available(client: PoolClient, scope: AudioScope, id: string) {
    await recovered(client, scope);
    const row = await select(client, scope, id);
    if (
      !row ||
      !row.content ||
      ["purged", "unknown"].includes(row.state) ||
      row.expires_at.getTime() <= options.now().getTime()
    )
      return fail(404, "Áudio indisponível, excluído ou com retenção encerrada.");
    if (sha256(row.content) !== row.original_sha256)
      return fail(409, "Original de áudio alterado.");
    return row;
  }
  async function scrub(client: PoolClient, scope: AudioScope, id: string) {
    // Remove payloads derivados; mensagens públicas pertencem ao histórico permanente.
    await client.query(
      `WITH related AS (SELECT DISTINCT response->'draft'->>'id' AS id FROM app.conversation_entries WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND response->'draft'->'audioSource'->>'inputId'=$4)
      UPDATE app.conversation_entries SET response='{"status":"purged"}'::jsonb,
        messages=CASE WHEN metadata->'internalAuthoring'='true'::jsonb THEN
          (SELECT jsonb_agg(jsonb_build_object('id',m->'id','role',m->'role','kind',m->'kind','text','Registro interno de artefato excluído.')) FROM jsonb_array_elements(messages) AS m)
          ELSE messages END
      WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND
        (metadata->>'audioInputId'=$4 OR metadata->>'documentDraftId' IN (SELECT id FROM related))`,
      values(scope, id)
    );
  }
  return {
    syntheticOnly: true as const,
    close: () => pool.end(),
    reserve: (scope: AudioScope, id: string, commandHash: string, content: Buffer) =>
      tx(scope, async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended('synthetic-audio:' || $1,0))",
          [scope.condominiumId]
        );
        await recovered(client, scope);
        if (await select(client, scope, id))
          fail(409, "Esta identidade de áudio já foi consumida.");
        const count = (
          await client.query<{ total: string; concurrent: string }>(
            "SELECT total,concurrent FROM app.audio_usage_counts($1::date)",
            [options.now().toISOString().slice(0, 10)]
          )
        ).rows[0]!;
        if (
          Number(count.total) >= options.maximumDailyInputs ||
          Number(count.concurrent) >= options.maximumConcurrent
        )
          fail(429, "Limite sintético de áudio atingido; nenhuma transcrição foi iniciada.");
        await client.query(
          "INSERT INTO app.audio_originals(condominium_id,owner_user_id,chat_id,id,content,original_sha256,command_hash,expires_at,state,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'reserved',$9)",
          [
            ...values(scope, id),
            content,
            sha256(content),
            commandHash,
            new Date(options.now().getTime() + options.retentionSeconds * 1000),
            options.now()
          ]
        );
      }),
    start: (scope: AudioScope, id: string) =>
      tx(scope, async (client) => {
        const row = await available(client, scope, id);
        if (row.state !== "reserved")
          fail(503, "Tentativa de transcrição já consumida; não repetir envio incerto.");
        await options.journal.record(decisionOf("dispatch", scope, id, row));
        await client.query(
          "UPDATE app.audio_originals SET state='started',execution_state='started' WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4",
          values(scope, id)
        );
      }),
    complete: (scope: AudioScope, id: string, input: AudioInput) =>
      tx(scope, async (client) => {
        const row = await available(client, scope, id);
        if (
          row.state !== "started" ||
          row.original_sha256 !== input.originalSha256 ||
          input.id !== id
        )
          fail(409, "Resultado incompatível com a tentativa de áudio.");
        await client.query(
          "UPDATE app.audio_originals SET state='completed',execution_state='completed',transcript=$5 WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4",
          [...values(scope, id), JSON.stringify(input)]
        );
      }),
    read: (scope: AudioScope, id: string) =>
      tx(scope, async (client) => {
        const row = await available(client, scope, id);
        return {
          content: Buffer.from(row.content!),
          ...(row.transcript ? { input: row.transcript } : {})
        };
      }),
    purge: (scope: AudioScope, id: string) =>
      tx(scope, async (client) => {
        const row = await select(client, scope, id);
        if (!row) return fail(404, "Áudio indisponível.");
        await options.journal.record(decisionOf("purge", scope, id, row));
        await scrub(client, scope, id);
        await client.query(
          "UPDATE app.audio_originals SET state='purged',content=NULL,transcript=NULL WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4",
          values(scope, id)
        );
      }),
    export: (scope: AudioScope, id: string) =>
      tx(scope, async (client) => {
        const row = await available(client, scope, id);
        const entries = (
          await client.query(
            `WITH related AS (SELECT DISTINCT response->'draft'->>'id' AS id FROM app.conversation_entries WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND response->'draft'->'audioSource'->>'inputId'=$4)
             SELECT id,created_at,request_key,input_hash,messages,response,metadata FROM app.conversation_entries
             WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND
               (metadata->>'audioInputId'=$4 OR metadata->>'documentDraftId' IN (SELECT id FROM related)) ORDER BY sequence`,
            values(scope, id)
          )
        ).rows;
        return { original: row.content!.toString("base64"), input: row.transcript, entries };
      }),
    async reconcile() {
      const decisions = await options.journal.read();
      for (const d of decisions.filter((d) => d.kind === "dispatch"))
        await tx(d.scope, async (client) => {
          const row = await select(client, d.scope, d.id);
          if (
            row &&
            (row.original_sha256 !== d.sha256 ||
              row.command_hash !== d.commandHash ||
              row.expires_at.toISOString() !== d.expiresAt)
          )
            fail(409, "Fingerprint de áudio divergente no restore.");
          if (!row)
            await client.query(
              "INSERT INTO app.audio_originals(condominium_id,owner_user_id,chat_id,id,original_sha256,command_hash,expires_at,state,execution_state) VALUES($1,$2,$3,$4,$5,$6,$7,'unknown','unknown')",
              [...values(d.scope, d.id), d.sha256, d.commandHash, d.expiresAt]
            );
          else if (row.state === "reserved")
            await client.query(
              "UPDATE app.audio_originals SET state='unknown',execution_state='unknown',content=NULL,transcript=NULL WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4",
              values(d.scope, d.id)
            );
        });
      for (const d of decisions.filter((d) => d.kind === "purge"))
        await tx(d.scope, async (client) => {
          await scrub(client, d.scope, d.id);
          await client.query(
            "UPDATE app.audio_originals SET state='purged',content=NULL,transcript=NULL WHERE condominium_id=$1 AND owner_user_id=$2 AND chat_id=$3 AND id=$4",
            values(d.scope, d.id)
          );
        });
    }
  };
}
