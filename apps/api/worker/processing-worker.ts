import type { CondominiumId } from "../core/condominium-scope.js";

export type ProcessingJob = Readonly<{
  jobId: string;
  condominiumId: CondominiumId;
  documentVersionId: string;
  attemptCount: number;
}>;

export interface ProcessingJobQueue {
  claimNext(): Promise<ProcessingJob | undefined>;
  fail(job: ProcessingJob): Promise<void>;
}

export type ProcessingJobQueueLike = Readonly<{
  claimNext(): Promise<ProcessingJob | undefined>;
  fail?: (job: ProcessingJob) => Promise<void>;
}>;

export interface ScopedDocumentProcessor {
  process(
    input: Readonly<{
      condominiumId: CondominiumId;
      documentVersionId: string;
      jobId: string;
      attemptCount: number;
    }>
  ): Promise<void>;
}

export async function processOne(
  queue: ProcessingJobQueueLike,
  processor: ScopedDocumentProcessor
): Promise<"processed" | "idle"> {
  const job = await queue.claimNext();

  if (job === undefined) {
    return "idle";
  }

  try {
    await processor.process({
      condominiumId: job.condominiumId,
      documentVersionId: job.documentVersionId,
      jobId: job.jobId,
      attemptCount: job.attemptCount
    });
  } catch (error: unknown) {
    if (queue.fail !== undefined) {
      await queue.fail(job);
    }

    throw error;
  }

  return "processed";
}
