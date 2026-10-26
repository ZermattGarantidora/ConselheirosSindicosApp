import { describe, expect, it } from "vitest";

import {
  assertSafeRuntimeRole,
  assertSyntheticIntegrationTarget,
  parseSupabaseIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "../../scripts/supabase-integration-guard.js";

describe("proteção da integração sintética Supabase", () => {
  it("aceita endpoint Supabase PostgreSQL com TLS obrigatório", () => {
    expect(
      parseSupabaseIntegrationUrl(
        "postgresql://role:password@db.project-ref.supabase.co:5432/postgres?sslmode=require"
      ).hostname
    ).toBe("db.project-ref.supabase.co");
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "https://db.project-ref.supabase.co/postgres?sslmode=require",
    "postgresql://role:password@db.example.com/postgres?sslmode=require",
    "postgresql://role:password@db.project-ref.supabase.co/postgres?sslmode=disable"
  ])("rejeita URL insegura: %s", (url) => {
    expect(() => parseSupabaseIntegrationUrl(url)).toThrow();
  });

  it("exige confirmação literal para dados sintéticos", () => {
    expect(() => requireSyntheticIntegrationConfirmation("synthetic-only")).not.toThrow();
    expect(() => requireSyntheticIntegrationConfirmation(undefined)).toThrow();
  });

  it("recusa banco sem marcador persistente", async () => {
    const client = { query: async () => ({ rowCount: 0, rows: [] }) } as never;
    await expect(assertSyntheticIntegrationTarget(client)).rejects.toThrow(
      "marcador de integração sintética"
    );
  });

  it("recusa papel runtime com privilégio incompatível", async () => {
    const client = {
      query: async () => ({
        rowCount: 1,
        rows: [
          {
            rolcanlogin: false,
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolinherit: false,
            rolbypassrls: true,
            rolreplication: false,
            has_memberships: false,
            owns_objects: false,
            has_role_config: false
          }
        ]
      })
    } as never;

    await expect(assertSafeRuntimeRole(client)).rejects.toThrow("app_runtime");
  });
});
