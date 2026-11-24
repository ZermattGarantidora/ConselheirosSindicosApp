import { Pool } from "pg";

import { createPostgresPrivateDocumentStorage } from "../documents/postgres-private-document-storage.js";
import { createHostedDocumentProcessingAdapters } from "../documents/hosted-document-processing.js";
import { createScopedPostgresDocumentProcessor } from "../documents/postgres-document-processing-repository.js";
import {
  processOne,
  type ProcessingJobQueue,
  type ProcessingJobQueueLike,
  type ScopedDocumentProcessor
} from "./processing-worker.js";
import { createPostgresProcessingJobQueue } from "./postgres-processing-job-queue.js";
import { runContinuousDocumentWorker, type WorkerDiagnostic } from "./continuous-worker.js";
import { continuousWorkerConfiguration } from "./worker-configuration.js";

export async function startContinuousWorkerFromEnvironment(
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv = process.env,
  onDiagnostic?: (diagnostic: WorkerDiagnostic) => void
): Promise<number> {
  const configuration = continuousWorkerConfiguration(environment);
  const pool = new Pool({
    connectionString: configuration.databaseUrl,
    ...(configuration.ssl === undefined ? {} : { ssl: configuration.ssl }),
    max: 4,
    connectionTimeoutMillis: 5000,
    query_timeout: 30_000,
    application_name: "alvitra-document-worker"
  });
  try {
    // Política/fornecedor/budget reais ainda não estão aprovados; flags legadas não autorizam envio.
    const documents = createHostedDocumentProcessingAdapters();
    return await runContinuousDocumentWorker(
      createPostgresProcessingJobQueue(pool, { leaseSeconds: configuration.leaseSeconds }),
      createScopedPostgresDocumentProcessor(
        pool,
        createPostgresPrivateDocumentStorage(pool),
        documents.ocrAdapter,
        documents.imageAnalysisAdapter
      ),
      {
        signal,
        pollIntervalMs: configuration.pollIntervalMs,
        heartbeatIntervalMs: configuration.heartbeatIntervalMs,
        ...(onDiagnostic === undefined ? {} : { onDiagnostic })
      }
    );
  } finally {
    await pool.end();
  }
}

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
  // Preserva o contrato do chamador; configuração de ambiente não aprova transferência.
  void environment;
  const pool = new Pool({ connectionString: databaseUrl });
  const storage = createPostgresPrivateDocumentStorage(pool);

  try {
    const documents = createHostedDocumentProcessingAdapters();
    return await processOne(
      createPostgresProcessingJobQueue(pool),
      createScopedPostgresDocumentProcessor(
        pool,
        storage,
        documents.ocrAdapter,
        documents.imageAnalysisAdapter
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
