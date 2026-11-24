import { expect, it, vi } from "vitest";
import {
  inspectPcmWav,
  transcribeAuthorizedAudio
} from "../../apps/api/authoring/audio-transcription.js";
import { syntheticWav } from "../fixtures/synthetic-authoring.js";
import { managerContext, advisorContext } from "./answer-fixtures.js";
const base = () => ({
  context: managerContext,
  chatId: "chat-synthetic",
  mode: "meeting" as const,
  content: syntheticWav(2),
  authorizeChat: async () => true
});
it("AC-7306: conserva tempo e incerteza, anonimiza rótulos sem adivinhar pessoas", async () => {
  const transcriber = {
    transcribe: vi.fn(async () => ({
      processedDurationSeconds: 2,
      truncated: false,
      segments: [
        {
          startSeconds: 0,
          endSeconds: 1,
          text: "FICTÍCIO. Proposta de reparo.",
          speaker: "Nome não verificado",
          uncertain: false
        },
        { startSeconds: 1, endSeconds: 2, text: "[inaudível]", speaker: null, uncertain: true }
      ]
    }))
  };
  const result = await transcribeAuthorizedAudio({ ...base(), transcriber });
  expect(result.segments[0]?.speaker).toBe("Falante 1");
  expect(result.segments[1]?.uncertain).toBe(true);
  expect(result.pending).toContain("ainda não é uma ata");
  expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
  expect(
    (await transcribeAuthorizedAudio({ ...base(), mode: "dictation", transcriber })).provenance
  ).toContain("Relato do usuário");
});
it("AC-7307/11: nega por padrão e confere acesso/bytes/duração antes da chamada", async () => {
  const transcriber = { transcribe: vi.fn() };
  await expect(transcribeAuthorizedAudio(base())).rejects.toMatchObject({ statusCode: 503 });
  await expect(
    transcribeAuthorizedAudio({ ...base(), context: advisorContext, transcriber })
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    transcribeAuthorizedAudio({
      ...base(),
      mode: "dictation",
      content: syntheticWav(601),
      transcriber
    })
  ).rejects.toMatchObject({ statusCode: 422 });
  await expect(
    transcribeAuthorizedAudio({
      ...base(),
      content: Buffer.alloc(25 * 1024 * 1024 + 1),
      transcriber
    })
  ).rejects.toMatchObject({ statusCode: 422 });
  expect(transcriber.transcribe).not.toHaveBeenCalled();
});
it.each([
  { processedDurationSeconds: 1, truncated: false, segments: [] },
  { processedDurationSeconds: 2, truncated: true, segments: [] },
  {
    processedDurationSeconds: 2,
    truncated: false,
    segments: [
      { startSeconds: 0, endSeconds: 3, text: "FICTÍCIO", speaker: null, uncertain: false }
    ]
  }
])("AC-7306/07: não aceita saída parcial ou inválida %s", async (result) => {
  await expect(
    transcribeAuthorizedAudio({ ...base(), transcriber: { transcribe: async () => result } })
  ).rejects.toMatchObject({ statusCode: 422 });
});
it("AC-7307: duração deriva dos dados e rejeita WAV truncado ou cabeçalho falso", () => {
  const valid = syntheticWav(2);
  expect(inspectPcmWav(valid).durationSeconds).toBe(2);
  const wrong = Buffer.from(valid);
  wrong.writeUInt32LE(16000, 28);
  for (const bad of [valid.subarray(0, 100), wrong, Buffer.from("not an audio")])
    expect(() => inspectPcmWav(bad)).toThrow();
});
