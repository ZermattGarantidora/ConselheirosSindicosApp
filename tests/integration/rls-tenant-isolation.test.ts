import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createScopedDocumentProcessor } from "../../apps/api/documents/document-processing.js";
import { createLocalPrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import { unavailableOcrAdapter } from "../../apps/api/documents/ocr-quality.js";
import { uploadDocument } from "../../apps/api/documents/upload-document.js";
import { createPostgresDocumentProcessingRepository } from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";
import {
  assertSyntheticIntegrationTarget,
  parseNeonIntegrationUrl,
  requireSyntheticIntegrationConfirmation
} from "../../scripts/neon-integration-guard.js";

const databaseUrl = process.env.NEON_INTEGRATION_DATABASE_URL;
parseNeonIntegrationUrl(databaseUrl);
requireSyntheticIntegrationConfirmation(process.env.NEON_INTEGRATION_CONFIRMATION);

const pool = new Pool({ connectionString: databaseUrl });
const alamedaId = randomUUID();
const bosqueId = randomUUID();
const userId = randomUUID();

async function resetFixtures(client: PoolClient): Promise<void> {
  await client.query(
    "TRUNCATE app.document_chunks, app.document_pages, app.processing_jobs, app.document_version_states, app.document_versions, app.documents, app.storage_objects, app.memberships, app.condominiums, app.users"
  );
  await client.query("INSERT INTO app.users (id, auth_subject, status) VALUES ($1, $2, 'active')", [
    userId,
    "sindico-sintetico"
  ]);
  await client.query(
    "INSERT INTO app.condominiums (id, display_name, status) VALUES ($1, 'Alameda', 'active'), ($2, 'Bosque', 'active')",
    [alamedaId, bosqueId]
  );
  await client.query(
    "INSERT INTO app.memberships (condominium_id, id, user_id, role_key, status, valid_from, revision) VALUES ($1, $2, $3, 'manager', 'active', now() - interval '1 day', 'v1')",
    [alamedaId, randomUUID(), userId]
  );
}

async function asRuntime<T>(
  condominiumId: string | undefined,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    if (condominiumId !== undefined) {
      await client.query("SELECT set_config('app.condominium_id', $1, true)", [condominiumId]);
    }
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

describe("RLS de isolamento por condomínio", () => {
  beforeAll(async () => {
    const client = await pool.connect();

    try {
      await assertSyntheticIntegrationTarget(client);
    } finally {
      client.release();
    }
  });

  beforeEach(async () => {
    const client = await pool.connect();

    try {
      await resetFixtures(client);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("permite somente o condomínio selecionado", async () => {
    await pool.query(
      "INSERT INTO app.memberships (condominium_id, id, user_id, role_key, status, valid_from, revision) VALUES ($1, $2, $3, 'manager', 'active', now() - interval '1 day', 'v1')",
      [bosqueId, randomUUID(), userId]
    );

    const result = await asRuntime(alamedaId, (client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums ORDER BY display_name")
    );

    expect(result.rows).toEqual([{ id: alamedaId }]);
  });

  it("não confirma a existência de condomínio sem associação", async () => {
    const result = await asRuntime(alamedaId, (client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums WHERE id = $1", [bosqueId])
    );

    expect(result.rows).toEqual([]);
  });

  it("falha fechado quando o condomínio selecionado não está no contexto", async () => {
    const result = await asRuntime(undefined, (client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums")
    );

    expect(result.rows).toEqual([]);
  });

  it("nega acesso após revogação", async () => {
    await pool.query(
      "UPDATE app.memberships SET status = 'revoked', revoked_at = now() WHERE user_id = $1",
      [userId]
    );

    const result = await asRuntime(alamedaId, (client) =>
      client.query<{ id: string }>("SELECT id FROM app.condominiums")
    );

    expect(result.rows).toEqual([]);
  });

  it("persiste o upload, reivindica o job e publica páginas e chunks no tenant correto", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "conselheiro-neon-processing-"));
    const content = createSyntheticTextPdf();
    const context: AuthorizedCondominiumContext = {
      condominiumId: createCondominiumId(alamedaId),
      userId: userId as AuthorizedCondominiumContext["userId"],
      roleKey: "manager",
      membershipRevision: "v1",
      permissions: ["document:read", "document:upload"]
    };
    const storage = createLocalPrivateDocumentStorage(rootDirectory);

    try {
      const uploaded = await uploadDocument(
        storage,
        createPostgresDocumentUploadRepository(pool),
        context,
        { title: "Convenção Alameda sintética", documentType: "convention", content }
      );

      const queued = await pool.query<{
        status: string;
        processing_status: string;
        current_processing_job_id: string;
      }>(
        `
          SELECT pj.status, dvs.processing_status, dvs.current_processing_job_id
          FROM app.processing_jobs AS pj
          JOIN app.document_version_states AS dvs
            ON dvs.condominium_id = pj.condominium_id
            AND dvs.document_version_id = pj.document_version_id
          WHERE pj.condominium_id = $1 AND pj.document_version_id = $2
        `,
        [alamedaId, uploaded.documentVersionId]
      );

      expect(queued.rows).toMatchObject([
        {
          status: "queued",
          processing_status: "uploaded",
          current_processing_job_id: expect.any(String)
        }
      ]);

      const processorRepository = createPostgresDocumentProcessingRepository(pool, storage);
      const result = await processOne(
        createPostgresProcessingJobQueue(pool),
        createScopedDocumentProcessor(processorRepository, unavailableOcrAdapter)
      );

      expect(result).toBe("processed");
      const processed = await pool.query<{
        job_status: string;
        processing_status: string;
        page_count: string;
        chunk_count: string;
        extracted_text: string;
      }>(
        `
          SELECT
            pj.status AS job_status,
            dvs.processing_status,
            (SELECT count(*)::text FROM app.document_pages WHERE condominium_id = pj.condominium_id AND document_version_id = pj.document_version_id) AS page_count,
            (SELECT count(*)::text FROM app.document_chunks WHERE condominium_id = pj.condominium_id AND document_version_id = pj.document_version_id) AS chunk_count,
            (SELECT extracted_text FROM app.document_pages WHERE condominium_id = pj.condominium_id AND document_version_id = pj.document_version_id ORDER BY page_index LIMIT 1) AS extracted_text
          FROM app.processing_jobs AS pj
          JOIN app.document_version_states AS dvs
            ON dvs.condominium_id = pj.condominium_id
            AND dvs.document_version_id = pj.document_version_id
          WHERE pj.condominium_id = $1 AND pj.document_version_id = $2
        `,
        [alamedaId, uploaded.documentVersionId]
      );

      expect(processed.rows).toEqual([
        {
          job_status: "completed",
          processing_status: "ready",
          page_count: "2",
          chunk_count: "2",
          extracted_text: "Regra da primeira pagina"
        }
      ]);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it("usa a API persistente e cria a segunda versão do mesmo documento", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "conselheiro-neon-api-"));
    const app = createApi({
      membershipRepository: createPostgresMembershipRepository(pool),
      documentStorage: createLocalPrivateDocumentStorage(rootDirectory),
      documentUploadRepository: createPostgresDocumentUploadRepository(pool)
    });
    const content = createSyntheticTextPdf();
    const headers = {
      "x-development-user-id": "sindico-sintetico",
      "x-document-title": "Convenção via API sintética",
      "x-document-type": "convention",
      "content-type": "application/pdf"
    };

    try {
      const first = await app.inject({
        method: "POST",
        url: `/v1/condominiums/${alamedaId}/documents`,
        headers,
        payload: content
      });
      expect(first.statusCode).toBe(202);
      const firstBody = first.json<{
        documentId: string;
        documentVersionId: string;
      }>();

      const second = await app.inject({
        method: "POST",
        url: `/v1/condominiums/${alamedaId}/documents`,
        headers: { ...headers, "x-document-id": firstBody.documentId },
        payload: content
      });
      expect(second.statusCode).toBe(202);
      expect(second.json<{ documentId: string }>().documentId).toBe(firstBody.documentId);

      const versions = await pool.query<{ version_number: number }>(
        "SELECT version_number FROM app.document_versions WHERE condominium_id = $1 AND document_id = $2 ORDER BY version_number",
        [alamedaId, firstBody.documentId]
      );
      expect(versions.rows.map((row) => Number(row.version_number))).toEqual([1, 2]);
    } finally {
      await app.close();
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
