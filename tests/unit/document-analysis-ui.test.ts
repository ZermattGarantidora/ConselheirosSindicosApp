import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerMessage } from "../../apps/web/App.js";
import { analyzeDocumentRequest } from "../../apps/api/analysis/document-analysis.js";
import { alameda, managerContext } from "./answer-fixtures.js";

describe("relatório operacional na conversa", () => {
  it("renderiza resultado e fontes calculadas fora da fala e escapa conteúdo documental", () => {
    const documents = ["01/2026", "02/2026"].map((period) => ({
      condominiumId: alameda,
      documentId: period,
      documentVersionId: period,
      documentTitle: `Balancete ${period}`,
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "pdf_text" as const,
          qualityScore: 1,
          extractedText: `Balancete ${period}\n<script>valor</script> R$ 100,00`
        }
      ]
    }));
    const documentAnalysis = analyzeDocumentRequest(
      managerContext,
      "Compare balancetes 2026-01 e 2026-02",
      documents
    );
    const markup = renderToStaticMarkup(
      createElement(AnswerMessage, {
        question: "Compare balancetes 2026-01 e 2026-02",
        onSelectCitation: () => {},
        answer: {
          answer: "Resposta gerada para o contexto.",
          answerMode: "abstained",
          citations: [],
          attentionPoints: [],
          suggestedNextStep: null,
          specialist: { required: false, type: null, reason: null },
          answerId: "synthetic",
          questionId: "synthetic",
          condominiumId: "alameda",
          riskClass: "low",
          createdAt: "2026-10-16",
          documentAnalysis
        }
      })
    );
    expect(markup).toContain("Resposta gerada para o contexto.");
    expect(markup).toContain("Conferência documental calculada");
    expect(markup).toContain("diferença: R$ 0,00");
    expect(markup).toContain("Balancete 01/2026");
    expect(markup).toContain("Balancete 02/2026");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
});
