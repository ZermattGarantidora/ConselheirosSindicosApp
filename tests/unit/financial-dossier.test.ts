import { expect, it } from "vitest";
import { analyzeFinancialDossier, formatMinor } from "../../apps/api/analysis/financial-dossier.js";
import { managerContext, bosque } from "./answer-fixtures.js";
import { financialDocument } from "../fixtures/financial-dossier.js";
import { createLedger } from "../../evals/financial-dossier/corpus.js";
import { buildOracle } from "../../evals/financial-dossier/oracle.js";
import { verifyAgainstOracle } from "../../evals/financial-dossier/verify.js";
it("AC-7349/50: calcula todas as páginas e itens, confronta gabarito anterior e preserva fontes originais", () => {
  const doc = financialDocument(),
    before = JSON.stringify(doc),
    gold = buildOracle(createLedger());
  const actual = analyzeFinancialDossier(managerContext, [doc], "BAL-OUT");
  const support = actual.report.financialReview!.checks.find((c) => c.id === "support")!;
  expect(support.detail).toContain(
    "Manutenção (R$ 9.688,75): suporte parcial de R$ 9.382,80; faltam R$ 305,95 de comprovação"
  );
  expect(support.missingDocuments.join(" ")).toContain("parcela de R$ 305,95");
  expect(verifyAgainstOracle(actual, gold)).toMatchObject({
    passed: true,
    pages: 300,
    invoiceItems: 8790,
    monetaryEntries: 9126,
    checksMatched: 10
  });
  expect(JSON.stringify(doc)).toBe(before);
  for (const c of actual.report.financialReview!.checks.flatMap((c) => c.citations)) {
    expect(c.documentId).toBe(doc.documentId);
    expect(c.documentVersionId).toBe(doc.documentVersionId);
    expect(
      Array.from(doc.pages[c.page - 1]!.extractedText)
        .slice(c.startOffset!, c.endOffset!)
        .join("")
    ).toBe(c.excerpt);
  }
  expect(formatMinor(-1001n)).toBe("-R$ 10,01");
});
it.each([
  "tenant",
  "missing",
  "quality",
  "heading",
  "duplicate",
  "title",
  "current",
  "limit",
  "total"
])("AC-7351: recusa caderno incompleto/conflitante antes da redação: %s", (kind) => {
  const source = financialDocument();
  let doc = { ...source, pages: source.pages.map((p) => ({ ...p })) };
  let current = "BAL-OUT";
  if (kind === "tenant") doc = { ...doc, condominiumId: bosque };
  if (kind === "missing") doc.pages.splice(199, 1);
  if (kind === "quality") doc.pages[299]!.qualityScore = 0.1;
  if (kind === "heading")
    doc.pages[0]!.extractedText = doc.pages[0]!.extractedText.replace(
      "Documento integrante:",
      "Sem identificação:"
    );
  if (kind === "duplicate") doc.pages[0]!.extractedText += "\nDocumento integrante: OUTRO";
  if (kind === "title")
    doc.pages[0]!.extractedText = doc.pages[0]!.extractedText.replace(
      "Título do documento:",
      "Sem título:"
    );
  if (kind === "current") current = "desconhecido";
  if (kind === "limit") doc.pages.push(...doc.pages);
  if (kind === "total")
    doc.pages[6]!.extractedText = doc.pages[6]!.extractedText.replace("Valor:", "Sem total:");
  expect(() => analyzeFinancialDossier(managerContext, [doc], current)).toThrow();
});
it("gabarito detecta omissão e não é derivado do resultado avaliado", () => {
  const actual = analyzeFinancialDossier(managerContext, [financialDocument()], "BAL-OUT"),
    gold = buildOracle(createLedger());
  actual.report.financialReview!.checks.find((c) => c.id === "bank")!.status = "ok";
  expect(() => verifyAgainstOracle(actual, gold)).toThrow();
});
