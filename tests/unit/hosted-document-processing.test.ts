import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDocumentVersion } from "../../apps/api/documents/document-model.js";
import {
  createScopedDocumentProcessor,
  processDocumentVersion,
  type DocumentProcessingInput
} from "../../apps/api/documents/document-processing.js";
import { createHostedDocumentProcessingAdapters as createAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import {
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer
} from "../../apps/api/documents/hosted-document-execution.js";
import { createLocalSyntheticEmbeddingAdapter } from "../../apps/api/retrieval/local-embedding.js";
import { createSyntheticScannedPdf, createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const alameda = createCondominiumId("alameda");
// Estes contratos de transporte usam rede simulada; durabilidade tem ensaios próprios.
const createHostedDocumentProcessingAdapters = (
  options: Parameters<typeof createAdapters>[0] = {}
) => createAdapters({ ...options, syntheticContractOnly: true });
const allow: HostedDocumentTransferAuthorizer = async (request) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic-contract-v1"
});
const key = "synthetic-key-for-mocked-transport";

function processingInput(content = createSyntheticScannedPdf(2)): DocumentProcessingInput {
  return {
    condominiumId: alameda,
    documentId: "document-1",
    documentVersionId: "version-1",
    content,
    currentState: createDocumentVersion({
      id: "version-1",
      condominiumId: alameda,
      documentId: "document-1",
      versionNumber: 1,
      contentSha256: createHash("sha256").update(content).digest("hex"),
      mediaType: "application/pdf",
      sizeBytes: content.length
    }).state
  };
}
function completed(value: unknown, status = "completed"): Response {
  return Response.json({
    status,
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }]
  });
}
const pages = [
  { pageIndex: 0, extractedText: "Regra fictícia da primeira página.", qualityScore: 1 },
  { pageIndex: 1, extractedText: "Regra fictícia da segunda página.", qualityScore: 0.96 }
];
function syntheticPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGu8AAAAASUVORK5CYII=",
    "base64"
  );
}

describe("Spec 071 — OCR/fotos preparados sem envio real", () => {
  it("AC-7101: startup negado e chave sozinha não autorizam leitura", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const disabled = createHostedDocumentProcessingAdapters();
    expect(disabled.imageAnalysisAdapter).toBeUndefined();
    const withoutPermit = createHostedDocumentProcessingAdapters({ apiKey: key, fetch });
    for (const adapters of [disabled, withoutPermit]) {
      const result = await processDocumentVersion({ ...processingInput(), ...adapters });
      expect(result).toMatchObject({
        status: "needs_review",
        state: { processingStatus: "needs_review" }
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("AC-7102: lê todas as páginas com nome genérico, orçamento e origem por versão", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => completed({ pages }));
    const authorize = vi.fn(allow);
    const adapters = createHostedDocumentProcessingAdapters({ apiKey: key, authorize, fetch });
    const input = processingInput();
    const result = await processDocumentVersion({ ...input, ...adapters });
    expect(result).toMatchObject({
      status: "completed",
      extractionSummary: {
        expectedPageCount: 2,
        processedPageCount: 2,
        searchablePageCount: 2,
        extractionCompleteness: 1
      },
      pages: [
        {
          condominiumId: alameda,
          documentVersionId: "version-1",
          pageNumber: 1,
          extractionMethod: "ocr",
          extractedText: pages[0]!.extractedText
        },
        {
          condominiumId: alameda,
          documentVersionId: "version-1",
          pageNumber: 2,
          extractionMethod: "ocr",
          extractedText: pages[1]!.extractedText
        }
      ]
    });
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(fetch.mock.calls[0]![0]).toBe("https://api.openai.com/v1/responses");
    expect(body).toMatchObject({ store: false, max_output_tokens: 16000 });
    expect(body.input[0].content[1]).toEqual({
      type: "input_file",
      filename: "documento.pdf",
      file_data: `data:application/pdf;base64,${input.content.toString("base64")}`
    });
    expect(body).not.toHaveProperty("tools");
    expect(JSON.stringify(authorize.mock.calls)).not.toContain(pages[0]!.extractedText);
    await processDocumentVersion({ ...input, ...adapters });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("AC-7102: mantém PDF textual local sem chamar OCR", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    expect(
      await processDocumentVersion({ ...processingInput(createSyntheticTextPdf()), ...adapters })
    ).toMatchObject({ status: "completed", extractionSummary: { extractionMethod: "pdf_text" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("AC-7102: bytes não mudam entre fingerprint autorizado e envio", async () => {
    const gate = Promise.withResolvers<void>();
    const authorize = vi.fn<HostedDocumentTransferAuthorizer>(async (request) => {
      await gate.promise;
      return allow(request);
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => completed({ pages }));
    const adapters = createHostedDocumentProcessingAdapters({ apiKey: key, authorize, fetch });
    const original = processingInput();
    const expectedBytes = original.content.toString("base64");
    const pending = processDocumentVersion({ ...original, ...adapters });
    await vi.waitFor(() => expect(authorize).toHaveBeenCalledOnce());
    original.content.fill(0);
    gate.resolve();
    expect(await pending).toMatchObject({ status: "completed" });
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(body.input[0].content[1].file_data).toBe(`data:application/pdf;base64,${expectedBytes}`);
  });

  it("AC-7103: prazo do executor aborta OCR sem publicar resultado", async () => {
    const controller = new AbortController();
    const deadline = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () => reject(new Error("timeout")), {
            once: true
          })
        )
    );
    try {
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: key,
        authorize: allow,
        fetch
      });
      const pending = processDocumentVersion({ ...processingInput(), ...adapters });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
      expect(deadline).toHaveBeenCalledWith(60_000);
      controller.abort();
      expect(await pending).toMatchObject({
        status: "needs_review",
        state: { processingStatus: "needs_review" }
      });
    } finally {
      deadline.mockRestore();
    }
  });

  it.each(["missing", "duplicate", "low_quality", "incomplete", "large_text", "bad_json", "http"])(
    "AC-7103: %s fica em revisão e não vira sucesso cacheado",
    async (kind) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
        if (kind === "http") return new Response("DETALHE_PRIVADO", { status: 500 });
        if (kind === "bad_json") return new Response("inválido");
        const result =
          kind === "missing"
            ? [pages[0]]
            : kind === "duplicate"
              ? [pages[0], pages[0]]
              : kind === "low_quality"
                ? [pages[0], { ...pages[1], qualityScore: 0.4 }]
                : kind === "large_text"
                  ? [{ ...pages[0], extractedText: "a".repeat(120001) }, pages[1]]
                  : pages;
        return completed({ pages: result }, kind === "incomplete" ? "incomplete" : "completed");
      });
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: key,
        authorize: allow,
        fetch
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await processDocumentVersion({ ...processingInput(), ...adapters });
        expect(result.status).toBe("needs_review");
        expect(result.state.processingStatus).toBe("needs_review");
        expect(result.extractionSummary.unreadablePageNumbers).toEqual([1, 2]);
      }
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  it("AC-7103: onze páginas ou arquivo inválido falham antes da rede", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    expect(
      await processDocumentVersion({
        ...processingInput(createSyntheticScannedPdf(11)),
        ...adapters
      })
    ).toMatchObject({ status: "needs_review", extractionSummary: { expectedPageCount: 11 } });
    expect(
      await processDocumentVersion({ ...processingInput(Buffer.from("inválido")), ...adapters })
    ).toMatchObject({ status: "failed" });
    await expect(
      adapters.ocrAdapter.recognize({
        condominiumId: alameda,
        documentVersionId: "v",
        content: Buffer.from("inválido"),
        expectedPageCount: 1
      })
    ).resolves.toMatchObject({ status: "unavailable" });
    await expect(
      adapters.ocrAdapter.recognize({
        condominiumId: alameda,
        documentVersionId: "v",
        content: createSyntheticScannedPdf()
      })
    ).resolves.toMatchObject({ status: "unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("AC-7104: condomínio, versão ou bytes diferentes não recebem cache do outro", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => completed({ pages }));
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    const input = processingInput();
    for (const change of [
      {},
      { condominiumId: createCondominiumId("bosque") },
      { documentVersionId: "version-2" },
      { content: Buffer.concat([input.content, Buffer.from("\n% sintético alterado")]) }
    ])
      await processDocumentVersion({ ...input, ...change, ...adapters });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("AC-7107: score alto em balancete OCR não dispensa conferência independente", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
      completed({
        pages: [
          {
            pageIndex: 0,
            extractedText: "Balancete 10/2026\nReceitas: R$ 8.000,00\nDespesas: R$ 3.000,00",
            qualityScore: 1
          }
        ]
      })
    );
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    const result = await processDocumentVersion({
      ...processingInput(createSyntheticScannedPdf()),
      ...adapters
    });
    expect(result).toMatchObject({ status: "needs_review", reason: "ocr_numeric_unverified" });
    expect(result.state.processingStatus).toBe("needs_review");
  });

  it("AC-7105: foto conserva campos visuais e página 1 com embedding apenas local", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
      completed({
        visualDescription: "Uma caixa azul no piso.",
        recognizedText: "Bloco A",
        limitations: "Sem informação sobre sua finalidade."
      })
    );
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    const result = await processDocumentVersion({
      ...processingInput(syntheticPng()),
      ...adapters,
      mediaType: "image/png",
      imageEmbeddingAdapter: createLocalSyntheticEmbeddingAdapter()
    });
    expect(result).toMatchObject({
      status: "completed",
      pages: [
        {
          pageNumber: 1,
          extractionMethod: "image_vision",
          visualDescription: "Uma caixa azul no piso.",
          recognizedText: "Bloco A",
          analysisLimitations: "Sem informação sobre sua finalidade."
        }
      ]
    });
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(body).toMatchObject({ store: false, max_output_tokens: 500 });
    expect(body.input[1].content[1].image_url).toBe(
      `data:image/png;base64,${syntheticPng().toString("base64")}`
    );
    const denied = createHostedDocumentProcessingAdapters({ apiKey: key, fetch });
    expect(
      await processDocumentVersion({
        ...processingInput(syntheticPng()),
        ...denied,
        mediaType: "image/png",
        imageEmbeddingAdapter: createLocalSyntheticEmbeddingAdapter()
      })
    ).toMatchObject({ status: "needs_review", reason: "image_analysis_failed" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("AC-7105: foto inválida ou resposta ilegível não fica pronta", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => completed({ visualDescription: "" }));
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    for (const content of [Buffer.from("png falso"), syntheticPng()]) {
      expect(
        await processDocumentVersion({
          ...processingInput(content),
          ...adapters,
          mediaType: "image/png",
          imageEmbeddingAdapter: createLocalSyntheticEmbeddingAdapter()
        })
      ).toMatchObject({ status: "needs_review", reason: "image_analysis_failed" });
    }
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("AC-7103: sinal do job aborta transporte e impede salvar resultado cancelado", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () => reject(new Error("cancelado")), {
            once: true
          })
        )
    );
    const adapters = createHostedDocumentProcessingAdapters({
      apiKey: key,
      authorize: allow,
      fetch
    });
    const stored = processingInput();
    const saveProcessingResult = vi.fn();
    const processor = createScopedDocumentProcessor(
      {
        loadForProcessing: async () => ({ ...stored, state: stored.currentState }),
        saveProcessingResult
      },
      adapters.ocrAdapter
    );
    const controller = new AbortController();
    const pending = processor.process({
      condominiumId: alameda,
      documentVersionId: "version-1",
      jobId: "job-1",
      attemptCount: 1,
      signal: controller.signal
    });
    const assertion = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await assertion;
    expect(saveProcessingResult).not.toHaveBeenCalled();
  });

  it("AC-7104: repositório que devolve versão de outro tenant falha antes da leitura externa", async () => {
    const stored = processingInput();
    const ocr = { recognize: vi.fn() };
    const saveProcessingResult = vi.fn();
    const processor = createScopedDocumentProcessor(
      {
        loadForProcessing: async () => ({
          ...stored,
          condominiumId: createCondominiumId("bosque"),
          state: stored.currentState
        }),
        saveProcessingResult
      },
      ocr
    );
    await expect(
      processor.process({
        condominiumId: alameda,
        documentVersionId: "version-1",
        jobId: "job-1",
        attemptCount: 1
      })
    ).rejects.toThrow("não pertence");
    expect(ocr.recognize).not.toHaveBeenCalled();
    expect(saveProcessingResult).not.toHaveBeenCalled();
  });
});
