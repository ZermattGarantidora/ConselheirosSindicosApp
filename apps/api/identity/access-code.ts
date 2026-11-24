import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createUserId, type UserId } from "./authorized-condominium-context.js";
import type { LoginAttemptDecision } from "../security/login-attempt-limit.js";

export type AccessCredential = Readonly<{ userId: UserId; revision: string; codeHash: string }>;
export type AccessSession = Readonly<{ userId: UserId; revision: string; tokenHash: string }>;
export interface AccessCodeStore {
  consumeLoginAttempt(originHash: string, time: number): Promise<LoginAttemptDecision>;
  findCredential(codeHash: string): Promise<AccessCredential | undefined>;
  findUserCredential(userId: UserId): Promise<AccessCredential | undefined>;
  provision(credential: AccessCredential): Promise<void>;
  createSession(session: AccessSession): Promise<void>;
  resolveSession(tokenHash: string): Promise<AccessCredential | undefined>;
  revokeSession(tokenHash: string): Promise<void>;
}

export const accessCookieName = "alvitra_device";
export const accessCookieMaxAge = 400 * 24 * 60 * 60;
export const hashAccessSecret = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export function createAccessCodeService(store: AccessCodeStore, secret: string) {
  if (!/^[a-f0-9]{64}$/iu.test(secret))
    throw new Error("Segredo de acesso inválido: use 32 bytes em hexadecimal.");
  const key = Buffer.from(secret, "hex");
  const codeFor = (credential: Pick<AccessCredential, "userId" | "revision">): string =>
    createHmac("sha256", key)
      .update(JSON.stringify(["alvitra-access-v1", credential.userId, credential.revision]))
      .digest("hex")
      .slice(0, 32)
      .toUpperCase();
  const format = (code: string): string => code.match(/.{4}/gu)!.join("-");
  const validCredential = (credential: AccessCredential): boolean =>
    timingSafeEqual(
      Buffer.from(hashAccessSecret(codeFor(credential))),
      Buffer.from(credential.codeHash)
    );
  return {
    async consumeLoginAttempt(origin: string, time: Date): Promise<LoginAttemptDecision> {
      const originHash = createHmac("sha256", key)
        .update(JSON.stringify(["alvitra-login-limit-v1", origin]))
        .digest("hex");
      return store.consumeLoginAttempt(originHash, time.getTime());
    },
    async provision(userId: string): Promise<string> {
      const credential = { userId: createUserId(userId), revision: randomUUID(), codeHash: "" };
      const code = codeFor(credential);
      await store.provision({ ...credential, codeHash: hashAccessSecret(code) });
      return format(code);
    },
    async login(input: unknown): Promise<Readonly<{ userId: UserId; token: string }> | undefined> {
      if (typeof input !== "string" || input.length > 64 || !/^[a-f0-9\s-]+$/iu.test(input))
        return undefined;
      const code = input.replaceAll(/[\s-]/gu, "").toUpperCase();
      if (!/^[A-F0-9]{32}$/u.test(code)) return undefined;
      const credential = await store.findCredential(hashAccessSecret(code));
      if (!credential || !validCredential(credential)) return undefined;
      const token = randomBytes(32).toString("base64url");
      await store.createSession({
        userId: credential.userId,
        revision: credential.revision,
        tokenHash: hashAccessSecret(token)
      });
      return { userId: credential.userId, token };
    },
    async authenticate(token: string | undefined): Promise<AccessCredential | undefined> {
      if (!token || !/^[A-Za-z0-9_-]{43}$/u.test(token)) return undefined;
      const credential = await store.resolveSession(hashAccessSecret(token));
      return credential && validCredential(credential) ? credential : undefined;
    },
    async ownCode(credential: AccessCredential): Promise<string | undefined> {
      const current = await store.findUserCredential(credential.userId);
      return current?.revision === credential.revision && validCredential(current)
        ? format(codeFor(current))
        : undefined;
    },
    async logout(token: string | undefined): Promise<void> {
      if (token) await store.revokeSession(hashAccessSecret(token));
    }
  };
}
export type AccessCodeService = ReturnType<typeof createAccessCodeService>;

export function readAccessCookie(header: string | undefined): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${accessCookieName}=`))
    ?.slice(accessCookieName.length + 1);
}
export function accessCookie(token: string, secure: boolean): string {
  return `${accessCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token === "" ? 0 : accessCookieMaxAge}${secure ? "; Secure" : ""}`;
}
