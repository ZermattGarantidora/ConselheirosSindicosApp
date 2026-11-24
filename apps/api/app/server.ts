import { Pool } from "pg";
import { createAccessCodeService } from "../identity/access-code.js";
import { createLocalAccessCodeService } from "../identity/local-access-code-store.js";
import { createPostgresAccessCodeStore } from "../identity/postgres-access-code-store.js";
import { createPostgresConversationStore } from "../answers/postgres-conversation-store.js";
import { createPostgresDocumentAnalysisReader } from "../analysis/document-analysis-reader.js";

import {
  createLocalSyntheticAnswerGateway,
  createProviderFallbackAnswerGateway
} from "../answers/answer-gateway.js";
import { createAnswerService } from "../answers/answer-service.js";
import { createAnswerUseCase } from "../answers/answer-use-case.js";
import { createLocalExtractiveGateway } from "../answers/local-extractive-gateway.js";
import { createOpenAiAnswerGatewayFromEnvironment } from "../answers/openai-answer-gateway.js";
import {
  createCodexAnswerGatewayFromEnvironment,
  createCodexDocumentBatchGatewayFromEnvironment,
  type CodexDiagnostic
} from "../answers/codex-answer-gateway.js";
import { createGeminiAnswerGatewayFromEnvironment } from "../answers/gemini-answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../answers/in-memory-answer-persistence.js";
import { createPostgresAnswerPersistence } from "../answers/postgres-answer-persistence.js";
import { chatSessionConnectionString } from "../answers/chat-session-connection.js";
import { createApi } from "./create-api.js";
import { createPostgresChatRepository } from "../chats/postgres-chat-repository.js";
import { createPostgresDocumentUploadRepository } from "../documents/postgres-document-upload-repository.js";
import { createScopedPostgresDocumentProcessor } from "../documents/postgres-document-processing-repository.js";
import { createDevelopmentDocumentMemory } from "../documents/development-document-memory.js";
import type { RegisteredDocument } from "../documents/document-catalog.js";
import { createDevelopmentDocumentUploadRepository } from "../documents/development-document-upload-repository.js";
import { createPostgresPrivateDocumentStorage } from "../documents/postgres-private-document-storage.js";
import { createPostgresDocumentRetentionRepository } from "../documents/postgres-document-retention-repository.js";
import { createHostedDocumentProcessingAdapters } from "../documents/hosted-document-processing.js";
import { deniedApiOperationControl } from "./operation-control.js";
import {
  createDevelopmentDocumentSourceReader,
  createPostgresDocumentSourceReader
} from "../documents/document-source.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";
import { createPostgresMembershipRepository } from "../identity/postgres-identity-repository.js";
import { createPostgresAccountAuth } from "../identity/postgres-account-auth.js";
import { createAccountActionDeliveryFromEnvironment } from "../identity/account-action-delivery.js";
import { createAccountSecretCipherFromEnvironment } from "../identity/account-security.js";
import { createPostgresAccountSecurity } from "../identity/postgres-account-security.js";
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
import { registerWebAssets } from "./web-assets.js";
import { createDemoWorkAdmission } from "../operations/demo-work-admission.js";
import { startMemoryDiagnostics } from "../operations/memory-diagnostics.js";
import { createVerifiedLegalLibrary } from "../legislation/verified-legal-library.js";
import { createDemoWebResearchFromEnvironment } from "../answers/demo-web-research.js";
import { createPostgresLegalCopyReader } from "../legislation/postgres-legal-copy-reader.js";

function attachMemoryDiagnostics(
  app: ReturnType<typeof createApi>,
  environment: NodeJS.ProcessEnv
): void {
  if (environment.APP_ENV?.trim().toLowerCase() !== "production") return;
  let stop: (() => void) | undefined;
  app.addHook("onListen", async () => {
    stop = startMemoryDiagnostics();
  });
  app.addHook("onClose", async () => {
    stop?.();
  });
}

function publishedWebDirectory(environment: NodeJS.ProcessEnv): string | undefined {
  const value = environment.WEB_DIST_DIR?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function listeningHost(environment: NodeJS.ProcessEnv): string {
  return environment.APP_ENV?.trim().toLowerCase() === "production" ? "0.0.0.0" : "127.0.0.1";
}

function listeningPort(fallbackPort: number, environment: NodeJS.ProcessEnv): number {
  const value = Number(environment.PORT);
  return Number.isInteger(value) && value > 0 && value <= 65_535 ? value : fallbackPort;
}

function logCodexDiagnostic(diagnostic: CodexDiagnostic): void {
  if (diagnostic.code === "codex_completed") return;
  console.error("Falha controlada no gateway Codex", {
    code: diagnostic.code,
    stage: diagnostic.stage,
    latencyMs: diagnostic.latencyMs,
    ...(diagnostic.protocol === undefined ? {} : { protocol: diagnostic.protocol })
  });
}

export async function startServer(
  port = 3000,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReturnType<typeof createApi>> {
  const listeningOptions = {
    host: listeningHost(environment),
    port: listeningPort(port, environment)
  };
  const webDirectory = publishedWebDirectory(environment);
  const databaseUrl = environment.DATABASE_URL?.trim();
  const demoMode = environment.DEMO_MODE?.trim().toLowerCase() === "true";
  const useDevelopmentRuntime = demoMode || databaseUrl === undefined || databaseUrl.length === 0;
  const demoSeedDocuments = environment.DEMO_SEED_DOCUMENTS?.trim().toLowerCase() === "true";
  const googleOAuth = demoMode ? undefined : createGoogleOAuthFromEnvironment(environment);
  const codexGateway = createCodexAnswerGatewayFromEnvironment(environment, logCodexDiagnostic);
  const demoWebResearchGateway = createDemoWebResearchFromEnvironment(environment);
  const openAiGateway =
    codexGateway === undefined ? createOpenAiAnswerGatewayFromEnvironment(environment) : undefined;
  const geminiGateway =
    codexGateway === undefined ? createGeminiAnswerGatewayFromEnvironment(environment) : undefined;
  const configuredAnswerGateway =
    codexGateway ??
    (openAiGateway !== undefined && geminiGateway !== undefined
      ? createProviderFallbackAnswerGateway(openAiGateway, geminiGateway)
      : (openAiGateway ?? geminiGateway));
  const localAnswerGateway = createLocalSyntheticAnswerGateway();
  const answerGateway = configuredAnswerGateway ?? localAnswerGateway;
  const setupMessageGateway = configuredAnswerGateway;
  const codexDocumentBatchGateway = createCodexDocumentBatchGatewayFromEnvironment(
    environment,
    logCodexDiagnostic
  );
  const aiProvider =
    codexGateway !== undefined
      ? "codex"
      : openAiGateway !== undefined
        ? "openai"
        : geminiGateway !== undefined
          ? "gemini"
          : "local";

  if ((databaseUrl === undefined || databaseUrl.length === 0) && !demoMode) {
    throw new Error(
      "DATABASE_URL é obrigatória para iniciar o site real. Use DEMO_MODE=true somente quando quiser iniciar a demonstração."
    );
  }
  if (!useDevelopmentRuntime && configuredAnswerGateway === undefined) {
    throw new Error("A OpenAI ou a Gemini deve estar configurada para iniciar o site real.");
  }

  if (useDevelopmentRuntime) {
    const legalLibrary = createVerifiedLegalLibrary();
    const seededRetrievalFixtures = demoSeedDocuments ? developmentRetrievalFixtures : [];
    const seededDevelopmentChunks = demoSeedDocuments ? developmentChunks : [];
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
    const developmentDocumentMemory = createDevelopmentDocumentMemory(seededRetrievalFixtures);
    const developmentDocuments: readonly RegisteredDocument[] = seededRetrievalFixtures.map(
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
    const seededSourceReader = createDevelopmentDocumentSourceReader(seededDevelopmentChunks);
    const uploadSourceReader = developmentDocumentMemory.createSourceReader(
      developmentDocumentRepository
    );
    const app = createApi({
      accessCodeAuth: await createLocalAccessCodeService(
        environment.ACCESS_CODE_DIRECTORY?.trim() || ".local/access-codes"
      ),
      secureCookies: environment.APP_ENV?.trim().toLowerCase() === "production",
      membershipRepository: developmentMembershipRegistry,
      developmentMembershipRegistry,
      condominiumProfileRepository,
      developmentDocumentMemory,
      legalCopyReader: legalLibrary,
      ...(environment.APP_ENV?.trim().toLowerCase() === "production"
        ? { demoWorkAdmission: createDemoWorkAdmission() }
        : {}),
      documentUploadRepository: developmentDocumentRepository,
      documentCatalogRepository: developmentDocumentRepository,
      aiProvider,
      ...(setupMessageGateway === undefined ? {} : { setupMessageGateway }),
      ...(codexDocumentBatchGateway === undefined ? {} : { codexDocumentBatchGateway }),
      answerUseCase: createAnswerUseCase({
        retriever: createScopedTextRetriever(
          legalLibrary.composeIndex(developmentDocumentMemory.index)
        ),
        gateway: answerGateway,
        ...(demoWebResearchGateway === undefined ? {} : { demoWebResearchGateway }),
        persistence: createInMemoryAnswerPersistence(),
        onValidationFailure: (diagnostic) =>
          console.error("Falha controlada na validação da resposta", diagnostic)
      }),
      retriever: createScopedTextRetriever(
        legalLibrary.composeIndex(createDevelopmentScopedRetrievalIndex(seededDevelopmentChunks))
      ),
      answerService: createAnswerService(createLocalExtractiveGateway()),
      documentSourceReader: legalLibrary.composeReader({
        async getAuthorizedPage(context, input) {
          return (
            (await uploadSourceReader.getAuthorizedPage(context, input)) ??
            (await seededSourceReader.getAuthorizedPage(context, input))
          );
        }
      })
    });
    attachMemoryDiagnostics(app, environment);
    if (webDirectory !== undefined) registerWebAssets(app, webDirectory);
    await app.listen(listeningOptions);
    return app;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const chatSessionPool = new Pool({
    connectionString: chatSessionConnectionString(databaseUrl),
    max: 10,
    connectionTimeoutMillis: 5_000
  });
  const accountActionDelivery = createAccountActionDeliveryFromEnvironment(environment);
  const accountSecurity = createPostgresAccountSecurity(
    pool,
    createAccountSecretCipherFromEnvironment(environment)
  );
  const documentStorage = createPostgresPrivateDocumentStorage(pool);
  // Nenhuma chave/flag autoriza transferência real nesta preparação (Spec 071/ADR 0043).
  const hostedDocuments = createHostedDocumentProcessingAdapters();
  const imageAnalysisAdapter = hostedDocuments.imageAnalysisAdapter;
  const imageEmbeddingAdapter = undefined;
  const embeddedDocumentWorker =
    environment.DOCUMENT_WORKER_IN_API?.trim().toLowerCase() === "true";
  const processingQueue = createPostgresProcessingJobQueue(pool);
  const documentProcessor = createScopedPostgresDocumentProcessor(
    pool,
    documentStorage,
    hostedDocuments.ocrAdapter,
    imageAnalysisAdapter,
    imageEmbeddingAdapter
  );
  let processingChain: Promise<void> = Promise.resolve();
  const processPendingDocuments = (): Promise<void> => {
    const currentRun = processingChain.then(async () => {
      await drainProcessingQueue(processingQueue, documentProcessor);
    });
    processingChain = currentRun.catch(() => {
      console.error("Falha no processamento documental em segundo plano", {
        code: "document_processing_failed"
      });
    });
    return processingChain;
  };
  const documentRepository = createPostgresDocumentUploadRepository(pool);
  const documentRetentionRepository = createPostgresDocumentRetentionRepository(pool);
  const purgeExpiredDocuments = async (): Promise<void> => {
    try {
      await documentRetentionRepository.purgeExpiredDocuments();
    } catch {
      console.error("Falha na retenção documental em segundo plano", {
        code: "document_retention_failed"
      });
    }
  };
  const app = createApi({
    operationControl: deniedApiOperationControl,
    ...(environment.ACCESS_CODE_SECRET === undefined
      ? {}
      : {
          accessCodeAuth: createAccessCodeService(
            createPostgresAccessCodeStore(pool),
            environment.ACCESS_CODE_SECRET
          )
        }),
    membershipRepository: createPostgresMembershipRepository(pool),
    conversationStore: createPostgresConversationStore(pool),
    chatRepository: createPostgresChatRepository(pool),
    accountAuth: createPostgresAccountAuth(pool),
    accountSecurity,
    ...(accountActionDelivery === undefined ? {} : { accountActionDelivery }),
    ...(googleOAuth === undefined ? {} : { googleOAuth }),
    condominiumDirectory: createPostgresCondominiumDirectory(pool),
    condominiumProfileRepository: createPostgresCondominiumProfileRepository(pool),
    secureCookies: environment.APP_ENV?.trim().toLowerCase() === "production",
    authSessionRestore: environment.AUTH_SESSION_AUTO_RESTORE?.trim().toLowerCase() !== "false",
    aiProvider,
    legalCopyReader: createPostgresLegalCopyReader(pool),
    ...(setupMessageGateway === undefined ? {} : { setupMessageGateway }),
    ...(codexDocumentBatchGateway === undefined ? {} : { codexDocumentBatchGateway }),
    documentStorage,
    imageUploadsEnabled: imageAnalysisAdapter !== undefined && imageEmbeddingAdapter !== undefined,
    documentAnalysisReader: createPostgresDocumentAnalysisReader(pool),
    documentUploadRepository: documentRepository,
    documentCatalogRepository: documentRepository,
    ...(embeddedDocumentWorker ? { processPendingDocuments } : {}),
    answerUseCase: createAnswerUseCase({
      retriever: createScopedTextRetriever(
        createPostgresScopedRetrievalIndex(pool, undefined, imageEmbeddingAdapter)
      ),
      gateway: answerGateway,
      persistence: createPostgresAnswerPersistence(pool, chatSessionPool),
      onValidationFailure: (diagnostic) =>
        console.error("Falha controlada na validação da resposta", diagnostic)
    }),
    retriever: createScopedTextRetriever(
      createPostgresScopedRetrievalIndex(pool, undefined, imageEmbeddingAdapter)
    ),
    answerService: createAnswerService(createLocalExtractiveGateway()),
    answerTraceStore: createPostgresAnswerTraceStore(pool),
    documentSourceReader: createPostgresDocumentSourceReader(pool)
  });
  attachMemoryDiagnostics(app, environment);
  if (webDirectory !== undefined) registerWebAssets(app, webDirectory);
  let documentWorkerTimer: ReturnType<typeof setInterval> | undefined;
  await purgeExpiredDocuments();
  const documentRetentionTimer = setInterval(
    () => {
      void purgeExpiredDocuments();
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
    await chatSessionPool.end();
    await pool.end();
  });
  await app.listen(listeningOptions);
  return app;
}
