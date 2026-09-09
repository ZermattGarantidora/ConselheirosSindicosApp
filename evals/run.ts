import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createApi } from "../apps/api/app/create-api.js";
import type { PublicAnswer } from "../apps/api/answers/answer-contract.js";
import type { AnswerGateway } from "../apps/api/answers/answer-gateway.js";
import { createLocalSyntheticAnswerGateway } from "../apps/api/answers/answer-gateway.js";
import { createAnswerUseCase, type AnswerRetriever } from "../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../apps/api/answers/in-memory-answer-persistence.js";
import { createDevelopmentIdentityRepository } from "../apps/api/identity/development-identity-repository.js";
import { createInMemoryScopedRetrievalIndex } from "../apps/api/retrieval/in-memory-scoped-retrieval.js";
import { createScopedTextRetriever } from "../apps/api/retrieval/text-retrieval.js";
import type { ScopedRetrievalResult } from "../apps/api/retrieval/retrieval-contract.js";
import { evaluationCases, type EvaluationCase } from "./datasets/consulta-documental.js";
import {
  createSyntheticMemberships,
  createSyntheticRetrievableChunks,
  syntheticUserId
} from "./fixtures/synthetic-corpus.js";

type Harness = Readonly<{
  app: ReturnType<typeof createApi>;
  persistence: ReturnType<typeof createInMemoryAnswerPersistence>;
  gatewayCalls: () => number;
}>;

type CaseResult = Readonly<{
  id: string;
  priority: "P0" | "P1";
  passed: boolean;
  failure: string | null;
  answerMode: string | null;
}>;

type Baseline = Readonly<{
  schemaVersion: number;
  suite: string;
  caseCount: number;
  p0CaseCount: number;
  p1CaseCount: number;
  thresholds: Readonly<{
    maxP0Failures: number;
    minimumP1PassRate: number;
    maxCaseCountDelta: number;
  }>;
}>;

const evaluationNow = () => new Date("2026-09-01T00:00:00.000Z");

function createCountingGateway(): Readonly<{ gateway: AnswerGateway; calls: () => number }> {
  const delegate = createLocalSyntheticAnswerGateway(() => 100);
  let callCount = 0;
  return Object.freeze({
    gateway: {
      async generate(input) {
        callCount += 1;
        return delegate.generate(input);
      }
    },
    calls: () => callCount
  });
}

function createHarness(systemState: EvaluationCase["systemState"] = undefined): Harness {
  const persistence = createInMemoryAnswerPersistence(randomUUID, evaluationNow);
  const counted = createCountingGateway();
  const retriever: AnswerRetriever =
    systemState?.retrieval === "unavailable"
      ? {
          async search(): Promise<ScopedRetrievalResult> {
            throw new Error("retrieval unavailable");
          }
        }
      : createScopedTextRetriever(
          createInMemoryScopedRetrievalIndex(createSyntheticRetrievableChunks())
        );
  const answerUseCase = createAnswerUseCase({
    retriever,
    gateway: counted.gateway,
    persistence,
    now: evaluationNow
  });
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(createSyntheticMemberships()),
    answerUseCase,
    now: evaluationNow
  });
  return Object.freeze({ app, persistence, gatewayCalls: counted.calls });
}

async function loadBaseline(): Promise<Baseline> {
  const raw = await readFile(new URL("./baseline.json", import.meta.url), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("thresholds" in parsed)) {
    throw new Error("A baseline de eval não possui o formato esperado.");
  }
  const candidate = parsed as {
    schemaVersion?: unknown;
    suite?: unknown;
    caseCount?: unknown;
    p0CaseCount?: unknown;
    p1CaseCount?: unknown;
    thresholds?: {
      maxP0Failures?: unknown;
      minimumP1PassRate?: unknown;
      maxCaseCountDelta?: unknown;
    };
  };
  const thresholds = candidate.thresholds;
  if (
    typeof candidate.schemaVersion !== "number" ||
    typeof candidate.suite !== "string" ||
    typeof candidate.caseCount !== "number" ||
    typeof candidate.p0CaseCount !== "number" ||
    typeof candidate.p1CaseCount !== "number" ||
    thresholds === undefined ||
    typeof thresholds.maxP0Failures !== "number" ||
    typeof thresholds.minimumP1PassRate !== "number" ||
    typeof thresholds.maxCaseCountDelta !== "number"
  ) {
    throw new Error("A baseline de eval possui thresholds inválidos.");
  }
  return Object.freeze({
    schemaVersion: candidate.schemaVersion,
    suite: candidate.suite,
    caseCount: candidate.caseCount,
    p0CaseCount: candidate.p0CaseCount,
    p1CaseCount: candidate.p1CaseCount,
    thresholds: Object.freeze({
      maxP0Failures: thresholds.maxP0Failures,
      minimumP1PassRate: thresholds.minimumP1PassRate,
      maxCaseCountDelta: thresholds.maxCaseCountDelta
    })
  });
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function tokens(value: string): readonly string[] {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((token) => token.length > 2);
}

function containsSemantics(value: string, expected: string): boolean {
  const valueTokens = tokens(value);
  return tokens(expected).every((expectedToken) =>
    valueTokens.some(
      (valueToken) =>
        valueToken.startsWith(expectedToken.slice(0, 4)) ||
        expectedToken.startsWith(valueToken.slice(0, 4))
    )
  );
}

function negatedClaim(value: string, expected: string): boolean {
  if (!containsSemantics(value, expected)) {
    return false;
  }
  const normalizedValue = normalize(value);
  const normalizedExpected = normalize(expected);
  const occurrence = normalizedValue.indexOf(normalizedExpected);
  if (occurrence < 0) {
    return /\bnao\b|\bsem\b|\bnunca\b/u.test(normalizedValue);
  }
  return /\bnao\b|\bsem\b|\bnunca\b/u.test(
    normalizedValue.slice(Math.max(0, occurrence - 50), occurrence)
  );
}

function assertExpectedAnswer(
  body: PublicAnswer,
  testCase: EvaluationCase,
  beforeGatewayCalls: number,
  afterGatewayCalls: number
): void {
  const expected = testCase.expected;
  if (expected.answerMode !== undefined && body.answerMode !== expected.answerMode) {
    throw new Error(`answerMode esperado ${expected.answerMode}, recebido ${body.answerMode}`);
  }
  if (expected.modelMustNotBeCalled && beforeGatewayCalls !== afterGatewayCalls) {
    throw new Error("o gateway foi chamado em um caso que deveria ser bloqueado");
  }

  const serialized = JSON.stringify(body);
  for (const forbidden of expected.forbiddenText ?? []) {
    if (serialized.includes(forbidden)) {
      throw new Error(`texto proibido encontrado: ${forbidden}`);
    }
  }
  for (const forbiddenSource of expected.forbiddenSources ?? []) {
    if (serialized.includes(forbiddenSource)) {
      throw new Error(`fonte proibida encontrada: ${forbiddenSource}`);
    }
  }
  for (const semantic of expected.mustIncludeSemantics ?? []) {
    if (!containsSemantics(`${body.answer} ${body.suggestedNextStep ?? ""}`, semantic)) {
      throw new Error(`semântica obrigatória ausente: ${semantic}`);
    }
  }
  for (const forbiddenClaim of expected.mustNotClaim ?? []) {
    if (
      containsSemantics(body.answer, forbiddenClaim) &&
      !negatedClaim(body.answer, forbiddenClaim)
    ) {
      throw new Error(`afirmação proibida encontrada: ${forbiddenClaim}`);
    }
  }

  for (const expectedCitation of expected.citations ?? []) {
    if (
      !body.citations.some(
        (citation) =>
          citation.documentVersionId === expectedCitation.documentVersionId &&
          citation.page === expectedCitation.page
      )
    ) {
      throw new Error(
        `citação ausente: ${expectedCitation.documentVersionId}, página ${expectedCitation.page}`
      );
    }
  }
  if (expected.citationExcerptMustExist) {
    if (body.citations.some((citation) => citation.excerpt.trim().length === 0)) {
      throw new Error("citação sem trecho verificável");
    }
  }
  for (const source of expected.suggestedMissingSource ?? []) {
    if (!containsSemantics(`${body.answer} ${body.suggestedNextStep ?? ""}`, source)) {
      throw new Error(`fonte sugerida ausente: ${source}`);
    }
  }
  if (expected.specialist !== undefined) {
    if (body.specialist.required !== expected.specialist.required) {
      throw new Error("indicador de especialista divergente");
    }
    if (
      expected.specialist.required &&
      (body.specialist.type === null ||
        !expected.specialist.acceptedTypes.includes(body.specialist.type))
    ) {
      throw new Error("tipo de especialista divergente");
    }
  }
  for (const field of expected.schemaRequiredFields ?? []) {
    if (!(field in body)) {
      throw new Error(`campo obrigatório ausente: ${field}`);
    }
  }
}

async function runCase(
  testCase: EvaluationCase,
  harness: Harness,
  answers: Map<string, PublicAnswer>
): Promise<CaseResult> {
  const beforeGatewayCalls = harness.gatewayCalls();
  try {
    if (testCase.operation === "ask") {
      const actor = syntheticUserId(testCase.actor);
      const response = await harness.app.inject({
        method: "POST",
        url: `/v1/condominiums/${testCase.condominiumId}/questions`,
        headers: {
          "content-type": "application/json",
          "x-development-user-id": actor
        },
        payload: JSON.stringify({ question: testCase.input })
      });
      const afterGatewayCalls = harness.gatewayCalls();
      if (testCase.expected.operationResult === "forbidden") {
        if (response.statusCode !== 403) {
          throw new Error(`status HTTP esperado 403, recebido ${response.statusCode}`);
        }
        if (testCase.expected.modelMustNotBeCalled && beforeGatewayCalls !== afterGatewayCalls) {
          throw new Error("o gateway foi chamado após a negação de autorização");
        }
        return Object.freeze({
          id: testCase.id,
          priority: testCase.priority,
          passed: true,
          failure: null,
          answerMode: null
        });
      }
      if (response.statusCode !== 200) {
        throw new Error(`status HTTP esperado 200, recebido ${response.statusCode}`);
      }
      const body = response.json<PublicAnswer>();
      assertExpectedAnswer(body, testCase, beforeGatewayCalls, afterGatewayCalls);
      answers.set(testCase.id, body);
      return Object.freeze({
        id: testCase.id,
        priority: testCase.priority,
        passed: true,
        failure: null,
        answerMode: body.answerMode
      });
    }

    if (typeof testCase.input === "string") {
      throw new Error("caso de feedback sem payload estruturado");
    }
    const original = answers.get("EVAL-002");
    if (original === undefined) {
      throw new Error("a resposta-base de feedback não foi executada");
    }
    const before = JSON.stringify(harness.persistence.getInteraction(original.answerId)?.answer);
    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/condominiums/${testCase.condominiumId}/answers/${original.answerId}/feedback`,
      headers: {
        "content-type": "application/json",
        "x-development-user-id": syntheticUserId(testCase.actor)
      },
      payload: JSON.stringify({
        classification: testCase.input.classification,
        comment: testCase.input.comment
      })
    });
    if (response.statusCode !== 201) {
      throw new Error(`status HTTP esperado 201, recebido ${response.statusCode}`);
    }
    const feedback = harness.persistence.listFeedback().at(-1);
    if (feedback === undefined) {
      throw new Error("feedback não foi persistido");
    }
    const after = JSON.stringify(harness.persistence.getInteraction(original.answerId)?.answer);
    if (before !== after) {
      throw new Error("a resposta original foi alterada pelo feedback");
    }
    if (
      feedback.answerId !== original.answerId ||
      feedback.condominiumId !== testCase.condominiumId
    ) {
      throw new Error("feedback não está vinculado à resposta e ao condomínio corretos");
    }
    if (feedback.submittedByUserId !== syntheticUserId(testCase.actor)) {
      throw new Error("feedback não registra o usuário correto");
    }
    if (
      feedback.classification !== testCase.input.classification ||
      feedback.comment !== testCase.input.comment
    ) {
      throw new Error("campos do feedback não foram preservados");
    }
    return Object.freeze({
      id: testCase.id,
      priority: testCase.priority,
      passed: true,
      failure: null,
      answerMode: null
    });
  } catch (error: unknown) {
    return Object.freeze({
      id: testCase.id,
      priority: testCase.priority,
      passed: false,
      failure: error instanceof Error ? error.message : "falha desconhecida",
      answerMode: null
    });
  }
}

async function main(): Promise<void> {
  const baseline = await loadBaseline();
  const harness = createHarness();
  const unavailableHarness = createHarness({ retrieval: "unavailable" });
  const answers = new Map<string, PublicAnswer>();
  const results: CaseResult[] = [];

  for (const testCase of evaluationCases) {
    const currentHarness = testCase.systemState === undefined ? harness : unavailableHarness;
    results.push(await runCase(testCase, currentHarness, answers));
  }

  await harness.app.close();
  await unavailableHarness.app.close();

  const p0 = results.filter((result) => result.priority === "P0");
  const p1 = results.filter((result) => result.priority === "P1");
  const p0Failures = p0.filter((result) => !result.passed).length;
  const p1PassRate = p1.filter((result) => result.passed).length / Math.max(1, p1.length);
  const interactions = harness.persistence.listInteractions();
  const invocations = interactions.flatMap((interaction) => interaction.invocations);
  const averageEstimatedCostMicrounits =
    invocations.reduce((sum, invocation) => sum + invocation.estimatedCostMicrounits, 0) /
    Math.max(1, invocations.length);
  const report = {
    suite: "spec-001-consulta-documental",
    caseCount: results.length,
    passed: results.filter((result) => result.passed).length,
    p0: {
      total: p0.length,
      failures: p0Failures,
      passRate: 1 - p0Failures / Math.max(1, p0.length)
    },
    p1: { total: p1.length, passRate: p1PassRate },
    thresholds: baseline.thresholds,
    averageEstimatedCostMicrounits,
    gatewayCalls: harness.gatewayCalls(),
    results: results.map((result) => ({
      id: result.id,
      priority: result.priority,
      passed: result.passed,
      answerMode: result.answerMode,
      failure: result.failure
    }))
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    p0Failures > baseline.thresholds.maxP0Failures ||
    p1PassRate < baseline.thresholds.minimumP1PassRate ||
    Math.abs(results.length - baseline.caseCount) > baseline.thresholds.maxCaseCountDelta ||
    p0.length !== baseline.p0CaseCount ||
    p1.length !== baseline.p1CaseCount
  ) {
    process.exitCode = 1;
  }
}

await main();
