import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createHostedDocumentProcessingAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import { unavailableOcrAdapter } from "../../apps/api/documents/ocr-quality.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createSyntheticScannedPdf } from "../fixtures/synthetic-pdfs.js";

describe("degradação local sem provedor", () => {
  it("limita o modo offline à demonstração, não libera novo cadastro e inicia chat novo com saudação segura", async () => {
    const source = await readFile("apps/web/App.tsx", "utf8");
    expect(source).toContain(
      'const offlineDemo = authMode === "development" && aiProvider === "local"'
    );
    expect(source).toMatch(
      /if \(offlineDemo && \(input.stage === "welcome" \|\| input.stage === "returning"\)\)\s*return "";/u
    );
    expect(source).toContain('offlineDemo && input.stage === "new_conversation"');
    expect(source).toContain("Como posso ajudar você agora?");
    expect(source).toContain('className="operational-notice" role="status"');
    expect(source).toContain('message.text.trim() !== ""');
    expect(source.match(/offlineDemo && setupStage !== "complete"/gu)).toHaveLength(2);
    expect(source.replace(/\s+/gu, " ")).toContain(
      "A configuração conversacional de um novo perfil está indisponível"
    );
    expect(source).not.toContain("managerName: selectedIdentity.displayName");
  });

  it("servidor e worker nunca habilitam OCR de uploads a partir de flags", async () => {
    for (const path of ["apps/api/app/server.ts", "apps/api/worker/worker.ts"]) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("createOpenAiOcrAdapterFromEnvironment");
      expect(source).toContain("createHostedDocumentProcessingAdapters()");
    }
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("OPENAI_OCR_ENABLED", "true");
    vi.stubEnv("OPENAI_OCR_API_KEY", "synthetic-test-key");
    vi.stubEnv("OPENAI_IMAGE_ANALYSIS_ENABLED", "true");
    vi.stubEnv("OPENAI_IMAGE_BILLING_CONFIRMED", "true");
    try {
      // The same zero-argument factory used by startup ignores environment flags and keys.
      const adapters = createHostedDocumentProcessingAdapters();
      expect(adapters.ocrAdapter).toBe(unavailableOcrAdapter);
      expect(adapters.imageAnalysisAdapter).toBeUndefined();
      expect(adapters.photoOcrAdapter).toBeUndefined();
      await expect(
        adapters.ocrAdapter.recognize({
          condominiumId: createCondominiumId("synthetic-offline-tenant"),
          documentVersionId: "synthetic-offline-version",
          content: createSyntheticScannedPdf(),
          expectedPageCount: 1
        })
      ).resolves.toMatchObject({ status: "unavailable" });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
