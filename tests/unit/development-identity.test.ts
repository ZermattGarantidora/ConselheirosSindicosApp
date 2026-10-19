import { describe, expect, it } from "vitest";

import {
  createDevelopmentIdentity,
  developmentIdentityStorageKey,
  loadDevelopmentIdentity,
  loadDevelopmentSetupProfile,
  parseDevelopmentManagerName,
  rememberDevelopmentCondominium,
  rememberDevelopmentManagerName,
  saveDevelopmentIdentity
} from "../../apps/web/development-identity.js";

describe("identidade provisória da demonstração", () => {
  it("AC-2702: cria identidade estável sem misturar nomes diferentes", () => {
    const first = createDevelopmentIdentity("  Ana   Souza ");
    const repeated = createDevelopmentIdentity("ana souza");
    const other = createDevelopmentIdentity("Bruno Souza");

    expect(first.displayName).toBe("Ana Souza");
    expect(first.userId).toBe(repeated.userId);
    expect(other.userId).not.toBe(first.userId);
    expect(first.userId).toMatch(/^demo-ana-souza-/u);
  });

  it("AC-2701: rejeita nomes vazios, curtos ou com caracteres de controle", () => {
    for (const invalid of ["", "A", "A\nB", "x".repeat(61)]) {
      expect(() => createDevelopmentIdentity(invalid)).toThrow(
        "Digite um nome de usuário com 2 a 60 caracteres."
      );
    }
  });

  it("AC-2705: lembra somente o nome e recompõe a identidade", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    const identity = createDevelopmentIdentity("Ana Souza");

    saveDevelopmentIdentity(storage, identity);

    expect(values.get(developmentIdentityStorageKey)).toBe('{"displayName":"Ana Souza"}');
    expect(loadDevelopmentIdentity(storage)).toEqual(identity);
    expect(values.get(developmentIdentityStorageKey)).not.toContain("conversation");
    expect(values.get(developmentIdentityStorageKey)).not.toContain("document");
  });

  it("AC-2703 e AC-2705: preserva o cadastro mínimo para restaurar após reinício", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    const identity = createDevelopmentIdentity("Ana Souza");

    rememberDevelopmentManagerName(storage, identity, "Marina Costa");

    rememberDevelopmentCondominium(
      storage,
      identity,
      "Marina Costa",
      { condominiumId: "jardins-1234", name: "Residencial Jardins", unitCount: 32 },
      true
    );

    expect(loadDevelopmentSetupProfile(storage, identity)).toEqual({
      completed: true,
      managerName: "Marina Costa",
      condominiums: [{ condominiumId: "jardins-1234", name: "Residencial Jardins", unitCount: 32 }]
    });
  });

  it("AC-2703: valida somente o valor de nome já confirmado pela conversa", () => {
    for (const invalid of [
      "Olá",
      "oi!",
      "bom dia",
      "tudo bem",
      "quero começar",
      "dê um exemplo de nome",
      "1234"
    ]) {
      expect(parseDevelopmentManagerName(invalid)).toBeUndefined();
    }

    expect(parseDevelopmentManagerName("Marina")).toBe("Marina");
    expect(parseDevelopmentManagerName("Ana Costa")).toBe("Ana Costa");
    expect(parseDevelopmentManagerName("Pode me chamar de Marina")).toBeUndefined();
  });

  it("AC-2703: ignora um nome inválido que tenha sido salvo por uma versão anterior", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    const identity = createDevelopmentIdentity("acesso-sintetico");
    values.set(
      `alvitra.demo.profile.${identity.userId}`,
      JSON.stringify({ completed: false, managerName: "Olá", condominiums: [] })
    );

    expect(loadDevelopmentSetupProfile(storage, identity)).toBeUndefined();
  });

  it("AC-2703: migra o cadastro anterior sem confundir usuário com nome de tratamento", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    const identity = createDevelopmentIdentity("acesso-marina");
    values.set(
      `alvitra.demo.profile.${identity.userId}`,
      JSON.stringify({
        completed: true,
        condominiums: [{ condominiumId: "aurora", name: "Aurora", unitCount: 24 }]
      })
    );

    expect(loadDevelopmentSetupProfile(storage, identity)).toEqual({
      completed: true,
      managerName: "",
      condominiums: [{ condominiumId: "aurora", name: "Aurora", unitCount: 24 }]
    });
  });
});
