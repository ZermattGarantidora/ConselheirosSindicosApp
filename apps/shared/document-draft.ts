import type { DocumentAuthoringReference } from "./document-proposal.js";
export type DraftSource = Readonly<{
  documentId: string;
  documentVersionId: string;
  page: number;
  excerpt: string;
}>;
export type DocumentDraftContent = Readonly<{
  audioSource?: DraftAudioSource;
  authoringSource?: DocumentAuthoringReference;
  title: string;
  documentKind: string;
  operation: "create" | "revise" | "improve";
  text: string;
  sources: readonly DraftSource[];
  changes: string;
  pending: string;
}>;
export type DocumentDraft = DocumentDraftContent &
  Readonly<{
    id: string;
    event: number;
    revision: number;
    hash: string;
    status: "awaiting_confirmation" | "confirmed" | "declined";
    sourceHashes: readonly string[];
    createdAt: string;
  }>;
export const maximumDraftTextCharacters = 160_000;
export const maximumDraftContentBytes = 175_000;
export const maximumDraftSourceReferences = 500;
export type DraftAudioSource = Readonly<{
  inputId: string;
  originalSha256: string;
  transcriptSha256: string;
  mode: "dictation" | "meeting";
  durationSeconds: number;
}>;
