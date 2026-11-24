import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { AccessDeniedError } from "../identity/authorized-condominium-context.js";
import { ConversationStoreError } from "../answers/conversation-store.js";
import { chatIdPattern } from "../chats/chat-repository.js";
import { ChatHttpError } from "../chats/chat-routes.js";
import { DocumentDraftError, type createDocumentDraftService } from "./document-drafts.js";
import type { createAudioMinutesService } from "./audio-minutes.js";
export function registerAudioMinutesRoutes(
  app: FastifyInstance,
  options: {
    service: ReturnType<typeof createAudioMinutesService>;
    drafts: ReturnType<typeof createDocumentDraftService>;
    durable: boolean;
    resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
  }
) {
  app.post<{
    Params: { condominiumId: string; chatId: string; inputId: string; draftId: string };
    Body: unknown;
  }>(
    "/v1/condominiums/:condominiumId/chats/:chatId/audio-inputs/:inputId/minutes/:draftId",
    { bodyLimit: 10_000 },
    async (request, reply) => {
      reply
        .header("cache-control", "private, no-store")
        .header("x-content-type-options", "nosniff");
      const controller = new AbortController();
      const disconnected = () => {
        if (!reply.raw.writableEnded) controller.abort();
      };
      reply.raw.once("close", disconnected);
      try {
        const { condominiumId, chatId, inputId, draftId } = request.params;
        if (![chatId, inputId, draftId].every((id) => chatIdPattern.test(id)))
          throw new DocumentDraftError(400, "Identificador inválido.");
        const context = await options.resolve(request, condominiumId);
        const scope = {
          kind: "chat" as const,
          userId: context.userId,
          condominiumId: context.condominiumId,
          chatId
        };
        const body = request.body as { request?: unknown } | null;
        if (!body || typeof body !== "object")
          throw new DocumentDraftError(400, "Pedido de ata obrigatório.");
        await options.service.prepare(
          context,
          scope,
          inputId,
          draftId,
          body.request,
          controller.signal
        );
        const current = await options.resolve(request, condominiumId);
        if (current.userId !== context.userId) throw new AccessDeniedError();
        return {
          draft: await options.drafts.read(current, scope, draftId),
          durable: options.durable
        };
      } catch (error) {
        if (error instanceof DocumentDraftError || error instanceof ConversationStoreError)
          return reply.code(error.statusCode).send({ message: error.message });
        if (error instanceof ChatHttpError)
          return reply.code(error.status).send({ message: error.message });
        if (error instanceof AccessDeniedError)
          return reply.code(403).send({ message: "Acesso não autorizado." });
        return reply.code(503).send({
          message:
            "Não foi possível recuperar ou preparar a ata. A transcrição não foi repetida. Tente recuperar o mesmo pedido."
        });
      } finally {
        reply.raw.off("close", disconnected);
      }
    }
  );
}
