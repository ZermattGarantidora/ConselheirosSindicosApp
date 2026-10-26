import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import {
  createInMemoryChatRepository,
  legacyChatId
} from "../../apps/api/chats/chat-repository.js";
import {
  openChatSession,
  saveChat,
  loadSavedChat,
  changeSavedChat
} from "../../apps/web/chat-session.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";

function fixture() {
  const revoked = new Set<string>();
  const repository = createInMemoryChatRepository();
  const persistence = createInMemoryAnswerPersistence();
  const documents = createDevelopmentDocumentUploadRepository();
  const useCase = createAnswerUseCase({
    persistence,
    gateway: createLocalSyntheticAnswerGateway(),
    retriever: createScopedTextRetriever(createInMemoryScopedRetrievalIndex([])),
    now: () => new Date("2026-10-20T15:00:00.000Z")
  });
  const app = createApi({
    chatRepository: repository,
    membershipRepository: {
      async findMembership(input) {
        return ["gestor-a", "gestor-b"].includes(input.userId) &&
          ["alameda", "bosque"].includes(input.condominiumId) &&
          !revoked.has(input.userId)
          ? {
              ...input,
              roleKey: "manager",
              status: "active",
              validFrom: new Date("2020-01-01"),
              revision: "v1"
            }
          : undefined;
      }
    },
    documentUploadRepository: documents,
    documentCatalogRepository: documents,
    documentStorage: {
      async storeOriginal() {
        return { storageKey: "synthetic" };
      },
      async removeOriginal() {}
    },
    answerUseCase: useCase
  });
  const request: typeof fetch = async (url, init) => {
    const response = await app.inject({
      method: (init?.method ?? "GET") as "GET" | "POST" | "PATCH" | "DELETE",
      url: String(url),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      ...(init?.body === undefined ? {} : { payload: String(init.body) })
    });
    return new Response(response.statusCode === 204 ? null : response.body, {
      status: response.statusCode
    });
  };
  const scope = { condominiumId: "alameda", headers: { "x-development-user-id": "gestor-a" } };
  async function ask(chatId: string | undefined, question: string, idempotencyKey?: string) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers: {
        ...scope.headers,
        ...(idempotencyKey === undefined ? {} : { "idempotency-key": idempotencyKey })
      },
      payload: { question, ...(chatId === undefined ? {} : { chatId }) }
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  }
  return { app, request, scope, ask, persistence, revoked, useCase, repository };
}

describe("novo chat a cada reentrada — Spec 038", () => {
  it("AC-3804: lista e histórico com mais de 100 itens e datas iguais não perdem nem repetem registros", async () => {
    const f = fixture();
    try {
      const context = {
        condominiumId: createCondominiumId("alameda"),
        userId: createUserId("gestor-a"),
        roleKey: "manager" as const,
        membershipRevision: "v1",
        permissions: ["document:read" as const]
      };
      const id = randomUUID();
      await saveChat(f.request, f.scope, { id, title: "Histórico longo" });
      for (let index = 0; index < 105; index += 1) {
        await f.repository.create(context, { id: randomUUID(), title: `Conversa ${index}` });
        await f.useCase.ask(context, {
          chatId: id,
          question: "Bom dia",
          requestId: `pagination-${index}`
        });
      }
      expect((await openChatSession(f.request, f.scope)).chats).toHaveLength(107);
      const history = await loadSavedChat<{ questionId: string }>(f.request, f.scope, id);
      const ids = history.entries.map((entry) => entry.questionId);
      expect(ids).toHaveLength(105);
      expect(new Set(ids).size).toBe(105);
      expect(ids).toEqual([...ids].sort());
    } finally {
      await f.app.close();
    }
  });

  it("AC-3801/3802/3805: recarga abre novo chat e conserva último turno, títulos e abas distintas", async () => {
    const f = fixture();
    try {
      const first = await openChatSession(f.request, f.scope);
      expect(first.chats).toHaveLength(1);
      expect(first.chats[0]?.persisted).toBe(false);
      await saveChat(f.request, f.scope, { id: first.activeChatId, title: "Manutenção" });
      const answered = await f.ask(first.activeChatId, "Bom dia");
      const privateHistory = await f.app.inject({
        url: `/v1/condominiums/alameda/history?chatId=${first.activeChatId}`,
        headers: f.scope.headers
      });
      expect(privateHistory.headers["cache-control"]).toBe("private, no-store");
      // No unload/switch hook: the last response must already belong to its chat.
      const second = await openChatSession(f.request, f.scope);
      const third = await openChatSession(f.request, f.scope);
      expect(new Set([first.activeChatId, second.activeChatId, third.activeChatId]).size).toBe(3);
      expect(second.chats[0]).toMatchObject({ entries: [], persisted: false });
      expect(second.chats[1]).toMatchObject({
        id: first.activeChatId,
        title: "Manutenção",
        persisted: true
      });
      const old = await loadSavedChat<{ question: string; answer: { answerId: string } }>(
        f.request,
        f.scope,
        first.activeChatId
      );
      expect(old.entries).toEqual([
        expect.objectContaining({
          question: "Bom dia",
          answer: expect.objectContaining({ answerId: answered.answerId })
        })
      ]);
      await saveChat(f.request, f.scope, { id: second.activeChatId, title: "Assembleia" });
      await f.ask(second.activeChatId, "Obrigado");
      await changeSavedChat(f.request, f.scope, first.activeChatId, "Planejamento");
      const returned = await openChatSession(f.request, f.scope);
      expect(returned.chats.find((chat) => chat.id === first.activeChatId)?.title).toBe(
        "Planejamento"
      );
      expect(
        (
          await loadSavedChat<{ question: string }>(f.request, f.scope, second.activeChatId)
        ).entries.map((entry) => entry.question)
      ).toEqual(["Obrigado"]);
      await changeSavedChat(f.request, f.scope, first.activeChatId);
      expect(
        (await openChatSession(f.request, f.scope)).chats.some(
          (chat) => chat.id === first.activeChatId
        )
      ).toBe(false);
      expect(f.persistence.listInteractions()).toHaveLength(2);
      await expect(
        saveChat(f.request, f.scope, { id: first.activeChatId, title: "Reativar" })
      ).rejects.toThrow();
    } finally {
      await f.app.close();
    }
  });

  it("AC-3803: outro membro, tenant, chat oculto e associação revogada não acessam a conversa", async () => {
    const f = fixture();
    try {
      const id = randomUUID();
      await saveChat(f.request, f.scope, { id, title: "Conversa privada sintética" });
      await f.ask(id, "Bom dia");
      for (const scope of [
        { condominiumId: "alameda", headers: { "x-development-user-id": "gestor-b" } },
        { ...f.scope, condominiumId: "bosque" }
      ]) {
        expect((await openChatSession(f.request, scope)).chats).toHaveLength(1);
        await expect(loadSavedChat(f.request, scope, id)).rejects.toThrow();
        await expect(changeSavedChat(f.request, scope, id, "Invadir")).rejects.toThrow();
        await expect(changeSavedChat(f.request, scope, id)).rejects.toThrow();
        expect(
          (
            await f.app.inject({
              method: "POST",
              url: `/v1/condominiums/${scope.condominiumId}/questions`,
              headers: scope.headers,
              payload: { question: "Olá", chatId: id }
            })
          ).statusCode
        ).toBe(404);
      }
      f.revoked.add("gestor-a");
      expect(
        (
          await f.app.inject({
            url: `/v1/condominiums/alameda/history?chatId=${id}`,
            headers: f.scope.headers
          })
        ).statusCode
      ).toBe(403);
      await expect(openChatSession(f.request, f.scope)).rejects.toThrow();
    } finally {
      await f.app.close();
    }
  });

  it("AC-3804: mantém o legado separado, sem reaparecer após ocultar", async () => {
    const f = fixture();
    try {
      await f.ask(undefined, "Bom dia");
      const session = await openChatSession(f.request, f.scope);
      expect(session.activeChatId).not.toBe(legacyChatId);
      expect(session.chats.find((chat) => chat.id === legacyChatId)?.title).toBe(
        "Histórico anterior"
      );
      expect((await loadSavedChat(f.request, f.scope, legacyChatId)).entries).toHaveLength(1);
      await changeSavedChat(f.request, f.scope, legacyChatId);
      expect(
        (await openChatSession(f.request, f.scope)).chats.some((chat) => chat.id === legacyChatId)
      ).toBe(false);
    } finally {
      await f.app.close();
    }
  });

  it("AC-3805: anexo recebido mantém referência no chat e some quando removido do catálogo", async () => {
    const f = fixture();
    try {
      const id = randomUUID();
      await saveChat(f.request, f.scope, { id, title: "Documentos" });
      const uploaded = await f.app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/documents",
        headers: {
          ...f.scope.headers,
          "content-type": "application/pdf",
          "x-document-title": "Ata.pdf",
          "x-document-type": "other",
          "x-chat-id": id
        },
        payload: createSyntheticTextPdf()
      });
      expect(uploaded.statusCode).toBe(202);
      expect((await loadSavedChat(f.request, f.scope, id)).attachments).toEqual([
        expect.objectContaining({
          documentVersionId: uploaded.json().documentVersionId,
          title: "Ata.pdf"
        })
      ]);
      await f.app.inject({
        method: "DELETE",
        url: `/v1/condominiums/alameda/documents/${uploaded.json().documentId}`,
        headers: f.scope.headers
      });
      expect((await loadSavedChat(f.request, f.scope, id)).attachments).toEqual([]);
    } finally {
      await f.app.close();
    }
  });

  it("AC-3804: a chave de idempotência de uma aba não reutiliza resposta de outro chat", async () => {
    const f = fixture();
    try {
      const ids = [randomUUID(), randomUUID()];
      for (const id of ids) await saveChat(f.request, f.scope, { id, title: "Conversa" });
      const first = await f.ask(ids[0], "Bom dia", "mesma-chave");
      const second = await f.ask(ids[1], "Bom dia", "mesma-chave");
      expect(first.answerId).not.toBe(second.answerId);
      expect((await f.ask(ids[0], "Bom dia", "mesma-chave")).answerId).toBe(first.answerId);
    } finally {
      await f.app.close();
    }
  });

  it("nega entrada anônima, metadados e cursores inválidos sem criar chats", async () => {
    const f = fixture();
    try {
      expect((await f.app.inject({ url: "/v1/condominiums/alameda/chats" })).statusCode).toBe(401);
      for (const payload of [
        null,
        {},
        { id: "invalid", title: "Nome" },
        { id: randomUUID(), title: "" },
        { id: randomUUID(), title: "x".repeat(121) },
        { id: legacyChatId, title: "Nome" }
      ]) {
        expect(
          (
            await f.app.inject({
              method: "POST",
              url: "/v1/condominiums/alameda/chats",
              headers: { ...f.scope.headers, "content-type": "application/json" },
              payload: JSON.stringify(payload)
            })
          ).statusCode
        ).toBe(400);
      }
      expect(
        (
          await f.app.inject({
            url: "/v1/condominiums/alameda/chats?before=invalid",
            headers: f.scope.headers
          })
        ).statusCode
      ).toBe(400);
      expect(
        (
          await f.app.inject({
            url: "/v1/condominiums/alameda/history?before=invalid",
            headers: f.scope.headers
          })
        ).statusCode
      ).toBe(400);
      expect((await openChatSession(f.request, f.scope)).chats).toHaveLength(1);
    } finally {
      await f.app.close();
    }
  });
});
