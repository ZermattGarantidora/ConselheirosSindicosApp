import type { Pool, QueryResult, QueryResultRow } from "pg";

export interface IdentityQueryPool {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
}

/** Identity functions have their own authorization; the service login has no inherited grants. */
export function createRuntimeIdentityQueryPool(pool: Pick<Pool, "connect">): IdentityQueryPool {
  return {
    async query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) {
      const client = await pool.connect();
      let discard = false;
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        const result = await client.query<Row>(text, values);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          discard = true;
        }
        throw error;
      } finally {
        client.release(discard);
      }
    }
  };
}
