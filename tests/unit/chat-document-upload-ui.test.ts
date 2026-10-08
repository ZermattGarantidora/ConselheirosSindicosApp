import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("envio documental pelo chat", () => {
  it("AC-030 e AC-1401/1402: só envia PDF ou foto após a seta e mostra o aviso", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("const [pendingChatDocument, setPendingChatDocument]");
    expect(app).toContain("function selectChatDocument(file: File): void");
    expect(app).toContain("setPendingChatDocument(file);");
    expect(app).toContain("if (file !== undefined) selectChatDocument(file);");
    expect(app).toContain("function sendComposer(): void");
    expect(app).toContain("void addChatDocument(pendingChatDocument);");
    expect(app).toContain("onClick={sendComposer}");
    expect(app).toContain("Enviar documento selecionado");
    expect(app).toContain("setSentChatDocumentName(file.name);");
    expect(app).toContain('className="user-message sent-document-message"');
    expect(app).toContain("Documento enviado");
    expect(app).toContain("image/jpeg,.jpg,.jpeg,image/png,.png");
    expect(app).toContain("A foto será armazenada no banco deste condomínio");
    expect(app).toContain("Use somente imagem sintética neste ambiente");
    expect(app.indexOf('className="user-message sent-document-message"')).toBeLessThan(
      app.indexOf("assistant-message document-upload-notice")
    );
  });
});
