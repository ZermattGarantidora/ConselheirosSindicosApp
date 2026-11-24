import { describe, expect, it } from "vitest";
import { createEvidence } from "./answer-fixtures.js";
import {
  documentaryReplayLedger,
  canReplayDocumentaryAnswer,
  parseDocumentaryReplayLedger
} from "../../apps/api/answers/documentary-replay.js";
import {
  buildCompletionChecklist,
  missingCompletionKeys
} from "../../apps/api/answers/answer-completion-plan.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { correctedConditions } from "../../evals/conversation-comparison/protocol.js";
const generated = (answer: string): GeneratedAnswer => ({
  answer,
  answerMode: "grounded",
  citations: [],
  claims: [],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
});

describe("Spec 058 — dependências documentais completas", () => {
  const first = createEvidence();
  const second = createEvidence({
    id: "fonte-2",
    pageId: "pagina-2",
    content: "FICTÍCIO. Condição complementar."
  });
  const ledger = documentaryReplayLedger([first, second])!;
  it("permite replay apenas com todas as dependências atuais, inclusive a não citada", () => {
    expect(canReplayDocumentaryAnswer(ledger, [second, first])).toBe(true);
    expect(canReplayDocumentaryAnswer(ledger, [first])).toBe(false);
    expect(parseDocumentaryReplayLedger(JSON.stringify(ledger))).toEqual(ledger);
  });
  it.each([
    { documentVersionId: "nova-versao" },
    { pageId: "outra-pagina" },
    { content: "Alteração sem mudar hash declarado." },
    { contentSha256: "b".repeat(64) },
    { validityStatus: "pending" as const },
    { qualityScore: 0.3 },
    { validUntil: new Date("2026-01-01T00:00:00Z") },
    { processingStatus: "needs_review" as const }
  ])("omite replay se uma dependência mudar: %j", (change) => {
    expect(canReplayDocumentaryAnswer(ledger, [first, { ...second, ...change }])).toBe(false);
  });
  it.each([
    undefined,
    "{",
    "null",
    '{"version":1,"dependencies":[]}',
    '{"version":2,"dependencies":["x"]}'
  ])("legado ou ledger inválido não autoriza replay: %s", (value) => {
    expect(parseDocumentaryReplayLedger(value)).toBeUndefined();
    expect(canReplayDocumentaryAnswer(parseDocumentaryReplayLedger(value), [first])).toBe(false);
  });
});

describe("Spec 059 — categorias e completude", () => {
  it("mantém preço das duas versões na comparação de renovação", () => {
    const sources = [
      createEvidence({
        documentTitle: "Contrato FICTÍCIO",
        content: "Preço mensal: R$ 1.234,00. Vigência: 01/01/2026 a 31/12/2026."
      }),
      createEvidence({
        id: "minuta",
        documentVersionId: "v2",
        documentTitle: "Contrato FICTÍCIO",
        validityStatus: "pending",
        content: "Preço mensal proposto: R$ 1.567,00. Vigência proposta: 2027."
      })
    ];
    const checklist = buildCompletionChecklist(
      "Compare o preço e a vigência para renovar o contrato.",
      [],
      ["contracts"],
      sources,
      []
    );
    expect(checklist.filter((item) => item.key === "contract_price")).toHaveLength(2);
    expect(
      missingCompletionKeys(
        checklist.filter((item) => item.key === "contract_price"),
        generated("A proposta é R$ 1.567,00."),
        sources
      )
    ).toContain("contract_price");
    expect(
      missingCompletionKeys(
        checklist.filter((item) => item.key === "contract_price"),
        generated("O preço confirmado é R$ 1.234,00; a minuta propõe R$ 1.567,00."),
        sources
      )
    ).toEqual([]);
  });
  it("mencionar encargos/aceite de uma unidade não cobre outra", () => {
    const sources = ["U-A", "U-B"].map((unit, index) =>
      createEvidence({
        id: `acordo-${index}`,
        documentTitle: "Posição FICTÍCIA de cotas e acordos",
        content: `Unidade ${unit}: proposta de acordo pendente de aceite. Encargos sujeitos a conferência.`
      })
    );
    const checklist = buildCompletionChecklist(
      "Conclua a negociação de U-A e U-B, com aceite e encargos.",
      [],
      ["arrears"],
      sources,
      []
    );
    const items = checklist.filter((item) =>
      ["agreement_status", "collection_charges"].includes(item.key)
    );
    expect(items).toHaveLength(4);
    expect(
      missingCompletionKeys(
        items,
        generated("U-A: falta conferir aceite e encargos. U-B: há uma proposta."),
        sources
      )
    ).toEqual(expect.arrayContaining(["agreement_status", "collection_charges"]));
    expect(
      missingCompletionKeys(
        items,
        generated("U-A: falta conferir aceite e encargos. U-B: falta conferir aceite e encargos."),
        sources
      )
    ).toEqual([]);
  });
  it("resultado derivado total não ganha classificação ordinária sem segregação", () => {
    const excerpt =
      "FICTÍCIO. Competência janeiro de 2026. Receitas: R$ 100,00. Despesas: R$ 80,00.";
    const answer = {
      ...generated("O superávit ordinário é R$ 20,00."),
      citations: [
        {
          evidenceId: "f1",
          documentId: "d1",
          documentVersionId: "v1",
          title: "Balancete FICTÍCIO",
          page: 1,
          excerpt
        }
      ]
    };
    expect(answerFidelityFailure(answer)).toBe("financial_result_scope_mismatch");
    expect(
      answerFidelityFailure({
        ...answer,
        answer: "| Período | Resultado ordinário |\n| --- | --- |\n| Janeiro | R$ 20,00 |"
      })
    ).toBe("financial_result_scope_mismatch");
    expect(
      answerFidelityFailure({ ...answer, answer: "O resultado total do período é R$ 20,00." })
    ).toBeUndefined();
    expect(
      answerFidelityFailure({
        ...answer,
        answer: "Não posso confirmar superávit ordinário de R$ 20,00 sem segregação."
      })
    ).toBeUndefined();
  });
  it("condições da bateria respeitam esforço explícito e excluem 5.6", () => {
    expect(
      correctedConditions.map((condition) => [
        condition.model,
        condition.reasoningEffort,
        condition.memory
      ])
    ).toEqual([
      ["gpt-6-luna", "high", true],
      ["gpt-6.1-sol", "low", true]
    ]);
  });
});
