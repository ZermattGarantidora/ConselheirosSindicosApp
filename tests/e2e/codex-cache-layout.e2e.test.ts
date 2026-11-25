import { it, expect } from "vitest";
import { prepareDocument } from "../../evals/full-page-documents/replay.js";
import { replayDenseCase, type DensePrepared } from "../../evals/dense-documents/replay.js";
import { createCodexAnswerGateway } from "../../apps/api/answers/codex-answer-gateway.js";
import type { FullPageDocument } from "../fixtures/full-page-documents.js";
import type { DenseCase } from "../../evals/dense-documents/oracle.js";

it("AC7711/12: HTTP mede etapas, restaura fontes e continua recusando alias inventado", async () => {
  const docs: DensePrepared[] = [];
  for (const [n, value] of ["715,41", "751,41"].entries()) {
    const kind = n === 0 ? "financial" : "contracts";
    const lines = [
      "FICTICIO - SOMENTE TESTE - Alameda",
      ...Array.from({ length: 48 }, (_, i) => `RE-${i + 1}|controle documental sintetico.`),
      `PG-8421 | R$${value}; diferenca aguarda comprovante.`
    ];
    const definition: FullPageDocument<number> = {
      id: `cache-${n}`,
      title: `Conferencia documental - Alameda ${n}`,
      pageCount: 1,
      pages: [{ lines, expectedText: lines.join("\n"), probes: [] }]
    };
    docs.push({ ...(await prepareDocument(definition)), kind });
  }
  const testCase: DenseCase = {
    id: "CACHE-001",
    category: "conflict",
    question: "Compare PG-8421 e explique a pendencia.",
    expected: "Dois valores sem conciliacao.",
    atoms: ["715,41", "751,41"],
    sources: docs.map((d) => ({ document: d.kind, page: 1, anchor: "PG-8421" })),
    qualify: true
  };
  const gateway = (bad: boolean | "inline" = false) =>
    createCodexAnswerGateway({
      referenceFormat: "compact-v1",
      run: async (request) => {
        const sources = request.input
          .split("\nEVIDENCE_DATA_START\n")[1]!
          .split("\nEVIDENCE_DATA_END")[0]!
          .split("\n")
          .map((s) => JSON.parse(s) as { evidenceId: string; excerpt: string })
          .filter((e) => e.excerpt.includes("PG-8421 |"));
        expect(sources).toHaveLength(2);
        const ids = bad === true ? ["e999"] : sources.map((e) => e.evidenceId);
        const answer =
          "PG-8421 apresenta R$715,41 e R$751,41. A divergência permanece pendente de comprovante, sem valor definitivo confirmado.";
        return [
          {
            type: "item.completed",
            item: {
              type: "agent_message",
              text: JSON.stringify({
                answer:
                  bad === "inline" &&
                  !request.input.includes("VALIDATION_FEEDBACK=answer_body_internal_reference")
                    ? answer + ` [${ids[0]}]`
                    : answer,
                answerMode: "conflict",
                citations: ids.map((evidenceId) => ({ evidenceId })),
                claims: [
                  {
                    statement: answer,
                    claimType: "interpretation",
                    evidenceRequired: true,
                    citationEvidenceIds: ids
                  }
                ],
                attentionPoints: [],
                suggestedNextStep: null,
                specialist: { required: false, type: null, reason: null }
              })
            }
          },
          {
            type: "turn.completed",
            usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 30 }
          }
        ]
          .map((e) => JSON.stringify(e))
          .join("\n");
      }
    });
  const good = await replayDenseCase(testCase, docs, gateway());
  expect(good.statusCode).toBe(200);
  expect(good.response?.answerMode).toBe("conflict");
  expect(good.gatewayCalls).toHaveLength(1);
  expect(good.validationFailures).toEqual([]);
  expect(good.assessment.mechanicalErrors).toEqual([]);
  expect(good.response?.citations).toHaveLength(2);
  expect(
    good.response?.citations.every(
      (c) =>
        docs.some((d) => d.documentVersionId === c.documentVersionId) &&
        c.excerpt.includes("PG-8421")
    )
  ).toBe(true);
  expect(good.stageTimings.map((t) => t.stage).sort()).toEqual(
    ["retrieval", "generation", "validation", "persistence", "total"].sort()
  );
  expect(good.stageTimings.every((t) => t.condominiumId === "alameda" && t.durationMs >= 0)).toBe(
    true
  );
  expect(good.gatewayCalls[0]?.telemetry?.performance).toMatchObject({
    referenceFormat: "compact-v1",
    process: null
  });
  const bad = await replayDenseCase(testCase, docs, gateway(true));
  expect(bad.gatewayCalls).toHaveLength(2);
  expect(bad.validationFailures).toContain("citation_not_authorized");
  expect(bad.response?.answerMode).toBe("abstained");
  const repaired = await replayDenseCase(testCase, docs, gateway("inline"));
  expect(repaired.gatewayCalls).toHaveLength(2);
  expect(repaired.validationFailures).toContain("answer_body_internal_reference");
  expect(repaired.response?.answerMode).toBe("conflict");
  expect(repaired.response?.answer).not.toMatch(/\be\d+\b/iu);
  expect(repaired.assessment.mechanicalErrors).toEqual([]);
}, 30000);
