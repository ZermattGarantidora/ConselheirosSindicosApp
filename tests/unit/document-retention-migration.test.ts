import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../infrastructure/database/026_document_derived_data_retention.sql", import.meta.url),
  "utf8"
);

describe("migration de retenção e purge de documentos derivados", () => {
  it("mantém recibos minimizados e escopados por condomínio por 30 dias", () => {
    expect(migration).toContain("CREATE TABLE app.document_purge_receipts");
    expect(migration).toContain("retention_until timestamptz NOT NULL DEFAULT");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("deleted_artifact_count integer NOT NULL");
    expect(migration).toContain("ALTER TABLE app.document_purge_receipts FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("condominium_id = app.current_condominium_id()");
    expect(migration).toContain("app.has_active_membership()");
  });

  it("revalida o prazo sob bloqueio e exige o tenant do contexto", () => {
    expect(migration).toContain("CREATE FUNCTION app.purge_expired_document_data(");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = pg_catalog, app");
    expect(migration).toContain("SET row_security = off");
    expect(migration).toContain("p_condominium_id IS DISTINCT FROM app.current_condominium_id()");
    expect(migration).toContain("AND documents.status = 'archived'");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("archived_at_value > clock_timestamp() - interval '30 days'");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION app.purge_expired_document_data(uuid, uuid) TO app_worker"
    );
    expect(migration).not.toContain(
      "GRANT EXECUTE ON FUNCTION app.purge_expired_document_data(uuid, uuid) TO app_runtime"
    );
  });

  it("remove o documento e os índices sem apagar o histórico do chat", () => {
    expect(migration).toContain("ADD COLUMN source_removed_at timestamptz");
    expect(migration).toContain("SET source_removed_at = clock_timestamp()");
    expect(migration).toContain("citations.source_scope = 'condominium'");
    expect(migration).toContain("confrelid = 'app.retrieval_evidence'::regclass");
    for (const table of [
      "app.answer_trace_sources",
      "app.model_invocation_evidence",
      "app.retrieval_evidence",
      "app.document_chunk_embeddings",
      "app.document_chunks",
      "app.document_pages",
      "app.processing_jobs",
      "app.document_version_states",
      "app.document_versions",
      "app.document_original_contents",
      "app.documents",
      "app.storage_objects"
    ]) {
      expect(migration).toContain(`DELETE FROM ${table}`);
    }
    for (const table of [
      "app.answers",
      "app.answer_claims",
      "app.feedback",
      "app.answer_feedback",
      "app.answer_traces"
    ]) {
      expect(migration).not.toContain(`DELETE FROM ${table}`);
      expect(migration).not.toContain(`UPDATE ${table}`);
    }
    expect(migration).not.toContain("DELETE FROM app.citations");
    expect(migration).toContain("A purga documental deixou artefatos vinculados no banco ativo.");
    expect(migration).toContain("states.document_version_id = ANY(document_version_ids)");
    expect(migration).toContain("ON CONFLICT (condominium_id, document_id)");
  });

  it("expira recibos e não os expõe a uma limpeza ampla do runtime", () => {
    expect(migration).toContain("CREATE FUNCTION app.purge_expired_document_purge_receipts()");
    expect(migration).toContain("WHERE retention_until <= clock_timestamp()");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION app.purge_expired_document_purge_receipts() TO app_worker"
    );
    expect(migration).not.toMatch(
      /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*document_purge_receipts[^;]*TO app_runtime/iu
    );
  });
});
