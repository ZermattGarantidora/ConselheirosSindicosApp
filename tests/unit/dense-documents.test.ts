import { describe, it, expect } from "vitest";
import { createDenseLedger, renderDenseCorpus } from "../../evals/dense-documents/corpus.js";
import { createDenseCases } from "../../evals/dense-documents/oracle.js";
import { assessDenseAnswer } from "../../evals/dense-documents/assessment.js";
import { createEvidence } from "./answer-fixtures.js";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  validateDenseCaseCheckpoint,
  validateDensePreparedCheckpoint
} from "../../evals/dense-documents/state.js";

describe("Spec075 - leitura densa", () => {
  it("AC7505: corpus de outra rodada e checkpoint copiado de outro caso sao recusados", () => {
    const [first, second] = createDenseCases(createDenseLedger());
    const value = { manifestHash: "run-a", result: { testCase: first! } };
    expect(() => validateDenseCaseCheckpoint(value, "run-a", first!)).not.toThrow();
    expect(() => validateDenseCaseCheckpoint(value, "run-b", first!)).toThrow("outra rodada");
    expect(() => validateDenseCaseCheckpoint(value, "run-a", second!)).toThrow("outro caso");
    expect(() => validateDensePreparedCheckpoint({ manifestHash: "run-a" }, "run-b")).toThrow(
      "outra rodada"
    );
  });
  it("AC7501/7503: corpus e oracle possuem densidade, registros, notas e casos independentes", () => {
    const ledger = createDenseLedger(),
      docs = renderDenseCorpus(ledger),
      cases = createDenseCases(ledger);
    expect(ledger).toHaveLength(6000);
    expect(new Set(ledger.map((r) => `${r.document}/${r.key}`)).size).toBe(6000);
    expect(docs).toHaveLength(5);
    expect(docs.flatMap((d) => d.pages)).toHaveLength(120);
    for (const page of docs.flatMap((d) => d.pages)) {
      expect(page.lines.length).toBeGreaterThanOrEqual(50);
      expect(page.lines.length).toBeLessThanOrEqual(70);
      expect(Math.max(...page.lines.map((l) => l.length))).toBeLessThanOrEqual(92);
      expect(page.expectedText.replaceAll(/\s/gu, "").length).toBeGreaterThanOrEqual(3500);
    }
    expect(cases).toHaveLength(32);
    expect(new Set(cases.map((c) => c.id)).size).toBe(32);
    expect(new Set(cases.map((c) => c.category))).toEqual(
      new Set([
        "detail",
        "association",
        "security",
        "footnote",
        "version",
        "cross_document",
        "status",
        "absence",
        "global_coverage"
      ])
    );
    const contract = ledger.find((r) => r.key === "OS-0590")!;
    expect(contract.status).toBe("executado");
    expect(docs[4]!.pages[23]!.expectedText).toContain("sem aceite tecnico");
    const changed = ledger.map((r) =>
      r.key === "LAN-0059" ? { ...r, amountMinor: r.amountMinor + 100 } : r
    );
    expect(createDenseCases(changed)[0]!.expected).not.toBe(cases[0]!.expected);
    expect(renderDenseCorpus(changed)[0]!.pages[1]!.expectedText).not.toBe(
      docs[0]!.pages[1]!.expectedText
    );
  });
  it("AC7504: fonte removida, valor trocado, dias ausentes e citacao ausente nao passam", () => {
    const cases = createDenseCases(createDenseLedger()),
      testCase = cases[0]!;
    const source = createEvidence({
      pageNumber: 2,
      documentVersionId: "dense-v1",
      content: "LAN-0059 fonte autorizada."
    });
    const response = {
      answer: testCase.expected,
      answerMode: "grounded",
      citations: [{ documentVersionId: "dense-v1", page: 2, excerpt: source.content }]
    } as unknown as PublicAnswer;
    const docs = [{ kind: "financial" as const, documentVersionId: "dense-v1" }];
    expect(
      assessDenseAnswer(testCase, response, [source], docs, []).automaticCoverageComplete
    ).toBe(true);
    expect(assessDenseAnswer(testCase, response, [], docs, []).automaticCoverageComplete).toBe(
      false
    );
    expect(
      assessDenseAnswer(testCase, { ...response, citations: [] }, [source], docs, [])
        .automaticCoverageComplete
    ).toBe(false);
    expect(
      assessDenseAnswer(
        testCase,
        { ...response, answer: "R$1,00; pago; 18 dias" },
        [source],
        docs,
        []
      ).automaticCoverageComplete
    ).toBe(false);
    expect(
      assessDenseAnswer(testCase, response, [source], docs, ["invalid_source"])
        .automaticCoverageComplete
    ).toBe(false);
    expect(
      assessDenseAnswer(
        testCase,
        { ...response, answer: testCase.expected.replace("18 dias", "prazo indefinido") },
        [source],
        docs,
        []
      ).automaticCoverageComplete
    ).toBe(false);
  });
  it("AC7505: comando padrao prepara plano sem inferencia", async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["scripts/run-tsx.mjs", "evals/dense-documents/run.ts"],
      { windowsHide: true, timeout: 30000 }
    );
    expect(JSON.parse(stdout)).toMatchObject({
      documents: 5,
      pages: 120,
      records: 6000,
      questions: 32,
      providerCalls: 0,
      mode: "plan_only"
    });
  }, 35000);
});
