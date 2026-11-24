import { createHash } from "node:crypto";
import {
  createOpenAiImageEmbeddingAdapter,
  openAiImageEmbeddingProfile
} from "../retrieval/openai-image-embedding.js";
import type { EmbeddingAdapter, GeneratedEmbedding } from "../retrieval/retrieval-contract.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentEmbeddingsDestination,
  hostedDocumentTransportConfigured,
  type HostedDocumentTransferAuthorizer,
  type HostedDocumentCallControl
} from "./hosted-document-execution.js";

/** Fábrica por versão/job, sem ativação por ambiente e sem alterar o perfil vetorial existente. */
export function createHostedDocumentEmbeddingAdapter(
  options: Readonly<{
    apiKey: string;
    condominiumId: string;
    documentVersionId: string;
    authorize?: HostedDocumentTransferAuthorizer;
    callControl?: HostedDocumentCallControl;
    syntheticContractOnly?: boolean;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
  }>
): EmbeddingAdapter {
  options = Object.freeze({ ...options });
  if (!options.condominiumId.trim() || !options.documentVersionId.trim())
    throw new Error("Escopo de vetorização inválido.");
  const executor = createHostedDocumentExecutor({
    ...(options.authorize === undefined ? {} : { authorize: options.authorize }),
    ...(options.callControl === undefined ? {} : { callControl: options.callControl })
  });
  const validate = (result: GeneratedEmbedding, hash: string) => {
    if (
      !result ||
      result.contentSha256 !== hash ||
      result.embeddingProfile !== openAiImageEmbeddingProfile.embeddingProfile ||
      result.dimensions !== 768 ||
      !Array.isArray(result.values) ||
      result.values.length !== 768 ||
      result.values.some((value) => !Number.isFinite(value))
    )
      throw new Error("O vetor documental não passou pela validação.");
    return result;
  };
  return {
    profile: openAiImageEmbeddingProfile,
    async embed(input) {
      if (!hostedDocumentTransportConfigured(options))
        throw new Error("O controlador durável da vetorização está indisponível.");
      const content = input.content,
        contentSha256 = input.contentSha256;
      if (
        !content.trim() ||
        content.length > 8192 ||
        createHash("sha256").update(content).digest("hex") !== contentSha256
      )
        throw new Error("O trecho não corresponde ao hash autorizado.");
      const result = await executor.execute(
        {
          purpose: "document_embedding",
          destination: hostedDocumentEmbeddingsDestination,
          model: openAiImageEmbeddingProfile.modelKey,
          condominiumId: options.condominiumId,
          documentVersions: [
            { id: options.documentVersionId, contentKind: "evidence_bundle", contentSha256 }
          ],
          payloadSha256: contentSha256,
          inputBytes: Buffer.byteLength(content),
          pageCount: 0,
          maximumOutputTokens: 0,
          processorVersion: openAiImageEmbeddingProfile.embeddingProfile
        },
        async (signal) => {
          const raw = createOpenAiImageEmbeddingAdapter({
            apiKey: options.apiKey,
            fetch: (url, init) =>
              (options.fetch ?? globalThis.fetch)(url, {
                ...init,
                signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal
              })
          });
          return validate(await raw.embed({ content, contentSha256 }), contentSha256);
        },
        options.signal
      );
      return validate(result, contentSha256);
    }
  };
}
