import { createHash } from "node:crypto";

import type { Pool, PoolClient, QueryResult } from "pg";
import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { DocumentProcessingOutcome } from "../../apps/api/documents/document-processing.js";
import { createPostgresDocumentProcessingRepository } from "../../apps/api/documents/postgres-document-processing-repository.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";

type QueryHandler = (sql: string, parameters: readonly unknown[]) => QueryResult<never>;

function createFakePool(handler: QueryHandler): Readonly<{
  pool: Pick<Pool, "connect">;
  queries: string[];
}> {
  const queries: string[] = [];
  const client = {
    async query(query: string, parameters: readonly unknown[] = []) {
      queries.push(query);
      return handler(query, parameters);
    },
    release() {}
  } as unknown as PoolClient;

  return {
    pool: { connect: async () => client },
    queries
  };
}

function result(rows: readonly never[] = [], rowCount = rows.length): QueryResult<never> {
  return {
    command: "SELECT",
    rowCount,
    oid: 0,
    fields: [],
    rows: [...rows]
  };
}

const condominiumId = createCondominiumId("alameda");
const userId = "11111111-1111-4111-8111-111111111111" as UploadedDocumentRecord["uploadedByUserId"];
const record: UploadedDocumentRecord = Object.freeze({
  condominiumId,
  documentId: "22222222-2222-4222-8222-222222222222",
  documentVersionId: "33333333-3333-4333-8333-333333333333",
  storageObjectId: "44444444-4444-4444-8444-444444444444",
  storageKey: "tenants/opaque/objects/44444444-4444-4444-8444-444444444444",
  title: "Convenção sintética",
  documentType: "convention",
  contentSha256: "a".repeat(64),
  sizeBytes: 128,
  uploadedByUserId: userId,
  processingStatus: "uploaded",
  validityStatus: "pending"
});

describe("adaptadores persistidos de documentos", () => {
  it("registra original, versão, estado e job numa única transação", async () => {
    const fixture = createFakePool(() => result());

    await createPostgresDocumentUploadRepository(fixture.pool).recordUploaded(record);

    expect(fixture.queries[0]).toBe("BEGIN");
    expect(fixture.queries).toContain("SET LOCAL ROLE app_runtime");
    expect(fixture.queries.filter((query) => query.includes("INSERT INTO app.")).length).toBe(5);
    expect(fixture.queries.at(-1)).toBe("COMMIT");
  });

  it("faz rollback quando a persistência do upload falha", async () => {
    const expected = new Error("falha de banco");
    const fixture = createFakePool((sql) => {
      if (sql.includes("INSERT INTO app.documents")) {
        throw expected;
      }

      return result();
    });

    await expect(
      createPostgresDocumentUploadRepository(fixture.pool).recordUploaded(record)
    ).rejects.toBe(expected);
    expect(fixture.queries.at(-1)).toBe("ROLLBACK");
  });

  it("reivindica jobs disponíveis e deixa o banco decidir a ordem", async () => {
    const claimed = {
      job_id: "55555555-5555-4555-8555-555555555555",
      condominium_id: condominiumId,
      document_version_id: record.documentVersionId,
      attempt_count: 1,
      status: "queued"
    };
    const fixture = createFakePool((sql) => {
      if (sql.includes("pg_try_advisory_xact_lock")) {
        return result([
          {
            condominium_id: claimed.condominium_id,
            job_id: claimed.job_id,
            document_version_id: claimed.document_version_id
          }
        ] as never[]);
      }
      return sql.includes("RETURNING jobs") ? result([claimed] as never[]) : result();
    });
    const queue = createPostgresProcessingJobQueue(fixture.pool, { leaseSeconds: 10 });

    await expect(queue.claimNext()).resolves.toEqual({
      jobId: claimed.job_id,
      condominiumId,
      documentVersionId: record.documentVersionId,
      attemptCount: 1
    });
    expect(fixture.queries.some((query) => query.includes("pg_try_advisory_xact_lock"))).toBe(true);
  });

  it("retorna ociosidade, valida o lease e reencaminha falhas do job", async () => {
    const idleFixture = createFakePool(() => result());
    const idleQueue = createPostgresProcessingJobQueue(idleFixture.pool);
    await expect(idleQueue.claimNext()).resolves.toBeUndefined();

    expect(() => createPostgresProcessingJobQueue(idleFixture.pool, { leaseSeconds: 0 })).toThrow();

    const failedFixture = createFakePool((sql) =>
      sql.includes("UPDATE app.processing_jobs") ? result([], 1) : result()
    );
    const job = {
      jobId: "55555555-5555-4555-8555-555555555555",
      condominiumId,
      documentVersionId: record.documentVersionId,
      attemptCount: 1
    };
    await idleQueue.fail?.(job);
    await createPostgresProcessingJobQueue(failedFixture.pool).fail?.(job);
    expect(
      failedFixture.queries.some((query) => query.includes("processing_status = 'failed'"))
    ).toBe(true);
  });

  it("carrega o original por chave persistida e reconstrói o estado do documento", async () => {
    const content = Buffer.from("conteúdo sintético");
    const row = {
      condominium_id: condominiumId,
      document_version_id: record.documentVersionId,
      storage_object_id: record.storageObjectId,
      content_sha256: createHash("sha256").update(content).digest("hex"),
      processing_status: "uploaded",
      validity_status: "pending",
      valid_from: null,
      valid_until: null,
      ocr_quality_score: "0.9000"
    };
    const fixture = createFakePool((sql) =>
      sql.includes("SELECT\n              dv.condominium_id") ? result([row] as never[]) : result()
    );
    const repository = createPostgresDocumentProcessingRepository(fixture.pool, {
      async readOriginal(input) {
        expect(input).toEqual({ condominiumId, objectId: record.storageObjectId });
        return content;
      }
    });

    await expect(
      repository.loadForProcessing({ condominiumId, documentVersionId: record.documentVersionId })
    ).resolves.toMatchObject({
      content,
      state: { processingStatus: "uploaded", ocrQualityScore: 0.9 }
    });
  });

  it("trata versão ausente e hash divergente como falhas seguras", async () => {
    const missingFixture = createFakePool(() => result());
    const missingRepository = createPostgresDocumentProcessingRepository(missingFixture.pool, {
      async readOriginal() {
        throw new Error("não deveria ler storage");
      }
    });
    await expect(
      missingRepository.loadForProcessing({
        condominiumId,
        documentVersionId: record.documentVersionId
      })
    ).resolves.toBeUndefined();

    const mismatchFixture = createFakePool((sql) =>
      sql.includes("SELECT\n              dv.condominium_id")
        ? result([
            {
              condominium_id: condominiumId,
              document_version_id: record.documentVersionId,
              storage_object_id: record.storageObjectId,
              content_sha256: "b".repeat(64),
              processing_status: "uploaded",
              validity_status: "pending",
              valid_from: null,
              valid_until: null,
              ocr_quality_score: null
            }
          ] as never[])
        : result()
    );
    const mismatchRepository = createPostgresDocumentProcessingRepository(mismatchFixture.pool, {
      async readOriginal() {
        return Buffer.from("outro conteúdo");
      }
    });
    await expect(
      mismatchRepository.loadForProcessing({
        condominiumId,
        documentVersionId: record.documentVersionId
      })
    ).rejects.toThrow("hash");
  });

  it("salva páginas, chunks e resultado final do job", async () => {
    const fixture = createFakePool((sql) =>
      sql.includes("SELECT 1 AS active")
        ? result([
            {
              job_id: "55555555-5555-4555-8555-555555555555",
              condominium_id: condominiumId,
              document_version_id: record.documentVersionId
            }
          ] as never[])
        : result([], 1)
    );
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
          condominiumId,
          documentVersionId: record.documentVersionId,
          pageIndex: 0,
          pageNumber: 1,
          extractedText: "Regra sintética",
          extractionMethod: "pdf_text",
          qualityScore: 1,
          contentSha256: createHash("sha256").update("Regra sintética").digest("hex")
        },
        {
          id: "page-2",
          condominiumId,
          documentVersionId: record.documentVersionId,
          pageIndex: 1,
          pageNumber: 2,
          extractedText: "",
          extractionMethod: "pdf_text",
          qualityScore: 0,
          contentSha256: createHash("sha256").update("").digest("hex")
        }
      ]
    };
    const repository = createPostgresDocumentProcessingRepository(fixture.pool, {
      async readOriginal() {
        return Buffer.from("unused");
      }
    });

    await repository.saveProcessingResult({
      condominiumId,
      documentVersionId: record.documentVersionId,
      jobId: "55555555-5555-4555-8555-555555555555",
      attemptCount: 1,
      outcome
    });

    expect(fixture.queries.some((query) => query.includes("to_tsvector('portuguese'"))).toBe(true);
    expect(fixture.queries.some((query) => query.includes("finished_at = now()"))).toBe(true);
    expect(fixture.queries.at(-1)).toBe("COMMIT");
  });

  it("encerra o job como failed sem páginas quando a extração falha", async () => {
    const fixture = createFakePool((sql) =>
      sql.includes("SELECT 1 AS active")
        ? result([
            {
              job_id: "55555555-5555-4555-8555-555555555555",
              condominium_id: condominiumId,
              document_version_id: record.documentVersionId
            }
          ] as never[])
        : result([], 1)
    );
    const outcome: DocumentProcessingOutcome = {
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
    const repository = createPostgresDocumentProcessingRepository(fixture.pool, {
      async readOriginal() {
        return Buffer.from("unused");
      }
    });

    await repository.saveProcessingResult({
      condominiumId,
      documentVersionId: record.documentVersionId,
      jobId: "55555555-5555-4555-8555-555555555555",
      attemptCount: 1,
      outcome
    });

    expect(fixture.queries.some((query) => query.includes("error_code = $5"))).toBe(true);
  });

  it("faz rollback quando não consegue salvar o estado final", async () => {
    const fixture = createFakePool((sql) => {
      if (sql.includes("SELECT 1 AS active")) {
        return result([
          {
            job_id: "55555555-5555-4555-8555-555555555555",
            condominium_id: condominiumId,
            document_version_id: record.documentVersionId
          }
        ] as never[]);
      }
      if (sql.includes("SET processing_status")) {
        throw new Error("falha ao salvar estado");
      }
      return result([], 1);
    });
    const repository = createPostgresDocumentProcessingRepository(fixture.pool, {
      async readOriginal() {
        return Buffer.from("unused");
      }
    });
    const outcome = {
      status: "completed",
      state: {
        processingStatus: "ready",
        validityStatus: "pending",
        validFrom: null,
        validUntil: null,
        ocrQualityScore: null
      },
      pages: []
    } as DocumentProcessingOutcome;

    await expect(
      repository.saveProcessingResult({
        condominiumId,
        documentVersionId: record.documentVersionId,
        jobId: "55555555-5555-4555-8555-555555555555",
        attemptCount: 1,
        outcome
      })
    ).rejects.toThrow("salvar estado");
    expect(fixture.queries.at(-1)).toBe("ROLLBACK");
  });
});
