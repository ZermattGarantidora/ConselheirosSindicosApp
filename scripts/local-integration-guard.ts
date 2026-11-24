import type { Client } from "pg";

export function parseLocalIntegrationUrl(
  raw: string | undefined,
  confirmation: string | undefined,
  purpose: "worker" | "rls"
): URL {
  try {
    if (confirmation !== "synthetic-local-only") throw new Error();
    const url = new URL(raw ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.search ||
      url.hash ||
      !new RegExp(`^/alvitra_ops_${purpose}_[a-f0-9]{32}$`, "u").test(url.pathname)
    )
      throw new Error();
    return url;
  } catch {
    throw new Error(
      "Integração local exige confirmação, loopback literal e banco sintético exclusivo."
    );
  }
}

export async function assertLocalIntegrationTarget(
  client: Pick<Client, "query">,
  purpose: "worker" | "rls"
) {
  try {
    const result = await client.query<{ name: string; purpose: string; data_policy: string }>(
      "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
    );
    const row = result.rows[0];
    if (
      result.rows.length !== 1 ||
      row?.purpose !== purpose ||
      row.data_policy !== "synthetic-local-only" ||
      !new RegExp(`^alvitra_ops_${purpose}_[a-f0-9]{32}$`, "u").test(row.name)
    )
      throw new Error();
  } catch {
    throw new Error("Marcador do banco local sintético incompatível; operação recusada.");
  }
}
