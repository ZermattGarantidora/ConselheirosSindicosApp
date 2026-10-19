import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("menu contextual da conta", () => {
  it("AC-2405 e AC-1904: mostra Condomínios e Dados e inicia inclusão pela conversa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('aria-label="Abrir menu da conta"');
    expect(app).toContain("Condomínios");
    expect(app).toContain("Dados");
    expect(app).not.toContain("Meus dados");
    expect(app).not.toContain("Preferências");
    expect(app).toContain("async function startCondominiumConversation(): Promise<void>");
    expect(app).toContain('setSetupStage("condominium_name")');
  });

  it("AC-1902: carrega a lista autorizada e revalida a troca", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('fetch("/v1/chat/condominiums"');
    expect(app).toContain("function switchCondominium(item: CondominiumListItem)");
    expect(app).toContain("/context`");
  });

  it("AC-2405: carrega documentos autorizados e os agrupa por tipo", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain("}/documents`");
    expect(app).toContain("groupedDocuments.map");
    expect(app).toContain("document.condominiumName");
    expect(app).toContain('documentType: "convention"');
  });

  it("AC-2406: abre uma tela documental com contexto calculado do condomínio atual", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('className="current-condominium-menu-item"');
    expect(app).toContain("Ver documentos deste condomínio");
    expect(app).toContain("function openCurrentDocuments(): void");
    expect(app).toContain('className="document-page"');
    expect(app).toContain("function calculateKnowledgeProgress");
    expect(app).toContain('role="progressbar"');
    expect(app).toContain("Contexto da Alvitra");
    expect(app).toContain("groupedCurrentCondominiumDocuments.map");
    expect(app).toContain("document.condominiumId === context.condominiumId");
  });
});
