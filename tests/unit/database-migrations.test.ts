import { describe, expect, it } from "vitest";

import { migrateDatabase, parseDatabaseUrl } from "../../scripts/database-migrations.js";

describe("migrations PostgreSQL remotas", () => {
  it("aceita banco local sem TLS e exige TLS para banco remoto", () => {
    expect(parseDatabaseUrl("postgresql://postgres@127.0.0.1:5432/conselheiro").hostname).toBe(
      "127.0.0.1"
    );
    expect(
      parseDatabaseUrl("postgresql://role:password@db.example.com/app?sslmode=verify-full").hostname
    ).toBe("db.example.com");
    expect(() => parseDatabaseUrl("postgresql://role:password@db.example.com/app")).toThrow("TLS");
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "https://db.example.com/app",
    "postgresql://role:password@db.example.com/app?sslmode=disable"
  ])("rejeita URL de banco inválida ou insegura: %s", (url) => {
    expect(() => parseDatabaseUrl(url)).toThrow();
  });

  it("aplica migrations em ordem e registra cada arquivo", async () => {
    const calls: string[] = [];
    const applied: string[] = [];
    const client = {
      async query<T>(text: string, values: readonly unknown[] = []) {
        calls.push(text);
        if (text.includes("to_regclass('app.users')")) return { rows: [{ exists: false }] as T[] };
        if (text.includes("SELECT name FROM app.schema_migrations")) {
          return { rows: applied.map((name) => ({ name })) as T[] };
        }
        if (text.includes("INSERT INTO app.schema_migrations")) {
          applied.push(String(values[0]));
        }
        return { rows: [] as T[] };
      }
    } as never;

    const appliedNow = await migrateDatabase(client);

    expect(appliedNow.length).toBeGreaterThanOrEqual(15);
    expect(appliedNow).toEqual([...applied].sort());
    expect(calls.some((call) => call.includes("CREATE ROLE app_runtime"))).toBe(true);
    expect(calls.some((call) => call.includes("GRANT app_runtime TO CURRENT_USER"))).toBe(true);
    expect(calls.some((call) => call.includes("CREATE SCHEMA IF NOT EXISTS app"))).toBe(true);
    expect(
      calls.some((call) => call.includes("CREATE TABLE IF NOT EXISTS app.schema_migrations"))
    ).toBe(true);
  });

  it("não tenta reaplicar schema existente sem histórico", async () => {
    const client = {
      async query<T>(text: string) {
        if (text.includes("to_regclass('app.users')")) return { rows: [{ exists: true }] as T[] };
        if (text.includes("to_regclass('app.schema_migrations')")) {
          return { rows: [{ exists: false }] as T[] };
        }
        if (text.includes("SELECT name FROM app.schema_migrations")) return { rows: [] as T[] };
        return { rows: [] as T[] };
      }
    } as never;

    await expect(migrateDatabase(client)).rejects.toThrow("não possui histórico de migrations");
  });
});
