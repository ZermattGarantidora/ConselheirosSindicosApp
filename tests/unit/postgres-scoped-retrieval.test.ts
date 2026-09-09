import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresScopedRetrievalIndex } from "../../apps/api/retrieval/postgres-scoped-retrieval.js";

function createFakeClient() {
  const queries: string[] = [];
  const query = vi.fn(async (sql: string) => {
    queries.push(sql);
    if (sql.includes("resolve_user_id")) {
      return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
    }
    if (sql.includes("WITH authorized_chunks")) {
      return {
        rows: [
          {
            chunk_id: "chunk-1",
            condominium_id: "alameda",
            document_id: "document-1",
            document_version_id: "version-1",
            version_number: "2",
            document_title: "Convenção Alameda",
            document_type: "convention",
            source_kind: "user_upload",
            page_id: "page-1",
            page_number: "4",
            start_offset: "0",
            end_offset: "28",
            content: "A regra vale para a área comum.",
            content_sha256: "a".repeat(64),
            semantic_score: "0.8",
            extraction_method: "pdf_text",
            quality_score: "1",
            processing_status: "ready",
            validity_status: "confirmed",
            valid_from: null,
            valid_until: null
          }
        ]
      };
    }
    return { rows: [], rowCount: 1 };
  });
  return { client: { query, release: vi.fn() }, queries };
}

const context: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "sindico-sintetico" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "v1",
  permissions: ["document:read"]
};

describe("índice PostgreSQL de retrieval", () => {
  it("fixa o contexto e filtra antes do ranking textual", async () => {
    const fake = createFakeClient();
    const index = createPostgresScopedRetrievalIndex({
      connect: async () => fake.client as unknown as PoolClient
    });

    await expect(
      index.findAuthorizedCandidates(context, {
        query: "regra área comum",
        limit: 8,
        minimumQualityScore: 0.7,
        asOf: new Date("2026-09-01T00:00:00.000Z")
      })
    ).resolves.toMatchObject([
      {
        id: "chunk-1",
        condominiumId: "alameda",
        documentTitle: "Convenção Alameda",
        documentType: "convention",
        sourceKind: "user_upload",
        documentVersionNumber: 2,
        pageNumber: 4,
        semanticScore: 0.8,
        validityStatus: "confirmed"
      }
    ]);
    expect(fake.queries).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      expect.stringContaining("resolve_user_id"),
      expect.stringContaining("set_config('app.user_id'"),
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("WITH authorized_chunks"),
      "COMMIT"
    ]);
    const retrievalQuery = fake.queries.find((query) => query.includes("WITH authorized_chunks"));
    expect(retrievalQuery).toContain("dc.condominium_id = app.current_condominium_id()");
    expect(retrievalQuery).toContain("dvs.processing_status = 'ready'");
    expect(retrievalQuery).toContain("dvs.validity_status IN ('confirmed', 'not_applicable')");
    expect(retrievalQuery).toContain("search_vector @@ plainto_tsquery");
    expect(retrievalQuery).toContain("lexical_candidates");
    expect(retrievalQuery).toContain("semantic_candidates");
    expect(retrievalQuery).toContain("UNION ALL");
    expect(retrievalQuery).toContain("SELECT DISTINCT ON (chunk_id)");
    if (retrievalQuery === undefined) {
      throw new Error("Consulta de retrieval não foi executada.");
    }
    expect(retrievalQuery.slice(retrievalQuery.lastIndexOf("SELECT"))).toContain("semantic_score");
    expect(retrievalQuery).toContain("document_chunk_embeddings");
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("falha fechado e faz rollback em erro do banco", async () => {
    const fake = createFakeClient();
    fake.client.query = vi.fn(async (sql: string) => {
      fake.queries.push(sql);
      if (sql.includes("WITH authorized_chunks")) {
        throw new Error("retrieval unavailable");
      }
      if (sql.includes("resolve_user_id")) {
        return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
      }
      return { rows: [], rowCount: 1 };
    });
    const index = createPostgresScopedRetrievalIndex({
      connect: async () => fake.client as unknown as PoolClient
    });

    await expect(
      index.findAuthorizedCandidates(context, {
        query: "regra",
        limit: 8,
        minimumQualityScore: 0.7,
        asOf: new Date("2026-09-01T00:00:00.000Z")
      })
    ).rejects.toThrow("retrieval unavailable");
    expect(fake.queries.at(-1)).toBe("ROLLBACK");
  });

  it("não abre conexão sem a permissão de leitura ou com consulta vazia", async () => {
    let connections = 0;
    const index = createPostgresScopedRetrievalIndex({
      connect: async () => {
        connections += 1;
        return createFakeClient().client as unknown as PoolClient;
      }
    });

    await expect(
      index.findAuthorizedCandidates(
        { ...context, permissions: [] },
        {
          query: "regra",
          limit: 8,
          minimumQualityScore: 0.7,
          asOf: new Date("2026-09-01T00:00:00.000Z")
        }
      )
    ).resolves.toEqual([]);
    await expect(
      index.findAuthorizedCandidates(context, {
        query: "  ",
        limit: 8,
        minimumQualityScore: 0.7,
        asOf: new Date("2026-09-01T00:00:00.000Z")
      })
    ).rejects.toThrow("não pode ser vazia");
    expect(connections).toBe(0);
  });
});
