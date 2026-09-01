import type { CondominiumId } from "../core/condominium-scope.js";

export type ProcessingJob = Readonly<{
  jobId: string;
  condominiumId: CondominiumId;
  documentVersionId: string;
}>;

export interface ProcessingJobQueue {
  claimNext(): Promise<ProcessingJob | undefined>;
}

export interface ScopedDocumentProcessor {
  process(
    input: Readonly<{ condominiumId: CondominiumId; documentVersionId: string }>
  ): Promise<void>;
}

export async function processOne(
  queue: ProcessingJobQueue,
  processor: ScopedDocumentProcessor
): Promise<"processed" | "idle"> {
  const job = await queue.claimNext();

  if (job === undefined) {
    return "idle";
  }

  await processor.process({
    condominiumId: job.condominiumId,
    documentVersionId: job.documentVersionId
  });

  return "processed";
}
