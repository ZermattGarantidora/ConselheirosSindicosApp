import { Client } from "pg";

import { migrateDatabase, parseDatabaseUrl } from "./database-migrations.js";

const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);
const client = new Client({ connectionString: databaseUrl.toString() });

await client.connect();

try {
  const applied = await migrateDatabase(client);
  console.log(
    applied.length === 0
      ? "Migrations já estavam atualizadas."
      : `Migrations aplicadas: ${applied.join(", ")}`
  );
} finally {
  await client.end();
}
