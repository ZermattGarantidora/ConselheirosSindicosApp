import { createHash } from "node:crypto";
import { createOpenAiOcrAdapter } from "./openai-ocr.js";
import { createOpenAiImageAnalysisAdapter } from "./openai-image-analysis.js";
import {
  assessOcrResult,
  unavailableOcrAdapter,
  type OcrAdapter,
  type OcrResult
} from "./ocr-quality.js";
import type { ImageAnalysisAdapter } from "./image-analysis.js";
import { assertDocumentContent } from "./upload-document.js";
import { photoDocumentPdf } from "./photo-document-pdf.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentTransportConfigured,
  type HostedDocumentCallControl,
  type HostedDocumentTransferAuthorizer
} from "./hosted-document-execution.js";

export const hostedOcrLimits = Object.freeze({
  maximumPages: 10,
  maximumCharacters: 120_000,
  maximumOutputTokens: 16_000,
  timeoutMs: 60_000
});

/** Nenhuma fábrica de ambiente conecta autorização real. Injeção destina-se aos contratos locais. */
export function createHostedDocumentProcessingAdapters(
  options: Readonly<{
    apiKey?: string;
    authorize?: HostedDocumentTransferAuthorizer;
    fetch?: typeof globalThis.fetch;
    ocrModel?: string;
    imageModel?: string;
    photoMode?: "visual" | "document";
    callControl?: HostedDocumentCallControl;
    syntheticContractOnly?: boolean;
  }> = {}
): Readonly<{
  ocrAdapter: OcrAdapter;
  imageAnalysisAdapter?: ImageAnalysisAdapter;
  photoOcrAdapter?: OcrAdapter;
}> {
  if (!options.apiKey?.trim() || !hostedDocumentTransportConfigured(options))
    return Object.freeze({ ocrAdapter: unavailableOcrAdapter });
  const executor = createHostedDocumentExecutor({
    ...(options.callControl === undefined ? {} : { callControl: options.callControl }),
    ...(options.authorize === undefined ? {} : { authorize: options.authorize })
  });
  const ocrModel = options.ocrModel?.trim() || "gpt-5.6-luna";
  const imageModel = options.imageModel?.trim() || "gpt-6.1-sol";
  const transportOptions = {
    apiKey: options.apiKey,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch })
  };
  const ocr = createOpenAiOcrAdapter({
    ...transportOptions,
    model: ocrModel,
    maximumOutputTokens: hostedOcrLimits.maximumOutputTokens,
    timeoutMs: hostedOcrLimits.timeoutMs,
    requireCompletedResponse: true
  });
  const image = createOpenAiImageAnalysisAdapter({ ...transportOptions, model: imageModel });
  const createReadingAdapter = (purpose: "pdf_ocr" | "photo_ocr"): OcrAdapter =>
    Object.freeze({
      async recognize(input: Parameters<OcrAdapter["recognize"]>[0]): Promise<OcrResult> {
        try {
          const mediaType = purpose === "pdf_ocr" ? "application/pdf" : input.mediaType;
          if (
            mediaType === undefined ||
            mediaType ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            (purpose === "photo_ocr" && mediaType === "application/pdf")
          )
            throw new Error("Formato de foto ausente.");
          assertDocumentContent(input.content, mediaType);
          // Bytes imutáveis para o hash autorizado, inclusive enquanto a operação aguarda fila.
          input = { ...input, content: Buffer.from(input.content) };
          const contentSha256 = createHash("sha256").update(input.content).digest("hex");
          const converted =
            mediaType === "application/pdf"
              ? input.content
              : photoDocumentPdf(input.content, mediaType);
          assertDocumentContent(converted, "application/pdf");
          const pageCount = purpose === "photo_ocr" ? 1 : input.expectedPageCount;
          if (
            pageCount === undefined ||
            !Number.isInteger(pageCount) ||
            pageCount < 1 ||
            pageCount > hostedOcrLimits.maximumPages
          )
            return { status: "unavailable", reason: "failed" };
          const validate = (result: OcrResult) => {
            if (
              result.status !== "completed" ||
              assessOcrResult(result, pageCount).processingStatus !== "ready" ||
              result.pages.reduce((sum, page) => sum + page.extractedText.length, 0) >
                hostedOcrLimits.maximumCharacters
            )
              throw new Error("Leitura documental incompleta.");
            return result;
          };
          const result = await executor.execute(
            {
              purpose,
              destination: hostedDocumentDestination,
              model: ocrModel,
              condominiumId: input.condominiumId,
              documentVersions: [
                { id: input.documentVersionId, contentKind: "original", contentSha256 }
              ],
              payloadSha256: createHash("sha256").update(converted).digest("hex"),
              inputBytes: converted.length,
              pageCount,
              maximumOutputTokens: hostedOcrLimits.maximumOutputTokens,
              processorVersion:
                purpose === "photo_ocr" ? "photo-pdf-v1/ocr-pages-v1" : "ocr-pages-v1"
            },
            async (signal) => {
              return validate(await ocr.recognize({ ...input, content: converted, signal }));
            },
            input.signal
          );
          return validate(result);
        } catch {
          return Object.freeze({ status: "unavailable", reason: "failed" });
        }
      }
    });
  const ocrAdapter = createReadingAdapter("pdf_ocr");
  if (options.photoMode === "document")
    return Object.freeze({ ocrAdapter, photoOcrAdapter: createReadingAdapter("photo_ocr") });
  const imageAnalysisAdapter: ImageAnalysisAdapter = Object.freeze({
    async analyze(input: Parameters<ImageAnalysisAdapter["analyze"]>[0]) {
      assertDocumentContent(input.content, input.mediaType);
      input = { ...input, content: Buffer.from(input.content) };
      const contentSha256 = createHash("sha256").update(input.content).digest("hex");
      const validate = (result: Awaited<ReturnType<ImageAnalysisAdapter["analyze"]>>) => {
        if (
          !result ||
          typeof result.visualDescription !== "string" ||
          !result.visualDescription.trim() ||
          result.visualDescription.length > 700 ||
          typeof result.recognizedText !== "string" ||
          result.recognizedText.length > 250 ||
          typeof result.limitations !== "string" ||
          result.limitations.length > 180
        )
          throw new Error("Resultado visual inválido.");
        return result;
      };
      const result = await executor.execute(
        {
          purpose: "photo_analysis",
          destination: hostedDocumentDestination,
          model: imageModel,
          condominiumId: input.condominiumId,
          documentVersions: [
            { id: input.documentVersionId, contentKind: "original", contentSha256 }
          ],
          payloadSha256: contentSha256,
          inputBytes: input.content.length,
          pageCount: 1,
          maximumOutputTokens: 500,
          processorVersion: "visual-analysis-v1"
        },
        async (signal) => validate(await image.analyze({ ...input, signal })),
        input.signal
      );
      return validate(result);
    }
  });
  return Object.freeze({ ocrAdapter, imageAnalysisAdapter });
}
