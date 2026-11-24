import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  audioMinutesGenerationKind,
  formatAudioTime,
  type AudioMinutesInput,
  type AudioMinutesMode
} from "../shared/audio-minutes.js";
import type { DocumentDraft } from "../shared/document-draft.js";
import {
  prepareAudioMinutes,
  mergeRecentAudioInputs,
  type AudioMinutesAttempt
} from "./audio-minutes-request.js";

export function AudioMinutesComposer({
  condominiumId,
  chatId,
  headers,
  prepareChat,
  onDraft,
  onClose
}: Readonly<{
  condominiumId: string;
  chatId: string;
  headers: Readonly<Record<string, string>>;
  prepareChat?: () => Promise<void>;
  onDraft: (draft: DocumentDraft) => void;
  onClose: () => void;
}>) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [mode, setMode] = useState<AudioMinutesMode>("dictation");
  const [text, setText] = useState(
    "Prepare um rascunho de ata a partir deste áudio, para eu revisar."
  );
  const [stage, setStage] = useState<"checking" | "transcribing" | "preparing">();
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<AudioMinutesInput>();
  const [ready, setReady] = useState(false);
  const [recovered, setRecovered] = useState<Readonly<{ id: string; title: string }>>();
  const [recent, setRecent] = useState<
    readonly Readonly<{
      id: string;
      title: string;
      mode: AudioMinutesMode | null;
      status: string;
      request: string;
      draftId?: string;
      generationKind?: string | null;
    }>[]
  >([]);
  const [cursor, setCursor] = useState<string | null>();
  const [loadingRecent, setLoadingRecent] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const attempt = useRef<AudioMinutesAttempt | undefined>(undefined);
  const attempted = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function resetAudio() {
    attempt.current = undefined;
    attempted.current = false;
    setTranscript(undefined);
    setReady(false);
    setError("");
    setRecovered(undefined);
  }
  async function loadRecent(before?: string) {
    const current = new AbortController();
    controller.current = current;
    setLoadingRecent(true);
    setError("");
    try {
      const base = `/v1/condominiums/${encodeURIComponent(condominiumId)}/chats/${encodeURIComponent(chatId)}/audio-inputs`;
      const response = await fetch(
        `${base}${before ? `?before=${encodeURIComponent(before)}` : ""}`,
        { headers, credentials: "same-origin", cache: "no-store", signal: current.signal }
      );
      const result = (await response.json()) as {
        message?: string;
        inputs?: typeof recent;
        nextCursor?: string | null;
      };
      if (current.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 404) {
          setRecent([]);
          setCursor(null);
          return;
        }
        throw new Error(result.message ?? "Não foi possível recuperar os áudios.");
      }
      setRecent((previous) =>
        mergeRecentAudioInputs(previous, result.inputs ?? [], Boolean(before))
      );
      setCursor(result.nextCursor);
    } catch (e) {
      if (!current.signal.aborted)
        setError(e instanceof Error ? e.message : "Não foi possível recuperar os áudios.");
    } finally {
      if (!current.signal.aborted) setLoadingRecent(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!file && !recovered) || inFlight.current || loadingRecent) return;
    inFlight.current = true;
    setError("");
    setReady(false);
    if (!attempt.current)
      attempt.current = {
        inputId: crypto.randomUUID(),
        draftId: crypto.randomUUID(),
        uploadRequest: text
      };
    const current = new AbortController();
    controller.current = current;
    const resume = attempted.current;
    attempted.current = true;
    try {
      const result = await prepareAudioMinutes(fetch, {
        condominiumId,
        chatId,
        headers,
        ...(file ? { file } : {}),
        mode,
        text,
        attempt: attempt.current,
        resume,
        signal: current.signal,
        onStage: setStage,
        ...(prepareChat ? { prepareChat } : {})
      });
      if (current.signal.aborted) return;
      setTranscript(result.input);
      setReady(true);
      onDraft(result.draft);
    } catch (e) {
      if (!current.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível preparar a ata. Seu pedido foi preservado para tentar novamente."
        );
    } finally {
      inFlight.current = false;
      if (!current.signal.aborted) setStage(undefined);
    }
  }
  return (
    <section className="audio-minutes-composer" aria-label="Enviar áudio e pedir ata">
      <header>
        <strong>Áudio para ata</strong>
        <button
          type="button"
          onClick={() => {
            controller.current?.abort();
            onClose();
          }}
        >
          Fechar
        </button>
      </header>
      <p className="interface-status">
        Grave o áudio no seu aparelho e anexe aqui. O arquivo só será enviado quando você pedir a
        ata.
      </p>
      <button
        type="button"
        disabled={stage !== undefined || loadingRecent}
        onClick={() => void loadRecent()}
      >
        Recuperar áudios já enviados nesta conversa
      </button>
      <p className="interface-status">
        A Alvitra resume os assuntos, separa propostas, decisões e encaminhamentos e confere a
        redação com a transcrição. Dados ausentes ou incertos ficam pendentes. Revise antes do PDF.
      </p>
      {recent.map((item) => (
        <p key={item.id}>
          <button
            type="button"
            disabled={
              stage !== undefined ||
              loadingRecent ||
              item.status !== "transcribed" ||
              item.mode === null
            }
            onClick={() => {
              resetAudio();
              setFile(undefined);
              setMode(item.mode!);
              setRecovered(item);
              setText(item.request || "Prepare um rascunho de ata a partir deste áudio.");
              attempt.current = {
                inputId: item.id,
                draftId:
                  item.generationKind === audioMinutesGenerationKind && item.draftId
                    ? item.draftId
                    : crypto.randomUUID(),
                uploadRequest: item.request
              };
              attempted.current = true;
            }}
          >
            {item.title} ·{" "}
            {item.status === "transcribed"
              ? "retomar transcrição"
              : "tentativa pendente de verificação"}
          </button>
        </p>
      ))}
      {!cursor ? null : (
        <button
          type="button"
          disabled={stage !== undefined || loadingRecent}
          onClick={() => void loadRecent(cursor)}
        >
          Carregar áudios anteriores
        </button>
      )}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={stage !== undefined || loadingRecent}>
          <label>
            Gravação
            <input
              type="file"
              key={recovered?.id ?? "local-recording"}
              accept="audio/wav,audio/x-wav,.wav"
              onChange={(event) => {
                resetAudio();
                setFile(event.target.files?.[0]);
              }}
            />
          </label>
          {!preview ? null : (
            <audio
              controls
              preload="metadata"
              src={preview}
              aria-label="Ouvir gravação selecionada"
            />
          )}
          {!file ? null : (
            <p>
              {file.name} ·{" "}
              {(file.size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MiB
            </p>
          )}
          <label>
            Origem do áudio
            <select
              value={mode}
              onChange={(event) => {
                resetAudio();
                setMode(event.target.value as AudioMinutesMode);
              }}
            >
              <option value="dictation">Relato do síndico</option>
              <option value="meeting">Gravação da reunião</option>
            </select>
          </label>
          <p className="interface-status">
            WAV, até 25 MiB.{" "}
            {mode === "dictation"
              ? "Relato: até 10 minutos."
              : "Reunião: até 60 minutos, respeitando também o limite de tamanho."}
          </p>
          <label>
            Pedido de ata
            <textarea
              rows={3}
              maxLength={2000}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setReady(false);
                if (attempt.current)
                  attempt.current = { ...attempt.current, draftId: crypto.randomUUID() };
              }}
            />
          </label>
          {!recovered ? null : (
            <p className="interface-status">
              Áudio recuperado: {recovered.title}. A transcrição será reutilizada, sem reenviar a
              gravação.
            </p>
          )}
          <button type="submit" disabled={(!file && !recovered) || !text.trim() || ready}>
            {stage
              ? "Preparando…"
              : attempted.current && error
                ? "Recuperar pedido e tentar novamente"
                : "Enviar áudio e preparar ata"}
          </button>
        </fieldset>
      </form>
      {!stage ? null : (
        <p className="interface-status" role="status">
          {
            {
              checking: "Conferindo disponibilidade…",
              transcribing: "Transcrevendo o áudio…",
              preparing: "Redigindo a ata e conferindo assuntos e decisões com a transcrição…"
            }[stage]
          }
        </p>
      )}
      {!error ? null : (
        <p className="interface-status" role="alert">
          {error}
        </p>
      )}
      {!ready ? null : (
        <p className="interface-status" role="status">
          Rascunho aberto para revisão abaixo. Confira a redação e os dados antes de confirmar o
          PDF.
        </p>
      )}
      {!transcript ? null : (
        <details>
          <summary>Conferir transcrição e referências de tempo</summary>
          <p>{transcript.provenance}</p>
          {transcript.segments.map((segment, index) => (
            <p key={index}>
              <strong>
                {formatAudioTime(segment.startSeconds)} a {formatAudioTime(segment.endSeconds)} ·{" "}
                {segment.speaker ?? "Falante não identificado"}
                {segment.uncertain ? " · trecho incerto" : ""}
              </strong>
              <br />
              {segment.text}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
