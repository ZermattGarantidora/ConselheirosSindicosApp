import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AudioMinutesComposer } from "../../apps/web/AudioMinutesComposer.js";
import {
  prepareAudioMinutes,
  mergeRecentAudioInputs
} from "../../apps/web/audio-minutes-request.js";
it("AC-7312: abrir interface não envia áudio nem inicia transcrição; pedido é explícito", () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  try {
    const html = renderToStaticMarkup(
      createElement(AudioMinutesComposer, {
        condominiumId: "alameda",
        chatId: "synthetic-chat",
        headers: {},
        onDraft: vi.fn(),
        onClose: vi.fn()
      })
    );
    expect(html).toContain("Enviar áudio e preparar ata");
    expect(html).toContain("Relato do síndico");
    expect(html).toContain("Gravação da reunião");
    expect(html).toContain('type="file"');
    expect(html).toContain("O arquivo só será enviado");
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("capture=");
    expect(request).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
it("AC-7312: valida pedido/formato e cancelamento antes de qualquer envio", async () => {
  const request = vi.fn<typeof fetch>(),
    prepareChat = vi.fn(async () => {});
  const base = {
    condominiumId: "alameda",
    chatId: "synthetic-chat",
    headers: {},
    mode: "dictation" as const,
    text: "Prepare a ata.",
    attempt: {
      inputId: "synthetic-input",
      draftId: "synthetic-draft",
      uploadRequest: "Prepare a ata."
    },
    resume: false,
    signal: new AbortController().signal,
    prepareChat
  };
  await expect(
    prepareAudioMinutes(request, { ...base, file: new File(["fake"], "x.mp3"), text: "" })
  ).rejects.toThrow("pedido");
  await expect(
    prepareAudioMinutes(request, { ...base, file: new File(["fake"], "x.mp3") })
  ).rejects.toThrow("WAV");
  const aborted = new AbortController();
  aborted.abort();
  await expect(
    prepareAudioMinutes(request, {
      ...base,
      file: new File(["fake"], "x.wav"),
      signal: aborted.signal
    })
  ).rejects.toThrow();
  expect(prepareChat).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});
it("AC-7320/21: carregar página antiga não troca pedido semântico recente por legado", () => {
  const recent: { id: string; draftId: string; generationKind: string | null } = {
    id: "synthetic-audio",
    draftId: "semantic-current",
    generationKind: "audio-minutes-semantic-v1"
  };
  const legacy = { id: recent.id, draftId: "old-extractive", generationKind: null };
  const older = { id: "other-synthetic-audio", draftId: "other", generationKind: null };
  expect(mergeRecentAudioInputs([recent], [legacy, older], true)).toEqual([recent, older]);
  expect(mergeRecentAudioInputs([recent], [legacy], false)).toEqual([legacy]);
});
