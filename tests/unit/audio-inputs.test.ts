import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createAudioInputService, type AudioInput } from "../../apps/api/authoring/audio-inputs.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { managerContext } from "./answer-fixtures.js";
import { syntheticWav } from "../fixtures/synthetic-authoring.js";
async function setup() {
  const store = createInMemoryConversationStore(),
    chats = createInMemoryChatRepository(),
    chatId = randomUUID(),
    files = new Map<string, Buffer>();
  await chats.create(managerContext, { id: chatId, title: "FICTÍCIO" });
  const scope = {
    kind: "chat" as const,
    condominiumId: managerContext.condominiumId,
    userId: managerContext.userId,
    chatId
  };
  const storage = {
    storeOriginal: vi.fn(async ({ objectId, content }: { objectId: string; content: Buffer }) => {
      if (files.has(objectId)) throw new Error("existing");
      files.set(objectId, Buffer.from(content));
      return { storageKey: objectId };
    }),
    removeOriginal: vi.fn(async () => {}),
    readOriginal: vi.fn(async ({ objectId }: { objectId: string }) => {
      const value = files.get(objectId);
      if (!value) throw new Error("missing");
      return value;
    })
  };
  const transcriber = {
    transcribe: vi.fn(async () => ({
      processedDurationSeconds: 2,
      truncated: false,
      segments: [
        {
          startSeconds: 0,
          endSeconds: 2,
          text: "FICTÍCIO. Uma proposta, sem votação confirmada.",
          speaker: null,
          uncertain: false
        }
      ]
    }))
  };
  const options = {
    store,
    chats,
    storage,
    reader: storage,
    now: () => new Date("2026-11-12T12:00:00Z")
  };
  return {
    options,
    scope,
    files,
    transcriber,
    service: createAudioInputService({ ...options, transcriber })
  };
}
it("AC-7306/09/11: original privado, recuperação e retentativa sem nova chamada; fonte alterada bloqueia replay", async () => {
  const { options, scope, files, transcriber, service } = await setup(),
    id = randomUUID(),
    bytes = syntheticWav(2);
  const input = await service.receive(
    managerContext,
    scope,
    id,
    "Reunião sintética",
    "meeting",
    bytes
  );
  expect(files.get(id)).toEqual(bytes);
  expect(
    await createAudioInputService({ ...options, transcriber }).read(managerContext, scope, id)
  ).toEqual(input);
  expect(
    await service.receive(managerContext, scope, id, "Reunião sintética", "meeting", bytes)
  ).toEqual(input);
  expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
  files.set(id, syntheticWav(1));
  await expect(
    service.receive(managerContext, scope, id, "Reunião sintética", "meeting", bytes)
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    service.read(managerContext, { ...scope, chatId: randomUUID() }, id)
  ).rejects.toMatchObject({ statusCode: 404 });
});
it("AC-7307/09: falha incerta conserva recibo e original; não repete transcrição", async () => {
  const { scope, files, transcriber, service } = await setup(),
    id = randomUUID();
  transcriber.transcribe.mockRejectedValue(new Error("provider unavailable"));
  await expect(
    service.receive(managerContext, scope, id, "Relato sintético", "dictation", syntheticWav(2))
  ).rejects.toThrow("provider unavailable");
  await expect(
    service.receive(managerContext, scope, id, "Relato sintético", "dictation", syntheticWav(2))
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
  expect(files.has(id)).toBe(true);
});
it("AC-7307/11: indisponível por padrão e payload divergente não reenviado", async () => {
  const { options, scope, transcriber, service } = await setup(),
    id = randomUUID();
  await expect(
    createAudioInputService(options).receive(
      managerContext,
      scope,
      id,
      "Relato sintético",
      "dictation",
      syntheticWav(2)
    )
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(options.storage.storeOriginal).not.toHaveBeenCalled();
  await service.receive(
    managerContext,
    scope,
    id,
    "Relato sintético",
    "dictation",
    syntheticWav(2)
  );
  await expect(
    service.receive(managerContext, scope, id, "Outro relato", "dictation", syntheticWav(2))
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
});
it("AC-7307/11: storage documental persistente não habilita áudio sem integração própria", async () => {
  const { options, scope, transcriber } = await setup();
  const service = createAudioInputService({
    ...options,
    store: { ...options.store, durable: true },
    transcriber
  });
  expect((await service.capabilities(managerContext, scope)).enabled).toBe(false);
  await expect(
    service.receive(
      managerContext,
      scope,
      randomUUID(),
      "Relato sintético",
      "dictation",
      syntheticWav(2)
    )
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(options.storage.storeOriginal).not.toHaveBeenCalled();
  expect(transcriber.transcribe).not.toHaveBeenCalled();
});

it("AC-7325: resultado durável salvo antes da falha do journal é recuperável na lista sem repetir ASR", async () => {
  const { options, scope, transcriber } = await setup();
  let saved: AudioInput | undefined;
  const original = syntheticWav(2);
  const durableAudio = {
    syntheticOnly: true as const,
    reserve: vi.fn(async () => {}),
    start: vi.fn(async () => {}),
    complete: vi.fn(async (_scope: unknown, _id: string, input: NonNullable<typeof saved>) => {
      saved = input;
    }),
    read: vi.fn(async () => ({ content: original, ...(saved ? { input: saved } : {}) })),
    purge: vi.fn(async () => {}),
    export: vi.fn(async () => ({}))
  };
  const append = options.store.append;
  const store = {
    ...options.store,
    durable: true,
    append: async (...args: Parameters<typeof append>) => {
      if (args[1].requestKey.endsWith(":result")) throw new Error("FICTÍCIO: journal unavailable");
      return append(...args);
    }
  };
  const service = createAudioInputService({ ...options, store, durableAudio, transcriber });
  const id = randomUUID();
  await expect(
    service.receive(managerContext, scope, id, "FICTÍCIO", "meeting", original)
  ).rejects.toThrow("journal unavailable");
  expect((await service.recent(managerContext, scope)).inputs).toMatchObject([
    { id, title: "FICTÍCIO", status: "transcribed" }
  ]);
  expect(await service.receive(managerContext, scope, id, "FICTÍCIO", "meeting", original)).toEqual(
    saved
  );
  expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
});
