import type { Pool } from "pg";

import {
  AccountAuthError,
  createAccountAuthService,
  type AccountAuthService,
  type AccountAuthStore
} from "./account-auth.js";
import type { UserId } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "query">;

type AccountRow = Readonly<{
  user_id: string;
  auth_subject: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  google_subject: string | null;
  status: "active" | "blocked" | "deleted";
}>;

type SessionAccountRow = Readonly<{
  user_id: string;
  email: string;
  display_name: string;
}>;

export function createPostgresAccountAuth(pool: PoolLike): AccountAuthService {
  const store: AccountAuthStore = {
    async createAccount(account) {
      try {
        await pool.query("SELECT app.create_account($1, $2, $3, $4, $5)", [
          account.userId,
          account.authSubject,
          account.email,
          account.displayName,
          account.passwordHash
        ]);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new AccountAuthError("email_taken", "Este e-mail já está cadastrado.");
        }
        throw error;
      }
    },

    async findAccountByEmail(email) {
      const result = await pool.query<AccountRow>(
        "SELECT user_id, auth_subject, email, display_name, password_hash, status FROM app.find_account_by_email($1)",
        [email]
      );
      const row = result.rows[0];
      return row === undefined
        ? undefined
        : Object.freeze({
            userId: row.user_id as UserId,
            authSubject: row.auth_subject,
            email: row.email,
            displayName: row.display_name,
            passwordHash: row.password_hash,
            googleSubject: row.google_subject ?? null,
            status: row.status
          });
    },
    async findOrCreateGoogleAccount(input) {
      const result = await pool.query<AccountRow>(
        `
          SELECT user_id, auth_subject, email, display_name, password_hash, google_subject, status
          FROM app.find_or_create_google_account($1, $2, $3, $4, $5)
        `,
        [input.userId, input.authSubject, input.googleSubject, input.email, input.displayName]
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error("O banco não retornou a conta Google.");
      return Object.freeze({
        userId: row.user_id as UserId,
        authSubject: row.auth_subject,
        email: row.email,
        displayName: row.display_name,
        passwordHash: row.password_hash,
        googleSubject: row.google_subject,
        status: row.status
      });
    },

    async createSession(input) {
      await pool.query("SELECT app.create_auth_session($1, $2, $3)", [
        input.userId,
        input.tokenHash,
        input.expiresAt
      ]);
    },

    async findSession(tokenHash, now) {
      const result = await pool.query<SessionAccountRow>(
        "SELECT user_id, email, display_name FROM app.resolve_auth_session($1, $2)",
        [tokenHash, now]
      );
      const row = result.rows[0];
      return row === undefined
        ? undefined
        : Object.freeze({
            userId: row.user_id as UserId,
            email: row.email,
            displayName: row.display_name
          });
    },

    async revokeSession(tokenHash) {
      await pool.query("SELECT app.revoke_auth_session($1)", [tokenHash]);
    }
  };

  return createAccountAuthService(store);
}
