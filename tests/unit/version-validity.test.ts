import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  confirmDocumentValidity,
  createDocumentVersion,
  markDocumentVersionSuperseded,
  transitionDocumentProcessing,
  type DocumentVersionState
} from "../../apps/api/documents/document-model.js";
import {
  selectCurrentDocumentVersion,
  selectDocumentVersionForDate,
  type DocumentVersionSnapshot
} from "../../apps/api/documents/version-validity.js";

const condominiumId = createCondominiumId("alameda");

function createReadyVersion(id: string, versionNumber: number): DocumentVersionSnapshot {
  const created = createDocumentVersion({
    id,
    condominiumId,
    documentId: "document-1",
    versionNumber,
    contentSha256: `${"a".repeat(63)}${versionNumber}`,
    mediaType: "application/pdf",
    sizeBytes: 128
  });

  return {
    version: created.version,
    state: transitionDocumentProcessing(
      transitionDocumentProcessing(created.state, "processing"),
      "ready"
    )
  };
}

function confirmed(
  state: DocumentVersionState,
  validFrom: string,
  validUntil: string | null
): DocumentVersionState {
  return confirmDocumentValidity(state, {
    validFrom: new Date(validFrom),
    validUntil: validUntil === null ? null : new Date(validUntil)
  });
}

describe("seleção de versão e vigência", () => {
  it("mantém a versão anterior até a confirmação explícita da nova versão", () => {
    const versionOne = createReadyVersion("version-1", 1);
    const versionOneConfirmed = {
      ...versionOne,
      state: confirmed(versionOne.state, "2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")
    };
    const versionTwo = createReadyVersion("version-2", 2);

    expect(
      selectCurrentDocumentVersion([versionOneConfirmed, versionTwo], new Date("2025-06-01"))
    ).toMatchObject({ version: { id: "version-1" } });

    const versionTwoConfirmed = {
      ...versionTwo,
      state: confirmed(versionTwo.state, "2026-01-01T00:00:00.000Z", null)
    };
    expect(
      selectCurrentDocumentVersion(
        [versionOneConfirmed, versionTwoConfirmed],
        new Date("2026-06-01")
      )
    ).toMatchObject({ version: { id: "version-2" } });
  });

  it("preserva a versão anterior para consulta histórica mesmo após substituição", () => {
    const versionOne = createReadyVersion("version-1", 1);
    const versionOneConfirmed = {
      ...versionOne,
      state: markDocumentVersionSuperseded(
        confirmed(versionOne.state, "2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")
      )
    };
    const versionTwo = createReadyVersion("version-2", 2);
    const versionTwoConfirmed = {
      ...versionTwo,
      state: confirmed(versionTwo.state, "2026-01-01T00:00:00.000Z", null)
    };

    expect(
      selectDocumentVersionForDate(
        [versionOneConfirmed, versionTwoConfirmed],
        new Date("2025-06-01")
      )
    ).toMatchObject({ version: { id: "version-1" }, state: { validityStatus: "superseded" } });
    expect(
      selectCurrentDocumentVersion(
        [versionOneConfirmed, versionTwoConfirmed],
        new Date("2025-06-01")
      )
    ).toBeUndefined();
  });

  it("não escolhe silenciosamente versões prontas com vigência sobreposta", () => {
    const versionOne = createReadyVersion("version-1", 1);
    const versionTwo = createReadyVersion("version-2", 2);
    const versions = [
      {
        ...versionOne,
        state: confirmed(versionOne.state, "2025-01-01T00:00:00.000Z", null)
      },
      {
        ...versionTwo,
        state: confirmed(versionTwo.state, "2025-06-01T00:00:00.000Z", null)
      }
    ];

    expect(() => selectCurrentDocumentVersion(versions, new Date("2025-07-01"))).toThrow(
      "Mais de uma versão pronta"
    );
  });

  it("rejeita lista misturada de documento/condomínio e datas inválidas", () => {
    const versionOne = createReadyVersion("version-1", 1);
    const versionTwo = {
      ...createReadyVersion("version-2", 2),
      version: { ...versionOne.version, id: "version-2", documentId: "document-2" }
    };

    expect(() => selectCurrentDocumentVersion([versionOne, versionTwo])).toThrow(
      "mesmo documento e condomínio"
    );
    expect(() => selectCurrentDocumentVersion([], new Date("invalid"))).toThrow("data de consulta");
  });
});
