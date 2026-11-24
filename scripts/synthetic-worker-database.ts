import { Pool } from "pg";
import {
  parseLocalIntegrationUrl,
  assertLocalIntegrationTarget
} from "./local-integration-guard.js";
import {
  assertSyntheticIntegrationTarget as assertNeon,
  assertSafeRuntimeRole,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation as confirmNeon
} from "./neon-integration-guard.js";
import {
  assertSyntheticIntegrationTarget as assertSupabase,
  parseSupabaseIntegrationUrl,
  requireSyntheticIntegrationConfirmation as confirmSupabase,
  createTrustedSupabaseConnectionConfig
} from "./supabase-integration-guard.js";

export async function syntheticWorkerDatabase(
  provider: string,
  environment: NodeJS.ProcessEnv = process.env
): Promise<Pool> {
  let connection;
  if (provider === "neon") {
    const url = environment.NEON_INTEGRATION_DATABASE_URL;
    parseNeonIntegrationUrl(url);
    confirmNeon(environment.NEON_INTEGRATION_CONFIRMATION);
    connection = { connectionString: url };
  } else if (provider === "supabase") {
    const url = environment.SUPABASE_INTEGRATION_DATABASE_URL;
    const parsed = parseSupabaseIntegrationUrl(url);
    confirmSupabase(environment.SUPABASE_INTEGRATION_CONFIRMATION);
    connection = createTrustedSupabaseConnectionConfig(
      parsed.toString(),
      environment.SUPABASE_INTEGRATION_CA_CERT
    );
  } else if (provider === "local") {
    const url = parseLocalIntegrationUrl(
      environment.LOCAL_INTEGRATION_DATABASE_URL,
      environment.LOCAL_INTEGRATION_CONFIRMATION,
      "worker"
    );
    connection = { connectionString: url.toString() };
  } else {
    throw new Error("Escolha --provider=local, neon ou supabase para o ensaio sintético.");
  }
  const pool = new Pool({
    ...connection,
    max: 4,
    connectionTimeoutMillis: 5000,
    query_timeout: 30_000
  });
  try {
    const client = await pool.connect();
    try {
      if (provider === "local") await assertLocalIntegrationTarget(client, "worker");
      else await (provider === "neon" ? assertNeon(client) : assertSupabase(client));
      await assertSafeRuntimeRole(client);
      const workerRole = await client.query<{
        rolcanlogin: boolean;
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>("SELECT rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_worker'");
      if (
        workerRole.rows.length !== 1 ||
        workerRole.rows.some((role) => role.rolcanlogin || role.rolsuper || role.rolbypassrls)
      )
        throw new Error("O papel app_worker do destino sintético não é restrito.");
    } finally {
      client.release();
    }
    return pool;
  } catch (error) {
    await pool.end();
    throw error;
  }
}
