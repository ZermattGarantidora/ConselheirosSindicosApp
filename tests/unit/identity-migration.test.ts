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
});
