import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accessCookie,
  createAccessCodeService,
  hashAccessSecret,
  readAccessCookie
} from "../../apps/api/identity/access-code.js";
import {
  createLocalAccessCodeService,
  createLocalAccessCodeStore,
  localAccessSecret
} from "../../apps/api/identity/local-access-code-store.js";
import { createPostgresAccessCodeStore } from "../../apps/api/identity/postgres-access-code-store.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";

const directories: string[] = [];
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-access-test-"));
  directories.push(directory);
  return { directory, service: await createLocalAccessCodeService(directory) };
}
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("acesso por código fornecido", () => {
  it("AC-6801/6803/6808: código estável, sessões independentes e persistência somente por hash", async () => {
    const { directory, service } = await setup();
    const code = await service.provision("sindico-sintetico-a");
    expect(code).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4}){7}$/u);
    const first = (await service.login(code))!;
    const second = (await service.login(code.toLowerCase().replaceAll("-", " ")))!;
    expect(first.userId).toBe(second.userId);
    expect(first.token).not.toBe(second.token);
    const restored = await createLocalAccessCodeService(directory);
    const credential = (await restored.authenticate(first.token))!;
    expect(credential.userId).toBe("sindico-sintetico-a");
    expect(await restored.ownCode(credential)).toBe(code);
    const raw = await readFile(join(directory, "vault.json"), "utf8");
    expect(raw).not.toContain(code.replaceAll("-", ""));
    expect(raw).not.toContain(first.token);
    expect(raw).toContain(hashAccessSecret(first.token));
    await restored.logout(first.token);
    expect(await service.authenticate(first.token)).toBeUndefined();
    expect(await service.authenticate(second.token)).toBeDefined();
  });
  it("AC-6801/6805: rejeita entradas falsas e rotação invalida códigos e sessões antigas", async () => {
    const { service } = await setup();
    const code = await service.provision("sintetico-b");
    for (const invalid of [
      undefined,
      null,
      12,
      {},
      "",
      "nome do usuário",
      "A".repeat(32),
      "A".repeat(65),
      code + "!",
      code.replace(/./u, code[0] === "A" ? "B" : "A")
    ])
      expect(await service.login(invalid)).toBeUndefined();
    expect(await service.authenticate(undefined)).toBeUndefined();
    expect(await service.authenticate("malformado")).toBeUndefined();
    expect(await service.authenticate("a".repeat(43))).toBeUndefined();
    await service.logout(undefined);
    const session = (await service.login(code))!;
    const credential = (await service.authenticate(session.token))!;
    const rotated = await service.provision("sintetico-b");
    expect(rotated).not.toBe(code);
    expect(await service.login(code)).toBeUndefined();
    expect(await service.authenticate(session.token)).toBeUndefined();
    expect(await service.ownCode(credential)).toBeUndefined();
    expect(await service.login(rotated)).toBeDefined();
  });
  it("AC-6804: outro segredo não autentica o cofre e usuários não compartilham código", async () => {
    const { service, directory } = await setup();
    const first = await service.provision("sintetico-a");
    const other = await service.provision("sintetico-b");
    expect(first).not.toBe(other);
    const session = (await service.login(first))!;
    const wrongKey = createAccessCodeService(createLocalAccessCodeStore(directory), "f".repeat(64));
    expect(await wrongKey.login(first)).toBeUndefined();
    expect(await wrongKey.authenticate(session.token)).toBeUndefined();
    expect(() => createAccessCodeService(createLocalAccessCodeStore(directory), "curto")).toThrow();
    expect(await service.login(first)).toBeDefined();
  });
  it("AC-6808: duas instâncias gravam sem perder sessões e falha não reinicia o cofre", async () => {
    const { service, directory } = await setup();
    const code = await service.provision("sintetico-concorrente");
    const other = await createLocalAccessCodeService(directory);
    const sessions = await Promise.all(
      Array.from({ length: 8 }, (_, index) => (index % 2 ? service : other).login(code))
    );
    for (const session of sessions)
      expect(await service.authenticate(session!.token)).toBeDefined();
    await writeFile(join(directory, "vault.json"), "inválido");
    await expect(service.provision("sintetico-outro")).rejects.toThrow();
    expect(await readFile(join(directory, "vault.json"), "utf8")).toBe("inválido");
  });
  it("AC-6808: rejeita formato de cofre inválido e revisão revogada durante login", async () => {
    const { directory } = await setup();
    const store = createLocalAccessCodeStore(directory);
    for (const data of [
      null,
      {},
      { credentials: [null], sessions: [] },
      { credentials: [{ userId: "", revision: "r", codeHash: "x" }], sessions: [] }
    ]) {
      await writeFile(join(directory, "vault.json"), JSON.stringify(data));
      await expect(store.findCredential("hash")).rejects.toThrow();
    }
    await writeFile(
      join(directory, "vault.json"),
      JSON.stringify({ credentials: [], sessions: [] })
    );
    await expect(
      store.createSession({
        userId: createUserId("sintetico"),
        revision: "antiga",
        tokenHash: "a".repeat(64)
      })
    ).rejects.toThrow("Credencial revogada");
    const secret = await localAccessSecret(directory);
    expect(await localAccessSecret(directory)).toBe(secret);
    expect(
      new Set(await Promise.all(Array.from({ length: 8 }, () => localAccessSecret(directory)))).size
    ).toBe(1);
  });
  it("AC-6802: cookies persistentes não expõem token a JavaScript", () => {
    expect(accessCookie("token", true)).toContain(
      "HttpOnly; SameSite=Lax; Max-Age=34560000; Secure"
    );
    expect(accessCookie("token", false)).not.toContain("Secure");
    expect(accessCookie("", true)).toContain("Max-Age=0");
    expect(readAccessCookie("other=x; alvitra_device=token; end=y")).toBe("token");
    expect(readAccessCookie(undefined)).toBeUndefined();
    expect(readAccessCookie("other=x")).toBeUndefined();
  });
  it("AC-6808: adaptador PostgreSQL usa contratos parametrizados e não acessa tabelas diretamente", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const store = createPostgresAccessCodeStore({ query });
    expect(await store.findCredential("hash")).toBeUndefined();
    query.mockResolvedValue({ rows: [{ user_id: "sintetico", revision: "r", code_hash: "h" }] });
    expect(await store.findUserCredential(createUserId("sintetico"))).toMatchObject({
      userId: "sintetico",
      revision: "r"
    });
    await store.provision({ userId: createUserId("sintetico"), revision: "r", codeHash: "h" });
    await store.createSession({ userId: createUserId("sintetico"), revision: "r", tokenHash: "t" });
    await store.resolveSession("t");
    await store.revokeSession("t");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "SELECT * FROM app.find_access_code($1)",
      "SELECT * FROM app.find_user_access_code($1)",
      "SELECT app.provision_access_code($1, $2, $3)",
      "SELECT app.create_device_session($1, $2, $3)",
      "SELECT * FROM app.resolve_device_session($1)",
      "SELECT app.revoke_device_session($1)"
    ]);
  });
});
