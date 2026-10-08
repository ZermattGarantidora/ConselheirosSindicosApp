import type { DocumentMediaType } from "../documents/document-model.js";
import type { GeneratedEmbedding, EmbeddingAdapter } from "./retrieval-contract.js";

const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
const defaultModel = "gemini-embedding-2";
const dimensions = 768;

export const geminiImageEmbeddingProfile = Object.freeze({
  embeddingProfile: "google-gemini-embedding-2-768-v1",
  providerKey: "google",
  modelKey: defaultModel,
  modelVersion: "stable",
  pipelineVersion: "multimodal-embedding-v1",
  dimensions
});

export interface MultimodalImageEmbeddingAdapter extends EmbeddingAdapter {
  embedImageAndText(
    input: Readonly<{
      content: Buffer;
      mediaType: Extract<DocumentMediaType, "image/jpeg" | "image/png">;
      text: string;
      contentSha256: string;
    }>
  ): Promise<GeneratedEmbedding>;
}

export type GeminiMultimodalEmbeddingOptions = Readonly<{
  apiKey: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>;

type EmbeddingResponse = Readonly<{
  embeddings?: readonly Readonly<{ values?: readonly number[] }>[];
  embedding?: Readonly<{ values?: readonly number[] }>;
}>;

function vectorFromResponse(response: EmbeddingResponse): readonly number[] {
  const values = response.embeddings?.[0]?.values ?? response.embedding?.values;
  if (
    values === undefined ||
    values.length !== dimensions ||
    values.some((value) => !Number.isFinite(value))
  )
    throw new Error("O perfil do embedding multimodal retornado é inválido.");
  return Object.freeze([...values]);
}

export function createGeminiMultimodalEmbeddingAdapter(
  options: GeminiMultimodalEmbeddingOptions
): MultimodalImageEmbeddingAdapter {
  const apiKey = options.apiKey.trim();
  const model = options.model?.trim() || defaultModel;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (apiKey.length === 0 || !Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("A configuração do embedding multimodal é inválida.");
  }
  const endpoint = `${baseUrl}/${encodeURIComponent(model.replace(/^models\//u, ""))}:embedContent`;
  async function request(content: unknown): Promise<readonly number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          content,
          embedContentConfig: { outputDimensionality: dimensions }
        })
      });
      if (!response.ok) throw new Error("A Gemini não gerou o vetor da imagem.");
      return vectorFromResponse((await response.json()) as EmbeddingResponse);
    } catch {
      throw new Error("Não foi possível gerar o vetor multimodal com segurança.");
    } finally {
      clearTimeout(timeout);
    }
  }
  function generated(values: readonly number[], contentSha256: string): GeneratedEmbedding {
    return Object.freeze({ ...geminiImageEmbeddingProfile, values, contentSha256 });
  }
  return Object.freeze({
    profile: geminiImageEmbeddingProfile,
    async embed(input: Parameters<EmbeddingAdapter["embed"]>[0]) {
      const values = await request({ parts: [{ text: input.content }] });
      return generated(values, input.contentSha256);
    },
    async embedImageAndText(
      input: Parameters<MultimodalImageEmbeddingAdapter["embedImageAndText"]>[0]
    ) {
      const values = await request({
        parts: [
          { inline_data: { mime_type: input.mediaType, data: input.content.toString("base64") } },
          { text: input.text }
        ]
      });
      return generated(values, input.contentSha256);
    }
  });
}

export function createGeminiMultimodalEmbeddingAdapterFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation?: typeof globalThis.fetch
): MultimodalImageEmbeddingAdapter | undefined {
  if (
    environment.GEMINI_IMAGE_ANALYSIS_ENABLED?.trim().toLowerCase() !== "true" ||
    environment.GEMINI_PAID_TIER_CONFIRMED?.trim().toLowerCase() !== "true"
  )
    return undefined;
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return undefined;
  const timeoutMs = Number(environment.GEMINI_IMAGE_TIMEOUT_MS);
  return createGeminiMultimodalEmbeddingAdapter({
    apiKey,
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {}),
    ...(fetchImplementation === undefined ? {} : { fetch: fetchImplementation })
  });
}
