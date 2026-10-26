import { describe, expect, it, vi } from "vitest";
import {
  documentProcessingLabel,
  sendDocumentMessage,
  waitForDocumentProcessing
} from "../../apps/web/document-processing-request.js";
import { loadDocumentOriginal } from "../../apps/web/DocumentViewer.js";

describe("mensagem e anexo no mesmo envio", () => {
  it("preserva a mensagem e consulta uma vez somente depois da leitura", async () => {
    const order: string[] = [];
    let finish!: () => void;
    const reading = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const ask = vi.fn(async (message: string) => {
      order.push(message);
    });
    const sending = sendDocumentMessage({
      message: "  Confira o mandato desta ata.  ",
      receive: async () => {
        order.push("recebido");
      },
      waitUntilProcessed: async () => {
        await reading;
        order.push("pronto");
        return "ready";
      },
      ask
    });
    await Promise.resolve();
    expect(order).toEqual(["recebido"]);
    expect(ask).not.toHaveBeenCalled();
    finish();
    await sending;
    expect(order).toEqual(["recebido", "pronto", "Confira o mandato desta ata."]);
    expect(ask).toHaveBeenCalledOnce();
  });

  it.each(["needs_review", "failed"] as const)(
    "não consulta como se um arquivo %s estivesse pronto",
    async (status) => {
      const ask = vi.fn();
      await expect(
        sendDocumentMessage({
          message: "Analise a ata.",
          receive: async () => {},
          waitUntilProcessed: async () => status,
          ask
        })
      ).rejects.toThrow();
      expect(ask).not.toHaveBeenCalled();
    }
  );

  it.each(["ready", "needs_review", "failed"] as const)(
    "não inventa pergunta no envio sem texto (%s)",
    async (status) => {
      const ask = vi.fn();
      await sendDocumentMessage({
        message: " ",
        receive: async () => {},
        waitUntilProcessed: async () => status,
        ask
      });
      expect(ask).not.toHaveBeenCalled();
    }
  );

  it("não consulta nem acompanha leitura quando o upload falha", async () => {
    const waitUntilProcessed = vi.fn();
    const ask = vi.fn();
    await expect(
      sendDocumentMessage({
        message: "Pergunta preservada",
        receive: async () => {
          throw new Error("upload indisponível");
        },
        waitUntilProcessed,
        ask
      })
    ).rejects.toThrow("upload indisponível");
    expect(waitUntilProcessed).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });
});

describe("acompanhamento da versão enviada", () => {
  it("distingue revisão e falha de um documento ainda em processamento", () => {
    expect(
      ["ready", "needs_review", "failed", "uploaded", "processing"].map(documentProcessingLabel)
    ).toEqual([
      "Disponível para consulta",
      "Leitura precisa de revisão",
      "Falha na leitura",
      "Em processamento",
      "Em processamento"
    ]);
  });
  const options = {
    condominiumId: "condominio A",
    documentVersionId: "versao-enviada",
    headers: { "x-development-user-id": "gestor-sintetico" },
    signal: new AbortController().signal
  };
  const catalog = (status: string) =>
    new Response(
      JSON.stringify({
        documents: [
          { documentVersionId: "versao-antiga", processingStatus: "ready" },
          { documentVersionId: "versao-enviada", processingStatus: status }
        ]
      })
    );

  it("espera a versão exata com autorização e sem cache", async () => {
    vi.useFakeTimers();
    try {
      const fetchRequest = vi
        .fn()
        .mockResolvedValueOnce(catalog("processing"))
        .mockResolvedValueOnce(catalog("ready"));
      const waiting = waitForDocumentProcessing(fetchRequest, options);
      await vi.advanceTimersByTimeAsync(1000);
      await expect(waiting).resolves.toBe("ready");
      expect(fetchRequest).toHaveBeenCalledTimes(2);
      expect(fetchRequest).toHaveBeenCalledWith(
        "/v1/condominiums/condominio%20A/documents",
        expect.objectContaining({
          credentials: "same-origin",
          cache: "no-store",
          headers: options.headers
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("interrompe a espera no limite e não envia pergunta", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const ask = vi.fn();
      const waiting = sendDocumentMessage({
        message: "Pergunta original",
        receive: async () => {},
        waitUntilProcessed: () =>
          waitForDocumentProcessing(async () => catalog("processing"), {
            ...options,
            signal: controller.signal
          }),
        ask
      });
      const rejected = expect(waiting).rejects.toThrow("limite");
      setTimeout(() => controller.abort(new Error("limite")), 60_000);
      await vi.advanceTimersByTimeAsync(60_000);
      await rejected;
      expect(ask).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([403, 500, 200])(
    "falha com acesso negado, erro ou versão removida (%s)",
    async (status) => {
      await expect(
        waitForDocumentProcessing(
          async () => new Response(JSON.stringify({ documents: [] }), { status }),
          options
        )
      ).rejects.toThrow();
    }
  );
});

describe("arquivo original para visualização", () => {
  const document = {
    condominiumId: "cond A",
    documentVersionId: "versao/1",
    title: "Ata.pdf",
    page: 2
  };
  it.each(["application/pdf", "image/png", "image/jpeg"])(
    "carrega todos os bytes de %s sem converter em texto",
    async (mediaType) => {
      const fetchRequest = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(new Uint8Array([1, 4, 255, 0]), { headers: { "content-type": mediaType } })
        );
      const headers = { "x-development-user-id": "gestor-sintetico" };
      const blob = await loadDocumentOriginal(
        fetchRequest,
        document,
        headers,
        new AbortController().signal
      );
      expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 4, 255, 0]);
      expect(fetchRequest).toHaveBeenCalledWith(
        "/v1/condominiums/cond%20A/documents/versao%2F1/file",
        expect.objectContaining({ credentials: "same-origin", cache: "no-store", headers })
      );
    }
  );
  it("recusa HTML devolvido como original", async () => {
    await expect(
      loadDocumentOriginal(
        async () =>
          new Response("<script>hostil</script>", { headers: { "content-type": "text/html" } }),
        document,
        {},
        new AbortController().signal
      )
    ).rejects.toThrow("segura");
  });
});
