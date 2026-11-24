import type { FullPageDocument } from "./full-page-documents.js";

export const subscriptionStatement =
  "Anexo de subscrições: seis coletas pendentes; nenhuma subscrição confirmada.";

/** Material inteiramente fictício, sem nomes de pessoas, contatos ou dados de clientes. */
export function createConventionContinuationDocument(): FullPageDocument {
  const topics = [
    "Identificação e organização",
    "Administração e responsabilidades",
    "Assembleias e registros",
    "Conservação das áreas comuns",
    "Acompanhamento dos serviços",
    "Documentos e prestação de contas",
    "Atualizações e versões",
    "Formalização e subscrições"
  ];
  return {
    id: "convention-continuation-synthetic",
    title: "Convenção fictícia do Condomínio Alameda.pdf",
    pageCount: 8,
    pages: topics.map((topic, pageIndex) => {
      const lines = [
        "FICTÍCIO - SOMENTE TESTE - SEM DADOS REAIS",
        `CONVENÇÃO DO CONDOMÍNIO ALAMEDA | PÁGINA ${pageIndex + 1} DE 8`,
        topic.toLocaleUpperCase("pt-BR"),
        ...Array.from({ length: 10 }, (_, articleIndex) => [
          `Artigo ${pageIndex * 10 + articleIndex + 1}. O controle conserva a versão e a origem de cada registro.`,
          "A administração registra decisões e mantém o suporte documental disponível.",
          "As alterações são anotadas com data e motivo, preservando a condição anterior.",
          "Divergências seguem à assembleia e continuam identificadas no controle.",
          "A consulta ao original antecede decisões e não dispensa revisão humana."
        ]).flat(),
        "FIM DA PÁGINA | MINUTA INTEIRAMENTE FICTÍCIA PARA TESTE"
      ];
      if (pageIndex === 7) {
        lines[8] = subscriptionStatement;
        lines[9] = "Aprovação assemblear e registro: pendentes de conferência documental.";
      }
      return { lines, expectedText: lines.join("\n"), probes: [] };
    })
  };
}
