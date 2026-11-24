import { describe, expect, it } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import type { ConversationContext } from "../../apps/api/answers/conversation-memory.js";
import {
  isGeneralLaborExplanation,
  validateTaskCoverage,
  withAnswerTaskFocus,
  withGenerationContract,
  withValidationContract
} from "../../apps/api/answers/answer-task-context.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import { structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { createCodexAnswerGateway } from "../../apps/api/answers/codex-answer-gateway.js";
import { observedGateway } from "../../evals/conversation-comparison/observed-gateway.js";
import type { ProcessObservation } from "../../evals/conversation-comparison/protocol.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import { conversationCases } from "../../evals/conversations/dataset.js";
import { runConversationSuite } from "../../evals/conversations/replay.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import {
  recoveryTargets,
  recoveryConditions,
  assertRecoverySeed,
  prepareRecoveryInput
} from "../../evals/conversation-comparison/recovery-cases.js";

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
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null },
  claims: []
});
const request = (question: string, history: ConversationContext): AnswerGatewayInput => ({
  question,
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  conversationContext: withAnswerTaskFocus(question, history, [])!,
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
});

describe("Spec 054 — causas verificadas e controles", () => {
  it.each([
    ["CONV-long-16", "agm-p2"],
    ["CONV-long-22", "egm-p1"]
  ])("retoma página documental material em %s", async (caseId, evidenceId) => {
    const testCase = conversationCases.find((item) => item.id === caseId)!;
    const report = await runConversationSuite({
      cases: [testCase],
      gateway: createLocalSyntheticAnswerGateway(),
      synthetic: true,
      chatMemoryEnabled: true
    });
    const calls = report.results[0]!.turns.at(-1)!.gatewayCalls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.input.evidence.map((source) => source.id)).toContain(evidenceId);
    expect(calls[0]!.input.evidence.length).toBeLessThanOrEqual(8);
    expect(calls[0]!.input.evidence.every((source) => source.condominiumId === "alameda")).toBe(
      true
    );
  });
  it("fixa quarenta pontos e três configurações antes de inferência", () => {
    expect(recoveryTargets).toHaveLength(40);
    expect(new Set(recoveryTargets.map((target) => target.id)).size).toBe(40);
    expect(recoveryTargets.filter((target) => target.category === "affected")).toHaveLength(20);
    expect(recoveryTargets.filter((target) => target.category === "paraphrase")).toHaveLength(10);
    expect(recoveryTargets.filter((target) => target.category === "control")).toHaveLength(10);
    expect(
      recoveryConditions.map((condition) => [
        condition.model,
        condition.reasoningEffort,
        condition.memory
      ])
    ).toEqual([
      ["gpt-6-luna", "low", true],
      ["gpt-6-luna", "high", true],
      ["gpt-6.1-sol", "low", true]
    ]);
  });
  it("replay recusa conteúdo ou pergunta fora das fixtures", () => {
    const source = createEvidence();
    const input = {
      ...request("Confira o documento.", memory("Qual documento?")),
      evidence: [source]
    };
    const questions = ["Qual documento?", "Confira o documento."];
    expect(() => assertRecoverySeed(input, questions, [source])).not.toThrow();
    expect(() =>
      assertRecoverySeed({ ...input, question: "Texto de cliente real" }, questions, [source])
    ).toThrow("fixtures");
    expect(() =>
      assertRecoverySeed(
        { ...input, evidence: [{ ...source, content: "Conteúdo arbitrário" }] },
        questions,
        [source]
      )
    ).toThrow("corpus");
  });
  it("replay não copia respostas antigas, feedback ou oráculo", () => {
    const input = {
      ...request("Confira o documento.", memory("Qual documento?")),
      validationFeedback: "task_coverage_missing" as const
    };
    const seed = {
      ...input,
      conversationContext: {
        ...input.conversationContext!,
        turns: [{ question: "Qual documento?", answer: "NÃO_REENVIAR_RESPOSTA_ANTIGA" }]
      }
    };
    const prepared = prepareRecoveryInput(seed, recoveryTargets[0]!);
    expect(JSON.stringify(prepared)).not.toContain("NÃO_REENVIAR_RESPOSTA_ANTIGA");
    expect(prepared.validationFeedback).toBeUndefined();
    expect(prepared).not.toHaveProperty("expected");
    expect(prepared).not.toHaveProperty("caseId");
    expect(prepared.conversationContext!.turns).toEqual([{ question: "Qual documento?" }]);
  });
  it("rascunho final não exige disputa de versões documentais", () => {
    const input = request(
      "Conclua sem declarar regularidade total nem culpa da gestão anterior.",
      memory(
        "Volte aos comprovantes da transição.",
        "Prepare a versão final do rascunho deixando a conferência explícita."
      )
    );
    expect(input.conversationContext!.taskFocus!.requirements?.map((x) => x.key)).not.toContain(
      "versions"
    );
    expect(() =>
      validateTaskCoverage(
        input,
        general(
          "A transição continua com comprovantes pendentes; é preciso conferir as contas, sem atribuir culpa."
        )
      )
    ).not.toThrow();
  });
  it("aviso de sinistro não exige cláusula de denúncia", () => {
    const input = request(
      "Conclua sem autorizar uso da área nem pagamento de indenização.",
      memory("Então prepare só uma lista de dados para o aviso de sinistro.")
    );
    expect(input.conversationContext!.taskFocus!.requirements?.map((x) => x.key)).not.toContain(
      "termination_notice"
    );
    expect(() =>
      validateTaskCoverage(
        input,
        general("A liberação técnica e a análise do sinistro pela seguradora continuam pendentes.")
      )
    ).not.toThrow();
  });
  it("aviso contratual e divergência de versões continuam exigidos", () => {
    const input = request(
      "Finalize o aviso e a multa da versão do contrato.",
      memory("Confira os instrumentos.")
    );
    expect(() => validateTaskCoverage(input, general("O preço permanece pendente."))).toThrow();
    expect(() =>
      validateTaskCoverage(
        input,
        general("Confira o aviso escrito, a multa e as versões do contrato.")
      )
    ).not.toThrow();
  });
  it("conclusão e mensagem de números retomam requisitos recentes", () => {
    const input = request(
      "Prepare uma mensagem curta com esses números corrigidos.",
      memory("Nesse mês, quanto entrou e saiu?", "Então posso chamar o saldo de lucro?")
    );
    expect(input.conversationContext!.taskFocus!.kind).toBe("synthesis");
    expect(input.conversationContext!.taskFocus!.requirements?.map((x) => x.key)).toContain(
      "financial_result"
    );
    expect(
      request(
        "Faça a conclusão distinguindo o que sabemos e falta validar.",
        memory("Volte ao mandato eleito.")
      ).conversationContext!.taskFocus!.kind
    ).toBe("synthesis");
  });
  it("pedido somente de fatos não exige orientação geral anterior", () => {
    const input = request(
      "Conclua somente com os fatos verificados.",
      memory(
        "Volte à taxa e horário do salão.",
        "Agora prepare só uma orientação de privacidade para múltiplos condomínios."
      )
    );
    expect(input.conversationContext!.taskFocus!.requirements?.map((x) => x.key)).not.toContain(
      "privacy"
    );
    expect(input.conversationContext!.taskFocus!.requestedItems).not.toContain(
      "Agora prepare só uma orientação de privacidade para múltiplos condomínios."
    );
  });
  it("referência corrigida não é atendida por enumeração ambígua", () => {
    const history = memory(
      "Negocie com U-A.",
      "Na verdade quero negociar com U-B, não com U-A.",
      "Prepare a cobrança privada para a unidade corrigida."
    );
    const input = request("Qual número precisa constar para não trocar as duas de novo?", history);
    expect(
      request("Para a unidade que corrigi, qual identificador deve constar?", history)
        .conversationContext!.taskFocus!.activeReferences
    ).toEqual(["u-b"]);
    expect(() =>
      validateTaskCoverage(
        input,
        general("U-A tem principal de 1.100; U-B tem 2.200. Confira o identificador.")
      )
    ).toThrow(expect.objectContaining({ code: "task_entity_missing" }));
    expect(() =>
      validateTaskCoverage(
        input,
        general(
          "Inclua o identificador correto: U-B, com principal de 2.200. U-A é a outra unidade."
        )
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        request("Compare ambas as unidades.", history),
        general("U-A e U-B precisam de conferência.")
      )
    ).not.toThrow();
    expect(() =>
      validateTaskCoverage(
        request("Então aplique automaticamente o acordo da primeira à segunda.", history),
        general(
          "Não posso aplicar automaticamente esse acordo à U-B. A proposta é de U-A e exige aprovação própria para U-B."
        )
      )
    ).not.toThrow();
  });
  it("data de referência e contrato não ampliam janela nem bytes", () => {
    const question = "Conclua as pendências do seguro.";
    const history = memory("Confira a apólice disponível.");
    const evidence = [createEvidence()];
    const input = {
      ...request(question, history),
      evidence,
      conversationContext: withAnswerTaskFocus(question, history, evidence, "2026-10-26")!
    };
    const prepared = withGenerationContract(input);
    expect(prepared.validationFeedback).toBeUndefined();
    expect(prepared.conversationContext!.taskFocus).toMatchObject({
      referenceDate: "2026-10-26",
      validationContract: { failedConstraint: null, availableEvidenceIds: [evidence[0]!.id] }
    });
    const repaired = withValidationContract(prepared, "mode_citation_mismatch");
    expect(repaired.conversationContext!.taskFocus!.referenceDate).toBe("2026-10-26");
    expect(repaired.conversationContext!.turns).toEqual(history.turns);
    expect(repaired.conversationContext!.bytes).toBe(
      Buffer.byteLength(
        JSON.stringify({
          turns: repaired.conversationContext!.turns,
          taskFocus: repaired.conversationContext!.taskFocus
        })
      )
    );
    expect(repaired.conversationContext!.bytes).toBeLessThanOrEqual(12000);
  });
  it.each([
    "O valor de R$ 75,00 mencionado na conversa, por si só, não altera a regra documental.",
    "A taxa de R$ 75 mencionada na conversa, se for uma proposta, não altera por si só a regra documental.",
    "A afirmação de que a taxa seria R$ 75,00 não altera, por si só, a regra documental.",
    "Para confirmar se a taxa de R$ 75 foi aprovada, confira a ata da deliberação e o registro da alteração.",
    "O relato de que a taxa seria R$ 75,00 não comprova uma alteração da regra documental.",
    "Se houver uma alteração aprovada, confira a ata antes de tratar R$ 75,00 como regra vigente."
  ])("menção não confirmada não afirma valor local: %s", (text) => {
    expect(answerFidelityFailure({ ...general(text), answerMode: "grounded" })).toBeUndefined();
    expect(
      answerFidelityFailure({
        ...general(`${text} Mas a taxa é R$ 75,00.`),
        answerMode: "grounded"
      })
    ).toBe("unsupported_monetary_assertion");
  });
  it("menção recusada não esconde segunda afirmação na mesma cláusula", () => {
    expect(
      answerFidelityFailure({
        ...general("O valor de R$ 75,00 mencionado não altera a regra e a taxa é R$ 75,00."),
        answerMode: "grounded"
      })
    ).toBe("unsupported_monetary_assertion");
  });
  it("afirmação positiva de conteúdo exige citação mesmo sem número", () => {
    expect(
      answerFidelityFailure(
        general("A convenção do Bosque confirma apenas a quantidade de unidades e a taxa do salão.")
      )
    ).toBe("abstention_local_assertion");
    expect(
      answerFidelityFailure(
        general(
          "Uma convenção pode estabelecer regras gerais. Não consigo confirmar o saldo sem balancete."
        )
      )
    ).toBeUndefined();
    expect(
      answerFidelityFailure(
        general("O relatório informa R$ 1.100,00 para U-A e R$ 2.200,00 para U-B.")
      )
    ).toBe("abstention_local_assertion");
    expect(
      answerFidelityFailure(general("Não consigo confirmar o valor sem o relatório."))
    ).toBeUndefined();
  });
  it("exibe referência autorizada de recomendação sem alterar tipo", () => {
    const evidence = [createEvidence()];
    const input = { ...request("Confira as fontes.", memory()), evidence };
    const body = {
      ...general("Confira o instrumento antes de decidir."),
      answerMode: "grounded",
      claims: [
        {
          statement: "Confira o instrumento.",
          claimType: "recommendation",
          evidenceRequired: false,
          citationEvidenceIds: [evidence[0]!.id]
        }
      ]
    };
    const generated = structuredAnswer(JSON.stringify(body), input);
    expect(generated.claims![0]!.claimType).toBe("recommendation");
    expect(validateGeneratedAnswer(generated, evidence).citations).toHaveLength(1);
    expect(() =>
      structuredAnswer(
        JSON.stringify({
          ...body,
          claims: [{ ...body.claims[0], citationEvidenceIds: ["foreign-id"] }]
        }),
        input
      )
    ).toThrow(expect.objectContaining({ code: "citation_not_authorized" }));
    expect(() =>
      validateGeneratedAnswer({ ...generated, answerMode: "abstained" }, evidence)
    ).toThrow(expect.objectContaining({ code: "mode_citation_mismatch" }));
  });
  it.each([
    "Na verdade quero apenas entender uma dispensa sem justa causa.",
    "Explique como funciona o desligamento."
  ])("orientação geral trabalhista não exige contrato tangencial: %s", (question) => {
    expect(
      isGeneralLaborExplanation(question, [createEvidence({ documentType: "contract" })])
    ).toBe(true);
  });
  it.each([
    "Explique quanto custa a dispensa.",
    "Quero entender a cláusula de rescisão do contrato.",
    "Explique a jornada e o salário na rescisão."
  ])("pedido documental conserva fontes: %s", (question) => {
    expect(isGeneralLaborExplanation(question, [createEvidence()])).toBe(false);
  });
  it("fonte legal relevante continua disponível na explicação", () => {
    expect(
      isGeneralLaborExplanation("Explique a dispensa sem justa causa.", [
        createEvidence({ sourceScope: "legislation" })
      ])
    ).toBe(false);
  });
  it("fluxo real separa explicação trabalhista de contrato tangencial", async () => {
    const captured: AnswerGatewayInput[] = [];
    const source = createEvidence({
      documentType: "contract",
      content:
        "Contrato sintético: salário-base R$2.400, jornada40horas. Sem documentos do desligamento."
    });
    const useCase = createAnswerUseCase({
      retriever: { search: async () => createRetrievalResult([source]) },
      persistence: createInMemoryAnswerPersistence(),
      chatMemoryEnabled: false,
      gateway: {
        generate: async (input) => {
          captured.push(input);
          return {
            output: general(
              "Dispensa sem justa causa encerra o vínculo sem imputar falta grave. Valores e procedimentos exigem datas, registros e análise profissional."
            ),
            telemetry: createAnswerTelemetry()
          };
        }
      }
    });
    const answer = await useCase.ask(managerContext, {
      question: "Na verdade quero apenas entender uma dispensa sem justa causa.",
      requestId: "recovery-general-labor"
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.evidence).toEqual([]);
    expect(answer.answer).toContain("sem imputar falta grave");
    expect(answer.citations).toEqual([]);
  });
  it.each([undefined, "low", "high"] as const)(
    "observa esforço efetivo sem mudar default: %s",
    async (reasoningEffort) => {
      const observations: ProcessObservation[] = [];
      const gateway = observedGateway(
        {
          id: "effort-test",
          model: "gpt-6-luna",
          memory: true,
          ...(reasoningEffort ? { reasoningEffort } : {})
        },
        observations,
        {
          executable: "synthetic",
          timeoutMs: 1000,
          run: async (child) => {
            expect(child.args).toContain(`model_reasoning_effort="${reasoningEffort ?? "low"}"`);
            expect(child.args).toContain("--ephemeral");
            return [
              JSON.stringify({
                type: "item.completed",
                item: { type: "agent_message", text: "Confira as evidências disponíveis." }
              }),
              JSON.stringify({
                type: "turn.completed",
                usage: { input_tokens: 100, cached_input_tokens: 0, output_tokens: 10 }
              })
            ].join("\n");
          }
        }
      );
      await gateway.generate(request("Como organizar uma pauta?", memory()));
      expect(observations[0]).toMatchObject({
        model: "gpt-6-luna",
        reasoningEffort: reasoningEffort ?? "low",
        usage: { input: 100, output: 10 }
      });
    }
  );
  it("recusa esforço desconhecido antes de iniciar processo", () => {
    expect(() => createCodexAnswerGateway({ reasoningEffort: "untrusted" as never })).toThrow(
      "esforço"
    );
  });
});
