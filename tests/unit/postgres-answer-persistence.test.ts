import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createPostgresAnswerPersistence } from "../../apps/api/answers/postgres-answer-persistence.js";
import {
  createRetrievalResult,
  createEvidence,
  fixedIdFactory,
  fixedNow,
  managerContext
} from "./answer-fixtures.js";

type QueryResponse = { rows: unknown[]; rowCount?: number };
type QueryHandler = (sql: string, values: readonly unknown[] | undefined) => QueryResponse;

function createFakePool(handler: QueryHandler = () => ({ rows: [] })) {
  const queries: Array<{ sql: string; values: readonly unknown[] | undefined }> = [];
  const client = {
    query: vi.fn(async (sql: string, values?: readonly unknown[]) => {
      queries.push({ sql, values });
      return handler(sql, values);
    }),
    release: vi.fn()
  };
  return {
    pool: { connect: vi.fn(async () => client as unknown as PoolClient) },
    client,
    queries
  };
}

async function createPersistedInteraction() {
  const memory = createInMemoryAnswerPersistence(fixedIdFactory("memory"), fixedNow);
  const useCase = createAnswerUseCase({
    retriever: {
      async search() {
        return createRetrievalResult([
          createEvidence({ content: "A regra sintética permite o uso da área comum." })
        ]);
      }
    },
    gateway: createLocalSyntheticAnswerGateway(),
    persistence: memory,
    now: fixedNow,
    idFactory: fixedIdFactory("interaction")
  });
  const answer = await useCase.ask(managerContext, {
    question: "Qual é a regra da área comum?",
    requestId: "request-persistence"
  });
  const interaction = memory.getInteraction(answer.answerId);
  if (interaction === undefined) {
    throw new Error("Interação sintética não foi criada.");
  }
  return interaction;
}

function defaultHandler(sql: string): QueryResponse {
  if (sql.includes("resolve_user_id")) {
    return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
  }
  return { rows: [] };
}

describe("persistência PostgreSQL de respostas", () => {
  it("persiste a interação completa em uma transação escopada", async () => {
    const interaction = await createPersistedInteraction();
    const fake = createFakePool(defaultHandler);
    const persistence = createPostgresAnswerPersistence(fake.pool);

    await persistence.saveInteraction(interaction);

    expect(fake.client.release).toHaveBeenCalledOnce();
    expect(fake.queries[0]?.sql).toBe("BEGIN");
    expect(fake.queries.at(-1)?.sql).toBe("COMMIT");
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.questions"))).toBe(true);
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.retrieval_runs"))).toBe(
      true
    );
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.retrieval_evidence"))).toBe(
      true
    );
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.answers"))).toBe(true);
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.answer_claims"))).toBe(
      true
    );
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.citations"))).toBe(true);
    expect(fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.model_invocations"))).toBe(
      true
    );
    expect(
      fake.queries.some(({ sql }) => sql.includes("INSERT INTO app.model_invocation_evidence"))
    ).toBe(true);
    expect(
      fake.queries.filter(({ sql }) => sql.includes("INSERT INTO app.audit_events"))
    ).toHaveLength(2);
    const answerInsert = fake.queries.find(({ sql }) => sql.includes("INSERT INTO app.answers"));
    expect(answerInsert?.values).toContain("grounded");
    const invocationInsert = fake.queries.find(({ sql }) =>
      sql.includes("INSERT INTO app.model_invocations")
    );
    expect(invocationInsert?.values).not.toContain(
      "A regra sintética permite o uso da área comum."
    );
  });

  it("faz rollback se qualquer gravação falhar", async () => {
    const interaction = await createPersistedInteraction();
    const fake = createFakePool((sql) => {
      if (sql.includes("INSERT INTO app.answers")) {
        throw new Error("answers unavailable");
      }
      return defaultHandler(sql);
    });
    const persistence = createPostgresAnswerPersistence(fake.pool);

    await expect(persistence.saveInteraction(interaction)).rejects.toThrow("answers unavailable");
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("lê uma resposta com suas citações e claims no escopo atual", async () => {
    const answerRow = {
      answer_id: "answer-1",
      question_id: "question-1",
      condominium_id: "alameda",
      asked_by_user_id: "11111111-1111-4111-8111-111111111111",
      answer: "A regra consta na convenção.",
      answer_mode: "grounded",
      attention_points: [],
      suggested_next_step: "Confira a fonte.",
      specialist_required: false,
      specialist_type: null,
      specialist_reason: null,
      risk_class: "low",
      schema_version: "answer-v1",
      prompt_version: "answer-prompt-v1",
      pipeline_version: "answer-pipeline-v1",
      validation_status: "passed",
      created_at: new Date("2026-09-08T12:00:00.000Z")
    };
    const fake = createFakePool((sql) => {
      if (sql.includes("resolve_user_id")) {
        return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
      }
      if (sql.includes("FROM app.answers AS a")) {
        return { rows: [answerRow] };
      }
      if (sql.includes("FROM app.citations")) {
        return {
          rows: [
            {
              citation_id: "citation-1",
              retrieval_evidence_id: "chunk-1",
              document_id: "document-1",
              document_version_id: "version-1",
              document_title_snapshot: "Convenção sintética",
              page_number_snapshot: "2",
              page_start_offset: "5",
              page_end_offset: "22",
              excerpt_snapshot: "A regra consta."
            }
          ]
        };
      }
      if (sql.includes("FROM app.answer_claims")) {
        return {
          rows: [
            {
              claim_id: "claim-1",
              statement: "A regra consta na convenção.",
              claim_type: "condominium_fact",
              evidence_required: true,
              citation_evidence_ids: ["chunk-1"]
            }
          ]
        };
      }
      return { rows: [] };
    });
    const persistence = createPostgresAnswerPersistence(fake.pool);

    const answer = await persistence.findAnswer(managerContext, "answer-1");

    expect(answer).toMatchObject({
      answerId: "answer-1",
      condominiumId: "alameda",
      answerMode: "grounded",
      citations: [{ evidenceId: "chunk-1", page: 2, startOffset: 5, endOffset: 22 }],
      claims: [{ id: "claim-1", evidenceRequired: true, citationEvidenceIds: ["chunk-1"] }]
    });
    expect(answer?.createdAt).toEqual(new Date("2026-09-08T12:00:00.000Z"));
    expect(fake.queries.at(-1)?.sql).toBe("COMMIT");

    const idempotentAnswer = await persistence.findAnswerByIdempotencyKey(
      managerContext,
      "idempotency-hash"
    );

    expect(idempotentAnswer?.answerId).toBe("answer-1");
    const idempotencyQuery = fake.queries.find(({ sql }) => sql.includes("q.idempotency_key = $1"));
    expect(idempotencyQuery?.values).toEqual(["idempotency-hash"]);
  });

  it("retorna vazio quando a resposta não pertence ao condomínio", async () => {
    const fake = createFakePool(defaultHandler);
    const persistence = createPostgresAnswerPersistence(fake.pool);

    await expect(persistence.findAnswer(managerContext, "missing-answer")).resolves.toBeUndefined();
    expect(fake.queries.at(-1)?.sql).toBe("COMMIT");
  });

  it("faz rollback na leitura quando a consulta falha", async () => {
    const fake = createFakePool((sql) => {
      if (sql.includes("FROM app.answers AS a")) {
        throw new Error("read unavailable");
      }
      return defaultHandler(sql);
    });
    const persistence = createPostgresAnswerPersistence(fake.pool);

    await expect(persistence.findAnswer(managerContext, "answer-1")).rejects.toThrow(
      "read unavailable"
    );
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("cria feedback e registra somente classificação no audit log", async () => {
    const fake = createFakePool((sql) => {
      if (sql.includes("resolve_user_id")) {
        return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
      }
      if (sql.includes("SELECT id AS answer_id")) {
        return { rows: [{ answer_id: "answer-1" }] };
      }
      return { rows: [] };
    });
    const persistence = createPostgresAnswerPersistence(fake.pool);

    const feedback = await persistence.createFeedback(managerContext, {
      answerId: "answer-1",
      classification: "incomplete",
      comment: "Faltou indicar a vigência.",
      requestId: "feedback-request"
    });

    expect(feedback).toMatchObject({
      answerId: "answer-1",
      condominiumId: "alameda",
      classification: "incomplete",
      comment: "Faltou indicar a vigência."
    });
    const audit = fake.queries.find(({ sql }) => sql.includes("INSERT INTO app.audit_events"));
    expect(audit?.values).toContain("feedback-request");
    expect(JSON.stringify(audit?.values)).not.toContain("Faltou indicar");
    expect(fake.queries.at(-1)?.sql).toBe("COMMIT");
  });

  it("retorna vazio, valida entrada antes da conexão e faz rollback em erro de feedback", async () => {
    const missing = createFakePool(defaultHandler);
    const persistence = createPostgresAnswerPersistence(missing.pool);
    await expect(
      persistence.createFeedback(managerContext, {
        answerId: "missing",
        classification: "correct",
        comment: null
      })
    ).resolves.toBeUndefined();

    let connections = 0;
    const invalidPool = {
      connect: vi.fn(async () => {
        connections += 1;
        return {} as PoolClient;
      })
    };
    const invalidPersistence = createPostgresAnswerPersistence(invalidPool);
    await expect(
      invalidPersistence.createFeedback(managerContext, {
        answerId: "answer",
        classification: "unknown" as never,
        comment: null
      })
    ).rejects.toThrow("classificação");
    expect(connections).toBe(0);

    const failed = createFakePool((sql) => {
      if (sql.includes("resolve_user_id")) {
        return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
      }
      if (sql.includes("SELECT id AS answer_id")) {
        return { rows: [{ answer_id: "answer-1" }] };
      }
      if (sql.includes("INSERT INTO app.feedback")) {
        throw new Error("feedback unavailable");
      }
      return { rows: [] };
    });
    const failedPersistence = createPostgresAnswerPersistence(failed.pool);
    await expect(
      failedPersistence.createFeedback(managerContext, {
        answerId: "answer-1",
        classification: "correct",
        comment: null
      })
    ).rejects.toThrow("feedback unavailable");
    expect(failed.queries.at(-1)?.sql).toBe("ROLLBACK");
  });
});
