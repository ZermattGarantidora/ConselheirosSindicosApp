import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("configuração inicial pela conversa", () => {
  it("AC-2701 e AC-2703: a entrada identifica o acesso e a Alvitra pergunta o nome", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(app).toContain('requestSetupMessage({ stage: "welcome" }, selectedIdentity)');
    expect(app).toContain('setupStage === "manager_name"');
    expect(app).toContain("rememberDevelopmentManagerName");
    expect(app).toContain('fetch("/v1/chat/setup-turn"');
    expect(app).toContain("history: setupMessages.slice(-12)");
    expect(app).not.toContain("parseDevelopmentManagerName(trimmedAnswer)");
    expect(app).not.toContain("parseExplicitDevelopmentManagerName(trimmedAnswer)");
    expect(app).not.toContain("isDevelopmentNameExampleRequest(trimmedAnswer)");
    expect(app).toContain('update.field === "condominium_count"');
    expect(app).toContain('role: "assistant"');
    expect(app).not.toContain("const initialSetupMessage");
    expect(app).not.toContain('className="setup-message-heading"');
    expect(app).not.toContain("function AlvitraMark");
    expect(styles).not.toContain('content: "ALVITRA"');
    expect(styles).toMatch(
      /\.assistant-message\s*\{[\s\S]*?border-left:\s*2px solid rgba\(41, 71, 169, 0\.58\);[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/u
    );
    expect(styles).toMatch(
      /\.setup-message > p\s*\{[\s\S]*?font-family:\s*var\(--font-display\);[\s\S]*?font-size:\s*clamp\(21px, 3vw, 28px\);/u
    );
    expect(styles).toMatch(/\.user-message\s*\{[\s\S]*?background:\s*var\(--alvitra-indigo\);/u);
    expect(app).toContain("type SetupStage =");
    expect(app).toContain("type DevelopmentIdentity");
    expect(app).toContain('"manager_name"');
    expect(app).toContain('"condominium_count"');
    expect(app).not.toContain("managerName: selectedIdentity.displayName");
    expect(app).toContain("<FormattedText text={message.text} />");
  });

  it("AC-2403: adapta a configuração à quantidade de condomínios", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain('update.field === "condominium_count"');
    expect(app).toContain('setSetupStage("condominium_name")');
    expect(app).toContain('update.field === "condominium_name"');
    expect(app).toContain('setSetupStage("unit_count")');
    expect(app).toContain("setupCondominiumIndex < setupCondominiumTotal");
    expect(app).toContain("createCondominiumFromSetup(setupCondominiumName, update.value)");
  });

  it("AC-2404: documentos necessários podem ser enviados depois do cadastro", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const setup = await readFile("apps/api/answers/setup-message.ts", "utf8");

    expect(setup).toContain("não precisa enviar documentos agora");
    expect(setup).toContain("eles são necessários para você conhecer o condomínio");
    expect(setup).toContain("pode enviá-los aos poucos, depois");
    expect(setup).toContain("nunca chame os documentos de opcionais");
    expect(setup).not.toContain("documentos são opcionais");
    expect(app).not.toMatch(/type SetupStage\s*=[^;]+"documents"/u);
    expect(app).toContain('setupStage !== "complete"');
  });

  it("AC-2407: retoma o contexto configurado sem reiniciar o cadastro ou mostrar perguntas prontas", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain('setSetupStage("complete")');
    expect(app).toContain('stage: "returning", managerName: savedProfile.managerName');
    expect(app).not.toContain('id: "returning-welcome"');
    expect(app).not.toContain("suggestedQuestions");
    expect(app).not.toContain('aria-label="Perguntas sugeridas"');
  });
});
