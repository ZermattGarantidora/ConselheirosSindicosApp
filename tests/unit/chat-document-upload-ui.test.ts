import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("envio documental pelo chat", () => {
  it("AC-1605: só envia PDF ou imagem depois da confirmação pela seta", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("const [pendingChatDocument, setPendingChatDocument]");
    expect(app).toContain("function selectChatDocument(file: File): void");
    expect(app).toContain("setPendingChatDocument(file);");
    expect(app).toContain("function sendComposer(): void");
    expect(app).toContain("void addChatDocument(pendingChatDocument).finally(finish);");
    expect(app).toContain("onClick={sendComposer}");
    expect(app).toContain("Enviar documento selecionado");
    expect(app).toContain("Adicionar documento ou foto");
    expect(app).toContain("Enviar documento");
    expect(app).toContain("Enviar foto");
    expect(app).toContain("function chooseAttachment(kind: AttachmentKind)");
    expect(app).toContain("setSentChatDocumentName(file.name);");
    expect(app).toContain('attachmentPickerKind === "document"');
    expect(app).toContain("image/jpeg,.jpg,.jpeg,image/png,.png");
    expect(app).toContain("Documento recebido. Lendo e preparando para consulta...");
    expect(app).toContain("sendDocumentMessage({");
    expect(app).toContain("ask: (text) => askQuestion(text)");
    expect(app).toContain("o PDF original completo e legível");
    expect(app).toContain("requestDocumentUploadWithAuthorizationRecovery");
    expect(app).toContain("setSubmittedQuestion(message);");
    expect(app).toContain("composerSending.current");
  });
});
