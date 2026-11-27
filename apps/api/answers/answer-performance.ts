import { performance } from "node:perf_hooks";

export const monotonicNow = () => performance.now();
export type CodexProcessTimings = Readonly<{
  spawnMs: number | null;
  firstByteMs: number | null;
  turnStartedMs: number | null;
  firstAnswerEventMs: number | null;
  totalMs: number;
}>;
export type CodexGenerationPerformance = Readonly<{
  preparationMs: number | null;
  processMs: number | null;
  parsingMs: number | null;
  cleanupMs: number | null;
  totalMs: number;
  process: CodexProcessTimings | null;
  referenceFormat: "original" | "compact-v1";
  schemaSha256: string | null;
  prefixSha256: string | null;
  prefixCharacters: number | null;
  promptCharacters: number | null;
}>;
export type AnswerStageTiming = Readonly<{
  condominiumId: string;
  stage: "retrieval" | "generation" | "validation" | "persistence" | "total";
  durationMs: number;
}>;

/** Observabilidade nunca altera o resultado ou propaga erro do consumidor. */
export function safelyObserve<T>(
  observer: ((value: T) => void | Promise<void>) | undefined,
  value: T
) {
  try {
    const pending = observer?.(Object.freeze(value));
    if (pending) void pending.catch(() => undefined);
  } catch {
    // Não copiar a mensagem do observador: ela pode conter conteúdo privado.
  }
}
