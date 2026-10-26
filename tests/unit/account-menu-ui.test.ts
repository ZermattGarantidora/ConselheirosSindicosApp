import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("menu contextual da conta", () => {
  it("AC-2405 e AC-1904: mostra Condomínios e Perfil e inicia inclusão pela conversa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('aria-label="Abrir menu da conta"');
    expect(app).toContain("Condomínios");
    expect(app).toContain('setAccountMenuView("profile")');
    expect(app).toContain("Perfil");
    expect(app).not.toMatch(/>\s*Dados\s*</u);
    expect(app).not.toContain("Meus dados");
    expect(app).not.toContain("Preferências");
    expect(app).toContain("async function startCondominiumConversation(): Promise<void>");
    expect(app).toContain('setSetupStage("condominium_name")');
  });

  it("AC-2408 a AC-2411: oferece perfil compacto, tema acessível e saída", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('{setupManagerName.trim() || "Seu perfil"}');
    expect(app).toContain('htmlFor="profile-appearance"');
    expect(app).toContain('id="profile-appearance"');
    expect(app).toContain("value={appearance}");
    expect(app).toContain('<option value="light">Claro</option>');
    expect(app).toContain('<option value="dark">Escuro</option>');
    expect(app).toContain('{signOutPending ? "Saindo..." : "Sair da conta"}');
    expect(app).toContain("disabled={signOutPending}");
    expect(app).toContain("await signOut(authMode, getBrowserStorage())");
    expect(app).toContain("window.location.reload()");
  });

  it("AC-1902: carrega a lista autorizada e revalida a troca", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('fetch("/v1/chat/condominiums"');
    expect(app).toContain("function switchCondominium(item: CondominiumListItem)");
    expect(app).toContain("/context`");
  });

  it("AC-2405: carrega documentos autorizados do condomínio selecionado e os agrupa por tipo", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain("}/documents`");
    expect(app).toContain("groupedDocuments.map");
    expect(app).toContain("document.condominiumId === context?.condominiumId");
    expect(app).toContain("document.condominiumName");
    expect(app).toContain('documentType: "convention"');
  });

  it("AC-2406: expande condomínios no menu e aninha documentos no selecionado", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain(
      "const [condominiumsExpanded, setCondominiumsExpanded] = useState(false);"
    );
    expect(app).toContain('aria-controls="condominium-menu-list"');
    expect(app).toContain("const isSelected = item.condominiumId === context?.condominiumId;");
    expect(app).toContain('className={isSelected ? "is-selected" : undefined}');
    expect(app).toContain('aria-current={isSelected ? "true" : undefined}');
    expect(app).toContain('className="condominium-documents-button"');
    expect(app).not.toContain("current-condominium-menu-item");
    expect(app).not.toContain("Ver documentos deste condomínio");
    expect(app).not.toContain("Ver condomínios");
    expect(app).toContain("Documentos enviados");
    expect(app).toContain("document.condominiumName");
    const styles = await readFile("apps/web/styles.css", "utf8");
    const menu = styles.slice(styles.indexOf(".account-menu {"), styles.indexOf(".profile-menu {"));
    expect(menu).toContain("bottom: 0;");
    expect(menu).toContain("flex-direction: column;");
    expect(menu).toContain("overflow-y: auto;");
    expect(menu).not.toContain("max-height:");
    expect(styles).toContain(".condominium-menu-item > button.is-selected");
    expect(styles).toContain(".condominium-documents-button");
    expect(styles).toContain(".profile-sign-out {");
    expect(styles).toContain("background: #be3e3c;");
    expect(styles).toContain("color: #fff;");
  });
});
