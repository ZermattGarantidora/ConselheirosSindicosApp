import type { FullPageDocument } from "../../tests/fixtures/full-page-documents.js";
import type { DenseCase } from "./oracle.js";
export function scannedSource(): FullPageDocument<number> {
  return {
    id: "scanned-rules",
    title: "Digitalizacao do regulamento de espacos - Alameda",
    pageCount: 2,
    pages: [1, 2].map((page) => {
      const lines = [
        "FICTICIO - SOMENTE TESTE - SEM DADOS REAIS",
        `Regulamento digitalizado de espacos - Alameda | pagina ${page}/2`
      ];
      for (let i = 1; i <= 44; i++) {
        const number = (page - 1) * 44 + i;
        lines.push(
          `Item SC-${String(number).padStart(3, "0")}: registro de uso do setor ${number}, reserva com ${3 + (number % 9)} dias de antecedencia.`
        );
      }
      lines.splice(
        12,
        0,
        ...(page === 1
          ? [
              "REGRA-SC17: o espaco de reunioes comporta 63 pessoas e encerra as atividades as 21h.",
              "O prazo usual para pedir reserva e de 9 dias. Ler a ressalva da segunda pagina.",
              "A lista de reservas nao prova pagamento, assinatura ou autorizacao de evento."
            ]
          : [
              "RESSALVA-SC17: em domingo de manutencao o fechamento e as 17h, mantendo 63 pessoas.",
              "Nesse domingo a reserva exige 14 dias de antecedencia, em lugar dos 9 usuais.",
              "Nenhum alvara municipal ou ata assinada foi anexado ao regulamento digitalizado."
            ])
      );
      lines.push(
        "As condicoes deste regulamento precisam ser lidas com as ressalvas e anexos.",
        "Cada item conserva seu numero; nao confundir reserva, pagamento e aprovacao.",
        `FIM REGULAMENTO DIGITALIZADO PAGINA ${page}`
      );
      return { lines, expectedText: lines.join("\n"), probes: [] };
    })
  };
}
export function scannedCases(): readonly DenseCase[] {
  return [
    {
      question:
        "Na digitalizacao do regulamento de espacos, qual a capacidade e o horario usual da REGRA-SC17?",
      expected: "63 pessoas e 21h; nao confundir ressalva de domingo.",
      atoms: ["63", "21"],
      sources: [{ document: "scanned" as const, page: 1, anchor: "REGRA-SC17" }],
      qualify: false
    },
    {
      question:
        "Na digitalizacao do regulamento de espacos, qual o fechamento no domingo de manutencao e qual a capacidade? Cruze a regra com a ressalva.",
      expected: "17h no domingo de manutencao, capacidade63 permanece; horario usual21h.",
      atoms: ["17", "63"],
      sources: [
        { document: "scanned" as const, page: 1, anchor: "REGRA-SC17" },
        { document: "scanned" as const, page: 2, anchor: "RESSALVA-SC17" }
      ],
      qualify: false
    },
    {
      question:
        "Na digitalizacao do regulamento de espacos, com quantos dias deve ser pedida a reserva no domingo de manutencao, em vez do prazo usual?",
      expected: "14 dias na excecao versus9 dias usuais.",
      atoms: ["14", "9"],
      sources: [
        { document: "scanned" as const, page: 1, anchor: "REGRA-SC17" },
        { document: "scanned" as const, page: 2, anchor: "RESSALVA-SC17" }
      ],
      qualify: false
    },
    {
      question:
        "Qual alvara municipal foi anexado a digitalizacao do regulamento de espacos e quem assinou a ata?",
      expected: "Nenhum alvara ou ata assinada anexado; nao inventar signatario.",
      atoms: [],
      sources: [{ document: "scanned" as const, page: 2, anchor: "Nenhum alvara municipal" }],
      qualify: true
    }
  ].map((c, i) => ({ ...c, category: "real_ocr", id: `SCAN-${String(i + 1).padStart(3, "0")}` }));
}
