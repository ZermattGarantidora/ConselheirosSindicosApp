import { createHash } from "node:crypto";
import { inspectPcmWav } from "../../apps/api/authoring/audio-transcription.js";
export function readSpeechReceipt(text: string, expectedCorpusHash: string) {
  const receipt = JSON.parse(text.replace(/^\uFEFF/u, "")) as {
    corpusHash: string;
    voice: string;
    culture: string;
    engine: string;
  };
  if (
    receipt.corpusHash !== expectedCorpusHash ||
    receipt.culture !== "pt-BR" ||
    receipt.engine !== "Windows System.Speech offline" ||
    typeof receipt.voice !== "string" ||
    !receipt.voice.trim()
  )
    throw new Error("Origem da síntese não confere com o corpus.");
  return receipt;
}
export function assembleSpeechAudio(clips: readonly Buffer[]) {
  if (!clips.length || clips.length > 20)
    throw new Error("Quantidade de trechos fora do contrato.");
  const data = clips.map((clip) => {
    if (
      clip.length < 44 ||
      clip.length > 25 * 1024 * 1024 ||
      clip.toString("ascii", 0, 4) !== "RIFF" ||
      clip.readUInt32LE(4) + 8 !== clip.length ||
      clip.toString("ascii", 8, 12) !== "WAVE"
    )
      throw new Error("Contêiner de voz local inválido.");
    let offset = 12,
      pcm: Buffer | undefined,
      format: Buffer | undefined;
    while (offset + 8 <= clip.length) {
      const name = clip.toString("ascii", offset, offset + 4),
        size = clip.readUInt32LE(offset + 4);
      offset += 8;
      if (offset + size + (size % 2) > clip.length) throw new Error("Trecho de voz truncado.");
      if (name !== "fmt " && name !== "data")
        throw new Error("Recurso WAV não suportado na amostra local.");
      if (name === "fmt ") {
        if (
          format ||
          pcm ||
          !(size === 16 || (size === 18 && clip.readUInt16LE(offset + 16) === 0))
        )
          throw new Error("Formato PCM local não suportado.");
        format = clip.subarray(offset, offset + 16);
      }
      if (
        name === "fmt " &&
        (clip.readUInt16LE(offset) !== 1 ||
          clip.readUInt16LE(offset + 2) !== 1 ||
          clip.readUInt32LE(offset + 4) !== 16000 ||
          clip.readUInt16LE(offset + 14) !== 16)
      )
        throw new Error("Amostra exige PCM 16 kHz/16 bits/mono.");
      if (name === "data") {
        if (pcm || !format) throw new Error("Ordem PCM inválida.");
        pcm = clip.subarray(offset, offset + size);
      }
      offset += size + (size % 2);
    }
    if (offset !== clip.length || !format || !pcm) throw new Error("Áudio PCM incompleto.");
    // System.Speech escreve WAVEFORMATEX de 18 bytes com extensão vazia.
    // Só o cabeçalho é normalizado; bytes de áudio e validador de produção permanecem intactos.
    const canonical = Buffer.alloc(44 + pcm.length);
    canonical.write("RIFF");
    canonical.writeUInt32LE(canonical.length - 8, 4);
    canonical.write("WAVEfmt ", 8);
    canonical.writeUInt32LE(16, 16);
    format.copy(canonical, 20);
    canonical.write("data", 36);
    canonical.writeUInt32LE(pcm.length, 40);
    pcm.copy(canonical, 44);
    inspectPcmWav(canonical);
    if (!pcm.some((v) => v !== 0)) throw new Error("Silêncio não representa amostra de fala.");
    return pcm;
  });
  const gap = Buffer.alloc(16000),
    parts: Buffer[] = [],
    segments: { startSeconds: number; endSeconds: number; sha256: string }[] = [];
  let bytes = 0;
  data.forEach((pcm, i) => {
    if (i) {
      parts.push(gap);
      bytes += gap.length;
    }
    segments.push({
      startSeconds: bytes / 32000,
      endSeconds: (bytes + pcm.length) / 32000,
      sha256: createHash("sha256").update(clips[i]!).digest("hex")
    });
    parts.push(pcm);
    bytes += pcm.length;
  });
  if (bytes + 44 > 25 * 1024 * 1024 || bytes / 32000 > 600)
    throw new Error("Amostra excede tamanho ou duração do relato.");
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(bytes, 40);
  Buffer.concat(parts).copy(wav, 44);
  inspectPcmWav(wav);
  return {
    wav,
    segments,
    durationSeconds: bytes / 32000,
    sha256: createHash("sha256").update(wav).digest("hex")
  };
}
