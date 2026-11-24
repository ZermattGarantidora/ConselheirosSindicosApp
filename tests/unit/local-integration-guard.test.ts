import { describe, it, expect } from "vitest";
import {
  parseLocalIntegrationUrl,
  assertLocalIntegrationTarget
} from "../../scripts/local-integration-guard.js";
const name = `alvitra_ops_rls_${"b".repeat(32)}`;
const url = `postgresql://synthetic:synthetic@127.0.0.1:5432/${name}`;
describe("AC-7009 — destino local exclusivo de integração", () => {
  it.each([url, url.replace("127.0.0.1", "[::1]")])(
    "aceita loopback literal e contexto correto",
    (value) => {
      expect(parseLocalIntegrationUrl(value, "synthetic-local-only", "rls").pathname).toBe(
        `/${name}`
      );
    }
  );
  it.each([
    undefined,
    "invalid",
    url.replace("127.0.0.1", "localhost"),
    url.replace("127.0.0.1", "example.org"),
    url.replace("postgresql:", "https:"),
    `${url}?sslmode=disable`,
    `${url}#fragment`,
    url.replace(name, "postgres"),
    url.replace("_rls_", "_worker_")
  ])("recusa URL fora do ensaio sem revelar conteúdo", (value) => {
    expect(() => parseLocalIntegrationUrl(value, "synthetic-local-only", "rls")).toThrow(
      "Integração local exige"
    );
  });
  it("confirmação e marcador são obrigatórios", async () => {
    expect(() => parseLocalIntegrationUrl(url, undefined, "rls")).toThrow();
    const client = {
      query: async () => ({ rows: [{ name, purpose: "rls", data_policy: "synthetic-local-only" }] })
    };
    await expect(assertLocalIntegrationTarget(client as never, "rls")).resolves.toBeUndefined();
    for (const rows of [
      [],
      [{ name: "postgres", purpose: "rls", data_policy: "synthetic-local-only" }],
      [{ name, purpose: "worker", data_policy: "synthetic-local-only" }],
      [{ name, purpose: "rls", data_policy: "real" }],
      [...Array(2)].map(() => ({ name, purpose: "rls", data_policy: "synthetic-local-only" }))
    ])
      await expect(
        assertLocalIntegrationTarget({ query: async () => ({ rows }) } as never, "rls")
      ).rejects.toThrow();
    await expect(
      assertLocalIntegrationTarget(
        {
          query: async () => {
            throw new Error("PRIVATE");
          }
        } as never,
        "rls"
      )
    ).rejects.toThrow("Marcador do banco local sintético incompatível");
  });
});
