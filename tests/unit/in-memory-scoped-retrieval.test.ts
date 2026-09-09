import { describe, expect, it, vi } from "vitest";

import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import type {
  EmbeddingAdapter,
  RetrievableChunk
} from "../../apps/api/retrieval/retrieval-contract.js";
import { createEvidence, managerContext, bosque, alameda } from "./answer-fixtures.js";

function adapterFor(
  values: readonly number[] = [1, 0]
): EmbeddingAdapter & { embed: ReturnType<typeof vi.fn> } {
  const adapter = {
    profile: {
      embeddingProfile: "synthetic-test",
      providerKey: "local",
      modelKey: "synthetic",
      modelVersion: "1",
      pipelineVersion: "embedding-v1",
      dimensions: values.length
    },
    embed: vi.fn(async ({ contentSha256 }: { content: string; contentSha256: string }) => ({
      embeddingProfile: "synthetic-test",
      providerKey: "local",
      modelKey: "synthetic",
      modelVersion: "1",
      pipelineVersion: "embedding-v1",
      dimensions: values.length,
      values: contentSha256.startsWith("0") ? values : values.map((value) => value / 2),
      contentSha256
    }))
  };
  return adapter;
}

function chunk(overrides: Partial<RetrievableChunk> = {}): RetrievableChunk {
  return createEvidence(overrides);
}

describe("índice de retrieval em memória com escopo", () => {
  it("não calcula embedding sem permissão de leitura", async () => {
    const adapter = adapterFor();
    const index = createInMemoryScopedRetrievalIndex([chunk()], adapter);

    await expect(
      index.findAuthorizedCandidates(
        { ...managerContext, permissions: [] },
        {
          query: "área comum",
          limit: 8,
          minimumQualityScore: 0.7,
          asOf: new Date("2026-09-08T00:00:00.000Z")
        }
      )
    ).resolves.toEqual([]);
    expect(adapter.embed).not.toHaveBeenCalled();
  });

  it("filtra o condomínio e a interseção lexical antes do embedding", async () => {
    const adapter = adapterFor();
    const index = createInMemoryScopedRetrievalIndex(
      [
        chunk({ id: "alameda-1", condominiumId: alameda, content: "A regra trata da garagem." }),
        chunk({ id: "bosque-1", condominiumId: bosque, content: "A regra trata da piscina." }),
        chunk({ id: "unrelated", condominiumId: alameda, content: "Calendário de assembleia." })
      ],
      adapter
    );

    const result = await index.findAuthorizedCandidates(managerContext, {
      query: "regra garagem",
      limit: 8,
      minimumQualityScore: 0.7,
      asOf: new Date("2026-09-08T00:00:00.000Z")
    });

    expect(result.map((item) => item.id)).toEqual(["alameda-1"]);
    expect(adapter.embed).toHaveBeenCalledTimes(2);
    expect(adapter.embed.mock.calls[0]?.[0].content).toBe("regra garagem");
  });

  it("retorna vazio sem embedding quando nenhum termo coincide", async () => {
    const adapter = adapterFor();
    const index = createInMemoryScopedRetrievalIndex([chunk()], adapter);

    await expect(
      index.findAuthorizedCandidates(managerContext, {
        query: "seguro inexistente",
        limit: 8,
        minimumQualityScore: 0.7,
        asOf: new Date("2026-09-08T00:00:00.000Z")
      })
    ).resolves.toEqual([]);
    expect(adapter.embed).not.toHaveBeenCalled();
  });

  it("calcula similaridade semântica e trata vetores incompatíveis ou nulos", async () => {
    const adapter = adapterFor([1, 0]);
    adapter.embed
      .mockResolvedValueOnce({
        ...adapter.profile,
        values: [1],
        contentSha256: "0".repeat(64)
      })
      .mockResolvedValueOnce({
        ...adapter.profile,
        values: [0, 0],
        contentSha256: "a".repeat(64)
      });
    const index = createInMemoryScopedRetrievalIndex(
      [chunk({ content: "regra área comum" })],
      adapter
    );

    const result = await index.findAuthorizedCandidates(managerContext, {
      query: "regra área",
      limit: 8,
      minimumQualityScore: 0.7,
      asOf: new Date("2026-09-08T00:00:00.000Z")
    });

    expect(result[0]?.semanticScore).toBe(0);
  });
});
