import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createFullPageDocumentCorpus } from "../fixtures/full-page-documents.js";
import {
  assessPageAnswer,
  conditions,
  pageEvalCases
} from "../../evals/full-page-documents/protocol.js";
import { prepareDocument, replayPage } from "../../evals/full-page-documents/replay.js";
import { readCheckpoint, writeCheckpoint } from "../../evals/full-page-documents/checkpoints.js";
import { createEvidence } from "./answer-fixtures.js";

const point = pageEvalCases()[0]!;
const content = point.expected.statements.join(" ");
const evidence = [createEvidence({ pageNumber: point.page, content })];
function answer(): PublicAnswer {
  return {
    answer: `${content} Pendências: ${point.expected.pending.join("; ")}. O recebimento não equivale a aprovação técnica e não autoriza encerrar as pendências.`,
    answerMode: "grounded",
    citations: [
      {
        id: "citation-1",
        evidenceId: "chunk-1",
        documentId: "document-1",
        documentVersionId: "version-1",
        title: "Fonte fictícia",
        page: point.page,
        excerpt: content,
        startOffset: 0,
        endOffset: content.length
      }
    ],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null },
    answerId: "answer-1",
    questionId: "question-1",
    condominiumId: evidence[0]!.condominiumId,
    riskClass: "low",
    createdAt: "2026-11-03T12:00:00.000Z"
  };
}
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith("alvitra-eval-checkpoint-")
    )
      throw new Error("Temporário inesperado.");
    await rm(directory, { recursive: true, force: true });
  }
});

describe("AC-6301–6305: harness dos evals de PDFs preenchidos", () => {
  it("fixa 35 documentos / 80 páginas e a dupla Luna high / Sol 6.1 low", () => {
    const points = pageEvalCases();
    expect(points).toHaveLength(80);
    expect(new Set(points.map((item) => item.documentId)).size).toBe(35);
    expect(
      [1, 2, 8].map((count) => points.filter((item) => item.pageCount === count).length)
    ).toEqual([20, 20, 40]);
    expect(conditions.map((item) => [item.model, item.reasoningEffort, item.memory])).toEqual([
      ["gpt-6-luna", "high", false],
      ["gpt-6.1-sol", "low", false]
    ]);
  });

  it("o modo padrão mostra o plano sem gateway habilitado ou inferência", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/run-tsx.mjs", "evals/full-page-documents/run.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, CODEX_ANSWER_ENABLED: "false" },
        encoding: "utf8",
        windowsHide: true
      }
    );
    expect(JSON.parse(output)).toMatchObject({
      execution: "plan_only",
      providerCalls: 0,
      documents: 35,
      questionsPerModel: 80,
      expectedResponses: 160,
      semanticApproved: null
    });
  }, 15_000);

  it("checks completos continuam sem aprovação semântica automática", () => {
    expect(assessPageAnswer(point, answer(), evidence, [])).toMatchObject({
      outcome: "automatic_complete",
      technicalReview: null,
      semanticApproved: null
    });
  });

  it.each(["time", "capacity", "date"] as const)("detecta valor incorreto em %s", (field) => {
    const value = answer();
    const changed = {
      ...value,
      answer: value.answer.replace(point.expected[field], "VALOR INCORRETO")
    };
    const grade = assessPageAnswer(point, changed, evidence, []);
    expect(grade.facts[field]).toBe(false);
    expect(grade.outcome).toBe("automatic_partial");
  });

  it("não aprova pendência omitida, fonte inválida ou fato ausente no contexto", () => {
    const value = answer();
    expect(
      assessPageAnswer(
        point,
        { ...value, answer: value.answer.replace(point.expected.pending[0]!, "item omitido") },
        evidence,
        []
      ).outcome
    ).toBe("automatic_partial");
    expect(assessPageAnswer(point, value, evidence, ["invalid_citation"]).outcome).toBe(
      "automatic_partial"
    );
    const missing = assessPageAnswer(point, value, [], []);
    expect(missing.outcome).toBe("automatic_partial");
    expect(missing.sourceCoverage.every((source) => !source.present)).toBe(true);
    expect(assessPageAnswer(point, { ...value, citations: [] }, evidence, []).outcome).toBe(
      "automatic_partial"
    );
  });

  it("preserva falha e aceita data por extenso sem trocar o gabarito", () => {
    const value = answer();
    expect(assessPageAnswer(point, null, evidence, []).outcome).toBe("failed");
    expect(assessPageAnswer(point, { ...value, answerMode: "failed" }, evidence, []).outcome).toBe(
      "failed"
    );
    expect(
      assessPageAnswer(
        point,
        { ...value, answer: value.answer.replace("03/11/2026", "3 de novembro de 2026") },
        evidence,
        []
      ).facts.date
    ).toBe(true);
  });

  it("aceita horário e data equivalentes na redação brasileira", () => {
    const value = answer();
    const changed = {
      ...value,
      answer: value.answer
        .replace("8:15", "08h15")
        .replace("03/11/2026", "3/11/2026")
        .replace("26 participantes", "26 (vinte e seis) participantes")
    };
    expect(assessPageAnswer(point, changed, evidence, []).outcome).toBe("automatic_complete");
  });

  it("checkpoint íntegro conserva o resultado e rejeita substituição ou adulteração", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-eval-checkpoint-"));
    directories.push(directory);
    const path = join(directory, "result.json");
    await writeCheckpoint(path, { outcome: "failed" });
    expect(await readCheckpoint(path)).toEqual({ outcome: "failed" });
    await expect(writeCheckpoint(path, { outcome: "passed" })).rejects.toThrow(
      "não pode ser substituído"
    );
    const text = await readFile(path, "utf8");
    await writeFile(path, text.replace('"failed"', '"passed"'));
    await expect(readCheckpoint(path)).rejects.toThrow("adulterado");
  });

  it("extrai o PDF real e consulta o endpoint com gateway falso sem enviar o gabarito", async () => {
    const prepared = await prepareDocument(createFullPageDocumentCorpus()[0]!);
    const result = await replayPage(point, prepared, createLocalSyntheticAnswerGateway());
    expect(result.statusCode).toBe(200);
    expect(result.gatewayCalls.length).toBeGreaterThan(0);
    expect(result.gatewayCalls[0]!.input.question).toBe(point.question);
    expect(
      result.gatewayCalls[0]!.input.evidence.every(
        (source) => source.documentVersionId === prepared.documentVersionId
      )
    ).toBe(true);
    expect(JSON.stringify(result.gatewayCalls[0]!.input)).not.toContain('"expected":');
    expect(result.assessment.mechanicalErrors).toEqual([]);
    expect(result.assessment.semanticApproved).toBeNull();
  }, 15_000);
});
