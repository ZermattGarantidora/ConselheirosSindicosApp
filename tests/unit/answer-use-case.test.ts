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

function generalGuidanceAnswer(
  answer = "Não encontrei uma regra confirmada nos documentos. Como orientação geral, registre o fato e verifique a fonte aplicável.",
  overrides: Partial<GeneratedAnswer> = {}
): GeneratedAnswer {
  return {
    answer,
    answerMode: "abstained",
    citations: [],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null },
    claims: [],
    ...overrides
  };
}

function generalGuidanceGateway(answer = generalGuidanceAnswer()) {
  const generate = vi.fn(async () => gatewayResult(answer));
  return { generate } as AnswerGateway & { generate: typeof generate };
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
    expect(answer.attentionPoints).toEqual([]);
    expect(answer.suggestedNextStep).toBeNull();
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

  it.each([
    ["risco baixo", "Qual é a regra da área comum?"],
    ["risco médio", "Qual é a vigência do contrato?"]
  ])(
    "AC-509: remove orientação adicional genérica em resposta fundamentada de %s",
    async (_label, question) => {
      const evidence = createEvidence({
        content: "A regra sintética permite o uso da área comum."
      });
      const gateway = {
        generate: vi.fn(async () =>
          gatewayResult(
            baseGeneratedAnswer({
              attentionPoints: ["A regra pode ser revista futuramente."],
              suggestedNextStep: "Registre uma tarefa para conferir a regra novamente."
            })
          )
        )
      } as AnswerGateway;
      const useCase = createAnswerUseCase({
        retriever: retrieverFor(createRetrievalResult([evidence])),
        gateway,
        persistence: createInMemoryAnswerPersistence(
          fixedIdFactory(`essential-${_label}`),
          fixedNow
        ),
        now: fixedNow,
        idFactory: fixedIdFactory(`essential-${_label}-interaction`)
      });

      const answer = await useCase.ask(managerContext, {
        question,
        requestId: `request-${_label}`
      });

      expect(answer.answerMode).toBe("grounded");
      expect(answer.attentionPoints).toEqual([]);
      expect(answer.suggestedNextStep).toBeNull();
    }
  );

  it("trata uma pergunta factual sobre animais como consulta documental", async () => {
    const retrieval = retrieverFor(createRetrievalResult([]));
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer(
        "Não encontrei uma regra sobre animais nos documentos. Em geral, confira o regimento e a convenção antes de orientar o morador."
      )
    );
    const useCase = createAnswerUseCase({
      retriever: retrieval,
      gateway,
      persistence: createInMemoryAnswerPersistence(fixedIdFactory("animals"), fixedNow),
      now: fixedNow,
      idFactory: fixedIdFactory("animals-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Posso manter dois cachorros no apartamento?",
      requestId: "request-animals"
    });

    expect(retrieval.search).toHaveBeenCalledOnce();
    expect(answer).toMatchObject({ answerMode: "abstained", citations: [] });
    expect(answer.answer).toContain("confira o regimento e a convenção");
    expect(answer.attentionPoints.join(" ")).toContain(
      "Não encontrei essa informação nos documentos"
    );
    expect(gateway.generate).toHaveBeenCalledWith(expect.objectContaining({ evidence: [] }));
  });

  it("orienta incidente operacional sem transformar evidência tangencial em base documental", async () => {
    const tangentialEvidence = createEvidence({
      content: "A regra sintética permite o uso da área comum."
    });
    const retrieval = retrieverFor(createRetrievalResult([tangentialEvidence]));
    const gateway: AnswerGateway & { generate: ReturnType<typeof vi.fn> } = {
      generate: vi.fn(async () =>
        gatewayResult({
          answer:
            "Isole a área, avise os moradores para não se aproximarem e providencie uma avaliação técnica do reparo.",
          answerMode: "abstained",
          citations: [],
          attentionPoints: [],
          suggestedNextStep: "Registre o ocorrido e acione um profissional qualificado.",
          specialist: { required: false, type: null, reason: null },
          claims: []
        })
      )
    };
    const persistence = createInMemoryAnswerPersistence(
      fixedIdFactory("operational-guidance"),
      fixedNow
    );
    const useCase = createAnswerUseCase({
      retriever: retrieval,
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("operational-guidance-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question:
        "Depois de uma ventania, quebrou uma janela da área comum. Que ação devo tomar com os moradores?",
      requestId: "request-operational-guidance"
    });

    expect(retrieval.search).toHaveBeenCalledOnce();
    expect(gateway.generate).toHaveBeenCalledWith(
      expect.objectContaining({ evidence: [tangentialEvidence], riskClass: "high" })
    );
    expect(answer).toMatchObject({
      answerMode: "abstained",
      riskClass: "high",
      citations: [],
      specialist: { required: true, type: "responsável técnico" }
    });
    expect(answer.answer).toContain("Isole a área");
    expect(answer.attentionPoints.join(" ")).toContain(
      "Os trechos encontrados não sustentam uma resposta documental segura"
    );
    expect(persistence.getInteraction(answer.answerId)).toMatchObject({
      retrieval: { selectedCount: 1 },
      invocations: [{ evidenceIds: [tangentialEvidence.id] }]
    });
  });

  it("remove uma afirmação categórica de inexistência e preserva a orientação geral", async () => {
    const tangentialEvidence = createEvidence({
      content: "O documento registra somente a eleição da administração."
    });
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer(
        "O condomínio não possui um protocolo aprovado para pouso de helicópteros. Como o tema envolve segurança de voo e risco estrutural, consulte um engenheiro civil e a autoridade de aviação competente."
      )
    );
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([tangentialEvidence])),
      gateway,
      persistence: createInMemoryAnswerPersistence(fixedIdFactory("safe-abstention"), fixedNow),
      now: fixedNow,
      idFactory: fixedIdFactory("safe-abstention-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é o protocolo aprovado para pouso de helicópteros no telhado?",
      requestId: "request-safe-abstention"
    });

    expect(answer).toMatchObject({ answerMode: "abstained", citations: [] });
    expect(answer.answer).not.toMatch(/condomínio não possui/iu);
    expect(answer.answer).toContain("consulte um engenheiro civil");
    expect(answer.attentionPoints.join(" ")).toContain(
      "Os trechos encontrados não sustentam uma resposta documental segura"
    );
  });

  it("reutiliza a resposta quando a mesma chave idempotente é reenviada", async () => {
    const evidence = createEvidence({ content: "A regra sintética permite o uso da área comum." });
    const retrieval = retrieverFor(createRetrievalResult([evidence]));
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("idempotency"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieval,
      gateway: createLocalSyntheticAnswerGateway(() => 1),
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("idempotency-interaction")
    });
    const input = {
      question: "Qual é a regra da área comum?",
      idempotencyKey: "consulta-area-comum"
    };

    const first = await useCase.ask(managerContext, { ...input, requestId: "request-1" });
    const repeated = await useCase.ask(managerContext, { ...input, requestId: "request-2" });

    expect(repeated.answerId).toBe(first.answerId);
    expect(retrieval.search).toHaveBeenCalledTimes(1);
    expect(persistence.listInteractions()).toHaveLength(1);
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

  it("formula orientação geral sem evidência e informa a limitação documental", async () => {
    const gateway = generalGuidanceGateway();
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
      citations: []
    });
    expect(answer.answer).toContain("Como orientação geral");
    expect(answer.attentionPoints.join(" ")).toContain(
      "Não encontrei essa informação nos documentos"
    );
    expect(gateway.generate).toHaveBeenCalledWith(expect.objectContaining({ evidence: [] }));
    expect(persistence.getInteraction(answer.answerId)?.invocations[0]).toMatchObject({
      status: "completed",
      evidenceIds: []
    });
  });

  it("trata as 32 perguntas da ata como documentais mesmo sem citar documento", async () => {
    const questions = [
      "Qual é o nome do condomínio?",
      "Quantas unidades residenciais existem?",
      "Qual é o endereço?",
      "Em que data ocorreu a assembleia?",
      "Quem foi eleita síndica?",
      "Quem foi eleito subsíndico?",
      "Qual é o valor da cota ordinária?",
      "Qual é o dia de vencimento da cota?",
      "Quem presidiu a assembleia?",
      "Quem secretariou os trabalhos?",
      "Qual foi o quórum da assembleia?",
      "Qual é o período do mandato da síndica?",
      "Quem são os membros do conselho fiscal?",
      "Qual é o valor total do orçamento mensal?",
      "Qual é o percentual destinado ao fundo de reserva?",
      "Até quando o seguro deve ser contratado?",
      "Qual é o prazo para abertura da conta bancária?",
      "Quando deve ser publicado o primeiro balancete?",
      "Quando deve ocorrer a prestação de contas?",
      "Quais foram as regras aprovadas para pagamentos em atraso?",
      "Quais deliberações tiveram abstenções ou votos contrários?",
      "Quais assuntos foram registrados sem deliberação?",
      "Quais temas ficaram pendentes para a próxima assembleia?",
      "Quais são as condições para contratação de serviços acima de R$ 20.000,00?",
      "Quais pendências técnicas foram identificadas nas áreas comuns?",
      "Quais documentos ou evidências devem ser guardados após a inspeção inicial?",
      "Quais são as limitações da autorização dada à síndica?",
      "A ata aprovou regras sobre animais, locações por temporada ou carregadores elétricos?",
      "Qual é a diferença entre a cota ordinária e a cota inicial de implantação?",
      "A ata informa o nome de uma administradora?",
      "Qual CNPJ foi registrado oficialmente?",
      "A ata substitui a convenção condominial registrada?"
    ] as const;
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer(
        "Não encontrei esse dado nos documentos. Consulte a ata, a convenção ou o cadastro oficial correspondente."
      )
    );
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([])),
      gateway,
      persistence: createInMemoryAnswerPersistence(fixedIdFactory("documentary-list"), fixedNow),
      now: fixedNow,
      idFactory: fixedIdFactory("documentary-list-interaction")
    });

    for (const [index, question] of questions.entries()) {
      const answer = await useCase.ask(managerContext, {
        question,
        requestId: `request-documentary-${index}`
      });
      expect(answer.answerMode, question).toBe("abstained");
    }

    expect(gateway.generate).toHaveBeenCalledTimes(questions.length);
    expect(gateway.generate).toHaveBeenLastCalledWith(expect.objectContaining({ evidence: [] }));
  });

  it("explica quando há candidatos, mas o OCR não permite confirmação", async () => {
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("ocr"), fixedNow);
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer(
        "Não consigo confirmar a vigência pelo texto reconhecido. Confira a data diretamente no documento original."
      )
    );
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([], { candidateCount: 1, selectedCount: 0 })),
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("ocr-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é a vigência?",
      requestId: "request-ocr"
    });

    expect(answer.answerMode).toBe("abstained");
    expect(answer.answer).toContain("Confira a data diretamente no documento original");
    expect(answer.attentionPoints.join(" ")).toContain("reconhecimento do documento é incerto");
    expect(answer.attentionPoints.join(" ")).toContain("Confira o original ou corrija o OCR");
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
    expect(answer.attentionPoints).toHaveLength(0);
    expect(answer.suggestedNextStep).toContain("especialista");
    expect(observedTasks).toEqual(["specialist_review"]);
  });

  it("aplica especialista mesmo quando o alto risco termina em abstenção", async () => {
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("risk-empty"), fixedNow);
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer("Organize os fatos e reúna os documentos antes de contestar a multa.")
    );
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([])),
      gateway,
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

  it("AC-028: trata pergunta social como conversa curta sem busca ou alerta", async () => {
    const retriever = retrieverFor(createRetrievalResult([createEvidence()]));
    const gateway = generalGuidanceGateway(generalGuidanceAnswer("Tudo bem por aqui."));
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("social"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever,
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("social-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Como vai?",
      requestId: "request-social"
    });

    expect(answer.answer).toBe("Tudo bem por aqui.");
    expect(answer.attentionPoints).toEqual([]);
    expect(answer.suggestedNextStep).toBeNull();
    expect(retriever.search).not.toHaveBeenCalled();
  });

  it("AC-028: responde sobre as capacidades da Alvitra sem buscar regras do condomínio", async () => {
    const retriever = retrieverFor(createRetrievalResult([createEvidence()]));
    const gateway = generalGuidanceGateway(
      generalGuidanceAnswer("Posso consultar atas, convenção e contratos do condomínio.")
    );
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("capability"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever,
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("capability-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Como ele conseguiria me ajudar?",
      requestId: "request-capability"
    });

    expect(answer.answer).toContain("consultar atas");
    expect(answer.attentionPoints).toEqual([]);
    expect(answer.suggestedNextStep).toBeNull();
    expect(retriever.search).not.toHaveBeenCalled();
  });

  it("degrada para orientação geral quando o retrieval fica indisponível", async () => {
    const gateway = generalGuidanceGateway();
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

    expect(answer.answerMode).toBe("abstained");
    expect(answer.attentionPoints.join(" ")).toContain("Não foi possível consultar os documentos");
    expect(gateway.generate).toHaveBeenCalledWith(expect.objectContaining({ evidence: [] }));
    expect(persistence.getInteraction(answer.answerId)?.retrieval).toMatchObject({
      status: "failed",
      queryHash: createHash("sha256").update(question).digest("hex"),
      failureCode: "retrieval_unavailable"
    });
    expect(persistence.listAuditEvents().at(-1)?.eventType).toBe("answer_created");
  });

  it("tenta orientação geral quando a resposta documental falha na validação", async () => {
    const generate = vi.fn(async (input: Parameters<AnswerGateway["generate"]>[0]) =>
      gatewayResult(
        input.evidence.length > 0
          ? baseGeneratedAnswer({ citations: [] })
          : generalGuidanceAnswer(
              "Sem uma fonte documental válida, organize o caso e confirme a regra aplicável antes de decidir."
            )
      )
    );
    const gateway = { generate } as AnswerGateway;
    const evidence = createEvidence();
    const persistence = createInMemoryAnswerPersistence(fixedIdFactory("gateway-error"), fixedNow);
    const useCase = createAnswerUseCase({
      retriever: retrieverFor(createRetrievalResult([evidence])),
      gateway,
      persistence,
      now: fixedNow,
      idFactory: fixedIdFactory("gateway-error-interaction")
    });

    const answer = await useCase.ask(managerContext, {
      question: "Qual é a regra?",
      requestId: "request-gateway-error"
    });

    expect(answer.answerMode).toBe("abstained");
    expect(answer.citations).toEqual([]);
    expect(answer.answer).toContain("organize o caso");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenLastCalledWith(expect.objectContaining({ evidence: [] }));
  });

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
    await expect(
      useCase.ask(managerContext, {
        question: "válida",
        requestId: "request",
        idempotencyKey: "  "
      })
    ).rejects.toThrow("chave de idempotência");
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
