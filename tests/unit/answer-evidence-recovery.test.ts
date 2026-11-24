import { describe, expect, it, vi } from "vitest";
import { Ajv } from "ajv";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { CodexAnswerGatewayUnavailableError } from "../../apps/api/answers/codex-answer-gateway.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import {
  answerSchema,
  generalAnswer,
  structuredAnswer
} from "../../apps/api/answers/openai-answer-gateway.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";

const noSpecialist = { required: false, type: null, reason: null } as const;
function generated(
  input: AnswerGatewayInput,
  claimType: "condominium_fact" | "interpretation" = "interpretation"
): GeneratedAnswer {
  return {
    answer: "A leitura se limita aos trechos recebidos.",
    answerMode: input.task === "document_conflict" ? "conflict" : "grounded",
    citations: input.evidence.map((item) => ({
      evidenceId: item.id,
      documentId: item.documentId,
      documentVersionId: item.documentVersionId,
      title: item.documentTitle,
      page: item.pageNumber,
      excerpt: item.content
    })),
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: noSpecialist,
    claims: [
      {
        statement: "Leitura documental",
        claimType,
        evidenceRequired: true,
        citationEvidenceIds: input.evidence.map((item) => item.id)
      }
    ]
  };
}
describe("Spec 046 — contrato, correção e diagnóstico", () => {
  it("o schema enviado ao provedor recusa o tipo livre de especialista observado na rodada real", () => {
    const validate = new Ajv({ allowUnionTypes: true }).compile(answerSchema());
    const output = {
      answer: "Orientação sintética",
      answerMode: "abstained",
      citations: [],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: true, type: "jurista", reason: "Validar o caso sintético." },
      claims: []
    };
    expect(validate(output)).toBe(false);
    expect(validate.errors?.some((error) => error.keyword === "enum")).toBe(true);
    expect(validate({ ...output, specialist: { ...output.specialist, type: "advogado" } })).toBe(
      true
    );
    expect(() => validateGeneratedAnswer(output as GeneratedAnswer, [])).toThrow(
      "O tipo de especialista não é permitido"
    );
    try {
      validateGeneratedAnswer(output as GeneratedAnswer, []);
    } catch (error) {
      expect(error).toMatchObject({ code: "specialist_type_invalid" });
    }
  });
  it("legislation-01/04: corrige tipo de claim com a mesma fonte, sem promover lei a fato local", async () => {
    const legal = createEvidence({
      sourceScope: "legislation",
      content: "Recorte legal sintético sobre seguro."
    });
    const persistence = createInMemoryAnswerPersistence();
    const generate = vi.fn(async (input: AnswerGatewayInput) => ({
      output: generated(
        input,
        input.validationFeedback === undefined ? "condominium_fact" : "interpretation"
      ),
      telemetry: createAnswerTelemetry()
    }));
    const answer = await createAnswerUseCase({
      persistence,
      retriever: { search: async () => createRetrievalResult([legal]) },
      gateway: { generate }
    }).ask(managerContext, { question: "Qual regra de seguro?", requestId: "legal" });
    expect(answer.answerMode).toBe("grounded");
    expect(answer.citations[0]!.sourceScope).toBe("legislation");
    expect(generate.mock.calls[1]![0]).toMatchObject({
      evidence: [legal],
      validationFeedback: "claim_local_source_required"
    });
    expect(
      persistence
        .getInteraction(answer.answerId)!
        .invocations.map((item) => [item.status, item.errorCode])
    ).toEqual([
      ["failed", "claim_local_source_required"],
      ["completed", null]
    ]);
  });
  it("conventions-09/coexistence-13: conflito não desaparece após duas saídas inválidas", async () => {
    const convention = createEvidence({
      id: "convention",
      content: "A convenção indica prazo mínimo de locação de noventa dias.",
      documentId: "convention"
    });
    const rules = createEvidence({
      id: "rules",
      content: "O regimento indica prazo mínimo de locação de trinta dias.",
      documentType: "internal_rules",
      documentId: "rules"
    });
    const persistence = createInMemoryAnswerPersistence();
    const generate = vi.fn(async () => ({
      output: generalAnswer("Não recebi documentos."),
      telemetry: createAnswerTelemetry()
    }));
    const answer = await createAnswerUseCase({
      persistence,
      retriever: { search: async () => createRetrievalResult([convention, rules]) },
      gateway: { generate }
    }).ask(managerContext, { question: "Qual prazo mínimo de locação?", requestId: "conflict" });
    expect(answer.answerMode).toBe("conflict");
    expect(answer.answer).toMatch(/noventa.*trinta/u);
    expect(answer.answer).not.toContain("Não recebi");
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual([
      "convention",
      "rules"
    ]);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(
      generate.mock.calls.every(
        (call) => (call as unknown as [AnswerGatewayInput])[0].evidence.length === 2
      )
    ).toBe(true);
    expect(answer.claims.every((claim) => claim.claimType === "interpretation")).toBe(true);
  });
  it("minuta citada exige interpretação e nunca sustenta regra confirmada", () => {
    const pending = createEvidence({ validityStatus: "disputed" });
    const input: AnswerGatewayInput = {
      question: "Preço?",
      evidence: [pending],
      riskClass: "low",
      task: "grounded_answer",
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
    };
    expect(() => validateGeneratedAnswer(generated(input, "condominium_fact"), [pending])).toThrow(
      "pendente"
    );
    expect(() => validateGeneratedAnswer({ ...generated(input), claims: [] }, [pending])).toThrow(
      "Pendência"
    );
    expect(validateGeneratedAnswer(generated(input), [pending]).claims[0]!.claimType).toBe(
      "interpretation"
    );
  });
  it("citação desconhecida e objetos malformados falham com código fechado", () => {
    const input: AnswerGatewayInput = {
      question: "Regra?",
      evidence: [createEvidence()],
      riskClass: "low",
      task: "grounded_answer",
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
    };
    expect(() =>
      structuredAnswer(JSON.stringify({ citations: [{ evidenceId: "outro-tenant" }] }), input)
    ).toThrow("não autorizada");
    for (const invalid of [
      { ...generated(input), citations: [null] },
      { ...generated(input), claims: [{}] },
      { ...generated(input), claims: null }
    ]) {
      try {
        validateGeneratedAnswer(invalid as unknown as GeneratedAnswer, input.evidence);
        throw new Error("deveria rejeitar");
      } catch (error) {
        expect(error).toMatchObject({ code: "answer_schema_invalid" });
      }
    }
  });
  it.each(["documentary", "general", "retrieval"])(
    "integra código Codex seguro no caminho %s",
    async (mode) => {
      const persistence = createInMemoryAnswerPersistence();
      const answer = await createAnswerUseCase({
        persistence,
        retriever: {
          search: async () => {
            if (mode === "retrieval") throw new Error("CANARIO_INTERNO");
            return createRetrievalResult(mode === "general" ? [] : [createEvidence()]);
          }
        },
        gateway: {
          generate: async () => {
            throw new CodexAnswerGatewayUnavailableError("codex_stdin_failed", "transport");
          }
        }
      }).ask(managerContext, { question: "Qual regra?", requestId: mode });
      expect(answer.answerMode).toBe("failed");
      expect(persistence.getInteraction(answer.answerId)!.invocations[0]!.errorCode).toBe(
        "codex_stdin_failed"
      );
      expect(JSON.stringify(answer)).not.toContain("CANARIO_INTERNO");
    }
  );
});
