import { createHash } from "node:crypto";

import type { CondominiumId } from "../core/condominium-scope.js";
import { identifyDocumentType, type DocumentIdentification } from "./document-identification.js";
import {
  createDocumentVersion,
  type DocumentExtractionMethod,
  type DocumentMediaType,
  transitionDocumentProcessing,
  type DocumentPage,
  type DocumentVersionState
} from "./document-model.js";
import { extractPdfTextByPage, type ExtractedPdfPage } from "./extract-pdf-text.js";
import {
  assessOcrResult,
  minimumOcrQualityScore,
  unavailableOcrAdapter,
  type OcrAdapter,
  type OcrPageResult,
  type OcrResult
} from "./ocr-quality.js";
import type { ImageAnalysisAdapter } from "./gemini-image-analysis.js";
import type { MultimodalImageEmbeddingAdapter } from "../retrieval/gemini-multimodal-embedding.js";
import type { GeneratedEmbedding } from "../retrieval/retrieval-contract.js";
import { chunkPage } from "../retrieval/retrieval-contract.js";

export type ProcessedDocumentPage = Readonly<
  DocumentPage & {
    extractedText: string;
    extractionMethod: DocumentExtractionMethod;
    qualityScore: number;
    contentSha256: string;
    visualDescription?: string;
    recognizedText?: string;
    analysisLimitations?: string;
    multimodalEmbeddings?: readonly GeneratedEmbedding[];
  }
>;

export type DocumentExtractionSummary = Readonly<{
  expectedPageCount: number;
  processedPageCount: number;
  searchablePageCount: number;
  unreadablePageNumbers: readonly number[];
  extractionCompleteness: number;
  extractionMethod: DocumentExtractionMethod | null;
  ocrQualityScore: number | null;
}>;

export type DocumentProcessingInput = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  content: Buffer;
  currentState: DocumentVersionState;
  mediaType?: DocumentMediaType;
  ocrAdapter?: OcrAdapter;
  imageAnalysisAdapter?: ImageAnalysisAdapter;
  imageEmbeddingAdapter?: MultimodalImageEmbeddingAdapter;
}>;

export type DocumentProcessingOutcome = Readonly<
  | {
      status: "completed";
      state: DocumentVersionState;
      pages: readonly ProcessedDocumentPage[];
      extractionSummary: DocumentExtractionSummary;
      documentIdentification?: DocumentIdentification;
    }
  | {
      status: "failed";
      state: DocumentVersionState;
      pages: readonly [];
      reason: "pdf_parse_failed";
      extractionSummary: DocumentExtractionSummary;
      documentIdentification?: DocumentIdentification;
    }
  | {
      status: "needs_review";
      state: DocumentVersionState;
      pages: readonly ProcessedDocumentPage[];
      reason:
        | "ocr_unavailable"
        | "ocr_low_quality"
        | "ocr_invalid"
        | "image_analysis_unavailable"
        | "image_analysis_failed";
      extractionSummary: DocumentExtractionSummary;
      documentIdentification?: DocumentIdentification;
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
    extractionMethod: DocumentExtractionMethod;
    qualityScore: number;
    visualDescription?: string;
    recognizedText?: string;
    analysisLimitations?: string;
    multimodalEmbeddings?: readonly GeneratedEmbedding[];
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
    contentSha256: createHash("sha256").update(input.extractedText).digest("hex"),
    ...(input.visualDescription === undefined
      ? {}
      : { visualDescription: input.visualDescription }),
    ...(input.recognizedText === undefined ? {} : { recognizedText: input.recognizedText }),
    ...(input.analysisLimitations === undefined
      ? {}
      : { analysisLimitations: input.analysisLimitations }),
    ...(input.multimodalEmbeddings === undefined
      ? {}
      : { multimodalEmbeddings: Object.freeze([...input.multimodalEmbeddings]) })
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
    reason: "pdf_parse_failed" as const,
    extractionSummary: Object.freeze({
      expectedPageCount: 0,
      processedPageCount: 0,
      searchablePageCount: 0,
      unreadablePageNumbers: Object.freeze([]),
      extractionCompleteness: 0,
      extractionMethod: null,
      ocrQualityScore: null
    }),
    documentIdentification: identifyDocumentType("")
  });
}

function identifyPages(pages: readonly ProcessedDocumentPage[]): DocumentIdentification {
  return identifyDocumentType(pages.map((page) => page.extractedText).join("\n"));
}

function createExtractionSummary(
  expectedPageCount: number,
  pages: readonly ProcessedDocumentPage[],
  ocrQualityScore: number | null
): DocumentExtractionSummary {
  const unreadablePageNumbers = pages
    .filter(
      (page) =>
        page.extractedText.trim().length === 0 ||
        page.qualityScore <
          (page.extractionMethod === "ocr"
            ? minimumOcrQualityScore
            : page.extractionMethod === "image_vision"
              ? 0.7
              : 1)
    )
    .map((page) => page.pageNumber);
  const searchablePageCount = pages.filter(
    (page) =>
      page.extractedText.trim().length > 0 &&
      page.qualityScore >=
        (page.extractionMethod === "ocr"
          ? minimumOcrQualityScore
          : page.extractionMethod === "image_vision"
            ? 0.7
            : 1)
  ).length;
  const methods = new Set(pages.map((page) => page.extractionMethod));

  return Object.freeze({
    expectedPageCount,
    processedPageCount: pages.length,
    searchablePageCount,
    unreadablePageNumbers: Object.freeze(unreadablePageNumbers),
    extractionCompleteness: expectedPageCount === 0 ? 0 : searchablePageCount / expectedPageCount,
    extractionMethod:
      methods.size === 0 ? null : methods.size === 1 ? (pages[0]?.extractionMethod ?? null) : "ocr",
    ocrQualityScore
  });
}

export async function processDocumentVersion(
  input: DocumentProcessingInput
): Promise<DocumentProcessingOutcome> {
  const processingState = transitionDocumentProcessing(input.currentState, "processing");
  const mediaType = input.mediaType ?? "application/pdf";
  if (mediaType !== "application/pdf") {
    return processImageVersion(input, processingState, mediaType);
  }
  let extractedPages: readonly ExtractedPdfPage[];

  try {
    extractedPages = await extractPdfTextByPage(input.content);
  } catch {
    return failedPdfResult(processingState);
  }

  const hasUsableText =
    extractedPages.length > 0 && extractedPages.every((page) => page.extractedText.length > 0);

  if (hasUsableText) {
    const pages = createPdfPages(input.condominiumId, input.documentVersionId, extractedPages);
    return Object.freeze({
      status: "completed" as const,
      state: transitionDocumentProcessing(processingState, "ready"),
      pages,
      extractionSummary: createExtractionSummary(extractedPages.length, pages, null),
      documentIdentification: identifyPages(pages)
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
    return Object.freeze({
      status: "completed" as const,
      state,
      pages: ocrPages,
      extractionSummary: createExtractionSummary(
        extractedPages.length,
        ocrPages,
        decision.ocrQualityScore
      ),
      documentIdentification: identifyPages(ocrPages)
    });
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
          : ("ocr_low_quality" as const),
    extractionSummary: createExtractionSummary(
      extractedPages.length,
      ocrPages,
      decision.ocrQualityScore
    ),
    documentIdentification: identifyPages(ocrPages)
  });
}

function imageReviewOutcome(
  input: DocumentProcessingInput,
  processingState: DocumentVersionState,
  reason: "image_analysis_unavailable" | "image_analysis_failed"
): DocumentProcessingOutcome {
  const page = createProcessedPage({
    condominiumId: input.condominiumId,
    documentVersionId: input.documentVersionId,
    pageIndex: 0,
    pageNumber: 1,
    extractedText: "",
    extractionMethod: "image_vision",
    qualityScore: 0
  });
  return Object.freeze({
    status: "needs_review" as const,
    state: transitionDocumentProcessing(processingState, "needs_review"),
    pages: Object.freeze([page]),
    reason,
    extractionSummary: Object.freeze({
      expectedPageCount: 1,
      processedPageCount: 1,
      searchablePageCount: 0,
      unreadablePageNumbers: Object.freeze([1]),
      extractionCompleteness: 0,
      extractionMethod: "image_vision" as const,
      ocrQualityScore: null
    })
  });
}

async function processImageVersion(
  input: DocumentProcessingInput,
  processingState: DocumentVersionState,
  mediaType: Extract<DocumentMediaType, "image/jpeg" | "image/png">
): Promise<DocumentProcessingOutcome> {
  const analyzer = input.imageAnalysisAdapter;
  const embedder = input.imageEmbeddingAdapter;
  if (analyzer === undefined || embedder === undefined) {
    return imageReviewOutcome(input, processingState, "image_analysis_unavailable");
  }
  try {
    const analysis = await analyzer.analyze({
      condominiumId: input.condominiumId,
      documentVersionId: input.documentVersionId,
      content: input.content,
      mediaType
    });
    const extractedText = [
      "Observação visual gerada por IA (não é texto literal da imagem):",
      analysis.visualDescription,
      "Texto percebido na imagem por IA (transcrição não garantida):",
      analysis.recognizedText || "Nenhum texto curto e legível foi reconhecido.",
      "Limitações:",
      analysis.limitations || "Confira a imagem original; a descrição pode conter erros."
    ].join("\n");
    const page = createProcessedPage({
      condominiumId: input.condominiumId,
      documentVersionId: input.documentVersionId,
      pageIndex: 0,
      pageNumber: 1,
      extractedText,
      extractionMethod: "image_vision",
      qualityScore: 1,
      visualDescription: analysis.visualDescription,
      recognizedText: analysis.recognizedText,
      analysisLimitations: analysis.limitations
    });
    const chunks = chunkPage({
      condominiumId: input.condominiumId,
      documentVersionId: input.documentVersionId,
      documentPageId: page.id,
      pageNumber: 1,
      extractedText
    });
    if (chunks.length === 0) throw new Error("A descrição visual ficou vazia.");
    const multimodalEmbeddings: GeneratedEmbedding[] = [];
    for (const chunk of chunks) {
      const embedding = await embedder.embedImageAndText({
        content: input.content,
        mediaType,
        text: chunk.content,
        contentSha256: chunk.contentSha256
      });
      if (
        embedding.dimensions !== embedder.profile.dimensions ||
        embedding.values.length !== embedder.profile.dimensions ||
        embedding.contentSha256 !== chunk.contentSha256
      )
        throw new Error("O vetor não corresponde ao chunk da página.");
      multimodalEmbeddings.push(embedding);
    }
    const pages = Object.freeze([
      Object.freeze({ ...page, multimodalEmbeddings: Object.freeze(multimodalEmbeddings) })
    ]);
    return Object.freeze({
      status: "completed" as const,
      state: transitionDocumentProcessing(processingState, "ready"),
      pages,
      extractionSummary: createExtractionSummary(1, pages, null)
    });
  } catch {
    return imageReviewOutcome(input, processingState, "image_analysis_failed");
  }
}

export type StoredDocumentForProcessing = Readonly<{
  condominiumId: CondominiumId;
  documentVersionId: string;
  content: Buffer;
  mediaType?: DocumentMediaType;
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
  ocrAdapter: OcrAdapter = unavailableOcrAdapter,
  imageAnalysisAdapter?: ImageAnalysisAdapter,
  imageEmbeddingAdapter?: MultimodalImageEmbeddingAdapter
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
        ...(stored.mediaType === undefined ? {} : { mediaType: stored.mediaType }),
        currentState: stored.state,
        ocrAdapter,
        ...(imageAnalysisAdapter === undefined ? {} : { imageAnalysisAdapter }),
        ...(imageEmbeddingAdapter === undefined ? {} : { imageEmbeddingAdapter })
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
    mediaType?: DocumentMediaType;
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
    mediaType: input.mediaType ?? "application/pdf",
    sizeBytes: input.sizeBytes
  });
}
