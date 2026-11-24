import { describe, expect, it } from "vitest";
import {
  withConfirmedProfile,
  isRegisteredProfileQuestion,
  supportsRegisteredUnitsStatement
} from "../../apps/api/answers/confirmed-profile-context.js";
import {
  withAnswerTaskFocus,
  withValidationContract
} from "../../apps/api/answers/answer-task-context.js";
import { buildAnswerPrompt } from "../../apps/api/answers/prompt-catalog.js";
import type { ConversationContext } from "../../apps/api/answers/conversation-memory.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { managerContext } from "./answer-fixtures.js";

const profile = {
  condominiumId: managerContext.condominiumId,
  name: "Residencial Aurora",
  unitCount: 64
};
const memory: ConversationContext = {
  policyVersion: "recent-chat-v1",
  turns: [],
  bytes: 2,
  omittedAnswers: 0,
  omittedTurns: 0
};
const measuredBytes = (value: ConversationContext) =>
  Buffer.byteLength(
    JSON.stringify({
      turns: value.turns,
      ...(value.taskFocus === undefined ? {} : { taskFocus: value.taskFocus }),
      ...(value.confirmedProfile === undefined ? {} : { confirmedProfile: value.confirmedProfile })
    }),
    "utf8"
  );

describe("Spec 021/043 — contexto cadastral mínimo", () => {
  it("libera somente a quantidade cadastrada, sem liberar outra regra local", () => {
    const registered = withConfirmedProfile(managerContext, profile, memory)!.confirmedProfile;
    expect(supportsRegisteredUnitsStatement("O condomínio tem 64 unidades.", registered)).toBe(
      true
    );
    expect(
      supportsRegisteredUnitsStatement(
        "O condomínio Residencial Aurora possui 64 apartamentos.",
        registered
      )
    ).toBe(true);
    expect(supportsRegisteredUnitsStatement("O condomínio tem 80 unidades.", registered)).toBe(
      false
    );
    expect(
      supportsRegisteredUnitsStatement(
        "O condomínio tem 64 unidades e permite animais.",
        registered
      )
    ).toBe(false);
    expect(supportsRegisteredUnitsStatement("O condomínio tem 64 unidades.", undefined)).toBe(
      false
    );
    expect(
      supportsRegisteredUnitsStatement("O condomínio tem 64 unidades.", {
        ...registered!,
        unitCount: null
      })
    ).toBe(false);
  });
  it("projeta somente os campos autorizados, sem inventar turnos ou evidências", () => {
    const full = {
      ...profile,
      contact: { email: "nao-enviar@example.test" },
      cnpj: "nao-enviar",
      description: "nao-enviar"
    };
    const value = withConfirmedProfile(managerContext, full, undefined)!;
    expect(value.confirmedProfile).toEqual({
      ...profile,
      source: "registered_profile",
      documentaryProof: false
    });
    expect(value.turns).toEqual([]);
    expect(JSON.stringify(value)).not.toContain("nao-enviar");
    expect(value.bytes).toBe(measuredBytes(value));
    expect(withConfirmedProfile(managerContext, undefined, undefined)).toBeUndefined();
    expect(withConfirmedProfile(managerContext, undefined, memory)).toBe(memory);
    expect(
      withConfirmedProfile(managerContext, { ...profile, unitCount: null }, memory)!
        .confirmedProfile!.unitCount
    ).toBeNull();
  });

  it.each([
    { condominiumId: "outro-condominio" },
    { name: "" },
    { name: "x".repeat(121) },
    { unitCount: 0 },
    { unitCount: 1.5 },
    { unitCount: 100_001 }
  ])("falha fechada para perfil fora do contrato: %j", (invalid) => {
    expect(() => withConfirmedProfile(managerContext, { ...profile, ...invalid }, memory)).toThrow(
      "contexto da conversa"
    );
  });

  it("reserva espaço para cadastro sem cortar ou ultrapassar oito turnos", () => {
    const turns = Array.from({ length: 8 }, (_, i) => ({ question: `${i}${"x".repeat(1450)}` }));
    const value = withConfirmedProfile(
      managerContext,
      { ...profile, name: "Á".repeat(120) },
      { ...memory, turns, bytes: Buffer.byteLength(JSON.stringify(turns)) }
    )!;
    expect(value.bytes).toBeLessThanOrEqual(12_000);
    expect(value.turns.length).toBeLessThan(8);
    expect(value.turns).toEqual(turns.slice(value.omittedTurns));
    expect(value.turns.at(-1)).toEqual(turns.at(-1));
    expect(value.bytes).toBe(measuredBytes(value));
  });

  it("não transmite um contexto irredutível acima do teto", () => {
    const focused = withAnswerTaskFocus("Conclua a análise financeira.", memory, [])!;
    expect(() =>
      withConfirmedProfile(managerContext, profile, {
        ...focused,
        taskFocus: { ...focused.taskFocus!, requestedItems: ["x".repeat(12000)] }
      })
    ).toThrow("contexto da conversa");
  });

  it("conta o perfil junto ao foco e ao contrato de reparo, dentro da mesma fronteira de dados", () => {
    const value = withConfirmedProfile(managerContext, profile, memory)!;
    const focused = withAnswerTaskFocus("Conclua a análise financeira.", value, [])!;
    const input: AnswerGatewayInput = {
      question: "Conclua a análise financeira.",
      task: "grounded_answer",
      riskClass: "low",
      evidence: [],
      conversationContext: focused,
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
    };
    const corrected = withValidationContract(input, "task_coverage_missing").conversationContext!;
    for (const context of [focused, corrected]) {
      expect(context.confirmedProfile).toEqual(value.confirmedProfile);
      expect(context.bytes).toBe(measuredBytes(context));
      expect(context.bytes).toBeLessThanOrEqual(12_000);
    }
    const prompt = buildAnswerPrompt({ ...input, conversationContext: corrected });
    expect(prompt.indexOf(profile.name)).toBeGreaterThan(
      prompt.indexOf("CONVERSATION_CONTEXT_START")
    );
    expect(prompt.indexOf(profile.name)).toBeLessThan(prompt.indexOf("CONVERSATION_CONTEXT_END"));
    expect(prompt.split("EVIDENCE_DATA_START")[1]).not.toContain(profile.name);
  });

  it.each([
    "Qual é o nome do meu condomínio?",
    "Quantas unidades tem o condomínio?",
    "O que sabe sobre o meu condomínio?",
    "Quais informações cadastradas sobre o condomínio você tem?"
  ])("reconhece consulta cadastral: %s", (question) => {
    expect(isRegisteredProfileQuestion(question)).toBe(true);
  });
  it.each([
    "Qual é o nome do condomínio conforme a convenção?",
    "Qual é o rateio ordinário por unidade, o adicional de reserva, o total por unidade e a emissão mensal para as 20 unidades? Emissão mensal significa que tudo entrou no caixa?",
    "Qual o total de cotas recebidas das unidades?",
    "Quantas unidades estão em atraso?",
    "Quantas unidades pagaram a reserva?",
    "Quantas unidades foram aprovadas na ata?",
    "O que sabe sobre as regras do meu condomínio?",
    "Qual é o saldo?",
    "Como organizar a manutenção?"
  ])("preserva necessidade de evidência: %s", (question) => {
    expect(isRegisteredProfileQuestion(question)).toBe(false);
  });
});
