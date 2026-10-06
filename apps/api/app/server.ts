import { Pool } from "pg";

import { createPostgresAdminDashboard, parseAdminUserIds } from "../admin/admin-dashboard.js";

import {
  createFallbackAnswerGateway,
  createLocalSyntheticAnswerGateway
} from "../answers/answer-gateway.js";
import { createAnswerService } from "../answers/answer-service.js";
import { createAnswerUseCase } from "../answers/answer-use-case.js";
import { createLocalExtractiveGateway } from "../answers/local-extractive-gateway.js";
import { createGeminiAnswerGatewayFromEnvironment } from "../answers/gemini-answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../answers/in-memory-answer-persistence.js";
import { createPostgresAnswerPersistence } from "../answers/postgres-answer-persistence.js";
import { createApi } from "./create-api.js";
import { createPostgresDocumentUploadRepository } from "../documents/postgres-document-upload-repository.js";
import { createScopedPostgresDocumentProcessor } from "../documents/postgres-document-processing-repository.js";
import { createDevelopmentDocumentMemory } from "../documents/development-document-memory.js";
import type { RegisteredDocument } from "../documents/document-catalog.js";
import { createDevelopmentDocumentUploadRepository } from "../documents/development-document-upload-repository.js";
import { createPostgresPrivateDocumentStorage } from "../documents/postgres-private-document-storage.js";
import { createPostgresDocumentRetentionRepository } from "../documents/postgres-document-retention-repository.js";
import { createOpenAiOcrAdapterFromEnvironment } from "../documents/openai-ocr.js";
import {
  createDevelopmentDocumentSourceReader,
  createPostgresDocumentSourceReader
} from "../documents/document-source.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";
import { createPostgresMembershipRepository } from "../identity/postgres-identity-repository.js";
import { createPostgresAccountAuth } from "../identity/postgres-account-auth.js";
import { createPostgresCondominiumDirectory } from "../identity/postgres-condominium-directory.js";
import { createPostgresCondominiumProfileRepository } from "../identity/postgres-condominium-profile.js";
import { createInMemoryCondominiumProfileRepository } from "../identity/in-memory-condominium-profile.js";
import type { CondominiumProfile } from "../identity/condominium-profile.js";
import { createGoogleOAuthFromEnvironment } from "../identity/google-oauth.js";
import { createPostgresAnswerTraceStore } from "../answers/postgres-answer-trace-store.js";
import {
  createDevelopmentScopedRetrievalIndex,
  developmentChunks
} from "../retrieval/development-scoped-retrieval.js";
import { createPostgresScopedRetrievalIndex } from "../retrieval/postgres-scoped-retrieval.js";
import { developmentRetrievalFixtures } from "../retrieval/development-retrieval-fixtures.js";
import { createScopedTextRetriever } from "../retrieval/text-retrieval.js";
import { drainProcessingQueue } from "../worker/processing-worker.js";
import { createPostgresProcessingJobQueue } from "../worker/postgres-processing-job-queue.js";

export async function startServer(
  port = 3000,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReturnType<typeof createApi>> {
  const databaseUrl = environment.DATABASE_URL?.trim();
  const demoMode = environment.DEMO_MODE?.trim().toLowerCase() === "true";
  const googleOAuth = createGoogleOAuthFromEnvironment(environment);
  const geminiGateway = createGeminiAnswerGatewayFromEnvironment(environment);
  const localAnswerGateway = createLocalSyntheticAnswerGateway();
  const answerGateway =
    geminiGateway === undefined
      ? localAnswerGateway
      : createFallbackAnswerGateway(geminiGateway, localAnswerGateway);
  const aiProvider = geminiGateway === undefined ? "local" : "gemini";

  if ((databaseUrl === undefined || databaseUrl.length === 0) && !demoMode) {
    throw new Error(
      "DATABASE_URL é obrigatória para iniciar o site real. Use DEMO_MODE=true somente quando quiser iniciar a demonstração."
    );
  }

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    const developmentMembershipRegistry = createDevelopmentIdentityRepository();
    const developmentProfile = (
      profile: Readonly<{
        condominiumId: string;
        name: string;
        cnpj: string;
        administrationCompany: string;
        unitCount: number | null;
        address: CondominiumProfile["address"];
        contact: CondominiumProfile["contact"];
      }>
    ): CondominiumProfile =>
      Object.freeze({
        ...profile,
        description: ""
      });
    const condominiumProfileRepository = createInMemoryCondominiumProfileRepository(
      [
        developmentProfile({
          condominiumId: "alameda",
          name: "Residencial Alameda",
          cnpj: "",
          administrationCompany: "",
          unitCount: null,
          address: {
            postalCode: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "São Paulo",
            state: "SP"
          },
          contact: { managerName: "", email: "", phone: "" }
        }),
        developmentProfile({
          condominiumId: "bosque",
          name: "Condomínio Bosque",
          cnpj: "",
          administrationCompany: "",
          unitCount: null,
          address: {
            postalCode: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "Campinas",
            state: "SP"
          },
          contact: { managerName: "", email: "", phone: "" }
        })
      ],
      (userId, condominiumId) => {
        const created = developmentMembershipRegistry
          .listTestCondominiums(userId)
          .find((condominium) => condominium.condominiumId === condominiumId);
        return created === undefined
          ? undefined
          : developmentProfile({ ...created, address: created.address, contact: created.contact });
      }
    );
    const developmentDocumentMemory = createDevelopmentDocumentMemory(developmentRetrievalFixtures);
    const developmentDocuments: readonly RegisteredDocument[] = developmentRetrievalFixtures.map(
      (chunk) => ({
        condominiumId: chunk.condominiumId,
        documentId: chunk.documentId,
        documentVersionId: chunk.documentVersionId,
        title: chunk.documentTitle,
        documentType: chunk.documentType,
        versionNumber: chunk.documentVersionNumber,
        sizeBytes: Math.max(1_024, Buffer.byteLength(chunk.content)),
        processingStatus: chunk.processingStatus,
        validityStatus: chunk.validityStatus,
        createdAt: "2026-09-01T00:00:00.000Z",
        expectedPageCount: null,
        processedPageCount: null,
        searchablePageCount: null,
        unreadablePageNumbers: [],
        extractionCompleteness: null,
        extractionMethod: null,
        ocrQualityScore: null
      })
    );
    const developmentDocumentRepository =
      createDevelopmentDocumentUploadRepository(developmentDocuments);
    const app = createApi({
      membershipRepository: developmentMembershipRegistry,
      developmentMembershipRegistry,
      condominiumProfileRepository,
      developmentDocumentMemory,
      documentUploadRepository: developmentDocumentRepository,
      documentCatalogRepository: developmentDocumentRepository,
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
  const documentStorage = createPostgresPrivateDocumentStorage(pool);
  const embeddedDocumentWorker =
    environment.DOCUMENT_WORKER_IN_API?.trim().toLowerCase() === "true";
  const processingQueue = createPostgresProcessingJobQueue(pool);
  const documentProcessor = createScopedPostgresDocumentProcessor(
    pool,
    documentStorage,
    createOpenAiOcrAdapterFromEnvironment(environment)
  );
  let processingChain: Promise<void> = Promise.resolve();
  const processPendingDocuments = (): Promise<void> => {
    const currentRun = processingChain.then(async () => {
      await drainProcessingQueue(processingQueue, documentProcessor);
    });
    processingChain = currentRun.catch((error: unknown) => {
      console.error("Falha no processamento documental em segundo plano", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    });
    return processingChain;
  };
  const documentRepository = createPostgresDocumentUploadRepository(pool);
  const documentRetentionRepository = createPostgresDocumentRetentionRepository(pool);
  const purgeExpiredOriginals = async (): Promise<void> => {
    try {
      await documentRetentionRepository.purgeExpiredOriginals();
    } catch (error) {
      console.error("Falha na retenção documental em segundo plano", {
        name: error instanceof Error ? error.name : "UnknownError"
      });
    }
  };
  const app = createApi({
    membershipRepository: createPostgresMembershipRepository(pool),
    accountAuth: createPostgresAccountAuth(pool),
    adminDashboard: createPostgresAdminDashboard(pool),
    adminUserIds: parseAdminUserIds(environment.ADMIN_USER_IDS),
    ...(googleOAuth === undefined ? {} : { googleOAuth }),
    condominiumDirectory: createPostgresCondominiumDirectory(pool),
    condominiumProfileRepository: createPostgresCondominiumProfileRepository(pool),
    secureCookies: environment.APP_ENV?.trim().toLowerCase() === "production",
    authSessionRestore: environment.AUTH_SESSION_AUTO_RESTORE?.trim().toLowerCase() !== "false",
    aiProvider,
    documentStorage,
    documentUploadRepository: documentRepository,
    documentCatalogRepository: documentRepository,
    ...(embeddedDocumentWorker ? { processPendingDocuments } : {}),
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
  let documentWorkerTimer: ReturnType<typeof setInterval> | undefined;
  await purgeExpiredOriginals();
  const documentRetentionTimer = setInterval(
    () => {
      void purgeExpiredOriginals();
    },
    6 * 60 * 60 * 1_000
  );
  documentRetentionTimer.unref();
  if (embeddedDocumentWorker) {
    await processPendingDocuments();
    documentWorkerTimer = setInterval(() => {
      void processPendingDocuments();
    }, 1_000);
    documentWorkerTimer.unref();
  }
  app.addHook("onClose", async () => {
    if (documentWorkerTimer !== undefined) {
      clearInterval(documentWorkerTimer);
    }
    clearInterval(documentRetentionTimer);
    await processingChain;
    await pool.end();
  });
  await app.listen({ host: "127.0.0.1", port });
  return app;
}
