import { randomUUID } from "node:crypto";

import {
  AccountAuthError,
  type AccountAuthService,
  type AccountCredentials,
  type PublicAccount
} from "./account-auth.js";
import {
  createAccountSecurityService,
  createEphemeralAccountSecretCipher,
  hashAccountSecurityToken,
  type AccountActionPurpose,
  type AccountSecurityStore,
  type ManagedSession,
  type SecureAccount
} from "./account-security.js";
import type { UserId } from "./authorized-condominium-context.js";

type StoredAction = Readonly<{
  userId: UserId;
  purpose: AccountActionPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

type StoredSession = Readonly<{
  id: string;
  userId: UserId;
  tokenHash: string;
  deviceLabel: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}>;

type StoredChallenge = Readonly<{
  userId: UserId;
  deviceLabel: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

function toPublic(account: SecureAccount): PublicAccount {
  return Object.freeze({
    userId: account.userId,
    email: account.email,
    displayName: account.displayName
  });
}

export function createInMemoryAccountSecurityBundle(): Readonly<{
  accountAuth: AccountAuthService;
  accountSecurity: ReturnType<typeof createAccountSecurityService>;
}> {
  const accounts = new Map<string, SecureAccount>();
  const actions = new Map<string, StoredAction>();
  const sessions = new Map<string, StoredSession>();
  const challenges = new Map<string, StoredChallenge>();
  const recoveryCodes = new Map<UserId, Map<string, boolean>>();

  function accountByUserId(userId: UserId): SecureAccount | undefined {
    return [...accounts.values()].find((account) => account.userId === userId);
  }

  function activeSession(tokenHash: string, now: Date): StoredSession | undefined {
    const session = sessions.get(tokenHash);
    return session !== undefined && session.revokedAt === null && session.expiresAt > now
      ? session
      : undefined;
  }

  const store: AccountSecurityStore = {
    async createAccount(account: AccountCredentials) {
      if (accounts.has(account.email)) {
        throw new AccountAuthError("email_taken", "Este e-mail já está cadastrado.");
      }
      accounts.set(
        account.email,
        Object.freeze({
          ...account,
          emailVerifiedAt: null,
          mfaSecretCiphertext: null,
          mfaEnabledAt: null
        })
      );
    },
    async findAccountByEmail(email) {
      return accounts.get(email);
    },
    async createAction(input) {
      for (const [hash, action] of actions) {
        if (action.userId === input.userId && action.purpose === input.purpose) {
          actions.set(hash, Object.freeze({ ...action, consumedAt: new Date() }));
        }
      }
      actions.set(
        input.tokenHash,
        Object.freeze({
          userId: input.userId,
          purpose: input.purpose,
          expiresAt: input.expiresAt,
          consumedAt: null
        })
      );
    },
    async confirmEmail(tokenHash, now) {
      const action = actions.get(tokenHash);
      if (
        action === undefined ||
        action.purpose !== "verify_email" ||
        action.consumedAt !== null ||
        action.expiresAt <= now
      ) {
        return false;
      }
      const account = accountByUserId(action.userId);
      if (account === undefined) return false;
      actions.set(tokenHash, Object.freeze({ ...action, consumedAt: now }));
      accounts.set(account.email, Object.freeze({ ...account, emailVerifiedAt: now }));
      return true;
    },
    async resetPassword(tokenHash, passwordHash, now) {
      const action = actions.get(tokenHash);
      if (
        action === undefined ||
        action.purpose !== "reset_password" ||
        action.consumedAt !== null ||
        action.expiresAt <= now
      ) {
        return false;
      }
      const account = accountByUserId(action.userId);
      if (account === undefined) return false;
      accounts.set(account.email, Object.freeze({ ...account, passwordHash }));
      for (const [hash, candidate] of actions) {
        if (candidate.userId === account.userId && candidate.purpose === "reset_password") {
          actions.set(hash, Object.freeze({ ...candidate, consumedAt: now }));
        }
      }
      for (const [hash, session] of sessions) {
        if (session.userId === account.userId) {
          sessions.set(hash, Object.freeze({ ...session, revokedAt: now }));
        }
      }
      return true;
    },
    async changePassword(input) {
      const session = activeSession(input.currentTokenHash, new Date());
      if (session === undefined) return false;
      const account = accountByUserId(session.userId);
      if (account === undefined) return false;
      accounts.set(account.email, Object.freeze({ ...account, passwordHash: input.passwordHash }));
      for (const [hash, candidate] of sessions) {
        if (candidate.userId === account.userId && hash !== input.currentTokenHash) {
          sessions.set(hash, Object.freeze({ ...candidate, revokedAt: new Date() }));
        }
      }
      return true;
    },
    async findAccountBySession(tokenHash, now) {
      const session = activeSession(tokenHash, now);
      if (session === undefined) return undefined;
      sessions.set(tokenHash, Object.freeze({ ...session, lastSeenAt: now }));
      return accountByUserId(session.userId);
    },
    async createSession(input) {
      const createdAt = new Date();
      sessions.set(
        input.tokenHash,
        Object.freeze({
          id: randomUUID(),
          userId: input.userId,
          tokenHash: input.tokenHash,
          deviceLabel: input.deviceLabel,
          createdAt,
          lastSeenAt: createdAt,
          expiresAt: input.expiresAt,
          revokedAt: null
        })
      );
    },
    async createMfaChallenge(input) {
      challenges.set(
        input.tokenHash,
        Object.freeze({
          userId: input.userId,
          deviceLabel: input.deviceLabel,
          attempts: 0,
          expiresAt: input.expiresAt,
          consumedAt: null
        })
      );
    },
    async findMfaChallenge(tokenHash, now) {
      const challenge = challenges.get(tokenHash);
      if (challenge === undefined || challenge.consumedAt !== null || challenge.expiresAt <= now) {
        return undefined;
      }
      const account = accountByUserId(challenge.userId);
      return account === undefined
        ? undefined
        : Object.freeze({
            account,
            deviceLabel: challenge.deviceLabel,
            attempts: challenge.attempts,
            expiresAt: challenge.expiresAt
          });
    },
    async recordMfaFailure(tokenHash, maximumAttempts) {
      const challenge = challenges.get(tokenHash);
      if (challenge === undefined) return;
      const attempts = challenge.attempts + 1;
      challenges.set(
        tokenHash,
        Object.freeze({
          ...challenge,
          attempts,
          consumedAt: attempts >= maximumAttempts ? new Date() : challenge.consumedAt
        })
      );
    },
    async consumeMfaChallenge(tokenHash) {
      const challenge = challenges.get(tokenHash);
      if (challenge !== undefined) {
        challenges.set(tokenHash, Object.freeze({ ...challenge, consumedAt: new Date() }));
      }
    },
    async setPendingMfaSecret(currentTokenHash, ciphertext) {
      const session = activeSession(currentTokenHash, new Date());
      const account = session === undefined ? undefined : accountByUserId(session.userId);
      if (account === undefined) return false;
      accounts.set(
        account.email,
        Object.freeze({ ...account, mfaSecretCiphertext: ciphertext, mfaEnabledAt: null })
      );
      recoveryCodes.delete(account.userId);
      return true;
    },
    async enableMfa(currentTokenHash, recoveryCodeHashes) {
      const session = activeSession(currentTokenHash, new Date());
      const account = session === undefined ? undefined : accountByUserId(session.userId);
      if (account === undefined || account.mfaSecretCiphertext === null) return false;
      accounts.set(account.email, Object.freeze({ ...account, mfaEnabledAt: new Date() }));
      recoveryCodes.set(
        account.userId,
        new Map(recoveryCodeHashes.map((hash) => [hash, false] as const))
      );
      return true;
    },
    async consumeRecoveryCode(userId, codeHash) {
      const codes = recoveryCodes.get(userId);
      if (codes === undefined || codes.get(codeHash) !== false) return false;
      codes.set(codeHash, true);
      return true;
    },
    async disableMfa(currentTokenHash) {
      const session = activeSession(currentTokenHash, new Date());
      const account = session === undefined ? undefined : accountByUserId(session.userId);
      if (account === undefined) return false;
      accounts.set(
        account.email,
        Object.freeze({ ...account, mfaSecretCiphertext: null, mfaEnabledAt: null })
      );
      recoveryCodes.delete(account.userId);
      return true;
    },
    async listSessions(currentTokenHash, now) {
      const currentSession = activeSession(currentTokenHash, now);
      if (currentSession === undefined) return [];
      return Object.freeze(
        [...sessions.values()]
          .filter(
            (session) =>
              session.userId === currentSession.userId &&
              session.revokedAt === null &&
              session.expiresAt > now
          )
          .map((session): ManagedSession =>
            Object.freeze({
              sessionId: session.id,
              deviceLabel: session.deviceLabel,
              createdAt: session.createdAt,
              lastSeenAt: session.lastSeenAt,
              expiresAt: session.expiresAt,
              current: session.tokenHash === currentTokenHash
            })
          )
      );
    },
    async revokeSession(currentTokenHash, sessionId) {
      const currentSession = activeSession(currentTokenHash, new Date());
      if (currentSession === undefined) return false;
      const entry = [...sessions.entries()].find(
        ([, session]) => session.id === sessionId && session.userId === currentSession.userId
      );
      if (entry === undefined) return false;
      sessions.set(entry[0], Object.freeze({ ...entry[1], revokedAt: new Date() }));
      return true;
    },
    async revokeOtherSessions(currentTokenHash) {
      const currentSession = activeSession(currentTokenHash, new Date());
      if (currentSession === undefined) return;
      for (const [hash, session] of sessions) {
        if (session.userId === currentSession.userId && hash !== currentTokenHash) {
          sessions.set(hash, Object.freeze({ ...session, revokedAt: new Date() }));
        }
      }
    }
  };

  const accountSecurity = createAccountSecurityService(store, createEphemeralAccountSecretCipher());
  const accountAuth: AccountAuthService = {
    async register() {
      throw new AccountAuthError("invalid_input", "Use o cadastro com verificação de e-mail.");
    },
    async login(input) {
      const result = await accountSecurity.login({ ...input, deviceLabel: "Navegador" });
      if (result.mfaRequired) {
        throw new AccountAuthError("invalid_mfa", "O segundo fator é obrigatório.");
      }
      return { account: result.account, token: result.token, expiresAt: result.expiresAt };
    },
    async loginWithGoogle() {
      throw new AccountAuthError("invalid_credentials", "Login Google indisponível neste teste.");
    },
    async authenticate(token, now = new Date()) {
      const account = await store.findAccountBySession(hashAccountSecurityToken(token), now);
      return account === undefined ? undefined : toPublic(account);
    },
    async logout(token) {
      const hash = hashAccountSecurityToken(token);
      const session = sessions.get(hash);
      if (session !== undefined) {
        sessions.set(hash, Object.freeze({ ...session, revokedAt: new Date() }));
      }
    }
  };

  return Object.freeze({ accountAuth, accountSecurity });
}
