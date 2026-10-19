import type { EmbeddingAdapter, GeneratedEmbedding } from "./retrieval-contract.js";

const embeddingsUrl = "https://api.openai.com/v1/embeddings";
const defaultModel = "text-embedding-3-small";
const dimensions = 768;

export const openAiImageEmbeddingProfile = Object.freeze({
  embeddingProfile: "openai-text-embedding-3-small-image-description-768-v1",
  providerKey: "openai",
  modelKey: defaultModel,
  modelVersion: "stable",
  pipelineVersion: "image-description-embedding-v1",
  dimensions
});

export type OpenAiImageEmbeddingOptions = Readonly<{
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>;

type ProviderResponse = Readonly<{
  data?: readonly Readonly<{ embedding?: readonly number[] }>[];
}>;

export function createOpenAiImageEmbeddingAdapter(
  options: OpenAiImageEmbeddingOptions
): EmbeddingAdapter {
  const apiKey = options.apiKey.trim();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (apiKey.length === 0 || !Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("A configuração do embedding de fotos é inválida.");
  }

  return Object.freeze({
    profile: openAiImageEmbeddingProfile,
    async embed(input: Parameters<EmbeddingAdapter["embed"]>[0]): Promise<GeneratedEmbedding> {
      if (input.content.trim().length === 0) {
        throw new Error("O texto da foto não pode ser vazio para vetorização.");
      }
      let response: Response;
      try {
        response = await fetchImplementation(embeddingsUrl, {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: defaultModel,
            dimensions,
            input: input.content,
            encoding_format: "float"
          })
        });
      } catch {
        throw new Error("Não foi possível gerar o vetor da foto com segurança.");
      }
      if (!response.ok) throw new Error("A OpenAI não gerou o vetor da foto.");
      let providerResponse: ProviderResponse;
      try {
        providerResponse = (await response.json()) as ProviderResponse;
      } catch {
        throw new Error("A OpenAI retornou um vetor inválido.");
      }
      const values = providerResponse.data?.[0]?.embedding;
      if (
        values === undefined ||
        values.length !== dimensions ||
        values.some((value) => !Number.isFinite(value))
      ) {
        throw new Error("A OpenAI retornou um vetor inválido.");
      }
      return Object.freeze({
        ...openAiImageEmbeddingProfile,
        values: Object.freeze([...values]),
        contentSha256: input.contentSha256
      });
    }
  });
}

export function createOpenAiImageEmbeddingAdapterFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation?: typeof globalThis.fetch
): EmbeddingAdapter | undefined {
  if (
    environment.OPENAI_IMAGE_ANALYSIS_ENABLED?.trim().toLowerCase() !== "true" ||
    environment.OPENAI_IMAGE_BILLING_CONFIRMED?.trim().toLowerCase() !== "true"
  ) {
    return undefined;
  }
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return undefined;
  const timeoutMs = Number(environment.OPENAI_IMAGE_TIMEOUT_MS);
  return createOpenAiImageEmbeddingAdapter({
    apiKey,
    ...(Number.isInteger(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {}),
    ...(fetchImplementation === undefined ? {} : { fetch: fetchImplementation })
  });
}
