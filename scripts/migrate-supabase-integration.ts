import { Client } from "pg";
import { migrateDatabase } from "./database-migrations.js";
import {
  assertSafeRuntimeRole,
  assertSyntheticIntegrationTarget,
  parseSupabaseIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "./supabase-integration-guard.js";
const databaseUrl = process.env.SUPABASE_INTEGRATION_DATABASE_URL;
parseSupabaseIntegrationUrl(databaseUrl);
requireSyntheticIntegrationConfirmation(process.env.SUPABASE_INTEGRATION_CONFIRMATION);
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await assertSyntheticIntegrationTarget(client);
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;"
  );
  await assertSafeRuntimeRole(client);
  await client.query("GRANT app_runtime TO CURRENT_USER");
  const applied = await migrateDatabase(client);
  console.log(
    applied.length === 0
      ? "Migrations já estavam atualizadas."
      : `Migrations aplicadas: ${applied.join(", ")}`
  );
} finally {
  await client.end();
}
