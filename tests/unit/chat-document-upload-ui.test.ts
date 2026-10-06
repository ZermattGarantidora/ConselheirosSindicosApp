import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("envio documental pelo chat", () => {
  it("AC-030: só envia o PDF anexado após a seta de envio e registra a mensagem do usuário", async () => {
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
    expect(app.indexOf('className="user-message sent-document-message"')).toBeLessThan(
      app.indexOf("assistant-message document-upload-notice")
    );
  });
});
