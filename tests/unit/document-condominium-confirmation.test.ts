import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  confirmDocumentCondominium,
  requestDocumentConversation,
  requestDocumentConversationReply,
  requestDocumentBatchSummary,
  DocumentCondominiumConfirmation,
  DocumentCondominiumConfirmationRequiredError
} from "../../apps/web/document-condominium-confirmation.js";
import {
  sendDocumentMessage,
  waitForDocumentProcessing
} from "../../apps/web/document-processing-request.js";
import type { DocumentCondominiumCheck } from "../../apps/api/documents/document-condominium-check.js";
import { singleGenerationRequestTimeoutMs } from "../../apps/shared/generation-limits.js";

const check: DocumentCondominiumCheck = {
  status: "pending",
  expectedName: "Residencial Alameda",
  detectedNames: ["Condomínio Bosque"],
  sources: [{ name: "Condomínio Bosque", source: "text", page: 1 }],
  resumeProcessingStatus: "ready"
};

describe("confirmação de condomínio no chat — RQ-3702/RQ-3703", () => {
  it("AC-3707: a fala da Alvitra não cria caixa de opções", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentCondominiumConfirmation, {
        message: "O arquivo identifica outro condomínio. Posso usá-lo aqui?"
      })
    );
    expect(html).toContain("Posso usá-lo aqui?");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("document-confirmation-actions");
  });

  const summary = {
    answer: "O mandato é de dois anos. Quer conferir a eleição?",
    answerMode: "grounded",
    citations: [],
    attentionPoints: [],
    suggestedNextStep: null,
    specialist: { required: false, type: null, reason: null }
  };
  const summaryInput = { condominiumId: "alameda", documentVersionIds: ["v1"], headers: {} };
  it("AC-5817: envia a legenda literal junto das versões do lote", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ summary })));
    await requestDocumentBatchSummary(transport, {
      ...summaryInput,
      message: "Vou reenviar o documento completo."
    });
    expect(JSON.parse(String(transport.mock.calls[0]![1]!.body))).toEqual({
      documentVersionIds: ["v1"],
      message: "Vou reenviar o documento completo."
    });
  });

  it("AC-5712: recebe uma análise após 60 segundos sem abortar ou repetir o pedido", async () => {
    vi.useFakeTimers();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("native timeout", "TimeoutError")), delay);
      return controller.signal;
    });
    const transport = vi.fn<typeof fetch>(
      (_url, options) =>
        new Promise((resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), {
            once: true
          });
          setTimeout(() => resolve(Response.json({ summary })), 65_000);
        })
    );
    try {
      const response = requestDocumentBatchSummary(transport, summaryInput);
      await vi.advanceTimersByTimeAsync(65_000);
      await expect(response).resolves.toEqual(summary);
      expect(timeout).toHaveBeenCalledWith(singleGenerationRequestTimeoutMs);
      expect(transport).toHaveBeenCalledOnce();
    } finally {
      timeout.mockRestore();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it.each([
    null,
    {},
    { summary: null },
    { summary: { ...summary, answer: " " } },
    { summary: { ...summary, specialist: null } },
    { summary: { ...summary, citations: [null] } },
    { summary: { ...summary, attentionPoints: null } }
  ])("AC-5712: recusa contrato incompleto sem exibir fala vazia", async (body) => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(body));
    await expect(requestDocumentBatchSummary(transport, summaryInput)).rejects.toThrow(
      "resposta incompleta"
    );
    expect(transport).toHaveBeenCalledOnce();
  });

  it("AC-5712: recusa JSON quebrado sem copiar a resposta ao erro", async () => {
    await expect(
      requestDocumentBatchSummary(async () => new Response("PRIVADO{invalid"), summaryInput)
    ).rejects.toThrow("resposta incompleta");
  });

  it.each(["TimeoutError", "AbortError", "TypeError"])(
    "AC-5712: falha %s informa o estado em português sem reenvio",
    async (name) => {
      const transport = vi.fn<typeof fetch>(async () => {
        throw new DOMException("DETALHE_PRIVADO", name);
      });
      const error = await requestDocumentBatchSummary(transport, summaryInput).catch(
        (caught: unknown) => caught
      );
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        name === "TypeError" ? "conexão" : "tempo de espera"
      );
      expect((error as Error).message).not.toContain("DETALHE_PRIVADO");
      expect(transport).toHaveBeenCalledOnce();
    }
  );

  it.each([null, {}, { status: "available", title: "Raio-X", rows: null, limitations: [] }])(
    "AC-5712: snapshot incompleto não dispara uma geração adicional",
    async (snapshot) => {
      const transport = vi.fn<typeof fetch>(async () =>
        Response.json({ message: "Fala recebida", snapshot })
      );
      await expect(
        requestDocumentConversationReply(transport, {
          condominiumId: "alameda",
          documentVersionId: "v1",
          headers: {},
          event: "status"
        })
      ).rejects.toThrow("A Alvitra não conseguiu conversar");
      expect(transport).toHaveBeenCalledOnce();
    }
  );

  it("recusa corpo nulo na fala de confirmação com erro recuperável", async () => {
    await expect(
      requestDocumentConversation(async () => Response.json(null), {
        condominiumId: "alameda",
        documentVersionId: "v1",
        headers: {},
        event: "status"
      })
    ).rejects.toThrow("A Alvitra não conseguiu conversar");
  });

  it("AC-5704: documento pronto recebe a síntese gerada em vez do relatório", async () => {
    const answer = {
      answer: "Os saldos divergem. Quer conferir o extrato?",
      answerMode: "grounded",
      citations: [],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: false, type: null, reason: null }
    };
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Confira o relatório abaixo.",
            snapshot: { status: "available", title: "Raio-X", rows: [], limitations: [] }
          })
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ summary: answer })));
    await expect(
      requestDocumentConversationReply(transport, {
        condominiumId: "A/B",
        documentVersionId: "v/1",
        headers: { "x-development-user-id": "synthetic" },
        event: "confirmed"
      })
    ).resolves.toEqual({ text: "", answer });
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport).toHaveBeenLastCalledWith(
      "/v1/condominiums/A%2FB/documents/conversation",
      expect.objectContaining({
        body: JSON.stringify({ documentVersionIds: ["v/1"] }),
        headers: { "x-development-user-id": "synthetic", "content-type": "application/json" }
      })
    );
  });

  it("AC-5704/5710: conserva a fala de confirmação pendente sem tentar sintetizar", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Posso usar este arquivo neste condomínio?" }))
      );
    await expect(
      requestDocumentConversationReply(transport, {
        condominiumId: "alameda",
        documentVersionId: "v1",
        headers: {},
        event: "status"
      })
    ).resolves.toEqual({ text: "Posso usar este arquivo neste condomínio?" });
    expect(transport).toHaveBeenCalledOnce();
  });

  it.each([413, 503])(
    "AC-5710: falha %s não promete relatório nem inventa fala",
    async (status) => {
      const transport = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              snapshot: { status: "limited", title: "Raio-X", rows: [], limitations: [] }
            })
          )
        )
        .mockResolvedValueOnce(new Response("{}", { status }));
      await expect(
        requestDocumentConversationReply(transport, {
          condominiumId: "alameda",
          documentVersionId: "v1",
          headers: {},
          event: "confirmed"
        })
      ).rejects.toThrow(
        status === 413 ? "O material excedeu o limite" : "A análise não foi concluída"
      );
      await expect(
        requestDocumentBatchSummary(async () => new Response("{}", { status }), {
          condominiumId: "alameda",
          documentVersionIds: ["v1"],
          headers: {}
        })
      ).rejects.not.toThrow(/relatório|conferência local|envie menos arquivos/iu);
    }
  );

  it.each([
    [413, {}, "O material excedeu o limite desta análise."],
    [503, { code: "analysis_unavailable" }, "A Alvitra não conseguiu concluir a análise agora."],
    [502, { code: "answer_validation_failed" }, "A resposta não passou pela validação documental."],
    [503, { code: "analysis_failed" }, "A análise falhou. O arquivo foi recebido."]
  ] as const)(
    "AC-5711: explica a falha %s sem recomendar menos arquivos",
    async (status, body, copy) => {
      await expect(
        requestDocumentBatchSummary(async () => Response.json(body, { status }), {
          condominiumId: "alameda",
          documentVersionIds: ["v1"],
          headers: {}
        })
      ).rejects.toThrow(copy);
    }
  );
  it("mostra os dois nomes na fala da Alvitra, com decisão pelo compositor", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentCondominiumConfirmation, {
        message:
          "O arquivo Ata.pdf identifica Condomínio Bosque. Posso usá-lo em Residencial Alameda, preservando o nome cadastrado?"
      })
    );
    expect(html).toContain("Condomínio Bosque");
    expect(html).toContain("Residencial Alameda");
    expect(html).toContain("preservando o nome cadastrado?");
    expect(html).not.toContain("<button");
    expect(html).toContain('class="assistant-message document-confirmation-message"');
    expect(html).not.toContain("Conferir condomínio ·");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("document-condominium-confirmation");
  });
  it("escapa nomes documentais hostis na fala normal", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentCondominiumConfirmation, {
        message: "O arquivo cita <script>alert(1)</script>. Posso usá-lo aqui?"
      })
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<button");
  });
  it("interrompe o envio com a pendência e não consulta a pergunta", async () => {
    const ask = vi.fn();
    const sending = sendDocumentMessage({
      message: "Qual é a regra?",
      receive: async () => {},
      waitUntilProcessed: () =>
        waitForDocumentProcessing(
          async () =>
            new Response(
              JSON.stringify({
                documents: [
                  {
                    documentVersionId: "v1",
                    processingStatus: "needs_review",
                    condominiumCheck: check
                  }
                ]
              })
            ),
          {
            condominiumId: "alameda",
            documentVersionId: "v1",
            headers: {},
            signal: AbortSignal.timeout(1000)
          }
        ),
      ask
    });
    await expect(sending).rejects.toBeInstanceOf(DocumentCondominiumConfirmationRequiredError);
    expect(ask).not.toHaveBeenCalled();
  });
  it("posta decisão sem aceitar troca de contexto nem nome fornecido pelo documento", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    await confirmDocumentCondominium(transport, {
      condominiumId: "A/B",
      documentVersionId: "v/1",
      headers: { "x-development-user-id": "synthetic" }
    });
    expect(transport).toHaveBeenCalledWith(
      "/v1/condominiums/A%2FB/documents/v%2F1/confirm-condominium",
      expect.objectContaining({
        method: "POST",
        body: '{"confirm":true}',
        credentials: "same-origin"
      })
    );
  });
  it("AC-3707: envia a resposta digitada sem inventar uma mensagem de usuário", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    await confirmDocumentCondominium(transport, {
      condominiumId: "alameda",
      documentVersionId: "v1",
      headers: {},
      message: "Sim, pode usar!"
    });
    expect(JSON.parse(String(transport.mock.calls[0]![1]!.body))).toEqual({
      confirm: true,
      message: "Sim, pode usar!"
    });
  });
  it("não apresenta sucesso se a decisão for negada", async () => {
    await expect(
      confirmDocumentCondominium(async () => new Response("{}", { status: 403 }), {
        condominiumId: "alameda",
        documentVersionId: "v1",
        headers: {}
      })
    ).rejects.toThrow("Não foi possível confirmar");
  });

  it("obtém a fala gerada sem enviar nomes, título ou mensagem ao endpoint", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ message: "Fala gerada." })));
    await expect(
      requestDocumentConversation(transport, {
        condominiumId: "A/B",
        documentVersionId: "v/1",
        headers: {},
        event: "status"
      })
    ).resolves.toBe("Fala gerada.");
    expect(transport).toHaveBeenCalledWith(
      "/v1/condominiums/A%2FB/documents/v%2F1/conversation",
      expect.objectContaining({
        method: "POST",
        body: '{"event":"status"}',
        credentials: "same-origin"
      })
    );
    for (const response of [new Response("{}", { status: 503 }), new Response("{}")])
      await expect(
        requestDocumentConversation(async () => response, {
          condominiumId: "alameda",
          documentVersionId: "v1",
          headers: {},
          event: "status"
        })
      ).rejects.toThrow("A Alvitra não conseguiu conversar");
  });
});
