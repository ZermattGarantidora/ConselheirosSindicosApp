import { describe, expect, it, vi } from "vitest";
import { sendDocumentBatch } from "../../apps/web/document-upload-batch.js";

describe("AC-5704 — finalização conjunta", () => {
  it.each(["Compare os meses", ""])(
    "reúne resultados após as leituras e antes da pergunta %s",
    async (message) => {
      const calls: string[] = [];
      const result = await sendDocumentBatch({
        documents: ["a", "b", "c"],
        message,
        isCurrent: () => true,
        process: async (document) => {
          calls.push(`leitura ${document}`);
          return true;
        },
        complete: async () => {
          calls.push("análise conjunta");
        },
        ask: async () => {
          calls.push("pergunta");
        }
      });
      expect(result).toBe(true);
      expect(calls).toEqual([
        "leitura a",
        "leitura b",
        "leitura c",
        "análise conjunta",
        ...(message === "" ? [] : ["pergunta"])
      ]);
    }
  );
  it("finaliza os disponíveis sem liberar pergunta após falha parcial", async () => {
    const complete = vi.fn(async () => {});
    const ask = vi.fn();
    await expect(
      sendDocumentBatch({
        documents: [true, false, true],
        message: "Compare tudo",
        isCurrent: () => true,
        process: async (ready) => ready,
        complete,
        ask
      })
    ).resolves.toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(ask).not.toHaveBeenCalled();
  });
  it("não pergunta em outro contexto após finalizar", async () => {
    let current = true;
    const ask = vi.fn();
    await expect(
      sendDocumentBatch({
        documents: ["arquivo"],
        message: "Pergunta",
        isCurrent: () => current,
        process: async () => true,
        complete: async () => {
          current = false;
        },
        ask
      })
    ).resolves.toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });
  it("preserva falha de finalização e impede pergunta silenciosa", async () => {
    const ask = vi.fn();
    await expect(
      sendDocumentBatch({
        documents: ["arquivo"],
        message: "Pergunta",
        isCurrent: () => true,
        process: async () => true,
        complete: async () => {
          throw new Error("Análise indisponível");
        },
        ask
      })
    ).rejects.toThrow("Análise indisponível");
    expect(ask).not.toHaveBeenCalled();
  });
});
