import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("turnos do chat", () => {
  it("AC-1604: preserva histórico e limpa a resposta anterior antes da nova pergunta", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const askStart = app.indexOf("async function askQuestion()");
    const askEnd = app.indexOf("function sendComposer", askStart);
    const askQuestion = app.slice(askStart, askEnd);

    expect(askQuestion).toContain("saveTurn(previousTurn);");
    expect(askQuestion).toContain("setAnswer(undefined);");
    expect(askQuestion.indexOf("setAnswer(undefined);")).toBeLessThan(
      askQuestion.indexOf("setBusy(true);")
    );
    expect(app).toContain("conversationHistory.map((entry)");
    expect(app).toContain("isSimpleConversationMessage(submittedQuestion)");
  });

  it("mantém limitações, próximos passos, especialista e fontes verificáveis", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("isRelevantServiceDegradation(point)");
    expect(app).toContain('<div className="answer-guidance">');
    expect(app).toContain("answer.suggestedNextStep");
    expect(app).toContain("answer.specialist.required");
    expect(app).toContain("Fontes da resposta");
    expect(app).toContain('selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"');
    expect(app).toContain('selectedCitation.sourceRemoved ? "Original removido · " : "Versão "');
  });
});
