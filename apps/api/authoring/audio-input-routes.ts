import type { FastifyInstance, FastifyRequest } from "fastify";
import { ConversationStoreError } from "../answers/conversation-store.js";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import { chatIdPattern } from "../chats/chat-repository.js";
import { ChatHttpError } from "../chats/chat-routes.js";
import { DocumentDraftError } from "./document-drafts.js";
import type { createAudioInputService } from "./audio-inputs.js";
import { audioLimits } from "./audio-transcription.js";
export function registerAudioInputRoutes(
  app: FastifyInstance,
  input: {
    service: ReturnType<typeof createAudioInputService>;
    minutesEnabled: boolean;
    resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
  }
) {
  app.addContentTypeParser("audio/wav", { parseAs: "buffer" }, (_request, body, done) =>
    done(null, body)
  );
  for (const action of ["capabilities", "receive", "read", "purge", "export"] as const)
    app.route<{
      Params: { condominiumId: string; chatId: string; inputId?: string };
      Querystring: { mode?: string; title?: string; before?: string };
      Body: unknown;
    }>({
      method: action === "receive" ? "POST" : action === "purge" ? "DELETE" : "GET",
      url: `/v1/condominiums/:condominiumId/chats/:chatId/audio-inputs${action === "capabilities" ? "" : `/:inputId${action === "export" ? "/export" : ""}`}`,
      async handler(request, reply) {
        reply
          .header("cache-control", "private, no-store")
          .header("x-content-type-options", "nosniff");
        try {
          const { condominiumId, chatId, inputId } = request.params;
          if (!chatIdPattern.test(chatId) || (inputId && !chatIdPattern.test(inputId)))
            throw new DocumentDraftError(400, "Identificador inválido.");
          const context = await input.resolve(request, condominiumId);
          if (
            !context.permissions.includes("document:upload") ||
            !context.permissions.includes("document:read")
          )
            throw new AccessDeniedError();
          const scope = {
            kind: "chat" as const,
            userId: context.userId,
            condominiumId: context.condominiumId,
            chatId
          };
          if (action === "purge" || action === "export") {
            const result =
              action === "purge"
                ? await input.service.purge(context, scope, inputId!)
                : await input.service.export(context, scope, inputId!);
            const current = await input.resolve(request, condominiumId);
            if (
              current.userId !== context.userId ||
              !current.permissions.includes("document:read") ||
              !current.permissions.includes("document:upload")
            )
              throw new AccessDeniedError();
            if (action === "export") await input.service.read(current, scope, inputId!);
            return action === "purge" ? { deleted: true } : { data: result };
          }
          if (action === "capabilities") {
            const capabilities = await input.service.capabilities(context, scope);
            const current = await input.resolve(request, condominiumId);
            if (current.userId !== context.userId) throw new AccessDeniedError();
            return {
              ...capabilities,
              minutesEnabled: input.minutesEnabled,
              ...(await input.service.recent(current, scope, request.query.before)),
              mediaTypes: ["audio/wav"],
              limits: audioLimits,
              limitation: "Transcrição automática revisável; não é ata nem comprova deliberação."
            };
          }
          let result;
          if (action === "read") result = await input.service.read(context, scope, inputId!);
          else {
            if (
              (request.query.mode !== "dictation" && request.query.mode !== "meeting") ||
              typeof request.query.title !== "string" ||
              !Buffer.isBuffer(request.body) ||
              request.headers["content-type"]?.split(";")[0] !== "audio/wav"
            )
              throw new DocumentDraftError(400, "Informe áudio WAV, nome e modo de gravação.");
            let audioRequest: string | undefined;
            if (request.headers["x-audio-request"] !== undefined) {
              try {
                if (typeof request.headers["x-audio-request"] !== "string") throw new Error();
                audioRequest = decodeURIComponent(request.headers["x-audio-request"]);
              } catch {
                throw new DocumentDraftError(400, "Pedido de ata inválido.");
              }
            }
            result = await input.service.receive(
              context,
              scope,
              inputId!,
              request.query.title,
              request.query.mode,
              request.body,
              audioRequest
            );
          }
          const current = await input.resolve(request, condominiumId);
          if (current.userId !== context.userId || !current.permissions.includes("document:upload"))
            throw new AccessDeniedError();
          result = await input.service.read(current, scope, inputId!);
          return { input: result };
        } catch (error) {
          if (error instanceof DocumentDraftError || error instanceof ConversationStoreError)
            return reply.code(error.statusCode).send({ message: error.message });
          if (error instanceof ChatHttpError)
            return reply.code(error.status).send({ message: error.message });
          if (error instanceof AccessDeniedError)
            return reply.code(403).send({ message: "Acesso não autorizado." });
          return reply.code(503).send({
            message:
              "Transcrição indisponível. Nenhuma ata foi gerada. Verifique a tentativa antes de repetir."
          });
        }
      }
    });
}
