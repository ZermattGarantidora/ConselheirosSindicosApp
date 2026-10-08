import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createPostgresDocumentRetentionRepository } from "../../apps/api/documents/postgres-document-retention-repository.js";

type MockQueryResult = { rows: Array<Record<string, unknown>>; rowCount: number };
type MockQuery = (sql: string, values?: readonly unknown[]) => Promise<MockQueryResult>;

const expiredDocuments = [
  {
    condominium_id: "056ec610-7a21-430f-9993-18b1da4a1f72",
    document_id: "474f03da-336e-4ab8-a633-e38ac6a3e9df"
  },
  {
    condominium_id: "156ec610-7a21-430f-9993-18b1da4a1f73",
    document_id: "574f03da-336e-4ab8-a633-e38ac6a3e9e"
  }
];

describe("retenção de documentos e dados derivados", () => {
  it("purga documentos expirados por tenant e limpa recibos vencidos", async () => {
    const query = vi.fn<MockQuery>(async (sql: string, values: readonly unknown[] = []) => {
      void values;
      if (sql.includes("SELECT condominium_id, id AS document_id")) {
        return { rows: expiredDocuments, rowCount: expiredDocuments.length };
      }
      if (sql.includes("app.purge_expired_document_data")) {
        return { rows: [{ purged: true }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const release = vi.fn();
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredDocuments()).resolves.toBe(2);

    const calls = query.mock.calls as unknown as Array<[sql: string, values?: readonly unknown[]]>;
    expect(calls[0]?.[0]).toBe("BEGIN");
    expect(calls[1]?.[0]).toBe("SET LOCAL ROLE app_worker");
    expect(calls[2]?.[0]).toContain("archived_at <= now() - interval '30 days'");
    expect(
      calls
        .filter(([sql]) => sql.includes("SELECT set_config('app.condominium_id'"))
        .map(([, values]) => values)
    ).toEqual([[expiredDocuments[0]?.condominium_id], [expiredDocuments[1]?.condominium_id]]);
    expect(
      calls
        .filter(([sql]) => sql.includes("app.purge_expired_document_data"))
        .map(([, values]) => values)
    ).toEqual([
      [expiredDocuments[0]?.condominium_id, expiredDocuments[0]?.document_id],
      [expiredDocuments[1]?.condominium_id, expiredDocuments[1]?.document_id]
    ]);
    expect(calls.some(([sql]) => sql.includes("app.purge_expired_document_purge_receipts"))).toBe(
      true
    );
    expect(calls.at(-1)?.[0]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("não conta documentos que foram recuperados antes da purga adquirir o bloqueio", async () => {
    const query = vi.fn<MockQuery>(async (sql: string, values: readonly unknown[] = []) => {
      void values;
      if (sql.includes("SELECT condominium_id, id AS document_id")) {
        return { rows: expiredDocuments.slice(0, 1), rowCount: 1 };
      }
      if (sql.includes("app.purge_expired_document_data")) {
        return { rows: [{ purged: false }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release: vi.fn() }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredDocuments()).resolves.toBe(0);
    const calls = query.mock.calls as unknown as Array<[sql: string, values?: readonly unknown[]]>;
    expect(calls.at(-1)?.[0]).toBe("COMMIT");
  });

  it("faz rollback se a purga falhar", async () => {
    const query = vi.fn<MockQuery>(async (sql: string, values: readonly unknown[] = []) => {
      void values;
      if (sql.includes("SELECT condominium_id, id AS document_id")) {
        return { rows: expiredDocuments.slice(0, 1), rowCount: 1 };
      }
      if (sql.includes("app.purge_expired_document_data")) {
        throw new Error("database unavailable");
      }
      if (sql === "ROLLBACK") throw new Error("rollback unavailable");
      return { rows: [], rowCount: 0 };
    });
    const release = vi.fn();
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredDocuments()).rejects.toThrow("database unavailable");
    const calls = query.mock.calls as unknown as Array<[sql: string, values?: readonly unknown[]]>;
    expect(calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("limpa recibos mesmo quando não há documentos expirados", async () => {
    const query = vi.fn<MockQuery>(async (sql: string, values: readonly unknown[] = []) => {
      void sql;
      void values;
      return {
        rows: [],
        rowCount: 0
      };
    });
    const repository = createPostgresDocumentRetentionRepository({
      connect: async () => ({ query, release: vi.fn() }) as unknown as PoolClient
    });

    await expect(repository.purgeExpiredDocuments()).resolves.toBe(0);
    const calls = query.mock.calls as unknown as Array<[sql: string, values?: readonly unknown[]]>;
    expect(calls.some(([sql]) => sql.includes("app.purge_expired_document_purge_receipts"))).toBe(
      true
    );
  });
});
