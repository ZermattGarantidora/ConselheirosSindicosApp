import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appearanceStorageKey,
  getBrowserStorage,
  getInitialAppearance,
  loadAppearance,
  saveAppearance
} from "../../apps/web/appearance.js";

afterEach(() => vi.unstubAllGlobals());

describe("AC-2409: preferência de aparência", () => {
  it("usa claro como padrão e respeita somente escolhas válidas salvas", () => {
    expect(loadAppearance(undefined)).toBe("light");
    expect(loadAppearance({ getItem: () => null })).toBe("light");
    expect(loadAppearance({ getItem: () => "invalid" })).toBe("light");
    expect(loadAppearance({ getItem: () => "light" })).toBe("light");
    expect(loadAppearance({ getItem: () => "dark" })).toBe("dark");
  });

  it("resolve o tema antes da primeira renderização, com ou sem APIs do navegador", () => {
    expect(getInitialAppearance()).toBe("light");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(getInitialAppearance()).toBe("light");
    vi.stubGlobal("window", { localStorage: { getItem: () => "dark" } });
    expect(getInitialAppearance()).toBe("dark");
  });

  it("restaura a escolha sem armazenar conteúdo de condomínio", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    saveAppearance(storage, "dark");
    expect(loadAppearance(storage)).toBe("dark");
    saveAppearance(storage, "light");
    expect(loadAppearance(storage)).toBe("light");
    expect([...values.entries()]).toEqual([[appearanceStorageKey, "light"]]);
  });

  it("continua funcionando quando o navegador bloqueia armazenamento", () => {
    const blocked = {
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Quota");
      }
    };
    expect(loadAppearance(blocked)).toBe("light");
    expect(() => saveAppearance(blocked, "dark")).not.toThrow();
    expect(() => saveAppearance(undefined, "dark")).not.toThrow();
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("Blocked");
      }
    });
    expect(getBrowserStorage()).toBeUndefined();
    vi.stubGlobal("window", { localStorage: blocked });
    expect(getBrowserStorage()).toBe(blocked);
  });
});
