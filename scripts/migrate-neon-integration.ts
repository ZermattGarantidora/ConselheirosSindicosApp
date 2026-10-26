import { Client } from "pg";

import { migrateDatabase } from "./database-migrations.js";
import {
  assertSafeRuntimeRole,
  assertSyntheticIntegrationTarget,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "./neon-integration-guard.js";

const databaseUrl = process.env.NEON_INTEGRATION_DATABASE_URL;
parseNeonIntegrationUrl(databaseUrl);
requireSyntheticIntegrationConfirmation(process.env.NEON_INTEGRATION_CONFIRMATION);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await assertSyntheticIntegrationTarget(client);
  await client.query("CREATE SCHEMA IF NOT EXISTS app");
  const applied = await migrateDatabase(client);
  await assertSafeRuntimeRole(client);
  console.log(
    applied.length === 0
      ? "Migrations já estavam atualizadas."
      : `Migrations aplicadas: ${applied.join(", ")}`
  );
} finally {
  await client.end();
}
