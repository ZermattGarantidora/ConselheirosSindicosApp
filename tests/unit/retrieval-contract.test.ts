import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { chunkPage } from "../../apps/api/retrieval/retrieval-contract.js";

describe("contrato de chunking do retrieval", () => {
  it("mantém chunks na mesma página e offsets que reproduzem o trecho", () => {
    const content = "A convenção define a regra de uso da vaga. A decisão vale para visitantes.";
    const chunks = chunkPage(
      {
        condominiumId: createCondominiumId("alameda"),
        documentVersionId: "version-1",
        documentPageId: "page-1",
        pageNumber: 3,
        extractedText: content
      },
      { maximumCharacters: 30, overlapCharacters: 5 }
    );
    const characters = Array.from(content);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.pageNumber === 3)).toBe(true);
    for (const chunk of chunks) {
      expect(chunk.content).toBe(characters.slice(chunk.startOffset, chunk.endOffset).join(""));
      expect(chunk.contentSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1, 2]);
  });

  it("retorna vazio para página sem texto e rejeita limites inválidos", () => {
    const input = {
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      documentPageId: "page-1",
      pageNumber: 1,
      extractedText: ""
    };

    expect(chunkPage(input)).toEqual([]);
    expect(() => chunkPage(input, { maximumCharacters: 0 })).toThrow("limite de caracteres");
    expect(() => chunkPage(input, { maximumCharacters: 10, overlapCharacters: 10 })).toThrow(
      "sobreposição"
    );
    expect(() => chunkPage({ ...input, pageNumber: 0 })).toThrow("página");
  });
});
