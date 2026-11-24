import type { FullPageDocument } from "../../tests/fixtures/full-page-documents.js";
import { denseMoney, type DenseKind, type DenseRecord } from "./corpus.js";
import { createDenseCases, type DenseCase } from "./oracle.js";

function wrap(text: string, width = 90): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/u)) {
    const last = lines.at(-1);
    if (!last || last.length + word.length + 1 > width) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
  }
  return lines;
}
export function createVariedCorpus(): readonly {
  kind: DenseKind;
  document: FullPageDocument<number>;
}[] {
  return (["narrative_minutes", "narrative_contract", "narrative_convention"] as const).map(
    (kind, docIndex) => {
      const title = [
        "Ata extraordinaria e anexo de decisoes - Alameda",
        "Contrato de manutencao e anexo de aceite - Alameda",
        "Convencao com excecoes e anexo de horarios - Alameda"
      ][docIndex]!;
      return {
        kind,
        document: {
          id: `varied-${kind}`,
          title,
          pageCount: 4,
          pages: Array.from({ length: 4 }, (_, p) => {
            const page = p + 1;
            const lines = [
              "FICTICIO - SOMENTE TESTE - SEM DADOS REAIS",
              `${title} | pagina ${page}/4`
            ];
            for (let n = 0; n < 16; n++) {
              const i = p * 16 + n + 1,
                code = `${["PAU", "CLA", "REG"][docIndex]}-${String(i).padStart(4, "0")}`;
              const amount = denseMoney(157300 + i * 379 + docIndex * 3100);
              const prose =
                kind === "narrative_minutes"
                  ? `${code}: a assembleia discutiu a manutencao do setor ${i}. O valor estimado foi ${amount}, com ${19 + (i % 21)} votos registrados e prazo sugerido de ${8 + (i % 17)} dias. A secretaria distinguiu presenca, proposta, deliberacao e execucao, remetendo a documentacao de suporte ao arquivo proprio.`
                  : kind === "narrative_contract"
                    ? `${code}: a contratada deve apresentar relatorio do equipamento ${i} e memoria dos servicos, no valor de ${amount}. A entrega documental em ${8 + (i % 17)} dias nao substitui teste funcional, laudo tecnico nem aceite expresso do responsavel. A obrigacao deve ser conferida com o anexo e a ordem correspondente.`
                    : `${code}: o uso do espaco ${i} exige reserva, identificacao da unidade e respeito ao horario registrado. O custo de referencia e ${amount}, com antecedencia de ${8 + (i % 17)} dias. Esta clausula deve ser lida com as excecoes do anexo, sem inferir pagamento ou autorizacao de evento por mera reserva.`;
              lines.push(...wrap(prose));
            }
            if (page === 1) {
              lines.splice(
                3,
                0,
                ...wrap(
                  kind === "narrative_minutes"
                    ? "PAUTA-EX17: a pintura foi proposta por R$18.420,75, em tres parcelas. A votacao foi adiada; consultar o anexo final antes de afirmar aprovacao. A cotacao nao e contrato."
                    : kind === "narrative_contract"
                      ? "CLAUSULA-EX29: o prazo normal de entrega do relatorio e 12 dias. O valor mensal e R$7.315,42. Assinatura e pagamento nao comprovam aceite tecnico. O anexo final trata da excecao."
                      : "REGRA-EX83: o salao encerra as atividades as 22h, com capacidade de 74 pessoas. O anexo final define excecao especifica; a regra nao autoriza evento acima da capacidade."
                )
              );
            }
            if (page === 4)
              lines.push(
                ...wrap(
                  kind === "narrative_minutes"
                    ? "ANEXO-EX17: a proposta de pintura permaneceu sem aprovacao, com 31 favoraveis, 17 contrarios e 6 abstencoes na consulta preliminar. Faltou a votacao deliberativa. Nenhuma ata assinada ou contratacao foi anexada."
                    : kind === "narrative_contract"
                      ? "ANEXO-EX29: na ocorrencia de falha eletrica registrada, o relatorio deve ser entregue em 4 dias, em lugar dos 12 usuais. O equipamento permanece sem aceite tecnico ate teste funcional e assinatura do responsavel; o pagamento nao supre essas provas."
                      : "ANEXO-EX83: na quarta-feira de manutencao, o salao fecha as 19h, em lugar das 22h. A capacidade de 74 pessoas permanece. Festa de sabado nao e excecao; nao ha documento autorizando som apos 22h."
                )
              );
            lines.push(`FIM ${kind.toUpperCase()} PAGINA ${page}`);
            if (lines.length > 70)
              throw new Error(`Pagina narrativa excedente: ${kind}/${page}/${lines.length}`);
            return { lines, expectedText: lines.join("\n"), probes: [] };
          })
        }
      };
    }
  );
}
export function createDenseCasesV2(ledger: readonly DenseRecord[]): readonly DenseCase[] {
  const original = createDenseCases(ledger).map((c) =>
    c.id === "DENSE-029"
      ? {
          ...c,
          sources: c.sources.map((s) => ({
            ...s,
            equivalentPages: Array.from({ length: 24 }, (_, i) => i + 1)
          }))
        }
      : c
  );
  const unseen: Omit<DenseCase, "id">[] = [];
  for (const document of ["financial", "convention", "minutes", "contracts"] as const) {
    for (const index of [137, 743, 1087]) {
      const row = ledger.find((r) => r.document === document && r.index === index)!;
      unseen.push({
        category: "held_out_detail",
        question: `No documento ${document === "financial" ? "financeiro" : document === "convention" ? "convencao aprovada" : document === "minutes" ? "atas e deliberacoes" : "contratos e ordens"}, localize ${row.key} e informe valor, prazo e situacao, sem copiar a linha vizinha.`,
        expected: `${row.key}: ${denseMoney(row.amountMinor)}, ${row.days} dias, ${row.status}.`,
        atoms: [row.key, denseMoney(row.amountMinor), `${row.days} dias`, row.status],
        sources: [{ document, page: row.page, anchor: row.key }],
        qualify: false
      });
    }
  }
  const scenario = (
    document: DenseKind,
    question: string,
    expected: string,
    atoms: readonly string[],
    anchors: readonly [number, string][],
    qualify = false
  ) =>
    unseen.push({
      category: "varied_document",
      question,
      expected,
      atoms,
      sources: anchors.map(([page, anchor]) => ({ document, page, anchor })),
      qualify
    });
  scenario(
    "narrative_minutes",
    "Na ata extraordinaria, a pintura PAUTA-EX17 foi aprovada? Cruze a pauta com o anexo e diferencie proposta, consulta e deliberacao.",
    "Proposta de 18.420,75 em tres parcelas, sem aprovacao deliberativa; consulta preliminar nao autoriza contrato.",
    ["18.420,75"],
    [
      [1, "PAUTA-EX17"],
      [4, "ANEXO-EX17"]
    ],
    true
  );
  scenario(
    "narrative_minutes",
    "Quais foram os votos da consulta preliminar sobre a pintura no anexo da ata extraordinaria? Isso comprova quorum legal?",
    "31 favoraveis, 17 contrarios, 6 abstencoes; nao comprova quorum legal.",
    ["31", "17", "6"],
    [[4, "ANEXO-EX17"]],
    true
  );
  scenario(
    "narrative_minutes",
    "Qual empresa assinou o contrato de pintura e qual a data da ata assinada, segundo a ata extraordinaria?",
    "Nenhum contrato/ata assinada anexado; nao inventar empresa ou data.",
    [],
    [[4, "Nenhuma ata assinada"]],
    true
  );
  scenario(
    "narrative_minutes",
    "Na ata extraordinaria, o valor proposto para a pintura pode ser tratado como pagamento realizado?",
    "Proposta/cotacao nao e contrato nem pagamento comprovado.",
    ["18.420,75"],
    [
      [1, "PAUTA-EX17"],
      [4, "ANEXO-EX17"]
    ],
    true
  );
  scenario(
    "narrative_contract",
    "No contrato de manutencao, qual o prazo do relatorio na falha eletrica? Compare CLAUSULA-EX29 e ANEXO-EX29.",
    "12 dias usuais, 4 dias na falha eletrica; mensalidade 7.315,42 nao equivale a aceite.",
    ["12", "4"],
    [
      [1, "CLAUSULA-EX29"],
      [4, "ANEXO-EX29"]
    ]
  );
  scenario(
    "narrative_contract",
    "O pagamento mensal do contrato de manutencao ja libera o aceite tecnico do equipamento? Que provas faltam?",
    "Pagamento nao substitui teste funcional e assinatura do responsavel; aceite ausente.",
    ["teste", "assinatura"],
    [[4, "ANEXO-EX29"]],
    true
  );
  scenario(
    "narrative_contract",
    "Qual o valor mensal literal da CLAUSULA-EX29 do contrato de manutencao? Nao use os valores de outras clausulas.",
    "R$7.315,42 mensal.",
    ["7.315,42"],
    [[1, "CLAUSULA-EX29"]]
  );
  scenario(
    "narrative_contract",
    "O anexo do contrato de manutencao altera a mensalidade ou somente prazo e condicoes de aceite?",
    "Nao consta mudanca de mensalidade no anexo; altera prazo na falha eletrica e mantem condicoes de aceite.",
    [],
    [
      [1, "CLAUSULA-EX29"],
      [4, "ANEXO-EX29"]
    ],
    true
  );
  scenario(
    "narrative_convention",
    "Na convencao com excecoes, qual o horario de fechamento do salao na quarta-feira de manutencao? A capacidade muda?",
    "19h na quarta de manutencao versus 22h usual; capacidade 74 pessoas.",
    ["19", "22", "74"],
    [
      [1, "REGRA-EX83"],
      [4, "ANEXO-EX83"]
    ]
  );
  scenario(
    "narrative_convention",
    "Na convencao com excecoes, uma festa de sabado pode usar a excecao da quarta-feira e manter som depois de 22h?",
    "Nao; a excecao de manutencao da quarta nao autoriza som apos22h no sabado.",
    ["22"],
    [[4, "ANEXO-EX83"]],
    true
  );
  scenario(
    "narrative_convention",
    "Na convencao com excecoes, quantas pessoas cabem no salao pela REGRA-EX83? A regra autoriza ultrapassar essa capacidade?",
    "74 pessoas, nao ultrapassar.",
    ["74"],
    [[1, "REGRA-EX83"]],
    true
  );
  scenario(
    "narrative_convention",
    "Qual alvara municipal autoriza o salao da convencao com excecoes a funcionar ate mais tarde?",
    "Nenhum alvara municipal apresentado; nao inventar fonte ou autorizacao.",
    [],
    [[4, "nao ha documento autorizando"]],
    true
  );
  return [
    ...original,
    ...unseen.map((c, i) => ({ ...c, id: `UNSEEN-${String(i + 1).padStart(3, "0")}` }))
  ];
}
