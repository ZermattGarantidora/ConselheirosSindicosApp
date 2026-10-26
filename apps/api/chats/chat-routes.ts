import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import {
  chatIdPattern,
  legacyChatId,
  parseHistoryCursor,
  type ChatRepository
} from "./chat-repository.js";

export class ChatHttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type Request = FastifyRequest<{
  Params: { condominiumId: string; chatId?: string };
  Querystring: { before?: string };
  Body: unknown;
}>;

function body(value: unknown, create: boolean): { id?: string; title: string } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    value.title.trim().length === 0 ||
    value.title.trim().length > 120 ||
    /[\p{Cc}]/u.test(value.title)
  )
    throw new ChatHttpError(400, "O nome da conversa deve ter entre 1 e 120 caracteres.");
  if (!create) return { title: value.title.trim() };
  if (
    !("id" in value) ||
    typeof value.id !== "string" ||
    !chatIdPattern.test(value.id) ||
    value.id === legacyChatId
  )
    throw new ChatHttpError(400, "O identificador da conversa é inválido.");
  return { id: value.id, title: value.title.trim() };
}

export function registerChatRoutes(
  app: FastifyInstance,
  input: Readonly<{
    repository: ChatRepository;
    resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
    hasLegacy(context: AuthorizedCondominiumContext): Promise<boolean>;
  }>
): void {
  for (const method of ["GET", "POST", "PATCH", "DELETE"] as const) {
    app.route<{
      Params: { condominiumId: string; chatId?: string };
      Querystring: { before?: string };
      Body: unknown;
    }>({
      method,
      url: `/v1/condominiums/:condominiumId/chats${method === "PATCH" || method === "DELETE" ? "/:chatId" : ""}`,
      async handler(request: Request, reply) {
        try {
          const context = await input.resolve(request, request.params.condominiumId);
          if (!context.permissions.includes("document:read")) throw new AccessDeniedError();
          if (method === "GET") {
            let before;
            try {
              before = parseHistoryCursor(request.query.before);
            } catch {
              throw new ChatHttpError(400, "O cursor das conversas é inválido.");
            }
            if (before === undefined && (await input.hasLegacy(context)))
              await input.repository.create(context, {
                id: legacyChatId,
                title: "Histórico anterior"
              });
            const chats = await input.repository.list(context, before);
            const last = chats.at(-1);
            return reply.header("cache-control", "private, no-store").send({
              chats,
              nextCursor:
                chats.length === 100 && last !== undefined ? `${last.createdAt}|${last.id}` : null
            });
          }
          if (method === "POST") {
            const parsed = body(request.body, true);
            const chat = await input.repository.create(context, {
              id: parsed.id!,
              title: parsed.title
            });
            if (chat === undefined) throw new ChatHttpError(404, "Conversa indisponível.");
            return reply.code(201).send(chat);
          }
          const chatId = request.params.chatId!;
          if (!chatIdPattern.test(chatId))
            throw new ChatHttpError(400, "O identificador da conversa é inválido.");
          const changed =
            method === "PATCH"
              ? await input.repository.rename(context, chatId, body(request.body, false).title)
              : await input.repository.hide(context, chatId);
          if (!changed) throw new ChatHttpError(404, "Conversa indisponível.");
          return reply.code(204).send();
        } catch (error) {
          if (error instanceof ChatHttpError)
            return reply.code(error.status).send({ message: error.message });
          if (error instanceof AccessDeniedError)
            return reply.code(403).send({ message: "Acesso não autorizado." });
          return reply
            .code(500)
            .send({ message: "Não foi possível salvar ou carregar as conversas." });
        }
      }
    });
  }
}
