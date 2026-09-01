import { readFile } from "node:fs/promises";
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

const migrationPath = fileURLToPath(
  new URL("../infrastructure/database/001_identity_and_tenant_isolation.sql", import.meta.url)
);
const migration = await readFile(migrationPath, "utf8");
const client = new Client({ connectionString: databaseUrl });

await client.connect();

let transactionStarted = false;

try {
  await assertSyntheticIntegrationTarget(client);
  await client.query("BEGIN");
  transactionStarted = true;
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
  await client.query(migration);
  await client.query("COMMIT");
} catch (error: unknown) {
  if (transactionStarted) {
    await client.query("ROLLBACK");
  }
  throw error;
} finally {
  await client.end();
}
