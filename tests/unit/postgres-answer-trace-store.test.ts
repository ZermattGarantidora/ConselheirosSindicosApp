import { describe, expect, it } from "vitest";
import {
  AnswerTraceNotFoundError,
  createInMemoryAnswerTraceStore,
  InvalidAnswerFeedbackError
} from "../../apps/api/answers/answer-trace.js";
import { createPostgresAnswerTraceStore } from "../../apps/api/answers/postgres-answer-trace-store.js";
import type { GroundedAnswer } from "../../apps/api/answers/answer-service.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import type {
  RetrievalEvidence,
  ScopedRetrievalResult
} from "../../apps/api/retrieval/retrieval-contract.js";

const condominiumId = createCondominiumId("11111111-1111-4111-8111-111111111111");
const userId = "22222222-2222-4222-8222-222222222222";
const answerId = "33333333-3333-4333-8333-333333333333";
const feedbackId = "44444444-4444-4444-8444-444444444444";
const documentId = "55555555-5555-4555-8555-555555555555";
const versionId = "66666666-6666-4666-8666-666666666666";
const chunkId = "77777777-7777-4777-8777-777777777777";

const context: AuthorizedCondominiumContext = {
  condominiumId,
  userId: userId as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "membership-v1",
  permissions: ["document:read", "document:upload"]
};

function evidence(): RetrievalEvidence {
  return Object.freeze({
    id: chunkId,
    condominiumId,
    documentId,
    documentVersionId: versionId,
    documentVersionNumber: 1,
    documentTitle: "Documento sintético",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "88888888-8888-4888-8888-888888888888",
    pageNumber: 4,
    startOffset: 0,
    endOffset: 45,
    content: "A regra sintética exige confirmação.",
    contentSha256: "a".repeat(64),
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null,
    lexicalScore: 0.9,
    rerankScore: 0.8,
    rank: 1
  });
}

function retrieval(): ScopedRetrievalResult {
  return Object.freeze({
    pipelineVersion: "hybrid-v1",
    queryHash: "b".repeat(64),
    candidateCount: 1,
    selectedCount: 1,
    evidence: Object.freeze([evidence()]),
    sufficiency: Object.freeze({
      status: "sufficient",
      reason: "enough_relevance",
      supportingEvidenceCount: 1
    })
  });
}

function response(): GroundedAnswer {
  return Object.freeze({
    answer: "A regra sintética exige confirmação.",
    answerMode: "grounded",
    citations: Object.freeze([
      {
        documentId,
        documentVersionId: versionId,
        title: "Documento sintético",
        page: 4,
        excerpt: "A regra sintética exige confirmação."
      }
    ]),
    claims: Object.freeze([
      { statement: "A regra sintética exige confirmação.", citationIndexes: [0] }
    ]),
    attentionPoints: Object.freeze([]),
    suggestedNextStep: null,
    specialist: Object.freeze({ required: false, type: null, reason: null })
  });
}

const sourceRow = {
  chunk_id: chunkId,
  document_id: documentId,
  document_version_id: versionId,
  page_number: 4,
  content_sha256: "a".repeat(64)
};

const traceRow = {
  id: answerId,
  condominium_id: condominiumId,
  question_sha256: "c".repeat(64),
  response_sha256: "d".repeat(64),
  answer_mode: "grounded" as const,
  retrieval_pipeline_version: "hybrid-v1",
  retrieval_query_hash: "b".repeat(64),
  candidate_count: 1,
  selected_count: 1,
  sufficiency_status: "sufficient" as const,
  task_class: "economical" as const,
  prompt_version: "answer-evidence-v1",
  schema_version: "grounded-answer-v1" as const,
  provider_key: "local-extractive" as const,
  unit_kind: "characters" as const,
  input_units: 25,
  output_units: 40,
  estimated_cost_micros: 0,
  security_answer_mode: "grounded" as const,
  evidence_tenant_checked: true,
  citation_validation: "performed" as const,
  latency_ms: 3.125,
  created_at: new Date("2026-09-10T15:00:00.000Z")
};

const feedbackRow = {
  id: feedbackId,
  answer_id: answerId,
  condominium_id: condominiumId,
  classification: "incorrect" as const,
  comment: "Revisar a vigência.",
  source_refs: [
    {
      chunkId,
      documentId,
      documentVersionId: versionId,
      page: 4,
      contentSha256: "a".repeat(64)
    }
  ],
  created_at: new Date("2026-09-10T15:01:00.000Z")
};

type FakeOptions = Readonly<{
  traceRows?: readonly object[];
  sourceRows?: readonly object[];
  feedbackRows?: readonly object[];
  failTraceInsert?: boolean;
  resolvedUserId?: string | null;
}>;

function fakePool(options: FakeOptions = {}) {
  const queries: string[] = [];
  const client = {
    async query<T = unknown>(sql: string): Promise<{ rows: T[] }> {
      queries.push(sql.trim());
      const normalized = sql.replace(/\s+/gu, " ").trim().toUpperCase();
      if (normalized.includes("SELECT APP.RESOLVE_USER_ID")) {
        return { rows: [{ user_id: options.resolvedUserId ?? userId }] as T[] };
      }
      if (normalized === "ROLLBACK" || normalized === "COMMIT" || normalized === "BEGIN") {
        return { rows: [] };
      }
      if (normalized.includes("INSERT INTO APP.ANSWER_TRACES") && options.failTraceInsert) {
        throw new Error("synthetic trace insert failure");
      }
      if (normalized.includes("SELECT ID, CONDOMINIUM_ID, QUESTION_SHA256")) {
        return { rows: [...(options.traceRows ?? [traceRow])] as T[] };
      }
      if (normalized.includes("SELECT ID FROM APP.ANSWER_TRACES")) {
        return {
          rows: (options.traceRows ?? [traceRow]).map((row) => ({
            id: (row as { id: string }).id
          })) as T[]
        };
      }
      if (normalized.includes("SELECT DOCUMENT_CHUNK_ID AS CHUNK_ID")) {
        return { rows: [...(options.sourceRows ?? [sourceRow])] as T[] };
      }
      if (normalized.includes("INSERT INTO APP.ANSWER_FEEDBACK")) {
        return { rows: [feedbackRow] as T[] };
      }
      if (normalized.includes("SELECT ID, ANSWER_ID, CONDOMINIUM_ID, CLASSIFICATION")) {
        return { rows: [...(options.feedbackRows ?? [feedbackRow])] as T[] };
      }
      return { rows: [] };
    },
    release(): void {}
  };

  return { pool: { connect: async () => client } as never, queries, client };
}

const traceInput = {
  id: answerId,
  context,
  question: "Qual é a regra sintética?",
  retrieval: retrieval(),
  response: response(),
  latencyMs: 3.125,
  createdAt: new Date("2026-09-10T15:00:00.000Z")
};

describe("adapter PostgreSQL de trilha e feedback", () => {
  it("persiste trace e fontes com contexto de usuário UUID", async () => {
    const fake = fakePool();
    const trace = await createPostgresAnswerTraceStore(fake.pool).record(traceInput);

    expect(trace).toMatchObject({
      id: answerId,
      condominiumId,
      userId,
      answerMode: "grounded",
      sourceRefs: [expect.objectContaining({ chunkId })]
    });
    expect(fake.queries.some((query) => query.includes("INSERT INTO app.answer_traces"))).toBe(
      true
    );
    expect(
      fake.queries.some((query) => query.includes("INSERT INTO app.answer_trace_sources"))
    ).toBe(true);
  });

  it("resolve identidade externa, lê trace isolado e rejeita dados de segurança inválidos", async () => {
    const externalContext = {
      ...context,
      userId: "user-synthetic" as AuthorizedCondominiumContext["userId"]
    };
    const fake = fakePool({ resolvedUserId: userId });
    const store = createPostgresAnswerTraceStore(fake.pool);
    const trace = await store.get(externalContext, answerId);

    expect(trace).toMatchObject({ id: answerId, userId: "user-synthetic", latencyMs: 3.125 });
    expect(fake.queries.some((query) => query.includes("SELECT app.resolve_user_id"))).toBe(true);
    expect(await store.get(context, "not-a-uuid")).toBeUndefined();

    const invalid = fakePool({ traceRows: [{ ...traceRow, evidence_tenant_checked: false }] });
    await expect(
      createPostgresAnswerTraceStore(invalid.pool).get(context, answerId)
    ).rejects.toThrow("garantias de segurança");
  });

  it("persiste feedback append-only e lista somente o tenant autorizado", async () => {
    const fake = fakePool();
    const store = createPostgresAnswerTraceStore(fake.pool);

    const feedback = await store.recordFeedback(context, {
      answerId,
      classification: "incorrect",
      comment: "Revisar a vigência.",
      createdAt: new Date("2026-09-10T15:01:00.000Z")
    });
    const listed = await store.listFeedback(context);

    expect(feedback).toMatchObject({
      id: feedbackId,
      answerId,
      userId,
      classification: "incorrect",
      sourceRefs: [expect.objectContaining({ chunkId })]
    });
    expect(listed).toHaveLength(1);
    expect(fake.queries.some((query) => query.includes("INSERT INTO app.answer_feedback"))).toBe(
      true
    );
  });

  it("falha fechado para resposta ausente e entradas inválidas", async () => {
    const missing = fakePool({ traceRows: [] });
    const store = createPostgresAnswerTraceStore(missing.pool);
    await expect(
      store.recordFeedback(context, { answerId, classification: "correct" })
    ).rejects.toBeInstanceOf(AnswerTraceNotFoundError);
    await expect(
      store.recordFeedback(context, { answerId: "not-a-uuid", classification: "correct" })
    ).rejects.toBeInstanceOf(AnswerTraceNotFoundError);
    await expect(
      store.recordFeedback(context, { answerId, classification: "invalid" as never })
    ).rejects.toBeInstanceOf(InvalidAnswerFeedbackError);
    await expect(
      store.recordFeedback(context, {
        answerId,
        classification: "correct",
        comment: "x".repeat(2_001)
      })
    ).rejects.toBeInstanceOf(InvalidAnswerFeedbackError);
  });

  it("faz rollback quando a gravação da trilha falha", async () => {
    const fake = fakePool({ failTraceInsert: true });
    await expect(createPostgresAnswerTraceStore(fake.pool).record(traceInput)).rejects.toThrow(
      "synthetic trace insert failure"
    );
    expect(fake.queries).toContain("ROLLBACK");
  });

  it("não usa o adapter PostgreSQL para identificador de resposta não UUID", async () => {
    const fake = fakePool();
    const store = createPostgresAnswerTraceStore(fake.pool);
    await expect(store.record({ ...traceInput, id: "answer-synthetic" })).rejects.toThrow("UUID");
    expect(fake.queries).toEqual([]);
  });

  it("mantém o contrato do store sintético disponível sem banco", async () => {
    const store = createInMemoryAnswerTraceStore({ answerIdFactory: () => "answer-local" });
    const { id, ...traceInputWithoutId } = traceInput;
    expect(id).toBe(answerId);
    const trace = await store.record({
      ...traceInputWithoutId,
      context: { ...context, condominiumId: createCondominiumId("alameda") }
    });
    expect(trace.id).toBe("answer-local");
  });
});
