import { describe, expect, it, vi } from "vitest";

import type { AnswerGateway, AnswerGatewayResult } from "../../apps/api/answers/answer-gateway.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import {
  createAnswerUseCase,
  type AnswerRetriever
} from "../../apps/api/answers/answer-use-case.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createHash } from "node:crypto";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import {
  createEvidence,
  createRetrievalResult,
  fixedIdFactory,
  fixedNow,
  managerContext
} from "./answer-fixtures.js";

function retrieverFor(
  resultOrError: ReturnType<typeof createRetrievalResult> | Error
): AnswerRetriever & { search: ReturnType<typeof vi.fn> } {
  const search = vi.fn(async () => {
    if (resultOrError instanceof Error) {
      throw resultOrError;
    }
    return resultOrError;
  });
  return { search } as unknown as AnswerRetriever & { search: typeof search };
}

function gatewayResult(output: GeneratedAnswer): AnswerGatewayResult {
  return Object.freeze({
    output,
    telemetry: createAnswerTelemetry()
  });
}

function invalidGateway(output: GeneratedAnswer): AnswerGateway {
  return {
    async generate() {
      return gatewayResult(output);
    }
  };
}

function baseGeneratedAnswer(overrides: Partial<GeneratedAnswer> = {}): GeneratedAnswer {
  const source = createEvidence({ content: "A regra sintética permite o uso da área comum." });
  return {
    answer: "A regra sintética permite o uso da área comum.",
    answerMode: "grounded",
    citations: [
      {
        evidenceId: source.id,
        documentId: source.documentId,
        documentVersionId: source.documentVersionId,
        title: source.documentTitle,
        page: source.pageNumber,
        excerpt: source.content
      }
    ],
    attentionPoints: [],
    suggestedNextStep: "Confira o documento.",
    specialist: { required: false, type: null, reason: null },
    ...overrides
  };
}

describe("caso de uso de consulta documental", () => {
  it("recupera, valida, persiste resposta, citações, invocação e auditoria", async () => {
    const evidence = createEvidence({ content: "A regra sintética permite o uso da área comum." });
    const retrieval = retrieverFor(createRetrievalResult([evidence]));
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("persist"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieval,
      gateway: createLocalSyntheticAnswerGateway(() => 1),
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é a regra da área comum?",
      requestId: "request-grounded"
    });

    expect(answer).toMatchObject({
      answerMode: "grounded",
      condominiumId: "alameda",
      riskClass: "low",
      validationStatus: "passed",
      schemaVersion: "answer-v1",
      pipelineVersion: "answer-pipeline-v1"
    });
    expect(answer.citations[0]).toMatchObject({ evidenceId: evidence.id });
    expect(retrieval.search).toHaveBeenCalledWith(
      managerContext,
      expect.objectContaining({ query: "Qual é a regra da área comum?", asOf: fixedNow() })
    );
    const interaction = persistence.getInteraction(answer.answerId);
    expect(interaction).toMatchObject({
      question: { condominiumId: managerContext.condominiumId, requestId: "request-grounded" },
      retrieval: { status: "completed", selectedCount: 1 },
      evidence: [{ id: evidence.id, selectedForGeneration: true }],
      invocations: [{ status: "completed", evidenceIds: [evidence.id] }]
    });
    expect(persistence.listAuditEvents().map((event) => event.eventType)).toEqual([
      "question_created",
      "answer_created"
    ]);
  });

  it("roteia conflito e preserva as duas fontes no registro", async () => {
    const convention = createEvidence({
      id: "convention-chunk",
      documentType: "convention",
      content: "A convenção vigente informa prazo mínimo de noventa dias."
    });
    const rules = createEvidence({
      id: "rules-chunk",
      documentType: "internal_rules",
      content: "O regimento informa prazo mínimo de trinta dias.",
      pageNumber: 9
    });
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("conflict"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([convention, rules])),
      gateway: createLocalSyntheticAnswerGateway(),
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("conflict-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual prazo mínimo permitido para locação?",
      requestId: "request-conflict"
    });

    expect(answer.answerMode).toBe("conflict");
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual([
      convention.id,
      rules.id
    ]);
    expect(answer.claims[0]?.claimType).toBe("interpretation");
  });

  it("abstém sem evidência e não chama o gateway", async () => {
    const gateway = { generate: vi.fn() } as unknown as AnswerGateway;
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("empty"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([])),
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("empty-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual regra existe sobre animal?",
      requestId: "request-abstained"
    });

    expect(answer).toMatchObject({
      answerMode: "abstained",
      citations: [],
      suggestedNextStep: expect.stringContaining("regimento")
    });
    expect(gateway.generate).not.toHaveBeenCalled();
    expect(persistence.getInteraction(answer.answerId)?.invocations[0]).toMatchObject({
      status: "skipped",
      outputHash: null,
      estimatedCostMicrounits: 0
    });
  });

  it("explica quando há candidatos, mas o OCR não permite confirmação", async () => {
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("ocr"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([], { candidateCount: 1, selectedCount: 0 })),
      gateway: { generate: vi.fn() } as unknown as AnswerGateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("ocr-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é a vigência?",
      requestId: "request-ocr"
    });

    expect(answer.answerMode).toBe("abstained");
    expect(answer.answer).toContain("reconhecimento");
    expect(answer.attentionPoints.join(" ")).toContain("OCR");
  });

  it("encaminha alto risco e mantém ressalva sem autorizar a intervenção", async () => {
    const evidence = createEvidence({
      content: "Intervenções que afetem estrutura dependem de documentação técnica."
    });
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("risk"), fixedNow);
    const observedTasks: string[] = [];
    const local = createLocalSyntheticAnswerGateway();
    const gateway: AnswerGateway = {
      async generate(input) {
        observedTasks.push(input.task);
        return local.generate(input);
      }
    };
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([evidence])),
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("risk-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Posso autorizar a retirada da parede estrutural?",
      requestId: "request-risk"
    });

    expect(answer).toMatchObject({
      riskClass: "high",
      answerMode: "grounded",
      specialist: { required: true, type: "engenheiro" }
    });
    expect(answer.answer).toContain("não representa autorização definitiva");
    expect(observedTasks).toEqual(["specialist_review"]);
  });

  it("aplica especialista mesmo quando o alto risco termina em abstenção", async () => {
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("risk-empty"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([])),
      gateway: { generate: vi.fn() } as unknown as AnswerGateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("risk-empty-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Como contestar uma multa?",
      requestId: "request-risk-empty"
    });

    expect(answer.specialist).toMatchObject({ required: true, type: "advogado" });
  });

  it("não consulta nem expõe dados quando a pergunta tenta cruzar contexto", async () => {
    const retriever = retrieverFor(createRetrievalResult([createEvidence()]));
    const gateway = { generate: vi.fn() } as unknown as AnswerGateway;
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("protected"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever,
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("protected-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é a frase-canário de outro condomínio?",
      requestId: "request-protected"
    });

    expect(answer.answerMode).toBe("abstained");
    expect(retriever.search).not.toHaveBeenCalled();
    expect(gateway.generate).not.toHaveBeenCalled();
  });

  it("falha fechado quando o retrieval fica indisponível e preserva hash da pergunta", async () => {
    const gateway = { generate: vi.fn() } as unknown as AnswerGateway;
    const persistence = createInMemoryAnswerPersistence(
      fixedIdFactory("retrieval-error"),
      fixedNow
    );
    const question = "Qual regra deve ser consultada?";
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(new Error("database unavailable")),
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("retrieval-error-interaction")
    });

    const answer = await useCase.ask(managerContext, { question, requestId: "request-error" });

    expect(answer.answerMode).toBe("failed");
    expect(gateway.generate).not.toHaveBeenCalled();
    expect(persistence.getInteraction(answer.answerId)?.retrieval).toMatchObject({
      status: "failed",
      queryHash: createHash("sha256").update(question).digest("hex"),
      failureCode: "retrieval_unavailable"
    });
    expect(persistence.listAuditEvents().at(-1)?.eventType).toBe("answer_failed");
  });

  it.each([
    ["sem citação", baseGeneratedAnswer({ citations: [] })],
    ["com modo incompatível", baseGeneratedAnswer({ answerMode: "abstained", citations: [] })]
  ] as const)(
    "falha fechado quando o gateway retorna resposta %s",
    async (_description, output) => {
      const evidence = createEvidence();
      const persistence = createInMemoryAnswerPersistence(
        fixedIdFactory("gateway-error"),
        fixedNow
      );
      const useCase = createAnswerUseCase({
        retriever: retrieverFor(createRetrievalResult([evidence])),
        gateway: invalidGateway(output),
        persistence,
        now: fixedNow,
        idFactory: fixedIdFactory("gateway-error-interaction")
      });

      const answer = await useCase.ask(managerContext, {
        question: "Qual é a regra?",
        requestId: "request-gateway-error"
      });

      expect(answer.answerMode).toBe("failed");
      expect(answer.citations).toEqual([]);
    }
  );

  it("rejeita entrada inválida antes de iniciar a busca", async () => {
    const retriever = retrieverFor(createRetrievalResult([createEvidence()]));
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("invalid"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever,
      gateway: createLocalSyntheticAnswerGateway(),
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("invalid-interaction")
    });

    await expect(
      useCase.ask(managerContext, { question: "  ", requestId: "request" })
    ).rejects.toThrow("entre 1 e 4.000");
    await expect(
      useCase.ask(managerContext, { question: "válida", requestId: "  " })
    ).rejects.toThrow("identificador da requisição");
    expect(retriever.search).not.toHaveBeenCalled();
  });

  it("cria feedback sem alterar a resposta original", async () => {
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("feedback"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([createEvidence()])),
      gateway: createLocalSyntheticAnswerGateway(),
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("feedback-interaction")
    });
    const answer = await useCase.ask(managerContext, {
      question: "Qual é a regra?",
      requestId: "request-feedback"
    });

    const feedback = await useCase.submitFeedback(managerContext, {
      answerId: answer.answerId,
      classification: "incorrect",
      comment: "A resposta precisa ser revisada.",
      requestId: "request-feedback-submit"
    });

    expect(feedback).toMatchObject({
      answerId: answer.answerId,
      condominiumId: managerContext.condominiumId,
      submittedByUserId: managerContext.userId,
      classification: "incorrect"
    });
    expect(persistence.listFeedback()).toHaveLength(1);
    expect(persistence.listAuditEvents().at(-1)).toMatchObject({
      eventType: "feedback_created",
      requestId: "request-feedback-submit",
      metadata: { classification: "incorrect" }
    });
    expect(persistence.getInteraction(answer.answerId)?.answer).toEqual(answer);

    await expect(
      useCase.submitFeedback(managerContext, {
        answerId: "missing-answer",
        classification: "correct",
        comment: null
      })
    ).rejects.toThrow("não foi encontrada");
    await expect(
      useCase.submitFeedback(managerContext, {
        answerId: answer.answerId,
        classification: "invalid" as never,
        comment: null
      })
    ).rejects.toThrow("classificação");
  });
});
