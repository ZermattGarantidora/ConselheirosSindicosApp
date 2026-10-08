import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  AccountAuthError,
  accountSessionTtlMs,
  hashAccountPassword,
  normalizeAccountDisplayName,
  normalizeAccountEmail,
  validateAccountPassword,
  verifyAccountPassword,
  type AccountCredentials,
  type PublicAccount
} from "./account-auth.js";
import {
  createRecoveryCodes,
  createSecretCipher,
  createTotpSecret,
  createTotpUri,
  verifyTotpCode,
  type SecretCipher
} from "./account-security-crypto.js";
import { createUserId, type UserId } from "./authorized-condominium-context.js";

const verificationTtlMs = 24 * 60 * 60 * 1000;
const passwordResetTtlMs = 30 * 60 * 1000;
const mfaChallengeTtlMs = 5 * 60 * 1000;
const maximumMfaAttempts = 5;

export type AccountActionPurpose = "verify_email" | "reset_password";

export type AccountAction = Readonly<{
  purpose: AccountActionPurpose;
  email: string;
  token: string;
  expiresAt: Date;
}>;

export type ManagedSession = Readonly<{
  sessionId: string;
  deviceLabel: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  current: boolean;
}>;

export type SecureAccount = AccountCredentials &
  Readonly<{
    emailVerifiedAt: Date | null;
    mfaSecretCiphertext: string | null;
    mfaEnabledAt: Date | null;
  }>;

export type MfaChallenge = Readonly<{
  account: SecureAccount;
  deviceLabel: string;
  attempts: number;
  expiresAt: Date;
}>;

export interface AccountSecurityStore {
  createAccount(account: AccountCredentials): Promise<void>;
  findAccountByEmail(email: string): Promise<SecureAccount | undefined>;
  createAction(
    input: Readonly<{
      userId: UserId;
      purpose: AccountActionPurpose;
      tokenHash: string;
      expiresAt: Date;
    }>
  ): Promise<void>;
  confirmEmail(tokenHash: string, now: Date): Promise<boolean>;
  resetPassword(tokenHash: string, passwordHash: string, now: Date): Promise<boolean>;
  changePassword(
    input: Readonly<{
      currentTokenHash: string;
      passwordHash: string;
    }>
  ): Promise<boolean>;
  findAccountBySession(tokenHash: string, now: Date): Promise<SecureAccount | undefined>;
  createSession(
    input: Readonly<{
      userId: UserId;
      tokenHash: string;
      expiresAt: Date;
      deviceLabel: string;
    }>
  ): Promise<void>;
  createMfaChallenge(
    input: Readonly<{
      userId: UserId;
      tokenHash: string;
      deviceLabel: string;
      expiresAt: Date;
    }>
  ): Promise<void>;
  findMfaChallenge(tokenHash: string, now: Date): Promise<MfaChallenge | undefined>;
  recordMfaFailure(tokenHash: string, maximumAttempts: number): Promise<void>;
  consumeMfaChallenge(tokenHash: string): Promise<void>;
  setPendingMfaSecret(currentTokenHash: string, ciphertext: string): Promise<boolean>;
  enableMfa(currentTokenHash: string, recoveryCodeHashes: readonly string[]): Promise<boolean>;
  consumeRecoveryCode(userId: UserId, codeHash: string): Promise<boolean>;
  disableMfa(currentTokenHash: string): Promise<boolean>;
  listSessions(currentTokenHash: string, now: Date): Promise<readonly ManagedSession[]>;
  revokeSession(currentTokenHash: string, sessionId: string): Promise<boolean>;
  revokeOtherSessions(currentTokenHash: string): Promise<void>;
}

export type SecureLoginResult =
  | Readonly<{
      mfaRequired: false;
      account: PublicAccount;
      token: string;
      expiresAt: Date;
    }>
  | Readonly<{
      mfaRequired: true;
      challengeId: string;
      expiresAt: Date;
    }>;

export interface AccountSecurityService {
  register(
    input: Readonly<{
      displayName: string;
      email: string;
      password: string;
    }>
  ): Promise<Readonly<{ account: PublicAccount; action: AccountAction }>>;
  requestEmailVerification(email: string): Promise<AccountAction | undefined>;
  confirmEmail(token: string, now?: Date): Promise<void>;
  requestPasswordReset(email: string): Promise<AccountAction | undefined>;
  resetPassword(token: string, password: string, now?: Date): Promise<void>;
  changePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string,
    now?: Date
  ): Promise<void>;
  login(
    input: Readonly<{ email: string; password: string; deviceLabel: string }>,
    now?: Date
  ): Promise<SecureLoginResult>;
  completeMfaChallenge(
    challengeId: string,
    code: string,
    now?: Date
  ): Promise<Extract<SecureLoginResult, { mfaRequired: false }>>;
  beginMfaSetup(
    sessionToken: string,
    now?: Date
  ): Promise<Readonly<{ secret: string; uri: string }>>;
  enableMfa(
    sessionToken: string,
    code: string,
    now?: Date
  ): Promise<Readonly<{ recoveryCodes: readonly string[] }>>;
  disableMfa(sessionToken: string, password: string, code: string, now?: Date): Promise<void>;
  getStatus(
    sessionToken: string,
    now?: Date
  ): Promise<Readonly<{ emailVerified: boolean; mfaEnabled: boolean }>>;
  listSessions(sessionToken: string, now?: Date): Promise<readonly ManagedSession[]>;
  revokeSession(
    sessionToken: string,
    sessionId: string
  ): Promise<Readonly<{ currentRevoked: boolean }>>;
  revokeOtherSessions(sessionToken: string): Promise<void>;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeToken(token: string): string {
  const normalized = token.trim();
  if (normalized.length < 32 || normalized.length > 512) {
    throw new AccountAuthError("invalid_token", "O link é inválido ou expirou.");
  }
  return normalized;
}

function normalizeDeviceLabel(label: string): string {
  const normalized = label.trim().replace(/\s+/gu, " ");
  return normalized.length === 0 ? "Navegador" : normalized.slice(0, 80);
}

function publicAccount(account: SecureAccount | AccountCredentials): PublicAccount {
  return Object.freeze({
    userId: account.userId,
    email: account.email,
    displayName: account.displayName
  });
}

function actionToken(): string {
  return randomBytes(32).toString("base64url");
}

function recoveryCodeHash(code: string): string {
  return hashToken(code.replace(/[^A-F\d]/giu, "").toUpperCase());
}

export function createAccountSecurityService(
  store: AccountSecurityStore,
  secretCipher: SecretCipher
): AccountSecurityService {
  async function createAction(
    account: SecureAccount | AccountCredentials,
    purpose: AccountActionPurpose,
    ttlMs: number,
    now = new Date()
  ): Promise<AccountAction> {
    const token = actionToken();
    const expiresAt = new Date(now.getTime() + ttlMs);
    await store.createAction({
      userId: account.userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt
    });
    return Object.freeze({ purpose, email: account.email, token, expiresAt });
  }

  async function issueSession(
    account: SecureAccount,
    deviceLabel: string,
    now: Date
  ): Promise<Extract<SecureLoginResult, { mfaRequired: false }>> {
    const token = actionToken();
    const expiresAt = new Date(now.getTime() + accountSessionTtlMs);
    await store.createSession({
      userId: account.userId,
      tokenHash: hashToken(token),
      expiresAt,
      deviceLabel: normalizeDeviceLabel(deviceLabel)
    });
    return Object.freeze({ mfaRequired: false, account: publicAccount(account), token, expiresAt });
  }

  async function requireSession(sessionToken: string, now: Date): Promise<SecureAccount> {
    const account = await store.findAccountBySession(hashToken(normalizeToken(sessionToken)), now);
    if (account === undefined) {
      throw new AccountAuthError("invalid_credentials", "Sessão não autenticada.");
    }
    return account;
  }

  async function verifySecondFactor(
    account: SecureAccount,
    code: string,
    now: Date
  ): Promise<boolean> {
    if (account.mfaSecretCiphertext === null || account.mfaEnabledAt === null) return false;
    const normalized = code.trim();
    const secret = secretCipher.open(account.mfaSecretCiphertext);
    if (verifyTotpCode(secret, normalized, now)) return true;
    return store.consumeRecoveryCode(account.userId, recoveryCodeHash(normalized));
  }

  const service: AccountSecurityService = {
    async register(input) {
      const email = normalizeAccountEmail(input.email);
      const displayName = normalizeAccountDisplayName(input.displayName);
      const passwordHash = await hashAccountPassword(validateAccountPassword(input.password));
      const userId = createUserId(randomUUID());
      const account: AccountCredentials = Object.freeze({
        userId,
        authSubject: userId,
        email,
        displayName,
        passwordHash,
        googleSubject: null,
        status: "active"
      });
      await store.createAccount(account);
      return Object.freeze({
        account: publicAccount(account),
        action: await createAction(account, "verify_email", verificationTtlMs)
      });
    },

    async requestEmailVerification(email) {
      let normalized: string;
      try {
        normalized = normalizeAccountEmail(email);
      } catch {
        return undefined;
      }
      const account = await store.findAccountByEmail(normalized);
      if (
        account === undefined ||
        account.passwordHash === null ||
        account.emailVerifiedAt !== null ||
        account.status !== "active"
      ) {
        return undefined;
      }
      return createAction(account, "verify_email", verificationTtlMs);
    },

    async confirmEmail(token, now = new Date()) {
      const confirmed = await store.confirmEmail(hashToken(normalizeToken(token)), now);
      if (!confirmed) throw new AccountAuthError("invalid_token", "O link é inválido ou expirou.");
    },

    async requestPasswordReset(email) {
      let normalized: string;
      try {
        normalized = normalizeAccountEmail(email);
      } catch {
        return undefined;
      }
      const account = await store.findAccountByEmail(normalized);
      if (
        account === undefined ||
        account.passwordHash === null ||
        account.emailVerifiedAt === null ||
        account.status !== "active"
      ) {
        return undefined;
      }
      return createAction(account, "reset_password", passwordResetTtlMs);
    },

    async resetPassword(token, password, now = new Date()) {
      const passwordHash = await hashAccountPassword(validateAccountPassword(password));
      const reset = await store.resetPassword(hashToken(normalizeToken(token)), passwordHash, now);
      if (!reset) throw new AccountAuthError("invalid_token", "O link é inválido ou expirou.");
    },

    async changePassword(sessionToken, currentPassword, newPassword, now = new Date()) {
      const normalizedToken = normalizeToken(sessionToken);
      const account = await requireSession(normalizedToken, now);
      if (!(await verifyAccountPassword(currentPassword, account.passwordHash))) {
        throw new AccountAuthError("invalid_credentials", "A senha atual está incorreta.");
      }
      const passwordHash = await hashAccountPassword(validateAccountPassword(newPassword));
      const changed = await store.changePassword({
        currentTokenHash: hashToken(normalizedToken),
        passwordHash
      });
      if (!changed) throw new AccountAuthError("invalid_credentials", "Sessão não autenticada.");
    },

    async login(input, now = new Date()) {
      const account = await store.findAccountByEmail(normalizeAccountEmail(input.email));
      const password = validateAccountPassword(input.password);
      if (
        account === undefined ||
        account.status !== "active" ||
        !(await verifyAccountPassword(password, account.passwordHash))
      ) {
        throw new AccountAuthError("invalid_credentials", "E-mail ou senha inválidos.");
      }
      if (account.emailVerifiedAt === null) {
        throw new AccountAuthError("email_unverified", "Confirme seu e-mail antes de entrar.");
      }
      if (account.mfaEnabledAt === null || account.mfaSecretCiphertext === null) {
        return issueSession(account, input.deviceLabel, now);
      }
      const challengeId = actionToken();
      const expiresAt = new Date(now.getTime() + mfaChallengeTtlMs);
      await store.createMfaChallenge({
        userId: account.userId,
        tokenHash: hashToken(challengeId),
        deviceLabel: normalizeDeviceLabel(input.deviceLabel),
        expiresAt
      });
      return Object.freeze({ mfaRequired: true, challengeId, expiresAt });
    },

    async completeMfaChallenge(challengeId, code, now = new Date()) {
      const tokenHash = hashToken(normalizeToken(challengeId));
      const challenge = await store.findMfaChallenge(tokenHash, now);
      if (challenge === undefined || challenge.attempts >= maximumMfaAttempts) {
        throw new AccountAuthError("invalid_mfa", "O código é inválido ou expirou.");
      }
      if (!(await verifySecondFactor(challenge.account, code, now))) {
        await store.recordMfaFailure(tokenHash, maximumMfaAttempts);
        throw new AccountAuthError("invalid_mfa", "O código é inválido ou expirou.");
      }
      await store.consumeMfaChallenge(tokenHash);
      return issueSession(challenge.account, challenge.deviceLabel, now);
    },

    async beginMfaSetup(sessionToken, now = new Date()) {
      const normalizedToken = normalizeToken(sessionToken);
      const account = await requireSession(normalizedToken, now);
      if (account.mfaEnabledAt !== null && account.mfaSecretCiphertext !== null) {
        throw new AccountAuthError("invalid_mfa", "O MFA já está ativo nesta conta.");
      }
      const secret = createTotpSecret();
      const saved = await store.setPendingMfaSecret(
        hashToken(normalizedToken),
        secretCipher.seal(secret)
      );
      if (!saved) throw new AccountAuthError("invalid_credentials", "Sessão não autenticada.");
      return Object.freeze({ secret, uri: createTotpUri({ secret, email: account.email }) });
    },

    async enableMfa(sessionToken, code, now = new Date()) {
      const normalizedToken = normalizeToken(sessionToken);
      const account = await requireSession(normalizedToken, now);
      if (account.mfaSecretCiphertext === null) {
        throw new AccountAuthError("invalid_mfa", "Inicie a configuração do autenticador.");
      }
      const secret = secretCipher.open(account.mfaSecretCiphertext);
      if (!verifyTotpCode(secret, code.trim(), now)) {
        throw new AccountAuthError("invalid_mfa", "O código do autenticador é inválido.");
      }
      const recoveryCodes = createRecoveryCodes();
      const enabled = await store.enableMfa(
        hashToken(normalizedToken),
        recoveryCodes.map(recoveryCodeHash)
      );
      if (!enabled) throw new AccountAuthError("invalid_credentials", "Sessão não autenticada.");
      await store.revokeOtherSessions(hashToken(normalizedToken));
      return Object.freeze({ recoveryCodes });
    },

    async disableMfa(sessionToken, password, code, now = new Date()) {
      const normalizedToken = normalizeToken(sessionToken);
      const account = await requireSession(normalizedToken, now);
      if (!(await verifyAccountPassword(password, account.passwordHash))) {
        throw new AccountAuthError("invalid_credentials", "A senha atual está incorreta.");
      }
      if (!(await verifySecondFactor(account, code, now))) {
        throw new AccountAuthError("invalid_mfa", "O código é inválido.");
      }
      const disabled = await store.disableMfa(hashToken(normalizedToken));
      if (!disabled) throw new AccountAuthError("invalid_credentials", "Sessão não autenticada.");
      await store.revokeOtherSessions(hashToken(normalizedToken));
    },

    async getStatus(sessionToken, now = new Date()) {
      const account = await requireSession(sessionToken, now);
      return Object.freeze({
        emailVerified: account.emailVerifiedAt !== null,
        mfaEnabled: account.mfaEnabledAt !== null && account.mfaSecretCiphertext !== null
      });
    },

    async listSessions(sessionToken, now = new Date()) {
      return store.listSessions(hashToken(normalizeToken(sessionToken)), now);
    },

    async revokeSession(sessionToken, sessionId) {
      const currentTokenHash = hashToken(normalizeToken(sessionToken));
      const current = (await store.listSessions(currentTokenHash, new Date())).find(
        (session) => session.sessionId === sessionId
      );
      if (current === undefined) {
        throw new AccountAuthError("invalid_token", "Sessão não encontrada.");
      }
      const revoked = await store.revokeSession(currentTokenHash, sessionId);
      if (!revoked) throw new AccountAuthError("invalid_token", "Sessão não encontrada.");
      return Object.freeze({ currentRevoked: current.current });
    },

    async revokeOtherSessions(sessionToken) {
      await store.revokeOtherSessions(hashToken(normalizeToken(sessionToken)));
    }
  };
  return Object.freeze(service);
}

export function createAccountSecretCipherFromEnvironment(
  environment: NodeJS.ProcessEnv
): SecretCipher {
  const key = environment.AUTH_ACCOUNT_SECRET_KEY?.trim();
  if (key === undefined || key.length === 0) {
    throw new Error(
      "AUTH_ACCOUNT_SECRET_KEY é obrigatória no modo persistente para proteger segredos MFA."
    );
  }
  return createSecretCipher(key);
}

export function createEphemeralAccountSecretCipher(): SecretCipher {
  return createSecretCipher(randomBytes(32).toString("base64url"));
}

export { hashToken as hashAccountSecurityToken, normalizeDeviceLabel };
