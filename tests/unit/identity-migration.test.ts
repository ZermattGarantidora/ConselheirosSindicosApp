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
});
