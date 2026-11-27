import { beforeEach, describe, it, expect, vi } from "vitest";
import { mkdir, lstat, readdir } from "node:fs/promises";
import { codexCacheContextDirectory } from "../../apps/api/answers/codex-reference-layout.js";
vi.mock("node:fs/promises", () => ({ mkdir: vi.fn(), lstat: vi.fn(), readdir: vi.fn() }));
describe("AC7712 — cwd generico sem dados", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(lstat).mockResolvedValue({
      isDirectory: () => true,
      isSymbolicLink: () => false
    } as Awaited<ReturnType<typeof lstat>>);
    vi.mocked(readdir).mockResolvedValue([]);
  });
  it("reutiliza apenas caminho vazio e verificado, sem identificadores privados", async () => {
    const first = await codexCacheContextDirectory();
    vi.mocked(mkdir).mockRejectedValueOnce(Object.assign(new Error("privado"), { code: "EEXIST" }));
    expect(await codexCacheContextDirectory()).toBe(first);
    expect(first).toContain("alvitra-codex-empty-context-v1");
    expect(lstat).toHaveBeenCalledTimes(2);
    expect(readdir).toHaveBeenCalledTimes(2);
  });
  it.each(["symlink", "file", "content"])("recusa contexto com %s", async (kind) => {
    vi.mocked(lstat).mockResolvedValue({
      isDirectory: () => kind !== "file",
      isSymbolicLink: () => kind === "symlink"
    } as Awaited<ReturnType<typeof lstat>>);
    if (kind === "content") vi.mocked(readdir).mockResolvedValue(["canario"] as never);
    await expect(codexCacheContextDirectory()).rejects.toThrow("não está vazio ou isolado");
  });
  it("nao reutiliza caminho quando a criacao falha", async () => {
    vi.mocked(mkdir).mockRejectedValueOnce(Object.assign(new Error("privado"), { code: "EACCES" }));
    await expect(codexCacheContextDirectory()).rejects.toMatchObject({ code: "EACCES" });
    expect(lstat).not.toHaveBeenCalled();
  });
});
