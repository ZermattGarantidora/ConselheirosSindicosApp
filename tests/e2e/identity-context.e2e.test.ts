import { afterAll, describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import {
  createUserId,
  type MembershipRepository
} from "../../apps/api/identity/authorized-condominium-context.js";

describe("seleção de condomínio", () => {
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    now: () => new Date("2026-09-01T00:00:00.000Z")
  });

  afterAll(async () => {
    await app.close();
  });

  it("expõe o health check versionado", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", version: "0.1.0" });
  });

  it("AC-001: devolve o contexto autorizado no servidor", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/context",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      condominiumId: "alameda",
      role: "manager",
      permissions: ["document:read"]
    });
  });

  it("AC-002: nega o acesso sem confirmar o condomínio alvo", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/condominiums/bosque/context",
      headers: { "x-development-user-id": "morador-alameda-demo" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ message: "Acesso não autorizado." });
  });

  it("AC-003: revalida a membership depois de uma revogação", async () => {
    let revoked = false;
    const repository: MembershipRepository = {
      async findMembership({ condominiumId, userId }) {
        return {
          condominiumId,
          userId,
          roleKey: "manager",
          status: revoked ? "revoked" : "active",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          revision: "membership-v1"
        };
      }
    };
    const revocableApp = createApi({
      membershipRepository: repository,
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const firstResponse = await revocableApp.inject({
      method: "GET",
      url: `/v1/condominiums/${createCondominiumId("alameda")}/context`,
      headers: { "x-development-user-id": createUserId("sindico-demo") }
    });
    revoked = true;
    const responseAfterRevocation = await revocableApp.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/context",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(responseAfterRevocation.statusCode).toBe(403);
    await revocableApp.close();
  });

  it("recusa identidade de desenvolvimento ausente", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/condominiums/alameda/context" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Identidade de desenvolvimento inválida." });
  });
});
