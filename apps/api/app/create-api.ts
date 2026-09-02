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

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  now?: () => Date;
  version?: string;
  documentStorage?: PrivateDocumentStorage;
  documentUploadRepository?: DocumentUploadRepository;
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

  return app;
}
