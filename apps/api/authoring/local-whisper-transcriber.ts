import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { DocumentDraftError } from "./document-drafts.js";
import {
  inspectPcmWav,
  type AudioTranscriber,
  type TranscriptSegment
} from "./audio-transcription.js";

export type WhisperProcess = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
}>;
const invalid = (): never => {
  throw new DocumentDraftError(
    422,
    "Transcrição local inválida ou incompleta. Nenhum trecho foi liberado."
  );
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
/** Apenas saída local completa: tempos em milissegundos, probabilidades por token, sem nomes. */
export function parseWhisperTranscript(
  raw: unknown,
  durationSeconds: number,
  maximumCharacters: number
): readonly TranscriptSegment[] {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isSafeInteger(maximumCharacters) ||
    maximumCharacters < 1
  )
    invalid();
  if (
    !record(raw) ||
    !record(raw.result) ||
    raw.result.language !== "pt" ||
    !record(raw.params) ||
    raw.params.translate !== false ||
    raw.params.language !== "pt" ||
    !Array.isArray(raw.transcription) ||
    !raw.transcription.length ||
    raw.transcription.length > 2000
  )
    invalid();
  const rows = (raw as Record<string, unknown>).transcription as unknown[];
  let last = 0,
    length = 0;
  return rows.map((row) => {
    if (
      !record(row) ||
      !record(row.offsets) ||
      typeof row.text !== "string" ||
      !row.text.trim() ||
      /\p{Cc}/u.test(row.text.replace(/[\t\r\n]/gu, "")) ||
      !Array.isArray(row.tokens) ||
      !row.tokens.length
    )
      return invalid();
    const from = row.offsets.from,
      to = row.offsets.to;
    if (
      typeof from !== "number" ||
      typeof to !== "number" ||
      !Number.isSafeInteger(from) ||
      !Number.isSafeInteger(to) ||
      from < last ||
      to <= from ||
      to > durationSeconds * 1000 + 1
    )
      return invalid();
    last = to;
    const probabilities: number[] = [];
    for (const token of row.tokens) {
      if (
        !record(token) ||
        typeof token.text !== "string" ||
        typeof token.p !== "number" ||
        !Number.isFinite(token.p) ||
        token.p < 0 ||
        token.p > 1
      )
        invalid();
      if (!/^\[.*\]$/u.test(String((token as Record<string, unknown>).text)))
        probabilities.push((token as { p: number }).p);
    }
    if (!probabilities.length) return invalid();
    length += row.text.trim().length;
    if (length > maximumCharacters) return invalid();
    return {
      startSeconds: from / 1000,
      // O CLI arredonda a duração a milissegundos; tolerância máxima de uma amostra temporal.
      endSeconds: Math.min(to / 1000, durationSeconds),
      text: row.text.trim(),
      speaker: null,
      uncertain: probabilities.some((p) => p < 0.5)
    };
  });
}
export function runWhisperProcess(request: WhisperProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      request.executable,
      [...request.args],
      {
        cwd: request.cwd,
        encoding: "utf8",
        timeout: request.timeoutMs,
        killSignal: "SIGKILL",
        windowsHide: true,
        shell: false,
        maxBuffer: 2 * 1024 * 1024,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) =>
            /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|TMPDIR)$/iu.test(key)
          )
        ),
        ...(request.signal ? { signal: request.signal } : {})
      },
      (error) => (error ? reject(new Error("local_asr_process_failed")) : resolve())
    );
  });
}
/** Composição explícita de teste local. Não baixa arquivos nem consulta rede/env. */
export function createLocalWhisperTranscriber(options: {
  confirmation: "synthetic-local-only";
  executable: string;
  executableSha256: string;
  model: string;
  modelSha256: string;
  timeoutMs?: number;
  run?: (request: WhisperProcess) => Promise<void>;
}): AudioTranscriber {
  const timeoutMs = options.timeoutMs ?? 300_000;
  if (
    options.confirmation !== "synthetic-local-only" ||
    !isAbsolute(options.executable) ||
    !isAbsolute(options.model) ||
    ![options.executableSha256, options.modelSha256].every((h) => /^[a-f0-9]{64}$/u.test(h)) ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 300_000
  )
    throw new Error("Composição local whisper.cpp inválida.");
  return {
    async transcribe(input) {
      input.signal?.throwIfAborted();
      const measured = inspectPcmWav(input.content);
      if (
        measured.durationSeconds !== input.durationSeconds ||
        input.content.toString("ascii", 12, 16) !== "fmt " ||
        input.content.readUInt32LE(16) !== 16 ||
        input.content.readUInt16LE(22) !== 1 ||
        input.content.readUInt32LE(24) !== 16000 ||
        input.content.readUInt16LE(34) !== 16
      )
        throw new DocumentDraftError(
          422,
          "O transcritor local exige WAV PCM mono 16 kHz/16 bits. Converta explicitamente antes de enviar."
        );
      for (const [path, expected] of [
        [options.executable, options.executableSha256],
        [options.model, options.modelSha256]
      ] as const) {
        const actual = createHash("sha256")
          .update(await readFile(path))
          .digest("hex");
        if (actual !== expected)
          throw new DocumentDraftError(
            503,
            "Binário/modelo local diverge do hash autorizado. Nenhuma transcrição iniciou."
          );
      }
      const directory = await mkdtemp(join(tmpdir(), "alvitra-whisper-"));
      try {
        const wav = join(directory, "input.wav"),
          output = join(directory, "result");
        await writeFile(wav, input.content, { mode: 0o600 });
        await (options.run ?? runWhisperProcess)({
          executable: options.executable,
          cwd: directory,
          timeoutMs,
          args: [
            "-m",
            options.model,
            "-f",
            wav,
            "-l",
            "pt",
            "-t",
            "4",
            "-ng",
            "-nf",
            "-ojf",
            "-of",
            output
          ],
          ...(input.signal ? { signal: input.signal } : {})
        });
        input.signal?.throwIfAborted();
        const bytes = await readFile(`${output}.json`);
        if (bytes.length > 10 * 1024 * 1024) invalid();
        const segments = parseWhisperTranscript(
          JSON.parse(bytes.toString("utf8")) as unknown,
          input.durationSeconds,
          input.maximumCharacters
        );
        return { segments, processedDurationSeconds: measured.durationSeconds, truncated: false };
      } catch {
        throw new DocumentDraftError(
          503,
          "A transcrição local não foi concluída. Nenhum fallback ou reenvio foi feito."
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  };
}
