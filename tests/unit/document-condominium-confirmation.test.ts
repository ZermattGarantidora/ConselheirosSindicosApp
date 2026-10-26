import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  confirmDocumentCondominium,
  DocumentCondominiumConfirmation,
  DocumentCondominiumConfirmationRequiredError
} from "../../apps/web/document-condominium-confirmation.js";
import {
  sendDocumentMessage,
  waitForDocumentProcessing
} from "../../apps/web/document-processing-request.js";
import type { DocumentCondominiumCheck } from "../../apps/api/documents/document-condominium-check.js";

const check: DocumentCondominiumCheck = {
  status: "pending",
  expectedName: "Residencial Alameda",
  detectedNames: ["Condomínio Bosque"],
  sources: [{ name: "Condomínio Bosque", source: "text", page: 1 }],
  resumeProcessingStatus: "ready"
};

describe("confirmação de condomínio no chat — RQ-3702/RQ-3703", () => {
  it("mostra os dois nomes, pergunta o pertencimento e oferece decisões explícitas", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentCondominiumConfirmation, {
        title: "Ata.pdf",
        check,
        busy: false,
        onConfirm: vi.fn(),
        onCancel: vi.fn()
      })
    );
    expect(html).toContain("Condomínio Bosque");
    expect(html).toContain("Residencial Alameda");
    expect(html).toContain("Este documento pertence a");
    expect(html).toContain("Cancelar uso");
    expect(html).toContain("Sim, usar em");
  });
  it("escapa nomes documentais hostis e desabilita decisões durante o envio", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentCondominiumConfirmation, {
        title: "Ata.pdf",
        check: { ...check, detectedNames: ["<script>alert(1)</script>"] },
        busy: true,
        onConfirm: vi.fn(),
        onCancel: vi.fn()
      })
    );
    expect(html).not.toContain("<script>");
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
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
  it("não apresenta sucesso se a decisão for negada", async () => {
    await expect(
      confirmDocumentCondominium(async () => new Response("{}", { status: 403 }), {
        condominiumId: "alameda",
        documentVersionId: "v1",
        headers: {}
      })
    ).rejects.toThrow("Não foi possível confirmar");
  });
});
