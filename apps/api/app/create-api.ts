import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";

import { createAnswerUseCase, type AnswerUseCase } from "../answers/answer-use-case.js";
import { createFailedAnswer, type AnswerService } from "../answers/answer-service.js";
import { createLocalSyntheticAnswerGateway } from "../answers/answer-gateway.js";
import {
  isFeedbackClassification,
  type SubmitFeedbackInput
} from "../answers/answer-persistence.js";
import { createInMemoryAnswerPersistence } from "../answers/in-memory-answer-persistence.js";
import { toPublicAnswer } from "../answers/answer-contract.js";
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

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  aiProvider?: "gemini" | "local";
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  imageUploadsEnabled?: boolean;
  documentUploadRepository?: DocumentUploadRepository;
  documentCatalogRepository?: DocumentCatalogRepository;
  answerUseCase?: AnswerUseCase;
  answerService?: AnswerService;
  answerTraceStore?: AnswerTraceStore;
  retriever?: ScopedTextRetriever;
  documentSourceReader?: DocumentSourceReader;
  developmentMembershipRegistry?: DevelopmentMembershipRegistry;
  developmentDocumentMemory?: DevelopmentDocumentMemory;
  accountAuth?: AccountAuthService;
  accountSecurity?: AccountSecurityService;
  accountActionDelivery?: AccountActionDelivery;
  googleOAuth?: GoogleOAuthClient;
  condominiumDirectory?: CondominiumDirectory;
  condominiumProfileRepository?: CondominiumProfileRepository;
  secureCookies?: boolean;
  authSessionRestore?: boolean;
  processPendingDocuments?: () => Promise<void>;
  tenantWorkLimiter?: TenantWorkLimiter;
}>;

type AskBody = Readonly<{ question: string }>;
type CreateTestCondominiumBody = Readonly<{
  condominiumId: string;
  name: string;
  cnpj: string;
  administrationCompany?: string;
  unitCount?: number | null;
  address: Readonly<{
    postalCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
  }>;
  contact?: Readonly<{ managerName?: string; email?: string; phone?: string }>;
}>;
type FeedbackBody = Readonly<{
  classification: SubmitFeedbackInput["classification"];
  comment?: string;
}>;
type HistoryQuery = Readonly<{ limit?: string }>;
type RegisterAccountBody = Readonly<{ displayName: string; email: string; password: string }>;
type LoginAccountBody = Readonly<{ email: string; password: string }>;
type CreateCondominiumBody = CreateCondominiumInput;

function isAskBody(value: unknown): value is AskBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    typeof value.question === "string"
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
  return (
    typeof value === "object" &&
    value !== null &&
    "condominiumId" in value &&
    typeof value.condominiumId === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "cnpj" in value &&
    typeof value.cnpj === "string" &&
    "address" in value &&
    typeof value.address === "object" &&
    value.address !== null &&
    "city" in value.address &&
    typeof value.address.city === "string" &&
    "state" in value.address &&
    typeof value.address.state === "string"
  );
}

function isCreateCondominiumBody(value: unknown): value is CreateCondominiumBody {
  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "cnpj" in value &&
    typeof value.cnpj === "string" &&
    "address" in value &&
    typeof value.address === "object" &&
    value.address !== null &&
    "city" in value.address &&
    typeof value.address.city === "string" &&
    "state" in value.address &&
    typeof value.address.state === "string" &&
    "contact" in value &&
    typeof value.contact === "object" &&
    value.contact !== null
  ) {
    const body = value as CreateCondominiumBody;
    const cnpjDigits = body.cnpj.replace(/\D/gu, "");
    return (
      body.name.trim().length >= 2 &&
      body.name.trim().length <= 120 &&
      cnpjDigits.length === 14 &&
      body.address.city.trim().length > 0 &&
      /^[A-Z]{2}$/iu.test(body.address.state.trim()) &&
      (body.unitCount === undefined ||
        body.unitCount === null ||
        (Number.isInteger(body.unitCount) && body.unitCount > 0))
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
  const tenantWorkLimiter = options.tenantWorkLimiter ?? createInMemoryTenantWorkLimiter();
  const authenticatedAccounts = new WeakMap<
    FastifyRequest,
    | Readonly<{ userId: ReturnType<typeof createUserId>; email: string; displayName: string }>
    | undefined
  >();
  const accountAuth = options.accountAuth;
  const accountSecurity = options.accountSecurity;
  const mfaEnrollmentAvailable = options.accountActionDelivery?.channel === "external_email";
  const secureCookies = options.secureCookies ?? false;
  const authSessionRestore = options.authSessionRestore ?? true;
  const unauthenticatedMessage =
    accountAuth === undefined
      ? "Identidade de desenvolvimento inválida."
      : "Sessão não autenticada.";

  if (accountAuth !== undefined) {
    app.addHook("preHandler", async (request) => {
      const routeUrl = request.routeOptions.url ?? "";
      if (
        routeUrl === "/health" ||
        routeUrl === "/v1/runtime" ||
        routeUrl.startsWith("/v1/auth/")
      ) {
        return;
      }
      const token = getAccountSessionCookie(request.headers.cookie);
      const account =
        token === undefined ? undefined : await accountAuth.authenticate(token, now());
      authenticatedAccounts.set(request, account);
    });
  }

  function requestUserId(request: FastifyRequest): ReturnType<typeof createUserId> | undefined {
    if (accountAuth !== undefined) return authenticatedAccounts.get(request)?.userId;
    const rawDevelopmentUserId = request.headers["x-development-user-id"];
    const developmentUserId = Array.isArray(rawDevelopmentUserId)
      ? rawDevelopmentUserId[0]
      : rawDevelopmentUserId;
    if (developmentUserId === undefined || developmentUserId.trim().length === 0) return undefined;
    return createUserId(developmentUserId);
  }

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
    status: "ok",
    version,
    aiProvider,
    authMode: accountAuth === undefined ? "development" : "real",
    googleAuthEnabled: accountAuth !== undefined && options.googleOAuth !== undefined,
    authSessionRestore: accountAuth !== undefined && authSessionRestore,
    accountSecurityEnabled: accountSecurity !== undefined,
    developmentAuthActions: options.accountActionDelivery?.channel === "development_preview"
  });

  app.get("/health", async () => runtimeInformation());
  app.get("/v1/runtime", async (_request, reply) =>
    reply.header("cache-control", "no-store").send(runtimeInformation())
  );

  app.get<{ Headers: { "x-development-user-id"?: string } }>(
    "/v1/chat/bootstrap",
    async (request, reply) => {
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
            const context = await resolveAuthorizedCondominiumContext(
              options.membershipRepository,
              {
                userId,
                condominiumId: createCondominiumId(candidate),
                now: now()
              }
            );
            return reply.header("cache-control", "no-store").send({
              condominiumId: context.condominiumId,
              role: context.roleKey,
              permissions: context.permissions
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
    }
  );

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
                    detail: `${item.address.city}/${item.address.state} · Condomínio autorizado`
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
        return reply.code(400).send({ message: "Informe nome, CNPJ, cidade, UF e contato." });
      }

      try {
        const created = await condominiumDirectory.createForUser(userId, {
          ...request.body,
          cnpj: request.body.cnpj.replace(/\D/gu, "")
        });
        return reply.code(201).send({
          condominiumId: created.condominiumId,
          role: created.roleKey,
          permissions: ["document:read", "document:upload"],
          condominium: created
        });
      } catch (error: unknown) {
        try {
          const existing = await condominiumDirectory.findAuthorizedByCnpj(
            userId,
            request.body.cnpj.replace(/\D/gu, "")
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
          uploadedByCurrentUser: document.uploadedByCurrentUser === true
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
    Params: { condominiumId: string };
    Headers: {
      "x-development-user-id"?: string;
      "x-document-title"?: string;
      "x-document-type"?: string;
      "x-document-id"?: string;
      "x-document-validity-confirmed"?: string;
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
        mediaType !== "image/png"
      ) {
        throw new InvalidDocumentUploadError("Envie um PDF, uma imagem JPEG ou PNG.");
      }
      if (mediaType !== "application/pdf" && options.imageUploadsEnabled !== true) {
        return reply.code(503).send({
          message:
            "O envio de fotos será liberado quando o processamento seguro estiver configurado."
        });
      }
      const uploaded = await uploadDocument(documentStorage, documentUploadRepository, context, {
        title: decodeDocumentTitle(request.headers["x-document-title"] ?? ""),
        documentType: request.headers["x-document-type"] ?? "",
        ...(request.headers["x-document-id"] === undefined
          ? {}
          : { documentId: request.headers["x-document-id"] }),
        content: request.body,
        mediaType,
        validityConfirmed: request.headers["x-document-validity-confirmed"] === "true"
      });
      const memoryStatus = await options.developmentDocumentMemory?.indexUploaded({
        record: uploaded,
        content: request.body,
        validityConfirmed: request.headers["x-document-validity-confirmed"] === "true"
      });
      if (memoryStatus !== undefined && documentCatalogRepository.updateProcessingStatus) {
        const processingStatus =
          memoryStatus === "needs_review"
            ? "needs_review"
            : memoryStatus === "failed"
              ? "failed"
              : "ready";
        await documentCatalogRepository.updateProcessingStatus(context, {
          documentVersionId: uploaded.documentVersionId,
          processingStatus
        });
      }
      void options.processPendingDocuments?.().catch(() => undefined);

      return reply.code(202).send({
        documentId: uploaded.documentId,
        documentVersionId: uploaded.documentVersionId,
        processingStatus: uploaded.processingStatus,
        validityStatus: uploaded.validityStatus,
        ...(memoryStatus === undefined ? {} : { memoryStatus })
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
      const entries = await answerUseCase.listConversationHistory(context, limit);

      return reply.send({
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
    Headers: { "x-development-user-id"?: string; "idempotency-key"?: string };
    Body: unknown;
  }>("/v1/condominiums/:condominiumId/questions", async (request, reply) => {
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
      const answer = await answerUseCase.ask(context, {
        question: request.body.question,
        requestId: request.id,
        ...(request.headers["idempotency-key"] === undefined
          ? {}
          : { idempotencyKey: request.headers["idempotency-key"] })
      });

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

      return reply.code(200).send(toPublicAnswer(answer));
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
      if (
        error instanceof Error &&
        (error.message.startsWith("A pergunta") ||
          error.message.startsWith("A chave de idempotência"))
      ) {
        return reply.code(400).send({ message: error.message });
      }
      console.error("Falha ao processar pergunta", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
      return reply
        .code(500)
        .send({ message: "Não foi possível processar a consulta com segurança." });
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
      retrieval = await options.retriever.search(context, { query: question });
      const response = await options.answerService.answer(context, { question, retrieval });
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
