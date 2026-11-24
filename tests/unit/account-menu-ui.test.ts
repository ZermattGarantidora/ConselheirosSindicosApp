import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("menu contextual da conta", () => {
  it("AC-4401/4403 e AC-1904: separa carteira à esquerda, documentos e Perfil à direita e inclui pela conversa", async () => {
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
    expect(app).toContain("await signOut(authMode, getBrowserStorage(), fetch, accessCodeEnabled)");
    expect(app).toContain("<AccessCodeConnection />");
    expect(app).toContain("window.location.reload()");
  });

  it("AC-1902: carrega a lista autorizada e revalida a troca", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    expect(app).toContain('fetch("/v1/chat/condominiums"');
    expect(app).toContain("function switchCondominium(item: CondominiumListItem)");
    expect(app).toContain("/context`");
  });

  it("AC-4403/4404: busca só o catálogo ativo e oferece biblioteca organizada", async () => {
    const [app, library] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/DocumentLibrary.tsx", "utf8")
    ]);
    expect(app).toContain("loadCondominiumDocuments(");
    expect(app).toContain("scopedLibraryDocuments(");
    expect(app).not.toContain("documentLists.flat()");
    expect(app).toContain("controller.abort();");
    expect(app).toContain("if (controller.signal.aborted) return;");
    expect(app).toContain("Melhor visualização");
    expect(app).toContain("<DocumentLibrary");
    expect(library).toContain("documentCategories.map");
    expect(library).toContain("documentValidityLabel(document.validityStatus)");
  });

  it("AC-4401/4403: condomínio abre seus chats na esquerda e a direita preserva só documentos e Perfil", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const right = app.slice(app.indexOf("{accountMenuOpen ? ("), app.indexOf('id="chat-sidebar"'));
    const left = app.slice(app.indexOf('id="chat-sidebar"'), app.indexOf("{sidebarOpen ? ("));
    expect(right).not.toContain("condominiums.map");
    expect(right).toContain("Documentos enviados");
    expect(right).toContain('setAccountMenuView("profile")');
    expect(left).toContain("condominiums.map");
    expect(left).toContain("switchCondominium(item)");
    expect(left).toContain("sidebarCondominiumId === context?.condominiumId");
    expect(left).toContain("chats.map");
    expect(left).toContain("Todos os condomínios");
    expect(left).toContain("inert={!sidebarOpen}");
    expect(app).not.toContain("current-condominium-menu-item");
    expect(app).not.toContain("Ver documentos deste condomínio");
    expect(app).not.toContain("Ver condomínios");
    expect(app).toContain("Documentos enviados");
    const styles = await readFile("apps/web/styles.css", "utf8");
    const menuStart = styles.indexOf(".account-menu {");
    const menu = styles.slice(menuStart, styles.indexOf("\n}", menuStart) + 2);
    expect(menu).toContain("bottom: 0;");
    expect(menu).toContain("flex-direction: column;");
    expect(menu).toContain("overflow-y: auto;");
    expect(menu).not.toContain("max-height:");
    expect(styles).toContain(".condominium-directory-item.is-selected");
    expect(styles).toContain(".document-library::backdrop");
    expect(styles).toContain(".profile-sign-out {");
    expect(styles).toContain("background: #be3e3c;");
    expect(styles).toContain("color: #fff;");
  });

  it("AC-4402: só limpa o contexto anterior depois de autorização e chats carregados", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const change = app.slice(
      app.indexOf("async function switchCondominium("),
      app.indexOf("async function requestSetupMessage(")
    );
    expect(change.indexOf("preserveActiveTurn();")).toBeGreaterThan(
      change.indexOf("await openChatSession")
    );
    for (const operation of [
      'setQuestion("")',
      "setSetupMessages([])",
      "setSetupChatId(undefined)",
      "setDocumentCatalog(undefined)",
      "setDocumentLibraryOpen(false)"
    ])
      expect(change).toContain(operation);
    expect(app).toContain("setViewedDocument(undefined)");
    expect(app).toContain("setPendingChatDocuments([])");
    expect(app).toContain("setDocumentConversationMessages([])");
  });
});
