import { describe, expect, it } from "vitest";

import {
  buildConversationTitle,
  buildConversationTitleFromQuestions
} from "../../apps/web/conversation-title.js";

describe("títulos das conversas", () => {
  it("resume perguntas no assunto principal em vez de copiá-las", () => {
    expect(buildConversationTitle("Qual é o horário permitido para obras neste condomínio?")).toBe(
      "Horário permitido para obras"
    );
    expect(
      buildConversationTitle("Alvitra, você pode me explicar o que diz a convenção sobre animais?")
    ).toBe("Convenção sobre animais");
    expect(buildConversationTitle("Quero comparar o balancete de abril com o de março.")).toBe(
      "Comparar o balancete de abril com o de março"
    );
    expect(buildConversationTitle("Tem uma infiltração na garagem, o que eu faço agora?")).toBe(
      "Infiltração na garagem"
    );
  });

  it("ignora saudações e usa a primeira pergunta com assunto", () => {
    expect(buildConversationTitle("Oi!")).toBe("Nova conversa");
    expect(buildConversationTitleFromQuestions(["Oi!", "Como funciona o fundo de reserva?"])).toBe(
      "Fundo de reserva"
    );
  });

  it("mantém títulos curtos sem cortar uma palavra longa quando há alternativa", () => {
    const title = buildConversationTitle(
      "Quero entender quais documentos preciso reunir para aprovar uma obra muito grande na próxima assembleia"
    );

    expect(title).toBe("Documentos preciso reunir para aprovar uma obra…");
    expect(title.length).toBeLessThanOrEqual(53);
  });
});
