import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  chatFileMediaType,
  documentSelectionKey,
  selectDocumentFiles,
  sendDocumentBatch
} from "../../apps/web/document-upload-batch.js";
import {
  type DocumentUploadProgress,
  DocumentBatchProgress,
  PendingDocumentAttachments
} from "../../apps/web/ChatDocumentAttachments.js";

function file(name: string, type = "application/pdf", size = 100): File {
  const result = new File(["conteúdo sintético"], name, { type, lastModified: 1000 });
  Object.defineProperty(result, "size", { value: size });
  return result;
}

describe("AC-2008 — seleção de vários documentos", () => {
  it("acrescenta seleções sem duplicar arquivos nem carregar seu conteúdo", () => {
    const first = file("Ata.pdf");
    const second = file("Regimento.pdf");
    const read = vi.spyOn(first, "arrayBuffer");
    const selection = selectDocumentFiles([first], [file("Ata.pdf"), second, second]);
    expect(selection.files).toEqual([first, second]);
    expect(selection.files[0]).toBe(first);
    expect(selection.errors).toEqual([]);
    expect(read).not.toHaveBeenCalled();
    expect(documentSelectionKey(first)).not.toBe(
      documentSelectionKey(file("Ata.pdf", "application/pdf", 101))
    );
  });

  it("rejeita cada inválido sem perder os válidos ou a seleção anterior", () => {
    const existing = file("Anterior.pdf");
    const valid = file("Balancete.PDF", "");
    const selection = selectDocumentFiles(
      [existing],
      [
        file("Executável.exe", "application/octet-stream"),
        file("Grande.pdf", "application/pdf", 25 * 1024 * 1024 + 1),
        file("Grande.png", "image/png", 10 * 1024 * 1024 + 1),
        valid
      ]
    );
    expect(selection.files).toEqual([existing, valid]);
    expect(selection.errors).toEqual([
      "Executável.exe: envie um PDF, Word (.docx), JPEG ou PNG.",
      "Grande.pdf: o limite é 25 MB.",
      "Grande.png: o limite é 10 MB."
    ]);
  });

  it("preserva os limites individuais e os formatos autorizados", () => {
    const files = [
      file("Limite.pdf", "application/pdf", 25 * 1024 * 1024),
      file("Limite.jpg", "image/jpeg", 10 * 1024 * 1024),
      file("Foto.png", "image/png"),
      file(
        "Convenção.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        10 * 1024 * 1024
      )
    ];
    expect(selectDocumentFiles([], files)).toEqual({ files, errors: [] });
    expect(
      ["Foto.JPG", "Foto.JPEG", "Foto.PNG"].map((name) => chatFileMediaType({ name, type: "" }))
    ).toEqual(["image/jpeg", "image/jpeg", "image/png"]);
    expect(chatFileMediaType({ name: "outro", type: "image/jpeg" })).toBe("image/jpeg");
    expect(selectDocumentFiles(files, []).files).toEqual(files);
  });

  it("mostra todos os nomes e remoção individual com conteúdo escapado", () => {
    const html = renderToStaticMarkup(
      createElement(PendingDocumentAttachments, {
        files: [file("Ata.pdf"), file("<img>.png", "image/png")],
        sending: false,
        disabled: false,
        onRemove: () => {}
      })
    );
    expect(html).toContain("2 arquivos selecionados");
    expect(html).toContain('aria-label="Remover Ata.pdf"');
    expect(html).toContain("&lt;img&gt;.png");
    expect(html).not.toContain("<img>");
    const disabled = renderToStaticMarkup(
      createElement(PendingDocumentAttachments, {
        files: [file("Ata.pdf")],
        sending: false,
        disabled: true,
        onRemove: () => {}
      })
    );
    expect(disabled).toContain("1 arquivo selecionado");
    expect(disabled).toContain('disabled=""');
    expect(
      renderToStaticMarkup(
        createElement(PendingDocumentAttachments, {
          files: [],
          sending: false,
          disabled: false,
          onRemove: () => {}
        })
      )
    ).toBe("");
  });
});

describe("AC-2011 — anexos saem da caixa ao confirmar envio", () => {
  it.each([1, 3])(
    "oculta os %i anexos durante envio e leitura, mantendo progresso no chat",
    (count) => {
      const files = Array.from({ length: count }, (_, index) => file(`Documento-${index}.pdf`));
      const selection = (sending: boolean, pending = files) =>
        renderToStaticMarkup(
          createElement(PendingDocumentAttachments, {
            files: pending,
            sending,
            disabled: sending,
            onRemove: () => {}
          })
        );

      expect(selection(false)).toContain("Arquivos selecionados");
      expect(selection(true)).toBe("");
      const progress = renderToStaticMarkup(
        createElement(DocumentBatchProgress, {
          items: files.map<DocumentUploadProgress>((item, index) => ({
            id: String(index),
            name: item.name,
            phase: index === 0 ? "uploading" : "queued"
          })),
          onOpen: () => {}
        })
      );
      for (const item of files) expect(progress).toContain(item.name);
      expect(progress).toContain("Enviando documento");
      expect(selection(false, [])).toBe("");
      expect(files).toHaveLength(count);
    }
  );

  it("ao terminar, reapresenta somente o upload não recebido para nova tentativa", () => {
    const received = file("Recebido.pdf");
    const failed = file("Falhou.pdf");
    const renderSelection = (files: File[], sending: boolean) =>
      renderToStaticMarkup(
        createElement(PendingDocumentAttachments, {
          files,
          sending,
          disabled: sending,
          onRemove: () => {}
        })
      );

    expect(renderSelection([received, failed], true)).toBe("");
    const retry = renderSelection([failed], false);
    expect(retry).toContain("Falhou.pdf");
    expect(retry).toContain('aria-label="Remover Falhou.pdf"');
    expect(retry).not.toContain("Recebido.pdf");
  });
});

describe("AC-2009/2010 — envio de um lote", () => {
  it("AC-5716: legenda de envio finaliza o lote sem consultar o aviso como pergunta", async () => {
    const process = vi.fn(async () => true);
    const complete = vi.fn(async () => {});
    const ask = vi.fn(async () => {});
    expect(
      await sendDocumentBatch({
        documents: ["A.pdf", "B.pdf"],
        message: "vou enviar ela por completo novamente",
        isCurrent: () => true,
        process,
        complete,
        ask
      })
    ).toBe(true);
    expect(process).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalledOnce();
    expect(ask).not.toHaveBeenCalled();
  });
  it("aguarda a leitura de cada arquivo e só depois pergunta uma vez", async () => {
    const events: string[] = [];
    let finish!: () => void;
    const reading = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const ask = vi.fn(async (message: string) => {
      events.push(message);
    });
    const sending = sendDocumentBatch({
      documents: ["Janeiro.pdf", "Fevereiro.pdf", "Março.pdf"],
      message: "  Compare os três meses.  ",
      isCurrent: () => true,
      process: async (name, index) => {
        events.push(`upload ${index}: ${name}`);
        if (index === 0) await reading;
        events.push(`leitura ${index}`);
        return true;
      },
      ask
    });
    await Promise.resolve();
    expect(events).toEqual(["upload 0: Janeiro.pdf"]);
    expect(ask).not.toHaveBeenCalled();
    finish();
    await expect(sending).resolves.toBe(true);
    expect(events).toEqual([
      "upload 0: Janeiro.pdf",
      "leitura 0",
      "upload 1: Fevereiro.pdf",
      "leitura 1",
      "upload 2: Março.pdf",
      "leitura 2",
      "Compare os três meses."
    ]);
    expect(ask).toHaveBeenCalledOnce();
  });

  it.each([0, 1, 2])(
    "continua os outros arquivos e não pergunta quando o arquivo %i não fica pronto",
    async (failed) => {
      const process = vi.fn(async (_file: string, index: number) => index !== failed);
      const ask = vi.fn();
      await expect(
        sendDocumentBatch({
          documents: ["a", "b", "c"],
          message: "Pergunta preservada",
          isCurrent: () => true,
          process,
          ask
        })
      ).resolves.toBe(false);
      expect(process).toHaveBeenCalledTimes(3);
      expect(ask).not.toHaveBeenCalled();
    }
  );

  it("não fabrica pergunta ao enviar arquivos sem texto", async () => {
    const process = vi.fn(async () => true);
    const ask = vi.fn();
    await expect(
      sendDocumentBatch({
        documents: ["a", "b"],
        message: " ",
        isCurrent: () => true,
        process,
        ask
      })
    ).resolves.toBe(true);
    expect(process).toHaveBeenCalledTimes(2);
    expect(ask).not.toHaveBeenCalled();
  });

  it.each([0, 1])(
    "interrompe o lote se o contexto muda durante a leitura %i",
    async (changedAt) => {
      let current = true;
      const process = vi.fn(async (_file: string, index: number) => {
        if (index === changedAt) current = false;
        return true;
      });
      const ask = vi.fn();
      await expect(
        sendDocumentBatch({
          documents: ["a", "b"],
          message: "Pergunta",
          isCurrent: () => current,
          process,
          ask
        })
      ).resolves.toBe(false);
      expect(process).toHaveBeenCalledTimes(changedAt + 1);
      expect(ask).not.toHaveBeenCalled();
    }
  );

  it("não envia quando o lote está vazio ou seu contexto já foi descartado", async () => {
    const process = vi.fn(async () => true);
    const ask = vi.fn();
    for (const documents of [[], ["arquivo"]])
      await expect(
        sendDocumentBatch({ documents, message: "Pergunta", isCurrent: () => false, process, ask })
      ).resolves.toBe(false);
    expect(process).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });

  it("apresenta o resultado por arquivo e abre somente originais recebidos", () => {
    const document = { condominiumId: "alameda", documentVersionId: "v1", title: "Ata.pdf" };
    const html = renderToStaticMarkup(
      createElement(DocumentBatchProgress, {
        items: [
          { id: "a", name: "Ata.pdf", phase: "ready", document },
          { id: "b", name: "Falha.pdf", phase: "failed", error: "Envio indisponível" },
          { id: "c", name: "Regimento.pdf", phase: "processing" },
          { id: "d", name: "Contrato.pdf", phase: "queued" },
          { id: "e", name: "Foto.png", phase: "uploading" },
          { id: "f", name: "Revisão.pdf", phase: "needs_review" },
          { id: "g", name: "Leitura.pdf", phase: "failed" }
        ],
        onOpen: () => {}
      })
    );
    expect(html).toContain('aria-label="Visualizar Ata.pdf"');
    expect(html).not.toContain('aria-label="Visualizar Falha.pdf"');
    expect(html).not.toContain("Disponível para consulta");
    for (const label of [
      "Envio indisponível",
      "Documento recebido",
      "Aguardando envio",
      "Enviando documento",
      "Leitura precisa de revisão",
      "Não foi possível concluir este arquivo"
    ])
      expect(html).toContain(label);
    expect(html).toContain('role="alert"');
    expect(
      renderToStaticMarkup(createElement(DocumentBatchProgress, { items: [], onOpen: () => {} }))
    ).toBe("");
  });
});
