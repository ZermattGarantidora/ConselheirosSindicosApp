import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DocumentViewer, loadDocumentOriginal } from "../../apps/web/DocumentViewer.js";

describe("cópia legal no visualizador existente", () => {
  it("usa endpoint autorizado com identidade, versão e página preservadas", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response("%PDF-controle", { headers: { "content-type": "application/pdf" } })
      );
    const controller = new AbortController();
    const blob = await loadDocumentOriginal(
      fetch,
      {
        condominiumId: "alameda",
        documentVersionId: "versao",
        legalSourceId: "fonte",
        title: "Cópia conferida",
        page: 3
      },
      { "x-development-user-id": "sintetico" },
      controller.signal
    );
    expect(blob.type).toBe("application/pdf");
    expect(fetch).toHaveBeenCalledWith(
      "/v1/condominiums/alameda/legal-sources/fonte/versions/versao/copy",
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "x-development-user-id": "sintetico" }
      })
    );
  });

  it("identifica a cópia como parcial e preserva o rótulo dos documentos privados", () => {
    const document = {
      condominiumId: "alameda",
      documentVersionId: "versao",
      title: "Regra conferida",
      page: 3
    };
    const copy = renderToStaticMarkup(
      createElement(DocumentViewer, {
        document: { ...document, legalSourceId: "fonte" },
        headers: {},
        onClose: () => {}
      })
    );
    expect(copy).toContain('aria-label="Cópia de consulta: Regra conferida"');
    expect(copy).toContain("Abrindo cópia de consulta");
    const original = renderToStaticMarkup(
      createElement(DocumentViewer, { document, headers: {}, onClose: () => {} })
    );
    expect(original).toContain('aria-label="Documento completo: Regra conferida"');
  });

  it("recusa imagem ou falha de autorização no endpoint de cópia", async () => {
    const document = {
      condominiumId: "alameda",
      documentVersionId: "versao",
      legalSourceId: "fonte",
      title: "Regra"
    };
    const signal = new AbortController().signal;
    const failed = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("negado", { status: 403 }));
    await expect(loadDocumentOriginal(failed, document, {}, signal)).rejects.toThrow(
      "cópia de consulta"
    );
    const image = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("imagem", { headers: { "content-type": "image/png" } }));
    await expect(loadDocumentOriginal(image, document, {}, signal)).rejects.toThrow("formato");
  });
});
