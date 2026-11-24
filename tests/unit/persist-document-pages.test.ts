import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { DocumentProcessingOutcome } from "../../apps/api/documents/document-processing.js";
import { createPostgresDocumentProcessingRepository } from "../../apps/api/documents/postgres-document-processing-repository.js";
import {
  chunkPage,
  type EmbeddingAdapter,
  type GeneratedEmbedding
} from "../../apps/api/retrieval/retrieval-contract.js";

const condominiumId = createCondominiumId("alameda");
const profile = {
  embeddingProfile: "synthetic",
  providerKey: "local",
  modelKey: "test",
  modelVersion: "1",
  pipelineVersion: "1",
  dimensions: 2
};

function outcome(count: number): Extract<DocumentProcessingOutcome, { status: "completed" }> {
  return {
    status: "completed",
    state: {
      processingStatus: "ready",
      validityStatus: "confirmed",
      validFrom: null,
      validUntil: null,
      ocrQualityScore: null
    },
    extractionSummary: {
      expectedPageCount: count,
      processedPageCount: count,
      searchablePageCount: count,
      unreadablePageNumbers: [],
      extractionCompleteness: 1,
      extractionMethod: "pdf_text",
      ocrQualityScore: null
    },
    pages: Array.from({ length: count }, (_, index) => {
      const extractedText = `Registro ${index + 1}: '); DROP TABLE app.documents; --\n${"Conteúdo fictício de acompanhamento. ".repeat(100)}`;
      return {
        id: `page-${index}`,
        condominiumId,
        documentVersionId: "version",
        pageIndex: index,
        pageNumber: index + 1,
        extractedText,
        extractionMethod: "pdf_text",
        qualityScore: 1,
        contentSha256: createHash("sha256").update(extractedText).digest("hex")
      };
    })
  };
}

function setup(
  failAtInsert = Infinity,
  transform?: (embedding: GeneratedEmbedding) => GeneratedEmbedding
) {
  let writes = 0;
  const query = vi.fn(async (...args: [sql: string, values?: readonly unknown[]]) => {
    const [sql] = args;
    if (sql.includes("INSERT INTO") && ++writes === failAtInsert) throw new Error("falha no lote");
    return { rows: sql.includes("FROM app.processing_jobs") ? [{ active: 1 }] : [], rowCount: 1 };
  });
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const adapter: EmbeddingAdapter = {
    profile,
    embed: vi.fn(async ({ contentSha256 }) => {
      const embedding = { ...profile, values: [1, 0], contentSha256 };
      return transform?.(embedding) ?? embedding;
    })
  };
  const repository = createPostgresDocumentProcessingRepository(
    { connect: async () => client },
    {
      readOriginal: async () => Buffer.from("unused")
    },
    adapter
  );
  return {
    query,
    release,
    adapter,
    save: (result: DocumentProcessingOutcome) =>
      repository.saveProcessingResult({
        condominiumId,
        documentVersionId: "version",
        jobId: "job",
        attemptCount: 1,
        outcome: result
      })
  };
}

describe("AC-6704: persistência documental em lotes", () => {
  it("grava 300 páginas e seus chunks/vetores em lotes limitados, com vínculos e índices globais", async () => {
    const fake = setup();
    const result = outcome(300);
    await fake.save(result);
    const pages = new Map<string, number>();
    const chunks = new Set<string>();
    const indexes: number[] = [];
    let vectors = 0;
    for (const [sql, values] of fake.query.mock.calls) {
      if (!sql.includes("INSERT INTO")) continue;
      const width = sql.includes("app.document_pages")
        ? 12
        : sql.includes("app.document_chunks")
          ? 10
          : 11;
      expect(values!.length % width).toBe(0);
      expect(values!.length / width).toBeLessThanOrEqual(100);
      expect(sql).not.toContain("DROP TABLE");
      for (let offset = 0; offset < values!.length; offset += width) {
        const row = values!.slice(offset, offset + width);
        expect(row[0]).toBe(condominiumId);
        if (width === 12) {
          expect(row[2]).toBe("version");
          const number = row[4] as number;
          expect(row[3]).toBe(number - 1);
          expect(row[5]).toBe(result.pages[number - 1]!.extractedText);
          pages.set(row[1] as string, number);
        } else if (width === 10) {
          expect(row[2]).toBe("version");
          expect(pages.has(row[3] as string)).toBe(true);
          indexes.push(row[4] as number);
          chunks.add(row[1] as string);
          const text = result.pages[pages.get(row[3] as string)! - 1]!.extractedText;
          expect(
            Array.from(text)
              .slice(row[5] as number, row[6] as number)
              .join("")
          ).toBe(row[7]);
          expect(
            createHash("sha256")
              .update(row[7] as string)
              .digest("hex")
          ).toBe(row[8]);
        } else {
          expect(chunks.has(row[2] as string)).toBe(true);
          expect(row[3]).toBe(profile.embeddingProfile);
          vectors += 1;
        }
      }
    }
    expect(pages.size).toBe(300);
    expect(indexes.length).toBeGreaterThan(1000);
    expect(indexes).toEqual(Array.from({ length: indexes.length }, (_, index) => index));
    expect(vectors).toBe(indexes.length);
    expect(
      fake.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO")).length
    ).toBeLessThan(60);
    expect(fake.query.mock.calls.at(-3)?.[0]).toContain("UPDATE app.document_version_states");
    expect(fake.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(fake.release).toHaveBeenCalledOnce();
  });

  it("reverte falha em lote intermediário sem publicar estado pronto", async () => {
    const fake = setup(5);
    await expect(fake.save(outcome(51))).rejects.toThrow("falha no lote");
    expect(
      fake.query.mock.calls.some(([sql]) => sql.includes("UPDATE app.document_version_states"))
    ).toBe(false);
    expect(fake.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(fake.release).toHaveBeenCalledOnce();
  });

  it.each(["hash", "dimensions", "values", "finite", "tenant"])(
    "reverte vetor ou origem inválidos: %s",
    async (field) => {
      const fake = setup(Infinity, (embedding) =>
        field === "hash"
          ? { ...embedding, contentSha256: "invalid" }
          : field === "dimensions"
            ? { ...embedding, dimensions: 3 }
            : field === "values"
              ? { ...embedding, values: [1] }
              : field === "finite"
                ? { ...embedding, values: [1, NaN] }
                : embedding
      );
      const result = outcome(1);
      const input =
        field === "tenant"
          ? {
              ...result,
              pages: result.pages.map((page) => ({
                ...page,
                condominiumId: createCondominiumId("bosque")
              }))
            }
          : result;
      await expect(fake.save(input)).rejects.toThrow();
      expect(fake.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    }
  );

  it("preserva vetores multimodais e guarda páginas em revisão sem chunks", async () => {
    const result = outcome(1);
    const fake = setup();
    const hash = chunkPage({
      condominiumId,
      documentVersionId: "version",
      documentPageId: "page",
      pageNumber: 1,
      extractedText: result.pages[0]!.extractedText
    })[0]!.contentSha256;
    await fake.save({
      ...result,
      pages: result.pages.map((page) => ({
        ...page,
        multimodalEmbeddings: [{ ...profile, values: [0, 1], contentSha256: hash }]
      }))
    });
    const vectorValues = fake.query.mock.calls
      .filter(([sql]) => sql.includes("INSERT INTO app.document_chunk_embeddings"))
      .flatMap(([, values]) => values ?? []);
    expect(vectorValues.filter((value) => value === "[0,1]")).toHaveLength(1);
    const invalid = setup();
    await expect(
      invalid.save({
        ...result,
        pages: result.pages.map((page) => ({
          ...page,
          multimodalEmbeddings: [{ ...profile, dimensions: 3, values: [0, 1], contentSha256: hash }]
        }))
      })
    ).rejects.toThrow("inválido");
    const review = setup();
    await review.save({
      ...result,
      status: "needs_review",
      reason: "ocr_unavailable",
      state: { ...result.state, processingStatus: "needs_review" }
    });
    expect(review.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO"))).toHaveLength(1);
  });
});
