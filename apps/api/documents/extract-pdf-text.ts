import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const maximumPdfPageCount = 500;
const standardFontDataUrl = new URL(
  "../../../node_modules/pdfjs-dist/standard_fonts/",
  import.meta.url
).href;

export type ExtractedPdfPage = Readonly<{
  pageIndex: number;
  pageNumber: number;
  extractedText: string;
  contentSha256: string;
  extractionMethod: "pdf_text";
  qualityScore: number;
}>;

export class PdfTextExtractionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

function normalizePageText(items: readonly unknown[]): string {
  return items
    .flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "str" in item &&
        typeof item.str === "string"
      ) {
        return item.str;
      }

      return [];
    })
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export async function extractPdfTextByPage(content: Buffer): Promise<readonly ExtractedPdfPage[]> {
  let loadingTask: ReturnType<typeof getDocument> | undefined;

  try {
    loadingTask = getDocument({
      data: new Uint8Array(content),
      stopAtErrors: true,
      standardFontDataUrl
    });
    const pdf = await loadingTask.promise;

    if (pdf.numPages > maximumPdfPageCount) {
      throw new PdfTextExtractionError("O PDF excede o limite de páginas permitido.");
    }

    const pages: ExtractedPdfPage[] = [];

    for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex + 1);
      const textContent = await page.getTextContent();
      const extractedText = normalizePageText(textContent.items);

      pages.push(
        Object.freeze({
          pageIndex,
          pageNumber: pageIndex + 1,
          extractedText,
          contentSha256: createHash("sha256").update(extractedText).digest("hex"),
          extractionMethod: "pdf_text",
          qualityScore: extractedText.length === 0 ? 0 : 1
        })
      );
    }

    return Object.freeze(pages);
  } catch (error: unknown) {
    if (error instanceof PdfTextExtractionError) {
      throw error;
    }

    throw new PdfTextExtractionError("Não foi possível extrair texto do PDF.");
  } finally {
    await loadingTask?.destroy();
  }
}
