import { createHash } from "node:crypto";
import { assertLocalIntegrationTarget } from "./local-integration-guard.js";
import type { Pool, PoolClient } from "pg";
import { assertSyntheticIntegrationTarget } from "./neon-integration-guard.js";
import { assertSyntheticIntegrationTarget as assertSupabaseIntegrationTarget } from "./supabase-integration-guard.js";
function checkTarget(client: PoolClient, provider: "neon" | "supabase" | "local") {
  return provider === "local"
    ? assertLocalIntegrationTarget(client, "rls")
    : provider === "neon"
      ? assertSyntheticIntegrationTarget(client)
      : assertSupabaseIntegrationTarget(client);
}

type Row = Record<string, unknown>;
type Snapshot = {
  version: 1;
  purpose: "synthetic-history-restore";
  sessions: Row[];
  entries: Row[];
};
export type HistoryBackup = { snapshot: Snapshot; sha256: string };
const checksum = (snapshot: Snapshot) =>
  createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
const schemaPattern = /^history_restore_[a-f0-9]{32}$/u;

/** Ensaio lógico do journal; exige fundação (contas/condomínios/chats) já restaurada. */
export async function backupSyntheticHistory(
  pool: Pool,
  provider: "neon" | "supabase" | "local" = "neon"
): Promise<HistoryBackup> {
  const client = await pool.connect();
  try {
    await checkTarget(client, provider);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const sessions = (
      await client.query<Row>("SELECT * FROM app.conversation_setup_sessions ORDER BY id")
    ).rows;
    const entries = (
      await client.query<Row>("SELECT * FROM app.conversation_entries ORDER BY sequence")
    ).rows;
    await client.query("COMMIT");
    // Normalizar datas igual à representação no arquivo, antes de calcular checksum.
    const snapshot = JSON.parse(
      JSON.stringify({ version: 1, purpose: "synthetic-history-restore", sessions, entries })
    ) as Snapshot;
    return { snapshot, sha256: checksum(snapshot) };
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("Não foi possível gerar o backup sintético do histórico.");
  } finally {
    client.release();
  }
}

export async function restoreSyntheticHistory(
  pool: Pool,
  backup: HistoryBackup,
  schema: string,
  provider: "neon" | "supabase" | "local" = "neon"
): Promise<void> {
  if (
    !schemaPattern.test(schema) ||
    backup?.snapshot?.version !== 1 ||
    backup.snapshot.purpose !== "synthetic-history-restore" ||
    !Array.isArray(backup.snapshot.entries) ||
    !Array.isArray(backup.snapshot.sessions) ||
    checksum(backup.snapshot) !== backup.sha256
  )
    throw new Error("Backup ou destino de restauração inválido.");
  const client = await pool.connect();
  try {
    await checkTarget(client, provider);
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`GRANT USAGE ON SCHEMA "${schema}" TO app_runtime`);
    for (const table of ["conversation_setup_sessions", "conversation_entries"] as const) {
      await client.query(`CREATE TABLE "${schema}".${table} (LIKE app.${table} INCLUDING ALL)`);
      const columns =
        table === "conversation_entries"
          ? [
              "id",
              "sequence",
              "owner_user_id",
              "condominium_id",
              "chat_id",
              "setup_session_id",
              "scope_key",
              "request_key",
              "input_hash",
              "created_at",
              "messages",
              "response",
              "metadata"
            ]
          : ["id", "owner_user_id", "condominium_id", "chat_id", "created_at"];
      for (const row of table === "conversation_entries"
        ? backup.snapshot.entries
        : backup.snapshot.sessions) {
        await client.query(
          `INSERT INTO "${schema}".${table} (${columns.join(",")}) ${table === "conversation_entries" ? "OVERRIDING SYSTEM VALUE" : ""} VALUES (${columns.map((_, index) => `$${index + 1}`).join(",")})`,
          columns.map((column) =>
            ["messages", "response", "metadata"].includes(column)
              ? JSON.stringify(row[column])
              : row[column]
          )
        );
      }
      await client.query(
        `ALTER TABLE "${schema}".${table} ADD FOREIGN KEY (owner_user_id) REFERENCES app.users(id), ADD FOREIGN KEY (condominium_id,owner_user_id,chat_id) REFERENCES app.chats(condominium_id,owner_user_id,id)`
      );
      const policies = (
        await client.query<{ policyname: string; qual: string; with_check: string }>(
          "SELECT policyname,qual,with_check FROM pg_policies WHERE schemaname='app' AND tablename=$1",
          [table]
        )
      ).rows;
      if (policies.length !== 1) throw new Error("Política de isolamento divergente.");
      const policy = policies[0]!;
      const expression = (value: string) =>
        value.replaceAll(
          "app.conversation_setup_sessions",
          `"${schema}".conversation_setup_sessions`
        );
      await client.query(
        `ALTER TABLE "${schema}".${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE "${schema}".${table} FORCE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE ON "${schema}".${table} TO app_runtime`
      );
      await client.query(
        `CREATE POLICY ${policy.policyname} ON "${schema}".${table} FOR ALL TO app_runtime USING (${expression(policy.qual)}) WITH CHECK (${expression(policy.with_check)})`
      );
    }
    await client.query(
      `ALTER TABLE "${schema}".conversation_entries ADD FOREIGN KEY (setup_session_id) REFERENCES "${schema}".conversation_setup_sessions(id)`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence($1,'sequence'), COALESCE((SELECT max(sequence) FROM "${schema}".conversation_entries),1), EXISTS(SELECT 1 FROM "${schema}".conversation_entries))`,
      [`${schema}.conversation_entries`]
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("A restauração sintética falhou; o histórico original foi preservado.");
  } finally {
    client.release();
  }
}
