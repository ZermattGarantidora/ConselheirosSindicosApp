import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { chatIdPattern, legacyChatId, type ChatRepository } from "../chats/chat-repository.js";
import type {
  AuthorizedCondominiumContext,
  UserId
} from "../identity/authorized-condominium-context.js";
import type { AnswerPayload } from "../answers/answer-contract.js";
import type { DocumentSourceReader } from "../documents/document-source.js";
import {
  ConversationStoreError,
  conversationHash,
  type ConversationScope,
  type ConversationStore,
  type ConversationMessage
} from "../answers/conversation-store.js";
import { journalReplayProof } from "./journal-replay-proof.js";

type JournalOptions = Readonly<{
  store: ConversationStore;
  chats: ChatRepository;
  user(request: FastifyRequest): UserId | undefined;
  resolve(request: FastifyRequest, condominiumId: string): Promise<AuthorizedCondominiumContext>;
  now(): Date;
  sources?: DocumentSourceReader | undefined;
  captureReplay?: (
    request: FastifyRequest,
    scope: ConversationScope,
    response: Readonly<Record<string, unknown>>,
    kind: ConversationMessage["kind"] | "setup_creation"
  ) => Promise<void>;
  validateReplay?: (
    request: FastifyRequest,
    scope: ConversationScope,
    metadata: Readonly<Record<string, unknown>>,
    response: Readonly<Record<string, unknown>>
  ) => Promise<boolean>;
}>;
type State = {
  scope: ConversationScope;
  requestKey: string;
  inputHash: string;
  createdAt: string;
  cached: boolean;
};
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const header = (request: FastifyRequest, key: string) =>
  typeof request.headers[key] === "string" ? (request.headers[key] as string) : undefined;

export function registerConversationJournal(app: FastifyInstance, options: JournalOptions): void {
  const states = new WeakMap<FastifyRequest, State>();
  const routeKind = (
    request: FastifyRequest
  ): ConversationMessage["kind"] | "setup_creation" | undefined => {
    if (request.method !== "POST") return undefined;
    const route = request.routeOptions.url ?? "";
    if (route === "/v1/condominiums" || route === "/v1/development/test-condominiums")
      return "setup_creation";
    if (route === "/v1/chat/setup-message" || route === "/v1/chat/setup-turn") return "setup";
    if (route.endsWith("/questions")) return "question_answer";
    if (route.endsWith("/confirm-condominium") && typeof object(request.body).message === "string")
      return "document_status";
    if (route.endsWith("/documents/conversation")) return "document_summary";
    if (route.endsWith("/conversation") && route.includes("/documents/")) return "document_status";
    if (route.endsWith("/documents")) return "upload";
    return undefined;
  };
  async function getScope(
    request: FastifyRequest,
    kind: ConversationMessage["kind"] | "setup_creation"
  ): Promise<ConversationScope | undefined> {
    const userId = options.user(request);
    if (!userId) return undefined;
    const params = object(request.params),
      body = object(request.body);
    const condominiumId =
      typeof params.condominiumId === "string"
        ? params.condominiumId
        : header(request, "x-conversation-condominium-id");
    if ((kind === "setup" || kind === "setup_creation") && condominiumId === undefined) {
      const session =
        header(request, "x-setup-session-id") ?? (await options.store.beginSetup(userId));
      if (!chatIdPattern.test(session)) throw new ConversationStoreError(400);
      return { kind: "setup", userId, setupSessionId: session };
    }
    if (condominiumId === undefined) return undefined;
    const context = await options.resolve(request, condominiumId);
    if (!context.permissions.includes("document:read")) throw new ConversationStoreError(404);
    const chatId =
      (kind === "question_answer" && typeof body.chatId === "string" ? body.chatId : undefined) ??
      header(request, "x-chat-id") ??
      header(request, "x-conversation-chat-id") ??
      legacyChatId;
    if (chatId !== legacyChatId && !chatIdPattern.test(chatId))
      throw new ConversationStoreError(400);
    if (chatId === legacyChatId)
      await options.chats.create(context, { id: chatId, title: "Histórico anterior" });
    if (!(await options.chats.find(context, chatId))) throw new ConversationStoreError(404);
    return { kind: "chat", userId, condominiumId: context.condominiumId, chatId };
  }
  const fail = (error: unknown) => ({
    status: error instanceof ConversationStoreError ? error.statusCode : 503,
    message:
      error instanceof ConversationStoreError && [401, 403, 404].includes(error.statusCode)
        ? "Conversa indisponível ou acesso não autorizado."
        : error instanceof ConversationStoreError && [400, 409].includes(error.statusCode)
          ? error.message
          : "Não foi possível salvar ou recuperar a conversa com segurança. Tente novamente."
  });
  app.addHook("preHandler", async (request, reply) => {
    const kind = routeKind(request);
    if (!kind || !options.user(request)) return;
    try {
      const scope = await getScope(request, kind);
      if (!scope) return;
      let requestKey = header(request, "x-conversation-request-id") ?? randomUUID();
      if (kind === "setup_creation" && scope.kind === "setup") {
        const setup = await options.store.list(scope, 12);
        if (
          setup.entries.some(
            (entry) => object(object(entry.metadata.setup).update).field === "unit_count"
          )
        ) {
          // Uma sessão de cadastro é associada após cada criação; a chave sobrevive à perda do ACK.
          requestKey = `setup-creation:${scope.setupSessionId}`;
          request.headers["x-conversation-request-id"] = requestKey;
        }
      }
      if (requestKey.length < 1 || requestKey.length > 200) throw new ConversationStoreError(400);
      const originalBody = object(request.body);
      const requestData = Buffer.isBuffer(request.body)
        ? createHash("sha256").update(request.body).digest("hex")
        : request.routeOptions.url === "/v1/chat/setup-turn"
          ? Object.fromEntries(Object.entries(originalBody).filter(([key]) => key !== "history"))
          : request.body;
      const inputHash = conversationHash([
        request.routeOptions.url,
        request.params,
        requestData,
        kind === "upload"
          ? [
              "x-document-title",
              "x-document-type",
              "x-document-id",
              "x-document-validity-confirmed",
              "content-type"
            ].map((key) => request.headers[key] ?? null)
          : null
      ]);
      const state: State = {
        scope,
        requestKey,
        inputHash,
        createdAt: options.now().toISOString(),
        cached: false
      };
      states.set(request, state);
      if (kind !== "question_answer" || header(request, "x-conversation-request-id")) {
        const saved = await options.store.find(scope, requestKey);
        if (saved) {
          if (saved.inputHash !== inputHash)
            throw new ConversationStoreError(409, "A chave já foi usada para outra mensagem.");
          if (
            options.validateReplay &&
            !(await options.validateReplay(request, scope, saved.metadata, saved.response))
          )
            throw new ConversationStoreError(403);
          state.cached = true;
          reply.header("x-conversation-entry-id", saved.id);
          if (scope.kind === "setup") reply.header("x-setup-session-id", scope.setupSessionId);
          return reply.code(Number(saved.metadata.httpStatus ?? 200)).send(saved.response);
        }
      }
      if (request.routeOptions.url === "/v1/chat/setup-turn") {
        const body = object(request.body);
        const previous = await options.store.list(scope, 12);
        // Autoria da assistente sempre do servidor, nunca do campo history enviado pelo cliente.
        request.body = {
          ...body,
          history: previous.entries
            .flatMap((entry) =>
              entry.messages.map((message) => ({ role: message.role, text: message.text }))
            )
            .slice(-12)
        };
      }
    } catch (error) {
      const failure = fail(error);
      return reply.code(failure.status).send({ message: failure.message });
    }
  });
  app.addHook("onSend", async (request, reply, payload) => {
    const state = states.get(request),
      kind = routeKind(request);
    if (!state || !kind || state.cached || reply.statusCode >= 400 || typeof payload !== "string")
      return payload;
    try {
      const body = object(JSON.parse(payload)),
        input = object(request.body);
      const messages: ConversationMessage[] = [];
      const id = randomUUID();
      let key = state.requestKey,
        inputHash = state.inputHash;
      if (
        kind === "question_answer" &&
        typeof body.answerId === "string" &&
        typeof body.answer === "string"
      ) {
        key = header(request, "x-conversation-request-id")
          ? state.requestKey
          : `answer:${body.answerId}`;
        inputHash = header(request, "x-conversation-request-id")
          ? state.inputHash
          : conversationHash([input.question, body.answerId]);
        messages.push(
          { id: String(body.questionId), role: "user", kind, text: String(input.question) },
          {
            id: body.answerId,
            role: "assistant",
            kind,
            text: body.answer,
            answer: body as unknown as AnswerPayload
          }
        );
      } else if (kind === "setup" || kind === "document_status") {
        if (request.routeOptions.url?.endsWith("/confirm-condominium")) {
          if (body.confirmed !== true || typeof input.message !== "string") return payload;
          messages.push({ id: `${id}:user`, role: "user", kind, text: input.message });
        } else {
          if (typeof body.message !== "string" || body.message.trim() === "") return payload;
          if (typeof input.message === "string")
            messages.push({ id: `${id}:user`, role: "user", kind, text: input.message });
          messages.push({ id: `${id}:assistant`, role: "assistant", kind, text: body.message });
        }
      } else if (kind === "document_summary") {
        const summary = object(body.summary);
        if (typeof summary.answer !== "string") return payload;
        if (typeof input.message === "string")
          messages.push({ id: `${id}:user`, role: "user", kind, text: input.message });
        messages.push({
          id: `${id}:assistant`,
          role: "assistant",
          kind,
          text: summary.answer,
          answer: summary as unknown as AnswerPayload
        });
      } else if (kind === "upload" && typeof body.documentVersionId === "string") {
        const title = header(request, "x-document-title");
        messages.push({
          id: `${id}:user`,
          role: "user",
          kind,
          text: title ? decodeURIComponent(title) : "Arquivo enviado"
        });
      }
      if (!messages.length && kind !== "setup_creation") return payload;
      // Revalidar o vínculo antes de gravar e confirmar, inclusive depois da inferência.
      if (state.scope.kind === "chat") {
        const current = await options.resolve(request, state.scope.condominiumId);
        if (
          !current.permissions.includes("document:read") ||
          !(await options.chats.find(current, state.scope.chatId))
        )
          throw new ConversationStoreError(404);
      }
      const existing =
        kind === "question_answer" ? await options.store.find(state.scope, key) : undefined;
      await options.captureReplay?.(request, state.scope, body, kind);
      if (
        existing &&
        header(request, "x-conversation-request-id") &&
        existing.inputHash !== inputHash
      )
        throw new ConversationStoreError(409, "A chave já foi usada para outra mensagem.");
      const saved =
        existing ??
        (await options.store.append(state.scope, {
          id,
          requestKey: key,
          inputHash,
          createdAt: state.createdAt,
          messages,
          response: body,
          metadata: {
            ...(journalReplayProof(request) === undefined
              ? {}
              : { replayProof: journalReplayProof(request) }),
            httpStatus: reply.statusCode,
            source: "server",
            kind,
            ...(kind === "setup_creation" ? { createdContext: body } : {}),
            ...(kind === "setup"
              ? {
                  setup: {
                    stage: input.stage,
                    managerName: input.managerName,
                    condominiumName: input.condominiumName,
                    condominiumCount: input.condominiumCount,
                    condominiumIndex: input.condominiumIndex,
                    hasExistingContext: input.hasExistingContext,
                    update: body.update
                  }
                }
              : {}),
            ...(typeof object(request.params).documentVersionId === "string"
              ? { documentVersionId: object(request.params).documentVersionId }
              : kind === "upload" && typeof body.documentVersionId === "string"
                ? { documentVersionId: body.documentVersionId }
                : {})
          }
        }));
      reply.header("x-conversation-entry-id", saved.id);
      if (state.scope.kind === "setup")
        reply.header("x-setup-session-id", state.scope.setupSessionId);
      return kind === "question_answer" && !header(request, "x-conversation-request-id")
        ? payload
        : JSON.stringify(saved.response);
    } catch (error) {
      const failure = fail(error);
      reply.code(failure.status);
      return JSON.stringify({ message: failure.message });
    }
  });

  app.get<{ Querystring: { before?: string; limit?: string } }>(
    "/v1/chat/setup-history",
    async (request, reply) => {
      const userId = options.user(request);
      if (!userId) return reply.code(401).send({ message: "Sessão não autenticada." });
      try {
        const session = await options.store.pendingSetup(userId);
        const page = session
          ? await options.store.list(
              { kind: "setup", userId, setupSessionId: session },
              Number(request.query.limit ?? 50),
              request.query.before
            )
          : { entries: [], nextCursor: null };
        return reply.header("cache-control", "private, no-store").send({
          ...publicPage(page),
          setupSessionId: session ?? null,
          durable: options.store.durable
        });
      } catch (error) {
        const failure = fail(error);
        return reply.code(failure.status).send({ message: failure.message });
      }
    }
  );
  app.get<{
    Params: { condominiumId: string; chatId: string };
    Querystring: { before?: string; limit?: string };
  }>("/v1/condominiums/:condominiumId/chats/:chatId/messages", async (request, reply) => {
    try {
      const context = await options.resolve(request, request.params.condominiumId);
      if (
        !context.permissions.includes("document:read") ||
        !(await options.chats.find(context, request.params.chatId))
      )
        throw new ConversationStoreError(404);
      const page = await options.store.list(
        {
          kind: "chat",
          userId: context.userId,
          condominiumId: context.condominiumId,
          chatId: request.params.chatId
        },
        Number(request.query.limit ?? 50),
        request.query.before
      );
      const currentSources = new Map<
        string,
        ReturnType<DocumentSourceReader["getAuthorizedPage"]>
      >();
      const messagesPage = {
        ...page,
        entries: await Promise.all(
          page.entries.map(async (entry) => ({
            ...entry,
            messages: await Promise.all(
              entry.messages.map(async (message) => {
                if (!message.answer) return message;
                const citations = await Promise.all(
                  message.answer.citations.map(async (citation) => {
                    const key = JSON.stringify([
                      citation.documentId,
                      citation.documentVersionId,
                      citation.page
                    ]);
                    if (!currentSources.has(key))
                      currentSources.set(
                        key,
                        options.sources?.getAuthorizedPage(context, citation) ??
                          Promise.resolve(undefined)
                      );
                    const source = await currentSources.get(key);
                    return {
                      ...citation,
                      sourceRemoved:
                        citation.sourceRemoved === true ||
                        !source ||
                        !source.content.includes(citation.excerpt)
                    };
                  })
                );
                return { ...message, answer: { ...message.answer, citations } };
              })
            )
          }))
        )
      };
      return reply
        .header("cache-control", "private, no-store")
        .send({ ...publicPage(messagesPage), durable: options.store.durable });
    } catch (error) {
      const failure = fail(error);
      return reply.code(failure.status).send({ message: failure.message });
    }
  });
  app.post<{
    Params: { condominiumId: string; chatId: string };
    Body: { setupSessionId?: string };
  }>("/v1/condominiums/:condominiumId/chats/:chatId/setup-history", async (request, reply) => {
    try {
      const context = await options.resolve(request, request.params.condominiumId);
      if (
        !context.permissions.includes("document:read") ||
        !chatIdPattern.test(request.params.chatId)
      )
        throw new ConversationStoreError(404);
      const session =
        request.body?.setupSessionId ?? (await options.store.pendingSetup(context.userId));
      if (session) {
        await options.chats.create(context, {
          id: request.params.chatId,
          title: "Conversa inicial"
        });
        await options.store.bindSetup(context.userId, session, {
          kind: "chat",
          userId: context.userId,
          condominiumId: context.condominiumId,
          chatId: request.params.chatId
        });
      }
      return reply.code(204).send();
    } catch (error) {
      const failure = fail(error);
      return reply.code(failure.status).send({ message: failure.message });
    }
  });
}

function publicPage(page: Awaited<ReturnType<ConversationStore["list"]>>) {
  return {
    entries: page.entries.map(({ id, sequence, createdAt, messages, metadata }) => ({
      id,
      sequence,
      createdAt,
      messages: metadata.internalAuthoring === true ? [] : messages,
      metadata: {
        setup: metadata.setup,
        createdContext: metadata.createdContext,
        documentVersionId: metadata.documentVersionId
      }
    })),
    nextCursor: page.nextCursor
  };
}
