import Fastify, { type FastifyInstance } from "fastify";

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
import type { AnswerService } from "../answers/answer-service.js";
import type { ScopedTextRetriever } from "../retrieval/text-retrieval.js";
import {
  createDocumentSourceUrl,
  type DocumentSourceReader
} from "../documents/document-source.js";

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  documentUploadRepository?: DocumentUploadRepository;
  answerService?: AnswerService;
  retriever?: ScopedTextRetriever;
  documentSourceReader?: DocumentSourceReader;
}>;

export function createApi(options: CreateApiOptions): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: maximumPdfUploadBytes });
  const now = options.now ?? (() => new Date());
  const version = options.version ?? "0.1.0";
  const documentStorage =
    options.documentStorage ?? createLocalPrivateDocumentStorage(".local/synthetic-documents");
  const documentUploadRepository =
    options.documentUploadRepository ?? createDevelopmentDocumentUploadRepository();

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
    Body: { question?: unknown };
  }>("/v1/condominiums/:condominiumId/answers", async (request, reply) => {
    const developmentUserId = request.headers["x-development-user-id"];
    const question = request.body?.question;

    if (developmentUserId === undefined || developmentUserId.trim().length === 0) {
      return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
    }
    if (typeof question !== "string" || question.trim().length === 0) {
      return reply.code(400).send({ message: "A pergunta deve ser preenchida." });
    }
    if (options.answerService === undefined || options.retriever === undefined) {
      return reply.code(503).send({ message: "Consulta documental indisponível." });
    }

    try {
      const userId = createUserId(developmentUserId);
      const condominiumId = createCondominiumId(request.params.condominiumId);
      const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
        userId,
        condominiumId,
        now: now()
      });
      const retrieval = await options.retriever.search(context, { query: question });
      return reply.send(await options.answerService.answer(context, { question, retrieval }));
    } catch (error: unknown) {
      if (error instanceof AccessDeniedError) {
        return reply.code(403).send({ message: "Acesso não autorizado." });
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
      const developmentUserId = request.headers["x-development-user-id"];
      const page = Number(request.params.page);
      if (developmentUserId === undefined || developmentUserId.trim().length === 0) {
        return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
      }
      if (options.documentSourceReader === undefined) {
        return reply.code(503).send({ message: "Visualização da fonte indisponível." });
      }

      try {
        const condominiumId = createCondominiumId(request.params.condominiumId);
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId: createUserId(developmentUserId),
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
