import { describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerService } from "../../apps/api/answers/answer-service.js";
import { createLocalExtractiveGateway } from "../../apps/api/answers/local-extractive-gateway.js";
import { startServer } from "../../apps/api/app/server.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

describe("consulta documental", () => {
  it("AC-010 e AC-018: responde no condomínio autorizado com contrato e citação verificável", async () => {
    const app = await startServer(0);

    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/answers",
      headers: { "x-development-user-id": "sindico-demo" },
      payload: { question: "A locação por temporada é permitida?" }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      answerMode: "grounded",
      citations: [
        {
          documentId: "alameda-convencao",
          documentVersionId: "alameda-convencao-v1",
          page: 3,
          excerpt: expect.stringContaining(
            "A locação por temporada depende de autorização em assembleia"
          )
        }
      ]
    });
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining([
        "answer",
        "answerMode",
        "citations",
        "claims",
        "attentionPoints",
        "suggestedNextStep",
        "specialist"
      ])
    );
    await app.close();
  });

  it("AC-014: não usa o corpus de outro condomínio e se abstém quando não há base", async () => {
    const app = await startServer(0);

    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/answers",
      headers: { "x-development-user-id": "sindico-demo" },
      payload: { question: "Meteorito" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ answerMode: "abstained", citations: [] });
    expect(response.body).not.toContain("No Bosque");
    await app.close();
  });

  it("nega a consulta de um condomínio que o usuário não pode acessar", async () => {
    const app = await startServer(0);

    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/bosque/answers",
      headers: { "x-development-user-id": "morador-alameda-demo" },
      payload: { question: "Qual é a regra sobre visitantes?" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).not.toContain("Bosque");
    await app.close();
  });

  it("abre somente a página citada no contexto autorizado", async () => {
    const app = await startServer(0);

    const source = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents/alameda-convencao/versions/alameda-convencao-v1/pages/3",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    const crossTenant = await app.inject({
      method: "GET",
      url: "/v1/condominiums/bosque/documents/alameda-convencao/versions/alameda-convencao-v1/pages/3",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(source.statusCode).toBe(200);
    expect(source.json()).toMatchObject({
      title: "Convenção do Condomínio Alameda",
      page: 3,
      content: expect.stringContaining("locação por temporada")
    });
    expect(crossTenant.statusCode).toBe(404);
    expect(crossTenant.body).not.toContain("Alameda");
    await app.close();
  });

  it("rejeita pergunta vazia e não expõe uma resposta sem serviço configurado", async () => {
    const app = await startServer(0);

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/answers",
      headers: { "x-development-user-id": "sindico-demo" },
      payload: { question: " " }
    });

    expect(invalid.statusCode).toBe(400);
    await app.close();
  });

  it("AC-021: falha de retrieval retorna erro recuperável sem resposta sintética", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerService: createAnswerService(createLocalExtractiveGateway()),
      retriever: {
        search: async () => Promise.reject(new Error("retrieval indisponível"))
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/answers",
      headers: { "x-development-user-id": "sindico-demo" },
      payload: { question: "Quando vence o contrato?" }
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("vence");
    await app.close();
  });
});
