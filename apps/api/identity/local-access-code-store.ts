import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import {
  loginAttemptPolicy,
  reserveLoginAttempt,
  type LoginAttemptCounter
} from "../security/login-attempt-limit.js";
import {
  createAccessCodeService,
  type AccessCodeStore,
  type AccessCredential,
  type AccessSession
} from "./access-code.js";

type Vault = {
  credentials: AccessCredential[];
  sessions: AccessSession[];
  loginAttempts?: LoginAttemptCounter[];
};
const errorCode = (error: unknown): unknown =>
  error && typeof error === "object" && "code" in error ? error.code : undefined;

async function withFileLock<T>(file: string, operation: () => Promise<T>): Promise<T> {
  let lock;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      lock = await open(`${file}.lock`, "wx", 0o600);
      break;
    } catch (error) {
      // Windows também pode retornar EPERM/EACCES durante exclusão concorrente do lock.
      // A espera continua limitada: sem adquirir exclusividade, nenhuma gravação é permitida.
      const code = errorCode(error);
      if (code !== "EEXIST" && code !== "EPERM" && code !== "EACCES") throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  if (!lock) throw new Error("O armazenamento de acesso está ocupado. Tente novamente.");
  try {
    return await operation();
  } finally {
    await lock.close();
    await rm(`${file}.lock`);
  }
}

export function createLocalAccessCodeStore(directory: string): AccessCodeStore {
  const file = join(directory, "vault.json");
  async function read(): Promise<Vault> {
    try {
      const value: unknown = JSON.parse(await readFile(file, "utf8"));
      if (
        !value ||
        typeof value !== "object" ||
        !("credentials" in value) ||
        !("sessions" in value) ||
        !Array.isArray(value.credentials) ||
        !Array.isArray(value.sessions)
      )
        throw new Error("Cofre de acesso inválido.");
      const vault = value as Vault;
      if (vault.loginAttempts !== undefined) {
        if (
          !Array.isArray(vault.loginAttempts) ||
          vault.loginAttempts.length > 2 * loginAttemptPolicy.global + 1 ||
          new Set(vault.loginAttempts.map((row) => row?.key)).size !== vault.loginAttempts.length ||
          vault.loginAttempts.some(
            (row) =>
              !row ||
              !(row.key === "global" || /^[a-f0-9]{64}$/u.test(row.key)) ||
              !Number.isSafeInteger(row.count) ||
              row.count < 1 ||
              row.count >
                (row.key === "global" ? loginAttemptPolicy.global : loginAttemptPolicy.perOrigin) ||
              !Number.isSafeInteger(row.until) ||
              row.until < 0
          )
        )
          throw new Error("Contadores de acesso inválidos.");
      }
      for (const row of [...vault.credentials, ...vault.sessions]) {
        if (
          !row ||
          typeof row.userId !== "string" ||
          !row.userId ||
          typeof row.revision !== "string" ||
          !("codeHash" in row
            ? /^[a-f0-9]{64}$/u.test(row.codeHash)
            : /^[a-f0-9]{64}$/u.test(row.tokenHash))
        )
          throw new Error("Cofre de acesso inválido.");
      }
      return vault;
    } catch (error) {
      if (errorCode(error) === "ENOENT") return { credentials: [], sessions: [] };
      throw error;
    }
  }
  async function mutate<T>(change: (vault: Vault) => T): Promise<T> {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    return withFileLock(file, async () => {
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        const vault = await read();
        const result = change(vault);
        await writeFile(temporary, JSON.stringify(vault), { mode: 0o600, flush: true });
        await rename(temporary, file);
        return result;
      } finally {
        await rm(temporary, { force: true });
      }
    });
  }
  return {
    async consumeLoginAttempt(originHash, time) {
      return mutate((vault) => {
        const reservation = reserveLoginAttempt(vault.loginAttempts ?? [], originHash, time);
        vault.loginAttempts = reservation.counters;
        return reservation.decision;
      });
    },
    async findCredential(hash) {
      return (await read()).credentials.find((row) => row.codeHash === hash);
    },
    async findUserCredential(userId) {
      return (await read()).credentials.find((row) => row.userId === userId);
    },
    async provision(credential) {
      await mutate((vault) => {
        vault.credentials = [
          ...vault.credentials.filter((row) => row.userId !== credential.userId),
          credential
        ];
        vault.sessions = vault.sessions.filter((row) => row.userId !== credential.userId);
      });
    },
    async createSession(session) {
      await mutate((vault) => {
        if (
          !vault.credentials.some(
            (row) => row.userId === session.userId && row.revision === session.revision
          )
        )
          throw new Error("Credencial revogada.");
        vault.sessions.push(session);
      });
    },
    async resolveSession(hash) {
      const vault = await read();
      const session = vault.sessions.find((row) => row.tokenHash === hash);
      return (
        session &&
        vault.credentials.find(
          (row) => row.userId === session.userId && row.revision === session.revision
        )
      );
    },
    async revokeSession(hash) {
      await mutate((vault) => {
        vault.sessions = vault.sessions.filter((row) => row.tokenHash !== hash);
      });
    }
  };
}

export async function localAccessSecret(directory: string): Promise<string> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, "secret");
  return withFileLock(file, async () => {
    try {
      return (await readFile(file, "utf8")).trim();
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
    }
    const temporary = `${file}.${randomUUID()}.tmp`;
    const secret = randomBytes(32).toString("hex");
    try {
      await writeFile(temporary, secret, { flag: "wx", mode: 0o600, flush: true });
      await rename(temporary, file);
      return secret;
    } finally {
      await rm(temporary, { force: true });
    }
  });
}
export async function createLocalAccessCodeService(directory: string) {
  return createAccessCodeService(
    createLocalAccessCodeStore(directory),
    await localAccessSecret(directory)
  );
}
