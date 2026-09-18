import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("navegação móvel entre condomínios", () => {
  it("AC-310: apresenta propósito e caminhos de acesso antes do login", async () => {
    const [app, styles] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/styles.css", "utf8")
    ]);

    expect(app).toContain('useState<View>("landing")');
    expect(app).toContain('className="landing-page"');
    expect(app).toContain("Encontre a regra certa para tomar a próxima decisão.");
    expect(app).toContain('"Entrar"');
    expect(app).toContain("Criar minha conta");
    expect(app).not.toContain("Entrar na demonstração");
    expect(app).not.toContain("Ambiente de demonstração");
    expect(app).toContain("Seus documentos ficam separados por condomínio");
    expect(app).toContain(
      'setAuthMode((current) => (current === "unknown" ? "development" : current))'
    );
    expect(app).toContain("Voltar para a apresentação");
    expect(styles).toContain(".landing-page");
    expect(styles).toContain(".landing-actions");
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.landing-hero\s*\{[\s\S]*?align-content:\s*start;/u
    );
  });

  it("AC-309: exibe a seta de retorno em telas estreitas e abre o seletor", async () => {
    const [app, styles] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/styles.css", "utf8")
    ]);

    expect(app).toContain('className="mobile-chat-back"');
    expect(app).toContain('aria-label="Voltar para condomínios"');
    expect(app).toMatch(/className="mobile-chat-back"[\s\S]*?onClick=\{openCondominiumPicker\}/u);
    expect(app).toContain('<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">');
    expect(app).toContain('window.matchMedia("(max-width: 720px)").matches');
    expect(app).toMatch(
      /if \(authMode === "real" \|\| window\.matchMedia\("\(max-width: 720px\)"\)\.matches\)/u
    );
    expect(app).toMatch(/setAuthUser\(body\.user\);[\s\S]*?setView\("condominiums"\);/u);
    expect(app).toContain("Nenhum grupo autorizado ainda");
    expect(app).toContain('className="mobile-account-button"');
    expect(app).toContain('className="return-login-button"');
    expect(app).not.toContain("Continuar com Google");
    expect(app).not.toContain('window.location.assign("/v1/auth/google")');
    expect(app).not.toContain('className="google-button"');
    expect(app).toMatch(
      /className="return-login-button"[\s\S]*?onClick=\{\(\) => void logoutAccount\(\)\}/u
    );
    expect(styles).toContain(".return-login-button");

    const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 720px)"));
    expect(mobileStyles).toMatch(
      /\.chat-header > \.mobile-chat-back\s*\{[\s\S]*?display:\s*grid;/u
    );
    expect(mobileStyles).toMatch(/\.mobile-chat-back svg\s*\{[\s\S]*?display:\s*block;/u);
    expect(mobileStyles).toMatch(
      /\.chat-header > button:not\(\.mobile-chat-back\):not\(\.chat-settings-button\)\s*\{[\s\S]*?display:\s*none;/u
    );
    expect(app).toContain('className="chat-settings-button"');
    expect(app).toContain('aria-label="Configurações do chat"');
    expect(app).toContain('setView("chat-settings")');
    expect(app).toContain("Sair da gestão e apagar condomínio");
    expect(app).toContain("Apagar condomínio?");
    expect(app).toContain("Esta ação apaga permanentemente o condomínio selecionado");
    expect(app).toContain('context?.role !== "manager"');
    expect(app).toContain("/v1/condominiums/${encodeURIComponent(condominiumId)}");
  });
});
