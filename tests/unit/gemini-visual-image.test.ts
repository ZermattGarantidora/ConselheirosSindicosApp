import { describe, expect, it, vi } from "vitest";

import {
  createGeminiImageAnalysisAdapter,
  createGeminiImageAnalysisAdapterFromEnvironment
} from "../../apps/api/documents/gemini-image-analysis.js";
import {
  createGeminiMultimodalEmbeddingAdapter,
  createGeminiMultimodalEmbeddingAdapterFromEnvironment,
  geminiImageEmbeddingProfile
} from "../../apps/api/retrieval/gemini-multimodal-embedding.js";

const gates = {
  GEMINI_IMAGE_ANALYSIS_ENABLED: "true",
  GEMINI_PAID_TIER_CONFIRMED: "true",
  GEMINI_API_KEY: "synthetic-test-key"
};

describe("integrações sintéticas de imagem Gemini", () => {
  it("exige as confirmações operacionais antes de criar os adaptadores", () => {
    expect(createGeminiImageAnalysisAdapterFromEnvironment({})).toBeUndefined();
    expect(
      createGeminiImageAnalysisAdapterFromEnvironment({
        ...gates,
        GEMINI_PAID_TIER_CONFIRMED: "false"
      })
    ).toBeUndefined();
    expect(
      createGeminiImageAnalysisAdapterFromEnvironment({ ...gates, GEMINI_API_KEY: " " })
    ).toBeUndefined();
    expect(
      createGeminiMultimodalEmbeddingAdapterFromEnvironment({
        ...gates,
        GEMINI_IMAGE_ANALYSIS_ENABLED: "false"
      })
    ).toBeUndefined();
    expect(createGeminiMultimodalEmbeddingAdapterFromEnvironment(gates)).toBeDefined();
  });

  it("analisa uma imagem sintética sem misturar descrição e texto percebido", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    visualDescription: "Uma caixa azul sobre o piso.",
                    recognizedText: "Bloco A",
                    limitations: "A finalidade da caixa não pode ser inferida."
                  })
                }
              ]
            }
          }
        ]
      })
    );
    const adapter = createGeminiImageAnalysisAdapter({ apiKey: gates.GEMINI_API_KEY, fetch });

    const result = await adapter.analyze({
      condominiumId: "alameda",
      documentVersionId: "versao-sintetica",
      content: Buffer.from("imagem sintética"),
      mediaType: "image/jpeg"
    });

    expect(result).toMatchObject({
      visualDescription: "Uma caixa azul sobre o piso.",
      recognizedText: "Bloco A"
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("mantém imagem e consulta textual no mesmo perfil vetorial Gemini", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ embedding: { values: Array(768).fill(0.25) } })
    );
    const adapter = createGeminiMultimodalEmbeddingAdapter({ apiKey: gates.GEMINI_API_KEY, fetch });
    const photoVector = await adapter.embedImageAndText({
      content: Buffer.from("foto sintética"),
      mediaType: "image/png",
      text: "Observação visual sintética.",
      contentSha256: "a".repeat(64)
    });
    const queryVector = await adapter.embed({
      content: "onde está a caixa?",
      contentSha256: "0".repeat(64)
    });

    expect(photoVector).toMatchObject({
      embeddingProfile: geminiImageEmbeddingProfile.embeddingProfile,
      dimensions: 768
    });
    expect(queryVector.embeddingProfile).toBe(photoVector.embeddingProfile);
  });

  it("falha fechado quando a análise não contém JSON válido", async () => {
    const adapter = createGeminiImageAnalysisAdapter({
      apiKey: gates.GEMINI_API_KEY,
      fetch: async () =>
        Response.json({ candidates: [{ content: { parts: [{ text: "não é JSON" }] } }] })
    });

    await expect(
      adapter.analyze({
        condominiumId: "alameda",
        documentVersionId: "versao-sintetica",
        content: Buffer.from("foto sintética"),
        mediaType: "image/png"
      })
    ).rejects.toThrow("com segurança");
  });

  it("rejeita vetor inválido e resposta HTTP indisponível", async () => {
    const malformed = createGeminiMultimodalEmbeddingAdapter({
      apiKey: gates.GEMINI_API_KEY,
      fetch: async () => Response.json({ embedding: { values: [1, 2] } })
    });
    await expect(
      malformed.embed({ content: "busca", contentSha256: "0".repeat(64) })
    ).rejects.toThrow("com segurança");

    const unavailable = createGeminiMultimodalEmbeddingAdapter({
      apiKey: gates.GEMINI_API_KEY,
      fetch: async () => new Response(null, { status: 503 })
    });
    await expect(
      unavailable.embed({ content: "busca", contentSha256: "0".repeat(64) })
    ).rejects.toThrow("com segurança");
  });
});
