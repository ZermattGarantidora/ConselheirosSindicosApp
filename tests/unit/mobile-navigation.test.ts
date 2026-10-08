import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("navegação móvel entre condomínios", () => {
  it("AC-610: apresenta propósito e caminhos de acesso antes do login", async () => {
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
    expect(app).toContain('authMode === "development"');
    expect(app).toContain("Acesse o ambiente de teste.");
    expect(app).toContain("Ambiente de demonstração");
    expect(app).not.toContain(
      "Seus documentos ficam separados por condomínio e só aparecem para quem tem autorização."
    );
    expect(app).toContain('className="landing-evidence"');
    expect(app).toContain("Você vê a resposta e de onde ela veio.");
    expect(app).not.toContain('className="landing-proof"');
    expect(app).toContain('fetch("/v1/runtime", { cache: "no-store"');
    expect(app).toContain("if (!runtimeRequestActive) return;");
    expect(app).toContain("runtimeRequestActive = false;");
    expect(app).toContain('setAuthMode("unavailable")');
    expect(app).not.toContain('setAuthMode("development")');
    expect(app).toContain("Voltar para a apresentação");
    expect(styles).toContain(".landing-page");
    expect(styles).toContain(".landing-actions");
    expect(styles).toContain(".landing-evidence");
    expect(styles).not.toMatch(/\.landing-proof\s*\{/u);
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.landing-evidence\s*\{[\s\S]*?display:\s*none;/u
    );
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
    expect(app).toMatch(/setAuthUser\(body\.user\);[\s\S]*?loadAuthorizedCondominiums\(\);/u);
    expect(app).toContain('className="landing-session-button"');
    expect(app).toContain("Continuar como");
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
    expect(app).toContain('aria-label="Configurações do condomínio"');
    const settingsIconStart = app.indexOf("function SettingsIcon()");
    const settingsIconEnd = app.indexOf("function CheckIcon()", settingsIconStart);
    const settingsIcon = app.slice(settingsIconStart, settingsIconEnd);
    expect(settingsIcon).toContain('<circle cx="12" cy="12" r="3" />');
    const finalMobileStyles = styles.slice(styles.lastIndexOf("@media (max-width: 720px)"));
    expect(finalMobileStyles).toMatch(
      /\.chat-header > \.chat-settings-button\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/u
    );
    expect(finalMobileStyles).toMatch(
      /\.chat-header > \.chat-settings-button \.ui-icon\s*\{[\s\S]*?width:\s*22px;[\s\S]*?height:\s*22px;/u
    );
    expect(app).toContain('setView("chat-settings")');
    expect(app).toContain("Sair da gestão e apagar condomínio");
    expect(app).toContain("Apagar condomínio?");
    expect(app).toContain("Esta ação apaga permanentemente o condomínio selecionado");
    expect(app).toContain('context?.role !== "manager"');
    expect(app).toContain("/v1/condominiums/${encodeURIComponent(condominiumId)}");
  });

  it("AC-315: divide chat e condomínios no desktop e mantém o chat inteiro no mobile", async () => {
    const [app, styles] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/styles.css", "utf8")
    ]);

    expect(app).toContain('className="desktop-sidebar"');
    expect(app).toContain('className="chat-shell"');
    expect(app).toContain('aria-label="Ocultar lista de condomínios"');
    expect(app).toContain('aria-label="Mostrar lista de condomínios"');
    expect(app).toContain("setDesktopSidebarOpen(false)");
    expect(app).toContain("setDesktopSidebarOpen(true)");
    expect(app).toContain(
      'className={`chat-page${desktopSidebarOpen ? "" : " sidebar-collapsed"}`}'
    );
    expect(app).toMatch(
      /className=\{item\.id === context\?\.condominiumId \? "active" : ""\}[\s\S]*?selectCondominium\(item\.id\)/u
    );

    expect(styles).toMatch(
      /\.chat-page\s*\{[\s\S]*?grid-template-columns:\s*minmax\(292px, 328px\) minmax\(0, 1fr\);/u
    );
    expect(styles).toMatch(
      /\.chat-page\.sidebar-collapsed\s*\{[\s\S]*?grid-template-columns:\s*0 minmax\(0, 1fr\);/u
    );
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.desktop-sidebar\s*\{[\s\S]*?display:\s*none;/u
    );
  });

  it("mantém a caixa de pergunta legível em telas móveis estreitas", async () => {
    const styles = await readFile("apps/web/styles.css", "utf8");
    const mobileStyles = styles.slice(styles.lastIndexOf("@media (max-width: 720px)"));

    expect(mobileStyles).toMatch(
      /\.composer textarea\s*\{[\s\S]*?min-height:\s*64px;[\s\S]*?line-height:\s*1\.4;/u
    );
    expect(mobileStyles).toMatch(
      /\.composer button\s*\{[\s\S]*?width:\s*50px;[\s\S]*?height:\s*50px;/u
    );
  });

  it("AC-316: mantém documentos e ações acessíveis durante o cadastro", async () => {
    const [app, styles] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/styles.css", "utf8")
    ]);
    const redesignStyles = styles.slice(styles.indexOf("/* Redesign responsivo"));

    expect(redesignStyles).toMatch(
      /\.document-card\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*90px;/u
    );
    expect(redesignStyles).toMatch(
      /\.registration-actions\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*18px;/u
    );
    expect(redesignStyles).toMatch(/\.registration-form\s*\{[\s\S]*?padding-bottom:\s*142px;/u);
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.document-card\s*\{[\s\S]*?position:\s*static;/u
    );
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.registration-actions\s*\{[\s\S]*?width:\s*auto;[\s\S]*?transform:\s*none;/u
    );
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.registration-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);[\s\S]*?justify-content:\s*stretch;/u
    );
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.registration-actions > div\s*\{[\s\S]*?width:\s*100%;/u
    );
    expect(app).toContain('className="registration-submit-label-mobile"');
    expect(app).toContain("Criar condomínio</span>");
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.registration-submit-label-desktop\s*\{[\s\S]*?display:\s*none;/u
    );
    expect(redesignStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.registration-submit-label-mobile\s*\{[\s\S]*?display:\s*inline;/u
    );
  });

  it("AC-908: abre um perfil enxuto com saída da conta", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const profileStart = app.indexOf('if (view === "profile")');
    const profileEnd = app.indexOf('if (view === "chat-settings")');
    const profile = app.slice(profileStart, profileEnd);

    expect(app).toContain('| "profile"');
    expect(app).toContain('onClick={() => openProfile("chat")}');
    expect(app).toContain('onClick={() => openProfile("condominiums")}');
    expect(profile).toContain("Conta e acesso");
    expect(profile).toContain("PERFIL ATUAL");
    expect(profile).toContain("Sessão atual");
    expect(profile).toContain("Sair da conta");
    expect(profile).not.toContain("Preferências essenciais");
    expect(profile).not.toContain("Mostrar histórico");
    expect(profile).not.toContain("Lembrete de evidências");
    expect(profile).not.toContain("CONDOMÍNIO ATIVO");
    expect(profile).not.toContain("Abrir configurações do condomínio");
    expect(profile).not.toContain("Apagar condomínio");
  });

  it("AC-909 e AC-910: mostra o catálogo e permite adicionar PDFs nas configurações", async () => {
    const [app, styles] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/styles.css", "utf8")
    ]);

    expect(app).toContain("Configurações do condomínio");
    expect(app).toContain("Documentos registrados");
    expect(app).toContain("Adicionar documentos");
    expect(app).toContain("Mover para lixeira");
    expect(app).toContain("Documentos recuperáveis");
    expect(app).toContain("Prontos para adicionar");
    expect(app).toContain("Mover para a lixeira?");
    expect(app).toContain("setDocumentRemovalCandidate(document)");
    expect(app).toContain("loadRegisteredDocuments(context.condominiumId)");
    expect(app).toContain("/v1/condominiums/${encodeURIComponent(id)}/documents");
    expect(app).toContain('accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"');
    expect(app).toContain("multiple");
    expect(app).toContain('context?.permissions.includes("document:upload")');
    expect(app).toContain("settingsDocumentsConfirmed");
    expect(app).toContain("!settingsDocumentsConfirmed");
    expect(app).toContain("URL.createObjectURL(file)");
    expect(app).toContain("VISUALIZAÇÃO SEGURA");
    expect(app).not.toContain("window.open(");
    expect(styles).toContain(".document-catalog-list");
    expect(styles).toContain(".document-preview-dialog");
    expect(styles).toContain(".settings-document-picker");
    expect(styles).toContain(".settings-selected-documents-panel");
    expect(styles).toContain(".document-recovery-notice");
    expect(styles).toContain(".document-removal-dialog");
    expect(styles).toContain(".settings-document-submit");
  });

  it("AC-410 e AC-411: distingue orientação geral e destaca fontes documentais", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain('answer.answerMode !== "grounded"');
    expect(app).toContain("showResponseGuidance");
    expect(app).toContain("consulta os documentos primeiro e separa orientação geral");
    expect(app).toContain("Fontes da resposta");
    expect(app).toContain("· página {citation.page} · abrir trecho");
    expect(app).toContain('citation.sourceScope === "legislation"');
    expect(app).toContain('"Legislação oficial"');
    expect(app).toContain("setSelectedCitation(citation)");
  });
});
