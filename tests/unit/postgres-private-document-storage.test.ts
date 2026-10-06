import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createPostgresPrivateDocumentStorage,
  DocumentOriginalNotFoundError
} from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPrivateStorageKey } from "../../apps/api/documents/private-document-storage.js";

type QueryResult = Readonly<{ rows: readonly unknown[]; rowCount?: number }>;
type FakeClient = Readonly<{ query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }>;

function createFakeClient(responses: readonly QueryResult[] = []): {
  client: FakeClient;
  queries: Array<{ sql: string; values: readonly unknown[] | undefined }>;
} {
  const remaining = [...responses];
  const queries: Array<{ sql: string; values: readonly unknown[] | undefined }> = [];
  const query = vi.fn(async (...args: unknown[]): Promise<QueryResult> => {
    queries.push({ sql: String(args[0]), values: args[1] as readonly unknown[] | undefined });
    return remaining.shift() ?? { rows: [], rowCount: 1 };
  });
  return { client: { query, release: vi.fn() }, queries };
}

function createPool(client: FakeClient): Readonly<{ connect: () => Promise<PoolClient> }> {
  return { connect: async () => client as unknown as PoolClient };
}

const condominiumId = createCondominiumId("11111111-1111-4111-8111-111111111111");
const objectId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const content = Buffer.from("%PDF-1.7 conteúdo sintético");

describe("storage PostgreSQL de originais documentais", () => {
  it("persiste o binário no banco sob o contexto autorizado, sem filesystem", async () => {
    const fake = createFakeClient();
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(
      storage.storeOriginal({ condominiumId, objectId, content, uploadedByUserId: userId })
    ).resolves.toEqual({ storageKey: createPrivateStorageKey(condominiumId, objectId) });

    expect(fake.queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      expect.stringContaining("set_config('app.user_id'"),
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("INSERT INTO app.document_original_contents"),
      "COMMIT"
    ]);
    expect(fake.queries[4]?.values).toEqual([condominiumId, objectId, content, userId]);
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("resolve a identidade externa antes de persistir e remove apenas o original do remetente", async () => {
    const externalUserId = "sindico-demo";
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [{ user_id: userId }] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [{ user_id: userId }] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] }
    ]);
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await storage.storeOriginal({
      condominiumId,
      objectId,
      content,
      uploadedByUserId: externalUserId
    });
    await storage.removeOriginal({ condominiumId, objectId, uploadedByUserId: externalUserId });

    expect(fake.queries.map((query) => query.sql)).toEqual(
      expect.arrayContaining([
        "SELECT app.resolve_user_id($1) AS user_id",
        expect.stringContaining("DELETE FROM app.document_original_contents")
      ])
    );
  });

  it("lê o binário apenas no contexto autenticado do mesmo condomínio", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [{ content }] }
    ]);
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(storage.readOriginal({ condominiumId, objectId, userId })).resolves.toEqual(
      content
    );

    expect(fake.queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      expect.stringContaining("set_config('app.user_id'"),
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("FROM app.document_original_contents"),
      "COMMIT"
    ]);
  });

  it("usa o papel restrito do worker somente para processamento já escopado", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [{ content }] }
    ]);
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(storage.readOriginal({ condominiumId, objectId })).resolves.toEqual(content);
    expect(fake.queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_worker",
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("FROM app.document_original_contents"),
      "COMMIT"
    ]);
  });

  it("não retorna conteúdo inexistente e encerra a transação", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] }
    ]);
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(storage.readOriginal({ condominiumId, objectId, userId })).rejects.toBeInstanceOf(
      DocumentOriginalNotFoundError
    );
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("faz rollback se a gravação do binário falhar", async () => {
    const fake = createFakeClient();
    fake.client.query.mockImplementationOnce(async () => ({ rows: [] }));
    fake.client.query.mockImplementationOnce(async () => ({ rows: [] }));
    fake.client.query.mockImplementationOnce(async () => ({ rows: [] }));
    fake.client.query.mockImplementationOnce(async () => ({ rows: [] }));
    fake.client.query.mockImplementationOnce(async () => {
      throw new Error("database unavailable");
    });
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(
      storage.storeOriginal({ condominiumId, objectId, content, uploadedByUserId: userId })
    ).rejects.toThrow("database unavailable");
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("falha fechado quando a identidade externa não pode ser resolvida", async () => {
    const fake = createFakeClient([{ rows: [] }, { rows: [] }, { rows: [{ user_id: null }] }]);
    const storage = createPostgresPrivateDocumentStorage(createPool(fake.client));

    await expect(
      storage.storeOriginal({
        condominiumId,
        objectId,
        content,
        uploadedByUserId: "identidade-ausente"
      })
    ).rejects.toThrow("não está cadastrada como usuário ativo");
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });
});
