import { createHash } from "node:crypto";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import type { DenseCase } from "./oracle.js";
import type { DensePrepared } from "./replay.js";
import type { DenseRecord } from "./corpus.js";
import { assessDenseAnswer } from "./assessment.js";
import type {
  IntegralSumReceipt,
  IntegralSumSummary
} from "../../apps/api/analysis/integral-document-sum.js";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f\s]/gu, "")
    .toLowerCase()
    .replaceAll("executada", "executado");
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function assessDenseV2(
  testCase: DenseCase,
  response: PublicAnswer | null,
  evidence: readonly RetrievalEvidence[],
  documents: readonly DensePrepared[],
  ledger: readonly DenseRecord[],
  mechanicalErrors: readonly string[],
  computation?: IntegralSumSummary,
  rawReceipt?: unknown
) {
  const strict = assessDenseAnswer(testCase, response, evidence, documents, mechanicalErrors);
  const sourceCoverage = testCase.sources.map((source) => {
    const doc = documents.find((d) => d.kind === source.document)!;
    const pages = source.equivalentPages ?? [source.page];
    return {
      ...source,
      retrieved: evidence.some(
        (e) =>
          e.documentVersionId === doc.documentVersionId &&
          pages.includes(e.pageNumber) &&
          norm(e.content).includes(norm(source.anchor))
      ),
      cited:
        response?.citations.some(
          (c) =>
            c.documentVersionId === doc.documentVersionId &&
            pages.includes(c.page) &&
            norm(c.excerpt).includes(norm(source.anchor))
        ) ?? false
    };
  });
  let integralProofValid = false;
  if (testCase.category === "global_coverage" && computation && typeof rawReceipt === "string") {
    try {
      const receipt = JSON.parse(rawReceipt) as IntegralSumReceipt;
      const doc = documents.find((d) => d.kind === "financial")!;
      const expected = ledger.filter(
        (r) => r.document === "financial" && r.index > 600 && r.status === "pago"
      );
      const expectedTotal = expected.reduce((n, r) => n + BigInt(r.amountMinor), 0n);
      integralProofValid =
        receipt.version === "integral-sum-v1" &&
        receipt.condominiumId === "alameda" &&
        receipt.documentVersionId === doc.documentVersionId &&
        receipt.period === "2026-10" &&
        receipt.totalMinor === String(expectedTotal) &&
        receipt.included.length === expected.length &&
        new Set(receipt.included.map((r) => r.id)).size === expected.length &&
        expected.every((row) =>
          receipt.included.some(
            (r) =>
              r.id === row.key && r.amountMinor === String(row.amountMinor) && r.page === row.page
          )
        ) &&
        receipt.pages.length === doc.pages.length &&
        receipt.pages.every(
          (p, i) => p.page === i + 1 && p.sha256 === hash(doc.pages[i]!.extractedText)
        ) &&
        computation.receiptSha256 === hash(receipt) &&
        computation.totalMinor === String(expectedTotal) &&
        norm(response?.answer ?? "").includes(norm(computation.total)) &&
        response?.answerMode === "grounded" &&
        !!response.citations.length;
    } catch {
      integralProofValid = false;
    }
  }
  const facts = testCase.atoms.map((atom) => ({
    atom,
    present: norm(response?.answer ?? "").includes(norm(atom).replace(/^r\$/u, ""))
  }));
  const evidenceComplete =
    testCase.category === "global_coverage"
      ? integralProofValid
      : sourceCoverage.every((s) => s.retrieved && s.cited);
  return {
    revision: "dense-assessment-v2",
    strict,
    sourceCoverage,
    facts,
    integralProofValid,
    automaticCoverageComplete:
      !!response &&
      response.answerMode !== "failed" &&
      mechanicalErrors.length === 0 &&
      facts.every((f) => f.present) &&
      strict.qualification &&
      evidenceComplete,
    semanticApproved: null,
    technicalReview: "pending"
  };
}
