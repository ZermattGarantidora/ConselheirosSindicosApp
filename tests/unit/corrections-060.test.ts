import { describe, expect, it } from "vitest";
import { Ajv } from "ajv";
import { createEvidence } from "./answer-fixtures.js";
import { answerSchema } from "../../apps/api/answers/openai-answer-gateway.js";
import {
  withAnswerTaskFocus,
  validateTaskCoverage
} from "../../apps/api/answers/answer-task-context.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import {
  buildCompletionChecklist,
  missingCompletionKeys
} from "../../apps/api/answers/answer-completion-plan.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";

const response = (answer: string, sources: readonly RetrievalEvidence[] = []): GeneratedAnswer => ({
  answer,
  answerMode: sources.length ? "grounded" : "abstained",
  citations: sources.map((s) => ({
    evidenceId: s.id,
    documentId: s.documentId,
    documentVersionId: s.documentVersionId,
    title: s.documentTitle,
    page: s.pageNumber,
    excerpt: s.content
  })),
  claims: [],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
});
const financial = createEvidence({
  documentTitle: "Balancete FICTÍCIO julho",
  content:
    "FICTÍCIO. Competência julho de 2026. Receitas recebidas: R$ 33.000,00. Despesas pagas: R$ 31.000,00. Saldo final: R$ 14.000,00. Reserva vinculada: R$ 6.000,00. Disponibilidade ordinária: R$ 8.000,00."
});
describe("Spec060 — schema, referências e completude", () => {
  it("schema impede fato com fonte pendente sem reclassificar o conteúdo", () => {
    const pending = createEvidence({ id: "draft", validityStatus: "pending" });
    const validate = new Ajv({ strict: false }).compile(answerSchema([financial, pending]));
    const claim = {
      statement: "A minuta propõe alteração,sem comprovar aceite.",
      claimType: "condominium_fact",
      evidenceRequired: true,
      citationEvidenceIds: ["draft"]
    };
    const output = { ...response("Confira as versões."), claims: [claim] };
    expect(validate(output)).toBe(false);
    expect(validate({ ...output, claims: [{ ...claim, claimType: "interpretation" }] })).toBe(true);
    expect(
      validate({ ...output, claims: [{ ...claim, citationEvidenceIds: [financial.id] }] })
    ).toBe(false);
    const confirmedOnly = new Ajv({ strict: false }).compile(answerSchema([financial]));
    expect(
      confirmedOnly({ ...output, claims: [{ ...claim, citationEvidenceIds: [financial.id] }] })
    ).toBe(true);
    expect(validate({ ...output, claims: [{ ...claim, citationEvidenceIds: ["estranho"] }] })).toBe(
      false
    );
    const onlyPending = new Ajv({ strict: false }).compile(answerSchema([pending]));
    expect(onlyPending({ ...output, claims: [{ ...claim, claimType: "interpretation" }] })).toBe(
      true
    );
    expect(onlyPending(output)).toBe(false);
  });
  it("retorno à competência corrigida exclui obrigação de outro mês,sem perder resultado", () => {
    const question = "Prepare uma mensagem com esses números corrigidos.";
    const turns = [
      "Corrigindo: o fechamento que preciso é julho.",
      "Então posso chamar o saldo de lucro de julho?",
      "Qual comprovante o balancete de agosto diz faltar?",
      "Volte ao mês que corrigi no começo: saldo e disponibilidade ordinária?"
    ].map((question) => ({ question }));
    const memory = withAnswerTaskFocus(
      question,
      { policyVersion: "recent-chat-v1", turns, bytes: 0, omittedAnswers: 0, omittedTurns: 0 },
      [financial]
    )!;
    expect(memory.taskFocus!.requirements?.some((r) => r.key === "supporting_records")).toBe(false);
    const input = {
      question,
      task: "grounded_answer" as const,
      riskClass: "low" as const,
      evidence: [financial],
      conversationContext: memory,
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
    };
    const answer =
      "Recebemos R$ 33.000 e pagamos R$ 31.000,uma diferença de R$ 2.000 no mês. O saldo final foi R$ 14.000,com R$ 6.000 de reserva vinculada e R$ 8.000 de disponibilidade ordinária.";
    expect(() => validateTaskCoverage(input, response(answer, [financial]))).not.toThrow();
    expect(answerFidelityFailure(response(answer, [financial]))).toBeUndefined();
    expect(answerFidelityFailure(response(answer.replace("2.000", "2.500"), [financial]))).toBe(
      "unsupported_monetary_assertion"
    );
    const comparison = withAnswerTaskFocus(
      "Compare julho e agosto e confira os comprovantes.",
      { policyVersion: "recent-chat-v1", turns, bytes: 0, omittedAnswers: 0, omittedTurns: 0 },
      [financial]
    )!;
    expect(comparison.taskFocus?.requirements?.some((r) => r.key === "supporting_records")).toBe(
      true
    );
  });
  it.each(["u-b", "bl-73"])(
    "principal da referência corrigida não vira número de apartamento: %s",
    (unit) => {
      const source = createEvidence({
        documentTitle: "Posição FICTÍCIA de cotas e acordos",
        content: `Unidade ${unit}: principal de R$ 740,00,referente a quatro cotas. U-Z: principal de R$ 990,00.`
      });
      const checklist = buildCompletionChecklist(
        "Qual número precisa constar para não trocar as duas de novo?",
        [],
        [],
        [source],
        [],
        [unit]
      );
      const items = checklist.filter((i) => i.key === "collection_principal");
      expect(items).toHaveLength(1);
      expect(missingCompletionKeys(items, response(`Use a unidade ${unit}.`), [source])).toContain(
        "collection_principal"
      );
      expect(
        missingCompletionKeys(items, response(`Unidade ${unit}: principal R$ 740,00.`), [source])
      ).toEqual([]);
      expect(
        missingCompletionKeys(items, response(`Unidade ${unit}: principal R$ 990,00.`), [source])
      ).toContain("collection_principal");
    }
  );
  it("sem IDs recentes,acordos são separados por referência das fontes atuais", () => {
    const sources = [
      createEvidence({
        documentTitle: "Posição FICTÍCIA de cotas e acordos",
        content:
          "FICTÍCIO. Data-base: 31/08/2026. Revisão pós-acordo. U-P: proposta sem assinatura. U-Q: proposta sem pagamento."
      })
    ];
    const checklist = buildCompletionChecklist(
      "Feche o próximo passo para cada unidade.",
      ["Não calcule encargos da cobrança sem conferir."],
      [],
      sources,
      []
    );
    expect(checklist.filter((i) => i.key === "agreement_status").map((i) => i.reference)).toEqual([
      "u-p",
      "u-q"
    ]);
  });
  it.each(["Unidade fictícia bloco-42 solicita parcelamento.", "bloco-42: principal R$ 740,00."])(
    "AC-6003c: referência de fonte exige unidade ou linha financeira: %s",
    (content) => {
      const sources = [
        createEvidence({
          documentTitle: "Posição FICTÍCIA de cotas e acordos",
          content: `FICTÍCIO. Data-base: 31/08/2026. ${content} Sem assinatura ou pagamento.`
        })
      ];
      const checklist = buildCompletionChecklist(
        "Feche o próximo passo para cada unidade.",
        [],
        [],
        sources,
        []
      );
      const items = checklist.filter((i) => i.key === "agreement_status");
      expect(items.map((i) => i.reference)).toEqual(["bloco-42"]);
      expect(
        missingCompletionKeys(items, response("Confira bloco-42 com a administração."), sources)
      ).toContain("agreement_status");
      expect(
        missingCompletionKeys(items, response("bloco-42: confira assinatura e pagamento."), sources)
      ).toEqual([]);
    }
  );
  it("abstenção não esconde regra afirmativa depois de não posso afirmar", () => {
    expect(
      answerFidelityFailure(
        response("Em geral,os documentos exigem regras e prazos claros para avaliar propostas.")
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(
        response(
          "Não posso afirmar que a condição foi cumprida: os registros dizem que ela depende da análise de três propostas."
        )
      )
    ).toBe("abstention_local_assertion");
    expect(
      answerFidelityFailure(
        response(
          "Não posso afirmar que a condição foi cumprida;preciso conferir as fontes aplicáveis."
        )
      )
    ).toBeUndefined();
  });
  it("diferença anual usa preços de versões do mesmo contrato,com período explícito", () => {
    const sources = [
      createEvidence({ documentTitle: "Contrato FICTÍCIO", content: "Preço mensal: R$ 4.000,00." }),
      createEvidence({
        id: "minuta",
        documentTitle: "Minuta de aditivo FICTÍCIO",
        documentVersionId: "v2",
        content: "Preço proposto: R$ 4.400,00."
      })
    ];
    const sentence =
      "A diferença proposta é R$ 400 por mês e corresponderia a R$ 4.800 em 12 meses.";
    expect(answerFidelityFailure(response(sentence, sources))).toBeUndefined();
    expect(answerFidelityFailure(response(sentence.replace("4.800", "4.801"), sources))).toBe(
      "unsupported_monetary_assertion"
    );
    expect(
      answerFidelityFailure(
        response(sentence, [sources[0]!, { ...sources[1]!, documentId: "outro" }])
      )
    ).toBe("unsupported_monetary_assertion");
    expect(
      answerFidelityFailure(
        response(
          sentence.replace("R$ 4.800 em 12 meses", "R$ 4.800 por mês durante 12 meses"),
          sources
        )
      )
    ).toBe("unsupported_monetary_assertion");
  });
});
