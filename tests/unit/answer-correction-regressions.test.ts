import { describe, expect, it, vi } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import {
  validateTaskCoverage,
  withAnswerTaskFocus,
  withGenerationContract,
  withValidationContract
} from "../../apps/api/answers/answer-task-context.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import { documentaryDates } from "../../apps/api/answers/documentary-dates.js";

const response = (
  answer: string,
  evidence: readonly RetrievalEvidence[] = []
): GeneratedAnswer => ({
  answer,
  answerMode: evidence.length ? "grounded" : "abstained",
  citations: evidence.map((source) => ({
    evidenceId: source.id,
    documentId: source.documentId,
    documentVersionId: source.documentVersionId,
    title: source.documentTitle,
    page: source.pageNumber,
    excerpt: source.content
  })),
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null },
  claims: []
});
const input = (
  question: string,
  evidence: readonly RetrievalEvidence[],
  questions: string[] = []
): AnswerGatewayInput =>
  withGenerationContract({
    question,
    task: "grounded_answer",
    riskClass: "low",
    evidence,
    conversationContext: withAnswerTaskFocus(
      question,
      {
        policyVersion: "recent-chat-v1",
        turns: questions.map((question) => ({ question })),
        bytes: 0,
        omittedAnswers: questions.length,
        omittedTurns: 0,
        windowScope: "recent_only_start_unknown"
      },
      evidence
    )!,
    budget: { maximumOutputTokens: 1500, maximumCostMicrounits: 0 }
  });
const quarter = [
  ["junho", "1.000,00", "1.200,00"],
  ["julho", "600,00", "400,00"],
  ["agosto", "700,00", "700,00"]
].map(([month, revenue, expense], index) =>
  createEvidence({
    id: `correction-quarter-${index}`,
    documentId: `correction-month-${index}`,
    documentVersionId: `correction-month-${index}-v1`,
    documentTitle: `Balancete sintético de ${month}`,
    content: `FICTÍCIO. Competência ${month} de 2026. Receitas recebidas: R$ ${revenue}. Despesas pagas: R$ ${expense}.`
  })
);
const table = (label: string, column = "Resultado do período", value = "R$ 0,00") =>
  `| Período | ${column} |\n|---|---:|\n| ${label} | ${value} |`;

describe("Spec 056 — continuação: resultado tabular com procedência", () => {
  it.each([
    "Fechamento de junho a agosto",
    "Total de junho a agosto de 2026",
    "Fechamento do trimestre"
  ])("reconhece %s pela coluna de resultado", (label) => {
    expect(answerFidelityFailure(response(table(label), quarter))).toBeUndefined();
  });
  it.each([
    ["Fechamento de janeiro a março", "Resultado", "R$ 0,00"],
    ["Fechamento de junho a agosto de 2027", "Resultado", "R$ 0,00"],
    ["Fechamento de junho a agosto", "Saldo final", "R$ 0,00"],
    ["Fechamento de junho a agosto", "Taxa", "R$ 0,00"],
    ["Fechamento de junho a agosto", "Resultado", "R$ 93,00"]
  ])("recusa período/coluna/valor sem suporte: %s / %s", (label, column, value) => {
    expect(answerFidelityFailure(response(table(label, column, value), quarter))).toBe(
      "unsupported_monetary_assertion"
    );
  });
  it("não usa outra coluna nem o cabeçalho de uma tabela encerrada", () => {
    const body =
      "| Período | Resultado | Taxa |\n|---|---:|---:|\n| Trimestre | R$ 0,00 | R$ 0,00 |";
    expect(answerFidelityFailure(response(body, quarter))).toBe("unsupported_monetary_assertion");
    const detached = `${table("Trimestre")}\n\n| Fechamento de junho a agosto | R$ 0,00 |`;
    expect(answerFidelityFailure(response(detached, quarter))).toBe(
      "unsupported_monetary_assertion"
    );
    const sameRowDifferentColumn = `${table("Trimestre")}\n\n${table("Trimestre", "Saldo final")}`;
    expect(answerFidelityFailure(response(sameRowDifferentColumn, quarter))).toBe(
      "unsupported_monetary_assertion"
    );
  });
  it("recusa falta, intervalo incompleto, divergência e soma não zero", () => {
    const body = table("Fechamento de junho a agosto");
    for (const sources of [
      quarter.slice(0, 2),
      [
        quarter[0]!,
        quarter[1]!,
        { ...quarter[2]!, content: quarter[2]!.content.replace("agosto", "outubro") }
      ],
      [
        quarter[0]!,
        quarter[1]!,
        {
          ...quarter[2]!,
          content: quarter[2]!.content.replace(
            "Despesas pagas: R$ 700,00",
            "Despesas pagas: R$ 800,00"
          )
        }
      ],
      [...quarter, { ...quarter[0]!, id: "conflicting-copy", documentVersionId: "other-version" }]
    ]) {
      expect(answerFidelityFailure(response(body, sources))).toBe("unsupported_monetary_assertion");
    }
  });
  it("não libera zero como resultado de outro trimestre por diferença entre operandos iguais", () => {
    expect(
      answerFidelityFailure(
        response("O resultado de janeiro a março de 2026 foi R$ 0,00.", quarter)
      )
    ).toBe("unsupported_monetary_assertion");
  });
  it("resultado mensal zero requer receitas e despesas da competência nomeada", () => {
    expect(
      answerFidelityFailure(
        response("Os resultados de junho, julho e agosto totalizam R$ 0 no trimestre.", quarter)
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(response("O resultado de agosto de 2026 foi R$ 0,00.", quarter))
    ).toBeUndefined();
    expect(answerFidelityFailure(response(table("Agosto"), quarter))).toBeUndefined();
    for (const body of [
      "O resultado de julho foi R$ 0,00.",
      "O resultado de agosto de 2027 foi R$ 0,00.",
      "O resultado do segundo trimestre foi R$ 0,00."
    ])
      expect(answerFidelityFailure(response(body, quarter))).toBe("unsupported_monetary_assertion");
  });
  it("tabela de resultado cobre o pedido sem depender de repetir o número em prosa", () => {
    const request = input("Resuma o resultado financeiro do trimestre.", quarter);
    const body = table("Fechamento de junho a agosto");
    const generated = response(body, quarter);
    expect(() => validateGeneratedAnswer(generated, quarter)).not.toThrow();
    expect(() => validateTaskCoverage(request, generated)).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        request,
        response(table("Fechamento de junho a agosto", "Saldo final", "R$ 700,00"), quarter)
      )
    ).toThrow(
      expect.objectContaining({ missingCoverageKeys: expect.arrayContaining(["financial_result"]) })
    );
  });
});

describe("Spec 056 — causas adicionais demonstradas na contraprova R4", () => {
  it.each(["Resultado do mês", "Resultado de caixa", "Resultado do trimestre"])(
    "cabeçalho financeiro equivalente: %s",
    (header) => {
      const generated = response(table("Fechamento de junho a agosto", header), quarter);
      expect(() => validateGeneratedAnswer(generated, quarter)).not.toThrow();
      expect(() =>
        validateTaskCoverage(
          input("Resuma o resultado financeiro do trimestre.", quarter),
          generated
        )
      ).not.toThrow();
    }
  );
  it("cabeçalho de projeção não comprova resultado real", () => {
    expect(
      answerFidelityFailure(
        response(table("Fechamento de junho a agosto", "Resultado previsto"), quarter)
      )
    ).toBe("unsupported_monetary_assertion");
  });
  it("fechamento trimestral pedido na janela não se perde ao resumir os meses", () => {
    const request = input("Termine com o que precisa ser conferido pelo contador.", quarter, [
      "Monte um quadro com saldo e resultado.",
      "Adicione uma linha de fechamento trimestral sem duplicar saldos."
    ]);
    const monthly = table("Junho", "Resultado do mês", "R$ 1.000,00");
    expect(() => validateTaskCoverage(request, response(monthly, quarter))).toThrow(
      expect.objectContaining({ missingCoverageKeys: expect.arrayContaining(["quarter_result"]) })
    );
    expect(() =>
      validateTaskCoverage(
        input("Termine com o que precisa ser conferido pelo contador.", quarter.slice(0, 2), [
          "Monte um quadro com saldo e resultado.",
          "Adicione uma linha de fechamento trimestral sem duplicar saldos."
        ]),
        response(
          `${monthly}\n\nNão é possível calcular o resultado do trimestre: falta o balancete da terceira competência. Concilie os extratos e confira os comprovantes.`,
          quarter.slice(0, 2)
        )
      )
    ).not.toThrow();
  });
  it("exclusão explícita não restaura fechamento trimestral pedido antes", () => {
    const request = input(
      "Resuma o quadro financeiro, sem incluir o fechamento trimestral.",
      quarter,
      ["Adicione uma linha de fechamento trimestral."]
    );
    expect(
      (request.conversationContext!.taskFocus!.completionChecklist ?? []).map((item) => item.key)
    ).not.toContain("quarter_result");
  });
  it.each([
    "Não há evidência documental de que a taxa tenha mudado para R$ 83,50.",
    "Ela não comprova uma alteração para R$ 83,50.",
    "A convenção prevê deliberação, mas os documentos apresentados não comprovam mudança da taxa para R$ 83,50."
  ])("ausência de comprovação não afirma valor: %s", (body) => {
    const source = createEvidence({ content: "FICTÍCIO. Taxa: R$ 150,00." });
    expect(answerFidelityFailure(response(body, [source]))).toBeUndefined();
    expect(answerFidelityFailure(response(`${body} O saldo é R$ 99,00.`, [source]))).toBe(
      "unsupported_monetary_assertion"
    );
  });
  it("negação sobre outro objeto não qualifica o valor afirmado depois", () => {
    expect(
      answerFidelityFailure(
        response("Não há evidência sobre a alteração, e o saldo é R$ 83,50.", quarter)
      )
    ).toBe("unsupported_monetary_assertion");
  });
  it.each(["Resultado do mês", "Resultado de caixa¹", "**Resultado**"])(
    "total trimestral acompanha a rubrica e a coluna: %s",
    (header) => {
      const body = `| Período | Receitas | Despesas | ${header} | Saldo final |\n|---|---:|---:|---:|---:|\n| **Trimestre** | R$ 2.300 | R$ 2.300 | R$ 0 | R$ 700 |`;
      expect(answerFidelityFailure(response(body, quarter))).toBeUndefined();
      for (const invalid of [
        body.replace("R$ 2.300", "R$ 1.700"),
        body.replace("R$ 0", "R$ 700"),
        body.replace("R$ 700 |", "R$ 2.300 |"),
        body.replace("R$ 2.300", "−R$ 2.300"),
        body.replace("R$ 2.300", "(R$ 2.300)")
      ])
        expect(answerFidelityFailure(response(invalid, quarter))).toBe(
          "unsupported_monetary_assertion"
        );
      expect(answerFidelityFailure(response(body, quarter.slice(0, 2)))).toBe(
        "unsupported_monetary_assertion"
      );
    }
  );
  it("totais em prosa exigem a rubrica e a soma das competências", () => {
    for (const body of [
      "O trimestre totaliza R$ 2.300 recebidos e R$ 2.300 pagos.",
      "O trimestre totaliza R$ 2300 recebidos e R$ 2300 pagos.",
      "As receitas e despesas do trimestre somam R$ 2.300 cada."
    ])
      expect(answerFidelityFailure(response(body, quarter))).toBeUndefined();
    for (const body of [
      "As receitas do trimestre somam R$ 1.700.",
      "A taxa do trimestre foi R$ 2.300.",
      "O trimestre totaliza −R$ 2.300 recebidos e R$ 2.300 pagos.",
      "As receitas do trimestre somam R$ 2.300 e a taxa é R$ 2.300."
    ])
      expect(answerFidelityFailure(response(body, quarter))).toBe("unsupported_monetary_assertion");
    expect(
      answerFidelityFailure(
        response(
          "| Período | Receitas | Despesas | Resultado |\n|---|---:|---:|---:|\n| Agosto | R$ 0 | R$ 0 | R$ 0 |",
          quarter
        )
      )
    ).toBe("unsupported_monetary_assertion");
  });
  it.each([
    "A menção a R$ 83,50 não comprova alteração da taxa.",
    "A referência ao valor de R$ 92,40 não confirma a regra."
  ])("negação limita-se à menção: %s", (body) => {
    const source = createEvidence({ content: "FICTÍCIO. A taxa documentada é R$ 150,00." });
    expect(answerFidelityFailure(response(body, [source]))).toBeUndefined();
    for (const falseAssertion of [
      `${body} O saldo é R$ 99,00.`,
      body.replace("não comprova", "comprova").replace("não confirma", "confirma"),
      `${body.slice(0, -1)}, e o saldo é R$ 99,00.`
    ])
      expect(answerFidelityFailure(response(falseAssertion, [source]))).toBe(
        "unsupported_monetary_assertion"
      );
  });
});

describe("Spec 056 — continuação: conteúdo do reparo", () => {
  it.each([
    JSON.stringify({ response: "Uma resposta.", answerMode: "abstention", claims: [] }),
    `Exemplo técnico: {"saldo":10}. ${JSON.stringify({ response: "Uma resposta.", answerMode: "abstained", claims: [] })}`,
    `Texto antes. ${JSON.stringify({ response: "Uma resposta.", answerMode: "grounded", attentionPoints: [] })} Texto depois.`,
    `\u0060\u0060\u0060json\n${JSON.stringify({ response: "Uma resposta.", answerMode: "abstention", citations: [] })}\n\u0060\u0060\u0060`,
    JSON.stringify({ answer: "Uma resposta.", answerMode: "abstained", citations: [] }),
    JSON.stringify({
      answer: "Uma resposta.",
      answerMode: "abstention",
      claims: [],
      attentionPoints: []
    }),
    `Aqui está:\n\u0060\u0060\u0060json\n${JSON.stringify({ answer: "Uma resposta.", answerMode: "abstained", citations: [] })}\n\u0060\u0060\u0060`
  ])("recusa envelope do protocolo dentro da fala", (body) => {
    expect(() => validateGeneratedAnswer(response(body), [])).toThrow(
      expect.objectContaining({ code: "answer_body_protocol_json" })
    );
  });
  it("preserva JSON técnico pertinente que não é envelope da resposta", () => {
    expect(() =>
      validateGeneratedAnswer(response('Exemplo: {"saldo": 10, "unidade": "teste"}.'), [])
    ).not.toThrow();
  });
  it.each([
    "A resposta apenas reproduz valores documentados; não é necessária validação contábil para esta conclusão factual.",
    "Não há necessidade de um contador para esta resposta.",
    "A validação humana é desnecessária neste caso."
  ])("recusa indicador de especialista contradito pelo motivo: %s", (reason) => {
    const generated = {
      ...response("Confira os documentos."),
      specialist: { required: true, type: "contador" as const, reason }
    };
    expect(() => validateGeneratedAnswer(generated, [])).toThrow(
      expect.objectContaining({ code: "specialist_reason_contradiction" })
    );
  });
  it.each([
    "Não é necessária avaliação de engenharia; a conciliação exige contador.",
    "Não é desnecessária a validação contábil: os saldos precisam de conciliação.",
    "A validação contábil é necessária para conferir os comprovantes."
  ])("negação sobre outro encaminhamento não invalida contador: %s", (reason) => {
    expect(() =>
      validateGeneratedAnswer(
        {
          ...response("Confira os documentos."),
          specialist: { required: true, type: "contador", reason }
        },
        []
      )
    ).not.toThrow();
  });
  it("reparo de minuta explicita a qualificação sem mudar a saída", () => {
    const pending = createEvidence({ validityStatus: "pending" });
    const repaired = withValidationContract(
      input("Resuma a regra da minuta.", [pending]),
      "pending_source_as_confirmed"
    );
    expect(repaired.conversationContext!.taskFocus!.validationContract).toMatchObject({
      repairInstruction:
        "For every claim citing pendingEvidenceIds, use claimType=interpretation and evidenceRequired=true, and rewrite the statement and visible prose as an unconfirmed proposal. Descriptions of a draft also use interpretation. Never confirm applicability or change only the claim type while retaining a confirmed assertion."
    });
    expect(repaired.evidence).toEqual([pending]);
    expect(repaired.conversationContext!.bytes).toBeLessThanOrEqual(12000);
  });
  it.each([false, true])(
    "pipeline usa só um reparo e conserva falha final: %s",
    async (repeatInvalid) => {
      const generate = vi.fn(async (request: AnswerGatewayInput) => ({
        output: response(
          request.validationFeedback && !repeatInvalid
            ? "Posso ajudar a organizar a pauta."
            : JSON.stringify({
                answer: "CANARIO_REJEITADO",
                answerMode: "abstained",
                citations: []
              })
        ),
        telemetry: createAnswerTelemetry()
      }));
      const result = await createAnswerUseCase({
        gateway: { generate },
        retriever: { search: async () => createRetrievalResult([]) },
        persistence: createInMemoryAnswerPersistence(),
        chatMemoryEnabled: true
      }).ask(managerContext, {
        question: "Como posso organizar a pauta?",
        chatId: "00000000-0000-4000-8000-000000000059",
        requestId: `protocol-body-${repeatInvalid}`,
        revalidateConversation: async () => {}
      });
      expect(generate).toHaveBeenCalledTimes(2);
      expect(result.answer).not.toContain("CANARIO_REJEITADO");
      expect(result.answerMode).toBe(repeatInvalid ? "failed" : "abstained");
      const repair = generate.mock.calls[1]![0];
      expect(repair.validationFeedback).toBe("answer_body_protocol_json");
      expect(JSON.stringify(repair)).not.toContain("CANARIO_REJEITADO");
      expect(
        repair.conversationContext!.taskFocus!.validationContract!.repairInstruction
      ).toContain("prose");
    }
  );
});

describe("Spec 056 — continuação: condições materiais das fontes", () => {
  const contract = createEvidence({
    documentTitle: "Contrato sintético de limpeza",
    content: "FICTÍCIO. Vigência até 30/11/2027. Renovação por escrito."
  });
  it.each([
    "O contrato tem vigência e renovação escrita.",
    "Confira o contrato, que está vigente até 30/11/2028."
  ])("vigência sem a data final correta não cobre renovação: %s", (body) => {
    expect(() =>
      validateTaskCoverage(
        input("Conclua a análise da renovação do contrato.", [contract]),
        response(body, [contract])
      )
    ).toThrow(
      expect.objectContaining({ missingCoverageKeys: expect.arrayContaining(["validity"]) })
    );
  });
  it.each([
    "O contrato tem vigência até 30/11/2027.",
    "O contrato vence em 30 de novembro de 2027.",
    "Não consigo confirmar a vigência atual do contrato; preciso do aditivo assinado."
  ])("data equivalente ou limite específico cobre renovação: %s", (body) => {
    expect(() =>
      validateTaskCoverage(
        input("Conclua a análise da renovação do contrato.", [contract]),
        response(body, [contract])
      )
    ).not.toThrow();
  });
  const minutes = createEvidence({
    documentTitle: "Ata de assembleia sintética",
    content:
      "FICTÍCIO. Foi eleito síndico para mandato de 01/07/2027 a 30/06/2029. Votação: 18 votos favoráveis e 2 contrários. A utilização de até R$ 7.000,00 da reserva depende da seleção e assinatura do contrato."
  });
  it("reserva condicional, eleição e votação são aspectos distintos", () => {
    const request = input("Resuma as decisões da assembleia e a eleição com votação.", [minutes]);
    expect(() =>
      validateTaskCoverage(
        request,
        response("A assembleia aprovou a obra e elegeu síndico.", [minutes])
      )
    ).toThrow(
      expect.objectContaining({
        missingCoverageKeys: expect.arrayContaining([
          "assembly_reserve_conditions",
          "assembly_mandate",
          "assembly_voting"
        ])
      })
    );
    expect(() =>
      validateTaskCoverage(
        request,
        response(
          "A assembleia elegeu síndico para mandato de 01/07/2027 a 30/06/2029, com 18 votos favoráveis e 2 contrários. A reserva de R$ 7.000 depende da seleção e assinatura do contrato.",
          [minutes]
        )
      )
    ).not.toThrow();
  });
  it("recorte explícito de eleição não força reserva, nem inventa mandato sem a página", () => {
    const request = input("Resuma somente a eleição, sem incluir a reserva.", [minutes]);
    const keys = (request.conversationContext!.taskFocus!.completionChecklist ?? []).map(
      (item) => item.key
    );
    expect(keys).not.toContain("assembly_reserve_conditions");
    expect(
      input("Resuma somente a eleição.", [
        minutes
      ]).conversationContext!.taskFocus!.completionChecklist?.map((item) => item.key)
    ).not.toContain("assembly_reserve_conditions");
    const missingPage = {
      ...minutes,
      content: "FICTÍCIO. A lista de presença não acompanha esta página."
    };
    const incomplete = input("Conclua a análise do mandato e da votação.", [missingPage]);
    expect(
      incomplete.conversationContext!.taskFocus!.completionChecklist!.map((item) => item.key)
    ).not.toContain("assembly_mandate");
    expect(() =>
      validateTaskCoverage(
        incomplete,
        response("Faltam a página da eleição e o registro de votação para confirmar o mandato.", [
          missingPage
        ])
      )
    ).not.toThrow();
  });
  it("a condição real da reserva pode ser laudo, sem exigir assinatura alheia à fonte", () => {
    const technicalCondition = {
      ...minutes,
      content: "FICTÍCIO. Foi aprovado uso de até R$ 7.000 da reserva após laudo técnico favorável."
    };
    const request = input("Resuma as decisões da assembleia.", [technicalCondition]);
    expect(() =>
      validateTaskCoverage(
        request,
        response("Foi aprovado o uso da reserva após laudo técnico favorável.", [
          technicalCondition
        ])
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        request,
        response("Foi aprovado o uso da reserva após a seleção do fornecedor.", [
          technicalCondition
        ])
      )
    ).toThrow(
      expect.objectContaining({
        missingCoverageKeys: expect.arrayContaining(["assembly_reserve_conditions"])
      })
    );
  });
  it("datas de formatos mistos mantêm a ordem e datas inválidas não são inferidas", () => {
    expect(
      documentaryDates(
        "1 de janeiro de 2027; 30/11/2027; 2028-02-29; 29/02/2027; 31/13/2027; 0/01/2027; 40 de abril de 2027; 1 de inexistente de 2027"
      )
    ).toEqual(["2027-01-01", "2027-11-30", "2028-02-29"]);
    const mixedDates = {
      ...contract,
      content: "FICTÍCIO. Vigência de 1 de janeiro de 2027 a 30/11/2027."
    };
    expect(() =>
      validateTaskCoverage(
        input("Conclua a renovação do contrato.", [mixedDates]),
        response("O contrato vence em 30 de novembro de 2027.", [mixedDates])
      )
    ).not.toThrow();
  });
});
