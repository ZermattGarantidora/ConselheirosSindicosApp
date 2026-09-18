import { afterAll, describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import {
  createDevelopmentIdentityRepository,
  developmentUserId
} from "../../apps/api/identity/development-identity-repository.js";

describe("criação de condomínio para teste", () => {
  const developmentMembershipRegistry = createDevelopmentIdentityRepository();
  const app = createApi({
    membershipRepository: developmentMembershipRegistry,
    developmentMembershipRegistry,
    now: () => new Date("2026-09-01T00:00:00.000Z")
  });

  afterAll(async () => {
    await app.close();
  });

  const registration = {
    condominiumId: "teste-azul",
    name: "Residencial Azul",
    cnpj: "11.111.111/1111-11",
    administrationCompany: "Administradora Sintética",
    unitCount: 48,
    address: {
      postalCode: "01001-000",
      street: "Rua de Teste",
      number: "100",
      complement: "",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP"
    },
    contact: {
      managerName: "Gestor Sintético",
      email: "gestor@example.test",
      phone: "(00) 00000-0000"
    }
  } as const;

  it("cria um condomínio somente no registro de desenvolvimento e autoriza sua consulta", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: registration
    });
    const context = await app.inject({
      method: "GET",
      url: "/v1/condominiums/teste-azul/context",
      headers: { "x-development-user-id": developmentUserId() }
    });
    const answer = await app.inject({
      method: "POST",
      url: "/v1/condominiums/teste-azul/questions",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { question: "O que diz a convenção?" }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      condominiumId: "teste-azul",
      role: "manager",
      permissions: ["document:read", "document:upload"],
      condominium: {
        condominiumId: "teste-azul",
        name: "Residencial Azul",
        cnpj: "11111111111111",
        unitCount: 48,
        address: { city: "São Paulo", state: "SP" }
      }
    });
    expect(context.statusCode).toBe(200);
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({
      condominiumId: "teste-azul",
      answerMode: "abstained",
      citations: []
    });
  });

  it("não cria o mesmo condomínio de teste duas vezes para o mesmo usuário", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "teste-duplicado" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "teste-duplicado" }
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
  });

  it("não expõe o endpoint de teste quando o registro não foi habilitado", async () => {
    const productionLikeApp = createApi({
      membershipRepository: createDevelopmentIdentityRepository()
    });
    const response = await productionLikeApp.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "nao-expor" }
    });

    expect(response.statusCode).toBe(404);
    await productionLikeApp.close();
  });

  it("lista somente os cadastros criados pela identidade atual", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().condominiums).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condominiumId: "teste-azul", name: "Residencial Azul" })
      ])
    );
  });

  it("remove a associação de teste sem apagar o cadastro", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "teste-saida" }
    });
    const leave = await app.inject({
      method: "DELETE",
      url: "/v1/development/test-condominiums/teste-saida/membership",
      headers: { "x-development-user-id": developmentUserId() }
    });
    const context = await app.inject({
      method: "GET",
      url: "/v1/condominiums/teste-saida/context",
      headers: { "x-development-user-id": developmentUserId() }
    });

    expect(created.statusCode).toBe(201);
    expect(leave.statusCode).toBe(204);
    expect(context.statusCode).toBe(403);
  });

  it("apaga o condomínio de teste inteiro quando o síndico confirma", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "teste-apagar" }
    });
    const deletion = await app.inject({
      method: "DELETE",
      url: "/v1/development/test-condominiums/teste-apagar",
      headers: { "x-development-user-id": developmentUserId() }
    });
    const list = await app.inject({
      method: "GET",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() }
    });

    expect(created.statusCode).toBe(201);
    expect(deletion.statusCode).toBe(204);
    expect(list.json().condominiums).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ condominiumId: "teste-apagar" })])
    );
  });

  it("rejeita perfil incompleto sem criar uma associação órfã", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers: { "x-development-user-id": developmentUserId() },
      payload: { ...registration, condominiumId: "cadastro-invalido", cnpj: "123" }
    });
    const context = await app.inject({
      method: "GET",
      url: "/v1/condominiums/cadastro-invalido/context",
      headers: { "x-development-user-id": developmentUserId() }
    });

    expect(invalid.statusCode).toBe(400);
    expect(context.statusCode).toBe(403);
  });
});
