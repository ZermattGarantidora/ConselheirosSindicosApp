import type { DocumentMediaType } from "./document-model.js";

export type ImageAnalysisResult = Readonly<{
  visualDescription: string;
  recognizedText: string;
  limitations: string;
}>;

export interface ImageAnalysisAdapter {
  analyze(
    input: Readonly<{
      condominiumId: string;
      documentVersionId: string;
      content: Buffer;
      mediaType: Extract<DocumentMediaType, "image/jpeg" | "image/png">;
    }>
  ): Promise<ImageAnalysisResult>;
}
