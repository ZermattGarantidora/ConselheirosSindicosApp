import { describe, expect, it, vi } from "vitest";

import { appearanceStorageKey } from "../../apps/web/appearance.js";
import {
  createDevelopmentIdentity,
  developmentIdentityStorageKey,
  loadDevelopmentIdentity,
  loadDevelopmentSetupProfile,
  rememberDevelopmentCondominium,
  saveDevelopmentIdentity
} from "../../apps/web/development-identity.js";
import { signOut } from "../../apps/web/profile-session.js";

describe("saída do perfil", () => {
  it("AC-2410: esquece o último acesso e preserva tema e cadastro para retomada explícita", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    };
    const identity = createDevelopmentIdentity("acesso-sintetico-perfil");
    saveDevelopmentIdentity(storage, identity);
    rememberDevelopmentCondominium(
      storage,
      identity,
      "Marina",
      {
        condominiumId: "perfil-sintetico",
        name: "Condomínio Sintético",
        unitCount: 20
      },
      true
    );
    storage.setItem(appearanceStorageKey, "dark");
    const request = vi.fn<typeof fetch>();
    const saved = loadDevelopmentSetupProfile(storage, identity);

    await signOut("development", storage, request);

    expect(request).not.toHaveBeenCalled();
    expect(loadDevelopmentIdentity(storage)).toBeUndefined();
    expect(storage.getItem(appearanceStorageKey)).toBe("dark");
    expect(loadDevelopmentSetupProfile(storage, identity)).toEqual(saved);
    expect(
      loadDevelopmentSetupProfile(storage, createDevelopmentIdentity("outro-acesso"))
    ).toBeUndefined();
    saveDevelopmentIdentity(storage, identity);
    expect(loadDevelopmentSetupProfile(storage, identity)).toEqual(saved);
  });

  it("AC-2411: só remove a lembrança após revogar a sessão real na mesma origem", async () => {
    const removeItem = vi.fn();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => {
      expect(removeItem).not.toHaveBeenCalled();
      return new Response(null, { status: 204 });
    });

    await signOut("real", { removeItem }, request);

    expect(request).toHaveBeenCalledWith("/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      signal: expect.any(AbortSignal)
    });
    expect(removeItem).toHaveBeenCalledExactlyOnceWith(developmentIdentityStorageKey);
  });

  it.each(["http", "network", "timeout"])(
    "AC-2411: preserva o acesso em falha %s",
    async (failure) => {
      const removeItem = vi.fn();
      const request = vi.fn<typeof fetch>().mockImplementation(async () => {
        if (failure === "http") return new Response(null, { status: 503 });
        throw new Error(failure);
      });
      await expect(signOut("real", { removeItem }, request)).rejects.toThrow();
      expect(removeItem).not.toHaveBeenCalled();
    }
  );

  it("AC-2410: armazenamento bloqueado não impede encerrar o estado da página", async () => {
    await expect(signOut("development", undefined)).resolves.toBeUndefined();
    await expect(
      signOut("development", {
        removeItem: () => {
          throw new Error("Blocked");
        }
      })
    ).resolves.toBeUndefined();
  });
});
