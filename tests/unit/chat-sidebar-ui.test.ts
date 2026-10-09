import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("barra lateral de conversas", () => {
  it("AC-1701 e AC-1703: mantém a lista fechada até a pessoa abri-la e oferece novo chat", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("const [sidebarOpen, setSidebarOpen] = useState(false);");
    expect(app).toContain('aria-label="Abrir conversas"');
    expect(app).toContain('id="chat-sidebar"');
    expect(app).toContain('className={`chat-sidebar${sidebarOpen ? " is-open" : ""}`}');
    expect(app).toContain("function createChat(): void");
    expect(app).toContain("+ Nova conversa");
    expect(app).toContain("function selectChat(chatId: string): void");
    expect(app).toContain("preserveActiveTurn();");
  });

  it("AC-1704: permite renomear e excluir somente a organização visual", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");

    expect(app).toContain("function renameChat(chatId: string): void");
    expect(app).toContain('window.prompt("Nome da conversa", chat.title)');
    expect(app).toContain("function deleteChat(chatId: string): void");
    expect(app).toContain("window.confirm(`Excluir a conversa");
    expect(app).toContain("Excluir");
    expect(app).not.toContain("localStorage");
  });

  it("AC-1702: usa overlay no celular e painel deslizante no desktop", async () => {
    const styles = await readFile("apps/web/styles.css", "utf8");

    expect(styles).toMatch(/\.chat-sidebar\s*\{[\s\S]*?transform:\s*translateX\(-105%\);/u);
    expect(styles).toContain(".chat-sidebar.is-open");
    expect(styles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.sidebar-backdrop\s*\{[\s\S]*?display:\s*block;/u
    );
  });
});
