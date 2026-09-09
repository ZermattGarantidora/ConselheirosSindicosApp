import Fastify, { type FastifyInstance } from "fastify";

import { createAnswerUseCase, type AnswerUseCase } from "../answers/answer-use-case.js";
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
import { createInMemoryScopedRetrievalIndex } from "../retrieval/in-memory-scoped-retrieval.js";
import { createScopedTextRetriever } from "../retrieval/text-retrieval.js";

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  documentUploadRepository?: DocumentUploadRepository;
  answerUseCase?: AnswerUseCase;
}>;

type AskBody = Readonly<{ question: string }>;
type FeedbackBody = Readonly<{
  classification: SubmitFeedbackInput["classification"];
  comment?: string;
}>;

function isAskBody(value: unknown): value is AskBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    typeof value.question === "string"
  );
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

export function createApi(options: CreateApiOptions): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: maximumPdfUploadBytes });
  const now = options.now ?? (() => new Date());
  const version = options.version ?? "0.1.0";
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

  app.addContentTypeParser("application/pdf", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

  app.get("/health", async () => ({ status: "ok", version }));

  app.get<{ Params: { condominiumId: string }; Headers: { "x-development-user-id"?: string } }>(
    "/v1/condominiums/:condominiumId/context",
    async (request, reply) => {
      try {
        const userId = createUserId(request.headers["x-development-user-id"] ?? "");
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
    };
    Body: Buffer;
  }>("/v1/condominiums/:condominiumId/documents", async (request, reply) => {
    const developmentUserId = request.headers["x-development-user-id"];

    if (developmentUserId === undefined || developmentUserId.trim().length === 0) {
      return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
    }

    try {
      const userId = createUserId(developmentUserId);
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      const uploaded = await uploadDocument(documentStorage, documentUploadRepository, context, {
        title: request.headers["x-document-title"] ?? "",
        documentType: request.headers["x-document-type"] ?? "",
        ...(request.headers["x-document-id"] === undefined
          ? {}
          : { documentId: request.headers["x-document-id"] }),
        content: request.body
      });

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

  app.post<{
    Params: { condominiumId: string };
    Headers: { "x-development-user-id"?: string };
    Body: unknown;
  }>("/v1/condominiums/:condominiumId/questions", async (request, reply) => {
    if (!isAskBody(request.body)) {
      return reply.code(400).send({ message: "A pergunta é obrigatória." });
    }
    if (request.body.question.trim().length === 0 || request.body.question.length > 4_000) {
      return reply.code(400).send({ message: "A pergunta deve ter entre 1 e 4.000 caracteres." });
    }
    const developmentUserId = request.headers["x-development-user-id"];
    if (developmentUserId === undefined || developmentUserId.trim().length === 0) {
      return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
    }

    try {
      const userId = createUserId(developmentUserId);
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      const answer = await answerUseCase.ask(context, {
        question: request.body.question,
        requestId: request.id
      });

      return reply.code(200).send(toPublicAnswer(answer));
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
      }
      if (error instanceof Error && error.message.startsWith("A pergunta")) {
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
    const developmentUserId = request.headers["x-development-user-id"];
    if (developmentUserId === undefined || developmentUserId.trim().length === 0) {
      return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
    }

    try {
      const userId = createUserId(developmentUserId);
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
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

  return app;
}
