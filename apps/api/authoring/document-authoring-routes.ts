import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import { ConversationStoreError, type ConversationStore } from "../answers/conversation-store.js";
import { chatIdPattern, type ChatRepository } from "../chats/chat-repository.js";
import { ChatHttpError } from "../chats/chat-routes.js";
import { DocumentDraftError } from "./document-drafts.js";
import type { createDocumentAuthoringService } from "./document-authoring.js";

export function registerDocumentAuthoringRoutes(
  app: FastifyInstance,
  input: {
    service: ReturnType<typeof createDocumentAuthoringService>;
    store: ConversationStore;
    chats: ChatRepository;
    resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
  }
) {
  for (const action of ["list", "read", "prepare", "decide", "export", "purge"] as const)
    app.route<{
      Params: { condominiumId: string; chatId: string; proposalId?: string };
      Querystring: { before?: string };
      Body: unknown;
    }>({
      method:
        action === "purge"
          ? "DELETE"
          : action === "prepare" || action === "decide"
            ? "POST"
            : "GET",
      url: `/v1/condominiums/:condominiumId/chats/:chatId/document-proposals${action === "list" ? "" : `/:proposalId${action === "decide" ? "/decide" : action === "export" ? "/export" : ""}`}`,
      bodyLimit: 30_000,
      async handler(request, reply) {
        reply
          .header("cache-control", "private, no-store")
          .header("x-content-type-options", "nosniff");
        try {
          const context = await input.resolve(request, request.params.condominiumId);
          const { chatId, proposalId } = request.params;
          if (
            !context.permissions.includes("document:read") ||
            !context.permissions.includes("document:upload")
          )
            throw new AccessDeniedError();
          if (!chatIdPattern.test(chatId) || !(await input.chats.find(context, chatId)))
            throw new DocumentDraftError(404, "Conversa indisponível.");
          if (proposalId && !chatIdPattern.test(proposalId))
            throw new DocumentDraftError(400, "Identificador de proposta inválido.");
          const scope = {
            kind: "chat" as const,
            condominiumId: context.condominiumId,
            userId: context.userId,
            chatId
          };
          const ensureCurrent = async () => {
            const current = await input.resolve(request, request.params.condominiumId);
            if (
              current.userId !== context.userId ||
              !current.permissions.includes("document:read") ||
              !current.permissions.includes("document:upload") ||
              !(await input.chats.find(current, chatId))
            )
              throw new AccessDeniedError();
            return current;
          };
          let result;
          if (action === "purge") {
            await input.service.purge(context, scope, proposalId!);
            await ensureCurrent();
            return { purged: true };
          }
          if (action === "export") {
            const exported = await input.service.export(context, scope, proposalId!);
            await input.service.read(await ensureCurrent(), scope, proposalId!);
            return exported;
          }
          if (action === "list")
            result = {
              ...(await input.service.available(context, scope)),
              ...(await input.service.recent(context, scope, request.query.before))
            };
          else if (action === "read")
            result = { proposal: await input.service.read(context, scope, proposalId!) };
          else if (action === "prepare")
            result = {
              proposal: await input.service.prepare(context, scope, proposalId!, request.body)
            };
          else {
            const body = request.body as { hash?: unknown; accept?: unknown } | null;
            if (
              !body ||
              typeof body.hash !== "string" ||
              !/^[a-f0-9]{64}$/u.test(body.hash) ||
              typeof body.accept !== "boolean"
            )
              throw new DocumentDraftError(400, "Decisão de proposta inválida.");
            result = await input.service.decide(
              context,
              scope,
              proposalId!,
              body.hash,
              body.accept
            );
          }
          const current = await ensureCurrent();
          if (proposalId) await input.service.read(current, scope, proposalId);
          return { ...result, durable: input.store.durable };
        } catch (error) {
          if (error instanceof DocumentDraftError || error instanceof ConversationStoreError)
            return reply.code(error.statusCode).send({ message: error.message });
          if (error instanceof ChatHttpError)
            return reply.code(error.status).send({ message: error.message });
          if (error instanceof AccessDeniedError)
            return reply.code(403).send({ message: "Acesso não autorizado." });
          return reply.code(503).send({
            message:
              "Não foi possível preparar ou recuperar a proposta documental. Retome o mesmo pedido."
          });
        }
      }
    });
}
