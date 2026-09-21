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
      citations: [
        {
          evidenceId: "chunk-animals",
          documentId: "convention-1",
          documentVersionId: "convention-v1",
          title: "Convenção sintética",
          page: 3,
          excerpt:
            "Animais de pequeno porte são permitidos nas unidades, sem circulação desacompanhada."
        }
      ],
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
          status: "completed",
          usage: { total_input_tokens: 20, total_output_tokens: 30 },
          steps: [
            { type: "model_output", content: [{ type: "text", text: JSON.stringify(generated) }] }
          ]
        }),
        { status: 200 }
      )
    );
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch, now: () => 10 });

    const result = await gateway.generate(input());

    expect(result.output).toMatchObject(generated);
    expect(result.output.citations[0]).toMatchObject({ startOffset: 0 });
    expect(result.telemetry).toMatchObject({
      providerKey: "google",
      inputTokens: 20,
      outputTokens: 30,
      outputHash: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
    expect(JSON.stringify(result.telemetry)).not.toContain("secret-key");
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ "x-goog-api-key": "secret-key" });
    const body = JSON.parse(String(request?.body)) as {
      model: string;
      store: boolean;
      input: string;
    };
    expect(body.model).toBe("gemini-3.5-flash-lite");
    expect(body.store).toBe(false);
    expect(body.input).toContain("EVIDENCE_DATA_START");
    expect(body.input).not.toContain("alameda");
  });

  it("falha fechada quando a Gemini não retorna JSON", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "completed", steps: [] }), { status: 200 })
      );
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch });

    await expect(gateway.generate(input())).rejects.toThrow("não retornou texto");
  });

  it("explica uma recusa de autorização sem expor a chave", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const gateway = createGeminiAnswerGateway({ apiKey: "secret-key", fetch });

    await expect(gateway.generate(input())).rejects.toThrow("chave da Gemini não está autorizada");
  });

  it("usa texto livre para orientação conversacional sem evidência documental", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text: "Primeiro, isole a área e confirme se alguém se machucou. Depois, registre o ocorrido e acione um profissional para avaliar o reparo."
                }
              ]
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
      store: boolean;
      response_format?: unknown;
    };
    expect(body.store).toBe(false);
    expect(body.response_format).toBeUndefined();
  });
});
