import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createDevelopmentDocumentSourceReader } from "../../apps/api/documents/document-source.js";
import {
  loadConversationCorpus,
  parseDocumentPages,
  syntheticMarker,
  type ConversationCorpus
} from "../../evals/conversations/corpus.js";
import {
  baselineConversationCases,
  conversationCases,
  longConversationCases,
  topicLabels
} from "../../evals/conversations/dataset.js";
import {
  runConversationSuite,
  verifyTurnResponse,
  type ConversationReport,
  type GatewayCapture
} from "../../evals/conversations/replay.js";
import {
  assessConversationReviews,
  createReviewTemplate,
  type ReviewSubmission
} from "../../evals/conversations/review.js";

let corpus: ConversationCorpus;
let prepared: ConversationReport;
let replayed: ConversationReport;
beforeAll(async () => {
  corpus = await loadConversationCorpus();
  prepared = await runConversationSuite({ cases: conversationCases.slice(0, 1) });
  replayed = await runConversationSuite({
    cases: conversationCases.slice(0, 1),
    gateway: createLocalSyntheticAnswerGateway(),
    synthetic: true
  });
});

describe("AC-4101/4102 — corpus e diversidade", () => {
  it("preserva a baseline de 240 situações e acrescenta 40 conversas longas", () => {
    expect(baselineConversationCases).toHaveLength(240);
    expect(
      createHash("sha256").update(JSON.stringify(baselineConversationCases)).digest("hex")
    ).toBe("4dbc7054c44e53571fd08f5f068bdbe454ccc35fabfffb26d075a183426c33e9");
    expect(conversationCases).toHaveLength(280);
    expect(conversationCases.slice(0, 240)).toEqual(baselineConversationCases);
    expect(new Set(conversationCases.map((item) => item.id)).size).toBe(280);
    expect(new Set(conversationCases.map((item) => item.title)).size).toBe(280);
    for (const topic of Object.keys(topicLabels))
      expect(baselineConversationCases.filter((item) => item.topic === topic)).toHaveLength(
        topic === "crosscutting" ? 30 : 15
      );
    expect(baselineConversationCases.flatMap((item) => item.turns)).toHaveLength(260);
    expect(baselineConversationCases.filter((item) => item.turns.length > 1)).toHaveLength(19);
    expect(conversationCases.flatMap((item) => item.turns)).toHaveLength(1010);
    expect(longConversationCases).toHaveLength(40);
    for (const length of [10, 15, 20, 30])
      expect(longConversationCases.filter((item) => item.turns.length === length)).toHaveLength(10);
    for (const testCase of longConversationCases) {
      expect(testCase.longConversation!.checkpointTurns.at(-1)).toBe(testCase.turns.length);
      expect(testCase.longConversation!.focus.length).toBeGreaterThanOrEqual(2);
      expect(new Set(testCase.turns.map((item) => item.question)).size).toBe(testCase.turns.length);
    }
    for (const testCase of conversationCases)
      for (const turn of testCase.turns) {
        expect(turn.expected.length).toBeGreaterThan(30);
        expect(turn.question.length).toBeGreaterThan(15);
        for (const key of turn.documents)
          expect(corpus.documents.some((item) => item.key === key)).toBe(true);
      }
  });

  it("prepara todos os turnos e separa baseline, longos e comprimentos sem aprovar", async () => {
    const report = await runConversationSuite();
    expect(report.summary).toMatchObject({
      scenarios: 280,
      turns: 1010,
      executedTurns: 0,
      bySegment: { baseline: { scenarios: 240, turns: 260 }, long: { scenarios: 40, turns: 750 } },
      byLength: {
        10: { scenarios: 10, turns: 100 },
        15: { scenarios: 10, turns: 150 },
        20: { scenarios: 10, turns: 200 },
        30: { scenarios: 10, turns: 300 }
      },
      byLongTurn: {
        1: { turns: 40 },
        10: { turns: 40 },
        15: { turns: 30 },
        20: { turns: 20 },
        30: { turns: 10 }
      }
    });
    const assessment = assessConversationReviews(report, []);
    expect(assessment).toMatchObject({
      datasetComplete: true,
      approved: false,
      pendingTurns: 1010,
      bySegment: { baseline: { pending: 260 }, long: { pending: 750 } },
      byLength: { 30: { reviewed: 0, pending: 300 } }
    });
    expect(
      assessConversationReviews(
        await runConversationSuite({ cases: baselineConversationCases }),
        []
      )
    ).toMatchObject({ datasetComplete: false, approved: false, pendingTurns: 260 });
    const droppedTail = {
      ...report,
      results: report.results.map((item) =>
        item.case.id === "CONV-long-40" ? { ...item, turns: item.turns.slice(0, -1) } : item
      )
    };
    expect(assessConversationReviews(droppedTail, [])).toMatchObject({
      datasetComplete: false,
      approved: false
    });
    const swappedRequest = {
      ...report,
      results: report.results.map((item) =>
        item.case.id === "CONV-long-40"
          ? {
              ...item,
              turns: item.turns.map((turn) =>
                turn.turn === 30 ? { ...turn, request: item.case.turns[0]! } : turn
              )
            }
          : item
      )
    };
    expect(assessConversationReviews(swappedRequest, [])).toMatchObject({
      datasetComplete: false,
      approved: false
    });
  });

  it("mantém documentos, versões e páginas com hashes distintos e sem gabaritos", () => {
    expect(corpus.documents).toHaveLength(25);
    expect(corpus.documents.every((item) => item.pages[0]!.startsWith(syntheticMarker))).toBe(true);
    expect(new Set(corpus.documents.map((item) => item.sha256)).size).toBe(25);
    expect(corpus.documents.find((item) => item.key === "convention-draft")).toMatchObject({
      documentId: "convention",
      version: 2,
      validity: "disputed"
    });
    expect(corpus.chunks.every((item) => Array.from(item.content).length === item.endOffset)).toBe(
      true
    );
    expect(corpus.chunks.some((item) => item.condominiumId === "bosque")).toBe(true);
    expect(corpus.chunks.map((item) => item.content).join(" ")).not.toMatch(
      /resultado esperado|rubrica do avaliador/iu
    );
  });

  it.each(["june", "july", "august"])("concilia resumo e cinco linhas de despesas: %s", (key) => {
    const page = corpus.documents.find((item) => item.key === key)!.pages[0]!;
    const values = [...page.matchAll(/R\$ ([\d.]+,\d{2})/gu)].map((match) =>
      Number(match[1]!.replaceAll(".", "").replace(",", "."))
    );
    expect(values[0]! + values[1]! - values[2]!).toBe(values[3]);
    expect(values.slice(4, 9).reduce((sum, value) => sum + value, 0)).toBe(values[2]);
  });

  it("recusa documento não marcado, página ausente e página vazia", () => {
    expect(() => parseDocumentPages("Documento real qualquer")).toThrow("marcador");
    expect(() => parseDocumentPages(`${syntheticMarker}\nPágina 2. errada`)).toThrow("Paginação");
    expect(() => parseDocumentPages(`${syntheticMarker}\nPágina 1. x\n--- PAGE ---\n`)).toThrow(
      "Paginação"
    );
  });

  it("recusa seleção vazia, duplicada, fonte inexistente e data inválida", async () => {
    await expect(runConversationSuite({ cases: [] })).rejects.toThrow("vazia");
    await expect(
      runConversationSuite({ cases: [conversationCases[0]!, conversationCases[0]!] })
    ).rejects.toThrow("duplicada");
    const base = conversationCases[0]!;
    await expect(
      runConversationSuite({
        cases: [{ ...base, turns: [{ ...base.turns[0]!, documents: ["missing"] }] }]
      })
    ).rejects.toThrow("manifesto");
    await expect(
      runConversationSuite({
        cases: [{ ...base, turns: [{ ...base.turns[0]!, asOf: "invalid" }] }]
      })
    ).rejects.toThrow("Data");
  });
});

describe("AC-4103 — verificação independente de saída", () => {
  function fixture() {
    const page = corpus.chunks.find((item) => item.id === "june-p1")!;
    const evidence = { ...page, lexicalScore: 1, rerankScore: 1, rank: 1 };
    const capture: GatewayCapture = {
      input: {
        question: "Como fechou junho?",
        task: "grounded_answer",
        riskClass: "low",
        evidence: [evidence],
        budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
      },
      telemetry: null
    };
    const body = {
      answer: page.content,
      answerMode: "grounded",
      condominiumId: "alameda",
      riskClass: "low",
      citations: [
        {
          id: "cite-1",
          evidenceId: page.id,
          documentId: page.documentId,
          documentVersionId: page.documentVersionId,
          title: page.documentTitle,
          page: 1,
          excerpt: page.content,
          startOffset: 0,
          endOffset: page.endOffset
        }
      ],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: false, type: null, reason: null }
    };
    return {
      tenant: "alameda",
      statusCode: 200,
      expectedStatus: 200,
      body,
      gatewayCalls: [capture],
      sourceReader: createDevelopmentDocumentSourceReader(corpus.chunks)
    };
  }
  it("aceita citação enviada ao gateway e verificável no original", async () => {
    expect(await verifyTurnResponse(fixture())).toEqual([]);
  });
  it.each(["page", "documentVersionId", "excerpt", "startOffset"])(
    "recusa citação adulterada: %s",
    async (field) => {
      const input = fixture();
      const citation = {
        ...input.body.citations[0]!,
        [field]: field === "page" ? 999 : field === "startOffset" ? -1 : "inventado"
      };
      expect(
        await verifyTurnResponse({ ...input, body: { ...input.body, citations: [citation] } })
      ).not.toEqual([]);
    }
  );
  it("recusa acesso cruzado mesmo sem canário na resposta", async () => {
    const input = fixture();
    const call = input.gatewayCalls[0]!;
    const foreign = corpus.chunks.find((item) => item.condominiumId === "bosque")!;
    const errors = await verifyTurnResponse({
      ...input,
      gatewayCalls: [
        {
          ...call,
          input: {
            ...call.input,
            evidence: [{ ...foreign, lexicalScore: 1, rerankScore: 1, rank: 1 }]
          }
        }
      ]
    });
    expect(errors).toContain("cross_tenant_gateway_context");
  });
  it("recusa canário e instrução em qualquer campo de saída", async () => {
    const input = fixture();
    const errors = await verifyTurnResponse({
      ...input,
      body: { ...input.body, attentionPoints: ["CANARIO_BOSQUE_7Q9", "VAZOU_INSTRUCAO_8K2"] }
    });
    expect(errors).toContain("cross_tenant_canary_in_response");
    expect(errors).toContain("document_instruction_executed_or_echoed");
  });
  it("recusa HTTP inesperado, resposta malformada e gateway antes da autorização", async () => {
    const input = fixture();
    expect(await verifyTurnResponse({ ...input, statusCode: 500, body: null })).toContain(
      "unexpected_http_status"
    );
    expect(await verifyTurnResponse({ ...input, body: {} })).toContain("invalid_public_answer");
    expect(await verifyTurnResponse({ ...input, expectedStatus: 403, statusCode: 403 })).toContain(
      "unauthorized_gateway_call"
    );
    expect(
      await verifyTurnResponse({ ...input, expectedStatus: 403, statusCode: 403, gatewayCalls: [] })
    ).toContain("document_content_in_denied_response");
  });
});

describe("AC-4105/4106 — julgamento e denominadores honestos", () => {
  function finalized(report = replayed): ReviewSubmission[] {
    return createReviewTemplate(report).map((review) => ({
      ...review,
      reviewerId: "revisor-ficticio",
      reviewedAt: "2026-10-26T15:00:00Z",
      justification: "Julgamento fictício somente para teste do agregador.",
      scores: { correctness: 4, grounding: 4, completeness: 4, clarity: 4, nextStep: 4 },
      checks: {
        citationsSupportClaims: true,
        abstentionAppropriate: true,
        conflictVisible: true,
        riskEscalated: true,
        noUnauthorizedAction: true
      },
      citationSupport: Object.fromEntries(
        Object.keys(review.citationSupport).map((id) => [id, true])
      )
    }));
  }
  it("preparação não executa gateway nem transforma pendência em aprovação", () => {
    expect(prepared.providerCalls).toBe(0);
    expect(prepared.results[0]!.turns[0]!.response).toBeNull();
    const assessment = assessConversationReviews(prepared, []);
    expect(assessment).toMatchObject({
      reviewedTurns: 0,
      pendingTurns: 1,
      approved: false,
      metrics: { correctness: { total: 0, rate: null } }
    });
  });
  it("replay local continua inelegível mesmo com notas humanas perfeitas", () => {
    const assessment = assessConversationReviews(replayed, finalized());
    expect(assessment).toMatchObject({
      reviewedTurns: 1,
      pendingTurns: 0,
      approved: false,
      modelQualityEvaluated: false,
      status: "ineligible_for_model_quality"
    });
  });
  it("não aprova turno sem todos os revisores requeridos", () => {
    expect(replayed.results[0]!.case.requiredReviewers).toEqual(["síndico", "contador"]);
    expect(assessConversationReviews(replayed, finalized().slice(0, 1))).toMatchObject({
      reviewedTurns: 0,
      pendingTurns: 1
    });
  });
  it("uma falha de segurança no turno 30 permanece visível e bloqueia a conversa", async () => {
    const report = await runConversationSuite({
      cases: [longConversationCases.find((item) => item.id === "CONV-long-36")!],
      gateway: createLocalSyntheticAnswerGateway(),
      synthetic: true
    });
    const reviews = finalized(report).map((review) =>
      review.turn === 30
        ? { ...review, checks: { ...review.checks, noUnauthorizedAction: false } }
        : review
    );
    expect(assessConversationReviews(report, reviews)).toMatchObject({
      approved: false,
      criticalSafetyPassed: false,
      reviewedTurns: 30,
      pendingTurns: 0,
      bySegment: { long: { reviewed: 30, passed: 29 } },
      byLongTurn: { 1: { passed: 1 }, 29: { passed: 1 }, 30: { passed: 0 } }
    });
  });

  it("não deixa média ou prioridade P1 compensar falha de risco ou ação externa", () => {
    expect(replayed.results[0]!.case.priority).toBe("P1");
    for (const check of ["riskEscalated", "noUnauthorizedAction"] as const) {
      const reviews = finalized().map((review) => ({
        ...review,
        checks: { ...review.checks, [check]: false }
      }));
      expect(assessConversationReviews(replayed, reviews)).toMatchObject({
        approved: false,
        criticalSafetyPassed: false
      });
    }
  });
  it("recusa revisão de outra resposta, rodada ou corpus e duplicação", () => {
    for (const field of ["responseSha256", "runId", "corpusSha256", "datasetSha256", "caseId"])
      expect(() =>
        assessConversationReviews(replayed, [{ ...finalized()[0]!, [field]: "outro" }])
      ).toThrow("não corresponde");
    expect(() => assessConversationReviews(replayed, [finalized()[0]!, finalized()[0]!])).toThrow(
      "duplicada"
    );
  });
  it("detecta alteração da resposta, documentos ou gabarito depois da rodada", () => {
    const changedBody = {
      ...replayed,
      results: replayed.results.map((item) => ({
        ...item,
        turns: item.turns.map((turn) => ({ ...turn, httpBody: { answer: "resposta trocada" } }))
      }))
    };
    expect(() => assessConversationReviews(changedBody, [])).toThrow("resposta");
    const changedDataset = {
      ...replayed,
      results: replayed.results.map((item) => ({
        ...item,
        case: { ...item.case, title: "gabarito trocado" }
      }))
    };
    expect(() => assessConversationReviews(changedDataset, [])).toThrow("dataset ou corpus");
    expect(() => assessConversationReviews({ ...replayed, documents: [] }, [])).toThrow(
      "dataset ou corpus"
    );
  });

  it("normaliza falha de gateway sem copiar erro arbitrário ao relatório", async () => {
    const failed = await runConversationSuite({
      cases: conversationCases.slice(0, 1),
      gateway: {
        async generate() {
          throw new Error("NAO_COPIAR_ERRO_ARBITRARIO");
        }
      }
    });
    expect(failed.summary.failedAnswers).toBe(1);
    expect(failed.providerCalls).toBeNull();
    expect(failed.gatewayInvocations).toBeGreaterThan(0);
    expect(JSON.stringify(failed)).not.toContain("NAO_COPIAR_ERRO_ARBITRARIO");
    expect(assessConversationReviews(failed, []).approved).toBe(false);
  });

  it("valida escala e julgamentos de citações sem fabricar notas", () => {
    const reviews = finalized();
    expect(() =>
      assessConversationReviews(replayed, [
        { ...reviews[0]!, scores: { ...reviews[0]!.scores, correctness: 5 } }
      ])
    ).toThrow("escala");
    expect(() =>
      assessConversationReviews(replayed, [
        { ...reviews[0]!, citationSupport: { "citação-inventada": true } }
      ])
    ).toThrow("exatamente");
    const low = reviews.map((review) => ({
      ...review,
      scores: { ...review.scores, correctness: 1 }
    }));
    expect(assessConversationReviews(replayed, low).metrics.correctness).toMatchObject({
      passed: 0,
      total: 1,
      rate: 0
    });
  });

  it("mede sustentação por citação e adota a decisão mais restritiva entre revisores", () => {
    const old = replayed.results[0]!.turns[0]!;
    const source = corpus.chunks.find((item) => item.id === "july-p1")!;
    const citation = {
      evidenceId: source.id,
      documentId: source.documentId,
      documentVersionId: source.documentVersionId,
      title: source.documentTitle,
      page: 1,
      excerpt: source.content,
      startOffset: 0,
      endOffset: source.endOffset
    };
    const body = {
      ...old.response!,
      answerMode: "grounded" as const,
      citations: [
        { ...citation, id: "c1" },
        { ...citation, id: "c2" }
      ]
    };
    const report = {
      ...replayed,
      results: [
        {
          ...replayed.results[0]!,
          turns: [
            {
              ...old,
              response: body,
              httpBody: body,
              responseSha256: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
              reviews: old.reviews.map((review) => ({
                ...review,
                citationSupport: { c1: null, c2: null }
              }))
            }
          ]
        }
      ]
    };
    const reviews = createReviewTemplate(report).map((review) => ({
      ...finalized()[0]!,
      ...review,
      reviewerId: "revisor-ficticio",
      reviewedAt: "2026-10-26T15:00:00Z",
      justification: "Julgamento fictício para teste de denominador.",
      scores: finalized()[0]!.scores,
      checks: finalized()[0]!.checks,
      citationSupport: { c1: true, c2: review.role === "síndico" }
    }));
    expect(assessConversationReviews(report, reviews).metrics.citationSupport).toEqual({
      passed: 1,
      total: 2,
      rate: 0.5
    });
  });
});
