import assert from "node:assert/strict";
import type { analyzeFinancialDossier } from "../../apps/api/analysis/financial-dossier.js";
import type { buildOracle } from "./oracle.js";
import { money } from "./corpus.js";
export function verifyAgainstOracle(
  actual: ReturnType<typeof analyzeFinancialDossier>,
  gold: ReturnType<typeof buildOracle>
) {
  const checks = actual.report.financialReview!.checks;
  const byId = (id: string) => checks.find((c) => c.id === id)!;
  assert.equal(actual.inventory.length, gold.pages);
  assert.equal(new Set(actual.inventory.map((p) => p.page)).size, 300);
  assert.equal(actual.logicalDocuments, 300);
  assert.equal(actual.voucherAudit.length, gold.invoices);
  assert.equal(actual.entryCount, gold.monetaryEntries);
  assert.equal(
    actual.voucherAudit.reduce((n, v) => n + v.itemCount, 0),
    gold.itemLines
  );
  for (const expected of gold.documents) {
    const found = actual.voucherAudit.find((v) => v.key === expected.key);
    assert.ok(found, `Documento não conferido: ${expected.key}`);
    assert.equal(found.page, expected.page);
    assert.equal(found.itemCount, expected.itemCount);
    assert.equal(found.declaredMinor, String(expected.declaredMinor));
    assert.equal(found.itemSumMinor, String(expected.itemSumMinor));
  }
  assert.equal(actual.voucherAudit.filter((a) => !a.matches).length, 1);
  const mismatch = actual.voucherAudit.find((a) => !a.matches)!;
  assert.equal(mismatch.page, gold.itemMismatch.page);
  assert.equal(mismatch.declaredMinor, String(gold.itemMismatch.declaredMinor));
  assert.equal(mismatch.itemSumMinor, String(gold.itemMismatch.itemSumMinor));
  for (const [id, status] of Object.entries(gold.status)) assert.equal(byId(id).status, status, id);
  for (const [id, values] of [
    [
      "closing",
      [
        gold.currentExpenseMinor,
        gold.calculatedClosingMinor,
        gold.declaredClosingMinor,
        gold.closingDifferenceMinor
      ]
    ],
    ["bank", [gold.bankDifferenceMinor]],
    ["budget", [gold.budgetOverrunMinor]],
    ["arrears", [gold.arrearsIncreaseMinor]],
    ["reserve", [gold.reserveBalanceMinor, gold.reserveUseMinor]],
    ["commitments", [gold.commitmentsMinor]],
    ["history", [gold.previousExpenseMinor!, gold.currentExpenseMinor]],
    ["support", [gold.itemMismatch.declaredMinor, gold.itemMismatch.itemSumMinor]]
  ] as const)
    for (const value of values)
      assert.ok(byId(id).detail.includes(money(value)), `${id}: falta ${money(value)}`);
  assert.ok(byId("support").missingDocuments.some((s) => s.includes(gold.unsupported.rubric)));
  assert.ok(byId("budget").citations.some((c) => c.page === 300));
  assert.ok(byId("support").citations.some((c) => c.page === gold.itemMismatch.page));
  for (const forbidden of gold.mustNotConclude)
    assert.ok(!JSON.stringify(actual.report).toLowerCase().includes(forbidden));
  return {
    passed: true,
    pages: 300,
    monetaryEntries: actual.entryCount,
    invoiceItems: gold.itemLines,
    checksMatched: checks.length,
    citations: checks.reduce((n, c) => n + c.citations.length, 0),
    oracleVersion: gold.version,
    healthyControls: ["commitments", "transparency"]
  };
}
