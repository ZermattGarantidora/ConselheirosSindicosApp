import { describe, expect, it } from "vitest";

import {
  createCondominiumId,
  withCondominiumScope
} from "../../apps/api/core/condominium-scope.js";

describe("CondominiumScope", () => {
  it("normaliza e preserva o identificador do condomínio no escopo", () => {
    const scope = withCondominiumScope(createCondominiumId("  condominio-azul  "));

    expect(scope.condominiumId).toBe("condominio-azul");
    expect(Object.isFrozen(scope)).toBe(true);
  });

  it("recusa identificadores vazios antes de criar o escopo", () => {
    expect(() => createCondominiumId("   ")).toThrow("CondominiumId não pode ser vazio.");
  });
});
