import { createHash, randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type {
  AnswerTraceStore,
  AnswerTrace,
  AnswerFeedback,
  RecordAnswerTraceInput,
  RecordFeedbackInput,
  AnswerSourceRef
} from "./answer-trace.js";
import {
  AnswerTraceNotFoundError,
  InvalidAnswerFeedbackError,
  maximumFeedbackCommentLength
} from "./answer-trace.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";

type PoolLike = Pick<Pool, "connect">;

type TraceRow = Readonly<{
  id: string;
  condominium_id: string;
  question_sha256: string;
  response_sha256: string;
  answer_mode: AnswerTrace["answerMode"];
  retrieval_pipeline_version: string;
  retrieval_query_hash: string;
  candidate_count: number | string;
  selected_count: number | string;
  sufficiency_status: AnswerTrace["retrieval"]["sufficiency"];
  task_class: AnswerTrace["routing"]["taskClass"];
  prompt_version: string;
  schema_version: "grounded-answer-v1";
  provider_key: "local-extractive";
  unit_kind: "characters";
  input_units: number | string;
  output_units: number | string;
  estimated_cost_micros: number | string;
  security_answer_mode: AnswerTrace["answerMode"];
  evidence_tenant_checked: boolean;
  citation_validation: "performed";
  latency_ms: number | string;
  created_at: Date | string;
}>;

type SourceRow = Readonly<{
  chunk_id: string;
  document_id: string;
  document_version_id: string;
  page_number: number | string;
  content_sha256: string;
}>;

type FeedbackRow = Readonly<{
  id: string;
  answer_id: string;
  condominium_id: string;
  classification: AnswerFeedback["classification"];
  comment: string | null;
  source_refs: readonly AnswerSourceRef[];
  created_at: Date | string;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

async function setRuntimeContext(
  client: PoolClient,
  context: AuthorizedCondominiumContext
): Promise<string> {
  if (!uuidPattern.test(context.condominiumId)) {
    throw new Error("O condomínio da trilha PostgreSQL deve usar UUID.");
  }

  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId: string = context.userId;
  if (!uuidPattern.test(databaseUserId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [context.userId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade da trilha não está cadastrada como usuário ativo.");
  }

  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [context.condominiumId]);
  return databaseUserId;
}

function isoDate(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapSources(rows: readonly SourceRow[]): readonly AnswerSourceRef[] {
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentVersionId: row.document_version_id,
        page: Number(row.page_number),
        contentSha256: row.content_sha256
      })
    )
  );
}

function mapTrace(
  row: TraceRow,
  sourceRefs: readonly AnswerSourceRef[],
  userId: string
): AnswerTrace {
  if (!row.evidence_tenant_checked || row.citation_validation !== "performed") {
    throw new Error("A trilha retornada não passou pelas garantias de segurança.");
  }

  return Object.freeze({
    id: row.id,
    condominiumId: row.condominium_id as AnswerTrace["condominiumId"],
    userId,
    questionSha256: row.question_sha256,
    responseSha256: row.response_sha256,
    answerMode: row.answer_mode,
    sourceRefs,
    retrieval: Object.freeze({
      pipelineVersion: row.retrieval_pipeline_version,
      queryHash: row.retrieval_query_hash,
      candidateCount: Number(row.candidate_count),
      selectedCount: Number(row.selected_count),
      sufficiency: row.sufficiency_status
    }),
    routing: Object.freeze({
      taskClass: row.task_class,
      promptVersion: row.prompt_version as AnswerTrace["routing"]["promptVersion"],
      schemaVersion: row.schema_version,
      providerKey: row.provider_key
    }),
    usage: Object.freeze({
      unitKind: row.unit_kind,
      inputUnits: Number(row.input_units),
      outputUnits: Number(row.output_units),
      estimatedCostMicros: Number(row.estimated_cost_micros)
    }),
    securityOutcome: Object.freeze({
      answerMode: row.security_answer_mode,
      evidenceTenantChecked: true,
      citationValidation: row.citation_validation
    }),
    latencyMs: Number(row.latency_ms),
    createdAt: isoDate(row.created_at)
  });
}

function mapFeedback(row: FeedbackRow): AnswerFeedback {
  return Object.freeze({
    id: row.id,
    answerId: row.answer_id,
    condominiumId: row.condominium_id as AnswerFeedback["condominiumId"],
    userId: "database-user",
    classification: row.classification,
    comment: row.comment,
    sourceRefs: Object.freeze(row.source_refs.map((source) => Object.freeze({ ...source }))),
    createdAt: isoDate(row.created_at)
  });
}

async function loadSources(client: PoolClient, answerId: string): Promise<readonly SourceRow[]> {
  const result = await client.query<SourceRow>(
    `
      SELECT document_chunk_id AS chunk_id, document_id, document_version_id,
        page_number, content_sha256
      FROM app.answer_trace_sources
      WHERE condominium_id = app.current_condominium_id()
        AND answer_id = $1
      ORDER BY source_index
    `,
    [answerId]
  );
  return result.rows;
}

export function createPostgresAnswerTraceStore(pool: PoolLike): AnswerTraceStore {
  return {
    async record(input: RecordAnswerTraceInput): Promise<AnswerTrace> {
      const client = await pool.connect();
      const id = input.id ?? randomUUID();
      if (!uuidPattern.test(id)) {
        client.release();
        throw new Error("O identificador da resposta PostgreSQL deve ser UUID.");
      }

      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, input.context);
        const sourceRefs = mapSources(
          input.retrieval.evidence.map((evidence) => ({
            chunk_id: evidence.id,
            document_id: evidence.documentId,
            document_version_id: evidence.documentVersionId,
            page_number: evidence.pageNumber,
            content_sha256: evidence.contentSha256
          }))
        );

        await client.query(
          `
            INSERT INTO app.answer_traces (
              condominium_id, id, user_id, question_sha256, response_sha256,
              answer_mode, retrieval_pipeline_version, retrieval_query_hash,
              candidate_count, selected_count, sufficiency_status, task_class,
              prompt_version, schema_version, provider_key, unit_kind,
              input_units, output_units, estimated_cost_micros,
              security_answer_mode, evidence_tenant_checked, citation_validation,
              latency_ms, created_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19, $20, true, $21, $22, $23
            )
          `,
          [
            input.context.condominiumId,
            id,
            databaseUserId,
            sha256(input.question.trim()),
            sha256(JSON.stringify(input.response)),
            input.response.answerMode,
            input.retrieval.pipelineVersion,
            input.retrieval.queryHash,
            input.retrieval.candidateCount,
            input.retrieval.selectedCount,
            input.retrieval.sufficiency.status,
            input.retrieval.evidence.length > 1 ? "intermediate" : "economical",
            "answer-evidence-v1",
            "grounded-answer-v1",
            "local-extractive",
            "characters",
            input.question.trim().length,
            input.response.answer.length,
            0,
            input.response.answerMode,
            "performed",
            input.latencyMs,
            input.createdAt ?? new Date()
          ]
        );

        for (const [sourceIndex, source] of sourceRefs.entries()) {
          await client.query(
            `
              INSERT INTO app.answer_trace_sources (
                condominium_id, answer_id, source_index, document_id,
                document_version_id, document_chunk_id, page_number, content_sha256
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
              input.context.condominiumId,
              id,
              sourceIndex,
              source.documentId,
              source.documentVersionId,
              source.chunkId,
              source.page,
              source.contentSha256
            ]
          );
        }

        await client.query("COMMIT");
        return Object.freeze({
          id,
          condominiumId: input.context.condominiumId,
          userId: input.context.userId,
          questionSha256: sha256(input.question.trim()),
          responseSha256: sha256(JSON.stringify(input.response)),
          answerMode: input.response.answerMode,
          sourceRefs,
          retrieval: Object.freeze({
            pipelineVersion: input.retrieval.pipelineVersion,
            queryHash: input.retrieval.queryHash,
            candidateCount: input.retrieval.candidateCount,
            selectedCount: input.retrieval.selectedCount,
            sufficiency: input.retrieval.sufficiency.status
          }),
          routing: Object.freeze({
            taskClass: input.retrieval.evidence.length > 1 ? "intermediate" : "economical",
            promptVersion: "answer-evidence-v1",
            schemaVersion: "grounded-answer-v1",
            providerKey: "local-extractive"
          }),
          usage: Object.freeze({
            unitKind: "characters",
            inputUnits: input.question.trim().length,
            outputUnits: input.response.answer.length,
            estimatedCostMicros: 0
          }),
          securityOutcome: Object.freeze({
            answerMode: input.response.answerMode,
            evidenceTenantChecked: true,
            citationValidation: "performed"
          }),
          latencyMs: input.latencyMs,
          createdAt: (input.createdAt ?? new Date()).toISOString()
        });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async get(context: AuthorizedCondominiumContext, answerId: string) {
      if (!uuidPattern.test(answerId)) return undefined;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, context);
        const result = await client.query<TraceRow>(
          `
            SELECT id, condominium_id, question_sha256, response_sha256,
              answer_mode, retrieval_pipeline_version, retrieval_query_hash,
              candidate_count, selected_count, sufficiency_status, task_class,
              prompt_version, schema_version, provider_key, unit_kind,
              input_units, output_units, estimated_cost_micros,
              security_answer_mode, evidence_tenant_checked, citation_validation,
              latency_ms, created_at
            FROM app.answer_traces
            WHERE condominium_id = app.current_condominium_id() AND id = $1
          `,
          [answerId]
        );
        const row = result.rows[0];
        if (row === undefined) {
          await client.query("COMMIT");
          return undefined;
        }
        const sources = await loadSources(client, answerId);
        await client.query("COMMIT");
        return mapTrace(row, mapSources(sources), context.userId);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async recordFeedback(context: AuthorizedCondominiumContext, input: RecordFeedbackInput) {
      if (!uuidPattern.test(input.answerId)) {
        throw new AnswerTraceNotFoundError();
      }
      if (!["correct", "incorrect", "incomplete", "outdated"].includes(input.classification)) {
        throw new InvalidAnswerFeedbackError("A classificação de feedback é inválida.");
      }
      const comment = input.comment?.trim() ?? null;
      if (comment !== null && comment.length > maximumFeedbackCommentLength) {
        throw new InvalidAnswerFeedbackError("O comentário de feedback excede o limite permitido.");
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, context);
        const answer = await client.query<{ id: string }>(
          `
            SELECT id
            FROM app.answer_traces
            WHERE condominium_id = app.current_condominium_id() AND id = $1
          `,
          [input.answerId]
        );
        if (answer.rows[0] === undefined) {
          throw new AnswerTraceNotFoundError();
        }
        const sourceRows = await loadSources(client, input.answerId);
        const id = randomUUID();
        const result = await client.query<FeedbackRow>(
          `
            INSERT INTO app.answer_feedback (
              condominium_id, id, answer_id, user_id, classification,
              comment, source_refs, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
            RETURNING id, answer_id, condominium_id, classification, comment,
              source_refs, created_at
          `,
          [
            context.condominiumId,
            id,
            input.answerId,
            databaseUserId,
            input.classification,
            comment,
            JSON.stringify(mapSources(sourceRows)),
            input.createdAt ?? new Date()
          ]
        );
        await client.query("COMMIT");
        const row = result.rows[0];
        if (row === undefined) throw new Error("O feedback não foi retornado pelo banco.");
        return Object.freeze({ ...mapFeedback(row), userId: context.userId });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async listFeedback(context: AuthorizedCondominiumContext) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, context);
        const result = await client.query<FeedbackRow>(
          `
            SELECT id, answer_id, condominium_id, classification, comment,
              source_refs, created_at
            FROM app.answer_feedback
            WHERE condominium_id = app.current_condominium_id()
            ORDER BY created_at, id
          `
        );
        await client.query("COMMIT");
        return Object.freeze(
          result.rows.map((row) => Object.freeze({ ...mapFeedback(row), userId: context.userId }))
        );
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

function sha256(value: string): string {
  // Only the digest is persisted; raw question/answer content never enters the trace.
  return createHash("sha256").update(value).digest("hex");
}
