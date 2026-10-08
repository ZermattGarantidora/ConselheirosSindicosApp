import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpStepSeconds = 30;
const totpDigits = 6;

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += base32Alphabet[(value << (5 - bits)) & 31];
  return result;
}

function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/gu, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of normalized) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error("Segredo TOTP inválido.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpAtCounter(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);
  return String(binary % 10 ** totpDigits).padStart(totpDigits, "0");
}

export function createTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function createTotpCode(secret: string, now = new Date()): string {
  return totpAtCounter(secret, Math.floor(now.getTime() / 1000 / totpStepSeconds));
}

export function verifyTotpCode(secret: string, code: string, now = new Date()): boolean {
  if (!/^\d{6}$/u.test(code)) return false;
  const counter = Math.floor(now.getTime() / 1000 / totpStepSeconds);
  const supplied = Buffer.from(code, "utf8");
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(totpAtCounter(secret, counter + offset), "utf8");
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) return true;
  }
  return false;
}

export function createTotpUri(
  input: Readonly<{
    secret: string;
    email: string;
    issuer?: string;
  }>
): string {
  const issuer = input.issuer?.trim() || "Alvitra";
  const label = `${issuer}:${input.email}`;
  const parameters = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(totpDigits),
    period: String(totpStepSeconds)
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${parameters.toString()}`;
}

export type SecretCipher = Readonly<{
  seal: (plaintext: string) => string;
  open: (ciphertext: string) => string;
}>;

export function createSecretCipher(encodedKey: string): SecretCipher {
  const trimmed = encodedKey.trim();
  const key = /^[a-f\d]{64}$/iu.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64url");
  if (key.length !== 32) {
    throw new Error("AUTH_ACCOUNT_SECRET_KEY deve representar exatamente 32 bytes.");
  }
  return Object.freeze({
    seal(plaintext) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `aesgcm$1$${iv.toString("base64url")}$${tag.toString("base64url")}$${encrypted.toString("base64url")}`;
    },
    open(ciphertext) {
      const parts = ciphertext.split("$");
      if (parts.length !== 5 || parts[0] !== "aesgcm" || parts[1] !== "1") {
        throw new Error("Segredo MFA cifrado em formato inválido.");
      }
      const iv = Buffer.from(parts[2] ?? "", "base64url");
      const tag = Buffer.from(parts[3] ?? "", "base64url");
      const encrypted = Buffer.from(parts[4] ?? "", "base64url");
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    }
  });
}

export function createRecoveryCodes(count = 8): readonly string[] {
  return Object.freeze(
    Array.from({ length: count }, () => {
      const value = randomBytes(8).toString("hex").toUpperCase();
      return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
    })
  );
}
