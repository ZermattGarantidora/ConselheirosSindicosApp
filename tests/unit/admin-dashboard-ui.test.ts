import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("interface administrativa da Zermatt", () => {
  it("oferece os indicadores, o diretório mínimo de contas e a saída", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const start = app.indexOf('if (view === "admin-dashboard")');
    const end = app.indexOf('if (view === "onboarding")', start);
    const dashboard = app.slice(start, end);

    expect(dashboard).toContain("Sinais essenciais do produto");
    expect(dashboard).toContain("CONTAS ATIVAS");
    expect(dashboard).toContain("NOVOS CADASTROS");
    expect(dashboard).toContain("ACESSO RECENTE");
    expect(dashboard).toContain("CONTAS CADASTRADAS");
    expect(dashboard).toContain("adminDashboard.accounts");
    expect(dashboard).toContain("account.displayName");
    expect(dashboard).toContain("account.email");
    expect(dashboard).toContain("Coleta desativada");
    expect(dashboard).toContain("void logoutAccount()");
    expect(dashboard).not.toContain("/v1/condominiums");
    expect(dashboard).not.toContain("documentId");
    expect(dashboard).not.toContain("questionId");
    expect(dashboard).not.toContain("mailto:");
    expect(dashboard).not.toMatch(/condomínio|documento|pergunta|resposta/iu);
  });

  it("mantém cards responsivos, ícones centralizados e ações acessíveis", async () => {
    const styles = await readFile("apps/web/styles.css", "utf8");
    expect(styles).toContain(".admin-metric-icon");
    expect(styles).toMatch(/\.admin-metric-icon\s*\{[\s\S]*?place-items:\s*center/u);
    expect(styles).toMatch(
      /\.admin-account-directory li > span\s*\{[\s\S]*?place-items:\s*center/u
    );
    expect(styles).toMatch(/\.admin-dashboard-header > button\s*\{[\s\S]*?min-height:\s*44px/u);
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.admin-metric-grid,[\s\S]*?grid-template-columns:\s*1fr/u
    );
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.admin-account-directory ul\s*\{[\s\S]*?grid-template-columns:\s*1fr/u
    );
  });
});
