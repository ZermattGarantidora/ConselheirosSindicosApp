import { describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryCondominiumProfileRepository } from "../../apps/api/identity/in-memory-condominium-profile.js";

const condominiumId = createCondominiumId("alameda");
const photoId = "00000000-0000-4000-8000-000000000001";
const profile = {
  condominiumId,
  name: "Residencial Alameda",
  cnpj: "12345678000199",
  address: {
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "São Paulo",
    state: "SP"
  },
  administrationCompany: "",
  unitCount: null,
  contact: { managerName: "", email: "", phone: "" },
  description: ""
};

function appWithProfile() {
  return createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    condominiumProfileRepository: createInMemoryCondominiumProfileRepository([profile])
  });
}

const managerHeaders = { "x-development-user-id": "sindico-demo" };
const jpeg = Buffer.from([0xff, 0xd8, 0xff]).toString("base64");
const update = {
  name: "Alameda Atualizado",
  address: { city: "São Paulo", state: "SP" },
  contact: {},
  unitCount: 10
};

describe("rotas HTTP do perfil de condomínio", () => {
  it("lista, atualiza e gerencia foto somente para o síndico autorizado", async () => {
    const app = appWithProfile();
    try {
      const initial = await app.inject({
        method: "GET",
        url: "/v1/condominiums/alameda/profile",
        headers: managerHeaders
      });
      expect(initial.statusCode).toBe(200);
      expect(initial.json()).toMatchObject({ profile: { cnpj: profile.cnpj }, photos: [] });

      const saved = await app.inject({
        method: "PUT",
        url: "/v1/condominiums/alameda/profile",
        headers: managerHeaders,
        payload: update
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json().profile).toMatchObject({
        name: update.name,
        cnpj: profile.cnpj,
        unitCount: 10
      });

      const created = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/profile/photos",
        headers: managerHeaders,
        payload: { mediaType: "image/jpeg", contentBase64: jpeg }
      });
      expect(created.statusCode).toBe(201);
      const createdPhotoId = created.json().photo.photoId as string;
      const image = await app.inject({
        method: "GET",
        url: `/v1/condominiums/alameda/profile/photos/${createdPhotoId}`,
        headers: managerHeaders
      });
      expect(image.statusCode).toBe(200);
      expect(image.headers["cache-control"]).toBe("private, no-store");
      expect(image.body).toBe(Buffer.from([0xff, 0xd8, 0xff]).toString());
      expect(
        (
          await app.inject({
            method: "PUT",
            url: `/v1/condominiums/alameda/profile/photos/${createdPhotoId}/cover`,
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(204);
      expect(
        (
          await app.inject({
            method: "DELETE",
            url: `/v1/condominiums/alameda/profile/photos/${createdPhotoId}`,
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(204);
    } finally {
      await app.close();
    }
  });

  it("nega sessão, membro sem papel e identificadores de foto inválidos sem expor dados", async () => {
    const app = appWithProfile();
    try {
      expect(
        (await app.inject({ method: "GET", url: "/v1/condominiums/alameda/profile" })).statusCode
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/v1/condominiums/alameda/profile",
            headers: { "x-development-user-id": "morador-alameda-demo" },
            payload: update
          })
        ).statusCode
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/profile/photos",
            headers: { "x-development-user-id": "morador-alameda-demo" },
            payload: { mediaType: "image/jpeg", contentBase64: jpeg }
          })
        ).statusCode
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/v1/condominiums/alameda/profile/photos/invalida",
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/v1/condominiums/bosque/profile",
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/profile/photos",
            headers: managerHeaders,
            payload: { mediaType: "image/png", contentBase64: jpeg }
          })
        ).statusCode
      ).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("mantém a foto solicitada dentro do condomínio e não retorna foto ausente", async () => {
    const app = appWithProfile();
    try {
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/v1/condominiums/alameda/profile/photos/${photoId}`,
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: "DELETE",
            url: `/v1/condominiums/alameda/profile/photos/${photoId}`,
            headers: managerHeaders
          })
        ).statusCode
      ).toBe(500);
    } finally {
      await app.close();
    }
  });
});
