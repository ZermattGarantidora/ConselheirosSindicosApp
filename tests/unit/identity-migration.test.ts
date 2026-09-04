import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("migration de identidade e isolamento", () => {
  it("cria as tabelas de identidade, memberships e RLS obrigatório", async () => {
    const migration = await readFile(
      "infrastructure/database/001_identity_and_tenant_isolation.sql",
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE app.users");
    expect(migration).toContain("CREATE TABLE app.condominiums");
    expect(migration).toContain("CREATE TABLE app.memberships");
    expect(migration).toContain("CREATE FUNCTION app.current_condominium_id()");
    expect(migration).toContain("ALTER TABLE app.memberships FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("condominium_id = app.current_condominium_id()");
    expect(migration).toContain("memberships.status = 'active'");
  });

  it("cria o modelo documental com versões, páginas, chunks e jobs isolados", async () => {
    const migration = await readFile(
      "infrastructure/database/002_documents_and_processing.sql",
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE app.documents");
    expect(migration).toContain("CREATE TABLE app.document_versions");
    expect(migration).toContain("CREATE TABLE app.document_pages");
    expect(migration).toContain("CREATE TABLE app.document_chunks");
    expect(migration).toContain("CREATE TABLE app.processing_jobs");
    expect(migration).toContain("UNIQUE (condominium_id, document_id, version_number)");
    expect(migration).toContain("UNIQUE (condominium_id, document_version_id, id)");
    expect(migration).toContain(
      "validity_status IN ('pending', 'confirmed', 'disputed', 'superseded', 'not_applicable')"
    );
    expect(migration).toContain("ALTER TABLE app.document_versions FORCE ROW LEVEL SECURITY");
  });

  it("liga escrita do runtime e worker persistido sem conceder bypass de RLS", async () => {
    const migration = await readFile(
      "infrastructure/database/003_persisted_processing_flow.sql",
      "utf8"
    );

    expect(migration).toContain("CREATE ROLE app_worker NOLOGIN");
    expect(migration).toContain("GRANT INSERT ON app.storage_objects");
    expect(migration).toContain("GRANT SELECT, INSERT, DELETE ON app.document_pages");
    expect(migration).toContain("CREATE POLICY processing_jobs_worker_claim");
    expect(migration).toContain("current_user = 'app_worker'");
    expect(migration).toContain("role_key = 'manager'");
  });

  it("separa as policies genéricas do runtime das policies do worker", async () => {
    const migration = await readFile("infrastructure/database/004_worker_policy_scope.sql", "utf8");

    expect(migration).toContain(
      "ALTER POLICY processing_jobs_authorized_tenant ON app.processing_jobs TO app_runtime"
    );
    expect(migration).toContain(
      "ALTER POLICY document_versions_authorized_tenant ON app.document_versions TO app_runtime"
    );
    expect(migration).toContain(
      "ALTER POLICY document_chunks_authorized_tenant ON app.document_chunks TO app_runtime"
    );
  });

  it("resolve a identidade externa e aplica fence à tentativa do worker", async () => {
    const migration = await readFile(
      "infrastructure/database/005_worker_claim_fencing.sql",
      "utf8"
    );

    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.resolve_user_id");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION app.resolve_user_id(text) TO app_runtime"
    );
    expect(migration).toContain("app.processing_job_id");
  });

  it("garante leitura do runtime para o fluxo persistido", async () => {
    const migration = await readFile(
      "infrastructure/database/006_runtime_document_read_grants.sql",
      "utf8"
    );

    expect(migration).toContain("GRANT SELECT ON app.storage_objects, app.documents");
    expect(migration).toContain("TO app_runtime");
  });

  it("cria o índice semântico com perfil, hash, dimensões e RLS", async () => {
    const migration = await readFile("infrastructure/database/007_retrieval_index.sql", "utf8");

    expect(migration).toContain("CREATE TABLE app.document_chunk_embeddings");
    expect(migration).toContain("UNIQUE (condominium_id, document_chunk_id, embedding_profile)");
    expect(migration).toContain("CHECK (vector_dims(embedding) = dimensions)");
    expect(migration).toContain(
      "ALTER TABLE app.document_chunk_embeddings FORCE ROW LEVEL SECURITY"
    );
    expect(migration).toContain("current_user = 'app_worker'");
  });
});
