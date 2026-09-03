import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  confirmDocumentValidity,
  createDocumentVersion,
  markDocumentVersionSuperseded,
  transitionDocumentProcessing
} from "../../apps/api/documents/document-model.js";

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

    expect(created.state).toEqual({
      processingStatus: "uploaded",
      validityStatus: "pending",
      validFrom: null,
      validUntil: null,
      ocrQualityScore: null
    });
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

  it("permite somente transições explícitas de processamento e preserva estado imutável", () => {
    const { state } = createDocumentVersion(validVersion);
    const processing = transitionDocumentProcessing(state, "processing");
    const ready = transitionDocumentProcessing(processing, "ready", 1);

    expect(ready).toMatchObject({ processingStatus: "ready", ocrQualityScore: 1 });
    expect(Object.isFrozen(ready)).toBe(true);
    expect(() => transitionDocumentProcessing(state, "ready")).toThrow();
    expect(() => transitionDocumentProcessing(processing, "ready", 1.1)).toThrow();
  });

  it("AC-006: exige confirmação antes de substituir uma versão e não altera a versão anterior", () => {
    const { state } = createDocumentVersion(validVersion);
    const validFrom = new Date("2025-01-01T00:00:00.000Z");
    const confirmed = confirmDocumentValidity(state, { validFrom, validUntil: null });
    const superseded = markDocumentVersionSuperseded(confirmed);

    expect(confirmed).toMatchObject({
      validityStatus: "confirmed",
      validFrom: "2025-01-01T00:00:00.000Z"
    });
    expect(superseded).toMatchObject({
      validityStatus: "superseded",
      validFrom: "2025-01-01T00:00:00.000Z"
    });
    expect(confirmed.validityStatus).toBe("confirmed");
    validFrom.setUTCFullYear(2030);
    expect(confirmed.validFrom).toBe("2025-01-01T00:00:00.000Z");
    expect(typeof confirmed.validFrom).toBe("string");
    expect(() => markDocumentVersionSuperseded(state)).toThrow();
  });

  it("AC-007: valida datas de vigência antes de confirmar a versão", () => {
    const { state } = createDocumentVersion(validVersion);

    expect(() =>
      confirmDocumentValidity(state, {
        validFrom: new Date("2025-02-01T00:00:00.000Z"),
        validUntil: new Date("2025-01-01T00:00:00.000Z")
      })
    ).toThrow("data final de vigência");
    expect(() =>
      confirmDocumentValidity(state, { validFrom: new Date("invalid"), validUntil: null })
    ).toThrow("data inicial de vigência");
  });
});
