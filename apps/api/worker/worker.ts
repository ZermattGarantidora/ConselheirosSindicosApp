import { Pool } from "pg";

import { createPostgresPrivateDocumentStorage } from "../documents/postgres-private-document-storage.js";
import { createOpenAiOcrAdapterFromEnvironment } from "../documents/openai-ocr.js";
import { createGeminiImageAnalysisAdapterFromEnvironment } from "../documents/gemini-image-analysis.js";
import { createGeminiMultimodalEmbeddingAdapterFromEnvironment } from "../retrieval/gemini-multimodal-embedding.js";
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
  environment: NodeJS.ProcessEnv = process.env
): Promise<"processed" | "idle"> {
  const pool = new Pool({ connectionString: databaseUrl });
  const storage = createPostgresPrivateDocumentStorage(pool);

  try {
    return await processOne(
      createPostgresProcessingJobQueue(pool),
      createScopedPostgresDocumentProcessor(
        pool,
        storage,
        createOpenAiOcrAdapterFromEnvironment(environment),
        createGeminiImageAnalysisAdapterFromEnvironment(environment),
        createGeminiMultimodalEmbeddingAdapterFromEnvironment(environment)
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

  return startPersistentWorker(databaseUrl, environment);
}
