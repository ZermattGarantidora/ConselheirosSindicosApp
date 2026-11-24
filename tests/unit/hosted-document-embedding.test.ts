import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { createHostedDocumentEmbeddingAdapter as createEmbedding } from "../../apps/api/documents/hosted-document-embedding.js";
import {
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer
} from "../../apps/api/documents/hosted-document-execution.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";

const content = "Trecho inteiramente sintético da página fotografada.";
const createHostedDocumentEmbeddingAdapter = (options: Parameters<typeof createEmbedding>[0]) =>
  createEmbedding({ ...options, syntheticContractOnly: true });
const input = { content, contentSha256: createHash("sha256").update(content).digest("hex") };
const allow: HostedDocumentTransferAuthorizer = async (request) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic-only"
});
const scope = { apiKey: "synthetic-key", condominiumId: "synthetic-a", documentVersionId: "v1" };

describe("Spec 071 — vetorização documental escopada", () => {
  it("AC-7115: nega sem política e recusa hash/trecho inválidos antes da rede", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapter = createHostedDocumentEmbeddingAdapter({ ...scope, fetch });
    await expect(adapter.embed(input)).rejects.toMatchObject({ code: "transfer_denied" });
    for (const changed of [
      { ...input, contentSha256: "b".repeat(64) },
      { ...input, content: " " },
      { ...input, content: "a".repeat(8193) }
    ])
      await expect(adapter.embed(changed)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    expect(() => createHostedDocumentEmbeddingAdapter({ ...scope, condominiumId: "" })).toThrow(
      "Escopo"
    );
  });

  it("AC-7115: envio mínimo, perfil estável e reutilização somente na mesma versão", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () =>
        Response.json({ data: [{ embedding: Array(768).fill(0.25) }] })
      );
    const authorize = vi.fn(allow),
      adapter = createHostedDocumentEmbeddingAdapter({ ...scope, fetch, authorize });
    const result = await adapter.embed(input);
    await adapter.embed(input);
    expect(fetch).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ dimensions: 768, contentSha256: input.contentSha256 });
    expect(fetch.mock.calls[0]![0]).toBe("https://api.openai.com/v1/embeddings");
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({
      model: "text-embedding-3-small",
      dimensions: 768,
      input: content,
      encoding_format: "float"
    });
    expect(authorize.mock.calls[0]![0]).toMatchObject({
      purpose: "document_embedding",
      condominiumId: "synthetic-a",
      documentVersions: [{ id: "v1", contentSha256: input.contentSha256 }]
    });
    await createHostedDocumentEmbeddingAdapter({
      ...scope,
      fetch,
      authorize,
      documentVersionId: "v2"
    }).embed(input);
    await createHostedDocumentEmbeddingAdapter({
      ...scope,
      fetch,
      authorize,
      condominiumId: "synthetic-b"
    }).embed(input);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each(["dimensions", "http", "empty"])(
    "AC-7115: erro %s não vira vetor válido",
    async (kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () =>
          kind === "http"
            ? new Response("sintético", { status: 500 })
            : Response.json({ data: [{ embedding: kind === "empty" ? [] : [1, 2] }] })
        );
      const adapter = createHostedDocumentEmbeddingAdapter({ ...scope, fetch, authorize: allow });
      await expect(adapter.embed(input)).rejects.toThrow();
    }
  );

  it("AC-7115: recibo durável evita nova chamada após recriar adapter e aplica orçamento", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-embedding-ledger-"));
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () =>
        Response.json({ data: [{ embedding: Array(768).fill(0.25) }] })
      );
    const control = () => ({
      ledger: createSyntheticFileHostedCallLedger({ directory, confirmation: "synthetic-only" }),
      budget: () => ({
        currency: "USD" as const,
        tariffVersion: "synthetic-only",
        maximumCostMicrounits: 10,
        tenantDailyLimitMicrounits: 10,
        globalDailyLimitMicrounits: 10
      })
    });
    try {
      const create = (version = "v1") =>
        createHostedDocumentEmbeddingAdapter({
          ...scope,
          documentVersionId: version,
          fetch,
          authorize: allow,
          callControl: control()
        });
      expect(await create().embed(input)).toEqual(await create().embed(input));
      expect(fetch).toHaveBeenCalledOnce();
      await expect(create("v2").embed(input)).rejects.toMatchObject({ code: "budget_exceeded" });
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      await remove(directory);
    }
  });

  it("AC-7115: cancelamento do job chega ao transporte", async () => {
    const controller = new AbortController();
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true
          })
        )
    );
    const adapter = createHostedDocumentEmbeddingAdapter({
      ...scope,
      fetch,
      authorize: allow,
      signal: controller.signal
    });
    const pending = adapter.embed(input),
      assertion = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await assertion;
  });
});
async function remove(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-embedding-ledger-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
}
