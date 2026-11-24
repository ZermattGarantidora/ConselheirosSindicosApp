import assert from "node:assert/strict";
import {
  createLocalPrivateDocumentStorage,
  createPrivateStorageKey,
  type PrivateStorageObject
} from "../../apps/api/documents/private-document-storage.js";
/** Só o harness pode reutilizar byte a byte uma fixture já salva; não altera storage do produto. */
export function createReplaySafeSyntheticStorage(directory: string) {
  const storage = createLocalPrivateDocumentStorage(directory);
  return {
    ...storage,
    async storeOriginal(input: PrivateStorageObject) {
      let existing: Buffer;
      try {
        existing = await storage.readOriginal({
          condominiumId: input.condominiumId,
          objectId: input.objectId,
          userId: input.uploadedByUserId
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return storage.storeOriginal(input);
      }
      assert.deepEqual(
        existing,
        input.content,
        "Original sintético divergente; não sobrescrever nem transcrever novamente."
      );
      return { storageKey: createPrivateStorageKey(input.condominiumId, input.objectId) };
    }
  };
}
