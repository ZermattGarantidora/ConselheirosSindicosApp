import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDocumentVersion } from "../../apps/api/documents/document-model.js";

const validVersion = {
  id: "version-1",
  condominiumId: createCondominiumId("alameda"),
  documentId: "document-1",
  versionNumber: 1,
  contentSha256: "a".repeat(64),
  mediaType: "application/pdf" as const,
  sizeBytes: 128
};

describe("modelo documental", () => {
  it("cria versões imutáveis com processamento e vigência pendentes", () => {
    const created = createDocumentVersion(validVersion);

    expect(created.state).toEqual({ processingStatus: "uploaded", validityStatus: "pending" });
    expect(Object.isFrozen(created.version)).toBe(true);
    expect(Object.isFrozen(created.state)).toBe(true);
  });

  it.each([
    [{ ...validVersion, versionNumber: 0 }],
    [{ ...validVersion, sizeBytes: 0 }],
    [{ ...validVersion, contentSha256: "not-a-hash" }]
  ])("rejeita identidade imutável inválida", (input) => {
    expect(() => createDocumentVersion(input)).toThrow();
  });
});
