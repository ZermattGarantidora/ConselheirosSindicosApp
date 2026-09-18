import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Client } from "pg";

export const defaultMigrationsDirectory = fileURLToPath(
  new URL("../infrastructure/database/", import.meta.url)
);

const migrationNamePattern = /^\d{3}_.+\.sql$/u;
const allowedProtocols = new Set(["postgres:", "postgresql:"]);
const allowedRemoteSslModes = new Set(["require", "verify-full"]);
const localDatabaseHosts = new Set(["127.0.0.1", "localhost", "::1"]);

export type MigrationClient = Pick<Client, "query">;

export async function ensureRuntimeRole(client: MigrationClient): Promise<void> {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  await client.query("GRANT app_runtime TO CURRENT_USER");
}

export function parseDatabaseUrl(rawUrl: string | undefined): URL {
  if (rawUrl === undefined || rawUrl.trim() === "") {
    throw new Error("Defina DATABASE_URL para usar um banco PostgreSQL persistente.");
  }

  let database: URL;
  try {
    database = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL deve ser uma URL PostgreSQL válida.");
  }

  if (!allowedProtocols.has(database.protocol)) {
    throw new Error("DATABASE_URL deve usar o protocolo PostgreSQL.");
  }

  if (!localDatabaseHosts.has(database.hostname)) {
    const sslMode = database.searchParams.get("sslmode");
    if (!allowedRemoteSslModes.has(sslMode ?? "")) {
      throw new Error(
        "DATABASE_URL remoto deve exigir TLS com sslmode=require ou sslmode=verify-full."
      );
    }
  }

  return database;
}

async function listMigrationNames(migrationsDirectory: string): Promise<readonly string[]> {
  return (await readdir(migrationsDirectory))
    .filter((name) => migrationNamePattern.test(name))
    .sort();
}

export async function migrateDatabase(
  client: MigrationClient,
  migrationsDirectory = defaultMigrationsDirectory
): Promise<readonly string[]> {
  await client.query("CREATE SCHEMA IF NOT EXISTS app");

  const schemaState = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('app.users') IS NOT NULL AS exists"
  );
  const migrationTableState = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('app.schema_migrations') IS NOT NULL AS exists"
  );

  if (schemaState.rows[0]?.exists && !migrationTableState.rows[0]?.exists) {
    throw new Error(
      "O banco já possui o schema app, mas não possui histórico de migrations; não apliquei nada para evitar duplicidade."
    );
  }

  await ensureRuntimeRole(client);
  await client.query(`
    CREATE TABLE IF NOT EXISTS app.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedResult = await client.query<{ name: string }>(
    "SELECT name FROM app.schema_migrations ORDER BY name"
  );
  const applied = new Set(appliedResult.rows.map((row) => row.name));

  const appliedNow: string[] = [];
  for (const migrationName of await listMigrationNames(migrationsDirectory)) {
    if (applied.has(migrationName)) continue;

    const migration = await readFile(join(migrationsDirectory, migrationName), "utf8");
    await client.query(migration);
    await client.query("INSERT INTO app.schema_migrations (name) VALUES ($1)", [migrationName]);
    applied.add(migrationName);
    appliedNow.push(migrationName);
  }

  return appliedNow;
}
