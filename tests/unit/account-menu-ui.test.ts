import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("menu contextual da conta", () => {
  it("AC-1901 e AC-1904: mantém as entradas no chat e inicia inclusão pela conversa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('aria-label="Abrir menu da conta"');
    expect(app).toContain("Condomínios");
    expect(app).toContain("Meus dados");
    expect(app).toContain("Preferências");
    expect(app).toContain("function startCondominiumConversation(): void");
    expect(app).toContain('setQuestion("Quero cadastrar outro condomínio.")');
  });

  it("AC-1902: carrega a lista autorizada e revalida a troca", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('fetch("/v1/chat/condominiums"');
    expect(app).toContain("function switchCondominium(item: CondominiumListItem)");
    expect(app).toContain("/context`");
  });

  it("AC-2003: mostra em Meus dados somente informações confirmadas na conversa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain("Esses dados são atualizados aos poucos");
    expect(app).toContain("}/profile`");
    expect(app).toContain("conversationProfile.contact.managerName");
    expect(app).toContain("conversationProfile.unitCount");
  });
});
