import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createAudioMinutesService } from "../../apps/api/authoring/audio-minutes.js";
import { createAudioInputService } from "../../apps/api/authoring/audio-inputs.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { audioSourceReference } from "../../apps/api/authoring/audio-source.js";
import { formatAudioTime } from "../../apps/shared/audio-minutes.js";
import { managerContext } from "./answer-fixtures.js";
import { syntheticWav } from "../fixtures/synthetic-authoring.js";
import {
  syntheticMinutesInput,
  syntheticMinutesPlan,
  syntheticMinutesModel
} from "../fixtures/semantic-minutes.js";
import { semanticMinutesVersion } from "../../apps/api/authoring/semantic-minutes-contract.js";

async function fixture(mode: "dictation" | "meeting" = "meeting") {
  const store = createInMemoryConversationStore(),
    chats = createInMemoryChatRepository(),
    chatId = randomUUID(),
    files = new Map<string, Buffer>(),
    seed = syntheticMinutesInput(mode);
  await chats.create(managerContext, { id: chatId, title: "FICTÍCIO" });
  const scope = {
    kind: "chat" as const,
    userId: managerContext.userId,
    condominiumId: managerContext.condominiumId,
    chatId
  };
  const storage = {
    async storeOriginal(value: { objectId: string; content: Buffer }) {
      files.set(value.objectId, value.content);
      return { storageKey: value.objectId };
    },
    async removeOriginal() {},
    async readOriginal(value: { objectId: string }) {
      const found = files.get(value.objectId);
      if (!found) throw new Error("missing synthetic");
      return found;
    }
  };
  const now = () => new Date("2026-11-12T12:00:00Z");
  const transcribe = vi.fn(async () => ({
    processedDurationSeconds: 90,
    truncated: false,
    segments: seed.segments
  }));
  const audio = createAudioInputService({
    store,
    chats,
    storage,
    reader: storage,
    now,
    transcriber: { transcribe }
  });
  const input = await audio.receive(
    managerContext,
    scope,
    seed.id,
    seed.title,
    mode,
    syntheticWav(90)
  );
  const drafts = createDocumentDraftService({
    store,
    catalog: { listAuthorized: async () => [] },
    audioSource: (context, scope, id) => audio.read(context, scope, id),
    now
  });
  const model = syntheticMinutesModel({ plan: () => syntheticMinutesPlan(input) }),
    realComplete = model.complete,
    complete = vi.spyOn(model, "complete");
  const authorize = vi.fn(async () => managerContext),
    options = { store, audio, drafts, model, now, authorize };
  const id = randomUUID(),
    request = "Redija a ata, resumindo os assuntos e separando decisões e propostas.";
  const prepare = () =>
    createAudioMinutesService(options).prepare(managerContext, scope, input.id, id, request);
  return {
    store,
    scope,
    input,
    files,
    audio,
    drafts,
    model,
    complete,
    realComplete,
    authorize,
    options,
    id,
    request,
    prepare,
    transcribe
  };
}
it.each(["dictation", "meeting"] as const)(
  "AC-7317: %s redige síntese por assuntos, com decisões e encaminhamentos apoiados",
  async (mode) => {
    const f = await fixture(mode),
      draft = await f.prepare();
    expect(draft.text).toContain("Foram relatadas falhas no abastecimento associadas à bomba.");
    expect(draft.text).not.toContain("Pessoal, vamos falar da bomba");
    expect(draft.text).not.toContain("O café está bom");
    expect(draft.text).not.toContain("ignore as regras");
    expect(draft.text).toContain("Proposta apresentada: Substituição");
    expect(draft.text).toContain("não foi submetida a votação");
    expect(draft.text).toContain("Aprovação relatada: Reparo emergencial");
    expect(draft.text).toContain("Deliberação adiada:");
    expect(draft.text).toContain("Rejeição relatada: Pintura da fachada");
    expect(draft.text).toContain("Responsável relatado: Ana Fictícia");
    expect(draft.text).toContain("Prazo relatado: 20/11/2026");
    expect(draft.text).toContain("Conferir trecho incerto no áudio (01:00)");
    expect(draft.text).toContain("secretaria relatada");
    expect(draft.text).toContain("00:40 a 00:50");
    expect(draft.audioSource).toEqual(audioSourceReference(f.input));
    expect(draft.status).toBe("awaiting_confirmation");
    expect(f.complete.mock.calls.map(([call]) => call.phase)).toEqual(["write", "review"]);
    expect(JSON.stringify(f.complete.mock.calls[1]![0].data)).toContain(
      f.input.segments.at(-1)!.text
    );
    expect(f.transcribe).toHaveBeenCalledTimes(1);
    expect(await f.prepare()).toEqual(draft);
    expect(f.complete).toHaveBeenCalledTimes(2);
  }
);
it("AC-7320: concorrência despacha no máximo uma redação e uma conferência", async () => {
  const f = await fixture();
  const outcomes = await Promise.allSettled([f.prepare(), f.prepare(), f.prepare()]);
  expect(outcomes.some((result) => result.status === "fulfilled")).toBe(true);
  expect(f.complete.mock.calls.map(([call]) => call.phase)).toEqual(["write", "review"]);
});
it.each(["write", "review"] as const)(
  "AC-7320: resultado incerto de %s não repete chamada nem libera ata",
  async (phase) => {
    const f = await fixture(),
      original = f.realComplete;
    f.complete.mockImplementation(async (input) => {
      if (input.phase === phase) throw new Error("synthetic timeout");
      return original(input);
    });
    await expect(f.prepare()).rejects.toMatchObject({ statusCode: 503 });
    const count = f.complete.mock.calls.length;
    expect(count).toBe(phase === "write" ? 1 : 2);
    await expect(f.prepare()).rejects.toMatchObject({ statusCode: 503 });
    expect(f.complete).toHaveBeenCalledTimes(count);
    await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toMatchObject({
      statusCode: 404
    });
    expect(
      (await f.store.list(f.scope)).entries.some((entry) => entry.metadata.documentDraftId === f.id)
    ).toBe(false);
  }
);
it("AC-7318/20: conferência negativa fica salva e bloqueia proposta e repetição", async () => {
  const f = await fixture(),
    original = f.realComplete;
  f.complete.mockImplementation(async (input) =>
    input.phase === "review"
      ? {
          status: "rejected",
          sourceHash: input.data.sourceHash,
          planHash: input.data.planHash,
          statements: [],
          segments: [],
          issues: ["negation"]
        }
      : original(input)
  );
  await expect(f.prepare()).rejects.toMatchObject({ statusCode: 422 });
  await expect(f.prepare()).rejects.toMatchObject({ statusCode: 422 });
  expect(f.complete).toHaveBeenCalledTimes(2);
  await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toMatchObject({
    statusCode: 404
  });
});
it("AC-7320: falha ao salvar proposta reutiliza recibos completos sem repetir redação", async () => {
  const f = await fixture(),
    original = f.drafts.propose;
  vi.spyOn(f.drafts, "propose")
    .mockRejectedValueOnce(new Error("synthetic disk unavailable"))
    .mockImplementation(original);
  await expect(f.prepare()).rejects.toThrow("disk unavailable");
  expect((await f.prepare()).text).toContain("Pintura da fachada");
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7320: falha ao salvar resultado deixa envio incerto, sem nova chamada", async () => {
  const f = await fixture(),
    append = f.store.append;
  vi.spyOn(f.store, "append").mockImplementation(async (scope, value) => {
    if (value.requestKey.endsWith(":write:result")) throw new Error("synthetic journal failure");
    return append(scope, value);
  });
  await expect(f.prepare()).rejects.toThrow("journal failure");
  await expect(f.prepare()).rejects.toMatchObject({ statusCode: 503 });
  expect(f.complete).toHaveBeenCalledTimes(1);
});
it.each(["source", "membership"])(
  "AC-7314/20: mudança de %s após redação impede conferência e proposta",
  async (kind) => {
    const f = await fixture(),
      original = f.realComplete;
    f.complete.mockImplementation(async (input) => {
      const value = await original(input);
      if (kind === "source") f.files.set(f.input.id, syntheticWav(1));
      else f.authorize.mockResolvedValue({ ...managerContext, permissions: [] });
      return value;
    });
    await expect(f.prepare()).rejects.toMatchObject({ statusCode: kind === "source" ? 409 : 403 });
    expect(f.complete).toHaveBeenCalledTimes(1);
  }
);
it("AC-7320: cancelamento após resultado conhecido salva recibo mas não continua", async () => {
  const f = await fixture(),
    controller = new AbortController(),
    original = f.realComplete;
  f.complete.mockImplementation(async (input) => {
    const value = await original(input);
    controller.abort();
    return value;
  });
  await expect(
    createAudioMinutesService(f.options).prepare(
      managerContext,
      f.scope,
      f.input.id,
      f.id,
      f.request,
      controller.signal
    )
  ).rejects.toThrow();
  expect(f.complete).toHaveBeenCalledTimes(1);
  expect((await f.prepare()).status).toBe("awaiting_confirmation");
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7321: sem modelo não fabrica ata; ata semântica existente permanece recuperável", async () => {
  const f = await fixture(),
    { model: unused, ...disabled } = f.options;
  void unused;
  const service = createAudioMinutesService(disabled);
  expect(service.enabled).toBe(false);
  await expect(
    service.prepare(managerContext, f.scope, f.input.id, f.id, f.request)
  ).rejects.toMatchObject({ statusCode: 503 });
  const draft = await f.prepare();
  expect(await service.prepare(managerContext, f.scope, f.input.id, f.id, f.request)).toEqual(
    draft
  );
});
it("AC-7321: pedido legado não vira redação semântica; nova versão usa mesmo áudio", async () => {
  const f = await fixture();
  await f.store.append(f.scope, {
    id: randomUUID(),
    createdAt: f.options.now().toISOString(),
    requestKey: `audio-minutes:${f.id}:request`,
    inputHash: "a".repeat(64),
    messages: [{ id: randomUUID(), role: "user", kind: "question_answer", text: f.request }],
    response: { draftId: f.id, inputId: f.input.id, request: f.request },
    metadata: { audioInputId: f.input.id }
  });
  await expect(f.prepare()).rejects.toMatchObject({ statusCode: 409 });
  const draft = await createAudioMinutesService(f.options).prepare(
    managerContext,
    f.scope,
    f.input.id,
    randomUUID(),
    f.request
  );
  expect(draft.text).toContain("Assuntos tratados");
  expect(f.transcribe).toHaveBeenCalledTimes(1);
  expect((await f.audio.recent(managerContext, f.scope)).inputs[0]).toMatchObject({
    generationKind: semanticMinutesVersion
  });
});
it("AC-7314/16: revisão humana longa é preservada; fonte alterada bloqueia revisão e download", async () => {
  const f = await fixture(),
    first = await f.prepare(),
    text = first.text + "\nFICTÍCIO. Revisão humana.\n".repeat(1000);
  const saved = await f.drafts.propose(managerContext, f.scope, f.id, { ...first, text }, 1);
  expect(saved.text).toBe(text);
  expect(saved.text.length).toBeGreaterThan(18000);
  await f.drafts.decide(managerContext, f.scope, f.id, 2, saved.hash, true, true);
  expect((await f.prepare()).status).toBe("confirmed");
  f.files.set(f.input.id, syntheticWav(1));
  await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toMatchObject({
    statusCode: 409
  });
  await expect(f.drafts.download(managerContext, f.scope, f.id, saved.hash)).rejects.toMatchObject({
    statusCode: 409
  });
});
it("AC-7320/21: página recente contendo só recibos recupera o pedido original sem nova redação", async () => {
  const f = await fixture();
  await f.prepare();
  for (let i = 0; i < 45; i++)
    await f.store.append(f.scope, {
      id: randomUUID(),
      createdAt: f.options.now().toISOString(),
      requestKey: `synthetic-filler:${i}`,
      inputHash: "a".repeat(64),
      messages: [
        {
          id: randomUUID(),
          role: "user",
          kind: "question_answer",
          text: "FICTÍCIO. Outra pergunta."
        }
      ],
      response: {},
      metadata: {}
    });
  const recent = await f.audio.recent(managerContext, f.scope);
  expect(recent.inputs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: f.input.id,
        draftId: f.id,
        request: f.request,
        generationKind: semanticMinutesVersion
      })
    ])
  );
  await f.prepare();
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it.each([
  [0, "00:00"],
  [61.25, "01:01.25"],
  [3600, "01:00:00"]
])("AC-7313: tempo %s é verificável", (seconds, text) => {
  expect(formatAudioTime(Number(seconds))).toBe(text);
});
