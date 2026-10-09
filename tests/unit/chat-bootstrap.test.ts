import { afterEach, describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

const apps: ReturnType<typeof createApi>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("inicialização segura do chat", () => {
  it("AC-1602: resolve o primeiro contexto autorizado sem escolha do cliente", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository()
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/chat/bootstrap",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      condominiumId: "alameda",
      role: "manager",
      permissions: ["document:read", "document:upload"]
    });
  });

  it("AC-1603: não retorna contexto sem identidade autorizada", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository()
    });
    apps.push(app);

    const missingIdentity = await app.inject({ method: "GET", url: "/v1/chat/bootstrap" });
    const unknownIdentity = await app.inject({
      method: "GET",
      url: "/v1/chat/bootstrap",
      headers: { "x-development-user-id": "usuario-sem-condominio" }
    });

    expect(missingIdentity.statusCode).toBe(401);
    expect(unknownIdentity.statusCode).toBe(404);
    expect(JSON.stringify(unknownIdentity.json())).not.toContain("alameda");
    expect(JSON.stringify(unknownIdentity.json())).not.toContain("bosque");
  });

  it("AC-1902 e AC-1903: lista apenas condomínios autorizados", async () => {
    const app = createApi({ membershipRepository: createDevelopmentIdentityRepository() });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/chat/condominiums",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(response.statusCode).toBe(200);
    expect(
      response.json().condominiums.map((item: { condominiumId: string }) => item.condominiumId)
    ).toEqual(["alameda", "bosque"]);
  });
});
