import { describe, expect, it } from "vitest";

import {
  classifySimpleConversation,
  isSimpleConversationMessage
} from "../../apps/shared/conversation-intent.js";

describe("classificação de conversas simples", () => {
  it.each(["Olá!", "Boa tarde", "Tudo bem?"])('reconhece cumprimento "%s"', (message) => {
    expect(classifySimpleConversation(message)).toBe("greeting");
  });

  it.each([
    "Como a Alvitra pode me ajudar?",
    "Como ele conseguiria me ajudar?",
    "Com o que você poderia me ajudar?",
    "O que a Alvitra pode fazer?"
  ])(
    "reconhece pergunta geral de capacidade sem confundi-la com consulta documental",
    (message) => {
      expect(classifySimpleConversation(message)).toBe("capability");
      expect(isSimpleConversationMessage(message)).toBe(true);
    }
  );

  it.each([
    "Como funciona a multa prevista no regimento?",
    "O que a Alvitra pode fazer sobre a multa desta assembleia?"
  ])("não classifica uma consulta específica do condomínio como conversa simples", (message) => {
    expect(classifySimpleConversation(message)).toBeNull();
    expect(isSimpleConversationMessage(message)).toBe(false);
  });
});
