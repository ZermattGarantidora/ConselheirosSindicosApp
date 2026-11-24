import { describe, expect, it } from "vitest";
import { loadConversationCorpus } from "../../evals/conversations/corpus.js";
import { createDevelopmentScopedRetrievalIndex } from "../../apps/api/retrieval/development-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { detectDocumentConflict } from "../../apps/api/answers/conflict-detection.js";
import {
  contextualQuestion,
  type ConversationContext
} from "../../apps/api/answers/conversation-memory.js";
import { managerContext, createEvidence } from "./answer-fixtures.js";

const corpus = await loadConversationCorpus();
async function search(query: string, keys: readonly string[]) {
  return createScopedTextRetriever(
    createDevelopmentScopedRetrievalIndex(
      corpus.chunks.filter((chunk) => keys.some((key) => chunk.id.startsWith(`${key}-p`)))
    )
  ).search(managerContext, { query, asOf: new Date("2026-10-26T12:00:00Z") });
}

describe("Spec 051 — cobertura documental em continuações", () => {
  it("não confunde 30 dias de imagens com prazo de locação nem impõe conflito fora do assunto", () => {
    const convention = createEvidence({
      content: "A locação por temporada tem prazo mínimo de noventa dias."
    });
    const privacy = createEvidence({
      documentId: "privacy",
      documentType: "internal_rules",
      content: "Retenção interna de imagens: 30 dias."
    });
    const rules = createEvidence({
      documentId: "rules",
      documentType: "internal_rules",
      content: "O prazo mínimo de locação por temporada é de trinta dias."
    });
    expect(
      detectDocumentConflict("Conclua os conflitos documentais.", [convention, privacy])
    ).toBeNull();
    expect(
      detectDocumentConflict("Próximo passo para apurar reclamação de música e imagens.", [
        convention,
        privacy,
        rules
      ])
    ).toBeNull();
    expect(
      detectDocumentConflict("Conclua os conflitos da locação.", [
        convention,
        privacy,
        rules
      ])?.evidence.map((item) => item.documentId)
    ).toEqual(["document-1", "rules"]);
  });
  it("compara a duração da cláusula, sem capturar números de outro prazo da página", () => {
    const convention = createEvidence({
      content: "A locação tem prazo mínimo de 120 dias. Retenção de imagens: 90 dias."
    });
    const rules = createEvidence({
      documentType: "internal_rules",
      content: "A locação tem prazo mínimo de 45 dias. Retenção de imagens: 30 dias."
    });
    expect(
      detectDocumentConflict("Qual o conflito de locação?", [convention, rules])?.reason
    ).toContain("120 dias e o regimento indica 45 dias");
    expect(
      detectDocumentConflict("Conflitos de locação?", [
        createEvidence({
          content: "A locação não define prazo mínimo. Retenção de imagens: 90 dias."
        }),
        rules
      ])
    ).toBeNull();
  });
  it("conclusão genérica recupera ambas as regras privadas e detecta conflito", async () => {
    const result = await search(
      "O prazo mínimo de locação por temporada está em conflito.\nE os fatos das atas da assembleia?\nConclua a revisão distinguindo fatos, conflitos e validação legal pendente.",
      ["convention", "rules", "agm"]
    );
    expect(result.evidence.map((item) => item.id)).toEqual(
      expect.arrayContaining(["convention-p2", "rules-p2"])
    );
    expect(
      detectDocumentConflict(
        "Conclua a revisão distinguindo fatos e conflitos.",
        result.evidence
      )?.evidence.map((item) => item.id)
    ).toEqual(expect.arrayContaining(["convention-p2", "rules-p2"]));
    expect(result.evidence.length).toBeLessThanOrEqual(8);
  });
  it("salário, jornada, limites trabalhistas e ressalva de manutenção não desaparecem na síntese", async () => {
    const result = await search(
      "Qual a jornada e o salário do funcionário?\nQuais encargos trabalhistas aparecem no balancete de agosto?\nO laudo de manutenção libera o elevador?\nOrganize esses documentos em uma tabela com pendências.",
      ["employee", "august", "maintenance", "lift"]
    );
    const text = result.evidence.map((item) => item.content).join("\n");
    expect(text).toContain("2.400,00");
    expect(text).toContain("não reproduz a CCT");
    expect(text).toContain("40");
    expect(result.evidence.some((item) => item.documentId === "maintenance")).toBe(true);
  });
  it("retoma competência corrigida e recupera disponibilidade ordinária, sem agenda do salão", async () => {
    const context: ConversationContext = {
      policyVersion: "recent-chat-v1",
      turns: [
        { question: "Quero conferir o caixa de junho." },
        { question: "Corrigindo: o fechamento é julho." },
        { question: "Agora junte agosto e compare com julho." }
      ],
      bytes: 200,
      omittedAnswers: 3,
      omittedTurns: 0
    };
    const query = contextualQuestion(
      "Volte ao mês corrigido: saldo e disponibilidade ordinária?",
      context
    );
    const result = await search(query, ["june", "july", "august", "convention"]);
    expect(result.evidence.map((item) => item.id)).toEqual(
      expect.arrayContaining(["july-p1", "july-p2"])
    );
  });
  it("duas versões preservam regra confirmada e minuta, sem inventar vigência", async () => {
    const result = await search(
      "Compare as taxas e o horário do salão da convenção aprovada e da minuta.\nConclua explicitando os dois conjuntos de valores em disputa.",
      ["convention", "convention-draft"]
    );
    expect(result.evidence.some((item) => item.content.includes("150,00"))).toBe(true);
    expect(
      result.evidence.some(
        (item) => item.content.includes("200,00") && item.validityStatus === "disputed"
      )
    ).toBe(true);
  });
  it("consulta composta mantém exclusão de outro tenant e baixa qualidade", async () => {
    const result = await search(
      "Compare os balancetes de julho e agosto e a taxa do salão.\nConclua com os valores e a nota fiscal pendente.",
      ["july", "august", "convention", "bosque", "ocr"]
    );
    expect(
      result.evidence.every(
        (item) => item.condominiumId === managerContext.condominiumId && item.qualityScore >= 0.7
      )
    ).toBe(true);
    expect(result.evidence.map((item) => item.id)).toEqual(
      expect.arrayContaining(["july-p1", "august-p1", "august-p2"])
    );
    expect(result.evidence.length).toBeLessThanOrEqual(8);
  });
});
