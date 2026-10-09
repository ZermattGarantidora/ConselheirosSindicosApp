import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("experiência de chat único", () => {
  it("AC-1601 e AC-1606: abre direto no chat e remove experiências paralelas", async () => {
    const [app, main] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/main.tsx", "utf8")
    ]);

    expect(app).toContain('<main className="chat-page">');
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
    expect(app).not.toContain("Criar condomínio");
    expect(app).not.toContain("Configurações do condomínio");
    expect(app).not.toContain("admin-dashboard");
    expect(main).toContain("<App />");
    expect(main).not.toContain("SyntheticReview");
    expect(main).not.toContain("synthetic-review");
  });

  it("AC-1607: mantém conversa e compositor utilizáveis no celular", async () => {
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(styles).toMatch(
      /\.chat-page\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/u
    );
    expect(styles).toMatch(/@media \(max-width: 680px\)/u);
    expect(styles).toMatch(/\.login-entry-button\s*\{[\s\S]*?min-height:\s*40px;/u);
    expect(styles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.composer textarea\s*\{[\s\S]*?min-height:\s*50px;[\s\S]*?line-height:\s*1\.4;/u
    );
    expect(styles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.attach-button,[\s\S]*?\.send-button\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/u
    );
  });
});
