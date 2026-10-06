import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createPostgresDocumentRetentionRepository } from "../../apps/api/documents/postgres-document-retention-repository.js";

describe("retenção de originais documentais", () => {
  it("apaga somente originais de documentos arquivados há pelo menos 30 dias", async () => {
    const query = vi.fn(async (sql: string) => ({
      rows: [],
      rowCount: sql.includes("DELETE FROM app.document_original_contents") ? 2 : 0
    }));
    const release = vi.fn();
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredOriginals()).resolves.toBe(2);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_worker",
      expect.stringContaining("documents.archived_at <= now() - interval '30 days'"),
      "COMMIT"
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("faz rollback se a limpeza interna falhar", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("DELETE FROM app.document_original_contents")) {
        throw new Error("database unavailable");
      }
      if (sql === "ROLLBACK") {
        throw new Error("rollback unavailable");
      }
      return { rows: [], rowCount: 0 };
    });
    const release = vi.fn();
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredOriginals()).rejects.toThrow("database unavailable");
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("informa zero quando a limpeza não encontra originais expirados", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release: vi.fn() }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredOriginals()).resolves.toBe(0);
  });
});
