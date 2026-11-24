import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import { ConversationStoreError, type ConversationStore } from "../answers/conversation-store.js";
import { chatIdPattern, type ChatRepository } from "../chats/chat-repository.js";
import { ChatHttpError } from "../chats/chat-routes.js";
import { type createDocumentDraftService, DocumentDraftError } from "./document-drafts.js";
import type { createDocumentImprovementService } from "./document-improvements.js";

export function registerDocumentDraftRoutes(
  app: FastifyInstance,
  input: {
    service: ReturnType<typeof createDocumentDraftService>;
    improvements?: ReturnType<typeof createDocumentImprovementService>;
    store: ConversationStore;
    chats: ChatRepository;
    resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
  }
) {
  for (const action of [
    "list",
    "read",
    "propose",
    "decide",
    "pdf",
    "improvement",
    "export",
    "purge"
  ] as const) {
    app.route<{
      Params: { condominiumId: string; chatId: string; draftId?: string };
      Querystring: { hash?: string; before?: string };
      Body: unknown;
    }>({
      method:
        action === "purge"
          ? "DELETE"
          : action === "propose" || action === "decide" || action === "improvement"
            ? "POST"
            : "GET",
      url: `/v1/condominiums/:condominiumId/chats/:chatId/document-drafts${action === "list" ? "" : `/:draftId${action === "propose" || action === "read" || action === "purge" ? "" : `/${action}`}`}`,
      bodyLimit: 190_000,
      async handler(request, reply) {
        reply
          .header("cache-control", "private, no-store")
          .header("x-content-type-options", "nosniff");
        try {
          const context = await input.resolve(request, request.params.condominiumId);
          if (
            !context.permissions.includes("document:upload") ||
            !context.permissions.includes("document:read")
          )
            throw new AccessDeniedError();
          const { chatId, draftId } = request.params;
          if (!chatIdPattern.test(chatId) || !(await input.chats.find(context, chatId)))
            throw new DocumentDraftError(404, "Conversa indisponível.");
          if (draftId && !chatIdPattern.test(draftId))
            throw new DocumentDraftError(400, "Identificador inválido.");
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
          if (action === "list") {
            const page = await input.store.list(scope, 50, request.query.before);
            const ids = [
              ...new Set(
                page.entries
                  .map((e) => e.metadata.documentDraftId)
                  .filter((id): id is string => typeof id === "string" && chatIdPattern.test(id))
              )
            ];
            const drafts = [];
            for (const id of ids) {
              try {
                drafts.push(await input.service.read(context, scope, id));
              } catch (error) {
                // Um derivado excluído/expirado não oculta outros rascunhos da conversa.
                if (!(error instanceof DocumentDraftError) || error.statusCode !== 404) throw error;
              }
            }
            await ensureCurrent();
            return { drafts, nextCursor: page.nextCursor, durable: input.store.durable };
          }
          if (action === "purge") {
            await input.service.purge(context, scope, draftId!);
            await ensureCurrent();
            return { purged: true };
          }
          if (action === "export") {
            const result = await input.service.export(context, scope, draftId!);
            await ensureCurrent();
            await input.service.read(context, scope, draftId!);
            return result;
          }
          if (action === "read") {
            const draft = await input.service.read(context, scope, draftId!);
            await ensureCurrent();
            return {
              draft,
              durable: input.store.durable
            };
          }
          if (action === "pdf") {
            if (!/^[a-f0-9]{64}$/u.test(request.query.hash ?? ""))
              throw new DocumentDraftError(400, "Hash de revisão obrigatório.");
            const pdf = await input.service.download(context, scope, draftId!, request.query.hash!);
            const latest = await input.service.read(await ensureCurrent(), scope, draftId!);
            if (latest.status !== "confirmed" || latest.hash !== request.query.hash)
              throw new DocumentDraftError(
                409,
                "A revisão mudou durante o download. Recarregue o documento."
              );
            // Contexto atual é verificado novamente depois de recuperar/renderizar o conteúdo.
            const current = await input.resolve(request, request.params.condominiumId);
            if (
              current.userId !== context.userId ||
              !(await input.chats.find(current, chatId)) ||
              !current.permissions.includes("document:upload")
            )
              throw new AccessDeniedError();
            return reply
              .type("application/pdf")
              .header(
                "content-disposition",
                `attachment; filename="alvitra-rascunho-${draftId}.pdf"`
              )
              .send(pdf);
          }
          const body = request.body as {
            expectedEvent?: unknown;
            content?: unknown;
            hash?: unknown;
            confirm?: unknown;
            reviewed?: unknown;
            accept?: unknown;
          } | null;
          if (!body || typeof body.expectedEvent !== "number")
            throw new DocumentDraftError(400, "Revisão esperada obrigatória.");
          if (action === "improvement") {
            if (!input.improvements) return { offer: null };
            if (body.accept === undefined) {
              const offer = await input.improvements.offer(
                context,
                scope,
                draftId!,
                body.expectedEvent
              );
              await ensureCurrent();
              return { offer };
            }
            if (typeof body.accept !== "boolean" || typeof body.hash !== "string")
              throw new DocumentDraftError(400, "Decisão de melhoria inválida.");
            const draft = await input.improvements.decide(
              context,
              scope,
              draftId!,
              body.expectedEvent,
              body.hash,
              body.accept
            );
            await ensureCurrent();
            return { draft, durable: input.store.durable };
          }
          let draft;
          if (action === "propose")
            draft = await input.service.propose(
              context,
              scope,
              draftId ?? randomUUID(),
              body.content,
              body.expectedEvent
            );
          else {
            if (
              typeof body.hash !== "string" ||
              typeof body.confirm !== "boolean" ||
              typeof body.reviewed !== "boolean"
            )
              throw new DocumentDraftError(400, "Confirmação inválida.");
            draft = await input.service.decide(
              context,
              scope,
              draftId!,
              body.expectedEvent,
              body.hash,
              body.confirm,
              body.reviewed
            );
          }
          const current = await input.resolve(request, request.params.condominiumId);
          if (
            current.userId !== context.userId ||
            !current.permissions.includes("document:upload") ||
            !(await input.chats.find(current, chatId))
          )
            throw new AccessDeniedError();
          return { draft, durable: input.store.durable };
        } catch (error) {
          if (error instanceof DocumentDraftError || error instanceof ConversationStoreError)
            return reply.code(error.statusCode).send({ message: error.message });
          if (error instanceof ChatHttpError)
            return reply.code(error.status).send({ message: error.message });
          if (error instanceof AccessDeniedError)
            return reply.code(403).send({ message: "Acesso não autorizado." });
          return reply
            .code(503)
            .send({ message: "Não foi possível salvar ou recuperar o rascunho. Tente novamente." });
        }
      }
    });
  }
}
