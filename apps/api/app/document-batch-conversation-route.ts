import type { FastifyInstance, FastifyRequest } from "fastify";
import { isDocumentUploadNotice } from "../../shared/conversation-intent.js";
import {
  summarizeDocumentBatch,
  DocumentBatchSummaryLimitError,
  DocumentBatchSynthesisError
} from "../answers/document-batch-conversation.js";
import type { AnswerGateway } from "../answers/answer-gateway.js";
import { AnswerGatewayUnavailableError } from "../answers/answer-gateway.js";
import { InvalidAnswerValidationError } from "../answers/citation-validator.js";
import type {
  DocumentAnalysisReader,
  AnalysisDocument
} from "../analysis/document-analysis-reader.js";
import {
  listRegisteredDocuments,
  type DocumentCatalogRepository
} from "../documents/document-catalog.js";
import { financialCatalogRevision } from "../analysis/document-snapshot.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { HostedDocumentBatchGatewayFactory } from "../answers/hosted-document-batch-gateway.js";
import { chatIdPattern, legacyChatId } from "../chats/chat-repository.js";
import { addJournalReplayProof } from "./journal-replay-proof.js";
import { conversationHash } from "../answers/conversation-store.js";
import { DocumentDraftError } from "../authoring/document-drafts.js";

export function registerDocumentBatchConversationRoute(
  app: FastifyInstance,
  options: Readonly<{
    resolve: (
      request: FastifyRequest,
      condominiumId: string
    ) => Promise<AuthorizedCondominiumContext | undefined>;
    catalog: DocumentCatalogRepository;
    reader: DocumentAnalysisReader | undefined;
    codexGateway: AnswerGateway | undefined;
    hostedGateway?: HostedDocumentBatchGatewayFactory;
    consume: (context: AuthorizedCondominiumContext) => void;
    improveOriginal?: (
      context: AuthorizedCondominiumContext,
      chatId: string,
      versions: readonly string[],
      documents: readonly AnalysisDocument[]
    ) => Promise<{ status: string; proposalId?: string }>;
  }>
) {
  app.post<{ Params: { condominiumId: string }; Body: unknown }>(
    "/v1/condominiums/:condominiumId/documents/conversation",
    async (request, reply) => {
      reply.header("cache-control", "private, no-store");
      let stage = "authorization";
      const reportFailure = (code: string, diagnosticCode?: string) =>
        console.error("A síntese documental não foi concluída.", {
          code,
          stage,
          ...(diagnosticCode === undefined ? {} : { diagnosticCode })
        });
      try {
        const context = await options.resolve(request, request.params.condominiumId);
        if (context === undefined)
          return reply.code(401).send({ message: "Sessão não autenticada." });
        if (!context.permissions.includes("document:read"))
          return reply.code(403).send({ message: "Acesso não autorizado." });
        stage = "request_validation";
        const body = request.body as { documentVersionIds?: unknown; message?: unknown } | null;
        if (
          typeof body !== "object" ||
          body === null ||
          Object.keys(body).some((key) => key !== "documentVersionIds" && key !== "message") ||
          (body.message !== undefined &&
            (typeof body.message !== "string" || !isDocumentUploadNotice(body.message))) ||
          !Array.isArray(body.documentVersionIds) ||
          body.documentVersionIds.length === 0 ||
          body.documentVersionIds.length > 50 ||
          body.documentVersionIds.some(
            (id) => typeof id !== "string" || id.length === 0 || id.length > 200
          ) ||
          new Set(body.documentVersionIds).size !== body.documentVersionIds.length
        )
          return reply
            .code(400)
            .send({ message: "Informe um conjunto válido de versões documentais." });
        const ids = body.documentVersionIds as string[];
        stage = "catalog_load";
        const catalog = await listRegisteredDocuments(options.catalog, context);
        const selected = ids.map((id) => catalog.find((item) => item.documentVersionId === id));
        if (selected.some((item) => item === undefined))
          return reply
            .code(404)
            .send({ message: "Parte do conjunto está indisponível neste condomínio." });
        options.consume(context);
        stage = "document_reader_setup";
        if (options.reader === undefined)
          throw new DocumentBatchSynthesisError(
            "Leitor documental indisponível.",
            "document_reader_unavailable"
          );
        stage = "batch_gateway_setup";
        if (options.hostedGateway !== undefined && options.codexGateway !== undefined)
          throw new AnswerGatewayUnavailableError();
        const chatId =
          request.headers["x-chat-id"] ?? request.headers["x-conversation-chat-id"] ?? legacyChatId;
        if (typeof chatId !== "string" || (chatId !== legacyChatId && !chatIdPattern.test(chatId)))
          return reply.code(400).send({ message: "Informe uma conversa válida." });
        // Não há fallback: um gateway configurado que falha não troca de destino.
        const gateway = options.hostedGateway
          ? options.hostedGateway(context, chatId)
          : options.codexGateway;
        if (gateway === undefined) throw new AnswerGatewayUnavailableError();
        stage = "document_read";
        let documents;
        try {
          documents = await options.reader.readAuthorized(context, ids);
        } catch (error) {
          if (
            error instanceof DocumentBatchSummaryLimitError ||
            error instanceof InvalidAnswerValidationError ||
            (error instanceof Error &&
              [
                "AccessDeniedError",
                "DocumentCatalogForbiddenError",
                "TenantWorkLimitExceededError"
              ].includes(error.name))
          )
            throw error;
          throw new DocumentBatchSynthesisError(
            "Não foi possível ler os arquivos autorizados.",
            "document_read_failed"
          );
        }
        stage = "synthesis";
        const summary = await summarizeDocumentBatch(
          gateway,
          context,
          selected.filter((item) => item !== undefined),
          documents,
          { reader: options.reader, catalog }
        );
        stage = "authorization_revalidation";
        const refreshed = await options.resolve(request, request.params.condominiumId);
        if (
          refreshed === undefined ||
          !refreshed.permissions.includes("document:read") ||
          refreshed.membershipRevision !== context.membershipRevision
        )
          return reply.code(403).send({ message: "Acesso não autorizado." });
        stage = "catalog_revalidation";
        if (
          financialCatalogRevision(catalog) !==
          financialCatalogRevision(await listRegisteredDocuments(options.catalog, refreshed))
        )
          return reply.code(409).send({
            code: "document_catalog_changed",
            message: "Os documentos mudaram durante a análise. Refaça a consulta."
          });
        const hostedProof =
          "replayProof" in gateway && typeof gateway.replayProof === "function"
            ? gateway.replayProof()
            : undefined;
        addJournalReplayProof(request, {
          documents: {
            catalogRevision: financialCatalogRevision(catalog),
            contentRevision: conversationHash(documents),
            documentVersionIds: ids,
            ...(hostedProof === undefined ? {} : { hosted: hostedProof })
          }
        });
        let originalImprovement;
        if (options.improveOriginal) {
          try {
            originalImprovement = await options.improveOriginal(refreshed, chatId, ids, documents);
          } catch (error) {
            if (error instanceof Error && error.name === "AccessDeniedError") throw error;
            originalImprovement = {
              status: "blocked",
              message:
                error instanceof DocumentDraftError
                  ? `Avaliação de melhorias: ${error.message}`
                  : "A análise foi concluída, mas a avaliação de melhorias está indisponível. Nenhum rascunho ou arquivo foi criado. Retome a análise do mesmo original para recuperar a tentativa."
            };
          }
          const finalContext = await options.resolve(request, request.params.condominiumId);
          if (
            !finalContext ||
            finalContext.userId !== context.userId ||
            finalContext.membershipRevision !== context.membershipRevision ||
            !finalContext.permissions.includes("document:read")
          )
            return reply.code(403).send({ message: "Acesso não autorizado." });
          if (
            financialCatalogRevision(catalog) !==
              financialCatalogRevision(
                await listRegisteredDocuments(options.catalog, finalContext)
              ) ||
            conversationHash(documents) !==
              conversationHash(await options.reader.readAuthorized(finalContext, ids))
          )
            return reply.code(409).send({
              code: "document_catalog_changed",
              message: "Os documentos mudaram durante a análise. Refaça a consulta."
            });
        }
        return reply.send({ summary, ...(originalImprovement ? { originalImprovement } : {}) });
      } catch (error) {
        if (error instanceof DocumentBatchSummaryLimitError) {
          reportFailure("analysis_size_limit");
          return reply.code(413).send({
            code: "analysis_size_limit",
            message: "O material excede o limite desta análise."
          });
        }
        const name = error instanceof Error ? error.name : "";
        if (name === "AccessDeniedError" || name === "DocumentCatalogForbiddenError") {
          reportFailure("access_denied");
          return reply.code(403).send({ code: "access_denied", message: "Acesso não autorizado." });
        }
        if (name === "TenantWorkLimitExceededError") {
          reportFailure("tenant_work_limit");
          return reply.code(429).send({
            code: "tenant_work_limit",
            message: "Aguarde um instante antes de continuar."
          });
        }
        if (error instanceof InvalidAnswerValidationError) {
          reportFailure("answer_validation_failed", error.code);
          return reply.code(502).send({
            code: "answer_validation_failed",
            message: "A resposta não passou pela validação documental."
          });
        }
        if (error instanceof AnswerGatewayUnavailableError) {
          reportFailure("analysis_unavailable");
          return reply.code(503).send({
            code: "analysis_unavailable",
            message: "O serviço de análise está indisponível."
          });
        }
        if (error instanceof DocumentBatchSynthesisError) {
          const accessDenied = error.diagnosticCode === "authorization_denied";
          const code = accessDenied ? "access_denied" : "analysis_failed";
          reportFailure(code, error.diagnosticCode);
          return reply.code(accessDenied ? 403 : 503).send({
            code,
            message: accessDenied ? "Acesso não autorizado." : "A análise não foi concluída."
          });
        }
        reportFailure("analysis_failed");
        return reply.code(503).send({
          code: "analysis_failed",
          message: "A análise não foi concluída."
        });
      }
    }
  );
}
