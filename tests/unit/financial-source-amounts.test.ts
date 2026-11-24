import { describe, expect, it } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { createEvidence } from "./answer-fixtures.js";

const source = (
  content: string,
  title = "Balancete FICTÍCIO — abril de 2028",
  declaredBrl = true
) =>
  createEvidence({
    documentTitle: title,
    content: `${declaredBrl ? "Valores em reais.\n" : ""}${content}`
  });

function generated(content: string, evidence: ReturnType<typeof source>): GeneratedAnswer {
  return {
    answer: content,
    answerMode: "grounded",
    citations: [
      {
        evidenceId: evidence.id,
        documentId: evidence.documentId,
        documentVersionId: evidence.documentVersionId,
        title: evidence.documentTitle,
        page: evidence.pageNumber,
        excerpt: evidence.content
      }
    ],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null },
    claims: [
      {
        statement: content,
        claimType: "condominium_fact",
        evidenceRequired: true,
        citationEvidenceIds: [evidence.id]
      }
    ]
  };
}

describe("Spec 056 — valores monetários em tabelas sem R$ em cada célula", () => {
  it("acrescenta a declaração de moeda recuperada sem modificar a fonte gerada", () => {
    const declaration = source("Balancete FICTÍCIO mensal");
    const table = {
      ...source(
        "Data Ref. Histórico Conta Entrada Saída\n04/04 FIC-01 Cotas do mês, 18 unidades OP 16.200,00 0,00",
        undefined,
        false
      ),
      id: "detail",
      pageNumber: 2
    };
    const answer = generated("As cotas recebidas foram de R$ 16.200,00.", table);
    const validated = validateGeneratedAnswer(answer, [table, declaration]);
    expect(answer.citations).toHaveLength(1);
    expect(validated.citations).toHaveLength(2);
    expect(validated.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          page: 1,
          excerpt: declaration.content,
          startOffset: 0,
          endOffset: Array.from(declaration.content).length
        })
      ])
    );
  });
  it.each([
    { documentVersionId: "other-version" },
    { documentId: "other-document" },
    { sourceScope: "legislation" as const },
    { validityStatus: "pending" as const },
    { processingStatus: "needs_review" as const },
    { qualityScore: 0.2 }
  ])("não usa contexto de moeda inelegível: %j", (overrides) => {
    const declaration = { ...source("FICTÍCIO"), ...overrides };
    const table = {
      ...source("Entradas Saídas\n173,80 156,40", undefined, false),
      id: "detail",
      pageNumber: 2
    };
    expect(() =>
      validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", table), [
        table,
        declaration
      ])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("mantém conflito de moeda mesmo quando a geração omite a outra declaração", () => {
    const table = source("Entradas Saídas\n173,80 156,40");
    const foreign = {
      ...source("Valores em euros.", undefined, false),
      id: "foreign-currency",
      pageNumber: 2
    };
    expect(() =>
      validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", table), [table, foreign])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("reconhece cabeçalho de descrição e valor e conserva a rubrica", () => {
    const evidence = source(
      "Despesas pagas por grupo\nDescrição Valor\nPessoal e encargos 7.350,00\nSeguro 360,00"
    );
    expect(() =>
      validateGeneratedAnswer(generated("Pessoal e encargos foi de R$ 7.350,00.", evidence), [
        evidence
      ])
    ).not.toThrow();
  });
  it("aceita histórico quebrado uma vez e lançamento completo independente com conta explícita", () => {
    for (const body of [
      "Data Ref. Histórico Conta Entrada Saída\n23/04 FIC-026 Substituição emergencial da bomba de\nrecalque FR 0,00 2.600,00",
      "22/04 FIC-017 Água e esgoto OP 0,00 2.600,00"
    ]) {
      const evidence = source(body);
      expect(() =>
        validateGeneratedAnswer(generated("A saída foi de R$ 2.600,00.", evidence), [evidence])
      ).not.toThrow();
    }
  });
  it("não herda um histórico incompleto através de outra seção", () => {
    const evidence = source(
      "Data Ref. Histórico Conta Entrada Saída\n23/04 FIC-026 Histórico quebrado\nObservações de área\nMedição 0,00 35,75"
    );
    expect(() =>
      validateGeneratedAnswer(generated("O valor foi R$ 35,75.", evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("reúne somente fragmentos contíguos de uma tabela da mesma página", () => {
    const text =
      "Valores em reais.\nConta Saldo anterior Entradas Saídas Saldo final\nConta operacional 1.000,00 500,00 350,00 1.150,00\nFundo de reserva 2.000,00 150,00 0,00 2.150,00";
    const split = text.indexOf("Fundo");
    const first = source(text.slice(0, split), undefined, false);
    const tail = createEvidence({
      ...source(text.slice(split), undefined, false),
      id: "tail",
      startOffset: split,
      endOffset: Array.from(text).length
    });
    const result = validateGeneratedAnswer(generated("A reserva foi de R$ 2.150,00.", tail), [
      tail,
      first
    ]);
    expect(result.citations).toHaveLength(2);
    expect(result.citations.find((c) => c.evidenceId === tail.id)?.excerpt).toBe(text.slice(split));
  });
  it("aceita os valores literais de uma tabela financeira com colunas identificadas", () => {
    const evidence = source(
      "FICTÍCIO — SOMENTE TESTE\nSaldo anterior Entradas Saídas Resultado do mês Saldo final\n8.000,00 17.380,25 15.640,75 1.739,50 9.739,50"
    );
    expect(() =>
      validateGeneratedAnswer(
        generated(
          "As entradas foram de R$ 17.380,25 e as saídas de R$ 15.640,75; o resultado foi R$ 1.739,50.",
          evidence
        ),
        [evidence]
      )
    ).not.toThrow();
  });
  it.each(["Receitas recebidas", "Despesas pagas por grupo"])(
    "aceita os valores sob a seção %s",
    (heading) => {
      const evidence = source(
        `FICTÍCIO — SOMENTE TESTE\n${heading}\nServiço fictício 1.250,75\nOutro item fictício 315,20\nTotal 1.565,95`
      );
      expect(() =>
        validateGeneratedAnswer(generated("O item de serviço registra R$ 1.250,75.", evidence), [
          evidence
        ])
      ).not.toThrow();
    }
  );
  it.each(["Data Histórico Entradas Saídas", "Data Ref. Histórico Conta Entrada Saída"])(
    "aceita lançamentos com cabeçalho %s",
    (heading) => {
      const evidence = source(
        `FICTÍCIO — SOMENTE TESTE\n${heading}\n04/04 Serviço fictício 0,00 1.250,75\nTotal 0,00 1.250,75`
      );
      expect(() =>
        validateGeneratedAnswer(
          generated("O lançamento de serviço foi de R$ 1.250,75.", evidence),
          [evidence]
        )
      ).not.toThrow();
    }
  );
  it.each([
    ["Área privativa\nUnidade Área (m²)\n101 35,75", "R$ 35,75"],
    ["Receitas recebidas\nPercentual de atraso 4,25%", "R$ 4,25"],
    ["Receitas recebidas\nÁrea da sala 35,75 m²", "R$ 35,75"],
    ["Receitas recebidas\nPrazo 2,50 meses", "R$ 2,50"],
    ["Receitas recebidas\nItem fictício 1.250,75", "R$ 9.999,99"],
    ["Receitas recebidas\nItem fictício 1.250,75\nObservações de medição\nÁrea 35,75", "R$ 35,75"]
  ])("recusa número sem suporte monetário: %s", (text, amount) => {
    const evidence = source(text);
    expect(() =>
      validateGeneratedAnswer(generated(`O valor confirmado é ${amount}.`, evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("não deduz moeda só pelo nome do arquivo", () => {
    const evidence = source("FICTÍCIO. Medição da área: 35,75.");
    expect(() =>
      validateGeneratedAnswer(generated("O valor é R$ 35,75.", evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("não transforma quantidades de um documento não financeiro em reais", () => {
    const evidence = source(
      "Entradas Saídas\nMaterial A 12,50 8,25",
      "Controle FICTÍCIO de materiais em kg"
    );
    expect(() =>
      validateGeneratedAnswer(generated("O custo é R$ 12,50.", evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it.each(["", "Valores em euros."])(
    "não presume reais sem declaração de moeda: %s",
    (currency) => {
      const evidence = source(`${currency}\nEntradas Saídas\n12,50 8,25`, undefined, false);
      expect(() =>
        validateGeneratedAnswer(generated("O valor é R$ 12,50.", evidence), [evidence])
      ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
    }
  );
  it("não usa a moeda declarada em outra versão", () => {
    const evidence = source("Entradas Saídas\n12,50 8,25", undefined, false);
    const other = {
      ...source("FICTÍCIO"),
      id: "other-evidence",
      documentVersionId: "other-version"
    };
    const answer = generated("O valor é R$ 12,50.", evidence);
    const withOther = {
      ...answer,
      citations: [...answer.citations, ...generated("", other).citations]
    };
    expect(() => validateGeneratedAnswer(withOther, [evidence, other])).toThrow(
      expect.objectContaining({ code: "unsupported_monetary_assertion" })
    );
  });
  it("não propaga o cabeçalho para outro trecho da mesma versão", () => {
    const evidence = source("Entradas Saídas\n0,00 8,25");
    const other = { ...source("Área 35,75"), id: "other-excerpt", pageNumber: 2 };
    const answer = generated("O valor é R$ 35,75.", evidence);
    const withOther = {
      ...answer,
      citations: [...answer.citations, ...generated("", other).citations]
    };
    expect(() => validateGeneratedAnswer(withOther, [evidence, other])).toThrow(
      expect.objectContaining({ code: "unsupported_monetary_assertion" })
    );
  });
  it("não chama resultado total de ordinário sem valores segregados", () => {
    const evidence = source("Entradas Saídas Resultado do mês\n17.380,25 15.640,75 1.739,50");
    expect(() =>
      validateGeneratedAnswer(generated("O resultado ordinário foi de R$ 1.739,50.", evidence), [
        evidence
      ])
    ).toThrow(expect.objectContaining({ code: "financial_result_scope_mismatch" }));
  });
  it("usa a declaração de moeda citada da mesma versão em outra página", () => {
    const declaration = source("FICTÍCIO");
    const table = {
      ...source("Data Histórico Entrada Saída\n04/04 Serviço 0,00 1.250,75", undefined, false),
      id: "detail",
      pageNumber: 2
    };
    const answer = generated("O lançamento registra R$ 1.250,75.", table);
    expect(() =>
      validateGeneratedAnswer(
        { ...answer, citations: [...answer.citations, ...generated("", declaration).citations] },
        [table, declaration]
      )
    ).not.toThrow();
  });
  it("conserva as células monetárias e exclui a coluna de dias", () => {
    const evidence = source("Unidade Cota Reserva Total Dias\n101 821,10 82,11 903,21 47");
    expect(() =>
      validateGeneratedAnswer(generated("O total é R$ 903,21.", evidence), [evidence])
    ).not.toThrow();
    expect(() =>
      validateGeneratedAnswer(generated("O valor é R$ 47,00.", evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it("preserva o cabeçalho ao atravessar o separador de uma tabela Markdown", () => {
    const evidence = source("| Entradas | Saídas |\n|---:|---:|\n| 173,80 | 156,40 |");
    expect(() =>
      validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", evidence), [evidence])
    ).not.toThrow();
  });
  it.each(["Valores (R$)", "Entradas (R$) Saídas (R$)"])(
    "aceita moeda declarada no cabeçalho %s",
    (currency) => {
      const evidence = source(`${currency}\nEntradas Saídas\n173,80 156,40`, undefined, false);
      expect(() =>
        validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", evidence), [evidence])
      ).not.toThrow();
    }
  );
  it("reconhece identificação financeira no corpo sem depender do nome do arquivo", () => {
    const evidence = source(
      "Balancete financeiro mensal\nEntradas Saídas\n173,80 156,40",
      "Arquivo FICTÍCIO.pdf"
    );
    expect(() =>
      validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", evidence), [evidence])
    ).not.toThrow();
  });
  it("não converte moeda de documento misto em reais", () => {
    const evidence = source("Valores em euros.\nEntradas Saídas\n173,80 156,40");
    expect(() =>
      validateGeneratedAnswer(generated("As entradas foram de R$ 173,80.", evidence), [evidence])
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
  it.each([undefined, "condominium"] as const)(
    "usa a origem canônica ao receber escopo gerado %s para legislação",
    (scope) => {
      const evidence = {
        ...source("Entradas Saídas\n173,80 156,40"),
        sourceScope: "legislation" as const
      };
      const generatedAnswer = generated("As entradas foram de R$ 173,80.", evidence);
      const answer = {
        ...generatedAnswer,
        citations: generatedAnswer.citations.map((citation) => ({
          ...citation,
          ...(scope === undefined ? {} : { sourceScope: scope })
        }))
      };
      expect(() =>
        validateGeneratedAnswer(
          {
            ...answer,
            claims: answer.claims!.map((claim) => ({
              ...claim,
              claimType: "interpretation" as const
            }))
          },
          [evidence]
        )
      ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
    }
  );
  it("recusa valor acima da precisão monetária suportada", () => {
    const evidence = source("Entradas Saídas\n9.007.199.254.740.993,00 0,00");
    expect(() =>
      validateGeneratedAnswer(
        generated("As entradas foram de R$ 9.007.199.254.740.993,00.", evidence),
        [evidence]
      )
    ).toThrow(expect.objectContaining({ code: "unsupported_monetary_assertion" }));
  });
});
