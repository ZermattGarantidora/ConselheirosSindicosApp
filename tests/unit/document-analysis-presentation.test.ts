import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AnswerMessage, AnswerSources } from "../../apps/web/App.js";
import { groupCitations } from "../../apps/web/document-analysis-presentation.js";
import type { AnswerPayload } from "../../apps/api/answers/answer-contract.js";

const citation = {
  id: "c1",
  evidenceId: "e1",
  documentId: "d1",
  documentVersionId: "v1",
  title: "Documento sintético.pdf",
  page: 1,
  excerpt: "Saldo inicial",
  startOffset: 0,
  endOffset: 13
};
const answer: AnswerPayload = {
  answer: "Há uma divergência no fechamento. Quer ajuda para conferir?",
  answerMode: "conflict",
  citations: [citation],
  attentionPoints: ["Os documentos apresentam saldos diferentes."],
  suggestedNextStep: "Peça o extrato para conferir a diferença.",
  specialist: { required: true, type: "contador", reason: "A diferença afeta o saldo disponível." }
};

describe("Spec 057 — análise na conversa", () => {
  it("AC-5701/5702/5704: mostra achado, conflito, próximo passo e fontes na fala", () => {
    const html = renderToStaticMarkup(
      createElement(AnswerMessage, { answer, question: "", onSelectCitation: vi.fn() })
    );
    for (const text of [
      answer.answer,
      ...answer.attentionPoints,
      answer.suggestedNextStep!,
      answer.specialist.reason!,
      "Documento sintético.pdf",
      "página 1"
    ])
      expect(html).toContain(text);
    for (const text of [
      "Ver conferência",
      "Ver os dez pontos",
      "Ver análise por documento",
      "Prioridades do mês",
      "Relatórios disponíveis",
      'class="document-analysis"',
      'role="alert"'
    ])
      expect(html).not.toContain(text);
  });

  it("AC-5703: agrupa por origem e elimina apenas duplicata literal", () => {
    const second = {
      ...citation,
      id: "c2",
      excerpt: "Saldo final",
      startOffset: 20,
      endOffset: 31
    };
    const duplicate = { ...citation, id: "c3" };
    const variants = [
      { documentVersionId: "v2" },
      { documentId: "d2" },
      { page: 2 },
      { sourceScope: "legislation" as const },
      { sourceRemoved: true }
    ].map((patch, i) => ({ ...citation, id: `other-${i}`, ...patch }));
    const input = [citation, second, duplicate, ...variants];
    const groups = groupCitations(input);
    expect(groups).toHaveLength(5);
    expect(groups[0]).toEqual([citation, second, variants[2]]);
    expect(groups.flat()).not.toContain(duplicate);
    for (const item of variants) expect(groups.flat()).toContain(item);
    expect(input).toHaveLength(8);
    expect(groupCitations([])).toEqual([]);
  });

  it("AC-5703a: conserva controle acessível e cada trecho, sem título ou contador visível", () => {
    const second = { ...citation, id: "b", excerpt: "Saldo final", startOffset: 20, endOffset: 31 };
    const secondPage = {
      ...citation,
      id: "page-2",
      page: 2,
      excerpt: "A convenção prevê assembleia",
      startOffset: 40,
      endOffset: 70
    };
    const html = renderToStaticMarkup(
      createElement(AnswerSources, {
        citations: [citation, secondPage, second, { ...citation, id: "duplicate" }],
        onSelect: vi.fn()
      })
    );
    expect(html).toContain('aria-label="Ver fontes da resposta"');
    expect(html).toMatch(/<summary class="source-list-toggle"[^>]*><span[^>]*><svg/u);
    expect(html).not.toContain(">Fontes da resposta<");
    expect(html).not.toContain("1 referência");
    for (const text of [
      "2 páginas · 3 trechos",
      "Página 1: Saldo inicial",
      "Página 2: A convenção prevê assembleia",
      "Página 1: Saldo final"
    ])
      expect(html).toContain(text);
    expect(html.match(/<button /gu)).toHaveLength(3);
    expect(html.match(/Documento sintético\.pdf/gu)).toHaveLength(1);
    expect(html).not.toContain("<details open");
  });

  it("AC-5705: escapa HTML na fala, orientações e trechos", () => {
    const html = renderToStaticMarkup(
      createElement(AnswerMessage, {
        answer: {
          ...answer,
          answer: "O trecho <script>texto</script> requer conferência.",
          attentionPoints: ["<script>limite</script>"],
          citations: [
            { ...citation, excerpt: "<script>fonte</script>" },
            { ...citation, id: "c2", excerpt: "Outro trecho", startOffset: 30, endOffset: 42 }
          ]
        },
        question: "Analise o documento",
        onSelectCitation: vi.fn()
      })
    );
    for (const text of ["texto", "limite", "fonte"])
      expect(html).toContain(`&lt;script&gt;${text}&lt;/script&gt;`);
    expect(html).not.toContain("<script>");
  });
});
