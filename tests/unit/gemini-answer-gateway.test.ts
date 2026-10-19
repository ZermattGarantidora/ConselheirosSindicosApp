import { describe, expect, it, vi } from "vitest";

import {
  AnswerGatewayUnavailableError,
  createProviderFallbackAnswerGateway,
  type AnswerGateway,
  type AnswerGatewayInput
} from "../../apps/api/answers/answer-gateway.js";
import {
  createGeminiAnswerGateway,
  createGeminiAnswerGatewayFromEnvironment
} from "../../apps/api/answers/gemini-answer-gateway.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";

const input: AnswerGatewayInput = {
  question: "Escreva somente a próxima fala da Alvitra.",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  budget: { maximumOutputTokens: 300, maximumCostMicrounits: 100_000 }
};

function documentaryInput(): AnswerGatewayInput {
  const content = "Animais de pequeno porte são permitidos nas unidades.";
  const evidence: RetrievalEvidence = {
    id: "chunk-animals",
    condominiumId: createCondominiumId("alameda"),
    documentId: "convention-1",
    documentVersionId: "convention-v1",
    documentVersionNumber: 1,
    documentTitle: "Convenção sintética",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "page-1",
    pageNumber: 3,
    startOffset: 0,
    endOffset: Array.from(content).length,
    content,
    contentSha256: "a".repeat(64),
    semanticScore: 0.9,
    extractionMethod: "pdf_text",
    qualityScore: 0.99,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null,
    lexicalScore: 0.9,
    rerankScore: 0.9,
    rank: 1
  };
  return { ...input, question: "Animais são permitidos?", evidence: [evidence] };
}

describe("gateway Gemini preservado durante a migração", () => {
  it("gera conversa sem evidência usando a configuração do servidor", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 12 },
        candidates: [{ content: { parts: [{ text: "Oi! Como você prefere ser chamado?" }] } }]
      })
    );
    const gateway = createGeminiAnswerGateway({ apiKey: "synthetic-key", fetch });

    const result = await gateway.generate(input);

    expect(result.output.answer).toBe("Oi! Como você prefere ser chamado?");
    expect(result.telemetry).toMatchObject({ providerKey: "google", inputTokens: 20 });
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-goog-api-key": "synthetic-key"
    });
  });

  it("só ativa o gateway quando existe chave e permite desligamento explícito", () => {
    expect(createGeminiAnswerGatewayFromEnvironment({})).toBeUndefined();
    expect(
      createGeminiAnswerGatewayFromEnvironment({
        GEMINI_API_KEY: "synthetic-key",
        GEMINI_ENABLED: "false"
      })
    ).toBeUndefined();
    expect(
      createGeminiAnswerGatewayFromEnvironment({ GEMINI_API_KEY: "synthetic-key" })
    ).toBeDefined();
  });

  it("usa Gemini quando o provedor principal fica indisponível", async () => {
    const primary = {
      generate: vi.fn(async () => {
        throw new AnswerGatewayUnavailableError("OpenAI indisponível");
      })
    } as unknown as AnswerGateway;
    const fallback = {
      generate: vi.fn(async () => ({ output: { answer: "Resposta da Gemini" } }))
    } as unknown as AnswerGateway;

    const result = await createProviderFallbackAnswerGateway(primary, fallback).generate(input);

    expect(result.output.answer).toBe("Resposta da Gemini");
    expect(fallback.generate).toHaveBeenCalledOnce();
  });

  it("valida a saída documental e reconstrói a citação localmente", async () => {
    const generated = {
      answer: "A convenção permite animais de pequeno porte nas unidades.",
      answerMode: "grounded",
      citations: [{ evidenceId: "chunk-animals" }],
      attentionPoints: [],
      suggestedNextStep: "Confira a página citada.",
      specialist: { required: false, type: null, reason: null },
      claims: [
        {
          statement: "A convenção permite animais de pequeno porte nas unidades.",
          claimType: "condominium_fact",
          evidenceRequired: true,
          citationEvidenceIds: ["chunk-animals"]
        }
      ]
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }]
      })
    );

    const result = await createGeminiAnswerGateway({ apiKey: "synthetic-key", fetch }).generate(
      documentaryInput()
    );

    expect(result.output.citations[0]).toMatchObject({
      evidenceId: "chunk-animals",
      documentId: "convention-1",
      page: 3
    });
    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      generationConfig: { responseMimeType?: string; responseJsonSchema?: unknown };
    };
    expect(request.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: expect.any(Object)
    });
  });

  it("falha fechada quando a resposta não contém texto", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ candidates: [] }));
    const gateway = createGeminiAnswerGateway({
      apiKey: "synthetic-key",
      fetch,
      maximumAttempts: 1
    });

    await expect(gateway.generate(input)).rejects.toThrow("não retornou texto");
  });

  it("não repete uma falha permanente de autorização", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const gateway = createGeminiAnswerGateway({ apiKey: "synthetic-key", fetch });

    await expect(gateway.generate(input)).rejects.toThrow("chave da Gemini");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("repete uma falha transitória respeitando Retry-After", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response("temporarily unavailable", {
          status: 503,
          headers: { "retry-after": "0.25" }
        })
      )
      .mockResolvedValueOnce(
        Response.json({ candidates: [{ content: { parts: [{ text: "Tudo certo." }] } }] })
      );
    const sleep = vi.fn(async () => undefined);
    const gateway = createGeminiAnswerGateway({
      apiKey: "synthetic-key",
      fetch,
      sleep,
      retryBaseDelayMs: 10
    });

    await expect(gateway.generate(input)).resolves.toMatchObject({
      output: { answer: "Tudo certo." }
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("limita as tentativas quando a rede falha", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("network"));
    const sleep = vi.fn(async () => undefined);
    const gateway = createGeminiAnswerGateway({
      apiKey: "synthetic-key",
      fetch,
      sleep,
      maximumAttempts: 3,
      retryBaseDelayMs: 0
    });

    await expect(gateway.generate(input)).rejects.toThrow("com segurança");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
