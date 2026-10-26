import { describe, expect, it } from "vitest";

import {
  createTrustedSupabaseConnectionConfig,
  parseSupabaseIntegrationUrl
} from "../../scripts/supabase-integration-guard.js";

describe("conexão Supabase de integração", () => {
  const connectionUrl =
    "postgresql://role:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full";
  const certificate = "-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----";

  it("mantém validação de hostname e cadeia com o certificado raiz fornecido", () => {
    const config = createTrustedSupabaseConnectionConfig(connectionUrl, certificate);

    expect(parseSupabaseIntegrationUrl(connectionUrl).hostname).toBe(
      "aws-0-us-east-1.pooler.supabase.com"
    );
    expect(config.connectionString).not.toContain("sslmode=");
    expect(config.ssl).toEqual({ ca: certificate, rejectUnauthorized: true });
  });

  it("falha fechada sem o certificado raiz", () => {
    expect(() => createTrustedSupabaseConnectionConfig(connectionUrl, undefined)).toThrow(
      "SUPABASE_INTEGRATION_CA_CERT"
    );
  });
});
