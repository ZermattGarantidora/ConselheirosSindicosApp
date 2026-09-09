import { describe, expect, it } from "vitest";

import { detectDocumentConflict } from "../../apps/api/answers/conflict-detection.js";
import { classifyQuestionRisk } from "../../apps/api/answers/risk-classification.js";
import { createEvidence } from "./answer-fixtures.js";

describe("classificação de risco documental", () => {
  it.each([
    ["Posso retirar uma parede estrutural?", "high", "engenheiro"],
    ["Como contestar uma multa?", "high", "advogado"],
    ["Qual obrigação tributária existe?", "high", "contador"],
    ["Houve um sinistro na apólice?", "high", "seguradora"],
    ["Como cumprir a LGPD com dados pessoais?", "high", "especialista em proteção de dados"]
  ] as const)("classifica %s", (question, riskClass, specialistType) => {
    expect(classifyQuestionRisk(question)).toMatchObject({ riskClass, specialistType });
  });

  it.each([
    ["Qual é a vigência do contrato?", "medium"],
    ["Qual é a regra da área comum?", "low"]
  ] as const)("distingue risco %s", (question, riskClass) => {
    expect(classifyQuestionRisk(question).riskClass).toBe(riskClass);
  });

  it("normaliza acentos e rejeita pergunta vazia", () => {
    expect(classifyQuestionRisk("Qual obrigação contábil e proteção de dados?")).toMatchObject({
      riskClass: "high",
      specialistType: "contador"
    });
    expect(() => classifyQuestionRisk("  ")).toThrow("não pode ser vazia");
  });
});

describe("detecção de conflito documental", () => {
  it("retorna os dois documentos quando os prazos são incompatíveis", () => {
    const convention = createEvidence({
      id: "convention-chunk",
      documentType: "convention",
      content: "A convenção prevê prazo mínimo de noventa dias."
    });
    const rules = createEvidence({
      id: "rules-chunk",
      documentType: "internal_rules",
      content: "O regimento prevê prazo mínimo de trinta dias."
    });

    expect(
      detectDocumentConflict("Qual prazo mínimo de locação?", [convention, rules])
    ).toMatchObject({
      evidence: [convention, rules],
      reason: expect.stringContaining("incompatíveis")
    });
  });

  it.each([
    ["pergunta não relacionada", "Qual a regra de silêncio?", []],
    [
      "uma fonte apenas",
      "Qual prazo mínimo de locação?",
      [createEvidence({ content: "noventa dias" })]
    ],
    [
      "fontes sem sinais conflitantes",
      "Qual prazo mínimo de locação?",
      [
        createEvidence({ documentType: "convention", content: "A convenção prevê sessenta dias." }),
        createEvidence({
          documentType: "internal_rules",
          content: "O regimento prevê sessenta dias."
        })
      ]
    ]
  ] as const)("não inventa conflito para %s", (_description, question, evidence) => {
    expect(detectDocumentConflict(question, evidence)).toBeNull();
  });
});
