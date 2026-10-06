import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  constitutionSource,
  downloadOfficialConstitution,
  importBrazilianConstitution
} from "../../scripts/import-brazilian-constitution.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const migration = readFileSync(
  new URL("../../infrastructure/database/018_shared_legal_reference.sql", import.meta.url),
  "utf8"
);

describe("base legal oficial compartilhada", () => {
  it("mantém legislação global somente leitura no runtime e valida a origem das citações", () => {
    for (const table of [
      "legal_sources",
      "legal_source_versions",
      "legal_source_pages",
      "legal_source_chunks"
    ]) {
      expect(migration).toContain(`CREATE TABLE app.${table}`);
      expect(migration).toContain(`ALTER TABLE app.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("source_scope IN ('condominium', 'legislation')");
    expect(migration).toContain("CREATE TRIGGER retrieval_evidence_source_guard");
    expect(migration).toContain("CREATE TRIGGER citations_source_guard");
    expect(migration).toContain("CREATE TRIGGER answer_trace_sources_guard");
    expect(migration).toContain("GRANT SELECT ON app.legal_sources");
    expect(migration).not.toMatch(/GRANT[^;]+INSERT[^;]+legal_source/iu);
  });

  it("baixa somente o PDF HTTPS oficial da Câmara", async () => {
    const content = createSyntheticTextPdf();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(content.toString("ascii"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": String(content.length)
        }
      })
    );

    await expect(downloadOfficialConstitution(fetch)).resolves.toEqual(content);
    expect(fetch).toHaveBeenCalledWith(
      new URL(constitutionSource.officialUrl),
      expect.objectContaining({ redirect: "follow" })
    );
    expect(new URL(constitutionSource.officialUrl).hostname).toBe("www2.camara.leg.br");
  });

  it("versiona, extrai páginas e cria trechos vetorizados sem depender de condomínio", async () => {
    const queries: Array<Readonly<{ text: string; values: readonly unknown[] }>> = [];
    const client = {
      async query<T>(text: string, values: readonly unknown[] = []) {
        queries.push({ text, values });
        if (text.includes("COALESCE(max(version_number)")) {
          return { rows: [{ next_version: 1 }] as T[] };
        }
        return { rows: [] as T[] };
      }
    };

    const result = await importBrazilianConstitution(client as never, createSyntheticTextPdf());

    expect(result).toMatchObject({
      status: "imported",
      sourceId: constitutionSource.id,
      versionNumber: 1,
      pageCount: 2,
      chunkCount: 2
    });
    expect(queries[0]?.text).toBe("BEGIN");
    expect(queries.at(-1)?.text).toBe("COMMIT");
    expect(
      queries.filter((query) => query.text.includes("INSERT INTO app.legal_source_pages"))
    ).toHaveLength(2);
    expect(
      queries.filter((query) => query.text.includes("INSERT INTO app.legal_source_chunks"))
    ).toHaveLength(2);
    expect(queries.some((query) => query.text.includes("to_tsvector('portuguese'"))).toBe(true);
    expect(result.contentSha256).toMatch(/^[a-f0-9]{64}$/u);
  });
});
