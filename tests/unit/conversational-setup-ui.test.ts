import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  buildInitialCondominiumNamePrompt,
  buildSetupCompletionMessage
} from "../../apps/web/setup-conversation.js";

describe("configuração inicial pela conversa", () => {
  it("AC-2402: a primeira mensagem parte da Alvitra e pergunta como chamar a pessoa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(app).toContain("Que bom ter você por aqui");
    expect(app).toContain("como você prefere ser chamado(a)?");
    expect(app).toContain("Quantos condomínios você administra hoje?");
    expect(app).toContain('role: "assistant"');
    expect(app).not.toContain('className="setup-message-heading"');
    expect(app).not.toContain("function AlvitraMark");
    expect(styles).toMatch(/\.assistant-message\s*\{[\s\S]*?background:\s*transparent;/u);
    expect(styles).toMatch(
      /\.setup-message::before,[\s\S]*?content:\s*"ALVITRA";[\s\S]*?\.answer-message/u
    );
    expect(styles).toMatch(
      /\.setup-message\s*\{[\s\S]*?padding-block:\s*10px;[\s\S]*?\.setup-message > p\s*\{[\s\S]*?font-family:\s*var\(--font-display\);/u
    );
    expect(styles).toMatch(/\.user-message\s*\{[\s\S]*?background:\s*var\(--alvitra-indigo\);/u);
    expect(app).toContain("type SetupStage =");
    expect(app).toContain('"manager_name"');
    expect(app).toContain('"condominium_count"');
  });

  it("AC-2403: adapta a configuração à quantidade de condomínios", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(buildInitialCondominiumNamePrompt(1)).toBe("Ótimo. Qual é o nome do seu condomínio?");
    expect(buildInitialCondominiumNamePrompt(1)).not.toContain("um por vez");
    expect(buildInitialCondominiumNamePrompt(1)).not.toContain("1 de 1");
    expect(buildInitialCondominiumNamePrompt(3)).toBe(
      "Ótimo. Vamos configurar um por vez. Qual é o nome do condomínio 1 de 3?"
    );
    expect(buildSetupCompletionMessage(1, "Ana")).toContain(
      "Já tenho o contexto inicial desse condomínio"
    );
    expect(buildSetupCompletionMessage(1, "Ana")).not.toContain("dos seus condomínios");
    expect(buildSetupCompletionMessage(3, "Ana")).toContain(
      "Já tenho o contexto inicial dos seus condomínios"
    );
    expect(app).toContain("buildInitialCondominiumNamePrompt(total)");
    expect(app).toContain("Quantos apartamentos ou unidades há no");
    expect(app).toContain("setupCondominiumIndex < setupCondominiumTotal");
    expect(app).toContain("createCondominiumFromSetup(setupCondominiumName, unitCount)");
  });

  it("AC-2404: documentos não fazem parte do cadastro e o benefício de contexto fica claro", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const completionMessage = buildSetupCompletionMessage(1, "Ana");

    expect(completionMessage).toContain(
      "Você não precisa enviar nenhum documento para usar a Alvitra"
    );
    expect(completionMessage).toContain("eu consigo dar respostas mais precisas e fundamentadas");
    expect(app).not.toMatch(/type SetupStage\s*=[^;]+"documents"/u);
    expect(app).toContain('setupStage !== "complete"');
  });

  it("AC-2407: retoma o contexto configurado sem reiniciar o cadastro ou mostrar perguntas prontas", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain('setSetupStage("complete")');
    expect(app).toContain('id: "returning-welcome"');
    expect(app).toContain("O que você precisa resolver hoje?");
    expect(app).not.toContain("suggestedQuestions");
    expect(app).not.toContain('aria-label="Perguntas sugeridas"');
  });
});
