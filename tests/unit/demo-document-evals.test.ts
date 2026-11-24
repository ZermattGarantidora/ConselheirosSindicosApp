import { describe, it, expect, vi } from "vitest";
import { demoCases, hasFact, files } from "../../evals/demo-documents/cases.js";
import { assessDemoAnswer } from "../../evals/demo-documents/assessment.js";
import { demoFixture } from "../../evals/demo-documents/fixture.js";
import { createEvidence } from "./answer-fixtures.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
describe("Spec 064 — corpus e avaliação", () => {
  it("AC-6404: fonte equivalente é aceita; citação falsa continua recusada", () => {
    const test = demoCases("baseline")[11]!;
    const text = "Até o dia 15 do mês seguinte.";
    const source = createEvidence({ documentTitle: files.convention, content: text });
    const input: AnswerGatewayInput = {
      question: test.question,
      task: "grounded_answer",
      riskClass: "low",
      evidence: [source],
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100 }
    };
    const citation = {
      id: "synthetic",
      evidenceId: source.id,
      documentId: source.documentId,
      documentVersionId: source.documentVersionId,
      title: source.documentTitle,
      page: source.pageNumber,
      excerpt: text,
      startOffset: 0,
      endOffset: text.length
    };
    expect(
      assessDemoAnswer(test, { answer: text, answerMode: "grounded", citations: [citation] }, [
        input
      ]).complete
    ).toBe(true);
    expect(
      assessDemoAnswer(
        test,
        {
          answer: text,
          answerMode: "grounded",
          citations: [{ ...citation, documentId: "foreign" }]
        },
        [input]
      ).mechanical
    ).toContain("citation_invalid");
  });
  it("AC-6404: abstenção correta e nome já dado na pergunta não são omissão", () => {
    const unknown = demoCases("baseline")[55]!;
    expect(
      assessDemoAnswer(
        unknown,
        {
          answer: "Não consigo confirmar o CNPJ pelos trechos disponíveis.",
          answerMode: "abstained",
          citations: []
        },
        []
      ).complete
    ).toBe(true);
    expect(
      assessDemoAnswer(demoCases("baseline")[23]!, { answer: "Até 15/06/2026." }, []).missing
    ).not.toContain("lucas");
    expect(
      assessDemoAnswer(demoCases("baseline")[0]!, { answer: "Foi outra pessoa." }, []).missing
    ).toContain("lucas");
  });
  it("AC-6402: reserva 60+30 perguntas distintas, duas condições", () => {
    const first = demoCases("baseline"),
      second = demoCases("validation");
    expect(first).toHaveLength(60);
    expect(second).toHaveLength(30);
    expect(new Set([...first, ...second].map((item) => item.question)).size).toBe(90);
    expect(new Set(first.flatMap((item) => item.documents))).toEqual(new Set(Object.keys(files)));
    expect(hasFact("1º de fevereiro de 2026", "feb1")).toBe(true);
  });
  it("AC-6404: resposta vazia, genérica ou com protocolo nunca é completa", () => {
    const test = demoCases("baseline")[0]!;
    const empty = assessDemoAnswer(test, {}, []);
    expect(empty.complete).toBe(false);
    expect(empty.absentInInput).toContain("lucas");
    const protocol = assessDemoAnswer(
      test,
      {
        answer: '{"answerMode":"grounded","answer":"Lucas Andrade"}',
        answerMode: "grounded",
        citations: []
      },
      []
    );
    expect(protocol.mechanical).toContain("protocol_in_speech");
    expect(protocol.mechanical).toContain("corpus_document_not_cited");
  });
  it("AC-6401: quatro originais têm oito páginas prontas e isolamento no endpoint", async () => {
    const generate = vi.fn(async () => {
      throw new Error("Provedor não deve ser chamado neste teste.");
    });
    const fixture = await demoFixture(process.cwd(), { generate });
    try {
      expect(fixture.catalog).toHaveLength(4);
      const denied = await fixture.app.inject({
        url: "/v1/condominiums/demo-docs/documents",
        headers: { "x-development-user-id": "morador-alameda-demo" }
      });
      expect(denied.statusCode).toBe(403);
      expect(generate).not.toHaveBeenCalled();
    } finally {
      await fixture.app.close();
    }
  });
});
