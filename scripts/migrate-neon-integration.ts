import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  assertSafeRuntimeRole,
  assertSyntheticIntegrationTarget,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "./neon-integration-guard.js";

const databaseUrl = process.env.NEON_INTEGRATION_DATABASE_URL;
parseNeonIntegrationUrl(databaseUrl);
requireSyntheticIntegrationConfirmation(process.env.NEON_INTEGRATION_CONFIRMATION);

const migrationsDirectory = fileURLToPath(new URL("../infrastructure/database/", import.meta.url));
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort();
const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await assertSyntheticIntegrationTarget(client);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  await assertSafeRuntimeRole(client);
  await client.query("GRANT app_runtime TO CURRENT_USER");
  await client.query("CREATE SCHEMA IF NOT EXISTS app");
  await client.query(`
    CREATE TABLE IF NOT EXISTS app.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const migrationName of migrationNames) {
    const alreadyApplied = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM app.schema_migrations WHERE name = $1) AS exists",
      [migrationName]
    );

    if (alreadyApplied.rows[0]?.exists) {
      continue;
    }

    if (migrationName === "001_identity_and_tenant_isolation.sql") {
      const baseline = await client.query<{ complete: boolean }>(`
        SELECT to_regclass('app.users') IS NOT NULL
          AND to_regclass('app.condominiums') IS NOT NULL
          AND to_regclass('app.memberships') IS NOT NULL
          AND to_regprocedure('app.current_user_id()') IS NOT NULL
          AND to_regprocedure('app.current_condominium_id()') IS NOT NULL AS complete
      `);

      if (baseline.rows[0]?.complete) {
        await client.query("INSERT INTO app.schema_migrations (name) VALUES ($1)", [migrationName]);
        continue;
      }
    }

    const migration = await readFile(`${migrationsDirectory}${migrationName}`, "utf8");
    await client.query(migration);
    await client.query("INSERT INTO app.schema_migrations (name) VALUES ($1)", [migrationName]);
  }
} finally {
  await client.end();
}
