import type { AudioMinutesInput, AudioMinutesMode } from "../shared/audio-minutes.js";
import type { DocumentDraft } from "../shared/document-draft.js";
export type AudioMinutesAttempt = Readonly<{
  inputId: string;
  draftId: string;
  uploadRequest: string;
}>;
/** Páginas antigas não podem substituir a tentativa mais recente e provocar nova geração. */
export function mergeRecentAudioInputs<T extends Readonly<{ id: string }>>(
  previous: readonly T[],
  incoming: readonly T[],
  older: boolean
): readonly T[] {
  if (!older) return incoming;
  const known = new Set(previous.map((item) => item.id));
  return [...previous, ...incoming.filter((item) => !known.has(item.id))];
}
export async function prepareAudioMinutes(
  request: typeof fetch,
  input: {
    condominiumId: string;
    chatId: string;
    headers: Readonly<Record<string, string>>;
    file?: File;
    mode: AudioMinutesMode;
    text: string;
    attempt: AudioMinutesAttempt;
    resume: boolean;
    signal: AbortSignal;
    prepareChat?: () => Promise<void>;
    onStage?: (stage: "checking" | "transcribing" | "preparing") => void;
  }
) {
  if (!input.text.trim() || input.text.length > 2000)
    throw new Error("Escreva o pedido de ata, com até 2.000 caracteres.");
  if (
    input.file &&
    !/\.wav$/iu.test(input.file.name) &&
    !["audio/wav", "audio/x-wav"].includes(input.file.type)
  )
    throw new Error("Envie uma gravação WAV nesta versão.");
  if (input.file && (!input.file.size || input.file.size > 25 * 1024 * 1024))
    throw new Error("O áudio deve ter até 25 MiB e não pode estar vazio.");
  const base = `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/chats/${encodeURIComponent(input.chatId)}/audio-inputs`;
  const init = {
    headers: input.headers,
    credentials: "same-origin" as const,
    cache: "no-store" as const,
    signal: input.signal
  };
  async function json(response: Response) {
    const result = (await response.json()) as {
      message?: string;
      enabled?: boolean;
      minutesEnabled?: boolean;
      input?: AudioMinutesInput;
      draft?: DocumentDraft;
      durable?: boolean;
    };
    input.signal.throwIfAborted();
    if (!response.ok)
      throw new Error(
        result.message ??
          "Não foi possível preparar a ata. Recupere o mesmo pedido para tentar novamente."
      );
    return result;
  }
  input.signal.throwIfAborted();
  input.onStage?.("checking");
  await input.prepareChat?.();
  input.signal.throwIfAborted();
  let audio: AudioMinutesInput | undefined;
  if (input.resume) {
    const response = await request(`${base}/${input.attempt.inputId}`, init);
    input.signal.throwIfAborted();
    if (response.status !== 404) audio = (await json(response)).input;
  }
  if (!audio) {
    const file = input.file;
    if (!file)
      throw new Error(
        "A transcrição deste áudio ainda não está disponível. Nenhum arquivo foi reenviado."
      );
    const capabilities = await json(await request(base, init));
    if (!capabilities.enabled)
      throw new Error(
        "A transcrição de áudio não está habilitada neste ambiente. O arquivo não foi enviado."
      );
    if (!capabilities.minutesEnabled)
      throw new Error(
        "A redação e conferência de atas não estão habilitadas neste ambiente. O arquivo não foi enviado."
      );
    input.signal.throwIfAborted();
    input.onStage?.("transcribing");
    audio = (
      await json(
        await request(
          `${base}/${input.attempt.inputId}?mode=${input.mode}&title=${encodeURIComponent(file.name)}`,
          {
            ...init,
            method: "POST",
            headers: {
              ...input.headers,
              "content-type": "audio/wav",
              "x-audio-request": encodeURIComponent(input.attempt.uploadRequest)
            },
            body: file
          }
        )
      )
    ).input;
  }
  if (
    !audio ||
    audio.id !== input.attempt.inputId ||
    audio.mode !== input.mode ||
    !Array.isArray(audio.segments)
  )
    throw new Error(
      "A transcrição recebida não corresponde a este pedido. Nenhuma ata foi aberta."
    );
  input.signal.throwIfAborted();
  input.onStage?.("preparing");
  const result = await json(
    await request(`${base}/${audio.id}/minutes/${input.attempt.draftId}`, {
      ...init,
      method: "POST",
      headers: { ...input.headers, "content-type": "application/json" },
      body: JSON.stringify({ request: input.text })
    })
  );
  if (
    !result.draft ||
    result.draft.id !== input.attempt.draftId ||
    result.draft.audioSource?.inputId !== audio.id
  )
    throw new Error("O rascunho recebido não corresponde a este áudio. Recupere o mesmo pedido.");
  return { input: audio, draft: result.draft, durable: result.durable };
}
