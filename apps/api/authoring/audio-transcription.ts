import { createHash } from "node:crypto";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { DocumentDraftError } from "./document-drafts.js";

export type AudioMode = "dictation" | "meeting";
export const audioLimits = Object.freeze({
  dictation: { maximumBytes: 25 * 1024 * 1024, maximumSeconds: 600, maximumCharacters: 30_000 },
  meeting: { maximumBytes: 25 * 1024 * 1024, maximumSeconds: 3600, maximumCharacters: 100_000 }
});
export type TranscriptSegment = Readonly<{
  startSeconds: number;
  endSeconds: number;
  text: string;
  speaker: string | null;
  uncertain: boolean;
}>;
export interface AudioTranscriber {
  transcribe(
    input: Readonly<{
      condominiumId: string;
      userId: string;
      chatId: string;
      mode: AudioMode;
      content: Buffer;
      durationSeconds: number;
      maximumCharacters: number;
      signal?: AbortSignal;
    }>
  ): Promise<
    Readonly<{
      segments: readonly TranscriptSegment[];
      processedDurationSeconds: number;
      truncated: boolean;
    }>
  >;
}
function invalid(
  message = "Áudio WAV PCM inválido ou fora dos limites. Não houve envio para transcrição."
): never {
  throw new DocumentDraftError(422, message);
}
/** Duração calculada dos bytes PCM, nunca de metadados declarados pelo cliente. */
export function inspectPcmWav(content: Buffer): { durationSeconds: number } {
  if (
    content.length < 44 ||
    content.toString("ascii", 0, 4) !== "RIFF" ||
    content.readUInt32LE(4) + 8 !== content.length ||
    content.toString("ascii", 8, 12) !== "WAVE"
  )
    invalid();
  let offset = 12,
    bytes = 0,
    byteRate = 0,
    blockAlign = 0,
    format = false,
    data = false;
  while (offset + 8 <= content.length) {
    const name = content.toString("ascii", offset, offset + 4),
      size = content.readUInt32LE(offset + 4);
    offset += 8;
    if (offset + size + (size % 2) > content.length) invalid();
    if (name === "fmt ") {
      if (format || data || size !== 16) invalid();
      format = true;
      const channels = content.readUInt16LE(offset + 2),
        sampleRate = content.readUInt32LE(offset + 4),
        bits = content.readUInt16LE(offset + 14);
      byteRate = content.readUInt32LE(offset + 8);
      blockAlign = content.readUInt16LE(offset + 12);
      if (
        content.readUInt16LE(offset) !== 1 ||
        ![1, 2].includes(channels) ||
        sampleRate < 8000 ||
        sampleRate > 48000 ||
        ![8, 16, 24, 32].includes(bits) ||
        blockAlign !== (channels * bits) / 8 ||
        byteRate !== sampleRate * blockAlign
      )
        invalid();
    } else if (name === "data") {
      if (!format || data || !size || size % blockAlign) invalid();
      data = true;
      bytes = size;
    }
    offset += size + (size % 2);
  }
  if (offset !== content.length || !data || !format) invalid();
  return { durationSeconds: bytes / byteRate };
}

/** Não registra um fornecedor ou habilita transporte. O startup não injeta transcritor. */
export async function transcribeAuthorizedAudio(input: {
  context: AuthorizedCondominiumContext;
  chatId: string;
  mode: AudioMode;
  content: Buffer;
  transcriber?: AudioTranscriber;
  authorizeChat: (context: AuthorizedCondominiumContext, chatId: string) => Promise<boolean>;
  signal?: AbortSignal;
}) {
  const { context, content, mode } = input;
  if (
    !context.permissions.includes("document:upload") ||
    !context.permissions.includes("document:read")
  )
    throw new DocumentDraftError(403, "Acesso não autorizado.");
  if (!(await input.authorizeChat(context, input.chatId)))
    throw new DocumentDraftError(404, "Conversa indisponível.");
  if (mode !== "dictation" && mode !== "meeting")
    invalid("Escolha relato do síndico ou gravação de reunião.");
  const limit = audioLimits[mode];
  if (content.length > limit.maximumBytes)
    invalid("Áudio excede 25 MiB. Nenhum trecho foi enviado ou descartado.");
  const { durationSeconds } = inspectPcmWav(content);
  if (durationSeconds > limit.maximumSeconds)
    invalid(
      `Este modo aceita até ${limit.maximumSeconds / 60} minutos, dentro de 25 MiB. Nenhum trecho foi cortado.`
    );
  input.signal?.throwIfAborted();
  if (!input.transcriber)
    throw new DocumentDraftError(
      503,
      "Transcrição não habilitada. Nenhum áudio foi enviado a um serviço externo."
    );
  const result = await input.transcriber.transcribe({
    condominiumId: context.condominiumId,
    userId: context.userId,
    chatId: input.chatId,
    mode,
    content,
    durationSeconds,
    maximumCharacters: limit.maximumCharacters,
    ...(input.signal ? { signal: input.signal } : {})
  });
  input.signal?.throwIfAborted();
  if (
    !result ||
    result.truncated !== false ||
    !Number.isFinite(result.processedDurationSeconds) ||
    Math.abs(result.processedDurationSeconds - durationSeconds) > 0.01 ||
    !Array.isArray(result.segments) ||
    !result.segments.length ||
    result.segments.length > 2000
  )
    invalid("A transcrição está incompleta ou inválida. Não gerar ata integral.");
  let previous = -1,
    total = 0;
  const speakers = new Map<string, string>();
  const segments = result.segments.map((segment) => {
    if (
      !segment ||
      !Number.isFinite(segment.startSeconds) ||
      !Number.isFinite(segment.endSeconds) ||
      segment.startSeconds < 0 ||
      segment.startSeconds < previous ||
      segment.endSeconds <= segment.startSeconds ||
      segment.endSeconds > durationSeconds + 0.01 ||
      typeof segment.text !== "string" ||
      !segment.text.trim() ||
      /\p{Cc}/u.test(segment.text.replace(/[\t\r\n]/gu, "")) ||
      typeof segment.uncertain !== "boolean" ||
      (segment.speaker !== null &&
        (typeof segment.speaker !== "string" || segment.speaker.length > 100))
    )
      invalid("Segmentos de transcrição inválidos. Nenhuma ata foi gerada.");
    previous = segment.startSeconds;
    total += segment.text.length;
    if (total > limit.maximumCharacters)
      invalid("Transcrição excede o limite; não houve truncamento silencioso.");
    let speaker =
      mode === "dictation" ? "Relato declarado pelo síndico" : "Falante não identificado";
    if (mode === "meeting" && segment.speaker !== null) {
      if (!speakers.has(segment.speaker))
        speakers.set(segment.speaker, `Falante ${speakers.size + 1}`);
      speaker = speakers.get(segment.speaker)!;
    }
    return {
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      text: segment.text,
      speaker,
      uncertain: segment.uncertain
    };
  });
  return {
    mode,
    originalSha256: createHash("sha256").update(content).digest("hex"),
    durationSeconds,
    segments,
    provenance:
      mode === "dictation"
        ? "Relato do usuário; não comprova os fatos narrados."
        : "Transcrição automática de reunião; falantes anônimos não identificam participantes.",
    pending:
      "Conferir trechos incertos, participantes, votos, quórum e decisões. Transcrição não comprova aprovação, assinatura ou vigência. O original deve ser preservado; ainda não é uma ata."
  };
}
