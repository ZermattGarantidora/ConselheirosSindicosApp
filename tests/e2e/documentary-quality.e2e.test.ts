import { describe, expect, it } from "vitest";

import { documentaryQualityCases } from "../../evals/documentary-quality/dataset.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { runDocumentaryQualitySuite } from "../../evals/documentary-quality/run.js";
import { replaySemanticCases } from "../../evals/documentary-quality/semantic/replay.js";
import { createSemanticReviewCases } from "../../evals/documentary-quality/semantic/cases.js";

describe("Spec 031 — avaliação transversal de qualidade documental", () => {
  it("mantém cem casos sintéticos distintos, completos e separados por método", () => {
    expect(documentaryQualityCases).toHaveLength(100);
    expect(new Set(documentaryQualityCases.map((testCase) => testCase.id))).toHaveLength(100);
    expect(new Set(documentaryQualityCases.map((testCase) => testCase.task))).toHaveLength(100);
    expect(
      documentaryQualityCases.filter((testCase) => testCase.kind === "deterministic")
    ).toHaveLength(50);
    expect(documentaryQualityCases.filter((testCase) => testCase.kind === "semantic")).toHaveLength(
      50
    );
    expect(
      documentaryQualityCases.every(
        (testCase) =>
          testCase.inputs.length > 0 &&
          testCase.expectedSources.length > 0 &&
          testCase.expectedResult.length > 0 &&
          testCase.judgingCriteria.length >= 3
      )
    ).toBe(true);
  });

  it("executa somente cenários associados a asserções fiéis e declara cada pendência", async () => {
    const report = await runDocumentaryQualitySuite();

    expect(report.deterministic).toMatchObject({
      planned: 50,
      executed: 50,
      passed: 50,
      failed: 0,
      pendingIntegration: 0
    });
    expect(report.semantic).toMatchObject({
      planned: 50,
      executed: 0,
      status: "pending_human_and_model_review"
    });
    expect(report.pendingCases).toHaveLength(0);
    expect(report.pendingCases.every((item) => item.reason.length > 0)).toBe(true);
    expect(report.perSegment.balancete).toMatchObject({
      deterministicExecuted: 10,
      deterministicPendingIntegration: 0
    });
    expect(report.perSegment.isolamento).toMatchObject({
      deterministicExecuted: 10,
      deterministicPendingIntegration: 0
    });
  });

  it("prepara as fichas semânticas e separa replay de aprovação especializada", async () => {
    const pending = await replaySemanticCases();
    expect(pending).toMatchObject({
      total: 50,
      gatewayConfigured: false,
      replayed: 0,
      status: "pending_gateway"
    });
    expect(
      pending.reviewCases.every(
        (item) => item.sources.length > 0 && item.requiredReviewers.length > 0
      )
    ).toBe(true);

    const replay = await replaySemanticCases(createLocalSyntheticAnswerGateway());
    expect(replay).toMatchObject({
      total: 50,
      gatewayConfigured: true,
      replayed: 50,
      mechanicallyValid: 50,
      status: "pending_specialist_review"
    });
    expect(replay.results).toHaveLength(50);
    expect(
      replay.results.every((item) => item.response !== null && item.humanReview === null)
    ).toBe(true);
  });

  it("não injeta o gabarito nas fontes e preserva lacunas de procedência", async () => {
    const cases = createSemanticReviewCases(documentaryQualityCases);
    const changed = createSemanticReviewCases(
      documentaryQualityCases.map((item) => ({
        ...item,
        expectedResult: "GABARITO_NAO_DEVE_IR_AO_MODELO"
      }))
    );
    expect(changed.map((item) => item.sources)).toEqual(cases.map((item) => item.sources));
    expect(changed.map((item) => item.question)).toEqual(cases.map((item) => item.question));
    const pendingVersion = cases.find((item) => item.task === "citação sem versão");
    expect(pendingVersion?.sources[0]?.documentVersionId).toBeNull();
    expect(cases.find((item) => item.task === "citação sem página")?.sources[0]?.page).toBeNull();
    expect(cases.find((item) => item.task === "citação sem trecho")?.sources[0]?.content).toBe("");
    const delegate = createLocalSyntheticAnswerGateway();
    let emptyEvidenceCalls = 0;
    const replay = await replaySemanticCases({
      async generate(input) {
        expect(JSON.stringify(input)).not.toContain("Fato explícito para conferência");
        expect(JSON.stringify(input)).not.toContain("GABARITO_NAO_DEVE_IR_AO_MODELO");
        if (input.evidence.length === 0) emptyEvidenceCalls++;
        expect(
          input.evidence.every(
            (source) =>
              source.pageNumber > 0 &&
              source.documentVersionId.length > 0 &&
              source.content.trim().length > 0 &&
              source.validityStatus === "pending"
          )
        ).toBe(true);
        return delegate.generate(input);
      }
    });
    expect(emptyEvidenceCalls).toBe(9);
    expect(replay.mechanicallyValid).toBe(50);
  });

  it("registra falhas de contrato por caso sem inventar aprovação nem expor o erro", async () => {
    const report = await replaySemanticCases({
      async generate() {
        throw new Error("CANARIO_ERRO_GATEWAY");
      }
    });
    expect(report).toMatchObject({
      replayed: 50,
      mechanicallyValid: 0,
      status: "pending_specialist_review"
    });
    expect(
      report.results.every(
        (item) =>
          item.response === null && item.humanReview === null && item.mechanicalError !== null
      )
    ).toBe(true);
    expect(JSON.stringify(report)).not.toContain("CANARIO_ERRO_GATEWAY");
  });
});
