import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, open, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { ConversationScope } from "../answers/conversation-store.js";
import { chatIdPattern } from "../chats/chat-repository.js";
import { DocumentDraftError } from "./document-drafts.js";
export type AudioScope = Extract<ConversationScope, { kind: "chat" }>;
export type AudioRecoveryDecision = Readonly<{
  kind: "dispatch" | "purge";
  scope: AudioScope;
  id: string;
  sha256: string;
  commandHash: string;
  expiresAt: string;
}>;
export interface AudioRecoveryJournal {
  initialize(): Promise<void>;
  read(): Promise<readonly AudioRecoveryDecision[]>;
  record(decision: AudioRecoveryDecision): Promise<void>;
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (): never => {
  throw new DocumentDraftError(
    503,
    "O áudio está em quarentena de recuperação. Nenhuma chamada foi feita."
  );
};
/** Journal sintético fora do dump: arquivo exclusivo, flush e ausência/corrupção negadas. */
export function createSyntheticAudioRecoveryJournal(options: {
  directory: string;
  journalId: string;
  confirmation: "synthetic-local-only";
}): AudioRecoveryJournal {
  if (options.confirmation !== "synthetic-local-only" || !chatIdPattern.test(options.journalId))
    fail();
  const marker = join(options.directory, "journal.json");
  const indexPath = join(options.directory, "index.json");
  const validate = (decision: AudioRecoveryDecision) => {
    if (
      !decision ||
      !["dispatch", "purge"].includes(decision.kind) ||
      decision.scope?.kind !== "chat" ||
      ![
        decision.id,
        decision.scope.userId,
        decision.scope.condominiumId,
        decision.scope.chatId
      ].every((id) => chatIdPattern.test(id)) ||
      !/^[a-f0-9]{64}$/u.test(decision.sha256) ||
      !/^[a-f0-9]{64}$/u.test(decision.commandHash) ||
      !Number.isFinite(Date.parse(decision.expiresAt))
    )
      fail();
  };
  async function read() {
    try {
      if ((await readFile(marker, "utf8")) !== options.journalId) fail();
      const files = (await readdir(options.directory)).filter((file) =>
        file.endsWith(".decision.json")
      );
      const index = JSON.parse(await readFile(indexPath, "utf8"));
      if (
        !Array.isArray(index.files) ||
        index.sha256 !== digest(index.files) ||
        digest([...files].sort()) !== digest([...index.files].sort())
      )
        fail();
      if (files.length > 10000) fail();
      const decisions: AudioRecoveryDecision[] = [];
      for (const file of files) {
        const raw = await readFile(join(options.directory, file), "utf8");
        if (Buffer.byteLength(raw) > 4000) fail();
        const envelope = JSON.parse(raw);
        if (digest(envelope.decision) !== envelope.sha256) fail();
        validate(envelope.decision);
        decisions.push(envelope.decision);
      }
      return decisions;
    } catch {
      return fail();
    }
  }
  return {
    async initialize() {
      await mkdir(options.directory, { recursive: true, mode: 0o700 });
      try {
        await writeFile(marker, options.journalId, { flag: "wx", mode: 0o600, flush: true });
        await writeFile(indexPath, JSON.stringify({ files: [], sha256: digest([]) }), {
          flag: "wx",
          mode: 0o600,
          flush: true
        });
      } catch {
        if ((await readFile(marker, "utf8")) !== options.journalId) fail();
      }
      await read();
    },
    read,
    async record(decision) {
      validate(decision);
      let lock;
      const lockPath = join(options.directory, "journal.lock");
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          lock = await open(lockPath, "wx", 0o600);
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") fail();
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      if (!lock) fail();
      try {
        await read();
        const file = join(
          options.directory,
          `${digest([decision.kind, decision.scope, decision.id])}.decision.json`
        );
        const raw = JSON.stringify({ decision, sha256: digest(decision) });
        try {
          await writeFile(file, raw, { flag: "wx", mode: 0o600, flush: true });
        } catch {
          if ((await readFile(file, "utf8")) !== raw) fail();
        }
        const files = (await readdir(options.directory))
          .filter((file) => file.endsWith(".decision.json"))
          .sort();
        const temporary = join(options.directory, "index.tmp");
        await writeFile(temporary, JSON.stringify({ files, sha256: digest(files) }), {
          flag: "wx",
          mode: 0o600,
          flush: true
        });
        // Windows pode bloquear o destino por instantes. Conservar o índice vigente e o lock:
        // repetir apenas o rename atômico; nunca apagar o destino ou confirmar falha como sucesso.
        for (let attempt = 0; ; attempt++) {
          try {
            await rename(temporary, indexPath);
            break;
          } catch (error) {
            if (
              attempt === 4 ||
              !["EPERM", "EACCES", "EBUSY"].includes(String((error as NodeJS.ErrnoException).code))
            )
              fail();
            await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          }
        }
      } finally {
        await lock!.close();
        await rm(lockPath);
      }
    }
  };
}
