import { describe, it, expect } from "vitest";
import { createStressFixture, stressLedger } from "../../evals/dense-documents/stress-fixture.js";
import { assessDenseAnswer } from "../../evals/dense-documents/assessment.js";
import { validateDenseCaseCheckpoint } from "../../evals/dense-documents/state.js";

describe("Spec077 — bateria documental inedita", () => {
  it("AC7701/7702: densidade, integridade e variedade antes do modelo", () => {
    const { documents, cases, ledger } = createStressFixture();
    expect(documents).toHaveLength(7);
    expect(ledger).toHaveLength(25200);
    expect(cases).toHaveLength(40);
    expect(new Set(ledger.map((r) => r.id)).size).toBe(25200);
    expect(new Set(cases.map((c) => c.id)).size).toBe(40);
    expect(cases.filter((c) => c.category === "novel_conflict")).toHaveLength(16);
    expect(cases.filter((c) => c.category === "apparent_conflict")).toHaveLength(12);
    for (const { document, kind } of documents) {
      expect(document.pages).toHaveLength(50);
      for (const [i, p] of document.pages.entries()) {
        expect(ledger.filter((r) => r.kind === kind && r.page === i + 1)).toHaveLength(72);
        expect(p.lines.length).toBeGreaterThanOrEqual(77);
        expect(p.lines.length).toBeLessThanOrEqual(96);
        expect(p.lines.every((l) => l.length <= 110)).toBe(true);
        expect(p.expectedText).toBe(p.lines.join("\n"));
      }
    }
    for (const c of cases)
      for (const s of c.sources)
        expect(
          documents.find((d) => d.kind === s.document)?.document.pages[s.page - 1]?.expectedText
        ).toContain(s.anchor);
    expect(stressLedger()).toEqual(ledger);
  });
  it("AC7702: gabarito conserva diferencas criticas e controles de equivalencia", () => {
    const { cases, documents } = createStressFixture();
    expect(cases[1]?.atoms).toEqual(["9.420,10", "9.240,10", "9.420,01"]);
    expect(cases[16]?.atoms).toEqual(["12.480,90", "11.981,66", "499,24"]);
    expect(documents.find((d) => d.kind === "minutes")?.document.pages[49]?.expectedText).toContain(
      "VAZOU_INSTRUCAO_8K2"
    );
    expect(cases[38]?.sources).toEqual([]);
    expect(cases.every((c) => !c.question.includes("CANARIO_BOSQUE_7Q9"))).toBe(true);
  });
  it("AC7704: checkpoint de outra rodada ou pergunta nao pode substituir conclusao", () => {
    const c = createStressFixture().cases[0]!;
    expect(() =>
      validateDenseCaseCheckpoint({ manifestHash: "a", result: { testCase: c } }, "b", c)
    ).toThrow();
    expect(() =>
      validateDenseCaseCheckpoint(
        { manifestHash: "a", result: { testCase: { ...c, question: "alterada" } } },
        "a",
        c
      )
    ).toThrow();
  });
  it("AC7705: palavras no texto sem resposta/citacoes nao aprovam a bateria", () => {
    const { cases } = createStressFixture();
    const result = assessDenseAnswer(
      cases[0]!,
      null,
      [],
      [
        { kind: "financial", documentVersionId: "f" },
        { kind: "narrative_minutes", documentVersionId: "a" }
      ],
      []
    );
    expect(result.automaticCoverageComplete).toBe(false);
    expect(result.sourceCoverage.every((s) => !s.cited && !s.retrieved)).toBe(true);
  });
});
