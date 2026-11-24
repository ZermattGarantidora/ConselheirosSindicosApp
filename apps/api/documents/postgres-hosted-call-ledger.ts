import type { Pool } from "pg";
import {
  createTransactionalHostedCallLedger,
  type HostedCallLedger,
  type HostedCallLedgerState,
  type HostedCallRecord
} from "./hosted-call-ledger.js";

/** Pool dedicado de menor privilégio; nenhuma conexão é criada ou configurada aqui. */
export function createPostgresHostedCallLedger(pool: Pick<Pool, "connect">): HostedCallLedger {
  return createTransactionalHostedCallLedger(async (key, change) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE app_ai_executor");
      await client.query("SELECT set_config('app.condominium_id', $1, true)", [key.condominiumId]);
      // Sempre a mesma ordem: clock/global, dados do tenant, mutação e COMMIT antes do transporte.
      const control = await client.query<{ last_seen_at: string | number }>(
        "SELECT last_seen_at FROM app.hosted_call_control WHERE singleton = true FOR UPDATE"
      );
      if (control.rows.length !== 1) throw new Error("Guard do ledger ausente.");
      const clock = await client.query<{ time: string | number }>(
        "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS time"
      );
      const daily = await client.query<{ period: string; committed: string | number }>(
        "SELECT period::text, committed FROM app.hosted_call_daily ORDER BY period LIMIT 10001"
      );
      const calls = await client.query<{ record: HostedCallRecord }>(
        "SELECT record FROM app.hosted_call_records WHERE condominium_id = $1 ORDER BY request_hash LIMIT 10001",
        [key.condominiumId]
      );
      if (calls.rows.some((row) => row.record.condominiumId !== key.condominiumId))
        throw new Error("Escopo incompatível no ledger.");
      const state: HostedCallLedgerState = {
        version: 1,
        lastSeenAt: Number(control.rows[0]!.last_seen_at),
        daily: daily.rows.map((row) => ({ period: row.period, committed: Number(row.committed) })),
        calls: calls.rows.map((row) => structuredClone(row.record))
      };
      const beforeCalls = new Map(state.calls.map((row) => [row.requestHash, JSON.stringify(row)]));
      const beforeDaily = new Map(state.daily.map((row) => [row.period, row.committed]));
      const result = change(state, Number(clock.rows[0]?.time));
      for (const row of state.daily)
        if (beforeDaily.get(row.period) !== row.committed)
          await client.query(
            "INSERT INTO app.hosted_call_daily(period, committed) VALUES ($1::date, $2) ON CONFLICT (period) DO UPDATE SET committed = EXCLUDED.committed",
            [row.period, row.committed]
          );
      for (const row of state.calls)
        if (beforeCalls.get(row.requestHash) !== JSON.stringify(row))
          await client.query(
            "INSERT INTO app.hosted_call_records(condominium_id, request_hash, record) VALUES ($1::uuid, $2, $3::jsonb) ON CONFLICT (condominium_id, request_hash) DO UPDATE SET record = EXCLUDED.record",
            [key.condominiumId, row.requestHash, JSON.stringify(row)]
          );
      await client.query(
        "UPDATE app.hosted_call_control SET last_seen_at = $1 WHERE singleton = true",
        [state.lastSeenAt]
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* Preservar o resultado desconhecido; sem fallback. */
      }
      throw error;
    } finally {
      client.release();
    }
  });
}
