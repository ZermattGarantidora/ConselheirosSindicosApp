import type { AnswerGateway } from "../../../apps/api/answers/answer-gateway.js";
import type { AnswerGatewayResult } from "../../../apps/api/answers/answer-gateway.js";
import { createHash } from "node:crypto";
import { validateGeneratedAnswer } from "../../../apps/api/answers/citation-validator.js";
import { createCondominiumId } from "../../../apps/api/core/condominium-scope.js";
import type { RetrievalEvidence } from "../../../apps/api/retrieval/retrieval-contract.js";
import { documentaryQualityCases } from "../dataset.js";
import { createSemanticReviewCases, type SemanticReviewCase } from "./cases.js";

const condominiumId = createCondominiumId("semantic-review-condominium");

function evidenceFor(testCase: SemanticReviewCase): readonly RetrievalEvidence[] {
  return Object.freeze(
    testCase.sources.flatMap((source, index) => {
      if (
        source.limitation !== null ||
        source.documentVersionId === null ||
        source.page === null ||
        source.content.trim() === ""
      )
        return [];
      return [
        Object.freeze({
          id: `${testCase.id}-e${index + 1}`,
          condominiumId,
          documentId: source.documentId,
          documentVersionId: source.documentVersionId,
          documentVersionNumber: 1,
          documentTitle: source.title,
          documentType: "other" as const,
          sourceKind: "user_upload" as const,
          sourceScope: "condominium" as const,
          pageId: `${source.documentVersionId}-p${source.page}`,
          pageNumber: source.page,
          startOffset: 0,
          endOffset: Array.from(source.content).length,
          content: source.content,
          contentSha256: createHash("sha256").update(source.content).digest("hex"),
          lexicalScore: 1,
          semanticScore: 1,
          rerankScore: 1,
          rank: index + 1,
          extractionMethod: "pdf_text" as const,
          qualityScore: 1,
          processingStatus: "ready" as const,
          validityStatus: source.validityStatus,
          validFrom: null,
          validUntil: null
        })
      ];
    })
  );
}

export type SemanticReplayReport = Readonly<{
  total: number;
  gatewayConfigured: boolean;
  replayed: number;
  mechanicallyValid: number;
  status: "pending_gateway" | "pending_specialist_review";
  reviewCases: readonly SemanticReviewCase[];
  results: readonly Readonly<{
    caseId: string;
    response: AnswerGatewayResult | null;
    mechanicalError: string | null;
    humanReview: null;
  }>[];
}>;

/** Reproduz o contrato do gateway; nunca atribui aprovação semântica ao replay. */
export async function replaySemanticCases(gateway?: AnswerGateway): Promise<SemanticReplayReport> {
  const reviewCases = createSemanticReviewCases(documentaryQualityCases);
  if (gateway === undefined)
    return Object.freeze({
      total: reviewCases.length,
      gatewayConfigured: false,
      replayed: 0,
      mechanicallyValid: 0,
      status: "pending_gateway",
      reviewCases,
      results: reviewCases.map((item) => ({
        caseId: item.id,
        response: null,
        mechanicalError: null,
        humanReview: null
      }))
    });
  let mechanicallyValid = 0;
  const results: SemanticReplayReport["results"][number][] = [];
  for (const reviewCase of reviewCases) {
    const evidence = evidenceFor(reviewCase);
    let generated: AnswerGatewayResult | null = null;
    try {
      generated = await gateway.generate({
        question: reviewCase.question,
        task: reviewCase.hasConflict ? "document_conflict" : "grounded_answer",
        riskClass: reviewCase.severity === "P0" ? "high" : "medium",
        evidence,
        budget: { maximumOutputTokens: 500, maximumCostMicrounits: 0 }
      });
      validateGeneratedAnswer(generated.output, evidence);
      mechanicallyValid += 1;
      results.push(
        Object.freeze({
          caseId: reviewCase.id,
          response: generated,
          mechanicalError: null,
          humanReview: null
        })
      );
    } catch {
      // Não expõe erros arbitrários de gateway nos artefatos de revisão.
      results.push(
        Object.freeze({
          caseId: reviewCase.id,
          response: generated,
          mechanicalError: "gateway_or_citation_contract_failed",
          humanReview: null
        })
      );
    }
  }
  return Object.freeze({
    total: reviewCases.length,
    gatewayConfigured: true,
    replayed: reviewCases.length,
    mechanicallyValid,
    status: "pending_specialist_review",
    reviewCases,
    results: Object.freeze(results)
  });
}
