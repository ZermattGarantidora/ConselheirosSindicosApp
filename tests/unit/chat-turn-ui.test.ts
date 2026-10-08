import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("turnos do chat", () => {
  it("AC-026: remove a resposta anterior antes de aguardar a pergunta nova", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const askStart = app.indexOf("async function askQuestion()");
    const askEnd = app.indexOf("async function submitFeedback", askStart);
    const askQuestion = app.slice(askStart, askEnd);

    expect(askQuestion).toContain("playMessageSentSound();");
    expect(askQuestion).toContain("playAnswerReceivedSound();");
    expect(askQuestion.indexOf("playAnswerReceivedSound();")).toBeGreaterThan(
      askQuestion.indexOf("if (!response.ok)")
    );
    expect(askQuestion).toContain("setConversationHistory((current) => [");
    expect(askQuestion).toContain("setAnswer(undefined);");
    expect(askQuestion.indexOf("setAnswer(undefined);")).toBeLessThan(
      askQuestion.indexOf("setBusy(true);")
    );
    expect(app).toContain("(pendingChatDocument === undefined && question.trim().length === 0)");
  });

  it("mantém sons diferentes de envio e resposta sem bloquear o chat", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const sendStart = app.indexOf("function playMessageSentSound()");
    const responseStart = app.indexOf("function playAnswerReceivedSound()");
    const soundEnd = app.indexOf("export function App()", responseStart);
    const sendSound = app.slice(sendStart, responseStart);
    const responseSound = app.slice(responseStart, soundEnd);

    expect(app).toContain("chatAudioContext ??= new AudioContext()");
    expect(sendSound).toContain("startedAt + 0.12");
    expect(sendSound).toContain("680");
    expect(responseSound).toContain("firstNote");
    expect(responseSound).toContain("secondNote");
    expect(responseSound).toContain("520");
    expect(responseSound).toContain("720");
    expect(responseSound).not.toContain("680");
    expect(responseSound).toContain("} catch {");
  });

  it("AC-028 e AC-510: mostra apenas detalhes essenciais no mesmo cartão", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("isSimpleConversationMessage(submittedQuestion)");
    expect(app).toContain('answer.answerMode !== "grounded"');
    expect(app).toContain("isRelevantServiceDegradation(point)");
    expect(app).toContain('<div className="answer-guidance">');
    expect(app).toContain("visibleAttentionPoints.map");
    expect(app).not.toContain(
      '<section className="assistant-message detail-message attention-box">'
    );
    expect(app).not.toContain('<section className="assistant-message detail-message next-step">');
    expect(app).toContain("isConversationalResponse || answer.citations.length === 0 ? null");
    expect(app).toContain("answer-status ${answerStatus.tone}");
    expect(app).not.toContain("RISCO BAIXO");
    expect(app).not.toContain("Com base nos documentos");
    expect(app).not.toContain("Nenhuma fonte é exibida quando falta base documental.");
  });

  it("mantém citações no histórico e identifica quando o PDF original foi removido", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("entry.answer.citations.map((citation) => (");
    expect(app).toContain('"Documento removido do acervo · trecho histórico"');
    expect(app).toContain('selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"');
    expect(app).toContain('selectedCitation.sourceRemoved ? "Original removido · " : "Versão "');
  });
});
