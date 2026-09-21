import { createHash } from "node:crypto";

import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createPostgresDocumentProcessingRepository,
  createScopedPostgresDocumentProcessor
} from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import type {
  DocumentProcessingOutcome,
  DocumentProcessingRepository
} from "../../apps/api/documents/document-processing.js";
import type { PrivateDocumentReader } from "../../apps/api/documents/private-document-storage.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";

type QueryResult = Readonly<{ rows: readonly unknown[]; rowCount?: number }>;
type FakeClient = {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
};
type PoolLike = Readonly<{ connect: () => Promise<PoolClient> }>;

function createFakeClient(responses: readonly QueryResult[] = []): {
  client: FakeClient;
  queries: Array<{ sql: string; values: readonly unknown[] | undefined }>;
} {
  const remaining = [...responses];
  const queries: Array<{ sql: string; values: readonly unknown[] | undefined }> = [];
  const query = vi.fn(async (...args: unknown[]): Promise<QueryResult> => {
    queries.push({ sql: String(args[0]), values: args[1] as readonly unknown[] | undefined });
    return remaining.shift() ?? { rows: [], rowCount: 1 };
  });

  return { client: { query, release: vi.fn() }, queries };
}

function createPool(client: FakeClient): PoolLike {
  return {
    connect: async () => client as unknown as PoolClient
  };
}

function createRecord(): UploadedDocumentRecord {
  return {
    condominiumId: createCondominiumId("alameda"),
    documentId: "11111111-1111-4111-8111-111111111111",
    documentVersionId: "22222222-2222-4222-8222-222222222222",
    storageObjectId: "33333333-3333-4333-8333-333333333333",
    storageKey: "tenants/synthetic/objects/33333333-3333-4333-8333-333333333333",
    title: "Convenção sintética",
    documentType: "convention",
    contentSha256: "a".repeat(64),
    sizeBytes: 128,
    uploadedByUserId: createUserId("11111111-1111-4111-8111-111111111111"),
    processingStatus: "uploaded",
    validityStatus: "pending"
  };
}

const content = Buffer.from("%PDF-1.7 conteúdo sintético");
const contentSha256 = createHash("sha256").update(content).digest("hex");

describe("adaptadores PostgreSQL do processamento documental", () => {
  it("registra upload em uma transação escopada e enfileira a extração", async () => {
    const fake = createFakeClient();
    const repository = createPostgresDocumentUploadRepository(createPool(fake.client));

    await repository.recordUploaded(createRecord());

    expect(fake.queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_runtime",
      expect.stringContaining("set_config('app.user_id'"),
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("INSERT INTO app.storage_objects"),
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("SELECT status"),
      expect.stringContaining("INSERT INTO app.documents"),
      expect.stringContaining("INSERT INTO app.document_versions"),
      expect.stringContaining("INSERT INTO app.document_version_states"),
      expect.stringContaining("INSERT INTO app.processing_jobs"),
      expect.stringContaining("UPDATE app.document_version_states"),
      "COMMIT"
    ]);
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("grava o estado de validade confirmado recebido no upload", async () => {
    const fake = createFakeClient();
    const repository = createPostgresDocumentUploadRepository(createPool(fake.client));

    await repository.recordUploaded({ ...createRecord(), validityStatus: "confirmed" });

    const stateInsert = fake.queries.find(({ sql }) =>
      sql.includes("INSERT INTO app.document_version_states")
    );
    expect(stateInsert?.values).toEqual([
      "alameda",
      "22222222-2222-4222-8222-222222222222",
      "confirmed"
    ]);
  });

  it("faz rollback quando o registro persistido falha", async () => {
    const fake = createFakeClient();
    let calls = 0;
    fake.client.query.mockImplementation(async (...args: unknown[]) => {
      calls += 1;
      fake.queries.push({
        sql: String(args[0]),
        values: args[1] as readonly unknown[] | undefined
      });
      if (calls === 5) {
        throw new Error("database unavailable");
      }
      return { rows: [], rowCount: 1 };
    });
    const repository = createPostgresDocumentUploadRepository(createPool(fake.client));

    await expect(repository.recordUploaded(createRecord())).rejects.toThrow("database unavailable");
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
    expect(fake.client.release).toHaveBeenCalledOnce();
  });

  it("calcula a próxima versão sob bloqueio do documento existente", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [{ status: "active" }], rowCount: 1 },
      { rows: [{ version_number: "2" }], rowCount: 1 }
    ]);
    const existingDocument = createRecord();

    await createPostgresDocumentUploadRepository(createPool(fake.client)).recordUploaded({
      ...existingDocument,
      documentVersionId: "99999999-9999-4999-8999-999999999999"
    });

    const versionInsert = fake.queries.find((query) =>
      query.sql.includes("INSERT INTO app.document_versions")
    );
    expect(versionInsert?.values).toContain(2);
    expect(fake.queries.some((query) => query.sql.includes("pg_advisory_xact_lock"))).toBe(true);
  });

  it("carrega uma versão somente pelo condomínio do job e valida o hash do original", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      {
        rows: [
          {
            condominium_id: "alameda",
            document_version_id: "version-1",
            storage_object_id: "33333333-3333-4333-8333-333333333333",
            content_sha256: contentSha256,
            processing_status: "uploaded",
            validity_status: "pending",
            valid_from: null,
            valid_until: null,
            ocr_quality_score: null
          }
        ]
      },
      { rows: [] }
    ]);
    const storage: PrivateDocumentReader = {
      async readOriginal(input) {
        expect(input).toEqual({
          condominiumId: "alameda",
          objectId: "33333333-3333-4333-8333-333333333333"
        });
        return content;
      }
    };
    const repository = createPostgresDocumentProcessingRepository(createPool(fake.client), storage);

    await expect(
      repository.loadForProcessing({
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "version-1"
      })
    ).resolves.toMatchObject({
      condominiumId: "alameda",
      documentVersionId: "version-1",
      state: { processingStatus: "uploaded", validityStatus: "pending" }
    });
  });

  it("distingue versão ausente e original adulterado", async () => {
    const emptyFake = createFakeClient();
    const emptyRepository = createPostgresDocumentProcessingRepository(
      createPool(emptyFake.client),
      {
        async readOriginal() {
          return content;
        }
      }
    );
    await expect(
      emptyRepository.loadForProcessing({
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "missing"
      })
    ).resolves.toBeUndefined();

    const mismatchFake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      {
        rows: [
          {
            condominium_id: "alameda",
            document_version_id: "version-1",
            storage_object_id: "33333333-3333-4333-8333-333333333333",
            content_sha256: "b".repeat(64),
            processing_status: "uploaded",
            validity_status: "pending",
            valid_from: null,
            valid_until: null,
            ocr_quality_score: null
          }
        ]
      },
      { rows: [] }
    ]);
    const mismatchRepository = createPostgresDocumentProcessingRepository(
      createPool(mismatchFake.client),
      {
        async readOriginal() {
          return content;
        }
      }
    );
    await expect(
      mismatchRepository.loadForProcessing({
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "version-1"
      })
    ).rejects.toThrow("hash do original");
  });

  it("persiste páginas, chunks e o estado final do processamento", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      {
        rows: [{ active: 1 }],
        rowCount: 1
      }
    ]);
    const repository = createPostgresDocumentProcessingRepository(createPool(fake.client), {
      async readOriginal() {
        return content;
      }
    });
    const outcome: DocumentProcessingOutcome = {
      status: "completed",
      state: {
        processingStatus: "ready",
        validityStatus: "pending",
        validFrom: null,
        validUntil: null,
        ocrQualityScore: null
      },
      pages: [
        {
          id: "page-1",
          condominiumId: createCondominiumId("alameda"),
          documentVersionId: "version-1",
          pageIndex: 0,
          pageNumber: 1,
          extractedText: "Regra sintética",
          extractionMethod: "pdf_text",
          qualityScore: 1,
          contentSha256: "c".repeat(64)
        }
      ]
    };

    await repository.saveProcessingResult({
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      jobId: "job-1",
      attemptCount: 1,
      outcome
    });

    expect(fake.queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE app_worker",
      expect.stringContaining("set_config('app.condominium_id'"),
      expect.stringContaining("set_config('app.processing_job_id'"),
      expect.stringContaining("FROM app.processing_jobs"),
      expect.stringContaining("DELETE FROM app.document_chunk_embeddings"),
      expect.stringContaining("DELETE FROM app.document_chunks"),
      expect.stringContaining("DELETE FROM app.document_pages"),
      expect.stringContaining("INSERT INTO app.document_pages"),
      expect.stringContaining("INSERT INTO app.document_chunks"),
      expect.stringContaining("INSERT INTO app.document_chunk_embeddings"),
      expect.stringContaining("UPDATE app.document_version_states"),
      expect.stringContaining("UPDATE app.processing_jobs"),
      "COMMIT"
    ]);
  });

  it("mantém o índice dos chunks único em toda a versão, entre páginas", async () => {
    const fake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      {
        rows: [{ active: 1 }],
        rowCount: 1
      }
    ]);
    const repository = createPostgresDocumentProcessingRepository(createPool(fake.client), {
      async readOriginal() {
        return content;
      }
    });

    await repository.saveProcessingResult({
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      jobId: "job-1",
      attemptCount: 1,
      outcome: {
        status: "completed",
        state: {
          processingStatus: "ready",
          validityStatus: "pending",
          validFrom: null,
          validUntil: null,
          ocrQualityScore: null
        },
        pages: [
          {
            id: "page-1",
            condominiumId: createCondominiumId("alameda"),
            documentVersionId: "version-1",
            pageIndex: 0,
            pageNumber: 1,
            extractedText: "Regra da primeira página",
            extractionMethod: "pdf_text",
            qualityScore: 1,
            contentSha256: "c".repeat(64)
          },
          {
            id: "page-2",
            condominiumId: createCondominiumId("alameda"),
            documentVersionId: "version-1",
            pageIndex: 1,
            pageNumber: 2,
            extractedText: "Regra da segunda página",
            extractionMethod: "pdf_text",
            qualityScore: 1,
            contentSha256: "d".repeat(64)
          }
        ]
      }
    });

    const chunkQueries = fake.queries.filter((query) =>
      query.sql.includes("INSERT INTO app.document_chunks")
    );
    expect(chunkQueries.map((query) => query.values?.[4])).toEqual([0, 1]);
  });

  it("faz rollback quando o job não está mais em processamento", async () => {
    const fake = createFakeClient([{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }]);
    const repository = createPostgresDocumentProcessingRepository(createPool(fake.client), {
      async readOriginal() {
        return content;
      }
    });
    const failedOutcome: DocumentProcessingOutcome = {
      status: "failed",
      state: {
        processingStatus: "failed",
        validityStatus: "pending",
        validFrom: null,
        validUntil: null,
        ocrQualityScore: null
      },
      pages: [],
      reason: "pdf_parse_failed"
    };

    await expect(
      repository.saveProcessingResult({
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "version-1",
        jobId: "job-1",
        attemptCount: 1,
        outcome: failedOutcome
      })
    ).rejects.toThrow("job de processamento");
    expect(fake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("reivindica jobs, retorna ocioso e faz rollback em erro de banco", async () => {
    const claimedFake = createFakeClient();
    claimedFake.client.query.mockImplementation(async (...args: unknown[]) => {
      const sql = String(args[0]);
      claimedFake.queries.push({
        sql,
        values: args[1] as readonly unknown[] | undefined
      });
      if (sql.includes("pg_try_advisory_xact_lock")) {
        return {
          rows: [
            {
              job_id: "job-1",
              condominium_id: "alameda",
              document_version_id: "version-1",
              status: "queued",
              attempt_count: 0
            }
          ]
        };
      }
      if (sql.includes("RETURNING jobs")) {
        return {
          rows: [
            {
              job_id: "job-1",
              condominium_id: "alameda",
              document_version_id: "version-1",
              attempt_count: 1
            }
          ],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 1 };
    });
    const queue = createPostgresProcessingJobQueue(createPool(claimedFake.client), {
      leaseSeconds: 30
    });

    await expect(queue.claimNext()).resolves.toMatchObject({
      jobId: "job-1",
      condominiumId: "alameda",
      documentVersionId: "version-1"
    });

    const emptyFake = createFakeClient();
    const emptyQueue = createPostgresProcessingJobQueue(createPool(emptyFake.client));
    await expect(emptyQueue.claimNext()).resolves.toBeUndefined();

    const errorFake = createFakeClient();
    errorFake.client.query.mockImplementation(async (...args: unknown[]) => {
      errorFake.queries.push({
        sql: String(args[0]),
        values: args[1] as readonly unknown[] | undefined
      });
      if (errorFake.queries.length === 3) {
        throw new Error("queue unavailable");
      }
      return { rows: [], rowCount: 1 };
    });
    const errorQueue = createPostgresProcessingJobQueue(createPool(errorFake.client));
    await expect(errorQueue.claimNext()).rejects.toThrow("queue unavailable");
    expect(errorFake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("reprograma, falha e faz rollback de jobs com tenant escopado", async () => {
    const retryFake = createFakeClient();
    const queue = createPostgresProcessingJobQueue(createPool(retryFake.client));
    const job = {
      jobId: "job-1",
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      attemptCount: 1
    };

    await queue.fail?.(job);
    expect(retryFake.queries.some((query) => query.sql.includes("document_version_states"))).toBe(
      true
    );

    const unchangedFake = createFakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [], rowCount: 0 }
    ]);
    const unchangedQueue = createPostgresProcessingJobQueue(createPool(unchangedFake.client));
    await unchangedQueue.fail?.(job);
    expect(
      unchangedFake.queries.filter((query) => query.sql.includes("document_version_states"))
    ).toHaveLength(0);

    const errorFake = createFakeClient();
    errorFake.client.query.mockImplementation(async (...args: unknown[]) => {
      errorFake.queries.push({
        sql: String(args[0]),
        values: args[1] as readonly unknown[] | undefined
      });
      if (errorFake.queries.length === 4) {
        throw new Error("job update unavailable");
      }
      return { rows: [], rowCount: 1 };
    });
    const errorQueue = createPostgresProcessingJobQueue(createPool(errorFake.client));
    await expect(errorQueue.fail?.(job)).rejects.toThrow("job update unavailable");
    expect(errorFake.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("rejeita lease inválido e expõe o processador PostgreSQL escopado", async () => {
    const fake = createFakeClient();
    expect(() =>
      createPostgresProcessingJobQueue(createPool(fake.client), { leaseSeconds: 0 })
    ).toThrow("lease do worker");

    const processingRepository: DocumentProcessingRepository =
      createPostgresDocumentProcessingRepository(createPool(fake.client), {
        async readOriginal() {
          return Buffer.from("%PDF-invalid");
        }
      });
    expect(processingRepository).toHaveProperty("loadForProcessing");

    const processor = createScopedPostgresDocumentProcessor(createPool(fake.client), {
      async readOriginal() {
        return Buffer.from("%PDF-invalid");
      }
    });
    await expect(
      processor.process({
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "version-1",
        jobId: "job-1",
        attemptCount: 1
      })
    ).rejects.toThrow("versão documental carregável");
  });
});
