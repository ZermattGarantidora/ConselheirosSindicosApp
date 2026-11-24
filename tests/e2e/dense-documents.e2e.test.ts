import { describe, it, expect } from "vitest";
import {
  createDenseLedger,
  renderDenseCorpus,
  denseKinds
} from "../../evals/dense-documents/corpus.js";
import { createDenseCases } from "../../evals/dense-documents/oracle.js";
import { prepareDocument } from "../../evals/full-page-documents/replay.js";
import { replayDenseCase, type DensePrepared } from "../../evals/dense-documents/replay.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";

describe("Spec075 - documentos densos no pipeline", () => {
  it("AC7502/7506: confere 120 paginas e original sem promover minuta; consulta preserva escopo e nao envia oracle", async () => {
    const ledger = createDenseLedger(),
      corpus = renderDenseCorpus(ledger),
      documents: DensePrepared[] = [];
    for (const [index, document] of corpus.entries()) {
      const prepared = await prepareDocument(document, {
        validityConfirmed: denseKinds[index] !== "draft"
      });
      expect(prepared.pages).toHaveLength(24);
      expect(new Set(prepared.chunks.map((c) => c.pageNumber)).size).toBe(24);
      documents.push({ ...prepared, kind: denseKinds[index]! });
    }
    const draft = documents.find((d) => d.kind === "draft")!;
    expect(draft.chunks.length).toBeGreaterThan(0);
    expect(draft.chunks.every((c) => c.validityStatus === "pending")).toBe(true);
    const testCase = createDenseCases(ledger)[0]!;
    const result = await replayDenseCase(testCase, documents, createLocalSyntheticAnswerGateway());
    expect(result.statusCode).toBe(200);
    expect(result.gatewayCalls.length).toBeGreaterThan(0);
    for (const call of result.gatewayCalls) {
      expect(call.input.evidence.every((e) => e.condominiumId === "alameda")).toBe(true);
      expect(JSON.stringify(call.input)).not.toContain("CANARIO_BOSQUE_7Q9");
      expect(JSON.stringify(call.input)).not.toContain("Total oracle=");
      expect("expected" in call.input).toBe(false);
    }
    expect(result.response?.answer).not.toContain("CANARIO_BOSQUE_7Q9");
    const fixed = await replayDenseCase(
      createDenseCases(ledger)[4]!,
      documents,
      createLocalSyntheticAnswerGateway()
    );
    expect(
      fixed.gatewayCalls
        .at(-1)!
        .input.evidence.some(
          (e) =>
            e.documentVersionId === documents[1]!.documentVersionId &&
            e.content.includes("ART-0059|")
        )
    ).toBe(true);
    const base = createLocalSyntheticAnswerGateway();
    const sumGateway = {
      async generate(input: Parameters<typeof base.generate>[0]) {
        const generated = await base.generate(input);
        const calculation = input.conversationContext?.documentCalculation;
        expect(calculation).toMatchObject({
          pagesVerified: 24,
          rowsVerified: 1200,
          includedRows: 492,
          totalMinor: "104952368"
        });
        const e = input.evidence[0]!;
        return {
          ...generated,
          output: {
            answer:
              "A soma dos lançamentos pagos de outubro de 2026 é R$ 1.049.523,68. Conferi as 24 páginas e os 1.200 registros; 492 lançamentos entraram no total.",
            answerMode: "grounded" as const,
            citations: [
              {
                evidenceId: e.id,
                documentId: e.documentId,
                documentVersionId: e.documentVersionId,
                title: e.documentTitle,
                page: e.pageNumber,
                excerpt: e.content
              }
            ],
            claims: [],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          }
        };
      }
    };
    const sumResult = await replayDenseCase(createDenseCases(ledger)[31]!, documents, sumGateway, {
      repeatRequest: true
    });
    expect(sumResult.response?.answerMode).toBe("grounded");
    expect(sumResult.replayStatusCode).toBe(200);
    expect(sumResult.assessment.mechanicalErrors).toEqual([]);
    expect(JSON.parse(String(sumResult.computationReceipt)).included).toHaveLength(492);
    const mutableChunks = documents[0]!.chunks.map((c) => ({ ...c }));
    const changedSum = await replayDenseCase(
      createDenseCases(ledger)[31]!,
      documents.map((d, i) => (i === 0 ? { ...d, chunks: mutableChunks } : d)),
      sumGateway,
      {
        repeatRequest: true,
        beforeReplay: () => {
          let changed = false;
          for (const chunk of mutableChunks) {
            if (chunk.pageNumber === 14 && chunk.content.includes("R$1.793,24")) {
              chunk.content = chunk.content.replace("R$1.793,24", "R$1.794,24");
              changed = true;
            }
          }
          expect(changed).toBe(true);
        }
      }
    );
    expect(changedSum.statusCode).toBe(200);
    expect(changedSum.replayStatusCode).toBe(403);
    expect(changedSum.gatewayCalls).toHaveLength(1);
    const versionCase = createDenseCases(ledger)[20]!;
    const comparisonGateway = {
      async generate(input: Parameters<typeof base.generate>[0]) {
        const generated = await base.generate(input),
          approved = input.evidence.find(
            (e) =>
              e.documentVersionId === documents[1]!.documentVersionId &&
              e.content.includes("ART-0059|")
          )!,
          pending = input.evidence.find(
            (e) =>
              e.documentVersionId === draft.documentVersionId && e.content.includes("MIN-0059|")
          )!;
        return {
          ...generated,
          output: {
            answer:
              "A versao aprovada registra R$ 990,83. A minuta v2 propoe R$ 1.480,83, sem assinatura ou ata de aprovacao; nao altera automaticamente a v1 nem autoriza o valor novo.",
            answerMode: "grounded" as const,
            citations: [approved, pending].map((e) => ({
              evidenceId: e.id,
              documentId: e.documentId,
              documentVersionId: e.documentVersionId,
              title: e.documentTitle,
              page: e.pageNumber,
              excerpt: e.content
            })),
            claims: [
              {
                statement: "A convencao aprovada registra R$990,83.",
                claimType: "condominium_fact" as const,
                evidenceRequired: true,
                citationEvidenceIds: [approved.id]
              },
              {
                statement: "A minuta propoe R$1.480,83 sem assinatura ou aprovacao.",
                claimType: "interpretation" as const,
                evidenceRequired: true,
                citationEvidenceIds: [pending.id]
              }
            ],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          }
        };
      }
    };
    const comparison = await replayDenseCase(versionCase, documents, comparisonGateway, {
      repeatRequest: true
    });
    expect(comparison.statusCode).toBe(200);
    expect(comparison.replayStatusCode).toBe(200);
    expect(comparison.gatewayCalls).toHaveLength(1);
    expect(comparison.assessment.mechanicalErrors).toEqual([]);
    const mutableDraft = { ...draft.catalogEntry };
    const changed = await replayDenseCase(
      versionCase,
      documents.map((d) => (d.kind === "draft" ? { ...d, catalogEntry: mutableDraft } : d)),
      comparisonGateway,
      {
        repeatRequest: true,
        beforeReplay: () => {
          mutableDraft.validityStatus = "confirmed";
        }
      }
    );
    expect(changed.statusCode).toBe(200);
    expect(changed.replayStatusCode).toBe(403);
    expect(changed.gatewayCalls).toHaveLength(1);
    for (const conflictIndex of [16, 26, 30]) {
      const conflictCase = createDenseCases(ledger)[conflictIndex]!;
      const checked = await replayDenseCase(
        conflictCase,
        documents,
        {
          async generate(input) {
            expect(input.task).toBe("document_conflict");
            const expectedSources = conflictCase.sources.map((source) => {
              const document = documents.find((d) => d.kind === source.document)!;
              return input.evidence.find(
                (e) =>
                  e.documentVersionId === document.documentVersionId &&
                  e.pageNumber === source.page &&
                  e.content.includes(source.anchor)
              )!;
            });
            expect(expectedSources.every(Boolean)).toBe(true);
            const conflictIds =
              input.conversationContext?.taskFocus?.validationContract?.conflictEvidenceIds;
            expect(conflictIds).toHaveLength(2);
            expect(conflictIds?.every((id) => expectedSources.some((e) => e.id === id))).toBe(true);
            const sources = [...new Map(expectedSources.map((e) => [e.id, e])).values()];
            const answer =
              "LAN-0590 registra R$1.708,30 como pago na tabela, mas a NOTA-F24 indica R$9.876,54 e conflito não conciliado. A divergência precisa ser conferida; não é possível escolher o valor correto por esses registros." +
              (conflictIndex === 26
                ? " DEL-0590 é proposta, não aprovação. OS-0590 consta como executado mas segue sem aceite técnico; pagamento e execução não comprovam aprovação ou aceite."
                : "") +
              (conflictIndex === 30
                ? " Divergência não prova fraude nem autoria e não autoriza acusar a gestão; exige conciliação, comprovação e revisão humana."
                : "");
            const generated = await base.generate(input);
            return {
              ...generated,
              output: {
                answer,
                answerMode: "conflict" as const,
                citations: sources.map((e) => ({
                  evidenceId: e.id,
                  documentId: e.documentId,
                  documentVersionId: e.documentVersionId,
                  title: e.documentTitle,
                  page: e.pageNumber,
                  excerpt: e.content
                })),
                claims: [
                  {
                    statement: answer,
                    claimType: "interpretation" as const,
                    evidenceRequired: true,
                    citationEvidenceIds: sources.map((e) => e.id)
                  }
                ],
                attentionPoints: [],
                suggestedNextStep: null,
                specialist: { required: false, type: null, reason: null }
              }
            };
          }
        },
        { repeatRequest: true }
      );
      expect(checked.statusCode).toBe(200);
      expect(checked.replayStatusCode).toBe(200);
      expect(checked.response?.answerMode).toBe("conflict");
      expect(checked.gatewayCalls).toHaveLength(1);
      expect(checked.validationFailures).toEqual([]);
      expect(checked.assessment.mechanicalErrors).toEqual([]);
      expect(checked.assessment.sourceCoverage.every((s) => s.retrieved && s.cited)).toBe(true);
      if (conflictIndex === 30)
        expect(checked.response?.specialist).toMatchObject({ required: true, type: "advogado" });
    }
  }, 60000);
});
