import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("envio documental pelo chat", () => {
  it("AC-1605: só envia PDF ou imagem depois da confirmação pela seta", async () => {
    const [app, attachments] = await Promise.all([
      readFile("apps/web/App.tsx", "utf8"),
      readFile("apps/web/ChatDocumentAttachments.tsx", "utf8")
    ]);

    expect(app).toContain("const [pendingChatDocuments, setPendingChatDocuments]");
    expect(app).toContain("function selectChatDocuments(files: readonly File[]): void");
    expect(app).toContain("setPendingChatDocuments(selection.files);");
    expect(app).toContain("function sendComposer(): void");
    expect(app).toContain("void addChatDocuments(pendingChatDocuments).finally(finish);");
    expect(app).toContain("multiple");
    expect(app).toContain("Array.from(event.currentTarget.files ?? [])");
    expect(app).not.toContain("files?.[0]");
    expect(app).toContain("sendDocumentBatch({");
    expect(app).toContain("onClick={sendComposer}");
    expect(app).toContain("Enviar documento selecionado");
    expect(app).toContain("Adicionar documento ou foto");
    expect(app).toContain("Enviar documento");
    expect(app).toContain("Enviar foto");
    expect(app).toContain("function chooseAttachment(kind: AttachmentKind)");
    expect(app).toContain("<DocumentBatchProgress");
    expect(app).toContain("<PendingDocumentAttachments");
    expect(app).toMatch(
      /<PendingDocumentAttachments\s+files=\{pendingChatDocuments\}\s+sending=\{chatDocumentUploading\}/u
    );
    expect(app).toContain('attachmentPickerKind === "document"');
    expect(app).toContain("image/jpeg,.jpg,.jpeg,image/png,.png");
    expect(attachments).toContain("Documento recebido. Lendo e preparando para consulta...");
    expect(app).toContain("sendDocumentMessage({");
    expect(app).toContain("ask: (text) => askQuestion(text)");
    expect(app).toContain("converseAboutDocument");
    expect(app).not.toContain("Condomínio confirmado:");
    expect(app).not.toContain("Documento pronto para consulta.");
    expect(app).toContain("requestDocumentUploadWithAuthorizationRecovery");
    expect(app).toContain("setSubmittedQuestion(message);");
    expect(app).toContain("composerSending.current");
  });
});
