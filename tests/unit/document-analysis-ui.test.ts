import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerMessage } from "../../apps/web/App.js";
import { analyzeDocumentRequest } from "../../apps/api/analysis/document-analysis.js";
import { alameda, managerContext } from "./answer-fixtures.js";

describe("análise na fala da Alvitra", () => {
  it("AC-5701: não acrescenta painel nem avisos de cálculo à fala gerada", () => {
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
          answer:
            "A diferença encontrada é R$ 0,00. O trecho <script>valor</script> exige conferência no original.",
          answerMode: "abstained",
          citations: documentAnalysis.rows.flatMap((row) => row.citations),
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
    expect(markup).toContain("A diferença encontrada é R$ 0,00.");
    expect(markup).not.toContain("Conferência documental calculada");
    expect(markup).not.toContain("Ver conferência documental e cálculos");
    expect(markup).not.toContain("Informe dois meses");
    expect(markup).not.toContain("diferença: R$ 0,00");
    expect(markup).toContain("Balancete 01/2026");
    expect(markup).toContain("Balancete 02/2026");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
});
