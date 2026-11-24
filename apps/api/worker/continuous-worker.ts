import type { LeasedProcessingJobQueue, ScopedDocumentProcessor } from "./processing-worker.js";

export type WorkerDiagnostic = Readonly<{
  code:
    | "worker_started"
    | "worker_stopped"
    | "worker_queue_failed"
    | "worker_processing_failed"
    | "worker_retry_failed"
    | "worker_lease_lost"
    | "worker_document_completed";
  processedCount: number;
  durationMs?: number;
}>;

/** Abort ends a wait normally; it does not cancel the durable job in the database. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

export async function runContinuousDocumentWorker(
  queue: LeasedProcessingJobQueue,
  processor: ScopedDocumentProcessor,
  options: Readonly<{
    signal: AbortSignal;
    pollIntervalMs: number;
    heartbeatIntervalMs: number;
    onDiagnostic?: (diagnostic: WorkerDiagnostic) => void;
  }>
): Promise<number> {
  for (const value of [options.pollIntervalMs, options.heartbeatIntervalMs]) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error("Os intervalos do worker devem ser inteiros positivos.");
    }
  }
  let processedCount = 0;
  const emit = (code: WorkerDiagnostic["code"], durationMs?: number) => {
    try {
      options.onDiagnostic?.({
        code,
        processedCount,
        ...(durationMs === undefined ? {} : { durationMs })
      });
    } catch {
      // Observability must not change the processing or retry outcome.
    }
  };
  emit("worker_started");
  while (!options.signal.aborted) {
    let job;
    try {
      job = await queue.claimNext();
    } catch {
      emit("worker_queue_failed");
      await wait(options.pollIntervalMs, options.signal);
      continue;
    }
    if (job === undefined) {
      await wait(options.pollIntervalMs, options.signal);
      continue;
    }
    // Once claimed, finish this attempt even if shutdown was requested during claimNext.
    const attempt = new AbortController();
    const heartbeat = new AbortController();
    const startedAt = Date.now();
    const renewal = (async () => {
      while (!heartbeat.signal.aborted) {
        await wait(options.heartbeatIntervalMs, heartbeat.signal);
        if (heartbeat.signal.aborted) break;
        try {
          const renewed = await queue.renewLease(job);
          if (heartbeat.signal.aborted) break;
          if (renewed) continue;
        } catch {
          if (heartbeat.signal.aborted) break;
          // A lost connection cannot be treated as proof of continued ownership.
        }
        attempt.abort(new Error("A reserva de processamento não está mais disponível."));
        emit("worker_lease_lost");
        break;
      }
    })();
    try {
      await processor.process({ ...job, signal: attempt.signal });
      heartbeat.abort();
      await renewal;
      attempt.signal.throwIfAborted();
      processedCount += 1;
      emit("worker_document_completed", Date.now() - startedAt);
    } catch {
      heartbeat.abort();
      await renewal;
      emit("worker_processing_failed", Date.now() - startedAt);
      try {
        await queue.fail(job);
      } catch {
        emit("worker_retry_failed");
        // The expired lease remains recoverable after a process or database failure.
      }
      await wait(options.pollIntervalMs, options.signal);
    } finally {
      heartbeat.abort();
      await renewal;
    }
  }
  emit("worker_stopped");
  return processedCount;
}
