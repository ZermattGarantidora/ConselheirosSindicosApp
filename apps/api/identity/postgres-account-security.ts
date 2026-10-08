import type { Pool } from "pg";

import { AccountAuthError, type AccountCredentials } from "./account-auth.js";
import {
  createAccountSecurityService,
  type AccountActionPurpose,
  type AccountSecurityService,
  type AccountSecurityStore,
  type MfaChallenge,
  type SecureAccount
} from "./account-security.js";
import type { SecretCipher } from "./account-security-crypto.js";
import type { UserId } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "query">;

type SecurityAccountRow = Readonly<{
  user_id: string;
  auth_subject: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  google_subject: string | null;
  status: "active" | "blocked" | "deleted";
  email_verified_at: Date | string | null;
  mfa_secret_ciphertext: string | null;
  mfa_enabled_at: Date | string | null;
}>;

function toDate(value: Date | string | null): Date | null {
  return value === null ? null : value instanceof Date ? value : new Date(value);
}

function toAccount(row: SecurityAccountRow): SecureAccount {
  return Object.freeze({
    userId: row.user_id as UserId,
    authSubject: row.auth_subject,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    googleSubject: row.google_subject,
    status: row.status,
    emailVerifiedAt: toDate(row.email_verified_at),
    mfaSecretCiphertext: row.mfa_secret_ciphertext,
    mfaEnabledAt: toDate(row.mfa_enabled_at)
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function createPostgresAccountSecurityStore(pool: PoolLike): AccountSecurityStore {
  const accountColumns = `
    user_id, auth_subject, email, display_name, password_hash, google_subject, status,
    email_verified_at, mfa_secret_ciphertext, mfa_enabled_at
  `;
  const store: AccountSecurityStore = {
    async createAccount(account: AccountCredentials) {
      try {
        await pool.query("SELECT app.create_account($1, $2, $3, $4, $5)", [
          account.userId,
          account.authSubject,
          account.email,
          account.displayName,
          account.passwordHash
        ]);
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new AccountAuthError("email_taken", "Este e-mail já está cadastrado.");
        }
        throw error;
      }
    },

    async findAccountByEmail(email) {
      const result = await pool.query<SecurityAccountRow>(
        `SELECT ${accountColumns} FROM app.find_account_security_by_email($1)`,
        [email]
      );
      return result.rows[0] === undefined ? undefined : toAccount(result.rows[0]);
    },

    async createAction(input) {
      await pool.query("SELECT app.create_auth_action($1, $2, $3, $4)", [
        input.userId,
        input.purpose,
        input.tokenHash,
        input.expiresAt
      ]);
    },

    async confirmEmail(tokenHash, now) {
      const result = await pool.query<{ confirmed: boolean }>(
        "SELECT app.confirm_account_email($1, $2) AS confirmed",
        [tokenHash, now]
      );
      return result.rows[0]?.confirmed === true;
    },

    async resetPassword(tokenHash, passwordHash, now) {
      const result = await pool.query<{ reset: boolean }>(
        "SELECT app.reset_account_password($1, $2, $3) AS reset",
        [tokenHash, passwordHash, now]
      );
      return result.rows[0]?.reset === true;
    },

    async changePassword(input) {
      const result = await pool.query<{ changed: boolean }>(
        "SELECT app.change_account_password($1, $2) AS changed",
        [input.currentTokenHash, input.passwordHash]
      );
      return result.rows[0]?.changed === true;
    },

    async findAccountBySession(tokenHash, now) {
      const result = await pool.query<SecurityAccountRow>(
        `SELECT ${accountColumns} FROM app.find_account_security_by_session($1, $2)`,
        [tokenHash, now]
      );
      return result.rows[0] === undefined ? undefined : toAccount(result.rows[0]);
    },

    async createSession(input) {
      await pool.query("SELECT app.create_auth_session_secure($1, $2, $3, $4)", [
        input.userId,
        input.tokenHash,
        input.expiresAt,
        input.deviceLabel
      ]);
    },

    async createMfaChallenge(input) {
      await pool.query("SELECT app.create_mfa_challenge($1, $2, $3, $4)", [
        input.userId,
        input.tokenHash,
        input.deviceLabel,
        input.expiresAt
      ]);
    },

    async findMfaChallenge(tokenHash, now) {
      const result = await pool.query<
        SecurityAccountRow & {
          device_label: string;
          attempts: number;
          expires_at: Date | string;
        }
      >(`SELECT * FROM app.find_mfa_challenge($1, $2)`, [tokenHash, now]);
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return Object.freeze({
        account: toAccount(row),
        deviceLabel: row.device_label,
        attempts: row.attempts,
        expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at)
      }) satisfies MfaChallenge;
    },

    async recordMfaFailure(tokenHash, maximumAttempts) {
      await pool.query("SELECT app.record_mfa_failure($1, $2)", [tokenHash, maximumAttempts]);
    },

    async consumeMfaChallenge(tokenHash) {
      await pool.query("SELECT app.consume_mfa_challenge($1)", [tokenHash]);
    },

    async setPendingMfaSecret(currentTokenHash, ciphertext) {
      const result = await pool.query<{ saved: boolean }>(
        "SELECT app.set_pending_mfa_secret($1, $2) AS saved",
        [currentTokenHash, ciphertext]
      );
      return result.rows[0]?.saved === true;
    },

    async enableMfa(currentTokenHash, recoveryCodeHashes) {
      const result = await pool.query<{ enabled: boolean }>(
        "SELECT app.enable_account_mfa($1, $2::text[]) AS enabled",
        [currentTokenHash, [...recoveryCodeHashes]]
      );
      return result.rows[0]?.enabled === true;
    },

    async consumeRecoveryCode(userId, codeHash) {
      const result = await pool.query<{ consumed: boolean }>(
        "SELECT app.consume_mfa_recovery_code($1, $2) AS consumed",
        [userId, codeHash]
      );
      return result.rows[0]?.consumed === true;
    },

    async disableMfa(currentTokenHash) {
      const result = await pool.query<{ disabled: boolean }>(
        "SELECT app.disable_account_mfa($1) AS disabled",
        [currentTokenHash]
      );
      return result.rows[0]?.disabled === true;
    },

    async listSessions(currentTokenHash, now) {
      const result = await pool.query<{
        session_id: string | number;
        device_label: string;
        created_at: Date | string;
        last_seen_at: Date | string;
        expires_at: Date | string;
        current: boolean;
      }>("SELECT * FROM app.list_account_sessions($1, $2)", [currentTokenHash, now]);
      return Object.freeze(
        result.rows.map((row) =>
          Object.freeze({
            sessionId: String(row.session_id),
            deviceLabel: row.device_label,
            createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
            lastSeenAt:
              row.last_seen_at instanceof Date ? row.last_seen_at : new Date(row.last_seen_at),
            expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
            current: row.current
          })
        )
      );
    },

    async revokeSession(currentTokenHash, sessionId) {
      if (!/^\d+$/u.test(sessionId)) return false;
      const result = await pool.query<{ revoked: boolean }>(
        "SELECT app.revoke_owned_auth_session($1, $2::bigint) AS revoked",
        [currentTokenHash, sessionId]
      );
      return result.rows[0]?.revoked === true;
    },

    async revokeOtherSessions(currentTokenHash) {
      await pool.query("SELECT app.revoke_other_auth_sessions($1)", [currentTokenHash]);
    }
  };
  return Object.freeze(store);
}

export function createPostgresAccountSecurity(
  pool: PoolLike,
  secretCipher: SecretCipher
): AccountSecurityService {
  return createAccountSecurityService(createPostgresAccountSecurityStore(pool), secretCipher);
}

export type { AccountActionPurpose };
