import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createUserId,
  resolveAuthorizedCondominiumContext,
  type MembershipRepository
} from "../../apps/api/identity/authorized-condominium-context.js";
import {
  ScopedEvidenceStore,
  TenantScopedCache
} from "../../apps/api/retrieval/scoped-retrieval.js";

const alameda = createCondominiumId("alameda");
const bosque = createCondominiumId("bosque");
const userId = createUserId("sindico-1");
const repository: MembershipRepository = {
  async findMembership({ condominiumId }) {
    return {
      condominiumId,
      userId,
      roleKey: "manager",
      status: "active",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      revision: `membership-${condominiumId}`
    };
  }
};

describe("retrieval e cache escopados", () => {
  it("não recupera a frase-canário de outro condomínio", async () => {
    const context = await resolveAuthorizedCondominiumContext(repository, {
      userId,
      condominiumId: alameda,
      now: new Date("2026-09-01T00:00:00.000Z")
    });
    const store = new ScopedEvidenceStore([
      { id: "alameda-1", condominiumId: alameda, content: "CANARIO-ALAMEDA-927" },
      { id: "bosque-1", condominiumId: bosque, content: "CANARIO-BOSQUE-581" }
    ]);

    const results = store.findForContext(context);

    expect(results.map((item) => item.content)).toEqual(["CANARIO-ALAMEDA-927"]);
    expect(results.some((item) => item.content.includes("BOSQUE"))).toBe(false);
  });

  it("segmenta cache por condomínio, identidade, permissão e versão", async () => {
    const at = new Date("2026-09-01T00:00:00.000Z");
    const alamedaContext = await resolveAuthorizedCondominiumContext(repository, {
      userId,
      condominiumId: alameda,
      now: at
    });
    const bosqueContext = await resolveAuthorizedCondominiumContext(repository, {
      userId,
      condominiumId: bosque,
      now: at
    });
    const cache = new TenantScopedCache<string>();
    const input = { documentVersion: "v1", query: "qual é a regra?" };

    cache.set(bosqueContext, input, "CANARIO-BOSQUE-581");

    expect(cache.get(alamedaContext, input)).toBeUndefined();
    expect(cache.get(bosqueContext, input)).toBe("CANARIO-BOSQUE-581");
  });

  it("invalida a chave quando permissões, versões ou pipeline mudam", async () => {
    const at = new Date("2026-09-01T00:00:00.000Z");
    const cache = new TenantScopedCache<string>();
    const input = {
      documentVersion: ["v1", "v2"],
      query: "qual é a regra?",
      pipelineVersion: "hybrid-v1"
    } as const;
    const managerContext = await resolveAuthorizedCondominiumContext(repository, {
      userId,
      condominiumId: alameda,
      now: at
    });

    cache.set(managerContext, input, "RESULTADO-ALAMEDA");
    expect(cache.get(managerContext, { ...input, documentVersion: ["v2", "v1"] })).toBe(
      "RESULTADO-ALAMEDA"
    );
    expect(cache.get(managerContext, { ...input, documentVersion: "v1" })).toBeUndefined();
    expect(cache.get(managerContext, { ...input, pipelineVersion: "hybrid-v2" })).toBeUndefined();
    expect(cache.get({ ...managerContext, permissions: ["document:read"] }, input)).toBeUndefined();
  });
});
