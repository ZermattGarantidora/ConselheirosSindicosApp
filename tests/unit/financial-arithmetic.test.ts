import { describe, expect, it } from "vitest";
import { financialArithmetic } from "../../apps/api/answers/financial-arithmetic.js";
import type { GeneratedCitation } from "../../apps/api/answers/answer-contract.js";

describe("AC-5619 — cálculo financeiro determinístico", () => {
  const statement = (month: string, year = 2028, version = month): GeneratedCitation => ({
    evidenceId: version,
    documentId: version,
    documentVersionId: version,
    title: "Balancete FICTÍCIO",
    page: 1,
    excerpt: `${month} de ${year}\nValores em reais.\nSaldo anterior Entradas Saídas Resultado do mês Saldo final\n1.000,00 900,00 450,00 450,00 1.450,00`
  });
  it("recusa trocar rubrica ou ano mesmo se os números existem nas fontes", () => {
    const report =
      "| Mês | Entradas | Saídas | Resultado |\n|---|---:|---:|---:|\n| Setembro de 2028 | R$ 900,00 | R$ 450,00 | R$ 450,00 |";
    const sources = [statement("Setembro")];
    expect(financialArithmetic([report], [90000, 45000], sources).invalid).toBe(false);
    expect(
      financialArithmetic(
        [report.replace("R$ 900,00 | R$ 450,00", "R$ 450,00 | R$ 900,00")],
        [90000, 45000],
        sources
      ).invalid
    ).toBe(true);
    expect(
      financialArithmetic([report.replace("2028", "2029")], [90000, 45000], sources).invalid
    ).toBe(true);
  });
  it("não escolhe silenciosamente duas versões do mesmo fechamento nem assume resumo inválido", () => {
    const report = "| Mês | Entradas |\n|---|---:|\n| Setembro | R$ 900,00 |";
    const first = statement("Setembro");
    for (const other of [
      { ...first, documentVersionId: "other" },
      { ...first, excerpt: first.excerpt.replace("900,00 450,00 450,00", "800,00 350,00 450,00") }
    ])
      expect(financialArithmetic([report], [90000, 45000], [first, other]).computed.size).toBe(0);
    expect(
      financialArithmetic([report], [90000], [{ ...first, sourceScope: "legislation" }]).computed
        .size
    ).toBe(0);
    expect(
      financialArithmetic(
        [report],
        [90000],
        [{ ...first, excerpt: first.excerpt.replace("1.450,00", "1.451,00") }]
      ).computed.size
    ).toBe(0);
  });
  it("confere soma, diferença, igualdade inversa e cadeia de valores derivados em centavos", () => {
    const result = financialArithmetic(
      [
        "R$ 900,00 + R$ 45,00 + R$ 26,46 = R$ 971,46.\nR$ 971,46 = R$ 945,00 + R$ 26,46.\nR$ 1.000,00 − R$ 971,46 = R$ 28,54."
      ],
      [90000, 4500, 2646, 94500, 100000]
    );
    expect(result.invalid).toBe(false);
    expect([...result.computed]).toEqual(expect.arrayContaining([97146, 2854]));
  });
  it.each([
    "R$ 900,00 + R$ 45,00 = R$ 900,00 = R$ 900,00.",
    "R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 + R$ 1,00 = R$ 8,00.",
    "R$ 900,00 + R$ 45,00 = R$ 900,00.",
    "R$ 900,00 − R$ 45,00 = R$ 945,00.",
    "R$ 900,00 = R$ 945,00.",
    "R$ 9.007.199.254.740.993,00 + R$ 1,00 = R$ 9.007.199.254.740.994,00."
  ])("recusa igualdade incorreta ou insegura mesmo com operandos literais: %s", (text) => {
    expect(financialArithmetic([text], [90000, 4500, 94500]).invalid).toBe(true);
  });
  it("não confirma resultado com operando ausente nem equação autorreferente", () => {
    expect(financialArithmetic(["R$ 900,00 + R$ 45,00 = R$ 945,00."], [90000]).computed.size).toBe(
      0
    );
    expect(financialArithmetic(["R$ 945,00 = R$ 945,00."], []).computed.size).toBe(0);
    expect(
      financialArithmetic(
        ["R$ 945,00 + R$ 45,00 = R$ 990,00. R$ 990,00 − R$ 45,00 = R$ 945,00."],
        [4500]
      ).computed.size
    ).toBe(0);
  });
  const water =
    "| Mês de 2028 | Valor pago | Diferença mensal | Variação |\n|---|---:|---:|---:|\n| Setembro | R$ 1.800,00 | — | — |\n| Outubro | R$ 3.150,00 | +R$ 1.350,00 | +75% |\n| Novembro | R$ 1.850,00 | −R$ 1.300,00 | −41,27% |";
  it("confere diferença por coluna e mês, incluindo o acumulado entre as pontas", () => {
    const result = financialArithmetic([water], [180000, 315000, 185000]);
    expect(result.invalid).toBe(false);
    expect([...result.computed]).toEqual(expect.arrayContaining([135000, 130000, 5000]));
  });
  it("recusa sinal/diferença errados e não carrega cabeçalho para outra tabela", () => {
    expect(
      financialArithmetic([water.replace("−R$ 1.300,00", "+R$ 1.300,00")], [180000, 315000, 185000])
        .invalid
    ).toBe(true);
    expect(
      financialArithmetic([water.replace("| Outubro |", "\n| Outubro |")], [180000, 315000, 185000])
        .computed.size
    ).toBe(0);
  });
  const table =
    "| Mês | Rendimentos financeiros |\n|---|---:|\n| Setembro | R$ 157,50 |\n| Outubro | R$ 168,10 |\n| Novembro | R$ 167,10 |\n| **Total** | **R$ 492,70** |";
  it("confere total pela mesma coluna em três meses consecutivos", () => {
    expect(financialArithmetic([table], [15750, 16810, 16710]).computed.has(49270)).toBe(true);
    expect(
      financialArithmetic([table.replace("492,70", "493,70")], [15750, 16810, 16710]).invalid
    ).toBe(true);
    expect(
      financialArithmetic([table.replace("Setembro", "Julho")], [15750, 16810, 16710]).computed.size
    ).toBe(0);
    expect(
      financialArithmetic(
        [table.replace("Rendimentos financeiros", "Saldo livre")],
        [15750, 16810, 16710]
      ).computed.size
    ).toBe(0);
  });
});
