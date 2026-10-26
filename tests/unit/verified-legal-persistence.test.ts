import { readFileSync } from "node:fs";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresLegalCopyReader } from "../../apps/api/legislation/postgres-legal-copy-reader.js";
import {
  importOfficialLegalPdf,
  type OfficialLegalPdfSource
} from "../../scripts/import-brazilian-constitution.js";
import { importVerifiedLegalCorpus } from "../../scripts/import-verified-legal-corpus.js";
import { createSyntheticPdf, createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const source: OfficialLegalPdfSource = {
  id: "11111111-1111-5111-8111-111111111111",
  title: "Norma sintética de controle",
  issuingAuthority: "Controle sintético",
  officialUrl: "https://www.planalto.gov.br/controle",
  versionLabel: "Controle",
  effectiveThrough: "Conferência sintética",
  verifiedAt: "2026-10-22",
  reviewDueAt: "2026-11-21",
  versionId: "22222222-2222-5222-8222-222222222222"
};

function fakeClient(
  options: {
    existing?: boolean;
    historical?: boolean;
    newer?: boolean;
    fail?: string;
    rollbackFails?: boolean;
  } = {}
) {
  const queries: Array<{ text: string; values: readonly unknown[] }> = [];
  const query = vi.fn(async (text: string, values: readonly unknown[] = []) => {
    queries.push({ text, values });
    if (
      (options.fail !== undefined && text.includes(options.fail)) ||
      (options.rollbackFails && text === "ROLLBACK")
    )
      throw new Error("Falha sintética");
    if (text.includes("SELECT version.id, version.version_number"))
      return {
        rows: options.existing
          ? [
              {
                id: source.versionId,
                version_number: 1,
                page_count: 2,
                chunk_count: 2,
                is_current: !options.historical
              }
            ]
          : []
      };
    if (text.includes("SELECT EXISTS")) return { rows: [{ exists: options.newer === true }] };
    if (text.includes("COALESCE(max(version_number)")) return { rows: [{ next_version: 1 }] };
    return { rows: [] };
  });
  return {
    client: { query } as unknown as Parameters<typeof importOfficialLegalPdf>[0],
    queries,
    query
  };
}

describe("importação administrativa legal", () => {
  it("AC-3906: persiste cópia, intervalo, páginas e vetores em transação", async () => {
    const fake = fakeClient();
    const pdf = createSyntheticTextPdf();
    const result = await importOfficialLegalPdf(fake.client, source, pdf);
    expect(result).toMatchObject({
      status: "imported",
      versionId: source.versionId,
      pageCount: 2,
      chunkCount: 2
    });
    expect(fake.queries[0]!.text).toBe("BEGIN");
    expect(fake.queries.at(-1)!.text).toBe("COMMIT");
    const version = fake.queries.find((query) =>
      query.text.includes("INSERT INTO app.legal_source_versions")
    )!;
    expect(version.text).toContain("verified_at, review_due_at, consultation_pdf");
    expect(version.values.slice(-3)).toEqual([
      "2026-10-22T00:00:00.000Z",
      "2026-11-21T00:00:00.000Z",
      pdf
    ]);
    expect(
      fake.queries.filter((query) => query.text.includes("INSERT INTO app.legal_source_chunks"))
    ).toHaveLength(2);
  });

  it("é idempotente e não reativa versão histórica nem substitui conferência mais recente", async () => {
    const same = fakeClient({ existing: true });
    expect(
      await importOfficialLegalPdf(same.client, source, createSyntheticTextPdf())
    ).toMatchObject({ status: "unchanged" });
    expect(
      same.queries.some((query) => query.text.includes("UPDATE app.legal_source_versions"))
    ).toBe(false);
    for (const options of [{ existing: true, historical: true }, { newer: true }]) {
      const fake = fakeClient(options);
      await expect(
        importOfficialLegalPdf(fake.client, source, createSyntheticTextPdf())
      ).rejects.toThrow();
      expect(fake.queries.at(-1)!.text).toBe("ROLLBACK");
    }
  });

  it.each([
    { officialUrl: "http://www.planalto.gov.br/controle" },
    { officialUrl: "https://www.planalto.gov.br.evil.test/controle" },
    { officialUrl: "https://usuario@www.planalto.gov.br/controle" },
    { verifiedAt: "2026-12-01" },
    { verifiedAt: "inválida" },
    { reviewDueAt: undefined }
  ])("recusa origem ou intervalo inválidos antes de escrever: %j", async (overrides) => {
    const fake = fakeClient();
    await expect(
      importOfficialLegalPdf(
        fake.client,
        { ...source, ...overrides } as OfficialLegalPdfSource,
        createSyntheticTextPdf()
      )
    ).rejects.toThrow();
    expect(fake.queries).toEqual([]);
  });

  it("recusa corpo inválido, página sem texto e recorte sem correspondência", async () => {
    for (const pdf of [Buffer.alloc(0), Buffer.from("html"), createSyntheticPdf([""])]) {
      const fake = fakeClient();
      await expect(importOfficialLegalPdf(fake.client, source, pdf)).rejects.toThrow();
      expect(fake.queries).toEqual([]);
    }
    const fake = fakeClient();
    await expect(
      importOfficialLegalPdf(
        fake.client,
        {
          ...source,
          pageRanges: [{ pageNumber: 1, startOffset: 0, endOffset: 4, textSha256: "0".repeat(64) }]
        },
        createSyntheticTextPdf()
      )
    ).rejects.toThrow("divergente");
    expect(fake.queries).toEqual([]);
  });

  it.each([false, true])(
    "faz rollback sem ocultar o erro original (rollback falha: %s)",
    async (rollbackFails) => {
      const fake = fakeClient({ fail: "INSERT INTO app.legal_source_pages", rollbackFails });
      await expect(
        importOfficialLegalPdf(fake.client, source, createSyntheticTextPdf())
      ).rejects.toThrow("Falha sintética");
      expect(fake.queries.at(-1)!.text).toBe("ROLLBACK");
    }
  );

  it("importa a edição conferida inteira e recusa importação fora da conferência", async () => {
    const fake = fakeClient();
    const results = await importVerifiedLegalCorpus(fake.client, new Date("2026-10-22T12:00:00Z"));
    expect(results).toHaveLength(6);
    expect(results.reduce((sum, result) => sum + result.pageCount, 0)).toBe(25);
    for (const date of ["2026-10-21", "2026-11-21"]) {
      const denied = fakeClient();
      await expect(importVerifiedLegalCorpus(denied.client, new Date(date))).rejects.toThrow(
        "conferência"
      );
      expect(denied.queries).toEqual([]);
    }
  });
});

describe("cópia legal no PostgreSQL", () => {
  const context: AuthorizedCondominiumContext = {
    condominiumId: createCondominiumId("33333333-3333-4333-8333-333333333333"),
    userId: "sintetico" as AuthorizedCondominiumContext["userId"],
    roleKey: "manager",
    membershipRevision: "v1",
    permissions: ["document:read"]
  };
  const input = { documentId: source.id, documentVersionId: source.versionId! };
  function readerFixture(options: { unresolved?: boolean; fail?: boolean; empty?: boolean } = {}) {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("resolve_user_id"))
          return {
            rows: [{ user_id: options.unresolved ? null : "44444444-4444-4444-8444-444444444444" }]
          };
        if (sql.includes("version.consultation_pdf")) {
          if (options.fail) throw new Error("Falha sintética");
          return {
            rows: options.empty ? [] : [{ consultation_pdf: Buffer.from("%PDF-controle") }]
          };
        }
        return { rows: [] };
      }),
      release: vi.fn()
    };
    const connect = vi.fn(async () => client as unknown as PoolClient);
    return { reader: createPostgresLegalCopyReader({ connect }), queries, client, connect };
  }

  it("fixa usuário e condomínio sob RLS e permite conferir versão antiga", async () => {
    const fake = readerFixture();
    expect(await fake.reader.getAuthorizedCopy(context, input)).toEqual(
      Buffer.from("%PDF-controle")
    );
    expect(fake.queries).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      expect.stringContaining("resolve_user_id"),
      expect.stringContaining("set_config('app.user_id'"),
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("version.consultation_pdf"),
      "COMMIT"
    ]);
    expect(fake.queries.find((sql) => sql.includes("version.consultation_pdf"))).not.toContain(
      "is_current"
    );
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("recusa permissão e identificadores inválidos antes de conectar", async () => {
    const fake = readerFixture();
    for (const [ctx, params] of [
      [{ ...context, permissions: [] }, input],
      [{ ...context, condominiumId: createCondominiumId("outro") }, input],
      [context, { ...input, documentId: "outro" }],
      [context, { ...input, documentVersionId: "outro" }]
    ] as const)
      expect(await fake.reader.getAuthorizedCopy(ctx, params)).toBeUndefined();
    expect(fake.connect).not.toHaveBeenCalled();
  });

  it("nega identidade não resolvida e cópia ausente", async () => {
    for (const options of [{ unresolved: true }, { empty: true }]) {
      const fake = readerFixture(options);
      expect(await fake.reader.getAuthorizedCopy(context, input)).toBeUndefined();
      expect(fake.queries.at(-1)).toBe("COMMIT");
    }
  });

  it("preserva o erro e fecha transação em falha", async () => {
    const fake = readerFixture({ fail: true });
    await expect(fake.reader.getAuthorizedCopy(context, input)).rejects.toThrow("Falha sintética");
    expect(fake.queries.at(-1)).toBe("ROLLBACK");
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("a migração impõe intervalo coerente e limite à cópia sem ampliar permissões", () => {
    const migration = readFileSync(
      new URL("../../infrastructure/database/033_verified_legal_editions.sql", import.meta.url),
      "utf8"
    );
    expect(migration).toContain("review_due_at > verified_at");
    expect(migration).toContain("octet_length(consultation_pdf) <= 26214400");
    expect(migration).not.toMatch(/GRANT/iu);
  });
});
