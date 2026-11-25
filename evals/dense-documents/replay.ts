import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import type { AnswerStageTiming } from "../../apps/api/answers/answer-performance.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import type { AnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import type { DocumentSourceReader } from "../../apps/api/documents/document-source.js";
import type { PreparedDocument } from "../full-page-documents/replay.js";
import { verifyTurnResponse, type GatewayCapture } from "../conversations/replay.js";
import type { DenseCase } from "./oracle.js";
import type { DenseKind } from "./corpus.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createHash } from "node:crypto";
import { assessDenseAnswer } from "./assessment.js";
import { createMemoryDocumentAnalysisReader } from "../../apps/api/analysis/document-analysis-reader.js";

export type DensePrepared = PreparedDocument & { kind: DenseKind };

export async function replayDenseCase(
  testCase: DenseCase,
  documents: readonly DensePrepared[],
  gateway: AnswerGateway,
  options: { repeatRequest?: boolean; beforeReplay?: () => void } = {}
) {
  const captures: GatewayCapture[] = [];
  const stageTimings: AnswerStageTiming[] = [];
  const now = () => new Date("2026-11-03T12:00:00Z");
  const persistence = createInMemoryAnswerPersistence(undefined, now);
  const foreignText = "LAN-0059 | CANARIO_BOSQUE_7Q9 | outro condominio | R$999.999,99";
  const foreign = {
    ...documents[0]!.chunks[0]!,
    id: "dense-foreign-canary",
    condominiumId: createCondominiumId("bosque"),
    documentId: "dense-bosque",
    documentVersionId: "dense-bosque-v1",
    content: foreignText,
    contentSha256: createHash("sha256").update(foreignText).digest("hex")
  };
  const retriever = createScopedTextRetriever(
    createInMemoryScopedRetrievalIndex([...documents.flatMap((d) => d.chunks), foreign])
  );
  const reader: DocumentSourceReader = {
    async getAuthorizedPage(context, input) {
      if (context.condominiumId !== "alameda" || !context.permissions.includes("document:read"))
        return undefined;
      const d = documents.find(
        (d) => d.documentId === input.documentId && d.documentVersionId === input.documentVersionId
      );
      const page = d?.pages.find((p) => p.pageNumber === input.page);
      return d && page
        ? {
            documentId: d.documentId,
            documentVersionId: d.documentVersionId,
            title: d.title,
            page: input.page,
            content: page.extractedText
          }
        : undefined;
    }
  };
  const app = createApi({
    documentAnalysisReader: createMemoryDocumentAnalysisReader(documents.flatMap((d) => d.chunks)),
    documentCatalogRepository: {
      async listAuthorized(context) {
        return documents
          .map((d) => d.catalogEntry)
          .filter((d) => d.condominiumId === context.condominiumId);
      }
    },
    now,
    membershipRepository: createDevelopmentIdentityRepository(),
    retriever,
    documentSourceReader: reader,
    answerUseCase: createAnswerUseCase({
      onStageTiming: (timing) => {
        stageTimings.push(timing);
      },
      now,
      persistence,
      retriever,
      chatMemoryEnabled: false,
      gateway: {
        async generate(input) {
          const capture: GatewayCapture = { input, telemetry: null };
          captures.push(capture);
          const result = await gateway.generate(input);
          capture.telemetry = result.telemetry;
          return result;
        }
      }
    })
  });
  try {
    const started = Date.now();
    const http = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers: {
        "x-development-user-id": "sindico-demo",
        ...(options.repeatRequest
          ? { "x-conversation-request-id": "dense-regression-receipt" }
          : {})
      },
      payload: { question: testCase.question }
    });
    const body = http.json();
    const response = http.statusCode === 200 ? (body as PublicAnswer) : null;
    const saved = response && persistence.getInteraction(response.answerId);
    let replayStatusCode: number | undefined;
    if (options.repeatRequest) {
      options.beforeReplay?.();
      const replayed = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: {
          "x-development-user-id": "sindico-demo",
          "x-conversation-request-id": "dense-regression-receipt"
        },
        payload: { question: testCase.question }
      });
      replayStatusCode = replayed.statusCode;
    }
    const mechanicalErrors = await verifyTurnResponse({
      tenant: "alameda",
      statusCode: http.statusCode,
      expectedStatus: 200,
      body,
      gatewayCalls: captures,
      persistedClaims: saved?.claims ?? [],
      sourceReader: reader
    });
    const evidence = captures.at(-1)?.input.evidence ?? [];
    return {
      testCase,
      response,
      statusCode: http.statusCode,
      replayStatusCode,
      latencyMs: Date.now() - started,
      stageTimings,
      gatewayCalls: captures,
      validationFailures:
        saved?.invocations.flatMap((i) => (i.errorCode ? [i.errorCode] : [])) ?? [],
      assessment: assessDenseAnswer(testCase, response, evidence, documents, mechanicalErrors),
      computation: captures.at(-1)?.input.conversationContext?.documentCalculation,
      computationReceipt: saved?.auditEvents.find((e) => e.metadata.integralComputationReceipt)
        ?.metadata.integralComputationReceipt
    };
  } finally {
    await app.close();
  }
}
