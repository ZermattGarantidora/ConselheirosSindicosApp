import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  answerPromptVersion,
  createAnswerService,
  type AiGateway,
  type AiGatewayInput
} from "../../apps/api/answers/answer-service.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import type {
  RetrievalEvidence,
  ScopedRetrievalResult
} from "../../apps/api/retrieval/retrieval-contract.js";

const alameda = createCondominiumId("alameda");
const bosq = createCondominiumId("bosque");

const context: AuthorizedCondominiumContext = Object.freeze({
  userId: createUserId("user-1"),
  condominiumId: alameda,
  roleKey: "manager",
  permissions: Object.freeze(["document:read"] as const),
  membershipRevision: "1"
});

function evidence(overrides: Partial<RetrievalEvidence> = {}): RetrievalEvidence {
  return Object.freeze({
    id: "evidence-1",
    condominiumId: alameda,
    documentId: "document-1",
    documentVersionId: "version-1",
    documentVersionNumber: 1,
    documentTitle: "Convenção",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "page-1",
    pageNumber: 3,
    startOffset: 0,
    endOffset: 55,
    content: "A locação por temporada depende de autorização em assembleia.",
    contentSha256: "hash",
    lexicalScore: 1,
    semanticScore: 1,
    rerankScore: 1,
    rank: 1,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null,
    ...overrides
  });
}

function retrieval(
  items: readonly RetrievalEvidence[],
  status: ScopedRetrievalResult["sufficiency"]["status"] = "sufficient"
): ScopedRetrievalResult {
  return Object.freeze({
    pipelineVersion: "hybrid-v1",
    queryHash: "hash",
    candidateCount: items.length,
    selectedCount: items.length,
    evidence: Object.freeze(items),
    sufficiency: Object.freeze({
      status,
      reason:
        status === "sufficient"
          ? "enough_relevance"
          : status === "weak"
            ? "low_relevance"
            : "no_evidence",
      supportingEvidenceCount: items.length
    })
  });
}

function gateway(reply: Awaited<ReturnType<AiGateway["generate"]>>): AiGateway {
  return { generate: async () => reply };
}

describe("answer service", () => {
  it("sends only authorized evidence through the versioned provider-independent gateway", async () => {
    let received: AiGatewayInput | undefined;
    const service = createAnswerService({
      generate: async (input) => {
        received = input;
        return {
          mode: "grounded",
          citations: [
            { evidenceId: "evidence-1", excerpt: "depende de autorização em assembleia" }
          ],
          claims: [
            {
              statement: "A locação por temporada depende de autorização em assembleia.",
              citationEvidenceIds: ["evidence-1"]
            }
          ]
        };
      }
    });

    const result = await service.answer(context, {
      question: "A locação por temporada é permitida?",
      retrieval: retrieval([evidence()])
    });

    expect(received).toMatchObject({
      condominiumId: alameda,
      promptVersion: answerPromptVersion,
      schemaVersion: "grounded-answer-v1",
      taskClass: "economical"
    });
    expect(received?.evidence).toHaveLength(1);
    expect(result).toMatchObject({ answerMode: "grounded", specialist: { required: false } });
    expect(result.citations).toEqual([
      expect.objectContaining({ documentId: "document-1", documentVersionId: "version-1", page: 3 })
    ]);
  });

  it("AC-014 e AC-015: abstains before calling the gateway when retrieval is weak or absent", async () => {
    let called = false;
    const service = createAnswerService({
      generate: async () => ((called = true), gatewayResult())
    });

    const weak = await service.answer(context, {
      question: "Quem pode votar?",
      retrieval: retrieval([evidence()], "weak")
    });
    const absent = await service.answer(context, {
      question: "Quem pode votar?",
      retrieval: retrieval([], "insufficient")
    });

    expect(called).toBe(false);
    expect(weak).toMatchObject({ answerMode: "abstained", citations: [] });
    expect(absent.attentionPoints[0]).toContain("Nenhum trecho autorizado");
  });

  it("AC-013: fails closed when the generator fabricates a citation or returns an empty answer", async () => {
    const fabricated = await createAnswerService(
      gateway({
        mode: "grounded",
        citations: [{ evidenceId: "other", excerpt: "x" }],
        claims: [{ statement: "Resposta", citationEvidenceIds: ["other"] }]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });
    const empty = await createAnswerService(
      gateway({
        mode: "grounded",
        citations: [{ evidenceId: "evidence-1", excerpt: "locação" }],
        claims: [{ statement: "  ", citationEvidenceIds: ["evidence-1"] }]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });

    expect(fabricated).toMatchObject({ answerMode: "failed", citations: [] });
    expect(empty).toMatchObject({ answerMode: "failed", citations: [] });
  });

  it("rejects an excerpt that is not present in the cited evidence", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "grounded",
        citations: [{ evidenceId: "evidence-1", excerpt: "texto inventado" }],
        claims: [{ statement: "Resposta", citationEvidenceIds: ["evidence-1"] }]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });

    expect(result.answerMode).toBe("failed");
  });

  it("fails closed when a claim is not supported by its otherwise valid citation", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "grounded",
        citations: [{ evidenceId: "evidence-1", excerpt: "locação por temporada" }],
        claims: [{ statement: "A taxa mensal é R$ 1.000.", citationEvidenceIds: ["evidence-1"] }]
      })
    ).answer(context, { question: "Qual é a taxa mensal?", retrieval: retrieval([evidence()]) });

    expect(result).toMatchObject({ answerMode: "failed", citations: [], claims: [] });
  });

  it("fails closed when the gateway breaks the versioned response schema", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "unsupported" as "grounded",
        citations: [{ evidenceId: "evidence-1", excerpt: "locação" }],
        claims: [{ statement: "Resposta", citationEvidenceIds: ["evidence-1"] }]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });

    expect(result.answerMode).toBe("failed");
  });

  it("requires two validated citations before showing a conflict", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "conflict",
        citations: [{ evidenceId: "evidence-1", excerpt: "locação" }],
        claims: [
          {
            statement: "A locação por temporada depende de autorização em assembleia.",
            citationEvidenceIds: ["evidence-1"]
          }
        ]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });

    expect(result.answerMode).toBe("failed");
  });

  it("does not accept the same source twice as proof of a conflict", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "conflict",
        citations: [
          { evidenceId: "evidence-1", excerpt: "locação" },
          { evidenceId: "evidence-1", excerpt: "autorização" }
        ],
        claims: [
          {
            statement: "A locação por temporada depende de autorização em assembleia.",
            citationEvidenceIds: ["evidence-1"]
          }
        ]
      })
    ).answer(context, { question: "Pergunta", retrieval: retrieval([evidence()]) });

    expect(result.answerMode).toBe("failed");
  });

  it("does not accept two chunks from the same document version as a conflict", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "conflict",
        citations: [
          { evidenceId: "evidence-1", excerpt: "locação" },
          { evidenceId: "evidence-2", excerpt: "proibida" }
        ],
        claims: [
          {
            statement: "A locação por temporada depende de autorização em assembleia.",
            citationEvidenceIds: ["evidence-1"]
          }
        ]
      })
    ).answer(context, {
      question: "Pergunta",
      retrieval: retrieval([
        evidence(),
        evidence({ id: "evidence-2", content: "A locação por temporada é proibida." })
      ])
    });

    expect(result.answerMode).toBe("failed");
  });

  it("AC-011 e AC-016: preserves a conflict only when both sources are verifiable", async () => {
    const result = await createAnswerService(
      gateway({
        mode: "conflict",
        citations: [
          { evidenceId: "evidence-1", excerpt: "locação" },
          { evidenceId: "evidence-2", excerpt: "proibida" }
        ],
        claims: [
          {
            statement: "A locação por temporada depende de autorização em assembleia.",
            citationEvidenceIds: ["evidence-1"]
          },
          {
            statement: "A locação por temporada é proibida.",
            citationEvidenceIds: ["evidence-2"]
          }
        ]
      })
    ).answer(context, {
      question: "A locação é permitida?",
      retrieval: retrieval([
        evidence(),
        evidence({
          id: "evidence-2",
          documentVersionId: "version-2",
          content: "A locação por temporada é proibida."
        })
      ])
    });

    expect(result).toMatchObject({
      answerMode: "conflict"
    });
    expect(result.citations).toHaveLength(2);
    expect(result.claims).toEqual([
      {
        statement: "A locação por temporada depende de autorização em assembleia.",
        citationIndexes: [0]
      },
      {
        statement: "A locação por temporada é proibida.",
        citationIndexes: [1]
      }
    ]);
  });

  it("fails closed if retrieval accidentally contains another condominium's evidence", async () => {
    const result = await createAnswerService(gateway(gatewayResult())).answer(context, {
      question: "Pergunta",
      retrieval: retrieval([evidence({ condominiumId: bosq })])
    });

    expect(result).toMatchObject({ answerMode: "failed", citations: [] });
  });

  it("AC-018: recommends the applicable specialist without turning the answer into a definitive opinion", async () => {
    const result = await createAnswerService(gateway(gatewayResult())).answer(context, {
      question: "Há risco estrutural nesta obra?",
      retrieval: retrieval([evidence()])
    });

    expect(result.specialist).toMatchObject({
      required: true,
      type: "engenheiro ou especialista em segurança"
    });
  });

  it.each([
    ["Existe uma disputa sobre essa multa?", "advogado"],
    ["A multa controvertida pode ser aplicada?", "advogado"],
    ["A rescisão relevante deste contrato é válida?", "advogado"],
    ["Há obrigação tributária pendente?", "contador ou advogado especializado"],
    ["Há suspeita de fraude?", "advogado e contador"],
    ["O sinistro tem cobertura securitária?", "corretor ou especialista em seguros"],
    ["Como cumprir a LGPD com dados pessoais?", "especialista em proteção de dados"]
  ])("routes high-risk question %s to %s", async (question, specialistType) => {
    const result = await createAnswerService(gateway(gatewayResult())).answer(context, {
      question,
      retrieval: retrieval([evidence()])
    });

    expect(result.specialist).toMatchObject({ required: true, type: specialistType });
  });

  it("fails safely when the gateway is unavailable and rejects an empty question", async () => {
    const unavailable = await createAnswerService({
      generate: async () => Promise.reject(new Error("offline"))
    }).answer(context, {
      question: "Pergunta",
      retrieval: retrieval([evidence()])
    });

    await expect(
      createAnswerService(gateway(gatewayResult())).answer(context, {
        question: " ",
        retrieval: retrieval([evidence()])
      })
    ).rejects.toThrow("A pergunta não pode ser vazia.");
    expect(unavailable.answerMode).toBe("failed");
  });
});

function gatewayResult(): Awaited<ReturnType<AiGateway["generate"]>> {
  return {
    mode: "grounded",
    citations: [{ evidenceId: "evidence-1", excerpt: "autorização em assembleia" }],
    claims: [
      {
        statement: "A locação por temporada depende de autorização em assembleia.",
        citationEvidenceIds: ["evidence-1"]
      }
    ]
  };
}
