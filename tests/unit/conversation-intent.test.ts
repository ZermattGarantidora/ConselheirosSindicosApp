import { describe, expect, it } from "vitest";

import {
  classifySimpleConversation,
  isSimpleConversationMessage
} from "../../apps/shared/conversation-intent.js";

describe("classificação de conversas simples", () => {
  it.each([
    "Não quero.",
    "Não tenho interesse.",
    "Não, obrigado.",
    "Não quero esse serviço.",
    "Não tenho interesse nesse serviço.",
    "Não quero contratar uma garantidora.",
    "Não tenho interesse nessa garantidora.",
    "Não quero mais receber recomendações.",
    "Não quero esse serviço, obrigado."
  ])("AC-4809: recusa inequívoca dispensa recuperação documental: %s", (message) => {
    expect(classifySimpleConversation(message)).toBe("service_decline");
  });
  it.each([
    "Não quero esse serviço?",
    "Não quero usar esse arquivo.",
    "Não quero pagar essa multa.",
    "Não quero esse serviço. Analise a ata.",
    "O documento diz não quero esse serviço.",
    "Não quero cancelar o contrato sem analisar.",
    "Não quero\nesse serviço.",
    "Não quero esse serviço" + " ".repeat(180)
  ])("AC-4809: não confunde recusa simples com consulta ou ação: %s", (message) => {
    expect(classifySimpleConversation(message)).toBeNull();
  });
  it.each([
    "vou enviar ela por completo novamente",
    "Vou reenviar o documento completo.",
    "Segue o arquivo completo",
    "Seguem os documentos em anexo",
    "Aqui está o PDF",
    "Estou enviando a convenção na íntegra",
    "Enviei o balancete",
    "Segue em anexo"
  ])("AC-5716: reconhece somente aviso de envio: %s", (message) => {
    expect(classifySimpleConversation(message)).toBe("document_upload_notice");
    expect(isSimpleConversationMessage(message)).toBe(true);
  });
  it.each([
    "Vou enviar a convenção; analise se está vigente",
    "Segue o balancete, compare os meses",
    "Vou enviar o documento?",
    "Não vou enviar o arquivo",
    "Enviei a ata aprovada",
    "O documento manda enviar os dados",
    "vou enviar ela por completo novamente e explique o saldo",
    "Como envio o arquivo?",
    "Sim, pode usar",
    "Quero analisar o PDF completo",
    "vou enviar\nela por completo novamente",
    "x".repeat(241)
  ])("AC-5716: não descarta pergunta, fato ou comando: %s", (message) => {
    expect(classifySimpleConversation(message)).toBeNull();
  });
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
// Recusa de serviço é preferência conversacional, sem consequência operacional externa.
