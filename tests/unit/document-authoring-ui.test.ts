import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { DocumentAuthoringComposer } from "../../apps/web/DocumentAuthoringComposer.js";
it("AC-7332: interface solicita pedido explícito, distingue relato e não inicia geração ao abrir", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    const html = renderToStaticMarkup(
      createElement(DocumentAuthoringComposer, {
        condominiumId: "alameda",
        chatId: "synthetic-chat",
        headers: {},
        onDraft: vi.fn()
      })
    );
    expect(html).toContain("Preparar proposta fundamentada");
    expect(html).toContain("Relato ou informações declaradas");
    expect(html).toContain("Versões documentais");
    expect(html).toContain("<fieldset disabled");
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
