import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("degradação local sem provedor", () => {
  it("limita o modo offline à demonstração, não inventa fala e não libera novo cadastro", async () => {
    const source = await readFile("apps/web/App.tsx", "utf8");
    expect(source).toContain(
      'const offlineDemo = authMode === "development" && aiProvider === "local"'
    );
    expect(source).toMatch(
      /if \(offlineDemo && \(input.stage === "welcome" \|\| input.stage === "returning"\)\)\s*return "";/u
    );
    expect(source).toContain('className="operational-notice" role="status"');
    expect(source).toContain('message.text.trim() !== ""');
    expect(source.match(/offlineDemo && setupStage !== "complete"/gu)).toHaveLength(2);
    expect(source.replace(/\s+/gu, " ")).toContain(
      "A configuração conversacional de um novo perfil está indisponível"
    );
    expect(source).not.toContain("managerName: selectedIdentity.displayName");
  });

  it("servidor e worker nunca habilitam OCR de uploads a partir de flags", async () => {
    for (const path of ["apps/api/app/server.ts", "apps/api/worker/worker.ts"]) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("createOpenAiOcrAdapterFromEnvironment");
      expect(source).toContain("unavailableOcrAdapter,");
    }
  });
});
