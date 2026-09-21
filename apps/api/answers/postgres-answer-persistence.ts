import { createHash, randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  AnswerClaim,
  AnswerRecord,
  AnswerSpecialist,
  RiskClass,
  SpecialistType
} from "./answer-contract.js";
import {
  type AnswerPersistence,
  type ConversationHistoryEntry,
  type FeedbackRecord,
  type PersistedInteraction,
  type SubmitFeedbackInput,
  validateFeedbackInput
} from "./answer-persistence.js";

type PoolLike = Pick<Pool, "connect">;

type AnswerRow = Readonly<{
  answer_id: string;
  question_id: string;
  condominium_id: string;
  asked_by_user_id: string;
  answer: string;
  answer_mode: AnswerRecord["answerMode"];
  attention_points: readonly string[];
  suggested_next_step: string | null;
  specialist_required: boolean;
  specialist_type: string | null;
  specialist_reason: string | null;
  risk_class: RiskClass;
  schema_version: "answer-v1";
  prompt_version: string;
  pipeline_version: "answer-pipeline-v1";
  validation_status: "passed" | "failed";
  created_at: Date;
}>;

type CitationRow = Readonly<{
  citation_id: string;
  retrieval_evidence_id: string;
  document_id: string;
  document_version_id: string;
  document_title_snapshot: string;
  page_number_snapshot: number | string;
  page_start_offset: number | string;
  page_end_offset: number | string;
  excerpt_snapshot: string;
}>;

type ClaimRow = Readonly<{
  claim_id: string;
  statement: string;
  claim_type: AnswerClaim["claimType"];
  evidence_required: boolean;
  citation_evidence_ids: readonly string[];
}>;

type ConversationHistoryRow = AnswerRow &
  Readonly<{
    question_content: string;
    question_created_at: Date;
  }>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserva o erro original; a conexão será liberada no finally.
  }
}

async function setRuntimeContext(
  client: PoolClient,
  context: Readonly<{ condominiumId: string; userId: string }>
): Promise<string> {
  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId = context.userId;
  if (!uuidPattern.test(databaseUserId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [databaseUserId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade da resposta não está cadastrada como usuário ativo.");
  }
  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [context.condominiumId]);
  return databaseUserId;
}

function specialistFromRow(row: AnswerRow): AnswerSpecialist {
  return Object.freeze({
    required: row.specialist_required,
    type: row.specialist_type as SpecialistType | null,
    reason: row.specialist_reason
  });
}

function mapAnswer(
  row: AnswerRow,
  citations: readonly CitationRow[],
  claims: readonly ClaimRow[]
): AnswerRecord {
  return Object.freeze({
    answer: row.answer,
    answerMode: row.answer_mode,
    citations: Object.freeze(
      citations.map((citation) =>
        Object.freeze({
          id: citation.citation_id,
          evidenceId: citation.retrieval_evidence_id,
          documentId: citation.document_id,
          documentVersionId: citation.document_version_id,
          title: citation.document_title_snapshot,
          page: Number(citation.page_number_snapshot),
          excerpt: citation.excerpt_snapshot,
          startOffset: Number(citation.page_start_offset),
          endOffset: Number(citation.page_end_offset)
        })
      )
    ),
    attentionPoints: Object.freeze([...row.attention_points]),
    suggestedNextStep: row.suggested_next_step,
    specialist: specialistFromRow(row),
    answerId: row.answer_id,
    questionId: row.question_id,
    condominiumId: row.condominium_id as AnswerRecord["condominiumId"],
    userId: row.asked_by_user_id as AnswerRecord["userId"],
    riskClass: row.risk_class,
    schemaVersion: row.schema_version,
    promptVersion: row.prompt_version,
    pipelineVersion: row.pipeline_version,
    validationStatus: row.validation_status,
    claims: Object.freeze(
      claims.map((claim) =>
        Object.freeze({
          id: claim.claim_id,
          statement: claim.statement,
          claimType: claim.claim_type,
          evidenceRequired: claim.evidence_required,
          citationEvidenceIds: Object.freeze([...claim.citation_evidence_ids])
        })
      )
    ),
    createdAt: new Date(row.created_at),
    requestId: "persisted"
  });
}

async function loadAnswerDetails(
  client: PoolClient,
  condominiumId: string,
  answerId: string
): Promise<Readonly<{ citations: readonly CitationRow[]; claims: readonly ClaimRow[] }>> {
  const [citationResult, claimResult] = await Promise.all([
    client.query<CitationRow>(
      `
        SELECT
          id AS citation_id,
          retrieval_evidence_id,
          document_id,
          document_version_id,
          document_title_snapshot,
          page_number_snapshot,
          page_start_offset,
          page_end_offset,
          excerpt_snapshot
        FROM app.citations
        WHERE condominium_id = $1 AND answer_id = $2
        ORDER BY ordinal
      `,
      [condominiumId, answerId]
    ),
    client.query<ClaimRow>(
      `
        SELECT id AS claim_id, statement, claim_type, evidence_required, citation_evidence_ids
        FROM app.answer_claims
        WHERE condominium_id = $1 AND answer_id = $2
        ORDER BY ordinal
      `,
      [condominiumId, answerId]
    )
  ]);
  return Object.freeze({ citations: citationResult.rows, claims: claimResult.rows });
}

export function createPostgresAnswerPersistence(pool: PoolLike): AnswerPersistence {
  return {
    async saveInteraction(input: PersistedInteraction): Promise<void> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, {
          condominiumId: input.answer.condominiumId,
          userId: input.answer.userId
        });

        await client.query(
          `
            INSERT INTO app.questions (
              condominium_id, id, asked_by_user_id, content, language,
              idempotency_key, request_id, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            input.question.condominiumId,
            input.question.id,
            databaseUserId,
            input.question.content,
            input.question.language,
            input.question.idempotencyKey,
            input.question.requestId,
            input.question.createdAt
          ]
        );

        await client.query(
          `
            INSERT INTO app.retrieval_runs (
              condominium_id, id, question_id, status, pipeline_version,
              risk_class, query_hash, started_at, finished_at,
              candidate_count, selected_count, failure_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
          [
            input.retrieval.condominiumId,
            input.retrieval.id,
            input.retrieval.questionId,
            input.retrieval.status,
            input.retrieval.pipelineVersion,
            input.retrieval.riskClass,
            input.retrieval.queryHash,
            input.retrieval.startedAt,
            input.retrieval.finishedAt,
            input.retrieval.candidateCount,
            input.retrieval.selectedCount,
            input.retrieval.failureCode
          ]
        );

        for (const evidence of input.evidence) {
          await client.query(
            `
              INSERT INTO app.retrieval_evidence (
                condominium_id, retrieval_run_id, document_chunk_id,
                rank, lexical_score, semantic_score, rerank_score,
                selected_for_generation, sufficiency_flags
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
            `,
            [
              evidence.condominiumId,
              evidence.retrievalRunId,
              evidence.id,
              evidence.rank,
              evidence.lexicalScore,
              evidence.semanticScore,
              evidence.rerankScore,
              evidence.selectedForGeneration,
              JSON.stringify(evidence.sufficiencyFlags)
            ]
          );
        }

        await client.query(
          `
            INSERT INTO app.answers (
              condominium_id, id, question_id, retrieval_run_id, schema_version,
              answer_mode, direct_answer, attention_points, suggested_next_step,
              specialist_required, specialist_type, specialist_reason,
              risk_class, validation_status, abstention_reason, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
          `,
          [
            input.answer.condominiumId,
            input.answer.answerId,
            input.answer.questionId,
            input.retrieval.id,
            input.answer.schemaVersion,
            input.answer.answerMode,
            input.answer.answer,
            JSON.stringify(input.answer.attentionPoints),
            input.answer.suggestedNextStep,
            input.answer.specialist.required,
            input.answer.specialist.type,
            input.answer.specialist.reason,
            input.answer.riskClass,
            input.answer.validationStatus,
            input.answer.answerMode === "abstained"
              ? (input.answer.attentionPoints[0] ?? null)
              : null,
            input.answer.createdAt
          ]
        );

        for (const claim of input.claims) {
          await client.query(
            `
              INSERT INTO app.answer_claims (
                condominium_id, id, answer_id, ordinal, statement,
                claim_type, evidence_required, citation_evidence_ids
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
            `,
            [
              input.answer.condominiumId,
              claim.id,
              input.answer.answerId,
              input.claims.indexOf(claim),
              claim.statement,
              claim.claimType,
              claim.evidenceRequired,
              JSON.stringify(claim.citationEvidenceIds)
            ]
          );
        }

        const firstClaimId = input.claims[0]?.id ?? null;
        for (const citation of input.answer.citations) {
          const claim = input.claims.find((item) =>
            item.citationEvidenceIds.includes(citation.evidenceId)
          );
          const claimId = claim?.id ?? firstClaimId;
          if (claimId === null) {
            throw new Error("A citação persistida não possui claim vinculada.");
          }
          await client.query(
            `
              INSERT INTO app.citations (
                condominium_id, id, answer_id, answer_claim_id, retrieval_run_id,
                retrieval_evidence_id, ordinal, document_id, document_version_id, document_title_snapshot,
                page_number_snapshot, page_start_offset, page_end_offset,
                excerpt_snapshot, excerpt_sha256
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `,
            [
              input.answer.condominiumId,
              citation.id,
              input.answer.answerId,
              claimId,
              input.retrieval.id,
              citation.evidenceId,
              input.answer.citations.indexOf(citation),
              citation.documentId,
              citation.documentVersionId,
              citation.title,
              citation.page,
              citation.startOffset,
              citation.endOffset,
              citation.excerpt,
              sha256(citation.excerpt)
            ]
          );
        }

        for (const invocation of input.invocations) {
          await client.query(
            `
              INSERT INTO app.model_invocations (
                condominium_id, id, question_id, answer_id, retrieval_run_id,
                task_type, risk_class, provider_key, model_key, model_version,
                prompt_version, pipeline_version, routing_reason, status,
                input_tokens, output_tokens, cached_input_tokens, latency_ms,
                estimated_cost_microunits, cost_currency, input_hash, output_hash,
                error_code, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            `,
            [
              invocation.condominiumId,
              invocation.id,
              invocation.questionId,
              invocation.answerId,
              invocation.retrievalRunId,
              invocation.taskType,
              invocation.riskClass,
              invocation.providerKey,
              invocation.modelKey,
              invocation.modelVersion,
              invocation.promptVersion,
              invocation.pipelineVersion,
              invocation.routingReason,
              invocation.status,
              invocation.inputTokens,
              invocation.outputTokens,
              invocation.cachedInputTokens,
              invocation.latencyMs,
              invocation.estimatedCostMicrounits,
              invocation.costCurrency,
              invocation.inputHash,
              invocation.outputHash,
              invocation.errorCode,
              invocation.createdAt
            ]
          );
          for (const evidenceId of invocation.evidenceIds) {
            await client.query(
              `
              INSERT INTO app.model_invocation_evidence (
                  condominium_id, model_invocation_id, retrieval_run_id,
                  retrieval_evidence_id, ordinal
                )
                VALUES ($1, $2, $3, $4, $5)
              `,
              [
                invocation.condominiumId,
                invocation.id,
                invocation.retrievalRunId,
                evidenceId,
                invocation.evidenceIds.indexOf(evidenceId)
              ]
            );
          }
        }

        for (const event of input.auditEvents) {
          await client.query(
            `
              INSERT INTO app.audit_events (
                condominium_id, id, actor_type, actor_user_id, event_type,
                subject_type, subject_id, request_id, correlation_id,
                metadata, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
            `,
            [
              event.condominiumId,
              event.id,
              event.actorType,
              event.actorUserId === null ? null : databaseUserId,
              event.eventType,
              event.subjectType,
              event.subjectId,
              event.requestId,
              event.correlationId,
              JSON.stringify(event.metadata),
              event.createdAt
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async findAnswer(
      context: AuthorizedCondominiumContext,
      answerId: string
    ): Promise<AnswerRecord | undefined> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, context);
        const answerResult = await client.query<AnswerRow>(
          `
            SELECT
              a.id AS answer_id,
              a.question_id,
              a.condominium_id,
              q.asked_by_user_id,
              a.direct_answer AS answer,
              a.answer_mode,
              a.attention_points,
              a.suggested_next_step,
              a.specialist_required,
              a.specialist_type,
              a.specialist_reason,
              a.risk_class,
              a.schema_version,
              mi.prompt_version,
              mi.pipeline_version,
              a.validation_status,
              a.created_at
            FROM app.answers AS a
            JOIN app.questions AS q
              ON q.condominium_id = a.condominium_id
              AND q.id = a.question_id
            JOIN app.model_invocations AS mi
              ON mi.condominium_id = a.condominium_id
              AND mi.answer_id = a.id
            WHERE a.condominium_id = app.current_condominium_id()
              AND a.id = $1
            LIMIT 1
          `,
          [answerId]
        );
        const row = answerResult.rows[0];
        if (row === undefined) {
          await client.query("COMMIT");
          return undefined;
        }
        const details = await loadAnswerDetails(client, context.condominiumId, answerId);
        await client.query("COMMIT");
        return mapAnswer(row, details.citations, details.claims);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async listConversationHistory(
      context: AuthorizedCondominiumContext,
      limit = 50
    ): Promise<readonly ConversationHistoryEntry[]> {
      const client = await pool.connect();
      const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, context);
        const historyResult = await client.query<ConversationHistoryRow>(
          `
            SELECT
              a.id AS answer_id,
              a.question_id,
              a.condominium_id,
              q.asked_by_user_id,
              q.content AS question_content,
              q.created_at AS question_created_at,
              a.direct_answer AS answer,
              a.answer_mode,
              a.attention_points,
              a.suggested_next_step,
              a.specialist_required,
              a.specialist_type,
              a.specialist_reason,
              a.risk_class,
              a.schema_version,
              mi.prompt_version,
              mi.pipeline_version,
              a.validation_status,
              a.created_at
            FROM app.answers AS a
            JOIN app.questions AS q
              ON q.condominium_id = a.condominium_id
              AND q.id = a.question_id
            JOIN app.model_invocations AS mi
              ON mi.condominium_id = a.condominium_id
              AND mi.answer_id = a.id
            WHERE a.condominium_id = app.current_condominium_id()
              AND q.asked_by_user_id = $1
            ORDER BY q.created_at DESC, a.id DESC
            LIMIT $2
          `,
          [databaseUserId, safeLimit]
        );
        const history: ConversationHistoryEntry[] = [];
        for (const row of [...historyResult.rows].reverse()) {
          const details = await loadAnswerDetails(client, context.condominiumId, row.answer_id);
          history.push(
            Object.freeze({
              questionId: row.question_id,
              question: row.question_content,
              answer: mapAnswer(row, details.citations, details.claims),
              createdAt: new Date(row.question_created_at)
            })
          );
        }
        await client.query("COMMIT");
        return Object.freeze(history);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async findAnswerByIdempotencyKey(
      context: AuthorizedCondominiumContext,
      idempotencyKey: string
    ): Promise<AnswerRecord | undefined> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, context);
        const answerResult = await client.query<AnswerRow>(
          `
            SELECT
              a.id AS answer_id,
              a.question_id,
              a.condominium_id,
              q.asked_by_user_id,
              a.direct_answer AS answer,
              a.answer_mode,
              a.attention_points,
              a.suggested_next_step,
              a.specialist_required,
              a.specialist_type,
              a.specialist_reason,
              a.risk_class,
              a.schema_version,
              mi.prompt_version,
              mi.pipeline_version,
              a.validation_status,
              a.created_at
            FROM app.answers AS a
            JOIN app.questions AS q
              ON q.condominium_id = a.condominium_id
              AND q.id = a.question_id
            JOIN app.model_invocations AS mi
              ON mi.condominium_id = a.condominium_id
              AND mi.answer_id = a.id
            WHERE a.condominium_id = app.current_condominium_id()
              AND q.idempotency_key = $1
            LIMIT 1
          `,
          [idempotencyKey]
        );
        const row = answerResult.rows[0];
        if (row === undefined) {
          await client.query("COMMIT");
          return undefined;
        }
        const details = await loadAnswerDetails(client, context.condominiumId, row.answer_id);
        await client.query("COMMIT");
        return mapAnswer(row, details.citations, details.claims);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async createFeedback(
      context: AuthorizedCondominiumContext,
      input: SubmitFeedbackInput
    ): Promise<FeedbackRecord | undefined> {
      validateFeedbackInput(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const databaseUserId = await setRuntimeContext(client, context);
        const answer = await client.query<{ answer_id: string }>(
          `
            SELECT id AS answer_id
            FROM app.answers
            WHERE condominium_id = app.current_condominium_id() AND id = $1
            LIMIT 1
          `,
          [input.answerId]
        );
        if (answer.rows[0] === undefined) {
          await client.query("COMMIT");
          return undefined;
        }
        const id = randomUUID();
        const createdAt = new Date();
        await client.query(
          `
            INSERT INTO app.feedback (
              condominium_id, id, answer_id, submitted_by_user_id,
              classification, comment, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            context.condominiumId,
            id,
            input.answerId,
            databaseUserId,
            input.classification,
            input.comment,
            createdAt
          ]
        );
        await client.query(
          `
            INSERT INTO app.audit_events (
              condominium_id, id, actor_type, actor_user_id, event_type,
              subject_type, subject_id, request_id, correlation_id, metadata, created_at
            )
            VALUES ($1, $2, 'user', $3, 'feedback_created', 'feedback', $4, $5, $6, $7::jsonb, $8)
          `,
          [
            context.condominiumId,
            randomUUID(),
            databaseUserId,
            id,
            input.requestId ?? "feedback",
            input.answerId,
            JSON.stringify({ classification: input.classification }),
            createdAt
          ]
        );
        await client.query("COMMIT");
        return Object.freeze({
          id,
          condominiumId: context.condominiumId,
          answerId: input.answerId,
          submittedByUserId: context.userId,
          classification: input.classification,
          comment: input.comment,
          createdAt
        });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
