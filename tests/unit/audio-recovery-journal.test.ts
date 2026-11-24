import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, rename } from "node:fs/promises";
import type * as FileSystemPromises from "node:fs/promises";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("node:fs/promises", async (importOriginal) => {
  const fs = await importOriginal<typeof FileSystemPromises>();
  return { ...fs, rename: vi.fn(fs.rename) };
});
import {
  createSyntheticAudioRecoveryJournal,
  type AudioRecoveryDecision
} from "../../apps/api/authoring/audio-recovery-journal.js";
import { createSyntheticPostgresAudioStorage } from "../../apps/api/authoring/postgres-audio-storage.js";
import { audioSourceReference } from "../../apps/api/authoring/audio-source.js";
import { syntheticMinutesInput } from "../fixtures/semantic-minutes.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
it("AC-7325: referência não muda quando JSONB reordena propriedades", () => {
  const input = syntheticMinutesInput();
  const reordered = JSON.parse(JSON.stringify(input), (_key, value) =>
    value && !Array.isArray(value) && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).reverse())
      : value
  );
  expect(audioSourceReference(input)).toEqual(audioSourceReference(reordered));
});
it("AC-7326: journal fora do dump conserva decisões concorrentes e nega perda/corrupção", async () => {
  await mkdir(resolve(".local/authoring"), { recursive: true });
  const directory = await mkdtemp(resolve(".local/authoring/audio-journal-"));
  const options = {
    directory,
    journalId: randomUUID(),
    confirmation: "synthetic-local-only" as const
  };
  const journal = createSyntheticAudioRecoveryJournal(options);
  const scope = {
    kind: "chat" as const,
    condominiumId: randomUUID(),
    userId: createUserId(randomUUID()),
    chatId: randomUUID()
  };
  const decision: AudioRecoveryDecision = {
    kind: "dispatch",
    scope,
    id: randomUUID(),
    sha256: "a".repeat(64),
    commandHash: "b".repeat(64),
    expiresAt: "2026-11-17T12:00:00.000Z"
  };
  try {
    await expect(journal.read()).rejects.toMatchObject({ statusCode: 503 });
    await journal.initialize();
    await Promise.all([
      journal.record(decision),
      createSyntheticAudioRecoveryJournal(options).record(decision)
    ]);
    await journal.record({ ...decision, kind: "purge" });
    expect(await journal.read()).toHaveLength(2);
    const file = (await readdir(directory)).find((name) => name.endsWith(".decision.json"))!;
    const content = await readFile(join(directory, file), "utf8");
    await rm(join(directory, file));
    await expect(journal.read()).rejects.toMatchObject({ statusCode: 503 });
    await writeFile(join(directory, file), content.replace('"sha256":"a', '"sha256":"c'));
    await expect(journal.read()).rejects.toMatchObject({ statusCode: 503 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it.each(["EPERM", "EACCES", "EBUSY", "EIO", "persistent"])(
  "AC-7326: rename atômico %s mantém índice e falha fechada",
  async (code) => {
    await mkdir(resolve(".local/authoring"), { recursive: true });
    const directory = await mkdtemp(resolve(".local/authoring/audio-rename-"));
    const journal = createSyntheticAudioRecoveryJournal({
      directory,
      journalId: randomUUID(),
      confirmation: "synthetic-local-only"
    });
    const decision: AudioRecoveryDecision = {
      kind: "dispatch",
      scope: {
        kind: "chat",
        condominiumId: randomUUID(),
        userId: createUserId(randomUUID()),
        chatId: randomUUID()
      },
      id: randomUUID(),
      sha256: "a".repeat(64),
      commandHash: "b".repeat(64),
      expiresAt: "2026-11-17T12:00:00.000Z"
    };
    const atomicRename = vi.mocked(rename);
    try {
      await journal.initialize();
      const old = await readFile(join(directory, "index.json"), "utf8");
      atomicRename.mockClear();
      const blocked = Object.assign(new Error("synthetic file lock"), {
        code: code === "persistent" ? "EPERM" : code
      });
      if (code === "persistent" || code === "EIO") atomicRename.mockRejectedValue(blocked);
      else atomicRename.mockRejectedValueOnce(blocked).mockRejectedValueOnce(blocked);
      if (code === "persistent" || code === "EIO") {
        await expect(journal.record(decision)).rejects.toMatchObject({ statusCode: 503 });
        expect(atomicRename).toHaveBeenCalledTimes(code === "persistent" ? 5 : 1);
        expect(await readFile(join(directory, "index.json"), "utf8")).toBe(old);
        await expect(journal.read()).rejects.toMatchObject({ statusCode: 503 });
      } else {
        await journal.record(decision);
        expect(atomicRename).toHaveBeenCalledTimes(3);
        expect(await journal.read()).toEqual([decision]);
      }
      expect((await readdir(directory)).includes("journal.lock")).toBe(false);
    } finally {
      atomicRename.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  }
);
it.each([
  "postgresql://postgres:synthetic-only@remote.invalid/alvitra_ops_source_" + "a".repeat(32),
  "postgresql://postgres:synthetic-only@127.0.0.1/customer",
  "postgresql://postgres:synthetic-only@127.0.0.1/alvitra_ops_source_" +
    "a".repeat(32) +
    "?host=remote.invalid"
])("AC-7311/7326: recusa destino fora do contrato antes de conectar", (databaseUrl) => {
  expect(() =>
    createSyntheticPostgresAudioStorage({
      databaseUrl,
      confirmation: "synthetic-local-only",
      journal: { initialize: async () => {}, read: async () => [], record: async () => {} },
      retentionSeconds: 3600,
      maximumDailyInputs: 10,
      maximumConcurrent: 2,
      now: () => new Date()
    })
  ).toThrow("Composição sintética");
});
