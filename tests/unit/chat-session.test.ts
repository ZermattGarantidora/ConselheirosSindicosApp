import { describe, expect, it, vi } from "vitest";
import {
  openChatSession,
  loadSavedChat,
  saveChat,
  changeSavedChat,
  createEmptyChat,
  startNewChat,
  getChatSetupMessages
} from "../../apps/web/chat-session.js";

const scope = { condominiumId: "cond A/B", headers: { "x-development-user-id": "synthetic" } };
const response = (body: unknown) => new Response(JSON.stringify(body));
describe("sessão de chats — Spec 038", () => {
  it("AC-3806: cria chat vazio, preserva o anterior e não acumula rascunhos vazios", () => {
    const previous = {
      ...createEmptyChat<string>(() => "original"),
      entries: ["pergunta e resposta concluídas"],
      attachments: [{ documentVersionId: "v1", title: "Ata.pdf", createdAt: "2026-10-20" }],
      persisted: true
    };
    const renamed = {
      ...createEmptyChat<string>(() => "renamed"),
      title: "Planejamento",
      persisted: true
    };
    const first = startNewChat([previous, renamed], () => "new1");
    const second = startNewChat(first.chats, () => "new2");
    expect(first.activeChatId).toBe("new1");
    expect(second.activeChatId).toBe("new2");
    expect(second.chats.map((chat) => chat.id)).toEqual(["new2", "original", "renamed"]);
    expect(second.chats[0]).toMatchObject({ entries: [], attachments: [], persisted: false });
    expect(second.chats[1]).toBe(previous);
    expect(previous.entries).toEqual(["pergunta e resposta concluídas"]);
    expect(previous.attachments).toHaveLength(1);
  });

  it("AC-3806: cadastro e saudação pertencem à conversa de origem, sem repetir em outra", () => {
    const setup = ["Como prefere ser chamado?", "Síndico sintético", "Cadastro concluído"];
    expect(getChatSetupMessages(setup, false, undefined, undefined)).toEqual(setup);
    expect(getChatSetupMessages(setup, true, "original", "original")).toEqual(setup);
    expect(getChatSetupMessages(setup, true, "original", "new")).toEqual([]);
    expect(getChatSetupMessages(setup, true, undefined, undefined)).toEqual([]);
    expect(getChatSetupMessages(setup, true, "original", "original")).toEqual(setup);
  });

  it("abre vazio a cada entrada sem salvar chat vazio e pagina a lista anterior", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ chats: [{ id: "old1", title: "Primeiro" }], nextCursor: "cursor 1" })
      )
      .mockResolvedValueOnce(
        response({ chats: [{ id: "old2", title: "Segundo" }], nextCursor: null })
      );
    const session = await openChatSession(request, scope, () => "new");
    expect(session.activeChatId).toBe("new");
    expect(session.chats.map((chat) => chat.id)).toEqual(["new", "old1", "old2"]);
    expect(session.chats[0]).toMatchObject({ entries: [], persisted: false, loaded: true });
    expect(request).toHaveBeenCalledWith(
      "/v1/condominiums/cond%20A%2FB/chats?before=cursor%201",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        headers: scope.headers
      })
    );
    expect(request.mock.calls.every(([, init]) => init?.method === undefined)).toBe(true);
  });
  it("reúne páginas de turnos em ordem e não duplica anexos", async () => {
    const attachment = { documentVersionId: "v1", title: "Ata" };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ entries: ["recente"], attachments: [attachment], nextCursor: "anterior" })
      )
      .mockResolvedValueOnce(
        response({ entries: ["antigo"], attachments: [attachment], nextCursor: null })
      );
    expect(await loadSavedChat(request, scope, "chat/1")).toEqual({
      entries: ["antigo", "recente"],
      attachments: [attachment]
    });
    expect(String(request.mock.calls[1]?.[0])).toContain("chatId=chat%2F1&before=anterior");
  });
  it.each(["list", "history"])(
    "falha de %s não simula lista vazia e cursor repetido não gera loop",
    async (mode) => {
      const call = (request: typeof fetch) =>
        mode === "list" ? openChatSession(request, scope) : loadSavedChat(request, scope, "id");
      await expect(call(async () => new Response(null, { status: 503 }))).rejects.toThrow();
      await expect(
        call(async () =>
          response({ chats: [], entries: [], attachments: [], nextCursor: "repetido" })
        )
      ).rejects.toThrow("concluir");
    }
  );
  it("renomear/excluir falhos não retornam sucesso", async () => {
    await expect(
      saveChat(async () => new Response(null, { status: 500 }), scope, { id: "id", title: "nome" })
    ).rejects.toThrow("preservada");
    await expect(
      changeSavedChat(async () => new Response(null, { status: 404 }), scope, "id", "novo")
    ).rejects.toThrow();
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(null, { status: 204 }));
    await changeSavedChat(request, scope, "id", "nome");
    await changeSavedChat(request, scope, "id");
    expect(request.mock.calls.map(([, init]) => init?.method)).toEqual(["PATCH", "DELETE"]);
  });
});
