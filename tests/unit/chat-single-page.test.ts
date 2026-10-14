import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("experiência de chat único", () => {
  it("AC-2401: separa a entrada mínima da conversa", async () => {
    const [app, main] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/main.tsx", "utf8")
    ]);

    expect(app).toContain("if (!entered)");
    expect(app).toContain('<main className="login-page">');
    expect(app).toContain(
      'className={`chat-page${conversationStarted ? " has-conversation" : ""}`}'
    );
    expect(app).toContain('setupMessages.some((message) => message.role === "user")');
    expect(app).toContain('aria-label="Conversa com a Alvitra"');
    expect(app).toContain('className="login-entry-button"');
    expect(app).toContain('{entryPending ? "Entrando..." : "Entrar"}');
    expect(app).toContain("onClick={() => void enterConversation()}");
    expect(app).toContain('fetch("/v1/chat/bootstrap"');
    expect(app).toMatch(
      /async function enterConversation\(\): Promise<void> \{[\s\S]*?fetch\("\/v1\/chat\/bootstrap"/u
    );
    expect(app).not.toContain("type View");
    expect(app).not.toContain('useState<View>("landing")');
    expect(app).not.toContain("/v1/auth/");
    expect(app).not.toContain('type="password"');
    expect(app).not.toContain('type="tel"');
    expect(app).toContain("setEntered(true)");
    expect(app).toContain("<MenuIcon />");
    expect(app).not.toContain("admin-dashboard");
    expect(main).toContain("<App />");
    expect(main).not.toContain("SyntheticReview");
    expect(main).not.toContain("synthetic-review");
  });

  it("AC-1607 e AC-2401: mantém entrada, conversa e compositor utilizáveis no celular", async () => {
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(styles).toMatch(
      /\.chat-page\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/u
    );
    expect(styles).toMatch(/\.login-page\s*\{[\s\S]*?min-height:\s*100dvh;/u);
    expect(styles).toMatch(/@media \(max-width: 680px\)/u);
    expect(styles).toContain(".chat-page:not(.has-conversation) .brand-lockup");
    expect(styles).toContain(
      '--font-ui: "Segoe UI Variable Text", Aptos, Inter, "Segoe UI", system-ui, sans-serif;'
    );
    expect(styles).toContain("font-family: var(--font-ui);");
    expect(styles).not.toContain("Cascadia Code");
    expect(styles).toMatch(
      /\.login-card h1\s*\{[\s\S]*?font-family:\s*var\(--font-display\);[\s\S]*?font-weight:\s*500;/u
    );
    expect(styles).toMatch(/\.login-entry-button\s*\{[\s\S]*?min-height:\s*40px;/u);
    expect(styles).toMatch(
      /\.login-entry-button\s*\{[\s\S]*?border-radius:\s*8px;[\s\S]*?background:\s*var\(--alvitra-indigo\);/u
    );
    expect(styles).toMatch(
      /\.login-card\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/u
    );
    expect(styles).toMatch(
      /\.login-card > \.login-entry-button\s*\{[\s\S]*?width:\s*min\(100%, 220px\);[\s\S]*?justify-self:\s*center;/u
    );
    expect(styles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.composer textarea\s*\{[\s\S]*?min-height:\s*50px;[\s\S]*?line-height:\s*1\.4;/u
    );
    expect(styles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.attach-button,[\s\S]*?\.send-button\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/u
    );
  });
});
