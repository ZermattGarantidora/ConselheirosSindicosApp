import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import { prepareAudioMinutes } from "../../apps/web/audio-minutes-request.js";
import { syntheticWav } from "../fixtures/synthetic-authoring.js";
import { simpleMinutesSegments, syntheticMinutesModel } from "../fixtures/semantic-minutes.js";
import type {
  PrivateDocumentReader,
  PrivateDocumentStorage
} from "../../apps/api/documents/private-document-storage.js";
const headers = { "x-development-user-id": "sindico-demo" };
async function fixture(enabled = true, writerEnabled = true) {
  const files = new Map<string, Buffer>(),
    store = createInMemoryConversationStore();
  const transcribe = vi.fn(async () => ({
    processedDurationSeconds: 2,
    truncated: false,
    segments: simpleMinutesSegments
  }));
  const model = syntheticMinutesModel(),
    complete = vi.spyOn(model, "complete");
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    conversationStore: store,
    ...(writerEnabled ? { audioMinutesModel: model } : {}),
    documentStorage: {
      async storeOriginal(value) {
        if (files.has(value.objectId)) throw new Error("existing");
        files.set(value.objectId, Buffer.from(value.content));
        return { storageKey: value.objectId };
      },
      async removeOriginal(value) {
        files.delete(value.objectId);
      },
      async readOriginal(value: { objectId: string }) {
        const file = files.get(value.objectId);
        if (!file) throw new Error("missing");
        return file;
      }
    } as PrivateDocumentStorage & PrivateDocumentReader,
    ...(enabled ? { audioTranscriber: { transcribe } } : {})
  });
  const chatId = randomUUID(),
    inputId = randomUUID(),
    draftId = randomUUID();
  const request = vi.fn<typeof fetch>(async (url, init) => {
    const payload =
      init?.body instanceof Blob ? Buffer.from(await init.body.arrayBuffer()) : init?.body;
    const result = await app.inject({
      method: (init?.method ?? "GET") as "POST" | "GET",
      url: String(url),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      ...(payload ? { payload: payload as string | Buffer } : {})
    });
    return new Response(new Uint8Array(result.rawPayload), {
      status: result.statusCode,
      headers: result.headers as Record<string, string>
    });
  });
  const client = {
    condominiumId: "alameda",
    chatId,
    headers,
    file: new File([new Uint8Array(syntheticWav(2))], "FICTICIO.wav", { type: "audio/wav" }),
    mode: "meeting" as const,
    text: "Prepare a ata deste áudio, para eu revisar.",
    attempt: { inputId, draftId, uploadRequest: "Prepare a ata deste áudio, para eu revisar." },
    resume: false,
    signal: new AbortController().signal,
    prepareChat: async () => {
      const result = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/chats",
        headers,
        payload: { id: chatId, title: "FICTÍCIO. Ata" }
      });
      expect(result.statusCode).toBe(201);
    }
  };
  return { app, request, client, files, transcribe, complete, store };
}
it.each(["dictation", "meeting"] as const)(
  "AC-7312–7315: pedido %s percorre cliente/API/transcrição/rascunho/revisão/PDF, sem alterar o original",
  async (mode) => {
    const f = await fixture();
    try {
      const stages: string[] = [];
      expect(f.transcribe).not.toHaveBeenCalled();
      const result = await prepareAudioMinutes(f.request, {
        ...f.client,
        mode,
        onStage: (stage) => stages.push(stage)
      });
      expect(stages).toEqual(["checking", "transcribing", "preparing"]);
      expect(f.transcribe).toHaveBeenCalledTimes(1);
      expect(result.draft.status).toBe("awaiting_confirmation");
      expect(result.draft.text).toContain("sem votação");
      expect(result.draft.text).toContain("Conferir trecho incerto");
      expect(result.draft.text).not.toContain(simpleMinutesSegments[0].text);
      expect(f.complete.mock.calls.map(([call]) => call.phase)).toEqual(["write", "review"]);
      const base = `/v1/condominiums/alameda/chats/${f.client.chatId}/document-drafts/${result.draft.id}`;
      expect(
        (await f.app.inject({ url: `${base}/pdf?hash=${result.draft.hash}`, headers })).statusCode
      ).toBe(409);
      const edited = await f.app.inject({
        method: "POST",
        url: base,
        headers,
        payload: {
          expectedEvent: 1,
          content: { ...result.draft, text: result.draft.text + "\nRevisão humana sintética." }
        }
      });
      expect(edited.statusCode, edited.body).toBe(200);
      const draft = edited.json().draft;
      expect(
        (
          await f.app.inject({
            method: "POST",
            url: `${base}/decide`,
            headers,
            payload: { expectedEvent: 2, hash: draft.hash, confirm: true, reviewed: true }
          })
        ).statusCode
      ).toBe(200);
      const file = await f.app.inject({ url: `${base}/pdf?hash=${draft.hash}`, headers });
      expect(file.statusCode, file.body).toBe(200);
      const text = (await extractPdfTextByPage(file.rawPayload))
        .map((p) => p.extractedText)
        .join(" ");
      expect(text).toContain("Revisão humana sintética");
      expect(text).toContain("sem votação");
      expect(text).toContain("SHA-256 do original");
      expect(f.files.get(f.client.attempt.inputId)).toEqual(syntheticWav(2));
      const repeated = await prepareAudioMinutes(f.request, { ...f.client, mode, resume: true });
      expect(repeated.draft.status).toBe("confirmed");
      expect(repeated.draft.revision).toBe(2);
      expect(f.complete).toHaveBeenCalledTimes(2);
      expect(f.transcribe).toHaveBeenCalledTimes(1);
      const different = await f.app.inject({
        method: "POST",
        url: `/v1/condominiums/alameda/chats/${f.client.chatId}/audio-inputs/${f.client.attempt.inputId}/minutes/${f.client.attempt.draftId}`,
        headers,
        payload: { request: "Outro pedido" }
      });
      expect(different.statusCode).toBe(409);
      const recovery = await f.app.inject({
        url: `/v1/condominiums/alameda/chats/${f.client.chatId}/audio-inputs`,
        headers
      });
      expect(recovery.json().inputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: f.client.attempt.inputId, status: "transcribed" })
        ])
      );
      f.files.set(f.client.attempt.inputId, syntheticWav(1));
      expect(
        (await f.app.inject({ url: `${base}/pdf?hash=${draft.hash}`, headers })).statusCode
      ).toBe(409);
    } finally {
      await f.app.close();
    }
  }
);
it("AC-7315: perda da resposta da transcrição recupera sem reenviar arquivo nem repetir provedor", async () => {
  const f = await fixture();
  try {
    let lose = true;
    const flaky: typeof fetch = async (url, init) => {
      const result = await f.request(url, init);
      if (lose && init?.method === "POST" && !String(url).includes("/minutes/")) {
        lose = false;
        throw new Error("synthetic lost response");
      }
      return result;
    };
    await expect(prepareAudioMinutes(flaky, f.client)).rejects.toThrow("lost response");
    expect(f.transcribe).toHaveBeenCalledTimes(1);
    const { file: unused, ...rest } = f.client;
    void unused;
    const result = await prepareAudioMinutes(f.request, { ...rest, resume: true });
    expect(result.draft.status).toBe("awaiting_confirmation");
    expect(f.transcribe).toHaveBeenCalledTimes(1);
  } finally {
    await f.app.close();
  }
});
it("AC-7312: mudar contexto aborta continuidade antes de gerar ata", async () => {
  const f = await fixture();
  try {
    const abort = new AbortController();
    const changed: typeof fetch = async (url, init) => {
      const result = await f.request(url, init);
      if (init?.method === "POST") abort.abort();
      return result;
    };
    await expect(
      prepareAudioMinutes(changed, { ...f.client, signal: abort.signal })
    ).rejects.toThrow();
    expect(f.request.mock.calls.some(([url]) => String(url).includes("/minutes/"))).toBe(false);
  } finally {
    await f.app.close();
  }
});
it("AC-7311/12: transcrição desligada não recebe bytes nem fabrica rascunho", async () => {
  const f = await fixture(false);
  try {
    await expect(prepareAudioMinutes(f.request, f.client)).rejects.toThrow("não está habilitada");
    expect(f.files.size).toBe(0);
    expect(f.transcribe).not.toHaveBeenCalled();
    expect(f.request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  } finally {
    await f.app.close();
  }
});
it("AC-7315: perda do corpo da resposta da ata recupera revisão posterior sem gerar de novo", async () => {
  const f = await fixture();
  try {
    let lose = true;
    const flaky: typeof fetch = async (url, init) => {
      const response = await f.request(url, init);
      if (lose && String(url).includes("/minutes/")) {
        lose = false;
        response.json = async () => {
          throw new Error("lost synthetic body");
        };
      }
      return response;
    };
    await expect(prepareAudioMinutes(flaky, f.client)).rejects.toThrow("lost synthetic body");
    const base = `/v1/condominiums/alameda/chats/${f.client.chatId}/document-drafts/${f.client.attempt.draftId}`;
    const saved = (await f.app.inject({ url: base, headers })).json().draft;
    const edited = await f.app.inject({
      method: "POST",
      url: base,
      headers,
      payload: {
        expectedEvent: saved.event,
        content: { ...saved, text: saved.text + "\nFICTÍCIO. Edição preservada." }
      }
    });
    expect(edited.statusCode, edited.body).toBe(200);
    const retry = await prepareAudioMinutes(f.request, { ...f.client, resume: true });
    expect(retry.draft.text).toContain("Edição preservada");
    expect(retry.draft.revision).toBe(2);
    expect(f.transcribe).toHaveBeenCalledTimes(1);
  } finally {
    await f.app.close();
  }
});
it("AC-7321: ASR disponível sem redator não recebe arquivo nem gera cobrança", async () => {
  const f = await fixture(true, false);
  try {
    await expect(prepareAudioMinutes(f.request, f.client)).rejects.toThrow("redação e conferência");
    expect(f.files.size).toBe(0);
    expect(f.transcribe).not.toHaveBeenCalled();
    expect(f.complete).not.toHaveBeenCalled();
    expect(f.request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  } finally {
    await f.app.close();
  }
});
it("AC-7314: áudio de outro chat/condomínio e leitor sem escrita não geram ata nem expõem transcrição", async () => {
  const f = await fixture();
  try {
    await prepareAudioMinutes(f.request, f.client);
    const other = randomUUID();
    for (const condominium of ["alameda", "bosque"]) {
      await f.app.inject({
        method: "POST",
        url: `/v1/condominiums/${condominium}/chats`,
        headers,
        payload: { id: other, title: "FICTÍCIO" }
      });
      const result = await f.app.inject({
        method: "POST",
        url: `/v1/condominiums/${condominium}/chats/${other}/audio-inputs/${f.client.attempt.inputId}/minutes/${randomUUID()}`,
        headers,
        payload: { request: "Prepare ata." }
      });
      expect(result.statusCode).toBe(404);
      expect(result.body).not.toContain("sem votação");
    }
    const denied = await f.app.inject({
      method: "POST",
      url: `/v1/condominiums/alameda/chats/${f.client.chatId}/audio-inputs/${f.client.attempt.inputId}/minutes/${randomUUID()}`,
      headers: { "x-development-user-id": "morador-alameda-demo" },
      payload: { request: "Prepare ata." }
    });
    expect(denied.statusCode).toBe(403);
    expect(f.transcribe).toHaveBeenCalledTimes(1);
  } finally {
    await f.app.close();
  }
});
