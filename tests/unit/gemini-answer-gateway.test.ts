import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createGeminiAnswerGateway } from "../../apps/api/answers/gemini-answer-gateway.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";

function evidence(): RetrievalEvidence {
  const content =
    "Animais de pequeno porte são permitidos nas unidades, sem circulação desacompanhada.";
  return {
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
}

function input() {
  return {
    question: "Animais são permitidos?",
    task: "grounded_answer" as const,
    riskClass: "low" as const,
    evidence: [evidence()],
    budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100_000 }
  };
}

describe("gateway Gemini", () => {
  it("envia somente o prompt documental estruturado e preserva telemetria mínima", async () => {
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
      new Response(
        JSON.stringify({
          usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 30 },
          candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }]
        }),
        { status: 200 }
      )
    );
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch, now: () => 10 });

    const result = await gateway.generate(input());

    expect(result.output).toMatchObject({
      ...generated,
      citations: [
        {
          evidenceId: "chunk-animals",
          documentId: "convention-1",
          documentVersionId: "convention-v1",
          title: "Convenção sintética",
          page: 3,
          excerpt:
            "Animais de pequeno porte são permitidos nas unidades, sem circulação desacompanhada.",
          startOffset: 0
        }
      ]
    });
    expect(result.telemetry).toMatchObject({
      providerKey: "google",
      inputTokens: 20,
      outputTokens: 30,
      outputHash: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
    expect(JSON.stringify(result.telemetry)).not.toContain("secret-key");
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
    );
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ "x-goog-api-key": "secret-key" });
    const body = JSON.parse(String(request?.body)) as {
      contents: readonly Readonly<{ parts: readonly Readonly<{ text: string }>[] }>[];
      generationConfig: Readonly<{
        maxOutputTokens: number;
        responseMimeType: string;
        responseJsonSchema: unknown;
      }>;
    };
    expect(body.contents[0]?.parts[0]?.text).toContain("EVIDENCE_DATA_START");
    expect(body.contents[0]?.parts[0]?.text).toContain("muito gente boa e presente na conversa");
    expect(body.contents[0]?.parts[0]?.text).toContain(
      "Nunca invente fonte, citação, regra, valor, prazo, vigência ou decisão"
    );
    expect(body.contents[0]?.parts[0]?.text).not.toContain("alameda");
    expect(body.generationConfig).toMatchObject({
      maxOutputTokens: 800,
      responseMimeType: "application/json",
      responseJsonSchema: expect.any(Object)
    });
    expect(JSON.stringify(body.generationConfig.responseJsonSchema)).not.toContain("documentId");
    expect(JSON.stringify(body.generationConfig.responseJsonSchema)).not.toContain("excerpt");
  });

  it("falha fechada quando a Gemini não retorna JSON", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    const gateway = createGeminiAnswerGateway({
      apiKey: "secret-key",
      fetch,
      maximumAttempts: 1
    });

    await expect(gateway.generate(input())).rejects.toThrow("não retornou texto");
  });

  it("explica uma recusa de autorização sem expor a chave", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch });

    await expect(gateway.generate(input())).rejects.toThrow("chave da Gemini não está autorizada");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("repete uma falha transitória antes de usar a resposta da Gemini", async () => {
    const generated = {
      answer: "A convenção permite animais de pequeno porte nas unidades.",
      answerMode: "grounded",
      citations: [{ evidenceId: "chunk-animals" }],
      attentionPoints: [],
      suggestedNextStep: null,
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
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response("temporarily unavailable", {
          status: 503,
          headers: { "retry-after": "0.25" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }]
          }),
          { status: 200 }
        )
      );
    const sleep = vi.fn(async () => undefined);
    const gateway = createGeminiAnswerGateway({
      apiKey: "secret-key",
      fetch,
      sleep,
      retryBaseDelayMs: 10
    });

    const result = await gateway.generate(input());

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
    expect(result.telemetry.routingReason).toContain("tentativa 2");
    expect(result.output.answerMode).toBe("grounded");
  });

  it("repete uma falha de rede e respeita o limite configurado", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError("network unavailable"));
    const sleep = vi.fn(async () => undefined);
    const gateway = createGeminiAnswerGateway({
      apiKey: "secret-key",
      fetch,
      sleep,
      maximumAttempts: 3,
      retryBaseDelayMs: 10
    });

    await expect(gateway.generate(input())).rejects.toThrow(
      "Não foi possível consultar a Gemini com segurança"
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("usa texto livre para orientação conversacional sem evidência documental", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "Primeiro, isole a área e confirme se alguém se machucou. Depois, registre o ocorrido e acione um profissional para avaliar o reparo."
                  }
                ]
              }
            }
          ]
        }),
        { status: 200 }
      )
    );
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch });

    const result = await gateway.generate({
      ...input(),
      question: "Um vidro da área comum quebrou. Como devo prosseguir?",
      evidence: []
    });

    expect(result.output).toMatchObject({
      answerMode: "abstained",
      citations: [],
      attentionPoints: []
    });
    expect(result.output.answer).toContain("isole a área");
    const request = fetch.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      generationConfig: Readonly<{
        maxOutputTokens: number;
        responseMimeType?: unknown;
        responseJsonSchema?: unknown;
      }>;
    };
    expect(body.generationConfig.maxOutputTokens).toBe(800);
    expect(body.generationConfig.responseMimeType).toBeUndefined();
    expect(body.generationConfig.responseJsonSchema).toBeUndefined();
  });
});
