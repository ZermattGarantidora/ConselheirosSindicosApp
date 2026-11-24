import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("configuração inicial pela conversa", () => {
  it("AC-2701 e AC-2703: a entrada identifica o acesso e a Alvitra pergunta o nome", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(app).toContain('requestSetupMessage({ stage: "welcome" }, selectedIdentity)');
    expect(app).toContain('setupStage === "manager_name"');
    expect(app).toContain("rememberDevelopmentManagerName");
    expect(app).toContain('conversationFetch("/v1/chat/setup-turn"');
    expect(app).toContain('headers.set("x-conversation-request-id", receipt)');
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
      /\.assistant-message\s*\{[\s\S]*?border-left:\s*2px solid rgba\(var\(--alvitra-indigo-rgb\), 0\.58\);[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/u
    );
    expect(styles).toMatch(
      /\.assistant-message > p,\s*\.answer-guidance\s*\{[^}]*font-family:\s*var\(--font-display\);[^}]*font-size:\s*clamp\(18\.9px, 2\.7vw, 25\.2px\);/u
    );
    expect(styles).toMatch(/\.user-message\s*\{[\s\S]*?background:\s*var\(--alvitra-primary\);/u);
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

  it("AC-2404: comunica documentos essenciais sem criar uma etapa obrigatória de upload", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const setup = await readFile("apps/api/answers/setup-message.ts", "utf8");

    expect(setup).toContain("enviar os documentos relevantes é essencial");
    expect(setup).toContain("sem eles, fica difícil oferecer essa ajuda");
    expect(setup).toContain("Convide a pessoa a enviar o material pela conversa");
    expect(setup).toContain("sem minimizar sua importância, oferecer adiamento espontâneo");
    expect(setup).not.toContain("não precisa enviar");
    expect(setup).not.toContain("pode enviá-los aos poucos, depois");
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
