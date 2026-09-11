import { Pool } from "pg";

import { createLocalSyntheticAnswerGateway } from "../answers/answer-gateway.js";
import { createAnswerService } from "../answers/answer-service.js";
import { createAnswerUseCase } from "../answers/answer-use-case.js";
import { createLocalExtractiveGateway } from "../answers/local-extractive-gateway.js";
import { createPostgresAnswerPersistence } from "../answers/postgres-answer-persistence.js";
import { createApi } from "./create-api.js";
import { createPostgresDocumentUploadRepository } from "../documents/postgres-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../documents/private-document-storage.js";
import {
  createDevelopmentDocumentSourceReader,
  createPostgresDocumentSourceReader
} from "../documents/document-source.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";
import { createPostgresMembershipRepository } from "../identity/postgres-identity-repository.js";
import { createPostgresAnswerTraceStore } from "../answers/postgres-answer-trace-store.js";
import {
  createDevelopmentScopedRetrievalIndex,
  developmentChunks
} from "../retrieval/development-scoped-retrieval.js";
import { createPostgresScopedRetrievalIndex } from "../retrieval/postgres-scoped-retrieval.js";
import { createScopedTextRetriever } from "../retrieval/text-retrieval.js";

export async function startServer(
  port = 3000,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReturnType<typeof createApi>> {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      retriever: createScopedTextRetriever(createDevelopmentScopedRetrievalIndex()),
      answerService: createAnswerService(createLocalExtractiveGateway()),
      documentSourceReader: createDevelopmentDocumentSourceReader(developmentChunks)
    });
    await app.listen({ host: "127.0.0.1", port });
    return app;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const app = createApi({
    membershipRepository: createPostgresMembershipRepository(pool),
    documentStorage: createLocalPrivateDocumentStorage(
      environment.DOCUMENT_STORAGE_ROOT?.trim() || ".local/synthetic-documents"
    ),
    documentUploadRepository: createPostgresDocumentUploadRepository(pool),
    answerUseCase: createAnswerUseCase({
      retriever: createScopedTextRetriever(createPostgresScopedRetrievalIndex(pool)),
      gateway: createLocalSyntheticAnswerGateway(),
      persistence: createPostgresAnswerPersistence(pool)
    }),
    retriever: createScopedTextRetriever(createPostgresScopedRetrievalIndex(pool)),
    answerService: createAnswerService(createLocalExtractiveGateway()),
    answerTraceStore: createPostgresAnswerTraceStore(pool),
    documentSourceReader: createPostgresDocumentSourceReader(pool)
  });
  app.addHook("onClose", async () => {
    await pool.end();
  });
  await app.listen({ host: "127.0.0.1", port });
  return app;
}
