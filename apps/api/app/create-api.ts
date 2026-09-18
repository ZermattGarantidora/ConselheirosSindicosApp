import { performance } from "node:perf_hooks";

import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

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
import type { DevelopmentDocumentMemory } from "../documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../documents/development-document-upload-repository.js";
import {
  DocumentUploadForbiddenError,
  InvalidDocumentUploadError,
  maximumPdfUploadBytes,
  uploadDocument,
  type DocumentUploadRepository
} from "../documents/upload-document.js";
import {
  createLocalPrivateDocumentStorage,
  type PrivateDocumentStorage
} from "../documents/private-document-storage.js";
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

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  aiProvider?: "gemini" | "local";
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  documentUploadRepository?: DocumentUploadRepository;
  answerUseCase?: AnswerUseCase;
  answerService?: AnswerService;
  answerTraceStore?: AnswerTraceStore;
  retriever?: ScopedTextRetriever;
  documentSourceReader?: DocumentSourceReader;
  developmentMembershipRegistry?: DevelopmentMembershipRegistry;
  developmentDocumentMemory?: DevelopmentDocumentMemory;
  accountAuth?: AccountAuthService;
  googleOAuth?: GoogleOAuthClient;
  condominiumDirectory?: CondominiumDirectory;
  secureCookies?: boolean;
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
  if (error instanceof AccountAuthError) {
    if (error.code === "invalid_input") return reply.code(400).send({ message: error.message });
    if (error.code === "email_taken") return reply.code(409).send({ message: error.message });
    return reply.code(401).send({ message: error.message });
  }
  return reply
    .code(500)
    .send({ message: "Não foi possível concluir a autenticação com segurança." });
}

export function createApi(options: CreateApiOptions): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: maximumPdfUploadBytes });
  const now = options.now ?? (() => new Date());
  const version = options.version ?? "0.1.0";
  const aiProvider = options.aiProvider ?? "local";
  const documentStorage =
    options.documentStorage ?? createLocalPrivateDocumentStorage(".local/synthetic-documents");
  const documentUploadRepository =
    options.documentUploadRepository ?? createDevelopmentDocumentUploadRepository();
  const answerUseCase =
    options.answerUseCase ??
    createAnswerUseCase({
      retriever: createScopedTextRetriever(createInMemoryScopedRetrievalIndex([])),
      gateway: createLocalSyntheticAnswerGateway(),
      persistence: createInMemoryAnswerPersistence()
    });
  const answerTraceStore = options.answerTraceStore ?? createInMemoryAnswerTraceStore();
  const authenticatedUsers = new WeakMap<
    FastifyRequest,
    ReturnType<typeof createUserId> | undefined
  >();
  const accountAuth = options.accountAuth;
  const secureCookies = options.secureCookies ?? false;
  const unauthenticatedMessage =
    accountAuth === undefined
      ? "Identidade de desenvolvimento inválida."
      : "Sessão não autenticada.";

  if (accountAuth !== undefined) {
    app.addHook("preHandler", async (request) => {
      const token = getAccountSessionCookie(request.headers.cookie);
      const account =
        token === undefined ? undefined : await accountAuth.authenticate(token, now());
      authenticatedUsers.set(request, account?.userId);
    });
  }

  function requestUserId(request: FastifyRequest): ReturnType<typeof createUserId> | undefined {
    if (accountAuth !== undefined) return authenticatedUsers.get(request);
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

  app.get("/health", async () => ({
    status: "ok",
    version,
    aiProvider,
    authMode: accountAuth === undefined ? "development" : "real",
    googleAuthEnabled: accountAuth !== undefined && options.googleOAuth !== undefined
  }));

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
        if (error instanceof CondominiumAlreadyExistsError) {
          return reply.code(409).send({ message: error.message });
        }
        return reply.code(400).send({
          message: error instanceof Error ? error.message : "Não foi possível criar o condomínio."
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

  app.post<{
    Params: { condominiumId: string };
    Headers: {
      "x-development-user-id"?: string;
      "x-document-title"?: string;
      "x-document-type"?: string;
      "x-document-id"?: string;
      "x-document-validity-confirmed"?: string;
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
      const uploaded = await uploadDocument(documentStorage, documentUploadRepository, context, {
        title: decodeDocumentTitle(request.headers["x-document-title"] ?? ""),
        documentType: request.headers["x-document-type"] ?? "",
        ...(request.headers["x-document-id"] === undefined
          ? {}
          : { documentId: request.headers["x-document-id"] }),
        content: request.body
      });
      const memoryStatus = await options.developmentDocumentMemory?.indexUploaded({
        record: uploaded,
        content: request.body,
        validityConfirmed: request.headers["x-document-validity-confirmed"] === "true"
      });

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
      const answer = await answerUseCase.ask(context, {
        question: request.body.question,
        requestId: request.id,
        ...(request.headers["idempotency-key"] === undefined
          ? {}
          : { idempotencyKey: request.headers["idempotency-key"] })
      });

      return reply.code(200).send(toPublicAnswer(answer));
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      if (
        error instanceof Error &&
        (error.message.startsWith("A pergunta") ||
          error.message.startsWith("A chave de idempotência"))
      ) {
        return reply.code(400).send({ message: error.message });
      }
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
