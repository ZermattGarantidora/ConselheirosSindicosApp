export type AudioMinutesMode = "dictation" | "meeting";
export const audioMinutesGenerationKind = "audio-minutes-semantic-v1";
export type AudioTranscriptSegment = Readonly<{
  startSeconds: number;
  endSeconds: number;
  text: string;
  speaker: string | null;
  uncertain: boolean;
}>;
export type AudioMinutesInput = Readonly<{
  id: string;
  title: string;
  mode: AudioMinutesMode;
  originalSha256: string;
  durationSeconds: number;
  segments: readonly AudioTranscriptSegment[];
  provenance: string;
  pending: string;
}>;
export function formatAudioTime(seconds: number): string {
  const centiseconds = Math.round(seconds * 100);
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor(centiseconds / 6_000) % 60;
  const secs = Math.floor(centiseconds / 100) % 60;
  const fraction = centiseconds % 100;
  return `${hours ? `${hours.toString().padStart(2, "0")}:` : ""}${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}${fraction ? `.${fraction.toString().padStart(2, "0")}` : ""}`;
}
