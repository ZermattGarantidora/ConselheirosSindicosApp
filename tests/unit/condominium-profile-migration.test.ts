import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("migration de perfil privado do condomínio", () => {
  it("mantém fotos sob RLS e escrita somente por funções de síndico", async () => {
    const migration = await readFile(
      "infrastructure/database/023_condominium_profile_customization.sql",
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE app.condominium_profile_photos");
    expect(migration).toContain(
      "condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE CASCADE"
    );
    expect(migration).toContain(
      "ALTER TABLE app.condominium_profile_photos FORCE ROW LEVEL SECURITY"
    );
    expect(migration).toContain("CREATE POLICY condominium_profile_photos_active_member_read");
    expect(migration).toContain("CREATE POLICY condominium_profile_photos_manager_insert");
    expect(migration).toContain("CREATE POLICY condominium_profile_photos_manager_update");
    expect(migration).toContain("CREATE POLICY condominium_profile_photos_manager_delete");
    expect(migration).toContain("condominium_id = app.current_condominium_id()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.profile_actor_is_manager");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.update_condominium_profile");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.add_condominium_profile_photo");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION app.set_condominium_profile_photo_cover"
    );
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.delete_condominium_profile_photo");
    expect(migration).toContain("REVOKE ALL ON FUNCTION app.add_condominium_profile_photo");
    expect(migration).toContain("GRANT SELECT ON app.condominium_profile_photos TO app_runtime");
  });
});
