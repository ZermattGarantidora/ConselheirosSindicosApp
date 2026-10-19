import { describe, expect, it } from "vitest";

import { documentAnalysisEvals } from "../../evals/datasets/document-analysis.js";

describe("bateria sintética da análise documental", () => {
  it("contém pelo menos 100 tarefas distintas, com julgamento e fontes", () => {
    expect(documentAnalysisEvals).toHaveLength(100);
    expect(new Set(documentAnalysisEvals.map((item) => item.task)).size).toBe(100);
    expect(documentAnalysisEvals.filter((item) => item.kind === "deterministic")).not.toHaveLength(
      0
    );
    expect(documentAnalysisEvals.filter((item) => item.kind === "semantic")).not.toHaveLength(0);
    expect(
      documentAnalysisEvals.every(
        (item) => item.requiredSources.length > 0 && item.rubrics.length > 0
      )
    ).toBe(true);
  });
});
