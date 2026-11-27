import type { IdentityQueryPool } from "./postgres-runtime-query.js";
import type { AccessCodeStore, AccessCredential } from "./access-code.js";
import { createUserId } from "./authorized-condominium-context.js";
import { loginAttemptPolicy } from "../security/login-attempt-limit.js";

export function createPostgresAccessCodeStore(pool: IdentityQueryPool): AccessCodeStore {
  async function find(operation: string, value: string): Promise<AccessCredential | undefined> {
    const result = await pool.query<{ user_id: string; revision: string; code_hash: string }>(
      `SELECT * FROM app.${operation}($1)`,
      [value]
    );
    const row = result.rows[0];
    return (
      row && { userId: createUserId(row.user_id), revision: row.revision, codeHash: row.code_hash }
    );
  }
  return {
    async consumeLoginAttempt(originHash) {
      const result = await pool.query<{ allowed: boolean; retry_after_seconds: number }>(
        "SELECT * FROM app.consume_access_login_attempt($1)",
        [originHash]
      );
      const row = result.rows[0];
      if (
        result.rows.length !== 1 ||
        !row ||
        typeof row.allowed !== "boolean" ||
        !Number.isSafeInteger(row.retry_after_seconds) ||
        row.retry_after_seconds < (row.allowed ? 0 : 1) ||
        row.retry_after_seconds > (row.allowed ? 0 : loginAttemptPolicy.windowMs / 1000)
      )
        throw new Error("Reserva de acesso indisponível.");
      return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
    },
    findCredential: (hash) => find("find_access_code", hash),
    findUserCredential: (id) => find("find_user_access_code", id),
    async provision(row) {
      await pool.query("SELECT app.provision_access_code($1, $2, $3)", [
        row.userId,
        row.revision,
        row.codeHash
      ]);
    },
    async createSession(row) {
      await pool.query("SELECT app.create_device_session($1, $2, $3)", [
        row.userId,
        row.revision,
        row.tokenHash
      ]);
    },
    resolveSession: (hash) => find("resolve_device_session", hash),
    async revokeSession(hash) {
      await pool.query("SELECT app.revoke_device_session($1)", [hash]);
    }
  };
}
