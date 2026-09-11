import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AnswerTraceNotFoundError,
  createInMemoryAnswerTraceStore,
  InvalidAnswerFeedbackError
} from "../../apps/api/answers/answer-trace.js";
import type { GroundedAnswer } from "../../apps/api/answers/answer-service.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import type {
  RetrievalEvidence,
  ScopedRetrievalResult
} from "../../apps/api/retrieval/retrieval-contract.js";

const alamedaContext: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "sindico-demo" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "membership-alameda-v1",
  permissions: ["document:read", "document:upload"]
};

const bosqueContext: AuthorizedCondominiumContext = {
  ...alamedaContext,
  condominiumId: createCondominiumId("bosque")
};

function evidence(): RetrievalEvidence {
  return Object.freeze({
    id: "chunk-1",
    condominiumId: alamedaContext.condominiumId,
    documentId: "document-1",
    documentVersionId: "version-1",
    documentVersionNumber: 1,
    documentTitle: "Documento sintético",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "page-1",
    pageNumber: 2,
    startOffset: 0,
    endOffset: 49,
    content: "A regra sintética exige confirmação em assembleia.",
    contentSha256: createHash("sha256").update("content").digest("hex"),
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null,
    lexicalScore: 0.9,
    rerankScore: 0.8,
    rank: 1
  });
}

function retrieval(): ScopedRetrievalResult {
  return Object.freeze({
    pipelineVersion: "hybrid-v1",
    queryHash: "q".repeat(64),
    candidateCount: 1,
    selectedCount: 1,
    evidence: Object.freeze([evidence()]),
    sufficiency: Object.freeze({
      status: "sufficient",
      reason: "enough_relevance",
      supportingEvidenceCount: 1
    })
  });
}

function answer(): GroundedAnswer {
  return Object.freeze({
    answer: "A regra sintética exige confirmação em assembleia.",
    answerMode: "grounded",
    citations: Object.freeze([
      {
        documentId: "document-1",
        documentVersionId: "version-1",
        title: "Documento sintético",
        page: 2,
        excerpt: "A regra sintética exige confirmação em assembleia."
      }
    ]),
    claims: Object.freeze([
      { statement: "A regra sintética exige confirmação em assembleia.", citationIndexes: [0] }
    ]),
    attentionPoints: Object.freeze([]),
    suggestedNextStep: null,
    specialist: Object.freeze({ required: false, type: null, reason: null })
  });
}

describe("trilha e feedback sintéticos", () => {
  it("registra hashes, fontes e métricas sem duplicar pergunta ou resposta", async () => {
    const store = createInMemoryAnswerTraceStore({ answerIdFactory: () => "answer-1" });

    const trace = await store.record({
      context: alamedaContext,
      question: "Qual é a regra sintética?",
      retrieval: retrieval(),
      response: answer(),
      latencyMs: 12.345,
      createdAt: new Date("2026-09-10T15:00:00.000Z")
    });

    expect(trace).toMatchObject({
      id: "answer-1",
      condominiumId: "alameda",
      answerMode: "grounded",
      routing: { taskClass: "economical", providerKey: "local-extractive" },
      usage: { unitKind: "characters", estimatedCostMicros: 0 },
      latencyMs: 12.345
    });
    expect(trace.sourceRefs).toEqual([
      expect.objectContaining({
        chunkId: "chunk-1",
        documentVersionId: "version-1",
        page: 2
      })
    ]);
    expect(JSON.stringify(trace)).not.toContain("Qual é a regra sintética?");
    expect(JSON.stringify(trace)).not.toContain("exige confirmação em assembleia");
  });

  it("mantém feedback append-only, vinculado à resposta e aos mesmos sources", async () => {
    const store = createInMemoryAnswerTraceStore({
      answerIdFactory: () => "answer-1",
      feedbackIdFactory: () => "feedback-1"
    });
    await store.record({
      context: alamedaContext,
      question: "Qual é a regra?",
      retrieval: retrieval(),
      response: answer(),
      latencyMs: 1,
      createdAt: new Date("2026-09-10T15:00:00.000Z")
    });

    const feedback = await store.recordFeedback(alamedaContext, {
      answerId: "answer-1",
      classification: "incorrect",
      comment: "A vigência precisa ser confirmada.",
      createdAt: new Date("2026-09-10T15:01:00.000Z")
    });

    expect(feedback).toMatchObject({
      id: "feedback-1",
      answerId: "answer-1",
      condominiumId: "alameda",
      userId: "sindico-demo",
      classification: "incorrect",
      comment: "A vigência precisa ser confirmada."
    });
    expect(feedback.sourceRefs).toEqual(
      expect.arrayContaining([expect.objectContaining({ chunkId: "chunk-1" })])
    );
    expect(await store.listFeedback(alamedaContext)).toHaveLength(1);
    expect((await store.get(alamedaContext, "answer-1"))?.answerMode).toBe("grounded");
  });

  it("não permite procurar ou avaliar resposta de outro tenant", async () => {
    const store = createInMemoryAnswerTraceStore({ answerIdFactory: () => "answer-1" });
    await store.record({
      context: alamedaContext,
      question: "Pergunta sintética",
      retrieval: retrieval(),
      response: answer(),
      latencyMs: 1
    });

    expect(await store.get(bosqueContext, "answer-1")).toBeUndefined();
    await expect(
      store.recordFeedback(bosqueContext, {
        answerId: "answer-1",
        classification: "correct"
      })
    ).rejects.toBeInstanceOf(AnswerTraceNotFoundError);
  });

  it("recusa comentário excessivo sem criar feedback", async () => {
    const store = createInMemoryAnswerTraceStore({ answerIdFactory: () => "answer-1" });
    await store.record({
      context: alamedaContext,
      question: "Pergunta sintética",
      retrieval: retrieval(),
      response: answer(),
      latencyMs: 1
    });

    await expect(
      store.recordFeedback(alamedaContext, {
        answerId: "answer-1",
        classification: "correct",
        comment: "x".repeat(2_001)
      })
    ).rejects.toBeInstanceOf(InvalidAnswerFeedbackError);
    expect(await store.listFeedback(alamedaContext)).toEqual([]);
  });
});
