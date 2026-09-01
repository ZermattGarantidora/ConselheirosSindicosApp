import {
  processOne,
  type ProcessingJobQueue,
  type ScopedDocumentProcessor
} from "./processing-worker.js";

const emptyQueue: ProcessingJobQueue = {
  async claimNext() {
    return undefined;
  }
};

const noOpProcessor: ScopedDocumentProcessor = {
  async process() {}
};

export async function startWorker(
  queue: ProcessingJobQueue = emptyQueue,
  processor: ScopedDocumentProcessor = noOpProcessor
): Promise<"processed" | "idle"> {
  return processOne(queue, processor);
}
