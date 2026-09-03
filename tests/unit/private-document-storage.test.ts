import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createLocalPrivateDocumentStorage,
  createPrivateStorageKey
} from "../../apps/api/documents/private-document-storage.js";

const objectId = "7cbfd4af-2ca9-47e2-89e5-0693494cfdb2";

describe("storage privado de documentos", () => {
  it("gera chaves opacas e diferentes para cada condomínio", () => {
    const alamedaKey = createPrivateStorageKey(createCondominiumId("alameda"), objectId);
    const bosqueKey = createPrivateStorageKey(createCondominiumId("bosque"), objectId);

    expect(alamedaKey).not.toContain("alameda");
    expect(alamedaKey).not.toBe(bosqueKey);
    expect(alamedaKey).toMatch(/^tenants\/[a-f0-9]{32}\/objects\//);
  });

  it("grava e remove o original somente em diretório privado local", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "conselheiro-storage-"));
    const storage = createLocalPrivateDocumentStorage(rootDirectory);

    try {
      await expect(
        storage.storeOriginal({
          condominiumId: createCondominiumId("alameda"),
          objectId,
          content: Buffer.from("%PDF-1.7")
        })
      ).resolves.toEqual({
        storageKey: createPrivateStorageKey(createCondominiumId("alameda"), objectId)
      });
      await expect(
        storage.readOriginal({
          condominiumId: createCondominiumId("alameda"),
          objectId
        })
      ).resolves.toEqual(Buffer.from("%PDF-1.7"));
      await expect(
        storage.removeOriginal({ condominiumId: createCondominiumId("alameda"), objectId })
      ).resolves.toBeUndefined();
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it("recusa identificador que poderia formar caminho arbitrário", () => {
    expect(() => createPrivateStorageKey(createCondominiumId("alameda"), "../documento")).toThrow();
  });
});
