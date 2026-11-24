import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { HostedCallKey } from "./hosted-call-ledger.js";

export type DocumentPurgeDecision = Readonly<{
  condominiumId: string;
  documentId: string;
  documentVersionIds: readonly string[];
  archivedAt: string;
}>;
export type DocumentDispatchDecision = Readonly<{
  key: HostedCallKey;
  ownerSha256: string;
  resultSha256?: string;
}>;
export type DocumentRecoverySnapshot = Readonly<{
  version: 1;
  journalId: string;
  purges: readonly DocumentPurgeDecision[];
  calls: readonly DocumentDispatchDecision[];
}>;
export interface DocumentRecoveryJournal {
  initialize(): Promise<void>;
  read(): Promise<DocumentRecoverySnapshot>;
  recordPurge(decision: DocumentPurgeDecision): Promise<void>;
  recordDispatch(key: HostedCallKey, owner: string): Promise<void>;
  recordCompletion(key: HostedCallKey, owner: string, resultSha256: string): Promise<void>;
}
export class DocumentRecoveryError extends Error {
  constructor() {
    super("O ciclo documental está em quarentena ou indisponível.");
    this.name = "DocumentRecoveryError";
  }
}
export const recoveryDigest = (value: string) => createHash("sha256").update(value).digest("hex");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const hash = /^[a-f0-9]{64}$/u;
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const sameKey = (left: HostedCallKey, right: HostedCallKey) =>
  left.condominiumId === right.condominiumId && left.requestHash === right.requestHash;
function validate(snapshot: DocumentRecoverySnapshot, journalId: string) {
  if (
    snapshot?.version !== 1 ||
    !exact(snapshot, ["version", "journalId", "purges", "calls"]) ||
    snapshot.journalId !== journalId ||
    !uuid.test(journalId) ||
    !Array.isArray(snapshot.purges) ||
    !Array.isArray(snapshot.calls) ||
    snapshot.purges.length > 10_000 ||
    snapshot.calls.length > 10_000 ||
    new Set(snapshot.purges.map((row) => `${row?.condominiumId}:${row?.documentId}`)).size !==
      snapshot.purges.length ||
    new Set(snapshot.calls.map((row) => `${row?.key?.condominiumId}:${row?.key?.requestHash}`))
      .size !== snapshot.calls.length ||
    snapshot.purges.some(
      (row) =>
        !row ||
        !exact(row, ["condominiumId", "documentId", "documentVersionIds", "archivedAt"]) ||
        !uuid.test(row.condominiumId) ||
        !uuid.test(row.documentId) ||
        !Array.isArray(row.documentVersionIds) ||
        !row.documentVersionIds.length ||
        row.documentVersionIds.length > 100 ||
        row.documentVersionIds.some((id: string) => !uuid.test(id)) ||
        !Number.isFinite(Date.parse(row.archivedAt)) ||
        new Date(row.archivedAt).toISOString() !== row.archivedAt
    ) ||
    snapshot.calls.some(
      (row) =>
        !row ||
        !row.key ||
        !exact(row, ["key", "ownerSha256", "resultSha256"]) ||
        !exact(row.key, ["condominiumId", "requestHash", "policyRevision", "documentVersionIds"]) ||
        !uuid.test(row.key.condominiumId) ||
        !hash.test(row.key.requestHash) ||
        !hash.test(row.ownerSha256) ||
        typeof row.key.policyRevision !== "string" ||
        !row.key.policyRevision.trim() ||
        row.key.policyRevision.length > 160 ||
        !Array.isArray(row.key.documentVersionIds) ||
        row.key.documentVersionIds.length > 50 ||
        row.key.documentVersionIds.some((id: string) => !uuid.test(id)) ||
        (row.resultSha256 !== undefined && !hash.test(row.resultSha256))
    )
  )
    throw new DocumentRecoveryError();
}

/** Private synthetic volume OUTSIDE the application dump. Never connected by startup. */
export function createSyntheticDocumentRecoveryJournal(options: {
  directory: string;
  journalId: string;
  confirmation: "synthetic-only";
  environment?: NodeJS.ProcessEnv;
}): DocumentRecoveryJournal {
  if (
    options.confirmation !== "synthetic-only" ||
    !uuid.test(options.journalId) ||
    [
      (options.environment ?? process.env).NODE_ENV,
      (options.environment ?? process.env).APP_ENV
    ].some((value) => value?.trim().toLowerCase() === "production")
  )
    throw new DocumentRecoveryError();
  const directory = resolve(options.directory),
    file = join(directory, "recovery.json");
  const limit = 8 * 1024 * 1024;
  async function locked<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, "recovery.lock");
    let lock;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        lock = await open(path, "wx", 0o600);
        break;
      } catch (error) {
        if (!(
          error &&
          typeof error === "object" &&
          "code" in error &&
          ["EEXIST", "EPERM", "EACCES"].includes(String(error.code))
        ))
          throw new DocumentRecoveryError();
        await new Promise((done) => setTimeout(done, 10));
      }
    }
    if (!lock) throw new DocumentRecoveryError();
    try {
      return await operation();
    } catch {
      throw new DocumentRecoveryError();
    } finally {
      await lock.close();
      await rm(path);
    }
  }
  function serialize(snapshot: DocumentRecoverySnapshot) {
    validate(snapshot, options.journalId);
    const payload = JSON.stringify(snapshot);
    const envelope = JSON.stringify({ payload, sha256: recoveryDigest(payload) });
    if (Buffer.byteLength(envelope) > limit) throw new DocumentRecoveryError();
    return envelope;
  }
  async function read() {
    if ((await stat(file)).size > limit) throw new DocumentRecoveryError();
    const envelope = JSON.parse(await readFile(file, "utf8"));
    if (
      typeof envelope.payload !== "string" ||
      recoveryDigest(envelope.payload) !== envelope.sha256
    )
      throw new DocumentRecoveryError();
    const snapshot: DocumentRecoverySnapshot = JSON.parse(envelope.payload);
    validate(snapshot, options.journalId);
    return snapshot;
  }
  async function change(
    operation: (snapshot: DocumentRecoverySnapshot) => DocumentRecoverySnapshot
  ) {
    await locked(async () => {
      const snapshot = operation(await read());
      const temporary = join(directory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, serialize(snapshot), { flag: "wx", mode: 0o600, flush: true });
        await rename(temporary, file);
      } finally {
        await rm(temporary, { force: true });
      }
    });
  }
  return {
    initialize: () =>
      locked(async () => {
        // Explicit provisioning only. An existing/corrupted journal is never replaced.
        await writeFile(
          file,
          serialize({ version: 1, journalId: options.journalId, purges: [], calls: [] }),
          { flag: "wx", mode: 0o600, flush: true }
        );
      }),
    read: () => locked(read),
    recordPurge: (decision) =>
      change((snapshot) => {
        const previous = snapshot.purges.find(
          (row) =>
            row.condominiumId === decision.condominiumId && row.documentId === decision.documentId
        );
        if (previous && JSON.stringify(previous) !== JSON.stringify(decision))
          throw new DocumentRecoveryError();
        return previous
          ? snapshot
          : { ...snapshot, purges: [...snapshot.purges, structuredClone(decision)] };
      }),
    recordDispatch: (key, owner) =>
      change((snapshot) => {
        if (!uuid.test(owner)) throw new DocumentRecoveryError();
        const previous = snapshot.calls.find((row) => sameKey(row.key, key));
        const record = {
          key: structuredClone({ ...key, documentVersionIds: key.documentVersionIds ?? [] }),
          ownerSha256: recoveryDigest(owner)
        };
        if (
          previous &&
          JSON.stringify({ ...previous, resultSha256: undefined }) !== JSON.stringify(record)
        )
          throw new DocumentRecoveryError();
        return previous ? snapshot : { ...snapshot, calls: [...snapshot.calls, record] };
      }),
    recordCompletion: (key, owner, resultSha256) =>
      change((snapshot) => {
        const previous = snapshot.calls.find((row) => sameKey(row.key, key));
        if (
          !previous ||
          previous.key.policyRevision !== key.policyRevision ||
          previous.ownerSha256 !== recoveryDigest(owner) ||
          (previous.resultSha256 !== undefined && previous.resultSha256 !== resultSha256)
        )
          throw new DocumentRecoveryError();
        return {
          ...snapshot,
          calls: snapshot.calls.map((row) => (row === previous ? { ...row, resultSha256 } : row))
        };
      })
  };
}
