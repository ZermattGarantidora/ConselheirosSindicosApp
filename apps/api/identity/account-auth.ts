import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

import { createUserId, type UserId } from "./authorized-condominium-context.js";

const scrypt = promisify(scryptCallback);
const passwordSaltBytes = 16;
const passwordKeyBytes = 64;
const sessionTokenBytes = 32;
export const accountSessionCookie = "conselheiro_session";
export const accountSessionTtlMs = 1000 * 60 * 60 * 24 * 30;

type AccountCredentials = Readonly<{
  userId: UserId;
  authSubject: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  googleSubject?: string | null;
  status: "active" | "blocked" | "deleted";
}>;

type GoogleAccountInput = Readonly<{
  subject: string;
  email: string;
  displayName: string;
}>;

export type PublicAccount = Readonly<{
  userId: UserId;
  email: string;
  displayName: string;
}>;

export type AccountAuthSession = Readonly<{
  account: PublicAccount;
  token: string;
  expiresAt: Date;
}>;

export class AccountAuthError extends Error {
  public constructor(
    public readonly code: "invalid_input" | "email_taken" | "invalid_credentials",
    message: string
  ) {
    super(message);
    this.name = "AccountAuthError";
  }
}

interface AccountAuthStore {
  createAccount(account: AccountCredentials): Promise<void>;
  findAccountByEmail(email: string): Promise<AccountCredentials | undefined>;
  findOrCreateGoogleAccount(
    input: Readonly<{
      userId: UserId;
      authSubject: string;
      googleSubject: string;
      email: string;
      displayName: string;
    }>
  ): Promise<AccountCredentials>;
  createSession(
    input: Readonly<{ userId: UserId; tokenHash: string; expiresAt: Date }>
  ): Promise<void>;
  findSession(tokenHash: string, now: Date): Promise<PublicAccount | undefined>;
  revokeSession(tokenHash: string): Promise<void>;
}

export interface AccountAuthService {
  register(
    input: Readonly<{ displayName: string; email: string; password: string }>
  ): Promise<AccountAuthSession>;
  login(input: Readonly<{ email: string; password: string }>): Promise<AccountAuthSession>;
  loginWithGoogle(input: GoogleAccountInput): Promise<AccountAuthSession>;
  authenticate(token: string, now?: Date): Promise<PublicAccount | undefined>;
  logout(token: string): Promise<void>;
}

function normalizeEmail(input: string): string {
  const email = input.trim().toLocaleLowerCase("en-US");
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new AccountAuthError("invalid_input", "Informe um e-mail válido.");
  }
  return email;
}

function normalizeDisplayName(input: string): string {
  const displayName = input.trim();
  if (displayName.length < 2 || displayName.length > 120) {
    throw new AccountAuthError("invalid_input", "O nome deve ter entre 2 e 120 caracteres.");
  }
  return displayName;
}

function validatePassword(input: string): string {
  if (input.length < 12 || input.length > 200) {
    throw new AccountAuthError("invalid_input", "A senha deve ter entre 12 e 200 caracteres.");
  }
  return input;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(passwordSaltBytes);
  const derivedKey = (await scrypt(password, salt, passwordKeyBytes)) as Buffer;
  return `scrypt$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password: string, encodedHash: string | null): Promise<boolean> {
  if (encodedHash === null) return false;
  const parts = encodedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "1") return false;

  try {
    const salt = Buffer.from(parts[2] ?? "", "base64url");
    const expected = Buffer.from(parts[3] ?? "", "base64url");
    if (salt.length !== passwordSaltBytes || expected.length !== passwordKeyBytes) return false;
    const actual = (await scrypt(password, salt, passwordKeyBytes)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function toPublicAccount(account: AccountCredentials): PublicAccount {
  return Object.freeze({
    userId: account.userId,
    email: account.email,
    displayName: account.displayName
  });
}

function createSessionToken(): string {
  return randomBytes(sessionTokenBytes).toString("base64url");
}

export function createAccountAuthService(store: AccountAuthStore): AccountAuthService {
  async function issueSession(account: AccountCredentials): Promise<AccountAuthSession> {
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + accountSessionTtlMs);
    await store.createSession({
      userId: account.userId,
      tokenHash: hashSessionToken(token),
      expiresAt
    });
    return Object.freeze({ account: toPublicAccount(account), token, expiresAt });
  }

  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      const displayName = normalizeDisplayName(input.displayName);
      const password = validatePassword(input.password);
      const passwordHash = await hashPassword(password);
      const userId = createUserId(randomUUID());
      const account = Object.freeze({
        userId,
        authSubject: userId,
        email,
        displayName,
        passwordHash,
        status: "active" as const
      });

      try {
        await store.createAccount(account);
      } catch (error: unknown) {
        if (error instanceof AccountAuthError && error.code === "email_taken") throw error;
        throw error;
      }
      return issueSession(account);
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const password = validatePassword(input.password);
      const account = await store.findAccountByEmail(email);
      if (
        account === undefined ||
        account.status !== "active" ||
        !(await verifyPassword(password, account.passwordHash))
      ) {
        throw new AccountAuthError("invalid_credentials", "E-mail ou senha inválidos.");
      }
      return issueSession(account);
    },

    async loginWithGoogle(input) {
      const subject = input.subject.trim();
      if (subject.length === 0 || subject.length > 255) {
        throw new AccountAuthError("invalid_input", "Não foi possível validar a conta Google.");
      }
      const email = normalizeEmail(input.email);
      const displayName = normalizeDisplayName(input.displayName);
      const account = await store.findOrCreateGoogleAccount({
        userId: createUserId(randomUUID()),
        authSubject: `google:${subject}`,
        googleSubject: subject,
        email,
        displayName
      });
      if (account.status !== "active") {
        throw new AccountAuthError("invalid_credentials", "A conta não está disponível.");
      }
      return issueSession(account);
    },

    async authenticate(token, now = new Date()) {
      const normalizedToken = token.trim();
      if (normalizedToken.length === 0) return undefined;
      return store.findSession(hashSessionToken(normalizedToken), now);
    },

    async logout(token) {
      const normalizedToken = token.trim();
      if (normalizedToken.length > 0) await store.revokeSession(hashSessionToken(normalizedToken));
    }
  };
}

type InMemorySession = Readonly<{
  userId: UserId;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}>;

export function createInMemoryAccountAuth(): AccountAuthService {
  const accounts = new Map<string, AccountCredentials>();
  const sessions = new Map<string, InMemorySession>();

  const store: AccountAuthStore = {
    async createAccount(account) {
      if (accounts.has(account.email)) {
        throw new AccountAuthError("email_taken", "Este e-mail já está cadastrado.");
      }
      accounts.set(account.email, account);
    },
    async findAccountByEmail(email) {
      return accounts.get(email);
    },
    async findOrCreateGoogleAccount(input) {
      const byGoogleSubject = [...accounts.values()].find(
        (candidate) => candidate.googleSubject === input.googleSubject
      );
      if (byGoogleSubject !== undefined) return byGoogleSubject;

      const byEmail = accounts.get(input.email);
      if (byEmail !== undefined) {
        const linked = Object.freeze({ ...byEmail, googleSubject: input.googleSubject });
        accounts.set(input.email, linked);
        return linked;
      }

      const created = Object.freeze({
        userId: input.userId,
        authSubject: input.authSubject,
        email: input.email,
        displayName: input.displayName,
        passwordHash: null,
        googleSubject: input.googleSubject,
        status: "active" as const
      });
      accounts.set(input.email, created);
      return created;
    },
    async createSession(input) {
      sessions.set(input.tokenHash, Object.freeze({ ...input, revoked: false }));
    },
    async findSession(tokenHash, now) {
      const session = sessions.get(tokenHash);
      if (session === undefined || session.revoked || session.expiresAt <= now) {
        return undefined;
      }
      const account = [...accounts.values()].find(
        (candidate) => candidate.userId === session.userId
      );
      return account === undefined || account.status !== "active"
        ? undefined
        : toPublicAccount(account);
    },
    async revokeSession(tokenHash) {
      const session = sessions.get(tokenHash);
      if (session !== undefined)
        sessions.set(tokenHash, Object.freeze({ ...session, revoked: true }));
    }
  };

  return createAccountAuthService(store);
}

export function getAccountSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== accountSessionCookie) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function serializeAccountSessionCookie(token: string, secure: boolean): string {
  const attributes = [
    `${accountSessionCookie}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(accountSessionTtlMs / 1000)}`
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function serializeClearedAccountSessionCookie(secure: boolean): string {
  const attributes = [
    `${accountSessionCookie}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export type { AccountAuthStore, AccountCredentials };
