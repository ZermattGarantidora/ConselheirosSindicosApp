import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { registerDocumentDraftRoutes } from "../../apps/api/authoring/document-draft-routes.js";
import { AccessDeniedError } from "../../apps/api/identity/authorized-condominium-context.js";
import { managerContext } from "./answer-fixtures.js";
it.each(["read", "list", "pdf"])(
  "AC-7303: %s revalida sessão após recuperar conteúdo e nega acesso revogado",
  async (action) => {
    const app = Fastify(),
      store = createInMemoryConversationStore(),
      chats = createInMemoryChatRepository(),
      chatId = randomUUID(),
      id = randomUUID();
    await chats.create(managerContext, { id: chatId, title: "FICTÍCIO" });
    const scope = {
      kind: "chat" as const,
      userId: managerContext.userId,
      condominiumId: managerContext.condominiumId,
      chatId
    };
    const service = createDocumentDraftService({
      store,
      catalog: { listAuthorized: async () => [] },
      now: () => new Date()
    });
    const draft = await service.propose(
      managerContext,
      scope,
      id,
      {
        title: "Rascunho sintético",
        documentKind: "Comunicado",
        operation: "create",
        text: "FICTÍCIO. Conteúdo privado sintético.",
        sources: [],
        changes: "",
        pending: ""
      },
      0
    );
    await service.decide(managerContext, scope, id, 1, draft.hash, true, true);
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(managerContext)
      .mockRejectedValue(new AccessDeniedError());
    registerDocumentDraftRoutes(app, { service, store, chats, resolve });
    try {
      const path =
        `/v1/condominiums/alameda/chats/${chatId}/document-drafts` +
        (action === "list" ? "" : `/${id}${action === "pdf" ? `/pdf?hash=${draft.hash}` : ""}`);
      const result = await app.inject({ method: "GET", url: path });
      expect(result.statusCode).toBe(403);
      expect(result.body).not.toContain("Conteúdo privado");
      expect(resolve).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  }
);
