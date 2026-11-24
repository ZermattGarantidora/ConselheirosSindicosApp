import { describe, expect, it } from "vitest";
import { recoveredDocumentProgress } from "../../apps/web/recovered-document-progress.js";
import type { LibraryDocument } from "../../apps/web/document-library.js";
import type { DocumentUploadProgress } from "../../apps/web/ChatDocumentAttachments.js";

const document = { condominiumId: "alameda", documentVersionId: "v1", title: "Ata.pdf" };
const record: LibraryDocument = {
  ...document,
  documentId: "doc",
  condominiumName: "Alameda",
  documentType: "meeting_minutes",
  processingStatus: "processing",
  validityStatus: "confirmed",
  versionNumber: 1,
  createdAt: "2026-11-05T12:00:00.000Z"
};
const local: DocumentUploadProgress = {
  id: "local",
  name: document.title,
  phase: "processing",
  document
};

describe("AC-6905 — acompanhamento retomado no chat", () => {
  it.each(["ready", "needs_review", "failed", "processing", "uploaded"] as const)(
    "usa o estado atual %s sem repetir a mensagem de upload",
    (processingStatus) => {
      const progress = recoveredDocumentProgress(
        document,
        undefined,
        [{ ...record, processingStatus }],
        false
      );
      expect(progress).toMatchObject({
        document,
        name: "Ata.pdf",
        phase: processingStatus === "uploaded" ? "processing" : processingStatus
      });
    }
  );
  it("conclusão do worker substitui erro antigo de acompanhamento", () => {
    expect(
      recoveredDocumentProgress(
        document,
        { ...local, error: "Espera encerrada" },
        [{ ...record, processingStatus: "ready" }],
        false
      )
    ).toMatchObject({ phase: "ready" });
    expect(recoveredDocumentProgress(document, local, [record], false)).not.toHaveProperty("error");
  });
  it("não usa versão com nome igual nem catálogo de outro condomínio", () => {
    for (const other of [
      { ...record, documentVersionId: "v2" },
      { ...record, condominiumId: "bosque" }
    ]) {
      expect(recoveredDocumentProgress(document, local, [other], false)).toMatchObject({
        phase: "failed",
        error: "Documento indisponível neste condomínio."
      });
    }
  });
  it("preserva o estado durante carregamento e distingue falha de rede", () => {
    expect(recoveredDocumentProgress(document, local, undefined, true)).toEqual(local);
    expect(recoveredDocumentProgress(undefined, local, [], false)).toEqual(local);
    expect(recoveredDocumentProgress(document, undefined, undefined, true)?.phase).toBe(
      "processing"
    );
    expect(
      recoveredDocumentProgress(document, local, [record], false, "Rede indisponível")
    ).toMatchObject({
      phase: "processing",
      error: "Rede indisponível"
    });
  });
});
