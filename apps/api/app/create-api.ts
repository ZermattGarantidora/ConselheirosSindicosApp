import { createHash, randomUUID } from "node:crypto";
import { readAccessCookie, accessCookie, type AccessCodeService } from "../identity/access-code.js";
import { registerAccessCodeRoutes } from "./access-code-routes.js";
import {
  integralFinancialCatalog,
  computeIntegralSum,
  isIntegralSumQuestion,
  assertIntegralAnswer
} from "../analysis/integral-document-sum.js";
import type { GeneratedAnswer } from "../answers/answer-contract.js";
import { canJournalCiteDocument } from "./question-document-citations.js";
import type { ApiOperationControl, ApiOperation } from "./operation-control.js";
import { OperationBudgetError } from "../security/operation-budget.js";
import { addJournalReplayProof, type JournalReplayProof } from "./journal-replay-proof.js";
import { readDocumentUseDecision } from "../../shared/document-use-decision.js";
import {
  createInMemoryConversationStore,
  conversationHash,
  ConversationStoreError,
  type ConversationStore
} from "../answers/conversation-store.js";
import { registerConversationJournal } from "./conversation-journal.js";
import { performance } from "node:perf_hooks";

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";

import { createAnswerUseCase, type AnswerUseCase } from "../answers/answer-use-case.js";
import { journalMemoryEntries } from "../answers/journal-memory.js";
import { ConversationMemoryError } from "../answers/conversation-memory.js";
import { createFailedAnswer, type AnswerService } from "../answers/answer-service.js";
import {
  createLocalSyntheticAnswerGateway,
  type AnswerGateway
} from "../answers/answer-gateway.js";
import { generateSetupMessage, isSetupMessageRequest } from "../answers/setup-message.js";
import { registerDocumentBatchConversationRoute } from "./document-batch-conversation-route.js";
import type { HostedDocumentBatchGatewayFactory } from "../answers/hosted-document-batch-gateway.js";
import {
  questionResearchProgress,
  registerQuestionResearchProgress
} from "./question-research-progress.js";
import type { DocumentExtractionSummary } from "../documents/document-processing.js";
import {
  buildDocumentSnapshot,
  canSummarizeDocument,
  financialCatalogRevision
} from "../analysis/document-snapshot.js";
import {
  documentConversationState,
  generateDocumentConversation,
  type DocumentConversationEvent
} from "../answers/document-conversation.js";
import {
  InvalidSetupInterpretationError,
  interpretSetupTurn,
  isSetupTurnRequest
} from "../answers/setup-turn.js";
import {
  isFeedbackClassification,
  type SubmitFeedbackInput
} from "../answers/answer-persistence.js";
import { createInMemoryAnswerPersistence } from "../answers/in-memory-answer-persistence.js";
import { toPublicAnswer } from "../answers/answer-contract.js";
import {
  analyzeDocumentRequest,
  isDocumentAnalysisRequest,
  unavailableDocumentAnalysis,
  type DocumentAnalysisReport
} from "../analysis/document-analysis.js";
import type {
  DocumentAnalysisReader,
  AnalysisDocument
} from "../analysis/document-analysis-reader.js";
import { createCondominiumId } from "../core/condominium-scope.js";
import {
  AccessDeniedError,
  createUserId,
  resolveAuthorizedCondominiumContext,
  type MembershipRepository
} from "../identity/authorized-condominium-context.js";
import type { DevelopmentMembershipRegistry } from "../identity/development-identity-repository.js";
import {
  CondominiumProfilePhotoLimitError,
  InvalidCondominiumProfileError,
  decodeCondominiumProfilePhoto,
  learnCondominiumProfileFromConversation,
  validateCondominiumProfileUpdate,
  type CondominiumProfileRepository
} from "../identity/condominium-profile.js";
import type { DevelopmentDocumentMemory } from "../documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../documents/development-document-upload-repository.js";
import {
  DocumentCatalogForbiddenError,
  listRegisteredDocuments,
  type DocumentCatalogRepository
} from "../documents/document-catalog.js";
import {
  DocumentUploadForbiddenError,
  InvalidDocumentUploadError,
  maximumDocumentUploadBytes,
  maximumImageUploadBytes,
  uploadDocument,
  type DocumentUploadRepository
} from "../documents/upload-document.js";
import {
  createLocalPrivateDocumentStorage,
  type PrivateDocumentReader,
  type PrivateDocumentStorage
} from "../documents/private-document-storage.js";
import { DocumentOriginalNotFoundError } from "../documents/postgres-private-document-storage.js";
import {
  AnswerTraceNotFoundError,
  createInMemoryAnswerTraceStore,
  InvalidAnswerFeedbackError,
  type AnswerTraceStore
} from "../answers/answer-trace.js";
import { evaluateEvidenceSufficiency } from "../retrieval/retrieval-ranking.js";
import {
  retrievalPipelineVersion,
  retrievalQueryHash,
  type ScopedRetrievalResult
} from "../retrieval/retrieval-contract.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import {
  createDocumentSourceUrl,
  type DocumentSourceReader
} from "../documents/document-source.js";
import {
  AccountAuthError,
  getAccountSessionCookie,
  serializeAccountSessionCookie,
  serializeClearedAccountSessionCookie,
  type AccountAuthService
} from "../identity/account-auth.js";
import type { AccountActionDelivery } from "../identity/account-action-delivery.js";
import type { AccountSecurityService } from "../identity/account-security.js";
import {
  createGoogleOAuthState,
  googleOAuthStatesMatch,
  readGoogleOAuthState,
  serializeClearedGoogleOAuthStateCookie,
  serializeGoogleOAuthStateCookie,
  type GoogleOAuthClient
} from "../identity/google-oauth.js";
import {
  CondominiumAlreadyExistsError,
  type CondominiumDirectory,
  type CreateCondominiumInput
} from "../identity/postgres-condominium-directory.js";
import { createInMemoryScopedRetrievalIndex } from "../retrieval/in-memory-scoped-retrieval.js";
import {
  createScopedTextRetriever,
  type ScopedTextRetriever
} from "../retrieval/text-retrieval.js";
import {
  createInMemoryTenantWorkLimiter,
  TenantWorkLimitExceededError,
  type TenantWorkLimiter
} from "../operations/tenant-work-limiter.js";
import type { DemoWorkAdmission } from "../operations/demo-work-admission.js";
import {
  chatIdPattern,
  createInMemoryChatRepository,
  legacyChatId,
  parseHistoryCursor,
  type ChatRepository
} from "../chats/chat-repository.js";
import { ChatHttpError, registerChatRoutes } from "../chats/chat-routes.js";
import { registerDocumentDraftRoutes } from "../authoring/document-draft-routes.js";
import { createDocumentDraftService } from "../authoring/document-drafts.js";
import {
  createFinancialReportService,
  type FinancialReportModel
} from "../authoring/financial-report.js";
import { registerFinancialReportRoutes } from "../authoring/financial-report-routes.js";
import { docxMediaType } from "../documents/extract-docx-text.js";
import { registerAudioInputRoutes } from "../authoring/audio-input-routes.js";
import { createAudioInputService } from "../authoring/audio-inputs.js";
import { createAudioMinutesService } from "../authoring/audio-minutes.js";
import { registerAudioMinutesRoutes } from "../authoring/audio-minutes-routes.js";
import type { AudioTranscriber } from "../authoring/audio-transcription.js";
import type { SemanticMinutesModel } from "../authoring/semantic-minutes-model.js";
import type { DurableAudioStorage } from "../authoring/postgres-audio-storage.js";
import {
  createDocumentImprovementService,
  type DocumentImprovementAgent
} from "../authoring/document-improvements.js";
import type { LegalCopyReader } from "../legislation/verified-legal-library.js";
import {
  createDocumentAuthoringService,
  type DocumentAuthoringModel
} from "../authoring/document-authoring.js";
import { registerDocumentAuthoringRoutes } from "../authoring/document-authoring-routes.js";
import type { AuthoringOperations } from "../authoring/authoring-operations.js";
import type { AuthoringScope } from "../authoring/authoring-artifacts.js";

export type CreateApiOptions = Readonly<{
  audioTranscriber?: AudioTranscriber;
  audioMinutesModel?: SemanticMinutesModel;
  syntheticDurableAudio?: DurableAudioStorage;
  documentImprovementAgent?: DocumentImprovementAgent;
  documentAuthoringModel?: DocumentAuthoringModel;
  financialReportModel?: FinancialReportModel;
  syntheticAuthoringOperations?: AuthoringOperations;
  assertDocumentRecovery?: () => Promise<unknown>;
  operationControl?: ApiOperationControl;
  conversationStore?: ConversationStore;
  legalCopyReader?: LegalCopyReader;
  membershipRepository: MembershipRepository;
  aiProvider?: "openai" | "gemini" | "codex" | "local";
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  imageUploadsEnabled?: boolean;
  documentUploadRepository?: DocumentUploadRepository;
  documentCatalogRepository?: DocumentCatalogRepository;
  answerUseCase?: AnswerUseCase;
  setupMessageGateway?: AnswerGateway;
  codexDocumentBatchGateway?: AnswerGateway;
  hostedDocumentBatchGateway?: HostedDocumentBatchGatewayFactory;
  answerService?: AnswerService;
  answerTraceStore?: AnswerTraceStore;
  retriever?: ScopedTextRetriever;
  documentSourceReader?: DocumentSourceReader;
  developmentMembershipRegistry?: DevelopmentMembershipRegistry;
  developmentDocumentMemory?: DevelopmentDocumentMemory;
  accountAuth?: AccountAuthService;
  accessCodeAuth?: AccessCodeService;
  accountSecurity?: AccountSecurityService;
  accountActionDelivery?: AccountActionDelivery;
  googleOAuth?: GoogleOAuthClient;
  condominiumDirectory?: CondominiumDirectory;
  condominiumProfileRepository?: CondominiumProfileRepository;
  secureCookies?: boolean;
  authSessionRestore?: boolean;
  processPendingDocuments?: () => Promise<void>;
  tenantWorkLimiter?: TenantWorkLimiter;
  documentAnalysisReader?: DocumentAnalysisReader;
  /** Somente harness explícito, sem seleção por ambiente/startup. */
  syntheticOriginalImprovements?: true;
  demoWorkAdmission?: DemoWorkAdmission;
  chatRepository?: ChatRepository;
}>;

type AskBody = Readonly<{ question: string; chatId?: string }>;
type CreateTestCondominiumBody = Readonly<{
  condominiumId: string;
  name: string;
  cnpj?: string;
  administrationCompany?: string;
  unitCount?: number | null;
  address?: Readonly<{
    postalCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }>;
  contact?: Readonly<{ managerName?: string; email?: string; phone?: string }>;
}>;
type FeedbackBody = Readonly<{
  classification: SubmitFeedbackInput["classification"];
  comment?: string;
}>;
type HistoryQuery = Readonly<{ limit?: string; chatId?: string; before?: string }>;
type RegisterAccountBody = Readonly<{ displayName: string; email: string; password: string }>;
type LoginAccountBody = Readonly<{ email: string; password: string }>;
type CreateCondominiumBody = CreateCondominiumInput;

function isAskBody(value: unknown): value is AskBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    typeof value.question === "string" &&
    (!("chatId" in value) || (typeof value.chatId === "string" && chatIdPattern.test(value.chatId)))
  );
}

function isRegisterAccountBody(value: unknown): value is RegisterAccountBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "password" in value &&
    typeof value.password === "string"
  );
}

function isLoginAccountBody(value: unknown): value is LoginAccountBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "password" in value &&
    typeof value.password === "string"
  );
}

function hasStringFields<T extends readonly string[]>(
  value: unknown,
  fields: T
): value is Record<T[number], string> {
  return (
    typeof value === "object" &&
    value !== null &&
    fields.every(
      (field) => field in value && typeof value[field as keyof typeof value] === "string"
    )
  );
}

function accountDeviceLabel(userAgent: string | undefined): string {
  if (userAgent === undefined || userAgent.trim().length === 0) return "Navegador";
  const browser = /Edg\//u.test(userAgent)
    ? "Edge"
    : /Firefox\//u.test(userAgent)
      ? "Firefox"
      : /Chrome\//u.test(userAgent)
        ? "Chrome"
        : /Safari\//u.test(userAgent)
          ? "Safari"
          : "Navegador";
  const system = /Android/u.test(userAgent)
    ? "Android"
    : /iPhone|iPad/u.test(userAgent)
      ? "iOS"
      : /Windows/u.test(userAgent)
        ? "Windows"
        : /Mac OS/u.test(userAgent)
          ? "macOS"
          : /Linux/u.test(userAgent)
            ? "Linux"
            : "dispositivo";
  return `${browser} em ${system}`;
}

function isCreateTestCondominiumBody(value: unknown): value is CreateTestCondominiumBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<CreateTestCondominiumBody>;
  return (
    typeof body.condominiumId === "string" &&
    body.condominiumId.trim().length > 0 &&
    typeof body.name === "string" &&
    body.name.trim().length >= 2 &&
    body.name.trim().length <= 120 &&
    (body.cnpj === undefined || typeof body.cnpj === "string") &&
    (body.address === undefined ||
      (typeof body.address === "object" &&
        body.address !== null &&
        !Array.isArray(body.address) &&
        (body.address.city === undefined || typeof body.address.city === "string") &&
        (body.address.state === undefined || typeof body.address.state === "string"))) &&
    (body.unitCount === undefined ||
      body.unitCount === null ||
      (Number.isInteger(body.unitCount) && body.unitCount > 0 && body.unitCount <= 100_000))
  );
}

function isCreateCondominiumBody(value: unknown): value is CreateCondominiumBody {
  if (typeof value === "object" && value !== null) {
    const body = value as CreateCondominiumBody;
    const cnpjDigits = typeof body.cnpj === "string" ? body.cnpj.replace(/\D/gu, "") : "";
    return (
      typeof body.name === "string" &&
      body.name.trim().length >= 2 &&
      body.name.trim().length <= 120 &&
      (body.cnpj === undefined || (typeof body.cnpj === "string" && cnpjDigits.length === 14)) &&
      (body.address === undefined ||
        (typeof body.address === "object" &&
          body.address !== null &&
          !Array.isArray(body.address) &&
          (body.address.city === undefined || typeof body.address.city === "string") &&
          (body.address.state === undefined ||
            (typeof body.address.state === "string" &&
              /^[A-Z]{2}$/iu.test(body.address.state.trim()))))) &&
      (body.contact === undefined ||
        (typeof body.contact === "object" &&
          body.contact !== null &&
          !Array.isArray(body.contact))) &&
      (body.unitCount === undefined ||
        body.unitCount === null ||
        (Number.isInteger(body.unitCount) && body.unitCount > 0 && body.unitCount <= 100_000))
    );
  }
  return false;
}

function decodeDocumentTitle(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isFeedbackBody(value: unknown): value is FeedbackBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "classification" in value &&
    isFeedbackClassification(value.classification) &&
    (!("comment" in value) || value.comment === undefined || typeof value.comment === "string")
  );
}

function parseHistoryLimit(value: string | undefined): number | undefined {
  if (value === undefined) return 50;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : undefined;
}

function publicAccountResponse(
  account: Readonly<{ userId: string; email: string; displayName: string }>
) {
  return {
    userId: account.userId,
    email: account.email,
    displayName: account.displayName
  };
}

function googleAuthErrorRedirect(redirectUri: string, reason: string): string {
  const url = new URL(redirectUri);
  url.searchParams.set("auth_error", reason);
  return url.toString();
}

function accountAuthErrorResponse(
  error: unknown,
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }
) {
  const structuralCode =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AccountAuthError" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  const code = error instanceof AccountAuthError ? error.code : structuralCode;
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Não foi possível concluir a autenticação.";
  if (code !== undefined) {
    if (code === "invalid_input") return reply.code(400).send({ message });
    if (code === "email_taken") return reply.code(409).send({ message });
    if (code === "temporarily_unavailable") {
      return reply.code(503).send({ message });
    }
    if (code === "email_unverified") {
      return reply.code(403).send({ message, code: "email_unverified" });
    }
    if (code === "invalid_token") return reply.code(400).send({ message });
    if (code === "invalid_mfa") return reply.code(401).send({ message });
    if (code === "invalid_credentials") return reply.code(401).send({ message });
  }
  console.error("Falha inesperada na autenticação", {
    name: error instanceof Error ? error.name : "UnknownError",
    code:
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown"
  });
  return reply
    .code(500)
    .send({ message: "Não foi possível concluir a autenticação com segurança." });
}

export function createApi(options: CreateApiOptions): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: maximumDocumentUploadBytes });
  if (options.assertDocumentRecovery)
    app.addHook("preHandler", async (request, reply) => {
      if (!(request.routeOptions.url ?? "").startsWith("/v1/condominiums/")) return;
      try {
        await options.assertDocumentRecovery!();
      } catch {
        return reply
          .code(503)
          .send({ message: "O ambiente documental aguarda validação de recuperação." });
      }
    });
  const pendingDocumentProcessing = new Set<Promise<void>>();
  app.addHook("onClose", async () => {
    await Promise.allSettled(pendingDocumentProcessing);
  });
  const documentReservations = new WeakMap<
    FastifyRequest,
    { release: () => void; transferred: boolean }
  >();
  const releaseUnclaimedDocument = (request: FastifyRequest) => {
    const reservation = documentReservations.get(request);
    if (reservation === undefined || reservation.transferred) return;
    reservation.release();
    documentReservations.delete(request);
  };
  app.addHook("onRequest", async (request, reply) => {
    const admission = options.demoWorkAdmission;
    if (admission === undefined || request.method !== "POST") return;
    const busy = () =>
      reply.header("retry-after", "5").code(503).send({
        code: "server_busy",
        message: "O servidor está ocupado. Aguarde alguns instantes e tente novamente."
      });
    if (!admission.hasMemoryCapacity()) return busy();
    if (request.routeOptions.url !== "/v1/condominiums/:condominiumId/documents") return;
    // Reserve before accepting a potentially large body; keep the slot through background parsing.
    const release = admission.acquireDocument();
    if (release === undefined) return busy();
    documentReservations.set(request, { release, transferred: false });
  });
  app.addHook("onResponse", async (request) => releaseUnclaimedDocument(request));
  app.addHook("onRequestAbort", async (request) => releaseUnclaimedDocument(request));
  const now = options.now ?? (() => new Date());
  const version = options.version ?? "0.1.0";
  const aiProvider = options.aiProvider ?? "local";
  const documentStorage =
    options.documentStorage ?? createLocalPrivateDocumentStorage(".local/synthetic-documents");
  const developmentDocumentRepository = createDevelopmentDocumentUploadRepository();
  const documentUploadRepository =
    options.documentUploadRepository ?? developmentDocumentRepository;
  const documentCatalogRepository =
    options.documentCatalogRepository ?? developmentDocumentRepository;
  const answerUseCase =
    options.answerUseCase ??
    createAnswerUseCase({
      retriever: createScopedTextRetriever(createInMemoryScopedRetrievalIndex([])),
      gateway: createLocalSyntheticAnswerGateway(),
      persistence: createInMemoryAnswerPersistence()
    });
  const answerTraceStore = options.answerTraceStore ?? createInMemoryAnswerTraceStore();
  const chatRepository = options.chatRepository ?? createInMemoryChatRepository(now);
  const conversationStore = options.conversationStore ?? createInMemoryConversationStore();
  const controlled = async <T>(
    request: FastifyRequest,
    kind: ApiOperation["kind"],
    payload: unknown,
    operation: () => Promise<T>,
    context?: AuthorizedCondominiumContext
  ): Promise<T> => {
    if (!options.operationControl) return operation();
    const userId = requestUserId(request);
    if (!userId) throw new OperationBudgetError("denied");
    const requestKey =
      request.headers["x-conversation-request-id"] ?? request.headers["idempotency-key"];
    if (typeof requestKey !== "string") throw new OperationBudgetError("denied");
    const input: ApiOperation = {
      kind,
      requestKey,
      payload,
      scope: context
        ? {
            kind: "tenant",
            userId: context.userId,
            condominiumId: context.condominiumId,
            membershipRevision: context.membershipRevision
          }
        : { kind: "account", userId },
      revalidate: async () => {
        if (requestUserId(request) !== userId) return false;
        if (options.accessCodeAuth) {
          const current = await options.accessCodeAuth.authenticate(
            readAccessCookie(request.headers.cookie)
          );
          if (current?.userId !== userId) return false;
        } else if (options.accountAuth) {
          const token = getAccountSessionCookie(request.headers.cookie);
          const current = token ? await options.accountAuth.authenticate(token, now()) : undefined;
          if (current?.userId !== userId) return false;
        }
        if (!context) return true;
        try {
          const current = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId: context.condominiumId,
            now: now()
          });
          return (
            current.membershipRevision === context.membershipRevision &&
            current.roleKey === context.roleKey &&
            (kind === "upload" ? current.permissions.includes("document:upload") : true)
          );
        } catch {
          return false;
        }
      }
    };
    if (options.operationControl.replayProof)
      addJournalReplayProof(request, { operation: options.operationControl.replayProof(input) });
    return options.operationControl.execute(input, operation);
  };
  registerChatRoutes(app, {
    repository: chatRepository,
    resolve: async (request, condominiumId) => {
      const userId = requestUserId(request);
      if (userId === undefined) throw new ChatHttpError(401, "Sessão não autenticada.");
      return resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId: createCondominiumId(condominiumId),
        now: now()
      });
    },
    hasLegacy: async (context) =>
      (await answerUseCase.listConversationHistory(context, 1, { chatId: legacyChatId })).length > 0
  });
  const resolveAuthoringContext = async (request: FastifyRequest, condominiumId: string) => {
    const userId = requestUserId(request);
    if (userId === undefined) throw new ChatHttpError(401, "Sessão não autenticada.");
    return resolveAuthorizedCondominiumContext(options.membershipRepository, {
      userId,
      condominiumId: createCondominiumId(condominiumId),
      now: now()
    });
  };
  const audioInputService: ReturnType<typeof createAudioInputService> = createAudioInputService({
    store: conversationStore,
    ...(options.syntheticAuthoringOperations
      ? {
          validateDerivedDraft: (
            context: AuthorizedCondominiumContext,
            scope: AuthoringScope,
            id: string
          ) => documentDraftService.export(context, scope, id)
        }
      : {}),
    ...(options.syntheticAuthoringOperations
      ? { operations: options.syntheticAuthoringOperations }
      : {}),
    storage: documentStorage,
    chats: chatRepository,
    now,
    ...("readOriginal" in documentStorage
      ? { reader: documentStorage as PrivateDocumentStorage & PrivateDocumentReader }
      : {}),
    ...(options.audioTranscriber ? { transcriber: options.audioTranscriber } : {}),
    ...(options.syntheticDurableAudio ? { durableAudio: options.syntheticDurableAudio } : {})
  });
  const documentDraftService = createDocumentDraftService({
    store: conversationStore,
    ...(options.syntheticAuthoringOperations
      ? { operations: options.syntheticAuthoringOperations }
      : {}),
    catalog: documentCatalogRepository,
    now,
    audioSource: (context, scope, id) => audioInputService.read(context, scope, id),
    authoringSource: async (context, scope, id) =>
      (await conversationStore.find(scope, `financial-report:${id}:request`))
        ? financialReportService.reference(context, scope, id)
        : documentAuthoringService.reference(context, scope, id),
    ...(options.documentSourceReader ? { sources: options.documentSourceReader } : {})
  });
  const documentAuthoringService: ReturnType<typeof createDocumentAuthoringService> =
    createDocumentAuthoringService({
      store: conversationStore,
      ...(options.syntheticAuthoringOperations
        ? { operations: options.syntheticAuthoringOperations }
        : {}),
      catalog: documentCatalogRepository,
      drafts: documentDraftService,
      now,
      ...(options.documentSourceReader ? { sources: options.documentSourceReader } : {}),
      ...(options.documentAuthoringModel ? { model: options.documentAuthoringModel } : {}),
      authorize: async (context, scope) => {
        const current = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId: context.userId,
          condominiumId: createCondominiumId(scope.condominiumId),
          now: now()
        });
        if (!(await chatRepository.find(current, scope.chatId))) throw new AccessDeniedError();
        return current;
      }
    });
  registerDocumentAuthoringRoutes(app, {
    service: documentAuthoringService,
    store: conversationStore,
    chats: chatRepository,
    resolve: resolveAuthoringContext
  });
  const financialAnalysisReader =
    options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader;
  const financialReportService = createFinancialReportService({
    store: conversationStore,
    catalog: documentCatalogRepository,
    drafts: documentDraftService,
    now,
    ...(options.syntheticAuthoringOperations
      ? { operations: options.syntheticAuthoringOperations }
      : {}),
    ...(financialAnalysisReader ? { reader: financialAnalysisReader } : {}),
    ...(options.financialReportModel ? { model: options.financialReportModel } : {}),
    authorize: async (context, scope) => {
      const current = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId: context.userId,
        condominiumId: createCondominiumId(scope.condominiumId),
        now: now()
      });
      if (!(await chatRepository.find(current, scope.chatId))) throw new AccessDeniedError();
      return current;
    }
  });
  registerFinancialReportRoutes(app, {
    service: financialReportService,
    chats: chatRepository,
    resolve: resolveAuthoringContext
  });
  const audioMinutesService = createAudioMinutesService({
    store: conversationStore,
    ...(options.syntheticAuthoringOperations
      ? { operations: options.syntheticAuthoringOperations }
      : {}),
    audio: audioInputService,
    drafts: documentDraftService,
    now,
    ...(options.audioMinutesModel ? { model: options.audioMinutesModel } : {}),
    authorize: (context, scope) =>
      resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId: context.userId,
        condominiumId: createCondominiumId(scope.condominiumId),
        now: now()
      })
  });
  registerAudioInputRoutes(app, {
    service: audioInputService,
    minutesEnabled: audioMinutesService.enabled,
    resolve: resolveAuthoringContext
  });
  registerDocumentDraftRoutes(app, {
    service: documentDraftService,
    improvements: createDocumentImprovementService({
      store: conversationStore,
      ...(options.syntheticAuthoringOperations
        ? { operations: options.syntheticAuthoringOperations }
        : {}),
      drafts: documentDraftService,
      now,
      ...(options.documentImprovementAgent ? { agent: options.documentImprovementAgent } : {}),
      authorize: async (context, scope) => {
        const current = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId: context.userId,
          condominiumId: createCondominiumId(scope.condominiumId),
          now: now()
        });
        if (!(await chatRepository.find(current, scope.chatId))) throw new AccessDeniedError();
        return current;
      }
    }),
    store: conversationStore,
    chats: chatRepository,
    resolve: resolveAuthoringContext
  });
  registerAudioMinutesRoutes(app, {
    service: audioMinutesService,
    drafts: documentDraftService,
    durable: conversationStore.durable,
    resolve: resolveAuthoringContext
  });
  const tenantWorkLimiter = options.tenantWorkLimiter ?? createInMemoryTenantWorkLimiter();
  registerDocumentBatchConversationRoute(app, {
    ...(options.syntheticOriginalImprovements
      ? {
          improveOriginal: async (
            context: AuthorizedCondominiumContext,
            chatId: string,
            versions: readonly string[],
            documents: readonly AnalysisDocument[]
          ) => {
            if (!(await chatRepository.find(context, chatId))) throw new AccessDeniedError();
            const proposal = await documentAuthoringService.original(
              context,
              {
                kind: "chat",
                userId: context.userId,
                condominiumId: context.condominiumId,
                chatId
              },
              versions,
              documents.flatMap((d) =>
                d.pages.map((p) => ({
                  version: d.documentVersionId,
                  page: p.pageNumber,
                  text: p.extractedText
                }))
              )
            );
            return proposal
              ? { status: proposal.status, proposalId: proposal.id }
              : { status: "disabled" };
          }
        }
      : {}),
    resolve: async (request, condominiumId) => {
      const userId = requestUserId(request);
      return userId === undefined
        ? undefined
        : resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId: createCondominiumId(condominiumId),
            now: now()
          });
    },
    catalog: documentCatalogRepository,
    reader: options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader,
    codexGateway: options.codexDocumentBatchGateway,
    ...(options.hostedDocumentBatchGateway === undefined
      ? {}
      : { hostedGateway: options.hostedDocumentBatchGateway }),
    consume: (context) =>
      tenantWorkLimiter.consume({
        operation: "document_question",
        userId: context.userId,
        condominiumId: context.condominiumId,
        now: now()
      })
  });
  const authenticatedAccounts = new WeakMap<
    FastifyRequest,
    | Readonly<{ userId: ReturnType<typeof createUserId>; email: string; displayName: string }>
    | undefined
  >();
  const accountAuth = options.accountAuth;
  const accessCodeAuth = options.accessCodeAuth;
  const accountSecurity = options.accountSecurity;
  const mfaEnrollmentAvailable = options.accountActionDelivery?.channel === "external_email";
  const secureCookies = options.secureCookies ?? false;
  const authSessionRestore = options.authSessionRestore ?? true;
  const unauthenticatedMessage =
    accountAuth === undefined && accessCodeAuth === undefined
      ? "Identidade de desenvolvimento inválida."
      : "Sessão não autenticada.";

  if (accessCodeAuth !== undefined) {
    registerAccessCodeRoutes(app, accessCodeAuth, secureCookies, now);
  }
  if (accountAuth !== undefined || accessCodeAuth !== undefined) {
    app.addHook("preHandler", async (request, reply) => {
      const routeUrl = request.routeOptions.url ?? "";
      if (
        routeUrl === "/health" ||
        routeUrl === "/v1/runtime" ||
        routeUrl.startsWith("/v1/access/") ||
        routeUrl.startsWith("/v1/auth/")
      ) {
        return;
      }
      if (accessCodeAuth !== undefined) {
        const deviceToken = readAccessCookie(request.headers.cookie);
        let credential;
        try {
          credential = await accessCodeAuth.authenticate(deviceToken);
        } catch {
          return reply
            .code(503)
            .send({ message: "O acesso está temporariamente indisponível. Tente novamente." });
        }
        authenticatedAccounts.set(
          request,
          credential === undefined
            ? undefined
            : {
                userId: credential.userId,
                email: "",
                displayName: ""
              }
        );
        if (credential !== undefined)
          reply.header("set-cookie", accessCookie(deviceToken!, secureCookies));
        return;
      }
      const token = getAccountSessionCookie(request.headers.cookie);
      const account =
        token === undefined ? undefined : await accountAuth!.authenticate(token, now());
      authenticatedAccounts.set(request, account);
    });
  }

  function requestUserId(request: FastifyRequest): ReturnType<typeof createUserId> | undefined {
    if (accountAuth !== undefined || accessCodeAuth !== undefined)
      return authenticatedAccounts.get(request)?.userId;
    const rawDevelopmentUserId = request.headers["x-development-user-id"];
    const developmentUserId = Array.isArray(rawDevelopmentUserId)
      ? rawDevelopmentUserId[0]
      : rawDevelopmentUserId;
    if (developmentUserId === undefined || developmentUserId.trim().length === 0) return undefined;
    return createUserId(developmentUserId);
  }

  function requestPreferredName(request: FastifyRequest): string | undefined {
    if (accountAuth !== undefined) return authenticatedAccounts.get(request)?.displayName;
    const rawHeader = request.headers["x-development-user-name"];
    const encodedName = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (encodedName === undefined) return undefined;
    try {
      const displayName = decodeURIComponent(encodedName).trim().replaceAll(/\s+/gu, " ");
      return displayName.length >= 2 && displayName.length <= 60 && !/\p{Cc}/u.test(displayName)
        ? displayName
        : undefined;
    } catch {
      return undefined;
    }
  }

  async function readIntegralSet(context: Parameters<typeof integralFinancialCatalog>[0]) {
    const reader =
      options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader;
    if (!reader) throw new Error("Leitura integral indisponível.");
    const catalog = await listRegisteredDocuments(documentCatalogRepository, context),
      selected = integralFinancialCatalog(context, catalog);
    return {
      catalog,
      documents:
        selected.length === 1
          ? await reader.readAuthorized(
              context,
              selected.filter(canSummarizeDocument).map((d) => d.documentVersionId)
            )
          : []
    };
  }
  registerConversationJournal(app, {
    store: conversationStore,
    sources: options.documentSourceReader,
    chats: chatRepository,
    now,
    user: requestUserId,
    captureReplay: async (request, scope, response, kind) => {
      if (scope.kind !== "chat") return;
      const citations = Array.isArray(response.citations) ? response.citations : [];
      const ids = new Set<string>(
        citations
          .filter(
            (citation) =>
              citation?.sourceScope !== "legislation" &&
              typeof citation?.documentVersionId === "string"
          )
          .map((citation) => citation.documentVersionId)
      );
      const params = request.params as { documentVersionId?: unknown };
      if (kind === "document_status" && typeof params.documentVersionId === "string")
        ids.add(params.documentVersionId);
      if (!ids.size) return;
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId: scope.userId,
        condominiumId: createCondominiumId(scope.condominiumId),
        now: now()
      });
      const catalog = await listRegisteredDocuments(documentCatalogRepository, context);
      const versions = [...ids].sort(),
        selected = versions.map((id) => catalog.find((row) => row.documentVersionId === id));
      if (selected.some((row) => !row)) {
        if (options.documentCatalogRepository) throw new ConversationStoreError(403);
        return; // A legacy/test source without catalog provenance is never eligible for HTTP replay.
      }
      const requestBody = request.body as { question?: unknown };
      if (
        kind === "question_answer" &&
        ["grounded", "conflict"].includes(String(response.answerMode)) &&
        typeof requestBody.question === "string" &&
        isIntegralSumQuestion(requestBody.question)
      ) {
        const calculation = computeIntegralSum(
          context,
          requestBody.question,
          await readIntegralSet(context)
        );
        assertIntegralAnswer(calculation.summary, response as unknown as GeneratedAnswer);
        addJournalReplayProof(request, {
          integralSum: { receiptSha256: calculation.summary.receiptSha256 }
        });
      }
      const savedQuestion =
        kind === "question_answer" &&
        typeof response.answerId === "string" &&
        selected.some((row) => row && !canSummarizeDocument(row))
          ? await answerUseCase.findValidatedAnswer?.(context, response.answerId)
          : undefined;
      if (
        ["grounded", "conflict"].includes(String(response.answerMode)) &&
        citations.some(
          (citation) =>
            citation?.sourceScope !== "legislation" &&
            !selected.some(
              (row) =>
                row !== undefined &&
                row.documentVersionId === citation.documentVersionId &&
                canJournalCiteDocument(row, kind, context, response, savedQuestion)
            )
        )
      )
        throw new ConversationStoreError(403);
      const sourcePages: NonNullable<JournalReplayProof["sourcePages"]>[number][] = [];
      for (const citation of citations) {
        if (citation?.sourceScope === "legislation") continue;
        if (!options.documentSourceReader) continue;
        const source = await options.documentSourceReader.getAuthorizedPage(context, citation);
        if (!source) throw new ConversationStoreError(403);
        if (
          !sourcePages.some(
            (page) =>
              page.documentId === citation.documentId &&
              page.documentVersionId === citation.documentVersionId &&
              page.page === citation.page
          )
        )
          sourcePages.push({
            documentId: citation.documentId,
            documentVersionId: citation.documentVersionId,
            page: citation.page,
            contentHash: conversationHash(source.content)
          });
      }
      addJournalReplayProof(request, {
        sourceCatalog: { revision: conversationHash(selected), documentVersionIds: versions },
        sourcePages
      });
    },
    validateReplay: async (request, scope, metadata, response) => {
      try {
        const proof = metadata.replayProof as JournalReplayProof | undefined;
        if (
          options.operationControl &&
          !["setup_creation", "document_summary"].includes(String(metadata.kind))
        ) {
          if (!proof?.operation || !options.operationControl.authorizeReplay) return false;
          const operation = proof.operation;
          if (operation.scope.userId !== scope.userId) return false;
          if (
            !(await options.operationControl.authorizeReplay(operation, async () => {
              if (operation.scope.kind === "account") return scope.kind === "setup";
              if (scope.kind !== "chat" || operation.scope.condominiumId !== scope.condominiumId)
                return false;
              const current = await resolveAuthorizedCondominiumContext(
                options.membershipRepository,
                {
                  userId: scope.userId,
                  condominiumId: createCondominiumId(scope.condominiumId),
                  now: now()
                }
              );
              return (
                current.membershipRevision === operation.scope.membershipRevision &&
                (operation.kind !== "upload" || current.permissions.includes("document:upload"))
              );
            }))
          )
            return false;
        }
        if (metadata.kind === "document_summary") {
          if (scope.kind !== "chat" || !proof?.documents) return false;
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId: scope.userId,
            condominiumId: createCondominiumId(scope.condominiumId),
            now: now()
          });
          const reader =
            options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader;
          const catalog = await listRegisteredDocuments(documentCatalogRepository, context);
          if (
            !reader ||
            financialCatalogRevision(catalog) !== proof.documents.catalogRevision ||
            conversationHash(
              await reader.readAuthorized(context, proof.documents.documentVersionIds)
            ) !== proof.documents.contentRevision
          )
            return false;
          if (options.hostedDocumentBatchGateway) {
            if (
              !proof.documents.hosted ||
              proof.documents.hosted.request.documentVersions.some(
                (version) => !proof.documents!.documentVersionIds.includes(version.id)
              ) ||
              !options.hostedDocumentBatchGateway.revalidateReplay ||
              !(await options.hostedDocumentBatchGateway.revalidateReplay(
                context,
                scope.chatId,
                proof.documents.hosted
              ))
            )
              return false;
          } else if (proof.documents.hosted) return false;
        }
        if (scope.kind === "chat" && metadata.kind !== "document_summary") {
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId: scope.userId,
            condominiumId: createCondominiumId(scope.condominiumId),
            now: now()
          });
          const catalog = await listRegisteredDocuments(documentCatalogRepository, context);
          if (
            ((metadata.kind === "document_status" &&
              typeof metadata.documentVersionId === "string") ||
              (Array.isArray(response.citations) && response.citations.length)) &&
            (!proof?.sourceCatalog ||
              conversationHash(
                proof.sourceCatalog.documentVersionIds.map((id) =>
                  catalog.find((row) => row.documentVersionId === id)
                )
              ) !== proof.sourceCatalog.revision)
          )
            return false;
          if (
            typeof metadata.documentVersionId === "string" &&
            !catalog.some((row) => row.documentVersionId === metadata.documentVersionId)
          )
            return false;
          const requestBody = request.body as { question?: unknown };
          if (
            metadata.kind === "question_answer" &&
            ["grounded", "conflict"].includes(String(response.answerMode)) &&
            typeof requestBody.question === "string" &&
            isIntegralSumQuestion(requestBody.question)
          ) {
            if (!proof?.integralSum) return false;
            const calculation = computeIntegralSum(
              context,
              requestBody.question,
              await readIntegralSet(context)
            );
            if (calculation.summary.receiptSha256 !== proof.integralSum.receiptSha256) return false;
          }
          if (Array.isArray(response.citations) && response.citations.length) {
            const savedQuestion =
              metadata.kind === "question_answer" &&
              typeof response.answerId === "string" &&
              response.citations.some(
                (c) =>
                  c?.sourceScope !== "legislation" &&
                  catalog.some(
                    (row) =>
                      row.documentVersionId === c.documentVersionId && !canSummarizeDocument(row)
                  )
              )
                ? await answerUseCase.findValidatedAnswer?.(context, response.answerId)
                : undefined;
            for (const citation of response.citations) {
              if (
                !citation ||
                typeof citation.documentId !== "string" ||
                typeof citation.documentVersionId !== "string" ||
                !Number.isInteger(citation.page)
              )
                return false;
              const registered = catalog.find(
                (row) =>
                  row.documentVersionId === citation.documentVersionId &&
                  row.documentId === citation.documentId
              );
              if (
                !registered ||
                (["grounded", "conflict"].includes(String(response.answerMode)) &&
                  !canJournalCiteDocument(
                    registered,
                    String(metadata.kind),
                    context,
                    response,
                    savedQuestion
                  )) ||
                !proof?.sourceCatalog?.documentVersionIds.includes(citation.documentVersionId)
              )
                return false;
              const source = options.documentSourceReader
                ? await options.documentSourceReader.getAuthorizedPage(context, citation)
                : undefined;
              if (
                !source ||
                !proof?.sourcePages?.some(
                  (page) =>
                    page.documentId === citation.documentId &&
                    page.documentVersionId === citation.documentVersionId &&
                    page.page === citation.page &&
                    page.contentHash === conversationHash(source.content)
                ) ||
                typeof citation.excerpt !== "string" ||
                !citation.excerpt ||
                !Number.isInteger(citation.startOffset) ||
                !Number.isInteger(citation.endOffset) ||
                citation.startOffset < 0 ||
                Array.from(source.content)
                  .slice(citation.startOffset, citation.endOffset)
                  .join("") !== citation.excerpt
              )
                return false;
            }
          }
        }
        return true;
      } catch {
        return false;
      }
    },
    resolve: async (request, condominiumId) => {
      const userId = requestUserId(request);
      if (userId === undefined) throw new ConversationStoreError(401);
      try {
        return await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId: createCondominiumId(condominiumId),
          now: now()
        });
      } catch {
        throw new ConversationStoreError(403);
      }
    }
  });

  registerQuestionResearchProgress(app);

  const emptyRetrieval = (question: string): ScopedRetrievalResult =>
    Object.freeze({
      pipelineVersion: retrievalPipelineVersion,
      queryHash: retrievalQueryHash(question),
      candidateCount: 0,
      selectedCount: 0,
      evidence: Object.freeze([]),
      sufficiency: evaluateEvidenceSufficiency([])
    });

  app.addContentTypeParser("application/pdf", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });
  app.addContentTypeParser(docxMediaType, { parseAs: "buffer" }, (_request, body, done) =>
    done(null, body)
  );
  for (const mediaType of ["image/jpeg", "image/png"] as const) {
    app.addContentTypeParser(
      mediaType,
      { parseAs: "buffer", bodyLimit: maximumImageUploadBytes },
      (_request, body, done) => {
        done(null, body);
      }
    );
  }

  const runtimeInformation = () => ({
    historyPersistence: conversationStore.durable ? "durable" : "volatile",
    status: "ok",
    version,
    aiProvider,
    authMode: accountAuth === undefined ? "development" : "real",
    accessCodeEnabled: accessCodeAuth !== undefined,
    googleAuthEnabled: accountAuth !== undefined && options.googleOAuth !== undefined,
    authSessionRestore: accountAuth !== undefined && authSessionRestore,
    accountSecurityEnabled: accountSecurity !== undefined,
    developmentAuthActions: options.accountActionDelivery?.channel === "development_preview"
  });

  app.get("/health", async () => runtimeInformation());
  app.get("/v1/runtime", async (_request, reply) =>
    reply.header("cache-control", "no-store").send(runtimeInformation())
  );

  app.post<{
    Headers: { "x-development-user-id"?: string; "x-development-user-name"?: string };
    Body: unknown;
  }>("/v1/chat/setup-message", async (request, reply) => {
    if (requestUserId(request) === undefined)
      return reply.code(401).send({ message: unauthenticatedMessage });
    if (!isSetupMessageRequest(request.body))
      return reply.code(400).send({ message: "Etapa de conversa inválida." });
    const body = request.body;
    try {
      const message = await controlled(request, "setup", ["setup-message", body], () =>
        generateSetupMessage(options.setupMessageGateway, body)
      );
      return reply.header("cache-control", "no-store").send({ message });
    } catch {
      return reply.code(503).send({ message: "A Alvitra está indisponível no momento." });
    }
  });

  app.post<{
    Headers: { "x-development-user-id"?: string; "x-development-user-name"?: string };
    Body: unknown;
  }>("/v1/chat/setup-turn", async (request, reply) => {
    if (requestUserId(request) === undefined)
      return reply.code(401).send({ message: unauthenticatedMessage });
    if (!isSetupTurnRequest(request.body))
      return reply.code(400).send({ message: "Turno de configuração inválido." });
    const body = request.body;
    try {
      const turn = await controlled(request, "setup", ["setup-turn", body], () =>
        interpretSetupTurn(options.setupMessageGateway, body)
      );
      return reply.header("cache-control", "no-store").send(turn);
    } catch (error: unknown) {
      if (error instanceof InvalidSetupInterpretationError) {
        return reply.code(502).send({
          code: "setup_interpretation_invalid",
          message: "Não consegui confirmar essa informação. Tente reformular sua mensagem."
        });
      }
      return reply.code(503).send({
        code: "ai_provider_unavailable",
        message: "A Alvitra está indisponível no momento."
      });
    }
  });

  app.get<{
    Headers: { "x-development-user-id"?: string; "x-development-user-name"?: string };
  }>("/v1/chat/bootstrap", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumIds =
        accountAuth === undefined
          ? [
              "alameda",
              "bosque",
              ...(options.developmentMembershipRegistry
                ?.listTestCondominiums(userId)
                .map((item) => item.condominiumId) ?? [])
            ]
          : ((await options.condominiumDirectory?.listAuthorized(userId)) ?? []).map(
              (item) => item.condominiumId
            );

      for (const candidate of [...new Set(condominiumIds)]) {
        try {
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId: createCondominiumId(candidate),
            now: now()
          });
          return reply.header("cache-control", "no-store").send({
            condominiumId: context.condominiumId,
            role: context.roleKey,
            permissions: context.permissions,
            preferredName: requestPreferredName(request)
          });
        } catch (error: unknown) {
          if (!(error instanceof AccessDeniedError)) throw error;
        }
      }

      return reply
        .code(404)
        .send({ message: "Nenhum contexto autorizado está disponível para esta conversa." });
    } catch {
      return reply
        .code(500)
        .send({ message: "Não foi possível preparar a conversa com segurança." });
    }
  });

  app.get<{ Headers: { "x-development-user-id"?: string } }>(
    "/v1/chat/condominiums",
    async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

      try {
        const candidates =
          accountAuth === undefined
            ? [
                {
                  condominiumId: "alameda",
                  name: "Residencial Alameda",
                  detail: "Condomínio autorizado"
                },
                {
                  condominiumId: "bosque",
                  name: "Condomínio Bosque",
                  detail: "Condomínio autorizado"
                },
                ...(options.developmentMembershipRegistry
                  ?.listTestCondominiums(userId)
                  .map((item) => ({
                    condominiumId: item.condominiumId,
                    name: item.name,
                    detail:
                      item.address.city === "" || item.address.state === ""
                        ? "Condomínio autorizado"
                        : `${item.address.city}/${item.address.state} · Condomínio autorizado`
                  })) ?? [])
              ]
            : ((await options.condominiumDirectory?.listAuthorized(userId)) ?? []).map((item) => ({
                condominiumId: item.condominiumId,
                name: item.name,
                detail: item.detail
              }));
        const authorized = [] as Array<{
          condominiumId: string;
          name: string;
          detail: string;
          role: string;
          permissions: readonly string[];
        }>;

        for (const candidate of candidates) {
          try {
            const context = await resolveAuthorizedCondominiumContext(
              options.membershipRepository,
              {
                userId,
                condominiumId: createCondominiumId(candidate.condominiumId),
                now: now()
              }
            );
            authorized.push({
              condominiumId: context.condominiumId,
              name: candidate.name,
              detail: candidate.detail,
              role: context.roleKey,
              permissions: context.permissions
            });
          } catch (error: unknown) {
            if (!(error instanceof AccessDeniedError)) throw error;
          }
        }

        return reply.header("cache-control", "no-store").send({ condominiums: authorized });
      } catch {
        return reply
          .code(500)
          .send({ message: "Não foi possível carregar os condomínios autorizados." });
      }
    }
  );

  app.post<{ Body: unknown }>("/v1/auth/register", async (request, reply) => {
    if (accountAuth === undefined) {
      return reply
        .code(404)
        .send({ message: "Autenticação real indisponível no modo demonstração." });
    }
    if (!isRegisterAccountBody(request.body)) {
      return reply.code(400).send({ message: "Informe nome, e-mail e senha." });
    }
    try {
      if (accountSecurity !== undefined) {
        if (options.accountActionDelivery === undefined) {
          return reply.code(503).send({
            message: "A entrega de verificação de e-mail ainda não está configurada."
          });
        }
        const registration = await accountSecurity.register(request.body);
        const delivery = await options.accountActionDelivery.deliver(registration.action);
        return reply.code(202).send({
          user: publicAccountResponse(registration.account),
          verificationRequired: true,
          expiresAt: registration.action.expiresAt.toISOString(),
          ...delivery
        });
      }
      const session = await accountAuth.register(request.body);
      return reply
        .header("set-cookie", serializeAccountSessionCookie(session.token, secureCookies))
        .code(201)
        .send({
          user: publicAccountResponse(session.account),
          expiresAt: session.expiresAt.toISOString()
        });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/login", async (request, reply) => {
    if (accountAuth === undefined) {
      return reply
        .code(404)
        .send({ message: "Autenticação real indisponível no modo demonstração." });
    }
    if (!isLoginAccountBody(request.body)) {
      return reply.code(400).send({ message: "Informe e-mail e senha." });
    }
    try {
      if (accountSecurity !== undefined) {
        const result = await accountSecurity.login({
          ...request.body,
          deviceLabel: accountDeviceLabel(request.headers["user-agent"])
        });
        if (result.mfaRequired) {
          return reply.code(202).send({
            mfaRequired: true,
            challengeId: result.challengeId,
            expiresAt: result.expiresAt.toISOString()
          });
        }
        return reply
          .header("set-cookie", serializeAccountSessionCookie(result.token, secureCookies))
          .send({
            user: publicAccountResponse(result.account),
            expiresAt: result.expiresAt.toISOString()
          });
      }
      const session = await accountAuth.login(request.body);
      return reply
        .header("set-cookie", serializeAccountSessionCookie(session.token, secureCookies))
        .send({
          user: publicAccountResponse(session.account),
          expiresAt: session.expiresAt.toISOString()
        });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/verify-email/request", async (request, reply) => {
    if (accountSecurity === undefined || !hasStringFields(request.body, ["email"] as const)) {
      return reply.code(accountSecurity === undefined ? 404 : 400).send({
        message:
          accountSecurity === undefined
            ? "Verificação de e-mail indisponível."
            : "Informe o e-mail."
      });
    }
    try {
      const action = await accountSecurity.requestEmailVerification(request.body.email);
      const delivery =
        action === undefined || options.accountActionDelivery === undefined
          ? {}
          : await options.accountActionDelivery.deliver(action);
      return reply.code(202).send({
        message: "Se a conta puder ser verificada, enviaremos as instruções.",
        ...delivery
      });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/verify-email/confirm", async (request, reply) => {
    if (accountSecurity === undefined || !hasStringFields(request.body, ["token"] as const)) {
      return reply.code(accountSecurity === undefined ? 404 : 400).send({
        message:
          accountSecurity === undefined ? "Verificação de e-mail indisponível." : "Informe o token."
      });
    }
    try {
      await accountSecurity.confirmEmail(request.body.token, now());
      return reply.code(204).send();
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/password-reset/request", async (request, reply) => {
    if (accountSecurity === undefined || !hasStringFields(request.body, ["email"] as const)) {
      return reply.code(accountSecurity === undefined ? 404 : 400).send({
        message:
          accountSecurity === undefined ? "Recuperação de senha indisponível." : "Informe o e-mail."
      });
    }
    try {
      const action = await accountSecurity.requestPasswordReset(request.body.email);
      const delivery =
        action === undefined || options.accountActionDelivery === undefined
          ? {}
          : await options.accountActionDelivery.deliver(action);
      return reply.code(202).send({
        message: "Se existir uma conta compatível, enviaremos as instruções.",
        ...delivery
      });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/password-reset/confirm", async (request, reply) => {
    if (
      accountSecurity === undefined ||
      !hasStringFields(request.body, ["token", "password"] as const)
    ) {
      return reply.code(accountSecurity === undefined ? 404 : 400).send({
        message:
          accountSecurity === undefined
            ? "Recuperação de senha indisponível."
            : "Informe token e nova senha."
      });
    }
    try {
      await accountSecurity.resetPassword(request.body.token, request.body.password, now());
      return reply
        .header("set-cookie", serializeClearedAccountSessionCookie(secureCookies))
        .code(204)
        .send();
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/mfa/challenge", async (request, reply) => {
    if (
      accountSecurity === undefined ||
      !hasStringFields(request.body, ["challengeId", "code"] as const)
    ) {
      return reply.code(accountSecurity === undefined ? 404 : 400).send({
        message: accountSecurity === undefined ? "MFA indisponível." : "Informe desafio e código."
      });
    }
    try {
      const session = await accountSecurity.completeMfaChallenge(
        request.body.challengeId,
        request.body.code,
        now()
      );
      return reply
        .header("set-cookie", serializeAccountSessionCookie(session.token, secureCookies))
        .send({
          user: publicAccountResponse(session.account),
          expiresAt: session.expiresAt.toISOString()
        });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  const requireSecuritySessionToken = (request: FastifyRequest): string | undefined =>
    accountSecurity === undefined ? undefined : getAccountSessionCookie(request.headers.cookie);

  app.post<{ Body: unknown }>("/v1/auth/password/change", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (
      accountSecurity === undefined ||
      token === undefined ||
      !hasStringFields(request.body, ["currentPassword", "newPassword"] as const)
    ) {
      return reply.code(token === undefined ? 401 : 400).send({
        message:
          token === undefined ? "Sessão não autenticada." : "Informe a senha atual e a nova senha."
      });
    }
    try {
      await accountSecurity.changePassword(
        token,
        request.body.currentPassword,
        request.body.newPassword,
        now()
      );
      return reply.code(204).send();
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post("/v1/auth/mfa/setup", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (accountSecurity === undefined || token === undefined) {
      return reply.code(accountSecurity === undefined ? 404 : 401).send({
        message: accountSecurity === undefined ? "MFA indisponível." : "Sessão não autenticada."
      });
    }
    if (!mfaEnrollmentAvailable) {
      return reply.code(503).send({
        message: "A autenticação em duas etapas será liberada com o envio real de e-mails."
      });
    }
    try {
      return reply.send(await accountSecurity.beginMfaSetup(token, now()));
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/mfa/enable", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (
      accountSecurity === undefined ||
      token === undefined ||
      !hasStringFields(request.body, ["code"] as const)
    ) {
      return reply.code(token === undefined ? 401 : 400).send({
        message: token === undefined ? "Sessão não autenticada." : "Informe o código."
      });
    }
    if (!mfaEnrollmentAvailable) {
      return reply.code(503).send({
        message: "A autenticação em duas etapas será liberada com o envio real de e-mails."
      });
    }
    try {
      return reply.send(await accountSecurity.enableMfa(token, request.body.code, now()));
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.post<{ Body: unknown }>("/v1/auth/mfa/disable", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (
      accountSecurity === undefined ||
      token === undefined ||
      !hasStringFields(request.body, ["password", "code"] as const)
    ) {
      return reply.code(token === undefined ? 401 : 400).send({
        message: token === undefined ? "Sessão não autenticada." : "Informe senha e código."
      });
    }
    try {
      await accountSecurity.disableMfa(token, request.body.password, request.body.code, now());
      return reply.code(204).send();
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.get("/v1/auth/security", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (accountSecurity === undefined || token === undefined) {
      return reply.code(accountSecurity === undefined ? 404 : 401).send({
        message:
          accountSecurity === undefined
            ? "Segurança da conta indisponível."
            : "Sessão não autenticada."
      });
    }
    try {
      return reply.send({
        ...(await accountSecurity.getStatus(token, now())),
        mfaEnrollmentAvailable
      });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.get("/v1/auth/sessions", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (accountSecurity === undefined || token === undefined) {
      return reply.code(accountSecurity === undefined ? 404 : 401).send({
        message:
          accountSecurity === undefined ? "Sessões indisponíveis." : "Sessão não autenticada."
      });
    }
    try {
      const sessions = await accountSecurity.listSessions(token, now());
      return reply.send({
        sessions: sessions.map((session) => ({
          ...session,
          createdAt: session.createdAt.toISOString(),
          lastSeenAt: session.lastSeenAt.toISOString(),
          expiresAt: session.expiresAt.toISOString()
        }))
      });
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.delete<{ Params: Readonly<{ sessionId: string }> }>(
    "/v1/auth/sessions/:sessionId",
    async (request, reply) => {
      const token = requireSecuritySessionToken(request);
      if (accountSecurity === undefined || token === undefined) {
        return reply.code(accountSecurity === undefined ? 404 : 401).send({
          message:
            accountSecurity === undefined ? "Sessões indisponíveis." : "Sessão não autenticada."
        });
      }
      try {
        const result = await accountSecurity.revokeSession(token, request.params.sessionId);
        if (result.currentRevoked) {
          return reply
            .header("set-cookie", serializeClearedAccountSessionCookie(secureCookies))
            .send(result);
        }
        return reply.send(result);
      } catch (error: unknown) {
        return accountAuthErrorResponse(error, reply);
      }
    }
  );

  app.post("/v1/auth/sessions/revoke-others", async (request, reply) => {
    const token = requireSecuritySessionToken(request);
    if (accountSecurity === undefined || token === undefined) {
      return reply.code(accountSecurity === undefined ? 404 : 401).send({
        message:
          accountSecurity === undefined ? "Sessões indisponíveis." : "Sessão não autenticada."
      });
    }
    try {
      await accountSecurity.revokeOtherSessions(token);
      return reply.code(204).send();
    } catch (error: unknown) {
      return accountAuthErrorResponse(error, reply);
    }
  });

  app.get("/v1/auth/session", async (request, reply) => {
    if (accountAuth === undefined) {
      return reply
        .code(404)
        .send({ message: "Autenticação real indisponível no modo demonstração." });
    }
    const token = getAccountSessionCookie(request.headers.cookie);
    const account = token === undefined ? undefined : await accountAuth.authenticate(token, now());
    if (account === undefined) return reply.code(401).send({ message: "Sessão não encontrada." });
    return reply.send({ user: publicAccountResponse(account) });
  });

  app.post("/v1/auth/logout", async (request, reply) => {
    if (accountAuth !== undefined) {
      const token = getAccountSessionCookie(request.headers.cookie);
      if (token !== undefined) await accountAuth.logout(token);
    }
    return reply
      .header("set-cookie", serializeClearedAccountSessionCookie(secureCookies))
      .code(204)
      .send();
  });

  if (accountAuth !== undefined) {
    app.get("/v1/auth/google", async (_request, reply) => {
      const googleOAuth = options.googleOAuth;
      if (googleOAuth === undefined) {
        return reply.code(503).send({ message: "Login com Google ainda não está configurado." });
      }

      const state = createGoogleOAuthState();
      return reply
        .header("set-cookie", serializeGoogleOAuthStateCookie(state, secureCookies))
        .redirect(googleOAuth.createAuthorizationUrl(state));
    });

    app.get<{
      Querystring: Readonly<{ code?: string; state?: string; error?: string }>;
    }>("/v1/auth/google/callback", async (request, reply) => {
      const googleOAuth = options.googleOAuth;
      if (googleOAuth === undefined) {
        return reply.code(503).send({ message: "Login com Google ainda não está configurado." });
      }

      const redirectFailure = (reason: string) =>
        reply
          .header("set-cookie", serializeClearedGoogleOAuthStateCookie(secureCookies))
          .redirect(googleAuthErrorRedirect(googleOAuth.successRedirectUri, reason));

      if (request.query.error !== undefined) return redirectFailure("google_cancelled");
      if (
        !googleOAuthStatesMatch(readGoogleOAuthState(request.headers.cookie), request.query.state)
      ) {
        return redirectFailure("google_state");
      }

      try {
        const profile = await googleOAuth.exchangeAuthorizationCode(request.query.code ?? "");
        const session = await accountAuth.loginWithGoogle(profile);
        return reply
          .header("set-cookie", [
            serializeAccountSessionCookie(session.token, secureCookies),
            serializeClearedGoogleOAuthStateCookie(secureCookies)
          ])
          .redirect(googleOAuth.successRedirectUri);
      } catch {
        return redirectFailure("google_failed");
      }
    });
  }

  if (accountAuth !== undefined && options.condominiumDirectory !== undefined) {
    const condominiumDirectory = options.condominiumDirectory;

    app.get("/v1/condominiums", async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

      try {
        const condominiums = await condominiumDirectory.listAuthorized(userId);
        return reply.send({ condominiums });
      } catch {
        return reply.code(500).send({ message: "Não foi possível carregar os condomínios." });
      }
    });

    app.post<{ Body: unknown }>("/v1/condominiums", async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      if (!isCreateCondominiumBody(request.body)) {
        return reply
          .code(400)
          .send({ message: "Informe um nome e uma quantidade de unidades válidos." });
      }

      const normalizedCnpj = request.body.cnpj?.replace(/\D/gu, "") ?? "";
      try {
        const createInput = { ...request.body, cnpj: normalizedCnpj };
        const operationKey = request.headers["x-conversation-request-id"];
        const created =
          typeof operationKey === "string"
            ? await condominiumDirectory.createForUser(userId, createInput, {
                requestKey: operationKey,
                inputHash: conversationHash(request.body)
              })
            : await condominiumDirectory.createForUser(userId, createInput);
        return reply.code(201).send({
          condominiumId: created.condominiumId,
          role: created.roleKey,
          permissions: ["document:read", "document:upload"],
          condominium: created
        });
      } catch (error: unknown) {
        if (error instanceof ConversationStoreError)
          return reply.code(error.statusCode).send({ message: error.message });
        if (normalizedCnpj !== "") {
          try {
            const existing = await condominiumDirectory.findAuthorizedByCnpj(
              userId,
              normalizedCnpj
            );
            if (existing !== undefined) {
              return reply.code(200).send({
                condominiumId: existing.condominiumId,
                role: existing.roleKey,
                permissions: ["document:read", "document:upload"],
                condominium: existing,
                resumedRegistration: true
              });
            }
          } catch {
            return reply
              .code(500)
              .send({ message: "Não foi possível recuperar o cadastro existente." });
          }
        }
        if (error instanceof CondominiumAlreadyExistsError) {
          return reply.code(409).send({ message: error.message });
        }
        return reply.code(500).send({
          message: "Não foi possível concluir o cadastro do condomínio com segurança."
        });
      }
    });

    app.delete<{ Params: { condominiumId: string } }>(
      "/v1/condominiums/:condominiumId/membership",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          await condominiumDirectory.leaveForUser(userId, condominiumId);
          return reply.code(204).send();
        } catch (error: unknown) {
          const errorCode =
            typeof error === "object" && error !== null && "code" in error
              ? (error as { code?: unknown }).code
              : undefined;
          if (error instanceof AccessDeniedError || errorCode === "42501") {
            return reply.code(403).send({ message: "Você não participa deste condomínio." });
          }
          return reply
            .code(500)
            .send({ message: "Não foi possível remover o condomínio da sua gestão." });
        }
      }
    );

    app.delete<{ Params: { condominiumId: string } }>(
      "/v1/condominiums/:condominiumId",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          if (context.roleKey !== "manager") {
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode apagar o condomínio." });
          }
          await condominiumDirectory.deleteForUser(userId, condominiumId);
          return reply.code(204).send();
        } catch (error: unknown) {
          const errorCode =
            typeof error === "object" && error !== null && "code" in error
              ? (error as { code?: unknown }).code
              : undefined;
          if (error instanceof AccessDeniedError || errorCode === "42501") {
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode apagar o condomínio." });
          }
          return reply.code(500).send({ message: "Não foi possível apagar o condomínio." });
        }
      }
    );
  }

  if (options.condominiumProfileRepository !== undefined) {
    const profileRepository = options.condominiumProfileRepository;
    const photoIdPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

    const profileErrorReply = (reply: FastifyReply, error: unknown) => {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : undefined;
      if (error instanceof AccessDeniedError || errorCode === "42501") {
        return reply.code(403).send({ message: "Você não tem acesso a este condomínio." });
      }
      if (error instanceof InvalidCondominiumProfileError || errorCode === "22023") {
        return reply.code(400).send({
          message: error instanceof Error ? error.message : "Confira os dados informados."
        });
      }
      if (error instanceof CondominiumProfilePhotoLimitError || errorCode === "P0001") {
        return reply.code(409).send({ message: "Este condomínio já tem o limite de cinco fotos." });
      }
      if (errorCode === "P0002") {
        return reply.code(404).send({ message: "Foto não encontrada neste condomínio." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível salvar as alterações do condomínio." });
    };

    app.get<{ Params: { condominiumId: string } }>(
      "/v1/condominiums/:condominiumId/profile",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          const [profile, photos] = await Promise.all([
            profileRepository.getProfile({ userId, condominiumId }),
            profileRepository.listPhotos({ userId, condominiumId })
          ]);
          if (profile === undefined)
            return reply.code(404).send({ message: "Perfil do condomínio não encontrado." });
          return reply.send({ profile, photos });
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );

    app.put<{ Params: { condominiumId: string }; Body: unknown }>(
      "/v1/condominiums/:condominiumId/profile",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        const profile = validateCondominiumProfileUpdate(request.body);
        if (profile === undefined)
          return reply.code(400).send({ message: "Confira os dados do perfil do condomínio." });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          if (context.roleKey !== "manager") {
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode editar o perfil." });
          }
          const updated = await profileRepository.updateProfile({ userId, condominiumId, profile });
          if (updated === undefined)
            return reply.code(404).send({ message: "Perfil do condomínio não encontrado." });
          return reply.send({ profile: updated });
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );

    app.post<{ Params: { condominiumId: string }; Body: unknown }>(
      "/v1/condominiums/:condominiumId/profile/photos",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          if (context.roleKey !== "manager") {
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode adicionar fotos." });
          }
          const photo = decodeCondominiumProfilePhoto(request.body);
          if (photo === undefined)
            return reply.code(400).send({ message: "Envie uma foto JPEG, PNG ou WebP válida." });
          const created = await profileRepository.addPhoto({
            userId,
            condominiumId,
            photoId: randomUUID(),
            mediaType: photo.mediaType,
            content: photo.content
          });
          return reply.code(201).send({ photo: created });
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );

    app.get<{ Params: { condominiumId: string; photoId: string } }>(
      "/v1/condominiums/:condominiumId/profile/photos/:photoId",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        if (!photoIdPattern.test(request.params.photoId))
          return reply.code(404).send({ message: "Foto não encontrada neste condomínio." });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          const photo = await profileRepository.readPhoto({
            userId,
            condominiumId,
            photoId: request.params.photoId
          });
          if (photo === undefined)
            return reply.code(404).send({ message: "Foto não encontrada neste condomínio." });
          return reply
            .header("content-type", photo.mediaType)
            .header("content-length", photo.content.length)
            .header("content-disposition", "inline")
            .header("cache-control", "private, no-store")
            .header("x-content-type-options", "nosniff")
            .send(photo.content);
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );

    app.put<{ Params: { condominiumId: string; photoId: string } }>(
      "/v1/condominiums/:condominiumId/profile/photos/:photoId/cover",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        if (!photoIdPattern.test(request.params.photoId))
          return reply.code(404).send({ message: "Foto não encontrada neste condomínio." });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          if (context.roleKey !== "manager")
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode escolher a capa." });
          await profileRepository.setCover({
            userId,
            condominiumId,
            photoId: request.params.photoId
          });
          return reply.code(204).send();
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );

    app.delete<{ Params: { condominiumId: string; photoId: string } }>(
      "/v1/condominiums/:condominiumId/profile/photos/:photoId",
      async (request, reply) => {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        if (!photoIdPattern.test(request.params.photoId))
          return reply.code(404).send({ message: "Foto não encontrada neste condomínio." });
        try {
          const condominiumId = createCondominiumId(request.params.condominiumId);
          const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId,
            now: now()
          });
          if (context.roleKey !== "manager")
            return reply
              .code(403)
              .send({ message: "Somente o síndico responsável pode remover fotos." });
          await profileRepository.deletePhoto({
            userId,
            condominiumId,
            photoId: request.params.photoId
          });
          return reply.code(204).send();
        } catch (error: unknown) {
          return profileErrorReply(reply, error);
        }
      }
    );
  }

  if (options.developmentMembershipRegistry !== undefined) {
    const developmentMembershipRegistry = options.developmentMembershipRegistry;

    app.get<{ Headers: { "x-development-user-id"?: string } }>(
      "/v1/development/test-condominiums",
      async (request, reply) => {
        try {
          const userId = requestUserId(request);
          if (userId === undefined) throw new Error("Identidade ausente.");
          return reply.send({
            condominiums: developmentMembershipRegistry.listTestCondominiums(userId)
          });
        } catch {
          return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
        }
      }
    );

    app.post<{
      Headers: { "x-development-user-id"?: string };
      Body: unknown;
    }>("/v1/development/test-condominiums", async (request, reply) => {
      if (!isCreateTestCondominiumBody(request.body)) {
        return reply.code(400).send({ message: "O identificador do condomínio é obrigatório." });
      }

      try {
        const userId = requestUserId(request);
        if (userId === undefined) throw new Error("Identidade ausente.");
        const created = developmentMembershipRegistry.createTestCondominium({
          ...request.body,
          userId
        });

        return reply.code(201).send({
          condominiumId: created.membership.condominiumId,
          role: created.membership.roleKey,
          permissions: ["document:read", "document:upload"],
          condominium: created.condominium
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message === "Já existe um condomínio de teste com esse identificador."
        ) {
          return reply.code(409).send({ message: error.message });
        }

        return reply.code(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Informe dados válidos para o condomínio de teste."
        });
      }
    });

    app.delete<{
      Params: { condominiumId: string };
      Headers: { "x-development-user-id"?: string };
    }>("/v1/development/test-condominiums/:condominiumId/membership", async (request, reply) => {
      try {
        const userId = requestUserId(request);
        if (userId === undefined) throw new Error("Identidade ausente.");
        developmentMembershipRegistry.leaveTestCondominium(userId, request.params.condominiumId);
        return reply.code(204).send();
      } catch (error: unknown) {
        return reply.code(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível remover o condomínio de teste."
        });
      }
    });

    app.delete<{
      Params: { condominiumId: string };
      Headers: { "x-development-user-id"?: string };
    }>("/v1/development/test-condominiums/:condominiumId", async (request, reply) => {
      try {
        const userId = requestUserId(request);
        if (userId === undefined) throw new Error("Identidade ausente.");
        developmentMembershipRegistry.deleteTestCondominium(userId, request.params.condominiumId);
        await options.condominiumProfileRepository?.deleteCondominium?.(
          createCondominiumId(request.params.condominiumId)
        );
        return reply.code(204).send();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Não foi possível apagar o condomínio.";
        const forbidden = message.includes("Somente") || message.includes("não está associado");
        return reply.code(forbidden ? 403 : 400).send({ message });
      }
    });
  }

  app.get<{ Params: { condominiumId: string }; Headers: { "x-development-user-id"?: string } }>(
    "/v1/condominiums/:condominiumId/context",
    async (request, reply) => {
      try {
        const userId = requestUserId(request);
        if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
        const condominiumId = createCondominiumId(request.params.condominiumId);
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId,
          now: now()
        });

        return reply.send({
          condominiumId: context.condominiumId,
          role: context.roleKey,
          permissions: context.permissions
        });
      } catch (error: unknown) {
        if (error instanceof AccessDeniedError) {
          return reply.code(403).send({ message: "Acesso não autorizado." });
        }

        return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
      }
    }
  );

  app.get<{
    Params: { condominiumId: string };
    Headers: { "x-development-user-id"?: string };
  }>("/v1/condominiums/:condominiumId/documents", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      const documents = await listRegisteredDocuments(documentCatalogRepository, context);

      return reply.send({
        documents: documents.map((document) => ({
          documentId: document.documentId,
          documentVersionId: document.documentVersionId,
          title: document.title,
          documentType: document.documentType,
          versionNumber: document.versionNumber,
          ...(document.isFinancialStatement === true ? { isFinancialStatement: true } : {}),
          sizeBytes: document.sizeBytes,
          processingStatus: document.processingStatus,
          validityStatus: document.validityStatus,
          createdAt: document.createdAt,
          expectedPageCount: document.expectedPageCount,
          processedPageCount: document.processedPageCount,
          searchablePageCount: document.searchablePageCount,
          unreadablePageNumbers: document.unreadablePageNumbers,
          extractionCompleteness: document.extractionCompleteness,
          extractionMethod: document.extractionMethod,
          ocrQualityScore: document.ocrQualityScore,
          uploadedByCurrentUser: document.uploadedByCurrentUser === true,
          ...(document.condominiumCheck === undefined
            ? {}
            : {
                condominiumCheck: {
                  status: document.condominiumCheck.status,
                  expectedName: document.condominiumCheck.expectedName,
                  detectedNames: document.condominiumCheck.detectedNames,
                  sources: document.condominiumCheck.sources,
                  resumeProcessingStatus: document.condominiumCheck.resumeProcessingStatus
                }
              })
        }))
      });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError || error instanceof DocumentCatalogForbiddenError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível carregar os documentos com segurança." });
    }
  });

  app.delete<{
    Params: { condominiumId: string; documentId: string };
    Headers: { "x-development-user-id"?: string };
  }>("/v1/condominiums/:condominiumId/documents/:documentId", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
    try {
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId: createCondominiumId(request.params.condominiumId),
        now: now()
      });
      if (
        !context.permissions.includes("document:upload") ||
        !documentCatalogRepository.archiveAuthorized
      ) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      const archived = await documentCatalogRepository.archiveAuthorized(
        context,
        request.params.documentId
      );
      if (!archived)
        return reply
          .code(404)
          .send({ message: "Documento não encontrado ou não pode ser removido." });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AccessDeniedError)
        return reply.code(403).send({ message: "Acesso não autorizado." });
      return reply
        .code(500)
        .send({ message: "Não foi possível remover o documento com segurança." });
    }
  });

  app.get<{
    Params: { condominiumId: string };
  }>("/v1/condominiums/:condominiumId/documents/archived", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
    try {
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId: createCondominiumId(request.params.condominiumId),
        now: now()
      });
      if (
        !context.permissions.includes("document:upload") ||
        documentCatalogRepository.listArchivedAuthorized === undefined
      ) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      return reply.send({
        documents: await documentCatalogRepository.listArchivedAuthorized(context)
      });
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível carregar a lixeira com segurança." });
    }
  });

  app.post<{
    Params: { condominiumId: string; documentId: string };
  }>("/v1/condominiums/:condominiumId/documents/:documentId/restore", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
    try {
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId: createCondominiumId(request.params.condominiumId),
        now: now()
      });
      if (
        !context.permissions.includes("document:upload") ||
        documentCatalogRepository.restoreAuthorized === undefined
      ) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      const restored = await documentCatalogRepository.restoreAuthorized(
        context,
        request.params.documentId
      );
      if (!restored)
        return reply.code(404).send({ message: "Documento não está disponível para recuperação." });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível recuperar o documento com segurança." });
    }
  });

  app.get<{
    Params: { condominiumId: string; documentVersionId: string };
    Headers: { "x-development-user-id"?: string };
  }>(
    "/v1/condominiums/:condominiumId/documents/:documentVersionId/file",
    async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      try {
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId: createCondominiumId(request.params.condominiumId),
          now: now()
        });
        const document = (await listRegisteredDocuments(documentCatalogRepository, context)).find(
          (item) => item.documentVersionId === request.params.documentVersionId
        );
        const reader = documentStorage as Partial<PrivateDocumentReader>;
        if (document?.storageObjectId === undefined || reader.readOriginal === undefined) {
          return reply
            .code(404)
            .send({ message: "Arquivo não está disponível para visualização." });
        }
        const content = await reader.readOriginal({
          condominiumId: context.condominiumId,
          objectId: document.storageObjectId,
          userId: context.userId
        });
        return reply
          .type(document.mediaType ?? "application/pdf")
          .header("content-disposition", "inline")
          .header("x-content-type-options", "nosniff")
          .header("cache-control", "private, no-store")
          .send(content);
      } catch (error) {
        if (error instanceof AccessDeniedError || error instanceof DocumentCatalogForbiddenError) {
          return reply.code(403).send({ message: "Acesso não autorizado." });
        }
        if (error instanceof DocumentOriginalNotFoundError) {
          return reply.code(404).send({ message: error.message });
        }
        return reply.code(500).send({ message: "Não foi possível abrir o arquivo com segurança." });
      }
    }
  );

  app.post<{
    Params: { condominiumId: string; documentVersionId: string };
    Body: unknown;
  }>(
    "/v1/condominiums/:condominiumId/documents/:documentVersionId/conversation",
    async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      const body = request.body as Record<string, unknown> | null;
      if (
        typeof body !== "object" ||
        body === null ||
        Object.keys(body).some((key) => !["event", "analysisOnly", "message"].includes(key)) ||
        (body.message !== undefined &&
          (body.event !== "cancelled" ||
            typeof body.message !== "string" ||
            readDocumentUseDecision(body.message) !== "cancel")) ||
        (body.analysisOnly !== undefined &&
          (body.analysisOnly !== true || body.event !== "status")) ||
        typeof body.event !== "string" ||
        !["received", "status", "confirmed", "cancelled"].includes(body.event)
      )
        return reply.code(400).send({ message: "Evento documental inválido." });
      const event = body.event as DocumentConversationEvent;
      try {
        const resolveContext = () =>
          resolveAuthorizedCondominiumContext(options.membershipRepository, {
            userId,
            condominiumId: createCondominiumId(request.params.condominiumId),
            now: now()
          });
        const context = await resolveContext();
        if (!context.permissions.includes("document:upload"))
          return reply.code(403).send({ message: "Acesso não autorizado." });
        const catalog = await listRegisteredDocuments(documentCatalogRepository, context);
        const readDocument = async (scope: AuthorizedCondominiumContext) =>
          (await listRegisteredDocuments(documentCatalogRepository, scope)).find(
            (document) => document.documentVersionId === request.params.documentVersionId
          );
        const document = catalog.find(
          (entry) => entry.documentVersionId === request.params.documentVersionId
        );
        if (document === undefined)
          return reply.code(404).send({ message: "Documento indisponível." });
        const state = documentConversationState(document, event);
        if (state === undefined)
          return reply.code(409).send({ message: "O estado do documento mudou." });
        const documentRevision = JSON.stringify(document);
        tenantWorkLimiter.consume({
          operation: "document_question",
          userId,
          condominiumId: context.condominiumId,
          now: now()
        });
        const profile = await options.condominiumProfileRepository?.getProfile({
          userId,
          condominiumId: context.condominiumId
        });
        const name =
          profile?.name ?? document.condominiumCheck?.expectedName ?? "condomínio selecionado";
        const reader =
          options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader;
        let snapshot: DocumentAnalysisReport | undefined;
        if (
          (event === "status" || event === "confirmed") &&
          canSummarizeDocument(document) &&
          context.permissions.includes("document:read")
        ) {
          try {
            if (reader === undefined) throw new Error("Leitura documental indisponível.");
            snapshot = await buildDocumentSnapshot(reader, context, document, catalog);
          } catch (error) {
            const analysisLimitExceeded =
              error instanceof Error && /excede o limite/iu.test(error.message);
            snapshot = {
              status: "unavailable" as const,
              title: "Raio-X inicial do arquivo",
              rows: [],
              limitations: [
                analysisLimitExceeded
                  ? "O conjunto excede o limite de conferência: 500 páginas ou dois milhões de caracteres. Delimite o histórico e os documentos de apoio antes de refazer a análise. Nenhum subconjunto foi apresentado como completo."
                  : "Não foi possível preparar a conferência com segurança. Confira o original ou envie uma versão completa e legível."
              ]
            };
          }
        }
        const message =
          body.analysisOnly === true
            ? undefined
            : await controlled(
                request,
                "question",
                ["document-conversation", body, documentRevision, name],
                () =>
                  generateDocumentConversation(
                    options.setupMessageGateway,
                    document,
                    event,
                    name,
                    snapshot !== undefined
                  ),
                context
              ).catch((error: unknown) => {
                if (error instanceof OperationBudgetError) throw error;
                if (snapshot === undefined) throw error;
                return undefined;
              });
        const refreshedContext = await resolveContext();
        if (
          !refreshedContext.permissions.includes("document:upload") ||
          (snapshot !== undefined && !refreshedContext.permissions.includes("document:read")) ||
          refreshedContext.membershipRevision !== context.membershipRevision
        )
          return reply.code(403).send({ message: "Acesso não autorizado." });
        const refreshed = await readDocument(refreshedContext);
        const financialCatalogChanged =
          snapshot?.financialReview !== undefined &&
          financialCatalogRevision(catalog) !==
            financialCatalogRevision(
              await listRegisteredDocuments(documentCatalogRepository, refreshedContext)
            );
        if (
          financialCatalogChanged ||
          refreshed === undefined ||
          (event !== "received" &&
            (documentConversationState(refreshed, event) !== state ||
              JSON.stringify(refreshed) !== documentRevision))
        )
          return reply.code(409).send({ message: "O estado do documento mudou." });
        return reply
          .header("cache-control", "private, no-store")
          .send({ message, ...(snapshot === undefined ? {} : { snapshot }) });
      } catch (error) {
        if (error instanceof TenantWorkLimitExceededError)
          return reply
            .header("retry-after", String(error.retryAfterSeconds))
            .code(429)
            .send({ message: "Aguarde um instante antes de continuar." });
        if (error instanceof AccessDeniedError || error instanceof DocumentCatalogForbiddenError)
          return reply.code(403).send({ message: "Acesso não autorizado." });
        return reply.code(503).send({
          message:
            "A Alvitra está indisponível para conversar sobre o anexo agora. Tente novamente."
        });
      }
    }
  );

  app.post<{
    Params: { condominiumId: string; documentVersionId: string };
    Body: unknown;
  }>(
    "/v1/condominiums/:condominiumId/documents/:documentVersionId/confirm-condominium",
    async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      if (
        typeof request.body !== "object" ||
        request.body === null ||
        !("confirm" in request.body) ||
        request.body.confirm !== true ||
        Object.keys(request.body).some((key) => !["confirm", "message"].includes(key)) ||
        ("message" in request.body &&
          (typeof request.body.message !== "string" ||
            readDocumentUseDecision(request.body.message) !== "confirm"))
      )
        return reply
          .code(400)
          .send({ message: "Confirme explicitamente o condomínio deste documento." });
      try {
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId: createCondominiumId(request.params.condominiumId),
          now: now()
        });
        if (!context.permissions.includes("document:upload"))
          return reply.code(403).send({ message: "Acesso não autorizado." });
        const confirmed = await documentCatalogRepository.confirmCondominium?.(
          context,
          request.params.documentVersionId
        );
        if (confirmed !== true) {
          // A decisão pode ter sido aplicada antes de uma falha ao gravar o journal/ACK.
          // Retomar o mesmo consentimento digitado não libera outra versão nem outro contexto.
          const current =
            "message" in request.body
              ? (await listRegisteredDocuments(documentCatalogRepository, context)).find(
                  (item) => item.documentVersionId === request.params.documentVersionId
                )
              : undefined;
          if (current?.condominiumCheck?.status === "confirmed")
            return reply.send({ confirmed: true });
          return reply.code(409).send({
            message: "Não há confirmação pendente para esta versão ativa neste condomínio."
          });
        }
        options.developmentDocumentMemory?.confirmCondominium(
          context.condominiumId,
          request.params.documentVersionId
        );
        return reply.send({ confirmed: true });
      } catch (error) {
        if (error instanceof AccessDeniedError)
          return reply.code(403).send({ message: "Acesso não autorizado." });
        return reply
          .code(500)
          .send({ message: "Não foi possível confirmar o condomínio do documento." });
      }
    }
  );

  app.post<{
    Params: { condominiumId: string };
    Headers: {
      "x-development-user-id"?: string;
      "x-document-title"?: string;
      "x-document-type"?: string;
      "x-document-id"?: string;
      "x-document-validity-confirmed"?: string;
      "x-chat-id"?: string;
      "content-type"?: string;
    };
    Body: Buffer;
  }>("/v1/condominiums/:condominiumId/documents", async (request, reply) => {
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      tenantWorkLimiter.consume({
        operation: "document_upload",
        condominiumId: context.condominiumId,
        userId: context.userId,
        now: now()
      });
      const mediaType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
      if (
        mediaType !== "application/pdf" &&
        mediaType !== "image/jpeg" &&
        mediaType !== "image/png" &&
        mediaType !== docxMediaType
      ) {
        throw new InvalidDocumentUploadError("Envie um PDF, Word (.docx), uma imagem JPEG ou PNG.");
      }
      if (
        (mediaType === "image/jpeg" || mediaType === "image/png") &&
        options.imageUploadsEnabled !== true
      ) {
        return reply.code(503).send({
          message:
            "O envio de fotos será liberado quando o processamento seguro estiver configurado."
        });
      }
      const selectedCondominiumName =
        accountAuth === undefined
          ? (options.developmentMembershipRegistry
              ?.listTestCondominiums(userId)
              .find((item) => item.condominiumId === context.condominiumId)?.name ??
            (
              { alameda: "Residencial Alameda", bosque: "Condomínio Bosque" } as Record<
                string,
                string
              >
            )[context.condominiumId])
          : (await options.condominiumDirectory?.listAuthorized(userId))?.find(
              (item) => item.condominiumId === context.condominiumId
            )?.name;
      if (accountAuth !== undefined && selectedCondominiumName === undefined)
        return reply
          .code(503)
          .send({ message: "Não foi possível conferir o nome do condomínio selecionado." });
      const chatId = request.headers["x-chat-id"];
      if (chatId !== undefined && (typeof chatId !== "string" || !chatIdPattern.test(chatId)))
        return reply.code(400).send({ message: "O identificador da conversa é inválido." });
      if (chatId !== undefined && (await chatRepository.find(context, chatId)) === undefined)
        return reply.code(404).send({ message: "Conversa indisponível." });
      const uploaded = await controlled(
        request,
        "upload",
        [
          "upload",
          createHash("sha256").update(request.body).digest("hex"),
          mediaType,
          selectedCondominiumName,
          chatId,
          request.headers["x-document-title"],
          request.headers["x-document-type"],
          request.headers["x-document-id"],
          request.headers["x-document-validity-confirmed"]
        ],
        () =>
          uploadDocument(documentStorage, documentUploadRepository, context, {
            ...(selectedCondominiumName === undefined ? {} : { selectedCondominiumName }),
            title: decodeDocumentTitle(request.headers["x-document-title"] ?? ""),
            documentType: request.headers["x-document-type"] ?? "",
            ...(request.headers["x-document-id"] === undefined
              ? {}
              : { documentId: request.headers["x-document-id"] }),
            content: request.body,
            mediaType,
            validityConfirmed: request.headers["x-document-validity-confirmed"] === "true"
          }),
        context
      );
      const memory = options.developmentDocumentMemory;
      if (chatId !== undefined)
        await chatRepository.attachDocument(context, chatId, {
          documentVersionId: uploaded.documentVersionId,
          title: uploaded.title,
          createdAt: now().toISOString()
        });
      if (memory !== undefined) {
        const reservation = documentReservations.get(request);
        if (reservation !== undefined) reservation.transferred = true;
        // Yield until the original has been acknowledged; parsing must not block the upload.
        const task = new Promise<void>((resolve) => setImmediate(resolve)).then(async () => {
          try {
            await documentCatalogRepository.updateProcessingStatus?.(context, {
              documentVersionId: uploaded.documentVersionId,
              processingStatus: "processing"
            });
            let extractionSummary: DocumentExtractionSummary | undefined;
            const status = await memory.indexUploaded({
              record: uploaded,
              content: request.body,
              validityConfirmed: request.headers["x-document-validity-confirmed"] === "true",
              onExtractionSummary: (summary) => {
                extractionSummary = summary;
              }
            });
            await documentCatalogRepository.updateProcessingStatus?.(context, {
              documentVersionId: uploaded.documentVersionId,
              processingStatus: status === "pending_confirmation" ? "ready" : status,
              ...(extractionSummary === undefined ? {} : { extractionSummary }),
              ...(memory.getCondominiumCheck(context.condominiumId, uploaded.documentVersionId) ===
              undefined
                ? {}
                : {
                    condominiumCheck: memory.getCondominiumCheck(
                      context.condominiumId,
                      uploaded.documentVersionId
                    )!
                  })
            });
          } catch {
            await documentCatalogRepository.updateProcessingStatus?.(context, {
              documentVersionId: uploaded.documentVersionId,
              processingStatus: "failed"
            });
          }
        });
        pendingDocumentProcessing.add(task);
        void task
          .finally(() => {
            pendingDocumentProcessing.delete(task);
            reservation?.release();
            documentReservations.delete(request);
          })
          .catch(() => undefined);
      }
      void options.processPendingDocuments?.().catch(() => undefined);

      return reply.code(202).send({
        documentId: uploaded.documentId,
        documentVersionId: uploaded.documentVersionId,
        processingStatus: uploaded.processingStatus,
        validityStatus: uploaded.validityStatus
      });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      if (error instanceof TenantWorkLimitExceededError) {
        return reply
          .header("retry-after", String(error.retryAfterSeconds))
          .code(429)
          .send({ message: "Tente novamente em instantes." });
      }

      if (error instanceof InvalidDocumentUploadError) {
        return reply.code(400).send({ message: error.message });
      }

      if (error instanceof DocumentUploadForbiddenError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }

      if (error instanceof OperationBudgetError)
        return reply
          .code(error.code === "limit" ? 429 : 503)
          .send({ message: "Não foi possível autorizar ou retomar esta operação com segurança." });

      return reply
        .code(500)
        .send({ message: "Não foi possível registrar o documento com segurança." });
    }
  });

  app.get<{
    Params: { condominiumId: string };
    Headers: { "x-development-user-id"?: string };
    Querystring: HistoryQuery;
  }>("/v1/condominiums/:condominiumId/history", async (request, reply) => {
    const limit = parseHistoryLimit(request.query.limit);
    if (limit === undefined) {
      return reply.code(400).send({ message: "O limite do histórico deve estar entre 1 e 100." });
    }
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      const chatId = request.query.chatId;
      if (chatId !== undefined && !chatIdPattern.test(chatId))
        return reply.code(400).send({ message: "O identificador da conversa é inválido." });
      if (chatId !== undefined && (await chatRepository.find(context, chatId)) === undefined)
        return reply.code(404).send({ message: "Conversa indisponível." });
      let before;
      try {
        before = parseHistoryCursor(request.query.before);
      } catch {
        return reply.code(400).send({ message: "O cursor do histórico é inválido." });
      }
      const entries = await answerUseCase.listConversationHistory(context, limit, {
        ...(chatId === undefined ? {} : { chatId }),
        ...(before === undefined ? {} : { before })
      });
      const attachments =
        chatId === undefined ? [] : await chatRepository.listAttachments(context, chatId);
      const catalog =
        attachments.length === 0
          ? []
          : await listRegisteredDocuments(documentCatalogRepository, context);

      return reply.header("cache-control", "private, no-store").send({
        nextCursor:
          entries.length === limit && entries[0] !== undefined
            ? `${entries[0].createdAt.toISOString()}|${entries[0].questionId}`
            : null,
        attachments: attachments.filter((attachment) =>
          catalog.some((document) => document.documentVersionId === attachment.documentVersionId)
        ),
        entries: entries.map((entry) => ({
          questionId: entry.questionId,
          question: entry.question,
          answer: toPublicAnswer(entry.answer),
          createdAt: entry.createdAt.toISOString()
        }))
      });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível carregar o histórico com segurança." });
    }
  });

  app.post<{
    Params: { condominiumId: string };
    Headers: {
      "x-development-user-id"?: string;
      "x-development-user-name"?: string;
      "idempotency-key"?: string;
    };
    Body: unknown;
  }>("/v1/condominiums/:condominiumId/questions", async (request, reply) => {
    const progress = questionResearchProgress(
      reply,
      request.headers["x-alvitra-progress"] === "web"
    );
    if (!isAskBody(request.body)) {
      return reply.code(400).send({ message: "A pergunta é obrigatória." });
    }
    if (request.body.question.trim().length === 0 || request.body.question.length > 4_000) {
      return reply.code(400).send({ message: "A pergunta deve ter entre 1 e 4.000 caracteres." });
    }
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      tenantWorkLimiter.consume({
        operation: "document_question",
        condominiumId: context.condominiumId,
        userId: context.userId,
        now: now()
      });
      const preferredName = requestPreferredName(request);
      if (
        request.body.chatId !== undefined &&
        (await chatRepository.find(context, request.body.chatId)) === undefined
      )
        return reply.code(404).send({ message: "Conversa indisponível." });
      const activeChatId = request.body.chatId;
      let registeredProfile;
      try {
        registeredProfile = await options.condominiumProfileRepository?.getProfile({
          userId: context.userId,
          condominiumId: context.condominiumId
        });
      } catch {
        throw new ConversationMemoryError();
      }
      const questionBody = request.body;
      const answer = await controlled(
        request,
        "question",
        ["question", request.body, preferredName, registeredProfile],
        () =>
          answerUseCase.ask(context, {
            onWebResearchStarted: progress.start,
            ...(activeChatId
              ? {
                  readAuxiliaryHistory: async () =>
                    journalMemoryEntries(
                      context,
                      activeChatId,
                      (
                        await conversationStore.list(
                          {
                            kind: "chat",
                            userId: context.userId,
                            condominiumId: context.condominiumId,
                            chatId: activeChatId
                          },
                          9
                        )
                      ).entries
                    )
                }
              : {}),
            revalidateConversation: async () => {
              const refreshed = await resolveAuthorizedCondominiumContext(
                options.membershipRepository,
                { userId: context.userId, condominiumId: context.condominiumId, now: now() }
              );
              if (
                refreshed.membershipRevision !== context.membershipRevision ||
                refreshed.roleKey !== context.roleKey
              )
                throw new AccessDeniedError();
              if (
                activeChatId !== undefined &&
                (await chatRepository.find(refreshed, activeChatId)) === undefined
              )
                throw new ConversationMemoryError(404);
            },
            ...(questionBody.chatId === undefined ? {} : { chatId: questionBody.chatId }),
            question: questionBody.question,
            requestId: request.id,
            ...(registeredProfile === undefined
              ? {}
              : {
                  registeredProfile: {
                    condominiumId: registeredProfile.condominiumId,
                    name: registeredProfile.name,
                    unitCount: registeredProfile.unitCount
                  }
                }),
            readIntegralDocuments: async () => {
              return readIntegralSet(context);
            },
            preferredName: preferredName ?? "",
            ...((request.headers["idempotency-key"] ??
              request.headers["x-conversation-request-id"]) === undefined
              ? {}
              : {
                  idempotencyKey: String(
                    request.headers["idempotency-key"] ??
                      request.headers["x-conversation-request-id"]
                  )
                })
          }),
        context
      );

      if (context.roleKey === "manager" && options.condominiumProfileRepository !== undefined) {
        const currentProfile = await options.condominiumProfileRepository.getProfile({
          userId: context.userId,
          condominiumId: context.condominiumId
        });
        const learned =
          currentProfile === undefined
            ? undefined
            : learnCondominiumProfileFromConversation(currentProfile, request.body.question);
        if (learned !== undefined) {
          await options.condominiumProfileRepository.updateProfile({
            userId: context.userId,
            condominiumId: context.condominiumId,
            profile: learned.profile
          });
        }
      }

      const analysisReader =
        options.documentAnalysisReader ?? options.developmentDocumentMemory?.analysisReader;
      let documentAnalysis;
      if (analysisReader !== undefined && isDocumentAnalysisRequest(request.body.question)) {
        try {
          const catalog = await listRegisteredDocuments(documentCatalogRepository, context);
          const eligible = catalog.filter(
            (document) =>
              document.processingStatus === "ready" &&
              ["confirmed", "not_applicable"].includes(document.validityStatus)
          );
          const documents = await analysisReader.readAuthorized(
            context,
            eligible.map((document) => document.documentVersionId)
          );
          documentAnalysis = analyzeDocumentRequest(context, request.body.question, documents);
        } catch {
          documentAnalysis = unavailableDocumentAnalysis();
        }
      }
      return progress.send(200, {
        ...toPublicAnswer(answer),
        ...(documentAnalysis === undefined ? {} : { documentAnalysis })
      });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return progress.send(403, { message: "Acesso não autorizado." });
      }
      if (error instanceof ConversationMemoryError) {
        if (error.statusCode === 409) reply.header("retry-after", "1");
        return progress.send(error.statusCode, { message: error.message });
      }
      if (error instanceof OperationBudgetError)
        return progress.send(error.code === "limit" ? 429 : 503, {
          message: "Não foi possível autorizar ou retomar esta operação com segurança."
        });
      if (error instanceof TenantWorkLimitExceededError) {
        reply.header("retry-after", String(error.retryAfterSeconds));
        return progress.send(429, { message: "Tente novamente em instantes." });
      }
      if (
        error instanceof Error &&
        (error.message.startsWith("A pergunta") ||
          error.message.startsWith("A chave de idempotência"))
      ) {
        return progress.send(400, { message: error.message });
      }
      console.error("Falha ao processar pergunta", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
      return progress.send(500, {
        message: "Não foi possível processar a consulta com segurança."
      });
    }
  });

  app.post<{
    Params: { condominiumId: string; answerId: string };
    Headers: { "x-development-user-id"?: string };
    Body: unknown;
  }>("/v1/condominiums/:condominiumId/answers/:answerId/feedback", async (request, reply) => {
    if (!isFeedbackBody(request.body)) {
      return reply.code(400).send({ message: "A classificação do feedback é obrigatória." });
    }
    if (request.body.comment !== undefined && request.body.comment.trim().length === 0) {
      return reply.code(400).send({ message: "O comentário do feedback não pode ser vazio." });
    }
    const userId = requestUserId(request);
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });

    try {
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      try {
        const traceFeedback = await answerTraceStore.recordFeedback(context, {
          answerId: request.params.answerId,
          classification: request.body.classification,
          ...(request.body.comment === undefined ? {} : { comment: request.body.comment })
        });

        return reply.code(201).send({
          feedbackId: traceFeedback.id,
          answerId: traceFeedback.answerId,
          condominiumId: traceFeedback.condominiumId,
          classification: traceFeedback.classification,
          createdAt: traceFeedback.createdAt
        });
      } catch (error: unknown) {
        if (!(error instanceof AnswerTraceNotFoundError)) {
          throw error;
        }
      }
      const feedback = await answerUseCase.submitFeedback(context, {
        answerId: request.params.answerId,
        classification: request.body.classification,
        comment: request.body.comment ?? null,
        requestId: request.id
      });

      return reply.code(201).send({
        feedbackId: feedback.id,
        answerId: feedback.answerId,
        condominiumId: feedback.condominiumId,
        classification: feedback.classification,
        createdAt: feedback.createdAt.toISOString()
      });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      if (error instanceof InvalidAnswerFeedbackError) {
        return reply.code(400).send({ message: error.message });
      }
      if (
        error instanceof Error &&
        (error.message === "A classificação do feedback é inválida." ||
          error.message.startsWith("O identificador da resposta") ||
          error.message.startsWith("O identificador da requisição do feedback") ||
          error.message.startsWith("O comentário do feedback"))
      ) {
        return reply.code(400).send({ message: error.message });
      }
      if (error instanceof Error && error.message.includes("não foi encontrada")) {
        return reply.code(404).send({ message: "Resposta não encontrada." });
      }
      return reply
        .code(500)
        .send({ message: "Não foi possível registrar o feedback com segurança." });
    }
  });

  app.post<{
    Params: { condominiumId: string };
    Headers: { "x-development-user-id"?: string };
    Body: { question?: unknown };
  }>("/v1/condominiums/:condominiumId/answers", async (request, reply) => {
    const userId = requestUserId(request);
    const question = request.body?.question;
    if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
    if (typeof question !== "string" || question.trim().length === 0) {
      return reply.code(400).send({ message: "A pergunta deve ser preenchida." });
    }
    if (options.answerService === undefined || options.retriever === undefined) {
      return reply.code(503).send({ message: "Consulta documental indisponível." });
    }
    const startedAt = performance.now();
    let context: AuthorizedCondominiumContext | undefined;
    let retrieval = emptyRetrieval(question);
    try {
      context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId: createCondominiumId(request.params.condominiumId),
        now: now()
      });
      const authorizedContext = context;
      const response = await controlled(
        request,
        "question",
        ["legacy-answer", question],
        async () => {
          retrieval = await options.retriever!.search(authorizedContext, { query: question });
          return options.answerService!.answer(authorizedContext, { question, retrieval });
        },
        authorizedContext
      );
      const trace = await answerTraceStore.record({
        context,
        question,
        retrieval,
        response,
        latencyMs: performance.now() - startedAt,
        createdAt: now()
      });
      return reply.send({ answerId: trace.id, ...response });
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      if (context !== undefined) {
        try {
          const failed = createFailedAnswer();
          const trace = await answerTraceStore.record({
            context,
            question,
            retrieval,
            response: failed,
            latencyMs: performance.now() - startedAt,
            createdAt: now()
          });
          return reply.code(503).send({
            answerId: trace.id,
            message: "Não foi possível consultar os documentos com segurança."
          });
        } catch {
          // Uma falha no registro não deve expor detalhes internos nem uma
          // resposta que não tenha uma trilha correspondente.
        }
      }
      return reply
        .code(503)
        .send({ message: "Não foi possível consultar os documentos com segurança." });
    }
  });

  app.get<{
    Params: { condominiumId: string; documentId: string; documentVersionId: string };
  }>(
    "/v1/condominiums/:condominiumId/legal-sources/:documentId/versions/:documentVersionId/copy",
    async (request, reply) => {
      const userId = requestUserId(request);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      try {
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId: createCondominiumId(request.params.condominiumId),
          now: now()
        });
        const content = await options.legalCopyReader?.getAuthorizedCopy(context, request.params);
        if (content === undefined)
          return reply.code(404).send({ message: "Cópia de consulta não encontrada." });
        return reply
          .type("application/pdf")
          .header("content-disposition", "inline; filename=alvitra-copia-de-consulta.pdf")
          .header("cache-control", "private, no-store")
          .header("x-content-type-options", "nosniff")
          .send(content);
      } catch (error) {
        if (error instanceof AccessDeniedError)
          return reply.code(403).send({ message: "Acesso não autorizado." });
        return reply.code(500).send({ message: "Não foi possível abrir a cópia com segurança." });
      }
    }
  );

  app.get<{
    Params: { condominiumId: string; documentId: string; documentVersionId: string; page: string };
    Headers: { "x-development-user-id"?: string };
  }>(
    "/v1/condominiums/:condominiumId/documents/:documentId/versions/:documentVersionId/pages/:page",
    async (request, reply) => {
      const userId = requestUserId(request);
      const page = Number(request.params.page);
      if (userId === undefined) return reply.code(401).send({ message: unauthenticatedMessage });
      if (options.documentSourceReader === undefined) {
        return reply.code(503).send({ message: "Visualização da fonte indisponível." });
      }
      try {
        const condominiumId = createCondominiumId(request.params.condominiumId);
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId,
          now: now()
        });
        const source = await options.documentSourceReader.getAuthorizedPage(context, {
          documentId: request.params.documentId,
          documentVersionId: request.params.documentVersionId,
          page
        });
        if (source === undefined) {
          return reply.code(404).send({ message: "Fonte não encontrada." });
        }
        return reply.send({ ...source, url: createDocumentSourceUrl(condominiumId, source) });
      } catch (error: unknown) {
        if (error instanceof AccessDeniedError) {
          return reply.code(403).send({ message: "Acesso não autorizado." });
        }
        return reply.code(404).send({ message: "Fonte não encontrada." });
      }
    }
  );

  return app;
}
