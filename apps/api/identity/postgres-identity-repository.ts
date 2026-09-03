import type { Pool, PoolClient } from "pg";

import { type Membership, type MembershipRepository } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "connect">;

type MembershipRow = Readonly<{
  role_key: Membership["roleKey"];
  status: Membership["status"];
  valid_from: Date;
  valid_until: Date | null;
  revision: string;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

export function createPostgresMembershipRepository(pool: PoolLike): MembershipRepository {
  return {
    async findMembership(input): Promise<Membership | undefined> {
      if (!uuidPattern.test(input.condominiumId)) {
        return undefined;
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        const userResult = await client.query<{ user_id: string | null }>(
          "SELECT app.resolve_user_id($1) AS user_id",
          [input.userId]
        );
        const databaseUserId = userResult.rows[0]?.user_id;

        if (databaseUserId === null || databaseUserId === undefined) {
          await client.query("COMMIT");
          return undefined;
        }

        await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
        await client.query("SELECT set_config('app.condominium_id', $1, true)", [
          input.condominiumId
        ]);
        const result = await client.query<MembershipRow>(
          `
            SELECT role_key, status, valid_from, valid_until, revision
            FROM app.memberships
            WHERE user_id = app.current_user_id()
              AND condominium_id = app.current_condominium_id()
            LIMIT 1
          `
        );
        await client.query("COMMIT");

        const row = result.rows[0];
        return row === undefined
          ? undefined
          : Object.freeze({
              condominiumId: input.condominiumId,
              userId: input.userId,
              roleKey: row.role_key,
              status: row.status,
              validFrom: new Date(row.valid_from),
              ...(row.valid_until === null ? {} : { validUntil: new Date(row.valid_until) }),
              revision: row.revision
            });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
