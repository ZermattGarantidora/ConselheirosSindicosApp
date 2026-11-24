import type { AudioInput } from "./audio-inputs.js";
import type { DraftAudioSource } from "../../shared/document-draft.js";
import { conversationHash } from "../answers/conversation-store.js";

export function audioSourceReference(input: AudioInput): DraftAudioSource {
  return {
    inputId: input.id,
    originalSha256: input.originalSha256,
    transcriptSha256: conversationHash([
      input.mode,
      input.durationSeconds,
      input.segments.map((segment) => ({
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
        speaker: segment.speaker,
        uncertain: segment.uncertain
      })),
      input.provenance,
      input.pending
    ]),
    mode: input.mode,
    durationSeconds: input.durationSeconds
  };
}
