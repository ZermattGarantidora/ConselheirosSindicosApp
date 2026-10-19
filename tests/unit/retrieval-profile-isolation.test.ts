import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createPostgresScopedRetrievalIndex } from "../../apps/api/retrieval/postgres-scoped-retrieval.js";
import { openAiImageEmbeddingProfile } from "../../apps/api/retrieval/openai-image-embedding.js";
import { geminiImageEmbeddingProfile } from "../../apps/api/retrieval/gemini-multimodal-embedding.js";
import { createLocalSyntheticEmbeddingAdapter } from "../../apps/api/retrieval/local-embedding.js";
import { managerContext } from "./answer-fixtures.js";

const input = {
  query: "foto sintética",
  limit: 8,
  minimumQualityScore: 0.7,
  asOf: new Date("2026-10-19T12:00:00Z")
};

function poolWithProfiles(storedProfiles: readonly string[]) {
  const queries: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const imageRow = (profile: string) => ({
    chunk_id: profile,
    condominium_id: "alameda",
    document_id: "foto-sintetica",
    document_version_id: "foto-v1",
    version_number: 1,
    document_title: "Foto sintética",
    document_type: "other",
    source_kind: "user_upload",
    source_scope: "condominium",
    page_id: "foto-page",
    page_number: 1,
    start_offset: 0,
    end_offset: 4,
    content: "Foto",
    content_sha256: "a".repeat(64),
    semantic_score: 0.9,
    extraction_method: "image_vision",
    quality_score: 1,
    processing_status: "ready",
    validity_status: "confirmed",
    valid_from: null,
    valid_until: null
  });
  const client = {
    async query(sql: string, parameters: readonly unknown[] = []) {
      queries.push({ sql, parameters });
      if (sql.includes("resolve_user_id"))
        return { rows: [{ user_id: "11111111-1111-4111-8111-111111111111" }] };
      if (sql.includes("SELECT EXISTS"))
        return { rows: [{ available: storedProfiles.includes(String(parameters[1])) }] };
      if (sql.includes("dce.embedding_profile = $1"))
        return {
          rows: storedProfiles.filter((profile) => profile === parameters[0]).map(imageRow)
        };
      return { rows: [] };
    },
    release: vi.fn()
  };
  return { pool: { connect: vi.fn(async () => client as unknown as PoolClient) }, queries };
}

describe("isolamento do perfil de embedding em retrieval", () => {
  it.each([openAiImageEmbeddingProfile, geminiImageEmbeddingProfile])(
    "índice misto usa somente $embeddingProfile",
    async (profile) => {
      const fake = poolWithProfiles([
        openAiImageEmbeddingProfile.embeddingProfile,
        geminiImageEmbeddingProfile.embeddingProfile
      ]);
      const embed = vi.fn(async () => ({
        ...profile,
        values: Array(768).fill(0),
        contentSha256: "0".repeat(64)
      }));
      const index = createPostgresScopedRetrievalIndex(fake.pool, undefined, { profile, embed });
      const result = await index.findAuthorizedCandidates(managerContext, input);
      expect(result.map((item) => item.id)).toEqual([profile.embeddingProfile]);
      expect(fake.queries.find(({ sql }) => sql.includes("SELECT EXISTS"))?.parameters[1]).toBe(
        profile.embeddingProfile
      );
      expect(
        fake.queries.find(({ sql }) => sql.includes("dce.embedding_profile = $1"))?.parameters[0]
      ).toBe(profile.embeddingProfile);
      expect(embed).toHaveBeenCalledOnce();
    }
  );

  it.each([openAiImageEmbeddingProfile, geminiImageEmbeddingProfile])(
    "não chama embedding sem fotos do perfil $embeddingProfile",
    async (profile) => {
      const other =
        profile === openAiImageEmbeddingProfile
          ? geminiImageEmbeddingProfile
          : openAiImageEmbeddingProfile;
      const fake = poolWithProfiles([other.embeddingProfile]);
      const embed = vi.fn(async () => {
        throw new Error("Chamada indevida");
      });
      const result = await createPostgresScopedRetrievalIndex(fake.pool, undefined, {
        profile,
        embed
      }).findAuthorizedCandidates(managerContext, input);
      expect(result).toEqual([]);
      expect(embed).not.toHaveBeenCalled();
      expect(fake.pool.connect).toHaveBeenCalledOnce();
    }
  );

  it.each([
    { embeddingProfile: "outro-perfil" },
    { providerKey: "outro-provedor" },
    { modelKey: "outro-modelo" },
    { modelVersion: "outra-versao" },
    { pipelineVersion: "outro-pipeline" },
    { dimensions: 1 },
    { values: [0] },
    { values: Array(768).fill(Number.NaN) }
  ])("recusa vetor de foto incompatível: %j", async (override) => {
    const profile = geminiImageEmbeddingProfile;
    const fake = poolWithProfiles([profile.embeddingProfile]);
    const embed = vi.fn(async () => ({
      ...profile,
      values: Array(768).fill(0),
      contentSha256: "0".repeat(64),
      ...override
    }));
    await expect(
      createPostgresScopedRetrievalIndex(fake.pool, undefined, {
        profile,
        embed
      }).findAuthorizedCandidates(managerContext, input)
    ).rejects.toThrow("perfil configurado");
    expect(fake.pool.connect).toHaveBeenCalledOnce();
    expect(fake.queries.some(({ sql }) => sql.includes("dce.embedding_profile = $1"))).toBe(false);
  });

  it("também recusa perfil textual divergente antes de abrir conexão", async () => {
    const fake = poolWithProfiles([]);
    const adapter = createLocalSyntheticEmbeddingAdapter();
    const generated = await adapter.embed({ content: input.query, contentSha256: "0".repeat(64) });
    await expect(
      createPostgresScopedRetrievalIndex(fake.pool, {
        profile: adapter.profile,
        async embed() {
          return { ...generated, providerKey: "divergente" };
        }
      }).findAuthorizedCandidates(managerContext, input)
    ).rejects.toThrow("perfil configurado");
    expect(fake.pool.connect).not.toHaveBeenCalled();
  });
});
