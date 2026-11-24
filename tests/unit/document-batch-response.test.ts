import { describe, expect, it, vi } from "vitest";
import {
  createDocumentBatchResponse,
  documentResponseScope,
  queueDocumentConfirmation
} from "../../apps/web/document-batch-response.js";

describe("AC-5704a/b — uma análise por envio, inclusive após confirmações", () => {
  it("AC-3707: reabrir a biblioteca não muda a versão que aguarda a resposta digitada", () => {
    const first = { document: { condominiumId: "alameda", documentVersionId: "v1" } };
    const second = { document: { condominiumId: "alameda", documentVersionId: "v2" } };
    expect(queueDocumentConfirmation([first, second], { ...first })).toEqual([first, second]);
    expect(queueDocumentConfirmation([first, second], { ...second })).toEqual([first, second]);
  });
  it("abrir a confirmação na biblioteca conserva o lote e não o copia a outro condomínio", () => {
    const group = createDocumentBatchResponse<string>({
      keys: ["a"],
      isCurrent: () => true,
      respond: async () => {}
    });
    type Pending = {
      document: { condominiumId: string; documentVersionId: string };
      batch?: typeof group;
    };
    const original: Pending = {
      document: { condominiumId: "alameda", documentVersionId: "v1" },
      batch: group
    };
    const reopened = queueDocumentConfirmation<Pending>([original], {
      document: { ...original.document }
    });
    expect(reopened).toHaveLength(1);
    expect(reopened[0]!.batch).toBe(group);
    const other = queueDocumentConfirmation<Pending>([original], {
      document: { condominiumId: "bosque", documentVersionId: "v1" }
    });
    expect(other).toHaveLength(2);
    expect(other[1]!.batch).toBeUndefined();
  });

  it("aguarda as confirmações dos três arquivos e conserva a ordem original", async () => {
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse<string>({
      keys: ["a", "b", "c"],
      isCurrent: () => true,
      respond
    });
    batch.markReady("c", "versão-C");
    await batch.finish();
    expect(respond).not.toHaveBeenCalled();
    batch.markReady("b", "versão-B");
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
    batch.markReady("a", "versão-A");
    await batch.respondIfReady();
    expect(respond).toHaveBeenCalledExactlyOnceWith(["versão-A", "versão-B", "versão-C"]);
  });

  it("não comenta um arquivo só nem dispara antes de terminar o acompanhamento do envio", async () => {
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse({ keys: ["a"], isCurrent: () => true, respond });
    batch.markReady("a", "versão-A");
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
    await batch.finish();
    expect(respond).toHaveBeenCalledOnce();
  });

  it("confirmações e finalizações concorrentes não duplicam uma geração em andamento", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const respond = vi.fn(async () => pending);
    const batch = createDocumentBatchResponse({ keys: ["a", "b"], isCurrent: () => true, respond });
    batch.markReady("a", "versão-A");
    batch.markReady("b", "versão-B");
    const first = batch.finish();
    await Promise.all([batch.respondIfReady(), batch.finish()]);
    expect(respond).toHaveBeenCalledOnce();
    finish();
    await first;
    batch.markReady("b", "versão-B");
    await batch.respondIfReady();
    expect(respond).toHaveBeenCalledOnce();
  });

  it("uma pendência de leitura ou autorização não vira análise parcial dos arquivos prontos", async () => {
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse({
      keys: ["a", "b"],
      isCurrent: () => true,
      respond
    });
    batch.markReady("a", "versão-A");
    await batch.finish();
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
  });

  it("cancelamento bloqueia a análise, sem remover silenciosamente o arquivo recusado", async () => {
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse({ keys: ["a", "b"], isCurrent: () => true, respond });
    batch.markReady("a", "versão-A");
    await batch.finish();
    batch.cancel();
    batch.markReady("b", "versão-B");
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
  });

  it("resposta tardia não começa depois da troca de contexto", async () => {
    let current = true;
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse({ keys: ["a"], isCurrent: () => current, respond });
    await batch.finish();
    current = false;
    batch.markReady("a", "versão-A");
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
  });

  it("voltar ao mesmo chat não reativa um lote da visita anterior", async () => {
    let scope = documentResponseScope({ identity: "" }, "alameda:chat-a");
    const captured = scope;
    const respond = vi.fn(async () => {});
    const batch = createDocumentBatchResponse({
      keys: ["a"],
      isCurrent: () => captured === scope,
      respond
    });
    await batch.finish();
    expect(documentResponseScope(scope, "alameda:chat-a")).toBe(scope);
    scope = documentResponseScope(scope, "alameda:chat-b");
    scope = documentResponseScope(scope, "alameda:chat-a");
    batch.markReady("a", "versão-A");
    await batch.respondIfReady();
    expect(respond).not.toHaveBeenCalled();
  });

  it("uma falha de resposta incerta não dispara outra tentativa automaticamente", async () => {
    const respond = vi.fn(async () => {
      throw new Error("Falha sintética.");
    });
    const batch = createDocumentBatchResponse({ keys: ["a"], isCurrent: () => true, respond });
    batch.markReady("a", "versão-A");
    await expect(batch.finish()).rejects.toThrow("Falha sintética");
    await batch.respondIfReady();
    expect(respond).toHaveBeenCalledOnce();
  });

  it("não aceita arquivo alheio ou chave duplicada nem compartilha estado entre lotes", async () => {
    const respond = vi.fn(async () => {});
    const make = (keys: string[]) =>
      createDocumentBatchResponse({ keys, isCurrent: () => true, respond });
    expect(() => make([])).toThrow("distintos");
    expect(() => make(["a", "a"])).toThrow("distintos");
    const first = make(["a"]);
    const other = make(["a"]);
    expect(() => first.markReady("alheio", "versão-alheia")).toThrow("não pertence");
    first.markReady("a", "versão-A");
    await other.finish();
    expect(respond).not.toHaveBeenCalled();
    await first.finish();
    expect(respond).toHaveBeenCalledExactlyOnceWith(["versão-A"]);
  });
});
