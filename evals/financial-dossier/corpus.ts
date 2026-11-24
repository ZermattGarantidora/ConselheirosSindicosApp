/** Ledger fictício, anterior à extração. Sem importações de código de produção. */
export const corpusVersion = "financial-300-v1";
export const rubrics = [
  "Água",
  "Energia",
  "Limpeza",
  "Manutenção",
  "Despesa - Seguro",
  "Despesa - Administração",
  "Obra garagem",
  "Reparo emergencial portão"
];
export const money = (minor: number) =>
  `R$ ${(minor / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function createLedger() {
  return Array.from({ length: 293 }, (_, index) => {
    const id = `NF-${String(index + 1).padStart(4, "0")}`;
    const items = Array.from({ length: 30 }, (_, item) => 500 + ((index * 37 + item * 19) % 1600));
    return {
      id,
      page: index + 7,
      period: index < 200 ? "10/2026" : "09/2026",
      rubric: rubrics[index % rubrics.length]!,
      items,
      total: items.reduce((a, b) => a + b, 0),
      cancelled: index === 83,
      itemError: index === 159 ? 1000 : 0
    };
  });
}
export type Ledger = ReturnType<typeof createLedger>;
export function createBook(ledger: Ledger) {
  const totals = (period: string) =>
    rubrics.map((rubric) =>
      ledger
        .filter((v) => v.period === period && v.rubric === rubric)
        .reduce((s, v) => s + v.total, 0)
    );
  const oct = totals("10/2026"),
    sep = totals("09/2026"),
    expense = oct.reduce((a, b) => a + b, 0);
  const page = (key: string, title: string, lines: string[]) => [
    "ALVITRA - CADERNO FINANCEIRO FICTÍCIO",
    `Documento integrante: ${key}`,
    `Título do documento: ${title}`,
    ...lines
  ];
  const statement = (period: string, values: number[], previous: boolean) => [
    `Balancete ${period}`,
    "Regime: caixa",
    "Plano de contas: sintético padronizado",
    "Responsável: Equipe sintética",
    "Conta bancária: conta-operacao-sintetica",
    "Conta do fundo de reserva: conta-reserva-sintetica",
    `Saldo inicial: ${money(5000000)}`,
    `Receitas: ${money(12000000)}`,
    `Despesas: ${money(values.reduce((a, b) => a + b, 0))}`,
    `Saldo final: ${money(17000000 - values.reduce((a, b) => a + b, 0) + (previous ? 0 : 150000))}`,
    `Saldo disponível: ${money(previous ? 600000 : 200000)}`,
    `Saldo bancário: ${money(5000000)}`,
    `Obrigações do próximo mês: ${money(500000)}`,
    `Inadimplência: ${money(previous ? 400000 : 800000)}`,
    `Fundo de reserva: ${money(500000)}`,
    `Uso do fundo de reserva: ${money(previous ? 0 : 50000)}`,
    ...rubrics.map((r, i) => `${r}: ${money(values[i]!)}`),
    "Escopo: mensal",
    "Observação: a relação de comprovantes não certifica execução ou pagamento."
  ];
  const pages: string[][] = [
    page("BAL-OUT", "Balancete 10/2026", statement("10/2026", oct, false)),
    page("BAL-SET", "Balancete 09/2026", statement("09/2026", sep, true)),
    page("BANCO-OUT", "Extrato bancário 10/2026", [
      "Extrato bancário 10/2026",
      "Conta bancária: conta-operacao-sintetica",
      `Saldo final: ${money(4900000)}`,
      "Posição: encerramento mensal. Lançamentos pendentes exigem conciliação."
    ]),
    page("OBR-NOV", "Relação de obrigações 11/2026", [
      "Relação de obrigações 11/2026",
      "Abrangência: completa",
      `Obrigações do próximo mês: ${money(500000)}`,
      `Obrigação - Limpeza vencimento 05/11/2026: ${money(300000)}`,
      `Obrigação - Seguro vencimento 10/11/2026: ${money(200000)}`
    ]),
    page("ORC-SET", "Orçamento mensal 09/2026", [
      "Orçamento mensal 09/2026",
      `Despesas previstas: ${money(sep.reduce((a, b) => a + b, 0))}`,
      "Escopo: mensal"
    ]),
    page("RES-OUT", "Extrato bancário reserva 10/2026", [
      "Extrato bancário 10/2026",
      "Finalidade: fundo de reserva",
      "Conta bancária: conta-reserva-sintetica",
      `Saldo final: ${money(500000)}`
    ]),
    ...ledger.map((voucher) =>
      page(
        voucher.id,
        `${voucher.cancelled ? "Memorial de cancelamento" : "Nota fiscal"} ${voucher.id}`,
        [
          `${voucher.cancelled ? "Memorial de cancelamento" : "Nota fiscal"} ${voucher.period}`,
          `Identificador do comprovante: ${voucher.id}`,
          `Lançamento: ${voucher.rubric}`,
          `Valor: ${money(voucher.total)}`,
          ...voucher.items.map(
            (amount, index) =>
              `Item ${String(index + 1).padStart(2, "0")} serviço: ${money(amount + (index === 0 ? voucher.itemError : 0))}`
          ),
          voucher.cancelled
            ? "Situação: cancelado. Este memorial não substitui nota fiscal válida."
            : "Situação: documento fictício emitido; pagamento não certificado.",
          "Emitente: fornecedor sintético. Não há dados pessoais ou fiscais reais."
        ]
      )
    ),
    page("ORC-OUT", "Orçamento mensal 10/2026", [
      "Orçamento mensal 10/2026",
      `Despesas previstas: ${money(expense - 250000)}`,
      "Escopo: mensal",
      "Este limite se refere ao orçamento financeiro fictício, não a quota operacional do produto."
    ])
  ];
  if (pages.length !== 300) throw new Error("Corpus diferente de 300 páginas.");
  return {
    corpusVersion,
    title: "FICTÍCIO - Caderno financeiro de setembro e outubro de 2026",
    pages: pages.map((lines, index) => ({ page: index + 1, lines, text: lines.join("\n") }))
  };
}
