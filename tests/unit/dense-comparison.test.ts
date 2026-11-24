import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createDenseLedger } from "../../evals/dense-documents/corpus.js";
import { createDenseCasesV2, createVariedCorpus } from "../../evals/dense-documents/varied.js";
import { scannedCases, scannedSource } from "../../evals/dense-documents/scan-fixture.js";
import { assessDenseV2 } from "../../evals/dense-documents/assessment-v2.js";
import { scanTextCoverage, renderScannedFixture } from "../../evals/dense-documents/scan.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { writeCheckpoint } from "../../evals/full-page-documents/checkpoints.js";
import { renderFullPagePdf } from "../fixtures/full-page-documents.js";
import { createEvidence } from "./answer-fixtures.js";
import type { DensePrepared } from "../../evals/dense-documents/replay.js";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
describe("Spec 076 — comparação densa", () => {
  it("AC7607: cache visual por identidade evita reprocessamento e recusa artefato alterado", async () => {
    const folder = await mkdtemp(join(tmpdir(), "alvitra-scan-cache-"));
    try {
      const native = renderFullPagePdf(scannedSource()),
        hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
      const entries = [
        { name: "scan-source.pdf", bytes: native },
        ...["scan-page-1.png", "scan-page-2.png", "regulamento-digitalizado.pdf"].map((name) => ({
          name,
          bytes: Buffer.from("FIXTURE SINTETICA PARA INTEGRIDADE, NAO E PROVA DE OCR")
        }))
      ];
      for (const e of entries) await writeFile(join(folder, e.name), e.bytes);
      await writeCheckpoint(join(folder, "scan-artifacts.json"), {
        sourceSha256: hash(native),
        files: entries.map((e) => ({ name: e.name, sha256: hash(e.bytes) }))
      });
      expect(
        (await renderScannedFixture(folder, "python-nao-deve-ser-invocado")).images
      ).toHaveLength(2);
      await writeFile(join(folder, "scan-page-1.png"), "alterado");
      await expect(renderScannedFixture(folder, "python-nao-deve-ser-invocado")).rejects.toThrow(
        "Artefato visual alterado"
      );
    } finally {
      if (
        dirname(resolve(folder)) === resolve(tmpdir()) &&
        basename(folder).startsWith("alvitra-scan-cache-")
      )
        await rm(folder, { recursive: true, force: true });
    }
  });
  it("AC7605/7607: 60 casos, documentos narrativos preenchidos e origem visual independente", () => {
    const cases = [...createDenseCasesV2(createDenseLedger()), ...scannedCases()];
    expect(cases).toHaveLength(60);
    expect(new Set(cases.map((c) => c.id)).size).toBe(60);
    const pages = createVariedCorpus().flatMap((d) => d.document.pages);
    expect(pages).toHaveLength(12);
    expect(new Set(pages.map((p) => p.expectedText)).size).toBe(12);
    for (const page of pages) {
      expect(page.lines.length).toBeGreaterThanOrEqual(50);
      expect(page.lines.length).toBeLessThanOrEqual(70);
    }
    expect(scannedSource().pages).toHaveLength(2);
    expect(scanTextCoverage("ID 63 pessoas 21h", "ID 63 pessoas 21h")).toEqual({
      recall: 1,
      precision: 1
    });
    expect(scanTextCoverage("ID 63 pessoas 21h", "ID pessoas").recall).toBe(0.5);
  });
  it("AC7605: equivalência lexical não substitui fonte e declaração repetida tem páginas explícitas", () => {
    const cases = createDenseCasesV2(createDenseLedger()),
      testCase = cases[25]!;
    const docs = testCase.sources.map((s) => ({
      kind: s.document,
      documentVersionId: s.document
    })) as unknown as DensePrepared[];
    const evidence = testCase.sources.map((s, i) =>
      createEvidence({
        id: `e${i}`,
        documentVersionId: s.document,
        pageNumber: s.page,
        content: s.anchor
      })
    );
    const response = {
      answer: testCase.expected.replace("executado", "executada"),
      answerMode: "grounded",
      citations: evidence.map((e) => ({
        evidenceId: e.id,
        documentVersionId: e.documentVersionId,
        page: e.pageNumber,
        excerpt: e.content
      }))
    } as unknown as PublicAnswer;
    const grade = assessDenseV2(testCase, response, evidence, docs, createDenseLedger(), []);
    expect(grade.strict.automaticCoverageComplete).toBe(false);
    expect(grade.automaticCoverageComplete).toBe(true);
    expect(grade.semanticApproved).toBeNull();
    expect(
      assessDenseV2(
        testCase,
        { ...response, citations: [] },
        evidence,
        docs,
        createDenseLedger(),
        []
      ).automaticCoverageComplete
    ).toBe(false);
    const absence = cases[28]!,
      source = createEvidence({
        documentVersionId: "draft",
        pageNumber: 4,
        content: "Esta versao e minuta sem assinatura nem ata de aprovacao."
      });
    const negative = {
      answer: "Nao consta assinatura ou ata de aprovacao.",
      answerMode: "grounded",
      citations: [{ documentVersionId: "draft", page: 4, excerpt: source.content }]
    } as unknown as PublicAnswer;
    expect(
      assessDenseV2(
        absence,
        negative,
        [source],
        [{ kind: "draft", documentVersionId: "draft" }] as unknown as DensePrepared[],
        createDenseLedger(),
        []
      ).automaticCoverageComplete
    ).toBe(true);
  });
  it("AC7606: plano não infere e usa esforços do runtime em condições iguais", async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["scripts/run-tsx.mjs", "evals/dense-documents/compare.ts"],
      { windowsHide: true, timeout: 30000 }
    );
    const plan = JSON.parse(stdout);
    expect(plan).toMatchObject({
      caseCount: 60,
      providerCalls: 0,
      mode: "plan_only",
      concurrency: 2
    });
    expect(plan.conditions.map((c: { memory: boolean }) => c.memory)).toEqual([false, false]);
    expect(plan.conditions[1]).toMatchObject({ routing: "hybrid", runtimeEfforts: true });
  }, 35000);
});
