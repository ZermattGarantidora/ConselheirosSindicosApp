import type { Pool } from "pg";

import {
  AccountAuthError,
  createAccountAuthService,
  type AccountAuthService,
  type AccountAuthStore
} from "./account-auth.js";
import type { UserId } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "query">;

type RetryOptions = Readonly<{
  attempts?: number;
  wait?: (delayMilliseconds: number) => Promise<void>;
}>;

const transientDatabaseErrorCodes = new Set([
  "08000",
  "08003",
  "08006",
  "08001",
  "08004",
  "08007",
  "08P01",
  "40001",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT"
]);

const transientDatabaseMessage =
  /(?:connection|connect|dns|network|socket).*(?:closed|ended|reset|terminat|timeout|timed out|unavailable)|(?:timeout|timed out).*(?:connection|connect)|getaddrinfo/iu;

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === "23505";
}

function isTransientDatabaseError(error: unknown, seen = new Set<unknown>()): boolean {
  if (seen.has(error)) return false;
  seen.add(error);

  const code = errorCode(error);
  if (code !== undefined && transientDatabaseErrorCodes.has(code)) return true;
  if (error instanceof Error && transientDatabaseMessage.test(error.message)) return true;
  if (error instanceof AggregateError) {
    return error.errors.some((nestedError) => isTransientDatabaseError(nestedError, seen));
  }
  return false;
}

function unavailableError(): AccountAuthError {
  return new AccountAuthError(
    "temporarily_unavailable",
    "O acesso está temporariamente indisponível. Aguarde um instante e tente novamente."
  );
}

async function defaultWait(delayMilliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMilliseconds));
}

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

export function createPostgresAccountAuth(
  pool: PoolLike,
  retryOptions: RetryOptions = {}
): AccountAuthService {
  const attempts = Math.max(1, retryOptions.attempts ?? 3);
  const wait = retryOptions.wait ?? defaultWait;

  async function queryWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (!isTransientDatabaseError(error)) throw error;
        if (attempt < attempts) await wait(150 * attempt);
      }
    }
    throw unavailableError();
  }

  const store: AccountAuthStore = {
    async createAccount(account) {
      try {
        await queryWithRetry(() =>
          pool.query("SELECT app.create_account($1, $2, $3, $4, $5)", [
            account.userId,
            account.authSubject,
            account.email,
            account.displayName,
            account.passwordHash
          ])
        );
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          const existing = await queryWithRetry(() =>
            pool.query<AccountRow>(
              "SELECT user_id, auth_subject, email, display_name, password_hash, status FROM app.find_account_by_email($1)",
              [account.email]
            )
          );
          if (existing.rows[0]?.user_id === account.userId) return;
          throw new AccountAuthError("email_taken", "Este e-mail já está cadastrado.");
        }
        if (isTransientDatabaseError(error)) throw unavailableError();
        throw error;
      }
    },

    async findAccountByEmail(email) {
      const result = await queryWithRetry(() =>
        pool.query<AccountRow>(
          "SELECT user_id, auth_subject, email, display_name, password_hash, status FROM app.find_account_by_email($1)",
          [email]
        )
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
      const result = await queryWithRetry(() =>
        pool.query<AccountRow>(
          `
            SELECT user_id, auth_subject, email, display_name, password_hash, google_subject, status
            FROM app.find_or_create_google_account($1, $2, $3, $4, $5)
          `,
          [input.userId, input.authSubject, input.googleSubject, input.email, input.displayName]
        )
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
      try {
        await queryWithRetry(() =>
          pool.query("SELECT app.create_auth_session($1, $2, $3)", [
            input.userId,
            input.tokenHash,
            input.expiresAt
          ])
        );
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) {
          if (isTransientDatabaseError(error)) throw unavailableError();
          throw error;
        }
        const existing = await queryWithRetry(() =>
          pool.query<SessionAccountRow>(
            "SELECT user_id, email, display_name FROM app.resolve_auth_session($1, $2)",
            [input.tokenHash, new Date()]
          )
        );
        if (existing.rows[0]?.user_id !== input.userId) throw error;
      }
    },

    async findSession(tokenHash, now) {
      const result = await queryWithRetry(() =>
        pool.query<SessionAccountRow>(
          "SELECT user_id, email, display_name FROM app.resolve_auth_session($1, $2)",
          [tokenHash, now]
        )
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
      await queryWithRetry(() => pool.query("SELECT app.revoke_auth_session($1)", [tokenHash]));
    }
  };

  return createAccountAuthService(store);
}
