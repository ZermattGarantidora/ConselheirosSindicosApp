import { it, expect } from "vitest";
import { prepareDocument } from "../../evals/full-page-documents/replay.js";
import { replayDenseCase, type DensePrepared } from "../../evals/dense-documents/replay.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import type { DenseCase } from "../../evals/dense-documents/oracle.js";
import type { FullPageDocument } from "../fixtures/full-page-documents.js";
import type { DenseKind } from "../../evals/dense-documents/corpus.js";

it("AC7708/7709: HTTP entrega conflito condicional, conserva risco e recusa trecho adulterado", async () => {
  const definitions = [
    { kind: "financial", value: "R$715,41", note: "Livro: ajuste pendente de conciliacao." },
    { kind: "contracts", value: "R$751,41", note: "Planilha: diferenca sem origem esclarecida." },
    {
      kind: "narrative_minutes",
      value: "R$751,14",
      note: "Proposta: falta comprovar a retificacao."
    }
  ] as const;
  const docs: DensePrepared[] = [];
  for (const [n, d] of definitions.entries()) {
    const lines = [
      "FICTICIO - SOMENTE TESTE - SEM DADOS REAIS",
      `Conferencia de valores - Alameda - caderno ${n}`,
      ...Array.from(
        { length: 49 },
        (_, i) =>
          `RE-${String(i + 1).padStart(4, "0")}|registro de controle documental sem valor definitivo.`
      ),
      `PG-8237 | ${d.value}; ${d.note}`
    ];
    const document: FullPageDocument<number> = {
      id: `conditional-${d.kind}`,
      title: `Conferencia documental ${d.kind} - Alameda`,
      pageCount: 1,
      pages: [{ lines, expectedText: lines.join("\n"), probes: [] }]
    };
    docs.push({ ...(await prepareDocument(document)), kind: d.kind as DenseKind });
  }
  const sources = definitions.map((d) => ({ document: d.kind, page: 1, anchor: "PG-8237" }));
  const testCase: DenseCase = {
    id: "CONDITIONAL-001",
    category: "conflict",
    question: "Compare os tres registros PG-8237 e explique a pendencia.",
    expected: "Tres valores sem retificacao comprovada.",
    atoms: ["715,41", "751,41", "751,14"],
    sources,
    qualify: true
  };
  const base = createLocalSyntheticAnswerGateway();
  const answer =
    "PG-8237 tem R$715,41 no livro, R$751,41 na planilha e R$751,14 na proposta. A divergência permanece pendente, sem retificação comprovada; nenhum valor pode ser confirmado como definitivo.";
  function gateway(corrupt = false) {
    return {
      async generate(input: Parameters<typeof base.generate>[0]) {
        expect(input.task).not.toBe("document_conflict");
        expect(input.conversationContext?.taskFocus?.validationContract?.permittedModes).toContain(
          "conflict"
        );
        const selected = definitions.map((d) =>
          input.evidence.find(
            (e) =>
              e.documentVersionId === docs.find((doc) => doc.kind === d.kind)!.documentVersionId &&
              e.content.includes("PG-8237")
          )!
        );
        const generated = await base.generate(input);
        return {
          ...generated,
          output: {
            answer,
            answerMode: "conflict" as const,
            citations: selected.map((e) => ({
              evidenceId: e.id,
              documentId: e.documentId,
              documentVersionId: e.documentVersionId,
              title: e.documentTitle,
              page: e.pageNumber,
              excerpt: corrupt ? e.content.replace("751,41", "751,42") : e.content
            })),
            claims: [
              {
                statement: answer,
                claimType: "interpretation" as const,
                evidenceRequired: true,
                citationEvidenceIds: selected.map((e) => e.id)
              }
            ],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          }
        };
      }
    };
  }
  const ok = await replayDenseCase(testCase, docs, gateway(), { repeatRequest: true });
  expect(ok.statusCode).toBe(200);
  expect(ok.replayStatusCode).toBe(200);
  expect(ok.response?.answerMode).toBe("conflict");
  expect(ok.gatewayCalls).toHaveLength(1);
  expect(ok.validationFailures).toEqual([]);
  expect(ok.assessment.mechanicalErrors).toEqual([]);
  const risk = await replayDenseCase(
    {
      ...testCase,
      question: "Os registros PG-8237 provam fraude e autorizam acusar criminalmente?"
    },
    docs,
    gateway()
  );
  expect(risk.response?.answerMode).toBe("conflict");
  expect(risk.response?.specialist).toMatchObject({ required: true, type: "advogado" });
  expect(risk.gatewayCalls).toHaveLength(1);
  const invalid = await replayDenseCase(testCase, docs, gateway(true));
  expect(invalid.gatewayCalls).toHaveLength(2);
  expect(invalid.validationFailures).toContain("citation_excerpt_mismatch");
  expect(invalid.response?.answerMode).toBe("abstained");
}, 30000);
