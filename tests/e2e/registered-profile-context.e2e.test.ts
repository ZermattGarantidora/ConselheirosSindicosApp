import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { generalAnswer, structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryCondominiumProfileRepository } from "../../apps/api/identity/in-memory-condominium-profile.js";
import { createEvidence, createRetrievalResult } from "../unit/answer-fixtures.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

function fixture(memoryEnabled = true) {
  const identities = createDevelopmentIdentityRepository();
  const profiles = createInMemoryCondominiumProfileRepository([], (userId, condominiumId) => {
    const registered = identities
      .listTestCondominiums(userId)
      .find((item) => item.condominiumId === condominiumId);
    return registered === undefined ? undefined : { ...registered, description: "" };
  });
  const generate = vi.fn(async (input: AnswerGatewayInput) => {
    const profile = input.conversationContext?.confirmedProfile;
    return {
      output: generalAnswer(
        profile === undefined
          ? "Não tenho o nome do condomínio nesta conversa."
          : `No cadastro, você informou ${profile.name}, com ${profile.unitCount} unidades.`
      ),
      telemetry: createAnswerTelemetry()
    };
  });
  const search = vi.fn(async () => createRetrievalResult([]));
  const app = createApi({
    membershipRepository: identities,
    developmentMembershipRegistry: identities,
    condominiumProfileRepository: profiles,
    answerUseCase: createAnswerUseCase({
      chatMemoryEnabled: memoryEnabled,
      persistence: createInMemoryAnswerPersistence(),
      gateway: { generate },
      retriever: { search }
    })
  });
  const headers = { "x-development-user-id": "perfil-sintetico" };
  const register = async (condominiumId: string, name: string, unitCount: number) => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/development/test-condominiums",
      headers,
      payload: { condominiumId, name, unitCount }
    });
    expect(response.statusCode).toBe(201);
  };
  const ask = (condominiumId: string, question: string, extra: Record<string, unknown> = {}) =>
    app.inject({
      method: "POST",
      url: `/v1/condominiums/${condominiumId}/questions`,
      headers,
      payload: { question, ...extra }
    });
  return { app, profiles, headers, generate, search, register, ask };
}

describe("Spec 021 — cadastro chega às respostas do chat", () => {
  it("AC-4603b: rateio e emissão das unidades usam evidência documental, apesar do perfil cadastrado", async () => {
    const f = fixture();
    const evidence = createEvidence({
      documentTitle: "Balancete FICTÍCIO — abril de 2028",
      documentType: "other",
      content:
        "FICTÍCIO — SOMENTE TESTE. Rateio mensal de R$ 900,00 por unidade. Reserva de R$ 45,00 por unidade. Emissão mensal das 20 unidades de R$ 18.900,00. Emissão não equivale a recebimento."
    });
    const question =
      "Qual é o rateio ordinário por unidade, o adicional de reserva, o total por unidade e a emissão mensal para as 20 unidades? Emissão mensal significa que tudo entrou no caixa?";
    f.search.mockResolvedValue(createRetrievalResult([evidence]));
    f.generate.mockImplementation(async (input) => ({
      output: structuredAnswer(
        JSON.stringify({
          answer:
            "O rateio é R$ 900,00 e a reserva é R$ 45,00: R$ 900,00 + R$ 45,00 = R$ 945,00 por unidade. A emissão mensal é R$ 18.900,00. Emissão não comprova entrada integral no caixa.",
          answerMode: "grounded",
          citations: [{ evidenceId: evidence.id }],
          attentionPoints: [],
          suggestedNextStep: null,
          specialist: { required: false, type: null, reason: null },
          claims: [
            {
              statement: "O rateio é R$ 900,00, a reserva é R$ 45,00 e a emissão é R$ 18.900,00.",
              claimType: "condominium_fact",
              evidenceRequired: true,
              citationEvidenceIds: [evidence.id]
            }
          ]
        }),
        input
      ),
      telemetry: createAnswerTelemetry()
    }));
    try {
      await f.register("aurora-perfil", "Residencial Aurora", 20);
      const response = await f.ask("aurora-perfil", question);
      expect(response.statusCode).toBe(200);
      expect(response.json().answerMode).toBe("grounded");
      expect(response.json().answer).toContain("R$ 945,00");
      expect(response.json().citations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentVersionId: evidence.documentVersionId,
            excerpt: evidence.content
          })
        ])
      );
      expect(f.search).toHaveBeenCalledTimes(1);
      expect(f.generate.mock.calls[0]![0].evidence).toEqual([evidence]);
    } finally {
      await f.app.close();
    }
  });
  it.each([true, false])(
    "retoma nome e unidades sem replay do cadastro; histórico ligado=%s",
    async (memoryEnabled) => {
      const f = fixture(memoryEnabled);
      try {
        await f.register("aurora-perfil", "Residencial Aurora", 64);
        for (const question of [
          "O que sabe sobre o meu condomínio?",
          "Qual é o nome do meu condomínio?",
          "Quantas unidades tem?"
        ]) {
          const response = await f.ask("aurora-perfil", question);
          expect(response.statusCode).toBe(200);
          expect(response.json().answer).toContain("Residencial Aurora");
          expect(response.json().answer).toContain("64 unidades");
          expect(response.json().citations).toEqual([]);
          expect(response.json().attentionPoints).toEqual([]);
        }
        expect(f.generate).toHaveBeenCalledTimes(3);
        expect(f.generate.mock.calls[0]![0].conversationContext!.turns).toEqual([]);
        expect(f.generate.mock.calls[0]![0].evidence).toEqual([]);
        expect(f.search).not.toHaveBeenCalled();
      } finally {
        await f.app.close();
      }
    }
  );

  it("mantém perfil no chat novo, na janela recente e ao alternar condomínios; corpo não forja cadastro", async () => {
    const f = fixture();
    try {
      await f.register("aurora-perfil", "Residencial Aurora", 64);
      await f.register("lago-perfil", "Residencial Lago", 28);
      const chatId = randomUUID();
      expect(
        (
          await f.app.inject({
            method: "POST",
            url: "/v1/condominiums/aurora-perfil/chats",
            headers: f.headers,
            payload: { id: chatId, title: "Conversa sintética" }
          })
        ).statusCode
      ).toBe(201);
      for (let index = 0; index < 10; index++)
        expect(
          (await f.ask("aurora-perfil", `Mensagem sintética ${index}.`, { chatId })).statusCode
        ).toBe(200);
      const response = await f.ask("aurora-perfil", "Qual é o nome do meu condomínio?", {
        chatId,
        registeredProfile: { condominiumId: "lago-perfil", name: "Nome forjado", unitCount: 999 }
      });
      expect(response.json().answer).toContain("Residencial Aurora");
      const last = f.generate.mock.calls.at(-1)![0];
      expect(last.conversationContext!.turns).toHaveLength(8);
      expect(last.conversationContext!.confirmedProfile!.name).toBe("Residencial Aurora");
      expect(
        (await f.ask("lago-perfil", "Qual o nome do meu condomínio?")).json().answer
      ).toContain("Residencial Lago");
      expect(f.generate.mock.calls.at(-1)![0].conversationContext!.turns).toEqual([]);
      const blocked = await f.app.inject({
        method: "POST",
        url: "/v1/condominiums/aurora-perfil/questions",
        headers: { "x-development-user-id": "sem-associacao" },
        payload: { question: "Qual o nome?" }
      });
      expect(blocked.statusCode).toBe(403);
    } finally {
      await f.app.close();
    }
  });

  it("conserva os filtros de afirmações locais e consulta documentos quando o cadastro não basta", async () => {
    const f = fixture();
    try {
      await f.register("aurora-perfil", "Residencial Aurora", 64);
      f.generate.mockResolvedValueOnce({
        output: generalAnswer("O condomínio tem 64 unidades."),
        telemetry: createAnswerTelemetry()
      });
      const known = await f.ask("aurora-perfil", "Quantas unidades tem?");
      expect(known.json().answer).toBe("O condomínio tem 64 unidades.");
      f.generate.mockResolvedValueOnce({
        output: generalAnswer("O condomínio permite obras sem autorização."),
        telemetry: createAnswerTelemetry()
      });
      const unrelated = await f.ask("aurora-perfil", "Qual é o nome do meu condomínio?");
      expect(unrelated.json().answer).not.toContain("permite obras");
      const documentary = await f.ask("aurora-perfil", "Quantas unidades constam na convenção?");
      expect(documentary.statusCode).toBe(200);
      expect(f.search).toHaveBeenCalledTimes(1);
      expect(documentary.json().attentionPoints[0]).toContain("documentos");
    } finally {
      await f.app.close();
    }
  });

  it.each(["failure", "foreign"] as const)(
    "não gera amnésia quando a leitura do cadastro falha: %s",
    async (kind) => {
      const f = fixture();
      try {
        await f.register("aurora-perfil", "Residencial Aurora", 64);
        const original = f.profiles.getProfile.bind(f.profiles);
        vi.spyOn(f.profiles, "getProfile").mockImplementation(async (input) => {
          if (kind === "failure") throw new Error("Erro interno sintético");
          return { ...(await original(input))!, condominiumId: "outro-condominio" };
        });
        const response = await f.ask("aurora-perfil", "Qual é o nome do meu condomínio?");
        expect(response.statusCode).toBe(503);
        expect(response.body).not.toContain("Erro interno");
        expect(f.generate).not.toHaveBeenCalled();
      } finally {
        await f.app.close();
      }
    }
  );
});
