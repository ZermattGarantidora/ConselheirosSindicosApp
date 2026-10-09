import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("envio documental pelo chat", () => {
  it("AC-1605: só envia PDF ou imagem depois da confirmação pela seta", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("const [pendingChatDocument, setPendingChatDocument]");
    expect(app).toContain("function selectChatDocument(file: File): void");
    expect(app).toContain("setPendingChatDocument(file);");
    expect(app).toContain("function sendComposer(): void");
    expect(app).toContain("void addChatDocument(pendingChatDocument);");
    expect(app).toContain("onClick={sendComposer}");
    expect(app).toContain("Enviar documento selecionado");
    expect(app).toContain("setSentChatDocumentName(file.name);");
    expect(app).toContain("image/jpeg,.jpg,.jpeg,image/png,.png");
    expect(app).toContain("O processamento e a vetorização continuam em segundo plano.");
    expect(app).toContain("requestDocumentUploadWithAuthorizationRecovery");
  });
});
