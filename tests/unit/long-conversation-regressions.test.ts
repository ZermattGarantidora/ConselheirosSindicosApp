import { describe, expect, it, vi } from "vitest";
import {
  contextualQuestion,
  type ConversationContext
} from "../../apps/api/answers/conversation-memory.js";
import {
  withAnswerTaskFocus,
  requiresCollectiveAgreementEvidence,
  withValidationContract,
  validateTaskCoverage
} from "../../apps/api/answers/answer-task-context.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import { requestedDocumentGroups } from "../../apps/api/retrieval/retrieval-query.js";
import { answerSchema, structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { detectDocumentConflict } from "../../apps/api/answers/conflict-detection.js";
import { Ajv } from "ajv";
const memory = (...questions: string[]): ConversationContext => ({
  policyVersion: "recent-chat-v1",
  turns: questions.map((question) => ({ question })),
  bytes: Buffer.byteLength(JSON.stringify(questions.map((question) => ({ question })))),
  omittedTurns: 1,
  omittedAnswers: questions.length,
  windowScope: "recent_only_start_unknown"
});
const general = (answer: string): GeneratedAnswer => ({
  answer,
  answerMode: "abstained",
  citations: [],
  claims: [],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
});
const request = (question: string, context?: ConversationContext): AnswerGatewayInput => ({
  question,
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 },
  ...(context === undefined
    ? {}
    : { conversationContext: withAnswerTaskFocus(question, context, [])! })
});

describe("Spec 053 — regressões de fechamentos longos", () => {
  it("piso sem CCT usa orientação geral; pedido composto conserva contrato", async () => {
    const source = createEvidence({
      documentTitle: "Contrato de trabalho",
      documentType: "contract",
      content: "Salário: R$ 2.700,00. A CCT não foi apresentada."
    });
    expect(
      requiresCollectiveAgreementEvidence("Confirme se o salário está acima do piso.", [source])
    ).toBe(true);
    expect(
      requiresCollectiveAgreementEvidence("Confira jornada do contrato e adequação ao piso.", [
        source
      ])
    ).toBe(false);
    const generate = vi.fn(async (input: AnswerGatewayInput) => {
      expect(input.evidence).toEqual([]);
      expect(input.conversationContext?.taskFocus?.documentaryGaps).toContainEqual({
        kind: "collective_agreement",
        scope: "not_in_retrieved_evidence"
      });
      return {
        output: general(
          "Preciso da CCT aplicável e da data-base para confirmar o piso; valide com a assessoria trabalhista."
        ),
        telemetry: createAnswerTelemetry({ modelKey: "gpt-6-luna" })
      };
    });
    const result = await createAnswerUseCase({
      retriever: { search: async () => createRetrievalResult([source]) },
      gateway: { generate },
      persistence: createInMemoryAnswerPersistence()
    }).ask(managerContext, {
      question: "Confirme se o salário está acima do piso.",
      requestId: "missing-cct-guidance",
      chatId: "00000000-0000-4000-8000-000000000053",
      revalidateConversation: async () => {}
    });
    expect(result.answerMode).toBe("abstained");
    expect(result.answer).toContain("CCT");
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("exibe fonte autorizada dos claims sem alterar a afirmação nem permitir ID desconhecido", () => {
    const source = createEvidence({ content: "O contrato exige comunicação escrita." });
    const input = { ...request("Qual aviso consta?"), evidence: [source] };
    const claim = {
      statement: "O contrato exige comunicação escrita.",
      claimType: "condominium_fact" as const,
      evidenceRequired: true,
      citationEvidenceIds: [source.id]
    };
    const raw = { ...general(claim.statement), answerMode: "grounded" as const, claims: [claim] };
    const output = structuredAnswer(JSON.stringify(raw), input);
    expect(output.citations).toHaveLength(1);
    expect(output.citations[0]?.excerpt).toBe(source.content);
    expect(output.claims).toEqual([claim]);
    expect(() => validateGeneratedAnswer(output, [source])).not.toThrow();
    expect(
      structuredAnswer(JSON.stringify({ ...raw, citations: [{ evidenceId: source.id }] }), input)
        .citations
    ).toHaveLength(1);
    expect(() =>
      structuredAnswer(
        JSON.stringify({ ...raw, claims: [{ ...claim, citationEvidenceIds: ["unknown"] }] }),
        input
      )
    ).toThrow(expect.objectContaining({ code: "citation_not_authorized" }));
    const pending = { ...source, validityStatus: "pending" as const };
    expect(() =>
      validateGeneratedAnswer(
        structuredAnswer(JSON.stringify(raw), { ...input, evidence: [pending] }),
        [pending]
      )
    ).toThrow(expect.objectContaining({ code: "pending_source_as_confirmed" }));
    expect(() =>
      validateGeneratedAnswer(
        structuredAnswer(JSON.stringify({ ...raw, answerMode: "abstained" }), input),
        [source]
      )
    ).toThrow(expect.objectContaining({ code: "mode_citation_mismatch" }));
  });
  it("schema impede especialista contraditório e claim documental sem evidência", () => {
    const validate = new Ajv({ strict: false }).compile(answerSchema());
    const value = { ...general("Consulte o contador."), citations: [] };
    expect(validate(value)).toBe(true);
    expect(
      validate({
        ...value,
        specialist: { required: false, type: "contador", reason: "Conferência" }
      })
    ).toBe(false);
    expect(
      validate({
        ...value,
        specialist: { required: true, type: "contador", reason: "Conferência" }
      })
    ).toBe(true);
    expect(
      validate({
        ...value,
        claims: [
          {
            statement: "Há decisão.",
            claimType: "condominium_fact",
            evidenceRequired: false,
            citationEvidenceIds: []
          }
        ]
      })
    ).toBe(false);
    expect(
      validate({
        ...value,
        claims: [
          {
            statement: "Há decisão.",
            claimType: "interpretation",
            evidenceRequired: true,
            citationEvidenceIds: []
          }
        ]
      })
    ).toBe(false);
  });
  it("schema estável preserva autorização e minuta no validador local", () => {
    const source = createEvidence({ id: "signed" });
    const pending = {
      ...source,
      id: "draft",
      documentVersionId: "pending",
      validityStatus: "pending" as const
    };
    const input = { ...request("Confira as fontes."), evidence: [source, pending] };
    const validate = (value: unknown) =>
      validateGeneratedAnswer(structuredAnswer(JSON.stringify(value), input), input.evidence);
    expect(JSON.stringify(answerSchema())).not.toContain('"signed"');
    expect(JSON.stringify(answerSchema())).not.toContain('"draft"');
    const claim = {
      statement: "Texto documental",
      claimType: "condominium_fact",
      evidenceRequired: true,
      citationEvidenceIds: ["signed"]
    };
    const body = {
      ...general("Texto documental"),
      answerMode: "grounded",
      citations: [{ evidenceId: "signed" }],
      claims: [claim]
    };
    expect(() => validate(body)).not.toThrow();
    expect(() =>
      validate({ ...body, claims: [{ ...claim, citationEvidenceIds: ["draft"] }] })
    ).toThrow(expect.objectContaining({ code: "pending_source_as_confirmed" }));
    expect(() =>
      validate({
        ...body,
        claims: [{ ...claim, claimType: "interpretation", citationEvidenceIds: ["draft"] }]
      })
    ).not.toThrow();
    expect(() => validate({ ...body, citations: [{ evidenceId: "outside" }] })).toThrow(
      expect.objectContaining({ code: "citation_not_authorized" })
    );
    expect(() =>
      validateGeneratedAnswer(
        structuredAnswer(
          JSON.stringify({
            ...body,
            citations: [{ evidenceId: "draft" }],
            claims: [{ ...claim, citationEvidenceIds: ["draft"] }]
          }),
          { ...input, evidence: [pending] }
        ),
        [pending]
      )
    ).toThrow(expect.objectContaining({ code: "pending_source_as_confirmed" }));
  });
  it.each([
    "O termo de transição registra que faltavam dois comprovantes de manutenção.",
    "A ata determinou que fossem apresentados dois comprovantes em 30 dias."
  ])("abstenção não afirma registro documental sem citação: %s", (text) => {
    expect(answerFidelityFailure(general(text))).toBe("abstention_local_assertion");
  });
  it.each([
    "Uma ata registra as deliberações da reunião.",
    "Não consigo confirmar se o termo registra que faltavam comprovantes."
  ])("preserva definição e impossibilidade de confirmar: %s", (text) => {
    expect(answerFidelityFailure(general(text))).toBeUndefined();
  });
  it.each([
    "Não trocarei R$ 9.700,00 por R$ 15.000,00 no resumo.",
    "Não alterarei esse saldo para R$ 15.000,00."
  ])("recusa conjugada não confirma valor: %s", (text) => {
    expect(answerFidelityFailure({ ...general(text), answerMode: "grounded" })).toBeUndefined();
    expect(
      answerFidelityFailure({
        ...general(`${text} Mas o saldo é R$ 15.000,00.`),
        answerMode: "grounded"
      })
    ).toBe("unsupported_monetary_assertion");
  });
  it.each([
    "As locações deverão ter prazo mínimo de quarenta dias.",
    "As locações residenciais deverão possuir prazo igual ou superior a 40 dias.",
    "Fica vedada a locação residencial por prazo inferior a 40 dias."
  ])("conflito reconhece mínimo equivalente sem confundir retenção: %s", (content) => {
    const convention = createEvidence({
      documentType: "convention",
      content: content.replace("quarenta", "40")
    });
    const rules = createEvidence({
      id: "rules-other",
      documentId: "rules",
      documentType: "internal_rules",
      content: "As locações terão prazo mínimo de trinta dias."
    });
    expect(
      detectDocumentConflict("Qual prazo mínimo para locação?", [convention, rules])
    ).not.toBeNull();
    expect(
      detectDocumentConflict("Qual prazo mínimo para locação?", [
        convention,
        { ...rules, content: "Retenção de imagens: 30 dias." }
      ])
    ).toBeNull();
  });
  it("definições antigas não viram pendências da pauta", () => {
    const input = request(
      "Prepare três tópicos para essa pauta corrigida.",
      memory(
        "Qual diferença entre saldo e resultado?",
        "Como funciona um contrato?",
        "O título será Reunião de conferência."
      )
    );
    expect(() =>
      validateTaskCoverage(
        input,
        general("Organize assuntos, responsáveis e documentos a conferir.")
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        request("Qual a diferença entre pauta e ata em linguagem simples?"),
        general("Uma organiza assuntos; a outra registra a reunião.")
      )
    ).not.toThrow();
  });
  it("preserva identificador corrigido sem copiar a resposta anterior", () => {
    const context = memory(
      "Vamos conferir a unidade B-105.",
      "Corrigindo: quero a unidade B-207.",
      "O principal dessa unidade consta no relatório?"
    );
    const q = "Qual unidade e principal estamos discutindo depois da correção?";
    const search = contextualQuestion(q, context);
    expect(search).toContain("B-207");
    expect(search).not.toContain("B-105");
    const input = request(q, context);
    expect(input.conversationContext?.taskFocus?.activeReferences).toEqual(["b-207"]);
    expect(() => validateTaskCoverage(input, general("A unidade B-105 tem uma proposta."))).toThrow(
      expect.objectContaining({ code: "task_entity_missing" })
    );
    expect(() =>
      validateTaskCoverage(
        input,
        general(
          "A unidade B-207 é a referência corrigida; falta o relatório para confirmar o principal."
        )
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(input, general("Confirme qual unidade deseja conferir."))
    ).not.toThrow();
  });
  it("não exige uma entidade antiga ao comparar ambas ou após mudança de assunto", () => {
    const context = memory("Corrigindo: unidade B-207.", "Quero mudar de assunto: seguro.");
    expect(
      request("Finalize a conferência do seguro.", context).conversationContext?.taskFocus
        ?.activeReferences
    ).toBeUndefined();
    expect(
      request("Compare ambas as unidades.", context).conversationContext?.taskFocus
        ?.activeReferences
    ).toBeUndefined();
    expect(contextualQuestion("Qual é a função do conselho?", context)).toBe(
      "Qual é a função do conselho?"
    );
  });
  it("retoma pergunta elíptica após correção com negação da unidade antiga", () => {
    const context = memory(
      "Confira A-103.",
      "Na verdade quero negociar com A-204, não com A-103.",
      "Prepare uma cobrança para a unidade corrigida."
    );
    const q = "Qual número precisa constar para não trocar as duas de novo?";
    expect(contextualQuestion(q, context).split("\n")[0]).not.toContain("A-103");
    expect(request(q, context).conversationContext!.taskFocus!.activeReferences).toEqual(["a-204"]);
  });
  it("prioriza aviso e multa sem perder o instrumento recuperável", () => {
    const context = memory(
      "Confira o contrato de jardinagem.",
      "Qual saldo está no balancete?",
      "Qual o preço da limpeza?",
      "Reenviei o contrato e o aditivo de jardinagem."
    );
    const q = "Volte ao aviso e à multa previstos no contrato de jardinagem.";
    expect(contextualQuestion(q, context)).not.toContain("balancete");
    expect(contextualQuestion(q, context)).toContain("jardinagem");
    expect(() =>
      validateTaskCoverage(
        request(q, context),
        general("O contrato contém o preço e proposta pendente.")
      )
    ).toThrow(expect.objectContaining({ code: "task_coverage_missing" }));
    expect(() =>
      validateTaskCoverage(
        request(q, context),
        general("O aviso e a multa dependem da cláusula; envie o contrato para confirmar.")
      )
    ).not.toThrow();
  });
  it("síntese genérica retoma despesa e comprovação técnica disponíveis", () => {
    const input = request(
      "Conclua com o próximo passo humano e a evidência que o sustenta.",
      memory(
        "Confira a despesa de abril.",
        "Qual relatório falta para comprovar execução da visita?"
      )
    );
    expect(() =>
      validateTaskCoverage(input, general("Solicite o relatório da visita técnica."))
    ).toThrow(expect.objectContaining({ code: "task_coverage_missing" }));
    expect(() =>
      validateTaskCoverage(
        input,
        general(
          "Solicite o relatório de execução e a nota fiscal/detalhamento da despesa para conferir os comprovantes."
        )
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        input,
        general("Repita os itens do pedido que estão fora da janela parcial.")
      )
    ).not.toThrow();
  });
  it("pergunta explícita de um tópico não força todos os assuntos antigos", () => {
    const input = request(
      "Resuma o contrato.",
      memory("Confira o balancete.", "Confira a apólice.")
    );
    expect(() =>
      validateTaskCoverage(input, general("Falta o contrato para confirmar a cláusula."))
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(request("Qual o preço do contrato?"), general("Preciso do documento."))
    ).not.toThrow();
  });
  it("duas verificações financeiras não se resumem a repetir a palavra saldo", () => {
    const input = request(
      "Termine com verificações sobre extratos, reserva e comprovantes.",
      memory("Confira as contas.")
    );
    expect(() => validateTaskCoverage(input, general("Confira o saldo."))).toThrow(
      expect.objectContaining({ code: "task_coverage_missing" })
    );
    expect(() =>
      validateTaskCoverage(
        input,
        general("Concilie os extratos e a reserva vinculada, pedindo os comprovantes faltantes.")
      )
    ).not.toThrow();
  });
  it("categorias para busca incluem conferência contábil e cláusulas", () => {
    expect(requestedDocumentGroups("Contador precisa conferir despesas e conciliação.")).toContain(
      "balancete"
    );
    expect(requestedDocumentGroups("Qual aviso de denúncia é previsto?")).toContain("contrato");
  });
  it("contrato de correção informa modo e pendências sem promover fato", () => {
    const source = createEvidence({ id: "draft", validityStatus: "pending" });
    const confirmed = {
      ...source,
      id: "confirmed",
      documentVersionId: "v-confirmed",
      validityStatus: "confirmed" as const
    };
    const input = {
      ...request("Conclua o contrato.", memory("Confira as duas versões.")),
      task: "document_conflict" as const,
      evidence: [source, confirmed]
    };
    const corrected = withValidationContract(input, "pending_source_as_confirmed");
    const contract = corrected.conversationContext!.taskFocus!.validationContract!;
    expect(contract.permittedModes).toEqual(["conflict"]);
    expect(contract.pendingEvidenceIds).toEqual(["draft"]);
    expect(contract.conflictEvidenceIds).toEqual(["draft", "confirmed"]);
    expect(contract.claims.pending).toBe("interpretation_only");
    expect(corrected.question).toBe(input.question);
    expect(corrected.evidence).toBe(input.evidence);
    expect(corrected.conversationContext!.bytes).toBe(
      Buffer.byteLength(
        JSON.stringify({
          turns: corrected.conversationContext!.turns,
          taskFocus: corrected.conversationContext!.taskFocus
        })
      )
    );
    expect(
      withValidationContract(request("Olá"), "mode_incompatible").conversationContext
    ).toBeUndefined();
  });
  it("diagnóstico mantém oito turnos e orçamento UTF-8, ou é omitido", () => {
    const context = memory(
      ...Array.from({ length: 8 }, (_, i) => `Confira contrato ${i} ` + "á".repeat(620))
    );
    const input = request("Finalize o quadro.", context);
    const corrected = withValidationContract(input, "task_coverage_missing");
    expect(corrected.conversationContext!.turns).toHaveLength(8);
    expect(corrected.conversationContext!.bytes).toBeLessThanOrEqual(12000);
    const full = memory("á".repeat(5975));
    const limited = withValidationContract(
      { ...request("Olá"), conversationContext: full },
      "mode_incompatible"
    );
    expect(limited.conversationContext!.bytes).toBeLessThanOrEqual(12000);
  });
  it.each([
    "Confira o saldo de 31/08 antes de decidir.",
    "Compare a taxa de 15% com a aprovada.",
    "O salário de 40 horas precisa de conferência.",
    "O preço de 30 dias de serviço depende do contrato."
  ])("não transforma data, percentual ou unidade em dinheiro: %s", (text) => {
    expect(answerFidelityFailure({ ...general(text), answerMode: "grounded" })).toBeUndefined();
  });
  it("mantém bloqueio de valores monetários sem suporte e aceita valor citado", () => {
    expect(answerFidelityFailure({ ...general("O saldo é 9.700."), answerMode: "grounded" })).toBe(
      "unsupported_monetary_assertion"
    );
    expect(
      answerFidelityFailure({ ...general("O preço mensal é R$ 970,00."), answerMode: "grounded" })
    ).toBe("unsupported_monetary_assertion");
    const source = createEvidence({ content: "Preço mensal: R$ 970,00." });
    expect(
      answerFidelityFailure({
        ...general("O preço é 970,00."),
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
        ]
      })
    ).toBeUndefined();
  });
  it("segunda geração recebe contrato sem trocar Luna/fontes nem ultrapassar duas chamadas", async () => {
    const source = createEvidence({ content: "Contrato sintético para conferir aviso e multa." });
    const generate = vi.fn(async (input: AnswerGatewayInput) => ({
      output: {
        ...general(
          input.validationFeedback
            ? "O contrato exige conferir aviso e multa antes de encerrar."
            : "Confira o contrato."
        ),
        answerMode: "grounded" as const,
        citations: [
          {
            evidenceId: source.id,
            documentId: source.documentId,
            documentVersionId: source.documentVersionId,
            title: source.documentTitle,
            page: source.pageNumber,
            excerpt: source.content
          }
        ]
      },
      telemetry: createAnswerTelemetry({ modelKey: "gpt-6-luna" })
    }));
    const result = await createAnswerUseCase({
      retriever: { search: async () => createRetrievalResult([source]) },
      gateway: { generate },
      persistence: createInMemoryAnswerPersistence()
    }).ask(managerContext, {
      question: "Conclua com aviso e multa do contrato.",
      requestId: "long-repair-contract",
      chatId: "00000000-0000-4000-8000-000000000053",
      revalidateConversation: async () => {}
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(
      generate.mock.calls[1]![0].conversationContext!.taskFocus!.validationContract!
        .failedConstraint
    ).toBe("task_coverage_missing");
    expect(generate.mock.calls[1]![0].evidence).toEqual([source]);
    expect(result.answerMode).toBe("grounded");
  });
});
