import { describe, expect, it } from "vitest";
import { chatSessionConnectionString } from "../../apps/api/answers/chat-session-connection.js";

describe("conexão de sessão para a guarda do chat", () => {
  it("usa endpoint direto Neon conservando banco, usuário e TLS", () => {
    const source = new URL(
      "postgresql://synthetic:synthetic_only@ep-test-pooler.sa-east-1.aws.neon.tech/synthetic?sslmode=verify-full"
    );
    const target = new URL(chatSessionConnectionString(source.toString()));
    expect(target.hostname).toBe("ep-test.sa-east-1.aws.neon.tech");
    expect(target.pathname).toBe(source.pathname);
    expect(target.username).toBe(source.username);
    expect(target.password).toBe(source.password);
    expect(target.search).toBe(source.search);
  });
  it("usa modo de sessão Supabase e conserva conexão PostgreSQL local", () => {
    expect(
      new URL(
        chatSessionConnectionString(
          "postgresql://aws-0-region.pooler.supabase.com:6543/postgres?sslmode=verify-full"
        )
      ).port
    ).toBe("5432");
    expect(
      new URL(
        chatSessionConnectionString(
          "postgresql://db.project.supabase.co:6543/postgres?sslmode=verify-full"
        )
      ).port
    ).toBe("5432");
    expect(chatSessionConnectionString("postgresql://localhost:5432/synthetic")).toBe(
      "postgresql://localhost:5432/synthetic"
    );
  });
  it.each([
    ["aws-0-region.pooler.supabase.com", ""],
    ["aws-0-region.pooler.supabase.com", "5432"],
    ["aws-0-region.pooler.supabase.com", "6543"],
    ["db.project.supabase.co", ""],
    ["db.project.supabase.co", "5432"],
    ["db.project.supabase.co", "6543"]
  ])("AC-7807: sessão Supabase %s:%s é idempotente e conserva opções", (host, port) => {
    const source = new URL(
      `postgresql://synthetic:synthetic%21@${host}${port ? `:${port}` : ""}/synthetic?sslmode=verify-full&application_name=synthetic`
    );
    const result = chatSessionConnectionString(source.toString());
    const target = new URL(result);
    expect(target.port).toBe("5432");
    expect(target.hostname).toBe(source.hostname);
    expect(target.username).toBe(source.username);
    expect(target.password).toBe(source.password);
    expect(target.pathname).toBe(source.pathname);
    expect(target.search).toBe(source.search);
    expect(chatSessionConnectionString(result)).toBe(result);
  });
  it.each([
    "inválida",
    "https://example.com",
    "postgresql://unknown-pooler.example/synthetic",
    "postgresql://unknown-pooler.example:6543/synthetic"
  ])("recusa formato ou pool transacional desconhecido: %s", (value) => {
    expect(() => chatSessionConnectionString(value)).toThrow();
  });
});
