import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const databaseUrl = process.env.NEON_INTEGRATION_DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("Defina NEON_INTEGRATION_DATABASE_URL para aplicar a migration no Neon.");
}

const database = new URL(databaseUrl);

if (
  !database.hostname.endsWith(".neon.tech") ||
  process.env.NEON_INTEGRATION_CONFIRMATION !== "synthetic-only"
) {
  throw new Error("A migration exige um host Neon e NEON_INTEGRATION_CONFIRMATION=synthetic-only.");
}

const migrationPath = fileURLToPath(
  new URL("../migrations/001_identity_and_tenant_isolation.sql", import.meta.url)
);
const migration = await readFile(migrationPath, "utf8");
const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query("BEGIN");
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
  await client.query(migration);
  await client.query("COMMIT");
} catch (error: unknown) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
