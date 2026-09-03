import { Pool } from "pg";

import { createLocalPrivateDocumentStorage } from "../documents/private-document-storage.js";
import { createOpenAiOcrAdapterFromEnvironment } from "../documents/openai-ocr.js";
import { createScopedPostgresDocumentProcessor } from "../documents/postgres-document-processing-repository.js";
import {
  processOne,
  type ProcessingJobQueue,
  type ProcessingJobQueueLike,
  type ScopedDocumentProcessor
} from "./processing-worker.js";
import { createPostgresProcessingJobQueue } from "./postgres-processing-job-queue.js";

const emptyQueue: ProcessingJobQueue = {
  async claimNext() {
    return undefined;
  },
  async fail() {}
};

const noOpProcessor: ScopedDocumentProcessor = {
  async process() {}
};

export async function startWorker(
  queue: ProcessingJobQueueLike = emptyQueue,
  processor: ScopedDocumentProcessor = noOpProcessor
): Promise<"processed" | "idle"> {
  return processOne(queue, processor);
}

export async function startPersistentWorker(
  databaseUrl: string,
  storageRoot = ".local/synthetic-documents",
  environment: NodeJS.ProcessEnv = process.env
): Promise<"processed" | "idle"> {
  const pool = new Pool({ connectionString: databaseUrl });
  const storage = createLocalPrivateDocumentStorage(storageRoot);

  try {
    return await processOne(
      createPostgresProcessingJobQueue(pool),
      createScopedPostgresDocumentProcessor(
        pool,
        storage,
        createOpenAiOcrAdapterFromEnvironment(environment)
      )
    );
  } finally {
    await pool.end();
  }
}

export async function startPersistentWorkerFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): Promise<"processed" | "idle"> {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("Defina DATABASE_URL para iniciar o worker persistido.");
  }

  return startPersistentWorker(
    databaseUrl,
    environment.DOCUMENT_STORAGE_ROOT?.trim() || ".local/synthetic-documents",
    environment
  );
}
