import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerMessage } from "../../apps/web/App.js";

import { describe, expect, it } from "vitest";

import {
  getAnswerStatusPresentation,
  isAutomaticDocumentaryLimitation
} from "../../apps/web/answer-presentation.js";

describe("turnos do chat", () => {
  it("AC-2414: preserva a tipografia grande em todas as falas, sem reduzir respostas e orientações", async () => {
    const [styles, app, confirmation] = await Promise.all([
      readFile("apps/web/styles.css", "utf8"),
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/document-condominium-confirmation.tsx", "utf8")
    ]);

    expect(styles).toMatch(
      /\.assistant-message > p,\s*\.answer-guidance\s*\{[^}]*font-family:\s*var\(--font-display\);[^}]*font-size:\s*clamp\(18\.9px, 2\.7vw, 25\.2px\);[^}]*line-height:\s*1\.42;[^}]*overflow-wrap:\s*anywhere;/u
    );
    expect(styles).not.toMatch(
      /(?:^|\n\n)\.(?:setup-message > p|answer-copy|answer-guidance(?: p)?)\s*\{[^}]*(?:font(?:-family|-size)?|line-height|letter-spacing):/u
    );
    expect(app).toContain('className="assistant-message setup-message"');
    expect(app).toContain('className="assistant-message answer-message"');
    expect(app).toContain('<article className="assistant-message" key={message.id}>');
    expect(app).toContain('className="answer-copy"');
    expect(confirmation).toContain('className="assistant-message document-confirmation-message"');
    expect(styles).toMatch(/\.user-message\s*\{[^}]*font-size:\s*14\.5px;/u);
    expect(styles).toMatch(/\.error-message p,\s*\.system-message p\s*\{[^}]*font-size:\s*12px;/u);
  });

  it("AC-2610: conversa sem rótulos mecânicos preserva ressalva específica, próximo passo, especialista e fontes", () => {
    const html = renderToStaticMarkup(
      createElement(AnswerMessage, {
        question: "Posso aprovar a despesa?",
        onSelectCitation: () => {},
        answer: {
          answer:
            "Achei valores diferentes nos dois documentos; preciso conferir qual é o correto.",
          answerMode: "conflict",
          attentionPoints: [
            "Os trechos encontrados não sustentam uma resposta documental segura. A orientação abaixo é geral e não confirma uma regra do condomínio.",
            "O orçamento não inclui a troca das peças."
          ],
          suggestedNextStep: "Peça ao fornecedor o valor com as peças incluídas.",
          specialist: {
            required: true,
            type: "contador",
            reason: "Essa diferença pode alterar o saldo disponível."
          },
          answerId: "a1",
          questionId: "q1",
          condominiumId: "alameda",
          riskClass: "high",
          createdAt: "2026-10-27",
          citations: [
            {
              id: "c1",
              evidenceId: "e1",
              documentId: "d1",
              documentVersionId: "v1",
              title: "Orçamento sintético",
              page: 1,
              excerpt: "Peças não incluídas.",
              startOffset: 0,
              endOffset: 20
            }
          ]
        }
      })
    );
    expect(html).toContain("O orçamento não inclui a troca das peças.");
    expect(html).toContain("Peça ao fornecedor o valor com as peças incluídas.");
    expect(html).toContain("Vale conferir isso com um contador.");
    expect(html).toContain("Essa diferença pode alterar o saldo disponível.");
    expect(html).toContain("Orçamento sintético");
    expect(html).not.toMatch(
      /Atenção:|Próximo passo:|Fontes em conflito|Os trechos encontrados não sustentam/u
    );
  });
  it("AC-1604: preserva histórico e limpa a resposta anterior antes da nova pergunta", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    const askStart = app.indexOf("async function askQuestion(message = question)");
    const askEnd = app.indexOf("function sendComposer", askStart);
    const askQuestion = app.slice(askStart, askEnd);

    expect(askQuestion).toContain("saveTurn(previousTurn);");
    expect(askQuestion).toContain("setAnswer(undefined);");
    expect(askQuestion.indexOf("setAnswer(undefined);")).toBeLessThan(
      askQuestion.indexOf("setBusy(true);")
    );
    expect(app).toContain("conversationHistory");
    expect(app).toContain("message.id === entry.answer.answerId");
    expect(app).toContain(".map((entry) => (");
    expect(app).toContain("isSimpleConversationMessage(submittedQuestion)");
  });

  it("não transforma a falta de evidência em selo ou aviso automático", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(getAnswerStatusPresentation("grounded")).toBeNull();
    expect(getAnswerStatusPresentation("abstained")).toBeNull();
    expect(getAnswerStatusPresentation("conflict")).toEqual({
      label: "Fontes em conflito",
      tone: "conflict"
    });
    expect(getAnswerStatusPresentation("failed")).toEqual({
      label: "Falha temporária",
      tone: "failed"
    });
    expect(
      isAutomaticDocumentaryLimitation(
        "Não encontrei essa informação nos documentos do condomínio. A resposta abaixo é uma orientação geral."
      )
    ).toBe(true);
    expect(
      isAutomaticDocumentaryLimitation(
        "Não foi possível consultar os documentos do condomínio nesta tentativa."
      )
    ).toBe(true);
    expect(
      isAutomaticDocumentaryLimitation(
        "O reconhecimento desta página está incerto; confira o documento original."
      )
    ).toBe(false);
    expect(
      isAutomaticDocumentaryLimitation(
        "Os trechos encontrados não sustentam uma resposta documental segura. A orientação abaixo é geral e não confirma uma regra do condomínio."
      )
    ).toBe(true);
    expect(app).not.toContain("<strong>Atenção:</strong>");
    expect(app).not.toContain("<strong>Próximo passo:</strong>");
    expect(app).not.toContain('className="answer-meta"');
    expect(app).not.toContain("Base insuficiente");
    expect(app).not.toContain("Com fontes");
    expect(app).toContain("!isAutomaticDocumentaryLimitation(point)");
  });

  it("mantém próximos passos, especialista e fontes verificáveis", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("isRelevantServiceDegradation(point)");
    expect(app).toContain('<div className="answer-guidance">');
    expect(app).toContain("answer.suggestedNextStep");
    expect(app).toContain("answer.specialist.required");
    expect(app).toContain("Fontes da resposta");
    expect(app).toContain('selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"');
    expect(app).toContain(
      'selectedCitation.sourceRemoved ? "Fonte atual indisponível · " : "Versão "'
    );
  });
});
