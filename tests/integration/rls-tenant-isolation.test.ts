import { randomUUID } from "node:crypto";

import { Pool, type PoolClient } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const databaseUrl = process.env.NEON_INTEGRATION_DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error(
    "Defina NEON_INTEGRATION_DATABASE_URL para executar testes de integração PostgreSQL no Neon."
  );
}

const database = new URL(databaseUrl);

if (
  !database.hostname.endsWith(".neon.tech") ||
  process.env.NEON_INTEGRATION_CONFIRMATION !== "synthetic-only"
) {
  throw new Error("Os testes exigem um host Neon e NEON_INTEGRATION_CONFIRMATION=synthetic-only.");
}

const pool = new Pool({ connectionString: databaseUrl });
const alamedaId = randomUUID();
const bosqueId = randomUUID();
const userId = randomUUID();

async function resetFixtures(client: PoolClient): Promise<void> {
  await client.query("TRUNCATE app.memberships, app.condominiums, app.users");
  await client.query("INSERT INTO app.users (id, auth_subject, status) VALUES ($1, $2, 'active')", [
    userId,
    "sindico-sintetico"
  ]);
  await client.query(
    "INSERT INTO app.condominiums (id, display_name, status) VALUES ($1, 'Alameda', 'active'), ($2, 'Bosque', 'active')",
    [alamedaId, bosqueId]
  );
  await client.query(
    "INSERT INTO app.memberships (condominium_id, id, user_id, role_key, status, valid_from, revision) VALUES ($1, $2, $3, 'manager', 'active', now() - interval '1 day', 'v1')",
    [alamedaId, randomUUID(), userId]
  );
}

async function asRuntime<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

describe("RLS de isolamento por condomínio", () => {
  beforeEach(async () => {
    const client = await pool.connect();

    try {
      await resetFixtures(client);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("permite somente o condomínio com membership ativa", async () => {
    const result = await asRuntime((client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums ORDER BY display_name")
    );

    expect(result.rows).toEqual([{ id: alamedaId }]);
  });

  it("não confirma a existência de condomínio sem associação", async () => {
    const result = await asRuntime((client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums WHERE id = $1", [bosqueId])
    );

    expect(result.rows).toEqual([]);
  });

  it("nega acesso após revogação", async () => {
    await pool.query(
      "UPDATE app.memberships SET status = 'revoked', revoked_at = now() WHERE user_id = $1",
      [userId]
    );

    const result = await asRuntime((client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums")
    );

    expect(result.rows).toEqual([]);
  });
});
