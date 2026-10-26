import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  createInMemoryChatRepository,
  parseHistoryCursor
} from "../../apps/api/chats/chat-repository.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { managerContext } from "./answer-fixtures.js";

const id = "11111111-1111-4111-8111-111111111111";
const time = "2026-10-20T15:00:00.000Z";
const attachment = { documentVersionId: id, title: "Ata.pdf", createdAt: time };
describe("organização de chats no servidor", () => {
  it("metadados, anexos e ocultação permanecem isolados por usuário e condomínio", async () => {
    const repository = createInMemoryChatRepository(() => new Date(time));
    await repository.create(managerContext, { id, title: "Primeiro" });
    await repository.attachDocument(managerContext, id, attachment);
    for (const context of [
      { ...managerContext, userId: createUserId("outro") },
      { ...managerContext, condominiumId: createCondominiumId("outro") },
      { ...managerContext, permissions: [] }
    ]) {
      expect(await repository.list(context)).toEqual([]);
      expect(await repository.find(context, id)).toBeUndefined();
      expect(await repository.rename(context, id, "Alterar")).toBe(false);
      expect(await repository.hide(context, id)).toBe(false);
      expect(await repository.listAttachments(context, id)).toEqual([]);
      await expect(repository.attachDocument(context, id, attachment)).rejects.toThrow();
    }
    await repository.create(managerContext, { id, title: "Não sobrescrever" });
    expect((await repository.find(managerContext, id))?.title).toBe("Primeiro");
    expect(await repository.rename(managerContext, id, "Segundo")).toBe(true);
    await repository.attachDocument(managerContext, id, attachment);
    expect(await repository.listAttachments(managerContext, id)).toEqual([attachment]);
    expect(await repository.hide(managerContext, id)).toBe(true);
    expect(await repository.create(managerContext, { id, title: "Reativar" })).toBeUndefined();
  });
  it("valida cursores compostos e não confunde delimitadores de usuário/tenant", async () => {
    expect(parseHistoryCursor(undefined)).toBeUndefined();
    expect(parseHistoryCursor(`${time}|${id}`)).toEqual({ createdAt: time, id });
    for (const value of ["bad", `bad|${id}`, `${time}|bad`, `${time}|${id}|extra`])
      expect(() => parseHistoryCursor(value)).toThrow();
    const repository = createInMemoryChatRepository(() => new Date(time));
    const a = {
      ...managerContext,
      condominiumId: createCondominiumId("a:b"),
      userId: createUserId("c")
    };
    const b = {
      ...managerContext,
      condominiumId: createCondominiumId("a"),
      userId: createUserId("b:c")
    };
    await repository.create(a, { id, title: "Restrito" });
    expect(await repository.list(b)).toEqual([]);
    expect(await repository.list(a, { createdAt: time, id })).toEqual([]);
  });
  it("PostgreSQL fixa usuário e tenant, usa paginação composta e preserva nomes existentes", async () => {
    const queries: Array<{ sql: string; values: readonly unknown[] | undefined }> = [];
    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string, values?: readonly unknown[]) => {
        queries.push({ sql, values });
        if (sql.includes("resolve_user_id")) return { rows: [{ user_id: id }] };
        if (sql.startsWith("SELECT id, title"))
          return { rows: [{ id, title: "Salvo", created_at: time }] };
        if (sql.startsWith("SELECT attachment"))
          return {
            rows: [{ document_version_id: id, title: "Ata.pdf", created_at: new Date(time) }]
          };
        return { rows: [], rowCount: 1 };
      })
    };
    const pool = { connect: vi.fn(async () => client as unknown as PoolClient) };
    const repository = createPostgresChatRepository(pool);
    expect(await repository.create(managerContext, { id, title: "Novo" })).toMatchObject({
      title: "Salvo"
    });
    expect(await repository.find(managerContext, id)).toMatchObject({ id });
    expect(await repository.list(managerContext, { createdAt: time, id })).toHaveLength(1);
    expect(await repository.rename(managerContext, id, "Renomeado")).toBe(true);
    expect(await repository.hide(managerContext, id)).toBe(true);
    await repository.attachDocument(managerContext, id, attachment);
    expect(await repository.listAttachments(managerContext, id)).toEqual([attachment]);
    expect(
      queries.some(
        ({ sql, values }) => sql.includes("set_config('app.user_id'") && values?.[0] === id
      )
    ).toBe(true);
    expect(
      queries.some(
        ({ sql, values }) =>
          sql.includes("set_config('app.condominium_id'") &&
          values?.[0] === managerContext.condominiumId
      )
    ).toBe(true);
    expect(queries.find(({ sql }) => sql.includes("ORDER BY created_at DESC"))?.values).toEqual([
      time,
      id
    ]);
    expect(
      queries
        .filter(({ sql }) => sql.includes("FROM app.chats") || sql.includes("UPDATE app.chats"))
        .every(({ sql }) => sql.includes("owner_user_id = app.current_user_id()"))
    ).toBe(true);
    const uuidContext = { ...managerContext, userId: createUserId(id) };
    await repository.find(uuidContext, id);
    const count = pool.connect.mock.calls.length;
    await expect(repository.list({ ...managerContext, permissions: [] })).rejects.toThrow(
      "autorizado"
    );
    expect(pool.connect).toHaveBeenCalledTimes(count);
    client.query.mockRejectedValueOnce(new Error("database failed"));
    await expect(repository.list(managerContext)).rejects.toThrow("database failed");
    expect(queries.at(-1)?.sql).toBe("ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(count + 1);
  });
  it("PostgreSQL nega versão ausente e identidade não resolvida", async () => {
    const client = { release: vi.fn(), query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
    const repository = createPostgresChatRepository({
      connect: async () => client as unknown as PoolClient
    });
    const context = { ...managerContext, userId: createUserId(id) };
    expect(await repository.find(context, id)).toBeUndefined();
    expect(await repository.create(context, { id, title: "Nome" })).toBeUndefined();
    expect(await repository.rename(context, id, "Nome")).toBe(false);
    expect(await repository.hide(context, id)).toBe(false);
    await expect(repository.attachDocument(context, id, attachment)).rejects.toThrow("vincular");
    await expect(repository.list(managerContext)).rejects.toThrow("autorizado");
  });
});
