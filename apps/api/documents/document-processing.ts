import { createHash } from "node:crypto";

import type { CondominiumId } from "../core/condominium-scope.js";
import {
  createDocumentVersion,
  transitionDocumentProcessing,
  type DocumentPage,
  type DocumentVersionState
} from "./document-model.js";
import { extractPdfTextByPage, type ExtractedPdfPage } from "./extract-pdf-text.js";
import {
  assessOcrResult,
  unavailableOcrAdapter,
  type OcrAdapter,
  type OcrPageResult,
  type OcrResult
} from "./ocr-quality.js";

export type ProcessedDocumentPage = Readonly<
  DocumentPage & {
    extractedText: string;
    extractionMethod: "pdf_text" | "ocr";
    qualityScore: number;
    contentSha256: string;
  }
>;

export type DocumentProcessingInput = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  content: Buffer;
  currentState: DocumentVersionState;
  ocrAdapter?: OcrAdapter;
}>;

export type DocumentProcessingOutcome = Readonly<
  | {
      status: "completed";
      state: DocumentVersionState;
      pages: readonly ProcessedDocumentPage[];
    }
  | {
      status: "failed";
      state: DocumentVersionState;
      pages: readonly [];
      reason: "pdf_parse_failed";
    }
  | {
      status: "needs_review";
      state: DocumentVersionState;
      pages: readonly ProcessedDocumentPage[];
      reason: "ocr_unavailable" | "ocr_low_quality" | "ocr_invalid";
    }
>;

function pageId(documentVersionId: string, pageIndex: number): string {
  return createHash("sha256").update(`${documentVersionId}:page:${pageIndex}`).digest("hex");
}

function createProcessedPage(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentVersionId: string;
    pageIndex: number;
    pageNumber: number;
    extractedText: string;
    extractionMethod: "pdf_text" | "ocr";
    qualityScore: number;
  }>
): ProcessedDocumentPage {
  return Object.freeze({
    id: pageId(input.documentVersionId, input.pageIndex),
    condominiumId: input.condominiumId,
    documentVersionId: input.documentVersionId,
    pageIndex: input.pageIndex,
    pageNumber: input.pageNumber,
    extractedText: input.extractedText,
    extractionMethod: input.extractionMethod,
    qualityScore: input.qualityScore,
    contentSha256: createHash("sha256").update(input.extractedText).digest("hex")
  });
}

function createPdfPages(
  condominiumId: CondominiumId,
  documentVersionId: string,
  pages: readonly ExtractedPdfPage[]
): readonly ProcessedDocumentPage[] {
  return Object.freeze(
    pages.map((page) =>
      createProcessedPage({
        condominiumId,
        documentVersionId,
        pageIndex: page.pageIndex,
        pageNumber: page.pageNumber,
        extractedText: page.extractedText,
        extractionMethod: "pdf_text",
        qualityScore: page.qualityScore
      })
    )
  );
}

function hasExpectedOcrPages(pages: readonly OcrPageResult[], expectedPageCount: number): boolean {
  return (
    expectedPageCount > 0 &&
    pages.length === expectedPageCount &&
    pages.every((page, index) => page.pageIndex === index)
  );
}

function createOcrPages(
  condominiumId: CondominiumId,
  documentVersionId: string,
  pages: readonly OcrPageResult[]
): readonly ProcessedDocumentPage[] {
  return Object.freeze(
    pages.map((page) =>
      createProcessedPage({
        condominiumId,
        documentVersionId,
        pageIndex: page.pageIndex,
        pageNumber: page.pageIndex + 1,
        extractedText: page.extractedText.trim(),
        extractionMethod: "ocr",
        qualityScore: page.qualityScore
      })
    )
  );
}

function failedPdfResult(processingState: DocumentVersionState): DocumentProcessingOutcome {
  return Object.freeze({
    status: "failed" as const,
    state: transitionDocumentProcessing(processingState, "failed"),
    pages: Object.freeze([]) as readonly [],
    reason: "pdf_parse_failed" as const
  });
}

export async function processDocumentVersion(
  input: DocumentProcessingInput
): Promise<DocumentProcessingOutcome> {
  const processingState = transitionDocumentProcessing(input.currentState, "processing");
  let extractedPages: readonly ExtractedPdfPage[];

  try {
    extractedPages = await extractPdfTextByPage(input.content);
  } catch {
    return failedPdfResult(processingState);
  }

  const hasUsableText =
    extractedPages.length > 0 && extractedPages.every((page) => page.extractedText.length > 0);

  if (hasUsableText) {
    return Object.freeze({
      status: "completed" as const,
      state: transitionDocumentProcessing(processingState, "ready"),
      pages: createPdfPages(input.condominiumId, input.documentVersionId, extractedPages)
    });
  }

  const ocrAdapter = input.ocrAdapter ?? unavailableOcrAdapter;
  let ocrResult: OcrResult;

  try {
    ocrResult = await ocrAdapter.recognize({
      condominiumId: input.condominiumId,
      documentVersionId: input.documentVersionId,
      content: input.content
    });
  } catch {
    ocrResult = Object.freeze({ status: "unavailable", reason: "failed" });
  }

  const decision = assessOcrResult(ocrResult, extractedPages.length);
  const ocrPages =
    ocrResult.status === "completed" && hasExpectedOcrPages(ocrResult.pages, extractedPages.length)
      ? createOcrPages(input.condominiumId, input.documentVersionId, ocrResult.pages)
      : createPdfPages(input.condominiumId, input.documentVersionId, extractedPages);
  const state = transitionDocumentProcessing(
    processingState,
    decision.processingStatus,
    decision.ocrQualityScore
  );

  if (decision.processingStatus === "ready") {
    return Object.freeze({ status: "completed" as const, state, pages: ocrPages });
  }

  return Object.freeze({
    status: "needs_review" as const,
    state,
    pages: ocrPages,
    reason:
      decision.reason === "unavailable"
        ? ("ocr_unavailable" as const)
        : ocrResult.status === "completed" &&
            !hasExpectedOcrPages(ocrResult.pages, extractedPages.length)
          ? ("ocr_invalid" as const)
          : ("ocr_low_quality" as const)
  });
}

export type StoredDocumentForProcessing = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  content: Buffer;
  state: DocumentVersionState;
}>;

export type SavedDocumentProcessingResult = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  jobId: string;
  attemptCount: number;
  outcome: DocumentProcessingOutcome;
}>;

export interface DocumentProcessingRepository {
  loadForProcessing(
    input: Readonly<{
      condominiumId: CondominiumId;
      documentVersionId: string;
    }>
  ): Promise<StoredDocumentForProcessing | undefined>;
  saveProcessingResult(input: SavedDocumentProcessingResult): Promise<void>;
}

export function createScopedDocumentProcessor(
  repository: DocumentProcessingRepository,
  ocrAdapter: OcrAdapter = unavailableOcrAdapter
): Readonly<{
  process(
    input: Readonly<{
      condominiumId: CondominiumId;
      documentVersionId: string;
      jobId: string;
      attemptCount: number;
    }>
  ): Promise<void>;
}> {
  return Object.freeze({
    async process(input) {
      const stored = await repository.loadForProcessing(input);

      if (stored === undefined) {
        throw new Error("A versão documental do job não foi encontrada.");
      }

      if (
        stored.condominiumId !== input.condominiumId ||
        stored.documentVersionId !== input.documentVersionId
      ) {
        throw new Error("A versão documental não pertence ao condomínio do job.");
      }

      const outcome = await processDocumentVersion({
        condominiumId: input.condominiumId,
        documentVersionId: input.documentVersionId,
        content: stored.content,
        currentState: stored.state,
        ocrAdapter
      });

      await repository.saveProcessingResult({
        condominiumId: input.condominiumId,
        documentVersionId: input.documentVersionId,
        jobId: input.jobId,
        attemptCount: input.attemptCount,
        outcome
      });
    }
  });
}

export function documentVersionFromUpload(
  input: Readonly<{
    condominiumId: CondominiumId;
    documentId: string;
    documentVersionId: string;
    contentSha256: string;
    sizeBytes: number;
  }>
): Readonly<{
  version: ReturnType<typeof createDocumentVersion>["version"];
  state: DocumentVersionState;
}> {
  return createDocumentVersion({
    id: input.documentVersionId,
    condominiumId: input.condominiumId,
    documentId: input.documentId,
    versionNumber: 1,
    contentSha256: input.contentSha256,
    mediaType: "application/pdf",
    sizeBytes: input.sizeBytes
  });
}
