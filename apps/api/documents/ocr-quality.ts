import type { CondominiumId } from "../core/condominium-scope.js";

export const minimumOcrQualityScore = 0.85;

export type OcrPageResult = Readonly<{
  pageIndex: number;
  extractedText: string;
  qualityScore: number;
}>;

export type OcrResult =
  | Readonly<{ status: "completed"; pages: readonly OcrPageResult[] }>
  | Readonly<{ status: "unavailable"; reason: "not_configured" | "failed" }>;

export interface OcrAdapter {
  recognize(
    input: Readonly<{ condominiumId: CondominiumId; documentVersionId: string; content: Buffer }>
  ): Promise<OcrResult>;
}

export type OcrProcessingDecision = Readonly<{
  processingStatus: "ready" | "needs_review";
  ocrQualityScore: number | null;
  reason: "quality_sufficient" | "low_quality" | "unavailable";
}>;

export const unavailableOcrAdapter: OcrAdapter = Object.freeze({
  async recognize() {
    return Object.freeze({ status: "unavailable" as const, reason: "not_configured" as const });
  }
});

function averageQuality(pages: readonly OcrPageResult[]): number {
  return pages.reduce((sum, page) => sum + page.qualityScore, 0) / pages.length;
}

export function assessOcrResult(
  result: OcrResult,
  expectedPageCount?: number
): OcrProcessingDecision {
  if (result.status === "unavailable") {
    return Object.freeze({
      processingStatus: "needs_review",
      ocrQualityScore: null,
      reason: "unavailable"
    });
  }

  const hasExpectedPageSet =
    expectedPageCount === undefined ||
    (expectedPageCount > 0 &&
      result.pages.length === expectedPageCount &&
      result.pages.every((page, index) => page.pageIndex === index));
  const hasValidPages =
    hasExpectedPageSet &&
    result.pages.length > 0 &&
    result.pages.every((page) => {
      return (
        Number.isInteger(page.pageIndex) &&
        page.pageIndex >= 0 &&
        page.extractedText.trim().length > 0 &&
        page.qualityScore >= 0 &&
        page.qualityScore <= 1
      );
    });
  const ocrQualityScore = hasValidPages ? averageQuality(result.pages) : 0;
  const hasMinimumQualityOnEveryPage =
    hasValidPages && result.pages.every((page) => page.qualityScore >= minimumOcrQualityScore);

  if (!hasMinimumQualityOnEveryPage) {
    return Object.freeze({
      processingStatus: "needs_review",
      ocrQualityScore,
      reason: "low_quality"
    });
  }

  return Object.freeze({
    processingStatus: "ready",
    ocrQualityScore,
    reason: "quality_sufficient"
  });
}
