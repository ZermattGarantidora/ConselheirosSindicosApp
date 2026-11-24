import { describe, expect, it, vi } from "vitest";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import type {
  AnswerGatewayInput,
  AnswerGatewayResult
} from "../../apps/api/answers/answer-gateway.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import {
  createEvidence,
  createRetrievalResult,
  managerContext,
  fixedNow
} from "./answer-fixtures.js";

const chatId = "00000000-0000-4000-8000-000000000043";
function fixture() {
  const persistence = createInMemoryAnswerPersistence();
  let available = true;
  const source = createEvidence({
    content:
      "Água junho R$ 3.000,00; julho R$ 4.500,00. Energia junho R$ 2.000,00; julho R$ 2.500,00."
  });
  const search = vi.fn(async () => createRetrievalResult(available ? [source] : []));
  const generate = vi.fn(async (input: AnswerGatewayInput): Promise<AnswerGatewayResult> => ({
    output:
      input.evidence.length === 0
        ? generalAnswer("Considere as opções com o responsável.")
        : {
            answer: "Água aumentou 50%; energia, 25%.",
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
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null },
            claims: [
              {
                statement: "Água aumentou 50%; energia, 25%.",
                claimType: "interpretation",
                evidenceRequired: true,
                citationEvidenceIds: [source.id]
              }
            ]
          },
    telemetry: createAnswerTelemetry()
  }));
  const useCase = createAnswerUseCase({
    persistence,
    retriever: { search },
    gateway: { generate },
    now: fixedNow
  });
  const authorize = vi.fn(async () => {});
  const ask = (question: string, id: string, targetChat = chatId) =>
    useCase.ask(managerContext, {
      chatId: targetChat,
      question,
      requestId: id,
      revalidateConversation: authorize
    });
  return {
    persistence,
    useCase,
    ask,
    authorize,
    search,
    generate,
    source,
    removeSource: () => {
      available = false;
    }
  };
}

describe("Spec 043/046 — memória integrada ao caso de uso", () => {
  it("uma continuação preserva alto risco e especialista sem tratar histórico como evidência", async () => {
    const f = fixture();
    f.removeSource();
    await f.ask("Há água entrando no quadro elétrico energizado.", "risk-one");
    const answer = await f.ask("E agora, posso secar com pano?", "risk-two");
    expect(answer.riskClass).toBe("high");
    expect(answer.specialist.required).toBe(true);
    const input = f.generate.mock.calls.at(-1)![0];
    expect(input.riskClass).toBe("high");
    expect(input.evidence).toEqual([]);
    expect(input.conversationContext!.turns[0]!.question).toContain("quadro elétrico");
  });
  it("armazenamentos isolados com IDs iguais não disputam guarda; casos paralelos não retornam 409", async () => {
    const a = fixture();
    const b = fixture();
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    a.generate.mockImplementationOnce(async () => {
      started();
      await waiting;
      return { output: generalAnswer("Orientação geral"), telemetry: createAnswerTelemetry() };
    });
    const first = a.ask("Pergunta sintética", "isolated-a");
    await ready;
    try {
      await expect(b.ask("Pergunta sintética", "isolated-b")).resolves.toBeDefined();
    } finally {
      finish();
      await first;
    }
  });
  it("crosscutting-30: recupera fontes de novo e conserva pergunta e ordem dos turnos", async () => {
    const f = fixture();
    await f.ask("Compare água de junho e julho.", "one");
    await f.ask("E a energia nesses mesmos meses?", "two");
    const question = "Qual desses aumentos foi maior em percentual?";
    const answer = await f.ask(question, "three");
    const call = f.generate.mock.calls[2]![0];
    expect(call.question).toBe(question);
    expect(call.conversationContext!.turns).toEqual([
      {
        question: "Compare água de junho e julho.",
        answer: "Água aumentou 50%; energia, 25%.",
        basis: "current_documentary_evidence"
      },
      {
        question: "E a energia nesses mesmos meses?",
        answer: "Água aumentou 50%; energia, 25%.",
        basis: "current_documentary_evidence"
      }
    ]);
    expect(call.evidence).toEqual([f.source]);
    const saved = f.persistence.getInteraction(answer.answerId)!;
    expect(saved.question.content).toBe(question);
    expect(saved.auditEvents.at(-1)!.metadata).toMatchObject({
      memoryTurns: 2,
      memoryReplaySafe: false
    });
    const history = await f.useCase.listConversationHistory(managerContext, 8, { chatId });
    expect(history.map((entry) => entry.question)).toEqual([
      "Compare água de junho e julho.",
      "E a energia nesses mesmos meses?",
      question
    ]);
  });
  it("fonte removida e chat novo não herdam texto documental nem citações", async () => {
    const f = fixture();
    await f.ask("Compare água de junho e julho.", "one");
    f.removeSource();
    await f.ask("E agora?", "two");
    const next = f.generate.mock.calls.at(-1)![0];
    expect(next.evidence).toEqual([]);
    expect(JSON.stringify(next.conversationContext)).not.toMatch(/3\.000|4\.500|50%|25%/u);
    await f.ask("E agora?", "three", "00000000-0000-4000-8000-000000000044");
    expect(f.generate.mock.calls.at(-1)![0].conversationContext!.turns).toEqual([]);
  });
  it("reaproveita resposta geral marcada e não lê agregado sem chat", async () => {
    const f = fixture();
    f.removeSource();
    await f.ask("Quero organizar a rotina.", "one");
    await f.ask("Explique melhor.", "two");
    expect(f.generate.mock.calls[1]![0].conversationContext!.turns[0]!.answer).toBe(
      "Considere as opções com o responsável."
    );
    const spy = vi.spyOn(f.persistence, "listConversationHistory");
    await f.useCase.ask(managerContext, { question: "Explique melhor.", requestId: "legacy" });
    expect(spy).not.toHaveBeenCalled();
    expect(f.generate.mock.calls.at(-1)![0]).not.toHaveProperty("conversationContext");
  });
  it("leitura quebrada fecha em 503 sem expor erro e libera guarda", async () => {
    const f = fixture();
    const broken = vi
      .spyOn(f.persistence, "listConversationHistory")
      .mockRejectedValueOnce(new Error("SEGREDO_INTERNO"));
    await expect(f.ask("E agora?", "one")).rejects.toMatchObject({ statusCode: 503 });
    expect(f.generate).not.toHaveBeenCalled();
    broken.mockRestore();
    await expect(f.ask("E agora?", "two")).resolves.toBeDefined();
  });
  it("revogação durante geração impede persistência; idempotência não gera novamente", async () => {
    const f = fixture();
    await f.ask("Compare água.", "one");
    await f.ask("Compare água.", "one");
    expect(f.generate).toHaveBeenCalledTimes(1);
    let revoked = false;
    f.generate.mockImplementationOnce(async () => {
      revoked = true;
      return { output: generalAnswer("Resposta"), telemetry: createAnswerTelemetry() };
    });
    await expect(
      f.useCase.ask(managerContext, {
        chatId,
        question: "Nova pergunta",
        requestId: "revoked",
        revalidateConversation: async () => {
          if (revoked) throw new Error("Acesso revogado");
        }
      })
    ).rejects.toThrow("Acesso revogado");
    expect(f.persistence.listInteractions()).toHaveLength(1);
  });
  it("concorrência retorna 409, outro chat progride e erro libera guarda", async () => {
    const f = fixture();
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    f.generate.mockImplementationOnce(async () => {
      started();
      await waiting;
      throw new Error("Falha segura");
    });
    const first = f.ask("Uma pergunta", "one");
    await ready;
    await expect(f.ask("Outra pergunta", "two")).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      f.ask("Outra pergunta", "three", "00000000-0000-4000-8000-000000000045")
    ).resolves.toBeDefined();
    finish();
    await first;
    await expect(f.ask("Outra pergunta", "four")).resolves.toBeDefined();
  });
  it("desligamento não lê memória e ausência de autorização ou lock falham fechados", async () => {
    const f = fixture();
    const history = vi.spyOn(f.persistence, "listConversationHistory");
    const disabled = createAnswerUseCase({
      persistence: f.persistence,
      retriever: { search: f.search },
      gateway: { generate: f.generate },
      chatMemoryEnabled: false
    });
    await disabled.ask(managerContext, {
      chatId,
      question: "Teste",
      requestId: "disabled",
      revalidateConversation: f.authorize
    });
    expect(history).not.toHaveBeenCalled();
    await expect(
      f.useCase.ask(managerContext, { chatId, question: "Teste", requestId: "unauthorized" })
    ).rejects.toMatchObject({ statusCode: 503 });
    vi.spyOn(f.persistence, "acquireChatTurn").mockRejectedValueOnce(
      new Error("Lock indisponível")
    );
    await expect(f.ask("Teste", "lock")).rejects.toMatchObject({ statusCode: 503 });
  });
});
