import { describe, expect, it } from "vitest";

import {
  assertSafeRuntimeRole,
  assertSyntheticIntegrationTarget,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "../../scripts/neon-integration-guard.js";

describe("proteção da integração sintética Neon", () => {
  it("aceita somente URL PostgreSQL Neon com TLS obrigatório", () => {
    expect(
      parseNeonIntegrationUrl(
        "postgresql://role:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"
      ).hostname
    ).toBe("ep-example.us-east-2.aws.neon.tech");
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "https://ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require",
    "postgresql://role:password@db.example.com/neondb?sslmode=require",
    "postgresql://role:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=disable"
  ])("rejeita URL insegura: %s", (url) => {
    expect(() => parseNeonIntegrationUrl(url)).toThrow();
  });

  it("exige confirmação literal para dados sintéticos", () => {
    expect(() => requireSyntheticIntegrationConfirmation("synthetic-only")).not.toThrow();
    expect(() => requireSyntheticIntegrationConfirmation(undefined)).toThrow();
    expect(() => requireSyntheticIntegrationConfirmation("production")).toThrow();
  });

  it("recusa banco sem marcador persistente", async () => {
    const client = {
      query: async () => ({ rowCount: 0, rows: [] })
    } as never;

    await expect(assertSyntheticIntegrationTarget(client)).rejects.toThrow(
      "marcador de integração sintética"
    );
  });

  it("recusa papel runtime com qualquer privilégio ou ownership incompatível", async () => {
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
