import type { Client } from "pg";

export const SYNTHETIC_INTEGRATION_GUARD_ID = "conselheiro-neon-synthetic-v1";
export const SYNTHETIC_INTEGRATION_GUARD_PURPOSE = "synthetic-integration-only";

const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const ALLOWED_SSL_MODES = new Set(["require", "verify-full"]);

export function parseNeonIntegrationUrl(rawUrl: string | undefined): URL {
  if (rawUrl === undefined || rawUrl.trim() === "") {
    throw new Error("Defina NEON_INTEGRATION_DATABASE_URL para usar a integração sintética.");
  }
  let database: URL;
  try {
    database = new URL(rawUrl);
  } catch {
    throw new Error("NEON_INTEGRATION_DATABASE_URL deve ser uma URL PostgreSQL válida.");
  }
  if (!ALLOWED_PROTOCOLS.has(database.protocol)) {
    throw new Error("NEON_INTEGRATION_DATABASE_URL deve usar o protocolo PostgreSQL.");
  }
  if (!database.hostname.endsWith(".neon.tech")) {
    throw new Error("A integração sintética exige um endpoint Neon (*.neon.tech).");
  }
  if (!ALLOWED_SSL_MODES.has(database.searchParams.get("sslmode") ?? "")) {
    throw new Error(
      "NEON_INTEGRATION_DATABASE_URL deve exigir TLS com sslmode=require ou sslmode=verify-full."
    );
  }
  return database;
}

export function requireSyntheticIntegrationConfirmation(value: string | undefined): void {
  if (value !== "synthetic-only") {
    throw new Error("Defina NEON_INTEGRATION_CONFIRMATION=synthetic-only para continuar.");
  }
}

export async function assertSyntheticIntegrationTarget(
  client: Pick<Client, "query">
): Promise<void> {
  try {
    const result = await client.query<{ guard_id: string }>(
      "SELECT guard_id FROM public.conselheiro_integration_guard WHERE guard_id = $1 AND purpose = $2 LIMIT 1",
      [SYNTHETIC_INTEGRATION_GUARD_ID, SYNTHETIC_INTEGRATION_GUARD_PURPOSE]
    );
    if (result.rowCount !== 1)
      throw new Error("O banco não possui o marcador de integração sintética esperado.");
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("marcador de integração sintética"))
      throw error;
    throw new Error(
      "O banco não possui o marcador de integração sintética esperado; nenhuma alteração foi aplicada."
    );
  }
}

export { assertSafeRuntimeRole } from "./supabase-integration-guard.js";
