import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import { chatIdPattern, type ChatRepository } from "../chats/chat-repository.js";
import { ChatHttpError } from "../chats/chat-routes.js";
import { DocumentDraftError } from "./document-drafts.js";
import type { createFinancialReportService } from "./financial-report.js";
export function registerFinancialReportRoutes(
  app: FastifyInstance,
  options: {
    service: ReturnType<typeof createFinancialReportService>;
    chats: ChatRepository;
    resolve: (
      request: FastifyRequest,
      condominiumId: string
    ) => Promise<AuthorizedCondominiumContext>;
  }
) {
  for (const action of ["available", "read", "prepare"] as const)
    app.route<{
      Params: { condominiumId: string; chatId: string; reportId?: string };
      Querystring: { versions?: string; cursor?: string };
      Body: unknown;
    }>({
      method: action === "prepare" ? "POST" : "GET",
      url: `/v1/condominiums/:condominiumId/chats/:chatId/financial-reports${action === "available" ? "" : "/:reportId"}`,
      bodyLimit: 5000,
      async handler(request, reply) {
        reply
          .header("cache-control", "private, no-store")
          .header("x-content-type-options", "nosniff");
        try {
          const { condominiumId, chatId, reportId } = request.params,
            context = await options.resolve(request, condominiumId);
          if (
            !context.permissions.includes("document:read") ||
            !context.permissions.includes("document:upload")
          )
            throw new AccessDeniedError();
          if (
            !chatIdPattern.test(chatId) ||
            (action !== "available" && (!reportId || !chatIdPattern.test(reportId))) ||
            !(await options.chats.find(context, chatId))
          )
            throw new DocumentDraftError(404, "Conversa ou relatório indisponível.");
          const scope = {
            kind: "chat" as const,
            userId: context.userId,
            condominiumId: context.condominiumId,
            chatId
          };
          const result =
            action === "available"
              ? await options.service.available(
                  context,
                  scope,
                  request.query.versions?.split(",") ?? [],
                  request.query.cursor
                )
              : action === "read"
                ? await options.service.read(context, scope, reportId!)
                : await options.service.prepare(context, scope, reportId!, request.body);
          const current = await options.resolve(request, condominiumId);
          if (
            current.userId !== context.userId ||
            !current.permissions.includes("document:upload") ||
            !(await options.chats.find(current, chatId))
          )
            throw new AccessDeniedError();
          if (action !== "available") await options.service.reference(current, scope, reportId!);
          return result;
        } catch (error) {
          const status =
            error instanceof AccessDeniedError
              ? 403
              : error instanceof ChatHttpError
                ? error.status
                : error instanceof DocumentDraftError
                  ? error.statusCode
                  : error &&
                      typeof error === "object" &&
                      "statusCode" in error &&
                      typeof error.statusCode === "number"
                    ? error.statusCode
                    : 503;
          return reply.code(status).send({
            message:
              error instanceof DocumentDraftError
                ? error.message
                : "Não foi possível concluir o relatório financeiro com segurança."
          });
        }
      }
    });
}
