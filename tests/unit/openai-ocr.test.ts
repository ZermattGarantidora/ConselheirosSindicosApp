import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createOpenAiOcrAdapter,
  createOpenAiOcrAdapterFromEnvironment
} from "../../apps/api/documents/openai-ocr.js";

const input = {
  condominiumId: createCondominiumId("alameda"),
  documentVersionId: "version-1",
  content: Buffer.from("%PDF-1.7 sintético")
};

describe("adaptador OCR da OpenAI", () => {
  it("envia somente o PDF do job, desativa armazenamento da resposta e normaliza páginas", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    pages: [
                      { pageIndex: 1, extractedText: "segunda página", qualityScore: 0.9 },
                      { pageIndex: 0, extractedText: "primeira página", qualityScore: 1 }
                    ]
                  })
                }
              ]
            }
          ]
        }),
        { status: 200 }
      )
    );
    const adapter = createOpenAiOcrAdapter({ apiKey: "test-key", fetch });

    await expect(adapter.recognize(input)).resolves.toEqual({
      status: "completed",
      pages: [
        { pageIndex: 0, extractedText: "primeira página", qualityScore: 1 },
        { pageIndex: 1, extractedText: "segunda página", qualityScore: 0.9 }
      ]
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [, request] = fetch.mock.calls[0] ?? [];
    expect(request).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: "gpt-5.6-luna",
      store: false,
      input: [
        {
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "input_file",
              file_data: expect.stringContaining("base64,")
            })
          ])
        }
      ]
    });
  });

  it("não chama a rede sem chave e falha com segurança para erro remoto ou resposta inválida", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const withoutKey = createOpenAiOcrAdapter({ apiKey: " ", fetch });

    await expect(withoutKey.recognize(input)).resolves.toEqual({
      status: "unavailable",
      reason: "not_configured"
    });
    expect(fetch).not.toHaveBeenCalled();

    const failed = createOpenAiOcrAdapter({
      apiKey: "test-key",
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("erro", { status: 500 }))
    });
    await expect(failed.recognize(input)).resolves.toEqual({
      status: "unavailable",
      reason: "failed"
    });
    await expect(createOpenAiOcrAdapterFromEnvironment({}).recognize(input)).resolves.toEqual({
      status: "unavailable",
      reason: "not_configured"
    });
  });

  it("rejeita páginas duplicadas ou fora do contrato", async () => {
    const adapter = createOpenAiOcrAdapter({
      apiKey: "test-key",
      fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      pages: [
                        { pageIndex: 0, extractedText: "a", qualityScore: 1 },
                        { pageIndex: 0, extractedText: "b", qualityScore: 1 }
                      ]
                    })
                  }
                ]
              }
            ]
          }),
          { status: 200 }
        )
      )
    });

    await expect(adapter.recognize(input)).resolves.toEqual({
      status: "unavailable",
      reason: "failed"
    });
  });

  it("aborta chamadas que ultrapassam o prazo do OCR", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async (_url, request) =>
        await new Promise<Response>((_resolve, reject) => {
          request?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true
          });
        })
    );
    const adapter = createOpenAiOcrAdapter({ apiKey: "test-key", fetch, timeoutMs: 1 });

    await expect(adapter.recognize(input)).resolves.toEqual({
      status: "unavailable",
      reason: "failed"
    });
  });
});
