import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createPostgresDocumentAnalysisReader } from "../../apps/api/analysis/document-analysis-reader.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { managerContext } from "./answer-fixtures.js";

const versionId = "22222222-2222-4222-8222-222222222222";
const context = {
  ...managerContext,
  condominiumId: createCondominiumId("11111111-1111-4111-8111-111111111111")
};
const row = {
  document_id: "doc",
  document_version_id: versionId,
  title: "Balancete",
  page_number: 1,
  extracted_text: "Balancete 01/2026",
  extraction_method: "pdf_text",
  quality_score: 1
};
function setup(options: { rows?: object[]; fail?: boolean; missingUser?: boolean } = {}) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("resolve_user_id"))
      return { rows: [{ user_id: options.missingUser ? null : versionId }] };
    if (sql.includes("FROM app.document_pages")) {
      if (options.fail) throw new Error("falha-sintetica");
      return { rows: options.rows ?? [row] };
    }
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }) as unknown as PoolClient);
  return { reader: createPostgresDocumentAnalysisReader({ connect }), query, release, connect };
}

describe("leitura de páginas para análise sob RLS", () => {
  it("fixa contexto e lê somente versões ativas prontas e autorizadas", async () => {
    const fake = setup({ rows: [row, { ...row, page_number: 2 }] });
    const documents = await fake.reader.readAuthorized(context, [versionId]);
    expect(documents[0]?.pages).toHaveLength(2);
    expect(documents[0]?.condominiumId).toBe(context.condominiumId);
    expect(fake.query).toHaveBeenCalledWith("SET LOCAL ROLE app_runtime");
    expect(fake.query).toHaveBeenCalledWith("SELECT set_config('app.condominium_id', $1, true)", [
      context.condominiumId
    ]);
    const sql =
      fake.query.mock.calls.find(([statement]) =>
        statement.includes("FROM app.document_pages")
      )?.[0] ?? "";
    expect(sql).toContain("dp.condominium_id = app.current_condominium_id()");
    expect(sql).toContain("d.status = 'active'");
    expect(sql).toContain("state.processing_status = 'ready'");
    expect(sql).toContain("state.validity_status IN ('confirmed', 'not_applicable')");
    expect(sql).toContain("LIMIT 501");
    expect(fake.query).toHaveBeenLastCalledWith("COMMIT");
    expect(fake.release).toHaveBeenCalledOnce();
  });
  it("recusa autorização e IDs inválidos antes de abrir conexão", async () => {
    const fake = setup();
    await expect(
      fake.reader.readAuthorized({ ...context, permissions: [] }, [versionId])
    ).rejects.toThrow("autorizado");
    await expect(fake.reader.readAuthorized(managerContext, [versionId])).rejects.toThrow(
      "inválido"
    );
    await expect(fake.reader.readAuthorized(context, ["not-a-version"])).rejects.toThrow(
      "inválido"
    );
    expect(await fake.reader.readAuthorized(context, [])).toEqual([]);
    expect(fake.connect).not.toHaveBeenCalled();
  });
  it("reverte falha, identidade ausente e limite sem publicar leitura parcial", async () => {
    for (const options of [{ fail: true }, { missingUser: true }, { rows: Array(501).fill(row) }]) {
      const fake = setup(options);
      await expect(fake.reader.readAuthorized(context, [versionId])).rejects.toThrow();
      expect(fake.query).toHaveBeenLastCalledWith("ROLLBACK");
      expect(fake.release).toHaveBeenCalledOnce();
    }
  });
  it("aceita usuário UUID e conjunto sem páginas elegíveis", async () => {
    const fake = setup({ rows: [] });
    expect(
      await fake.reader.readAuthorized({ ...context, userId: versionId as typeof context.userId }, [
        versionId
      ])
    ).toEqual([]);
    expect(fake.query.mock.calls.some(([sql]) => sql.includes("resolve_user_id"))).toBe(false);
  });
});
