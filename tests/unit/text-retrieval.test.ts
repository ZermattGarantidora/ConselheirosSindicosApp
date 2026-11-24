import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  createScopedTextRetriever,
  lexicalScore
} from "../../apps/api/retrieval/text-retrieval.js";
import type { RetrievableChunk } from "../../apps/api/retrieval/retrieval-contract.js";

const alameda = createCondominiumId("alameda");
const bosque = createCondominiumId("bosque");
const context: AuthorizedCondominiumContext = {
  condominiumId: alameda,
  userId: "sindico-1" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "membership-1",
  permissions: ["document:read"]
};

function candidate(
  overrides: Partial<RetrievableChunk> & Pick<RetrievableChunk, "id" | "content">
): RetrievableChunk {
  return {
    id: overrides.id,
    condominiumId: overrides.condominiumId ?? alameda,
    documentId: overrides.documentId ?? "document-1",
    documentVersionId: overrides.documentVersionId ?? "version-1",
    documentVersionNumber: overrides.documentVersionNumber ?? 1,
    documentTitle: overrides.documentTitle ?? "Convenção sintética",
    documentType: overrides.documentType ?? "convention",
    sourceKind: overrides.sourceKind ?? "user_upload",
    ...(overrides.sourceScope === undefined ? {} : { sourceScope: overrides.sourceScope }),
    pageId: overrides.pageId ?? "page-1",
    pageNumber: overrides.pageNumber ?? 1,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? overrides.content.length,
    content: overrides.content,
    contentSha256: overrides.contentSha256 ?? "a".repeat(64),
    semanticScore: overrides.semanticScore ?? null,
    extractionMethod: overrides.extractionMethod ?? "pdf_text",
    qualityScore: overrides.qualityScore ?? 1,
    processingStatus: overrides.processingStatus ?? "ready",
    validityStatus: overrides.validityStatus ?? "confirmed",
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null
  };
}

describe("retrieval textual escopado", () => {
  it.each([
    {
      query: "Qual é o rateio e a emissão das 20 unidades?",
      target: "O rateio mensal é R$ 900,00; a emissão total é R$ 18.900,00."
    },
    {
      query: "As contas desses meses já foram aprovadas?",
      target: "Revisão e aprovação das contas: pendentes de deliberação."
    },
    {
      query: "Como evoluiu o fundo de reserva nos fechamentos?",
      target: "Fundo de reserva 20.000,00 1.033,00 0,00 21.033,00"
    },
    {
      query: "Quais títulos vencidos estão no fechamento?",
      target: "Títulos vencidos no encerramento. Unidade 503 total 945,00."
    },
    {
      query: "Compare abastecimento de água e esgoto entre meses.",
      target: "22/09 SET-017 Abastecimento de água e esgoto OP 0,00 1.800,00"
    }
  ])(
    "AC-4603b: conserva faceta e moeda sem ultrapassar oito fontes: $query",
    async ({ query, target }) => {
      const title = "Balancete_Jardim_FICTICIO_2028_09.pdf";
      const values = [
        ...Array.from({ length: 12 }, (_, i) =>
          candidate({
            id: `distrator-${i}`,
            documentId: `d-${i}`,
            documentVersionId: `v-${i}`,
            documentTitle: "Notas sintéticas gerais",
            semanticScore: 1,
            content:
              "Resumo geral de condomínio, contas, meses, fundo e informações. Conferir resultado mensal."
          })
        ),
        candidate({
          id: "currency",
          documentTitle: title,
          content: "FICTÍCIO — Balancete financeiro mensal. Valores em reais.",
          semanticScore: 0.5
        }),
        candidate({
          id: "target",
          documentTitle: title,
          content: `FICTÍCIO — ${target}`,
          pageNumber: 3,
          semanticScore: 0.5
        }),
        candidate({
          id: "foreign",
          documentTitle: title,
          content: target,
          condominiumId: bosque,
          semanticScore: 1
        }),
        candidate({
          id: "bad-quality",
          documentTitle: title,
          content: target,
          qualityScore: 0.2,
          semanticScore: 1
        }),
        candidate({
          id: "future",
          documentTitle: title,
          content: target,
          validFrom: new Date("2040-01-01"),
          semanticScore: 1
        })
      ];
      const result = await createScopedTextRetriever({
        async findAuthorizedCandidates() {
          return values;
        }
      }).search(context, { query, asOf: new Date("2028-10-01") });
      expect(result.evidence.length).toBeLessThanOrEqual(8);
      expect(result.evidence.map((item) => item.id)).toEqual(
        expect.arrayContaining(["target", "currency"])
      );
      expect(result.evidence.map((item) => item.id)).not.toEqual(
        expect.arrayContaining(["foreign"])
      );
      expect(
        result.evidence.some((item) => ["foreign", "bad-quality", "future"].includes(item.id))
      ).toBe(false);
    }
  );
  it.each([
    { unit: "U-A", repeatedHeader: false },
    { unit: "BL-42", repeatedHeader: false },
    { unit: "U-A", repeatedHeader: true },
    { unit: "BL-42", repeatedHeader: true }
  ])(
    "AC-6003/6003b: síntese sem IDs reserva proposta e principal: $unit / cabeçalho $repeatedHeader",
    async ({ unit, repeatedHeader }) => {
      const header = repeatedHeader ? "FICTÍCIO. Posição de cotas e acordos.\n" : "";
      const pages = [
        ...Array.from({ length: 12 }, (_, i) =>
          candidate({
            id: `distrator-${i}`,
            documentId: `d${i}`,
            documentVersionId: `v${i}`,
            semanticScore: 1,
            content:
              "FICTÍCIO. Privacidade na cobrança de cada unidade, conferir próximo passo e valores."
          })
        ),
        candidate({
          id: "principal",
          documentTitle: "Posição de cotas FICTÍCIA",
          semanticScore: 0.5,
          content: `${header}Unidades ${unit} e U-C: principal em aberto de R$ 300,00 e R$ 600,00.`
        }),
        candidate({
          id: "proposta",
          documentTitle: "Posição de cotas FICTÍCIA",
          semanticScore: 0.4,
          pageNumber: 2,
          content: `${header}Unidade ${unit}: proposta em duas parcelas sem assinatura, aceite ou pagamento.`
        }),
        candidate({
          id: "outro-tenant",
          condominiumId: bosque,
          documentTitle: "Posição de cotas FICTÍCIA",
          content: `Unidade ${unit}: acordo assinado.`,
          semanticScore: 1
        }),
        candidate({
          id: "baixa-qualidade",
          documentTitle: "Posição de cotas FICTÍCIA",
          content: `Unidade ${unit}: acordo assinado.`,
          qualityScore: 0.2,
          semanticScore: 1
        })
      ];
      const result = await createScopedTextRetriever({
        findAuthorizedCandidates: async () => pages
      }).search(context, {
        query:
          "Prepare a cobrança privada sem expor dados. Feche com um próximo passo prudente para cada unidade."
      });
      expect(result.evidence).toHaveLength(8);
      expect(result.evidence.map((s) => s.id)).toEqual(
        expect.arrayContaining(["principal", "proposta"])
      );
      expect(result.evidence.some((s) => ["outro-tenant", "baixa-qualidade"].includes(s.id))).toBe(
        false
      );
    }
  );
  it("AC-5901: acordo da unidade ativa permanece entre oito fontes sob competição", async () => {
    const pages = [
      ...Array.from({ length: 12 }, (_, i) =>
        candidate({
          id: `debitos-${i}`,
          documentId: `d-${i}`,
          documentVersionId: `v-${i}`,
          documentTitle: "Posição de cotas FICTÍCIA",
          semanticScore: 0.98,
          content: "Unidade U-B: cobrança, débito, juros e encargos para negociação de cotas."
        })
      ),
      candidate({
        id: "acordo-ativo",
        documentTitle: "Posição de cotas e acordos FICTÍCIA",
        pageNumber: 3,
        content: "Unidade U-A: proposta de acordo pendente de aceite e pagamento.",
        semanticScore: 0.4
      }),
      candidate({
        id: "outro-tenant",
        condominiumId: bosque,
        content: "Unidade U-A: acordo assinado e quitado.",
        semanticScore: 1
      }),
      candidate({
        id: "ilegivel",
        qualityScore: 0.2,
        content: "Unidade U-A: acordo assinado.",
        semanticScore: 1
      })
    ];
    const result = await createScopedTextRetriever({
      findAuthorizedCandidates: async () => pages
    }).search(context, {
      query: "Corrigindo, a unidade U-A tem acordo? Conclua a negociação da unidade corrigida."
    });
    expect(result.evidence).toHaveLength(8);
    expect(result.evidence.map((source) => source.id)).toContain("acordo-ativo");
    expect(result.evidence.map((source) => source.id)).not.toEqual(
      expect.arrayContaining(["outro-tenant", "ilegivel"])
    );
  });
  it("AC-5902: comparação reserva preço e vigência de confirmado e minuta", async () => {
    const pages = [
      candidate({
        id: "atual-prazo",
        documentType: "contract",
        documentTitle: "Contrato FICTÍCIO elevador",
        content: "Vigência: 01/01/2026 a 31/12/2026.",
        semanticScore: 0.8
      }),
      candidate({
        id: "atual-preco",
        documentType: "contract",
        documentTitle: "Contrato FICTÍCIO elevador",
        pageNumber: 2,
        content: "Preço mensal: R$ 1.234,00.",
        semanticScore: 0.4
      }),
      candidate({
        id: "minuta-preco",
        documentType: "contract",
        documentTitle: "Contrato FICTÍCIO elevador",
        documentVersionId: "v2",
        validityStatus: "pending",
        content: "Preço mensal proposto: R$ 1.567,00.",
        semanticScore: 0.9
      }),
      candidate({
        id: "minuta-prazo",
        documentType: "contract",
        documentTitle: "Contrato FICTÍCIO elevador",
        documentVersionId: "v2",
        validityStatus: "pending",
        pageNumber: 2,
        content: "Vigência proposta para 2027.",
        semanticScore: 0.4
      })
    ];
    const result = await createScopedTextRetriever({
      findAuthorizedCandidates: async () => pages
    }).search(context, {
      query: "Compare o preço mensal e a vigência para renovação do contrato de elevador."
    });
    expect(result.evidence.map((source) => source.id)).toEqual(
      expect.arrayContaining(pages.map((page) => page.id))
    );
    expect(result.evidence.find((source) => source.id === "minuta-preco")?.validityStatus).toBe(
      "pending"
    );
  });
  it("ranqueia somente depois de filtrar tenant, estado, qualidade e vigência", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "alameda-good",
            content: "A convenção permite uso residencial da vaga."
          }),
          candidate({
            id: "bosque-canary",
            condominiumId: bosque,
            content: "A convenção permite aluguel por temporada."
          }),
          candidate({
            id: "not-ready",
            content: "A convenção permite uso residencial.",
            processingStatus: "needs_review"
          }),
          candidate({
            id: "pending",
            content: "A convenção permite uso residencial.",
            validityStatus: "pending"
          }),
          candidate({
            id: "low-quality",
            content: "A convenção permite uso residencial.",
            qualityScore: 0.3
          })
        ];
      }
    });

    const result = await retriever.search(context, { query: "uso residencial" });

    expect(result.pipelineVersion).toBe("hybrid-v1");
    expect(result.candidateCount).toBe(4);
    expect(result.selectedCount).toBe(2);
    expect(result.evidence.map((item) => item.id)).toEqual(["alameda-good", "pending"]);
    expect(result.evidence[1]?.validityStatus).toBe("pending");
    expect(result.diagnostics).toMatchObject({ lowQualityCount: 2, pendingValidityCount: 1 });
    expect(result.evidence[0]?.rank).toBe(1);
    expect(result.evidence[0]?.semanticScore).toBeNull();
    expect(result.queryHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("considera a data histórica e rejeita entrada inválida", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "old",
            content: "A convenção permite uso residencial.",
            validFrom: new Date("2020-01-01T00:00:00.000Z"),
            validUntil: new Date("2024-01-01T00:00:00.000Z")
          }),
          candidate({
            id: "current",
            content: "A convenção permite uso residencial.",
            documentVersionNumber: 2,
            validFrom: new Date("2024-01-01T00:00:00.000Z")
          })
        ];
      }
    });

    await expect(
      retriever.search(context, {
        query: "uso residencial",
        asOf: new Date("2023-01-01T00:00:00.000Z")
      })
    ).resolves.toMatchObject({ evidence: [{ id: "old" }] });
    await expect(retriever.search(context, { query: "   " })).rejects.toThrow("não pode ser vazia");
    await expect(retriever.search(context, { query: "regra", maxResults: 51 })).rejects.toThrow(
      "entre 1 e 50"
    );
    await expect(
      retriever.search(context, { query: "regra", minimumQualityScore: 2 })
    ).rejects.toThrow("entre 0 e 1");
  });

  it("normaliza acentos e não pontua uma consulta sem termos", () => {
    expect(lexicalScore("locação", "A regra trata de LOCACAO residencial.")).toBeGreaterThan(0);
    expect(lexicalScore("a", "qualquer conteúdo")).toBe(0);
  });

  it("aceita evidência sem coincidência lexical quando o sinal semântico é positivo", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "semantic-only",
            content: "A matéria foi decidida.",
            semanticScore: 0.9
          })
        ];
      }
    });

    const result = await retriever.search(context, { query: "quórum reunião" });

    expect(result.evidence).toMatchObject([
      { id: "semantic-only", lexicalScore: 0, semanticScore: 0.9 }
    ]);
    expect(result.sufficiency.status).toBe("sufficient");
  });

  it("reduz a busca eleitoral aos termos presentes na ata antes de consultar o índice", async () => {
    let querySentToIndex = "";
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates(_context, input) {
        querySentToIndex = input.query;
        return [
          candidate({
            id: "election-table",
            documentType: "meeting_minutes",
            pageNumber: 3,
            content:
              "Síndica Marina Vieira 101 15/09/2026 a 14/09/2027. Mandato aprovado pela assembleia."
          })
        ];
      }
    });

    const result = await retriever.search(context, {
      query: "Quem foi eleita síndica e qual é o período do mandato?"
    });

    expect(querySentToIndex).toContain("síndica mandato");
    expect(querySentToIndex).toContain("Quem foi eleita");
    expect(result.evidence).toMatchObject([{ id: "election-table", pageNumber: 3 }]);
  });

  it("prioriza a legislação quando a relevância é equivalente", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "a-internal-rule",
            documentTitle: "Fonte aplicável",
            content: "A propriedade deve cumprir sua função social.",
            semanticScore: 0.8,
            sourceScope: "condominium"
          }),
          candidate({
            id: "z-constitution",
            documentTitle: "Fonte aplicável",
            content: "A propriedade deve cumprir sua função social.",
            semanticScore: 0.8,
            sourceScope: "legislation"
          })
        ];
      }
    });

    const result = await retriever.search(context, { query: "função social da propriedade" });

    expect(result.evidence.map((item) => item.id)).toEqual(["z-constitution", "a-internal-rule"]);
    expect(result.evidence[0]?.sourceScope).toBe("legislation");
  });

  it("não consulta o índice sem permissão de leitura", async () => {
    let called = false;
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        called = true;
        return [];
      }
    });

    const result = await retriever.search(
      { ...context, permissions: [] },
      { query: "qualquer regra" }
    );

    expect(called).toBe(false);
    expect(result.evidence).toEqual([]);
  });
});
