import { createSyntheticPdf } from "./synthetic-pdfs.js";

/** Documento criado do zero: valores, identificação e lançamentos inteiramente fictícios. */
export const financialTableStatementPages = [
  [
    "FICTÍCIO — GERADO POR IA — SOMENTE TESTE",
    "Balancete financeiro mensal",
    "Residencial Alameda",
    "Abril de 2028",
    "Regime de caixa. Valores em reais.",
    "Resumo da movimentação",
    "Saldo anterior Entradas Saídas Resultado do mês Saldo final",
    "8.000,00 17.380,25 15.640,75 1.739,50 9.739,50",
    "Receitas recebidas",
    "Contribuições fictícias 17.380,25",
    "Total de entradas 17.380,25",
    "Despesas pagas por grupo",
    "Serviços fictícios 12.640,75",
    "Manutenção fictícia 3.000,00",
    "Total de saídas 15.640,75"
  ].join("\n"),
  [
    "FICTÍCIO — GERADO POR IA — SOMENTE TESTE",
    "Movimentação detalhada de abril de 2028",
    "Data Ref. Histórico Conta Entrada Saída",
    "05/04 FIC-01 Contribuições fictícias OP 17.380,25 0,00",
    "08/04 FIC-02 Serviços fictícios OP 0,00 12.640,75",
    "18/04 FIC-03 Manutenção fictícia OP 0,00 3.000,00",
    "Total de movimentação OP 17.380,25 15.640,75"
  ].join("\n"),
  [
    "FICTÍCIO — GERADO POR IA — SOMENTE TESTE",
    "Composição das disponibilidades de abril de 2028",
    "Conta Saldo anterior Entradas Saídas Saldo final",
    "Operacional 8.000,00 17.380,25 15.640,75 9.739,50",
    "Observações",
    "A disponibilidade depende da conciliação com extratos e da identificação de recursos vinculados.",
    "Este demonstrativo fictício não comprova aprovação de contas."
  ].join("\n")
];

export function createFinancialTableStatementPdf(): Buffer {
  return createSyntheticPdf(financialTableStatementPages, {
    pageWidth: 595,
    fontSize: 10,
    multiline: true
  });
}
