import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import {
  createTransactionalHostedCallLedger,
  validateHostedCallState,
  type HostedCallLedger,
  type HostedCallLedgerState
} from "./hosted-call-ledger.js";

/** Exclusivo de ensaios sintéticos no mesmo volume local; nunca é conectado ao startup. */
export function createSyntheticFileHostedCallLedger(
  options: Readonly<{
    directory: string;
    confirmation: "synthetic-only";
    environment?: NodeJS.ProcessEnv;
    now?: () => number;
  }>
): HostedCallLedger {
  const environment = options.environment ?? process.env;
  if (
    options.confirmation !== "synthetic-only" ||
    [environment.NODE_ENV, environment.APP_ENV].some(
      (value) => value?.trim().toLowerCase() === "production"
    )
  )
    throw new Error("O ledger de arquivo é exclusivo de ensaio sintético local.");
  const directory = resolve(options.directory);
  const file = join(directory, "synthetic-calls.json");
  return createTransactionalHostedCallLedger(async (_key, change) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const lockPath = join(directory, "synthetic-calls.lock");
    let lock;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        lock = await open(lockPath, "wx", 0o600);
        break;
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        if (!["EEXIST", "EPERM", "EACCES"].includes(String(code))) throw error;
        await new Promise((done) => setTimeout(done, 10));
      }
    }
    if (!lock) throw new Error("Ledger ocupado.");
    const temporary = join(directory, `${randomUUID()}.tmp`);
    try {
      let state: HostedCallLedgerState;
      try {
        if ((await stat(file)).size > 32 * 1024 * 1024) throw new Error("Ledger excedente.");
        const value: unknown = JSON.parse(await readFile(file, "utf8"));
        validateHostedCallState(value);
        state = value;
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
          throw error;
        state = { version: 1, lastSeenAt: 0, calls: [], daily: [] };
      }
      const result = change(state, options.now?.() ?? Date.now());
      validateHostedCallState(state);
      const serialized = JSON.stringify(state);
      if (Buffer.byteLength(serialized) > 32 * 1024 * 1024) throw new Error("Ledger excedente.");
      await writeFile(temporary, serialized, { flag: "wx", mode: 0o600, flush: true });
      await rename(temporary, file);
      return result;
    } finally {
      await rm(temporary, { force: true });
      await lock.close();
      await rm(lockPath);
    }
  });
}
