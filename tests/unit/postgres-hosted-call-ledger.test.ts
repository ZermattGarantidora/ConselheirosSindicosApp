import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createPostgresHostedCallLedger } from "../../apps/api/documents/postgres-hosted-call-ledger.js";
import type { HostedCallRecord } from "../../apps/api/documents/hosted-call-ledger.js";

const tenant = "11111111-1111-4111-8111-111111111111";
const key = {
  condominiumId: tenant,
  requestHash: "a".repeat(64),
  policyRevision: "synthetic-only"
};
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic-only-v1",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 20,
  globalDailyLimitMicrounits: 30
};
function database(failure?: string) {
  const records = new Map<string, HostedCallRecord>(),
    days = new Map<string, number>();
  const release = vi.fn();
  let time = 0;
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (failure && sql.includes(failure)) throw new Error("DETALHE_PRIVADO");
    let rows: unknown[] = [];
    if (sql.includes("SELECT last_seen_at"))
      rows = failure === "missing-guard" ? [] : [{ last_seen_at: time }];
    if (sql.includes("clock_timestamp")) rows = [{ time: Date.UTC(2026, 10, 9) }];
    if (sql.includes("SELECT period::text"))
      rows = [...days].map(([period, committed]) => ({ period, committed: String(committed) }));
    if (sql.includes("SELECT record")) rows = [...records.values()].map((record) => ({ record }));
    if (sql.includes("INSERT INTO app.hosted_call_daily"))
      days.set(String(params[0]), Number(params[1]));
    if (sql.includes("INSERT INTO app.hosted_call_records"))
      records.set(String(params[1]), JSON.parse(String(params[2])) as HostedCallRecord);
    if (sql.includes("UPDATE app.hosted_call_control")) time = Number(params[0]);
    return { rows, rowCount: rows.length || 1 };
  });
  const pool = { connect: async () => ({ query, release }) } as unknown as Pick<Pool, "connect">;
  return { pool, query, release, days, records };
}

describe("Spec 071 — contrato PostgreSQL do ledger, sem executar SQL real", () => {
  it("AC-7111/7112: trava global, contexto e recibo na mesma transação", async () => {
    const db = database(),
      ledger = createPostgresHostedCallLedger(db.pool);
    const reservation = await ledger.reserve(key, budget);
    expect(reservation.status).toBe("reserved");
    if (reservation.status !== "reserved") throw new Error("Reserva ausente.");
    const calls = db.query.mock.calls.map(([sql]) => sql);
    expect(calls[0]).toBe("BEGIN");
    expect(calls[1]).toBe("SET LOCAL ROLE app_ai_executor");
    expect(db.query.mock.calls[2]).toEqual([
      "SELECT set_config('app.condominium_id', $1, true)",
      [tenant]
    ]);
    expect(calls[3]).toContain("FOR UPDATE");
    expect(calls.at(-1)).toBe("COMMIT");
    await ledger.dispatch(key, reservation.owner);
    await ledger.complete(key, reservation.owner, { text: "Resultado inteiramente sintético." });
    expect(await createPostgresHostedCallLedger(db.pool).reserve(key, budget)).toEqual({
      status: "completed",
      value: { text: "Resultado inteiramente sintético." }
    });
    expect(db.days.values().next().value).toBe(10);
    expect(db.release).toHaveBeenCalledTimes(4);
    expect(
      db.query.mock.calls
        .filter(([sql]) => sql.includes("SELECT record"))
        .every(([, params]) => params?.[0] === tenant)
    ).toBe(true);
  });

  it("AC-7111: compromisso global preexistente impede nova reserva", async () => {
    const db = database();
    db.days.set("2026-11-09", 30);
    await expect(
      createPostgresHostedCallLedger(db.pool).reserve(key, budget)
    ).rejects.toMatchObject({ code: "budget_exceeded" });
    expect(db.records.size).toBe(0);
    expect(db.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(db.release).toHaveBeenCalledOnce();
  });

  it.each(["missing-guard", "INSERT INTO app.hosted_call_records", "COMMIT", "SET LOCAL ROLE"])(
    "AC-7113: falha %s não confirma ou expõe erro nativo",
    async (failure) => {
      const db = database(failure);
      const error = await createPostgresHostedCallLedger(db.pool)
        .reserve(key, budget)
        .catch((value: unknown) => value);
      expect(error).toMatchObject({ code: "ledger_unavailable" });
      expect(String(error)).not.toContain("DETALHE_PRIVADO");
      expect(db.query).toHaveBeenLastCalledWith("ROLLBACK");
      expect(db.release).toHaveBeenCalledOnce();
    }
  );

  it("AC-7111: resposta de outro condomínio é recusada antes de qualquer escrita", async () => {
    const db = database();
    db.records.set("a", {
      condominiumId: "22222222-2222-4222-8222-222222222222"
    } as HostedCallRecord);
    await expect(
      createPostgresHostedCallLedger(db.pool).reserve(key, budget)
    ).rejects.toMatchObject({ code: "ledger_unavailable" });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith("INSERT"))).toBe(false);
  });

  it("AC-7111: migration mantém RLS forçada e não concede execução ao runtime existente", async () => {
    const sql = await readFile(
      "infrastructure/database/039_hosted_document_call_ledger.sql",
      "utf8"
    );
    expect(sql).toContain("NOLOGIN NOSUPERUSER NOBYPASSRLS");
    for (const table of ["hosted_call_control", "hosted_call_daily", "hosted_call_records"])
      expect(sql).toContain(`ALTER TABLE app.${table} FORCE ROW LEVEL SECURITY`);
    expect(sql).toContain("condominium_id = app.current_condominium_id()");
    expect(sql).toContain("IS TRUE");
    expect(sql).not.toMatch(/GRANT\s+app_ai_executor\s+TO/iu);
    expect(sql).not.toMatch(/TRUNCATE|BYPASSRLS true/iu);
    // Scope lookup and deletion triggers need owner access to expunge results atomically.
    // Check their exact boundary instead of banning every privileged function.
    expect(sql.match(/SECURITY DEFINER/gu)).toHaveLength(2);
    for (const signature of [
      "hosted_call_scope_active(uuid)",
      "invalidate_deleted_hosted_document_content()"
    ])
      expect(sql).toContain(`REVOKE ALL ON FUNCTION app.${signature} FROM PUBLIC`);
    expect(sql).toContain("SET search_path = pg_catalog, app SET row_security = off");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION app.hosted_call_scope_active(uuid) TO app_ai_executor"
    );
    expect(sql).not.toMatch(/GRANT EXECUTE.*TO (?:PUBLIC|app_runtime|app_worker)/iu);
    expect(sql).not.toContain("REFERENCES app.condominiums(id)");
    expect(sql).toContain("BEFORE DELETE ON app.condominiums");
    expect(sql).toContain("BEFORE DELETE ON app.document_versions");
  });
});
