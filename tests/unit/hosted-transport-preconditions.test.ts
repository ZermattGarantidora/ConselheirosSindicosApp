import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createHostedDocumentProcessingAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import { createHostedDocumentBatchGatewayFactory } from "../../apps/api/answers/hosted-document-batch-gateway.js";
import { createHostedDocumentEmbeddingAdapter } from "../../apps/api/documents/hosted-document-embedding.js";
import {
  hostedDocumentRequestHash,
  createHostedDocumentExecutor
} from "../../apps/api/documents/hosted-document-execution.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { managerContext } from "./answer-fixtures.js";

describe("Spec 071 — transporte exige controlador durável", () => {
  it.each([null, {}, { ledger: {}, budget: () => ({}) }])(
    "AC-7116: configuração malformada não vira modo sem ledger (%j)",
    (callControl) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const options = {
        apiKey: "synthetic-key",
        callControl: callControl as never,
        syntheticContractOnly: true,
        fetch
      };
      expect(createHostedDocumentProcessingAdapters(options).imageAnalysisAdapter).toBeUndefined();
      expect(() => createHostedDocumentExecutor({ callControl: callControl as never })).toThrow(
        "durável"
      );
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it.each(["default", "node-production", "app-production", "contract-without-fetch"])(
    "AC-7116: %s recusa todos os adaptadores antes de transferir dados",
    async (mode) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValue(new Error("Não deveria chamar rede."));
      const authorize = vi.fn(async (request: Parameters<typeof hostedDocumentRequestHash>[0]) => ({
        allowed: true as const,
        requestHash: hostedDocumentRequestHash(request),
        policyRevision: "synthetic-only"
      }));
      vi.stubGlobal("fetch", fetch);
      if (mode === "node-production") vi.stubEnv("NODE_ENV", "production");
      if (mode === "app-production") vi.stubEnv("APP_ENV", "production");
      const options = {
        apiKey: "synthetic-key",
        authorize,
        ...(mode === "default" ? {} : { syntheticContractOnly: true }),
        ...(mode === "contract-without-fetch" ? {} : { fetch })
      };
      try {
        const adapters = createHostedDocumentProcessingAdapters(options);
        expect(adapters.imageAnalysisAdapter).toBeUndefined();
        expect(adapters.photoOcrAdapter).toBeUndefined();
        expect(
          await adapters.ocrAdapter.recognize({
            condominiumId: createCondominiumId("synthetic"),
            documentVersionId: "v1",
            content: Buffer.from("%PDF-1.7 sintético"),
            expectedPageCount: 1
          })
        ).toMatchObject({ status: "unavailable" });
        await expect(
          createHostedDocumentBatchGatewayFactory(options)(
            managerContext,
            "synthetic-chat"
          ).generate({} as never)
        ).rejects.toThrow();
        const content = "Trecho sintético.";
        await expect(
          createHostedDocumentEmbeddingAdapter({
            ...options,
            condominiumId: "synthetic",
            documentVersionId: "v1"
          }).embed({ content, contentSha256: createHash("sha256").update(content).digest("hex") })
        ).rejects.toThrow("durável");
        expect(authorize).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
      }
    }
  );
});
