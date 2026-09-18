import { Pool } from "pg";

import { createLocalSyntheticAnswerGateway } from "../answers/answer-gateway.js";
import { createAnswerService } from "../answers/answer-service.js";
import { createAnswerUseCase } from "../answers/answer-use-case.js";
import { createLocalExtractiveGateway } from "../answers/local-extractive-gateway.js";
import { createGeminiAnswerGatewayFromEnvironment } from "../answers/gemini-answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../answers/in-memory-answer-persistence.js";
import { createPostgresAnswerPersistence } from "../answers/postgres-answer-persistence.js";
import { createApi } from "./create-api.js";
import { createPostgresDocumentUploadRepository } from "../documents/postgres-document-upload-repository.js";
import { createDevelopmentDocumentMemory } from "../documents/development-document-memory.js";
import { createLocalPrivateDocumentStorage } from "../documents/private-document-storage.js";
import {
  createDevelopmentDocumentSourceReader,
  createPostgresDocumentSourceReader
} from "../documents/document-source.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";
import { createPostgresMembershipRepository } from "../identity/postgres-identity-repository.js";
import { createPostgresAccountAuth } from "../identity/postgres-account-auth.js";
import { createPostgresCondominiumDirectory } from "../identity/postgres-condominium-directory.js";
import { createGoogleOAuthFromEnvironment } from "../identity/google-oauth.js";
import { createPostgresAnswerTraceStore } from "../answers/postgres-answer-trace-store.js";
import {
  createDevelopmentScopedRetrievalIndex,
  developmentChunks
} from "../retrieval/development-scoped-retrieval.js";
import { createPostgresScopedRetrievalIndex } from "../retrieval/postgres-scoped-retrieval.js";
import { developmentRetrievalFixtures } from "../retrieval/development-retrieval-fixtures.js";
import { createScopedTextRetriever } from "../retrieval/text-retrieval.js";

export async function startServer(
  port = 3000,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReturnType<typeof createApi>> {
  const databaseUrl = environment.DATABASE_URL?.trim();
  const googleOAuth = createGoogleOAuthFromEnvironment(environment);
  const geminiGateway = createGeminiAnswerGatewayFromEnvironment(environment);
  const answerGateway = geminiGateway ?? createLocalSyntheticAnswerGateway();
  const aiProvider = geminiGateway === undefined ? "local" : "gemini";

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    const developmentMembershipRegistry = createDevelopmentIdentityRepository();
    const developmentDocumentMemory = createDevelopmentDocumentMemory(developmentRetrievalFixtures);
    const app = createApi({
      membershipRepository: developmentMembershipRegistry,
      developmentMembershipRegistry,
      developmentDocumentMemory,
      aiProvider,
      answerUseCase: createAnswerUseCase({
        retriever: createScopedTextRetriever(developmentDocumentMemory.index),
        gateway: answerGateway,
        persistence: createInMemoryAnswerPersistence()
      }),
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
    accountAuth: createPostgresAccountAuth(pool),
    ...(googleOAuth === undefined ? {} : { googleOAuth }),
    condominiumDirectory: createPostgresCondominiumDirectory(pool),
    secureCookies: environment.APP_ENV?.trim().toLowerCase() === "production",
    aiProvider,
    documentStorage: createLocalPrivateDocumentStorage(
      environment.DOCUMENT_STORAGE_ROOT?.trim() || ".local/synthetic-documents"
    ),
    documentUploadRepository: createPostgresDocumentUploadRepository(pool),
    answerUseCase: createAnswerUseCase({
      retriever: createScopedTextRetriever(createPostgresScopedRetrievalIndex(pool)),
      gateway: answerGateway,
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
