import { describe, expect, it } from "vitest";

import {
  assessOcrResult,
  minimumOcrQualityScore,
  unavailableOcrAdapter
} from "../../apps/api/documents/ocr-quality.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";

describe("qualidade de OCR", () => {
  it("AC-005: encaminha OCR de baixa qualidade para revisão", () => {
    const result = assessOcrResult({
      status: "completed",
      pages: [{ pageIndex: 0, extractedText: "texto reconhecido parcialmente", qualityScore: 0.5 }]
    });

    expect(result).toEqual({
      processingStatus: "needs_review",
      ocrQualityScore: 0.5,
      reason: "low_quality"
    });
  });

  it("não deixa uma página fraca passar pela média das demais", () => {
    const result = assessOcrResult({
      status: "completed",
      pages: [
        { pageIndex: 0, extractedText: "página fraca", qualityScore: 0.7 },
        { pageIndex: 1, extractedText: "página boa", qualityScore: 1 }
      ]
    });

    expect(result).toMatchObject({
      processingStatus: "needs_review",
      ocrQualityScore: minimumOcrQualityScore,
      reason: "low_quality"
    });
  });

  it("aceita resultado somente quando todas as páginas e a média passam o piso", () => {
    const result = assessOcrResult({
      status: "completed",
      pages: [
        { pageIndex: 0, extractedText: "primeira página", qualityScore: minimumOcrQualityScore },
        { pageIndex: 1, extractedText: "segunda página", qualityScore: 1 }
      ]
    });

    expect(result).toMatchObject({ processingStatus: "ready", reason: "quality_sufficient" });
  });

  it("trata OCR ausente ou resultado incompleto como revisão, não como sucesso", async () => {
    const unavailable = await unavailableOcrAdapter.recognize({
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      content: Buffer.from("%PDF-1.7")
    });

    expect(assessOcrResult(unavailable)).toEqual({
      processingStatus: "needs_review",
      ocrQualityScore: null,
      reason: "unavailable"
    });
    expect(
      assessOcrResult({
        status: "completed",
        pages: [{ pageIndex: 0, extractedText: "", qualityScore: 1 }]
      })
    ).toMatchObject({ processingStatus: "needs_review", ocrQualityScore: 0 });
  });
});
