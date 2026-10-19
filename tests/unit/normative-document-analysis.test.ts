import { describe, expect, it } from "vitest";

import {
  analyzeNormativeDocuments,
  normativeFactsFromPages,
  type StructuredNormativeFact
} from "../../apps/api/analysis/normative/normative-document-analysis.js";
import { alameda, bosque, managerContext } from "./answer-fixtures.js";

function fact(
  category: StructuredNormativeFact["category"],
  value: string | null,
  overrides: Partial<StructuredNormativeFact> = {}
): StructuredNormativeFact {
  const excerpt = `${category}: ${value ?? "ilegível"}`;
  const source = {
    condominiumId: alameda,
    documentId: "documento-sintetico",
    documentVersionId: "documento-sintetico-v1",
    documentTitle: "Documento sintético",
    page: 2,
    excerpt,
    startOffset: 4,
    endOffset: 4 + Array.from(excerpt).length,
    documentDate: "2026-01-15",
    extractionMethod: "pdf_text" as const,
    qualityScore: 1,
    uncertainty: "none" as const
  };
  return Object.freeze({
    documentKind: "meeting_minutes",
    subjectKey: "assembleia-2026-01",
    category,
    state: value === null ? "unknown" : "known",
    value,
    source,
    ...overrides
  });
}

describe("análise normativa verificável", () => {
  it("preserva fatos de ata sem concluir que o quórum foi atendido", () => {
    const result = analyzeNormativeDocuments(managerContext, [
      fact("proposal", "Aprovar pintura da fachada"),
      fact("resolution", "Aprovada a pintura"),
      fact("vote_result", "18 votos favoráveis"),
      fact("registered_quorum", "18 presentes"),
      fact("required_quorum", "2/3 das unidades"),
      fact("responsible", "Síndica"),
      fact("deadline", "2026-03-31")
    ]);
    expect(result.findings.map((item) => item.category)).toContain("required_quorum");
    expect(result.findings.some((item) => item.category === "registered_quorum")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("quórum atendido");
  });

  it("preserva regra, condição e exceção sem transformá-las em validade jurídica", () => {
    const result = analyzeNormativeDocuments(managerContext, [
      fact("article", "Art. 12", { documentKind: "convention", subjectKey: "obras" }),
      fact("rule", "Obras dependem de autorização", {
        documentKind: "convention",
        subjectKey: "obras"
      }),
      fact("condition", "Projeto técnico anexado", { documentKind: "bylaws", subjectKey: "obras" }),
      fact("exception", "Emergência comprovada", { documentKind: "bylaws", subjectKey: "obras" })
    ]);
    expect(result.findings.map((item) => item.category)).toEqual([
      "article",
      "rule",
      "condition",
      "exception"
    ]);
    expect(JSON.stringify(result)).not.toContain("válid");
  });

  it("preserva dados contratuais e mantém campo desconhecido como desconhecido", () => {
    const result = analyzeNormativeDocuments(managerContext, [
      fact("contract_object", "Manutenção de elevadores", {
        documentKind: "contract",
        subjectKey: "elevadores"
      }),
      fact("contract_value", "R$ 2.000,00 por mês", {
        documentKind: "contract",
        subjectKey: "elevadores"
      }),
      fact("contract_term", "12 meses", { documentKind: "contract", subjectKey: "elevadores" }),
      fact("contract_adjustment", null, { documentKind: "contract", subjectKey: "elevadores" }),
      fact("contract_termination", "Aviso prévio de 30 dias", {
        documentKind: "contract",
        subjectKey: "elevadores"
      }),
      fact("contract_obligation", "Manutenção mensal", {
        documentKind: "contract",
        subjectKey: "elevadores"
      }),
      fact("contract_addendum", "Aditivo de 2026-02-01", {
        documentKind: "contract",
        subjectKey: "elevadores"
      })
    ]);
    expect(result.findings.find((item) => item.category === "contract_adjustment")).toMatchObject({
      state: "unknown",
      value: null
    });
    expect(result.limitations).toHaveLength(1);
  });

  it("expõe ambas as fontes e datas quando fatos conhecidos se contradizem", () => {
    const result = analyzeNormativeDocuments(managerContext, [
      fact("rule", "Proibido", {
        documentKind: "convention",
        subjectKey: "animais",
        source: { ...fact("rule", "Proibido").source, documentDate: "2025-01-10" }
      }),
      fact("rule", "Permitido com coleira", {
        documentKind: "bylaws",
        subjectKey: "animais",
        source: {
          ...fact("rule", "Permitido com coleira").source,
          documentId: "regimento",
          documentDate: "2026-02-20"
        }
      })
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.findings.map((item) => item.source.documentDate)).toEqual([
      "2025-01-10",
      "2026-02-20"
    ]);
  });

  it("recusa falta de autorização, fonte incompleta e fonte de outro condomínio", () => {
    expect(() => analyzeNormativeDocuments({ ...managerContext, permissions: [] }, [])).toThrow(
      "permissão"
    );
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("rule", "X", {
          documentKind: "convention",
          source: { ...fact("rule", "X").source, excerpt: "" }
        })
      ])
    ).toThrow("fonte verificável");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("rule", "X", {
          documentKind: "convention",
          source: { ...fact("rule", "X").source, condominiumId: bosque }
        })
      ])
    ).toThrow("outro condomínio");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("rule", "X", {
          documentKind: "convention",
          source: { ...fact("rule", "X").source, documentDate: "2026-02-30" }
        })
      ])
    ).toThrow("data documental");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("contract_object", "X", { documentKind: "meeting_minutes" })
      ])
    ).toThrow("categoria do achado");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("proposal", "", { source: { ...fact("proposal", "").source, page: 1.5 } })
      ])
    ).toThrow("fonte verificável");
    expect(() => analyzeNormativeDocuments(managerContext, [fact("proposal", " ")])).toThrow(
      "achado conhecido"
    );
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("proposal", "Texto", {
          source: { ...fact("proposal", "Texto").source, endOffset: 999 }
        })
      ])
    ).toThrow("fonte verificável");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("proposal", "Texto", {
          source: { ...fact("proposal", "Texto").source, uncertainty: "review_required" }
        })
      ])
    ).toThrow("fonte que exige revisão");
    expect(() =>
      analyzeNormativeDocuments(managerContext, [
        fact("proposal", "Texto", {
          source: { ...fact("proposal", "Texto").source, qualityScore: 0.9 }
        })
      ])
    ).toThrow("fonte que exige revisão");
  });

  it("adapta somente linhas autoclassificadas de página autorizada com offsets verificáveis", () => {
    const text = [
      "😀 Discussão informal sobre obras.",
      "[tipo: ata; assunto: pintura-fachada; categoria: proposta; data-documento: 2026-03-10] Aprovar pintura.",
      "[tipo: ata; assunto: pintura-fachada; categoria: quorum_registrado] 18 presentes.",
      "[tipo: ata; assunto: pintura-fachada; categoria: quorum_exigido] 2/3 das unidades."
    ].join("\n");
    const facts = normativeFactsFromPages(managerContext, {
      documentId: "ata-2026-03",
      documentVersionId: "ata-2026-03-v1",
      documentTitle: "Ata sintética de março",
      pages: [{ pageNumber: 3, extractedText: text, extractionMethod: "pdf_text", qualityScore: 1 }]
    });
    expect(facts).toHaveLength(3);
    expect(facts[0]).toMatchObject({
      documentKind: "meeting_minutes",
      category: "proposal",
      state: "known",
      source: {
        page: 3,
        startOffset: Array.from(text.slice(0, text.indexOf("[tipo:"))).length,
        qualityScore: 1,
        uncertainty: "none"
      }
    });
    expect(facts[0]?.source.endOffset).toBe(
      facts[0]!.source.startOffset + Array.from(facts[0]!.source.excerpt).length
    );
    expect(analyzeNormativeDocuments(managerContext, facts).findings).toHaveLength(3);
  });

  it("não classifica texto livre e mantém página incerta sem afirmação", () => {
    const facts = normativeFactsFromPages(managerContext, {
      documentId: "regimento-sintetico",
      documentVersionId: "regimento-sintetico-v1",
      documentTitle: "Regimento sintético",
      pages: [
        {
          pageNumber: 1,
          extractedText:
            "Animais são permitidos.\n[tipo: regimento; assunto: animais; categoria: regra] Permitido com coleira.",
          extractionMethod: "ocr",
          qualityScore: 0.92
        }
      ]
    });
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      state: "needs_review",
      value: null,
      source: { qualityScore: 0.92, uncertainty: "review_required" }
    });
    expect(() =>
      normativeFactsFromPages(
        { ...managerContext, permissions: [] },
        { documentId: "x", documentVersionId: "v1", documentTitle: "x", pages: [] }
      )
    ).toThrow("permissão");
    expect(() =>
      normativeFactsFromPages(managerContext, {
        documentId: "x",
        documentVersionId: "v1",
        documentTitle: "x",
        pages: [
          { pageNumber: 1, extractedText: "", extractionMethod: "pdf_text", qualityScore: 1.1 }
        ]
      })
    ).toThrow("qualidade");
  });

  it("mantém condição e exceção pelo mesmo assunto, sem conflitar assuntos distintos", () => {
    const facts = normativeFactsFromPages(managerContext, {
      documentId: "regimento-obras",
      documentVersionId: "regimento-obras-v1",
      documentTitle: "Regimento sintético",
      pages: [
        {
          pageNumber: 4,
          extractedText: [
            "[tipo: regimento; assunto: obras; categoria: condicao] Projeto técnico anexado.",
            "[tipo: regimento; assunto: obras; categoria: excecao] Emergência comprovada.",
            "[tipo: regimento; assunto: animais; categoria: regra] Permitido com coleira.",
            "[tipo: regimento; assunto: veiculos; categoria: regra] Proibido estacionar na vaga alheia."
          ].join("\n"),
          extractionMethod: "pdf_text",
          qualityScore: 1
        }
      ]
    });
    const result = analyzeNormativeDocuments(managerContext, facts);
    expect(result.findings.map((item) => item.category)).toEqual([
      "condition",
      "exception",
      "rule",
      "rule"
    ]);
    expect(result.conflicts).toHaveLength(0);
  });
});
