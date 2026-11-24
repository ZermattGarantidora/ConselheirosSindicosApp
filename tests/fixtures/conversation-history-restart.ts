import { Pool } from "pg";
import {
  parseLocalIntegrationUrl,
  assertLocalIntegrationTarget
} from "../../scripts/local-integration-guard.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  assertSyntheticIntegrationTarget,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "../../scripts/neon-integration-guard.js";
const localUrl = process.env.LOCAL_INTEGRATION_DATABASE_URL;
if (localUrl !== undefined)
  parseLocalIntegrationUrl(localUrl, process.env.LOCAL_INTEGRATION_CONFIRMATION, "rls");
else {
  parseNeonIntegrationUrl(process.env.NEON_INTEGRATION_DATABASE_URL);
  requireSyntheticIntegrationConfirmation(process.env.NEON_INTEGRATION_CONFIRMATION);
}
const pool = new Pool({ connectionString: localUrl ?? process.env.NEON_INTEGRATION_DATABASE_URL });
try {
  const connection = await pool.connect();
  try {
    if (localUrl !== undefined) await assertLocalIntegrationTarget(connection, "rls");
    else await assertSyntheticIntegrationTarget(connection);
  } finally {
    connection.release();
  }
  const [userId, condominiumId, chatId] = process.argv.slice(2);
  if (!userId || !condominiumId || !chatId) throw new Error("Escopo sintético ausente.");
  const page = await createPostgresConversationStore(pool).list({
    kind: "chat",
    userId: createUserId(userId),
    condominiumId,
    chatId
  });
  process.stdout.write(JSON.stringify(page));
} finally {
  await pool.end();
}
