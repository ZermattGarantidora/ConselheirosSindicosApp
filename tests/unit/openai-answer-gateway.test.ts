import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createOpenAiAnswerGateway } from "../../apps/api/answers/openai-answer-gateway.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";

const evidence: RetrievalEvidence = {
  id: "evidence-1",
  condominiumId: createCondominiumId("alameda"),
  documentId: "convention-1",
  documentVersionId: "convention-v1",
  documentVersionNumber: 1,
  documentTitle: "Convenção sintética",
  documentType: "convention",
  sourceKind: "user_upload",
  pageId: "page-1",
  pageNumber: 2,
  startOffset: 0,
  endOffset: 24,
  content: "A assembleia ocorre em maio.",
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

function input(evidenceList: readonly RetrievalEvidence[] = []) {
  return {
    question: "Como organizar a assembleia?",
    task: "grounded_answer" as const,
    riskClass: "low" as const,
    evidence: evidenceList,
    budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100_000 }
  };
}

function providerResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text }] }],
      usage: { input_tokens: 20, output_tokens: 30, input_tokens_details: { cached_tokens: 5 } }
    }),
    { status: 200 }
  );
}

describe("gateway OpenAI", () => {
  it("responde orientação geral sem inventar citação e sem expor chave", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        providerResponse(
          "Defina pauta e prazo de convocação. Confira a regra aplicável antes de enviar."
        )
      );
    const gateway = createOpenAiAnswerGateway({ apiKey: "secret-key", fetch, now: () => 10 });

    const result = await gateway.generate(input());

    expect(result.output.answer).toContain("Defina pauta");
    expect(result.output.citations).toEqual([]);
    expect(result.output.answerMode).toBe("abstained");
    expect(result.telemetry).toMatchObject({
      providerKey: "openai",
      inputTokens: 20,
      outputTokens: 30,
      cachedInputTokens: 5
    });
    expect(JSON.stringify(result.telemetry)).not.toContain("secret-key");
    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ authorization: "Bearer secret-key" });
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ model: "gpt-6.1-sol", store: false, max_output_tokens: 800 });
    expect(body).not.toHaveProperty("text");
    expect(body.input).toMatchObject([{ role: "developer" }, { role: "user" }]);
  });

  it("reconstrói citações exclusivamente das evidências recebidas", async () => {
    const generated = {
      answer: "A convenção prevê assembleia em maio.",
      answerMode: "grounded",
      citations: [{ evidenceId: "evidence-1" }, { evidenceId: "other-tenant" }],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: false, type: null, reason: null },
      claims: [
        {
          statement: "A convenção prevê assembleia em maio.",
          claimType: "condominium_fact",
          evidenceRequired: true,
          citationEvidenceIds: ["evidence-1"]
        }
      ]
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(providerResponse(JSON.stringify(generated)));
    const result = await createOpenAiAnswerGateway({ apiKey: "secret-key", fetch }).generate(
      input([evidence])
    );

    expect(result.output.citations).toHaveLength(1);
    expect(result.output.citations[0]).toMatchObject({
      evidenceId: "evidence-1",
      documentVersionId: "convention-v1",
      page: 2
    });
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.text).toMatchObject({ format: { type: "json_schema", strict: true } });
  });

  it("falha de forma fechada quando a resposta não foi concluída", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "incomplete", output: [] }), { status: 200 })
      );
    await expect(
      createOpenAiAnswerGateway({ apiKey: "secret-key", fetch }).generate(input())
    ).rejects.toThrow("não concluiu");
  });
});
