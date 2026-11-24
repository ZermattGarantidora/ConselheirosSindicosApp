import type { Pool, PoolClient } from "pg";

import type { CondominiumId } from "../core/condominium-scope.js";
import type { ProcessingJob, LeasedProcessingJobQueue } from "./processing-worker.js";

type PoolLike = Pick<Pool, "connect">;

type ClaimedJobRow = Readonly<{
  job_id: string;
  condominium_id: CondominiumId;
  document_version_id: string;
  attempt_count: number;
}>;

async function setWorkerContext(
  client: PoolClient,
  condominiumId?: CondominiumId,
  jobId?: string
): Promise<void> {
  await client.query("SET LOCAL ROLE app_worker");
  if (condominiumId !== undefined) {
    await client.query("SELECT set_config('app.condominium_id', $1, true)", [condominiumId]);
  }
  if (jobId !== undefined) {
    await client.query("SELECT set_config('app.processing_job_id', $1, true)", [jobId]);
  }
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

export type PostgresProcessingJobQueueOptions = Readonly<{
  leaseSeconds?: number;
}>;

export function createPostgresProcessingJobQueue(
  pool: PoolLike,
  options: PostgresProcessingJobQueueOptions = {}
): LeasedProcessingJobQueue {
  const leaseSeconds = options.leaseSeconds ?? 300;

  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1) {
    throw new Error("O lease do worker deve ser um número inteiro positivo de segundos.");
  }

  return {
    async claimNext(): Promise<ProcessingJob | undefined> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await setWorkerContext(client);
        const candidateResult = await client.query<
          Readonly<{
            condominium_id: CondominiumId;
            job_id: string;
            document_version_id: string;
            status: "queued" | "processing";
            attempt_count: number;
            max_attempts: number;
          }>
        >(
          `
            SELECT condominium_id, id AS job_id, document_version_id, status, attempt_count,
              max_attempts
            FROM app.processing_jobs
            WHERE (
              (
                (status = 'queued' AND available_at <= now())
                OR (
                  status = 'processing'
                  AND lease_expires_at < now()
                )
              )
              AND pg_try_advisory_xact_lock(hashtextextended(id::text, 0))
            )
            ORDER BY available_at, created_at
            LIMIT 1
          `
        );
        const candidate = candidateResult.rows[0];

        if (candidate === undefined) {
          await client.query("COMMIT");
          return undefined;
        }

        await setWorkerContext(client, candidate.condominium_id, candidate.job_id);
        if (candidate.attempt_count >= candidate.max_attempts) {
          await client.query(
            `UPDATE app.processing_jobs
             SET status = 'failed', finished_at = now(), leased_at = NULL,
                 lease_expires_at = NULL, error_code = 'worker_attempts_exhausted',
                 error_metadata = '{}'::jsonb, updated_at = now()
             WHERE condominium_id = $1 AND id = $2 AND attempt_count = $3
               AND ((status = 'processing' AND lease_expires_at < now())
                 OR (status = 'queued' AND available_at <= now()))`,
            [candidate.condominium_id, candidate.job_id, candidate.attempt_count]
          );
          await client.query(
            `UPDATE app.document_version_states AS states
             SET processing_status = 'failed', current_processing_job_id = NULL,
                 updated_at = now()
             WHERE states.condominium_id = $1 AND states.document_version_id = $2
               AND states.current_processing_job_id = $3
               AND states.processing_status IN ('uploaded', 'processing', 'failed')
               AND EXISTS (SELECT 1 FROM app.processing_jobs AS jobs
                 WHERE jobs.condominium_id = $1 AND jobs.id = $3 AND jobs.status = 'failed')`,
            [candidate.condominium_id, candidate.document_version_id, candidate.job_id]
          );
          await client.query("COMMIT");
          return undefined;
        }
        const result = await client.query<ClaimedJobRow>(
          `
            UPDATE app.processing_jobs AS jobs
            SET status = 'processing',
                attempt_count = jobs.attempt_count + 1,
                leased_at = now(),
                lease_expires_at = now() + ($1 * interval '1 second'),
                updated_at = now()
            WHERE jobs.condominium_id = $2
              AND jobs.id = $3
              AND (
                (
                  $4 = 'queued'
                  AND jobs.status = 'queued'
                  AND jobs.available_at <= now()
                  AND jobs.attempt_count < jobs.max_attempts
                )
                OR (
                  $4 = 'processing'
                  AND jobs.status = 'processing'
                  AND jobs.attempt_count = $5
                  AND jobs.lease_expires_at < now()
                  AND jobs.attempt_count < jobs.max_attempts
                )
              )
            RETURNING jobs.id AS job_id, jobs.condominium_id, jobs.document_version_id
              , jobs.attempt_count
          `,
          [
            leaseSeconds,
            candidate.condominium_id,
            candidate.job_id,
            candidate.status,
            candidate.attempt_count
          ]
        );

        if (result.rowCount !== 1) {
          await client.query("COMMIT");
          return undefined;
        }
        await client.query(
          `UPDATE app.document_version_states
           SET processing_status = 'processing', current_processing_job_id = $3,
               updated_at = now()
           WHERE condominium_id = $1 AND document_version_id = $2
             AND processing_status IN ('uploaded', 'processing', 'failed')
             AND (current_processing_job_id = $3 OR current_processing_job_id IS NULL)`,
          [candidate.condominium_id, candidate.document_version_id, candidate.job_id]
        );
        await client.query("COMMIT");

        const row = result.rows[0];
        return row === undefined
          ? undefined
          : Object.freeze({
              jobId: row.job_id,
              condominiumId: row.condominium_id,
              documentVersionId: row.document_version_id,
              attemptCount: row.attempt_count
            });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async renewLease(job: ProcessingJob): Promise<boolean> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setWorkerContext(client, job.condominiumId, job.jobId);
        const renewed = await client.query(
          `UPDATE app.processing_jobs
           SET lease_expires_at = clock_timestamp() + ($4 * interval '1 second'),
               updated_at = now()
           WHERE condominium_id = $1 AND id = $2 AND attempt_count = $3
             AND document_version_id = $5 AND status = 'processing'
             AND lease_expires_at > clock_timestamp()`,
          [job.condominiumId, job.jobId, job.attemptCount, leaseSeconds, job.documentVersionId]
        );
        await client.query("COMMIT");
        return renewed.rowCount === 1;
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async fail(job: ProcessingJob): Promise<void> {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await setWorkerContext(client, job.condominiumId, job.jobId);
        const updated = await client.query(
          `
            UPDATE app.processing_jobs
            SET status = CASE
                  WHEN attempt_count >= max_attempts THEN 'failed'
                  ELSE 'queued'
                END,
                available_at = CASE
                  WHEN attempt_count >= max_attempts THEN available_at
                  ELSE now() + interval '5 seconds'
                END,
                leased_at = NULL,
                lease_expires_at = NULL,
                finished_at = CASE
                  WHEN attempt_count >= max_attempts THEN now()
                  ELSE NULL
                END,
                error_code = 'worker_failed',
                error_metadata = '{}'::jsonb,
                updated_at = now()
            WHERE condominium_id = $1
              AND id = $2
              AND status = 'processing'
              AND attempt_count = $3
              AND document_version_id = $4
              AND lease_expires_at > clock_timestamp()
          `,
          [job.condominiumId, job.jobId, job.attemptCount, job.documentVersionId]
        );

        if (updated.rowCount === 1) {
          await client.query(
            `
              UPDATE app.document_version_states AS states
              SET processing_status = CASE WHEN jobs.status = 'failed' THEN 'failed'
                    ELSE 'processing' END,
                  current_processing_job_id = CASE WHEN jobs.status = 'failed' THEN NULL
                    ELSE jobs.id END,
                  updated_at = now()
              FROM app.processing_jobs AS jobs
              WHERE states.condominium_id = $1
                AND states.document_version_id = $2
                AND jobs.condominium_id = states.condominium_id AND jobs.id = $3
                AND jobs.status IN ('queued', 'failed')
                AND states.processing_status = 'processing'
                AND (
                  states.current_processing_job_id = $3
                  OR states.current_processing_job_id IS NULL
                )
            `,
            [job.condominiumId, job.documentVersionId, job.jobId]
          );
        }

        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
