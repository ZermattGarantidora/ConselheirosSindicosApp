import { describe, expect, it } from "vitest";

import type { GeneratedAnswer, GeneratedCitation } from "../../apps/api/answers/answer-contract.js";
import {
  InvalidAnswerValidationError,
  validateGeneratedAnswer
} from "../../apps/api/answers/citation-validator.js";
import { createEvidence } from "./answer-fixtures.js";

const source = createEvidence({
  content: "A regra é válida para a área comum 🏠.",
  startOffset: 10,
  endOffset: 49,
  pageNumber: 4
});

function citation(overrides: Partial<GeneratedCitation> = {}): GeneratedCitation {
  return {
    evidenceId: source.id,
    documentId: source.documentId,
    documentVersionId: source.documentVersionId,
    title: source.documentTitle,
    page: source.pageNumber,
    excerpt: "regra é válida para a área comum 🏠",
    ...overrides
  };
}

function generated(overrides: Partial<GeneratedAnswer> = {}): GeneratedAnswer {
  return {
    answer: "A regra é válida.",
    answerMode: "grounded",
    citations: [citation()],
    attentionPoints: [],
    suggestedNextStep: "Confira o documento.",
    specialist: { required: false, type: null, reason: null },
    ...overrides
  };
}

describe("validador de citações e respostas", () => {
  it("calcula offsets verificáveis em code points e congela o payload", () => {
    const result = validateGeneratedAnswer(generated(), [source]);

    expect(result.citations[0]).toMatchObject({
      evidenceId: source.id,
      startOffset: 12,
      endOffset: 46
    });
    expect(result.claims).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.citations[0])).toBe(true);
  });

  it.each([
    ["evidência não autorizada", { evidenceId: "other-chunk" }],
    ["metadado divergente", { title: "Documento inventado" }],
    ["trecho inexistente", { excerpt: "texto que não está na fonte" }],
    ["offset incorreto", { startOffset: 0 }]
  ] as const)("rejeita %s", (_description, overrides) => {
    expect(() =>
      validateGeneratedAnswer(generated({ citations: [citation(overrides)] }), [source])
    ).toThrow(InvalidAnswerValidationError);
  });

  it("aceita offsets fornecidos quando coincidem e rejeita listas inválidas", () => {
    const valid = citation({ startOffset: 12, endOffset: 46 });
    expect(
      validateGeneratedAnswer(generated({ citations: [valid] }), [source]).citations
    ).toHaveLength(1);

    expect(() =>
      validateGeneratedAnswer({ ...generated(), citations: "não é lista" } as never, [source])
    ).toThrow("deve ser uma lista");
    expect(() =>
      validateGeneratedAnswer({ ...generated(), attentionPoints: "não é lista" } as never, [source])
    ).toThrow("deve ser uma lista");
  });

  it.each([
    ["grounded sem citação", "grounded", []],
    ["abstained com citação", "abstained", [citation()]],
    ["failed com citação", "failed", [citation()]],
    ["conflict com uma fonte", "conflict", [citation()]]
  ] as const)("aplica a regra de evidência: %s", (_description, answerMode, citations) => {
    expect(() => validateGeneratedAnswer(generated({ answerMode, citations }), [source])).toThrow(
      InvalidAnswerValidationError
    );
  });

  it("valida afirmações factuais e suas referências às citações exibidas", () => {
    const result = validateGeneratedAnswer(
      generated({
        claims: [
          {
            statement: "A regra consta na convenção.",
            claimType: "condominium_fact",
            evidenceRequired: true,
            citationEvidenceIds: [source.id]
          },
          {
            statement: "A administração deve conferir a vigência.",
            claimType: "recommendation",
            evidenceRequired: false,
            citationEvidenceIds: []
          }
        ]
      }),
      [source]
    );

    expect(result.claims.map((claim) => claim.claimType)).toEqual([
      "condominium_fact",
      "recommendation"
    ]);
    expect(Object.isFrozen(result.claims[0])).toBe(true);

    expect(() =>
      validateGeneratedAnswer(
        generated({
          claims: [
            {
              statement: "Fato sem fonte.",
              claimType: "condominium_fact",
              evidenceRequired: true,
              citationEvidenceIds: []
            }
          ]
        }),
        [source]
      )
    ).toThrow("sem citação");

    expect(() =>
      validateGeneratedAnswer(
        generated({
          claims: [
            {
              statement: "Fato aponta para outra fonte.",
              claimType: "condominium_fact",
              evidenceRequired: true,
              citationEvidenceIds: ["other-chunk"]
            }
          ]
        }),
        [source]
      )
    ).toThrow("evidência não exibida");

    expect(() =>
      validateGeneratedAnswer(
        generated({
          claims: [
            {
              statement: "Fato não pode dispensar fonte.",
              claimType: "condominium_fact",
              evidenceRequired: false,
              citationEvidenceIds: []
            }
          ]
        }),
        [source]
      )
    ).toThrow("precisam exigir evidência");

    expect(() =>
      validateGeneratedAnswer(
        generated({
          claims: [
            {
              statement: "Interpretação não pode dispensar fonte.",
              claimType: "interpretation",
              evidenceRequired: false,
              citationEvidenceIds: []
            }
          ]
        }),
        [source]
      )
    ).toThrow("precisam exigir evidência");
  });

  it("valida o encaminhamento de especialista", () => {
    const specialistAnswer = generated({
      specialist: {
        required: true,
        type: "engenheiro",
        reason: "A estrutura precisa de validação técnica."
      }
    });
    expect(validateGeneratedAnswer(specialistAnswer, [source]).specialist).toMatchObject({
      required: true,
      type: "engenheiro"
    });

    expect(() =>
      validateGeneratedAnswer(
        generated({
          specialist: { required: true, type: "especialista inventado", reason: "x" } as never
        }),
        [source]
      )
    ).toThrow("não é permitido");
    expect(() =>
      validateGeneratedAnswer(
        generated({ specialist: { required: false, type: "advogado", reason: null } as never }),
        [source]
      )
    ).toThrow("não requerido");
  });

  it("rejeita campos textuais vazios e modo desconhecido", () => {
    expect(() => validateGeneratedAnswer(generated({ answer: "   " }), [source])).toThrow(
      "answer é inválido"
    );
    expect(() =>
      validateGeneratedAnswer(generated({ answerMode: "unknown" as never }), [source])
    ).toThrow("modo da resposta");
    expect(() =>
      validateGeneratedAnswer(generated({ suggestedNextStep: "   " }), [source])
    ).toThrow("suggestedNextStep é inválido");
  });
});
