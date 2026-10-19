import type { AnswerCitation } from "../answers/answer-contract.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { assertAnalysisLimits, type AnalysisDocument } from "./document-analysis-reader.js";

/** Confere localização literal, não interpreta o significado nem confirma a qualidade do OCR. */
export function validateDocumentAnalysisSources(
  context: AuthorizedCondominiumContext,
  documents: readonly AnalysisDocument[],
  rows: readonly Readonly<{ citations: readonly AnswerCitation[] }>[]
): void {
  if (!context.permissions.includes("document:read")) throw new Error("Acesso não autorizado.");
  assertAnalysisLimits(documents);
  const versions = new Map<string, AnalysisDocument>();
  for (const document of documents) {
    if (
      document.condominiumId !== context.condominiumId ||
      document.documentId.trim() === "" ||
      document.documentVersionId.trim() === "" ||
      document.documentTitle.trim() === ""
    ) {
      throw new Error("Fonte documental não autorizada ou incompleta.");
    }
    if (versions.has(document.documentVersionId)) {
      throw new Error("Versão documental ambígua na conferência.");
    }
    const pageNumbers = new Set<number>();
    for (const page of document.pages) {
      if (!Number.isSafeInteger(page.pageNumber) || page.pageNumber < 1) {
        throw new Error("Número de página inválido na conferência.");
      }
      if (pageNumbers.has(page.pageNumber)) {
        throw new Error("Página documental ambígua na conferência.");
      }
      pageNumbers.add(page.pageNumber);
    }
    versions.set(document.documentVersionId, document);
  }
  // Índice transitório deste pedido; não repete a conversão de páginas grandes para cada citação.
  const charactersByPage = new Map<AnalysisDocument["pages"][number], readonly string[]>();
  for (const row of rows) {
    if (row.citations.length === 0) throw new Error("Achado calculado sem fonte documental.");
    for (const citation of row.citations) {
      const document = versions.get(citation.documentVersionId);
      if (
        document === undefined ||
        citation.documentId !== document.documentId ||
        citation.title !== document.documentTitle ||
        citation.sourceScope !== "condominium"
      ) {
        throw new Error("Referência documental não corresponde à fonte autorizada.");
      }
      const page = document.pages.find((candidate) => candidate.pageNumber === citation.page);
      const { startOffset, endOffset } = citation;
      if (
        page === undefined ||
        startOffset === undefined ||
        endOffset === undefined ||
        !Number.isSafeInteger(startOffset) ||
        !Number.isSafeInteger(endOffset) ||
        startOffset < 0 ||
        endOffset <= startOffset ||
        citation.excerpt.trim() === ""
      ) {
        throw new Error("Página ou offsets inválidos na referência documental.");
      }
      let characters = charactersByPage.get(page);
      if (characters === undefined) {
        characters = Array.from(page.extractedText);
        charactersByPage.set(page, characters);
      }
      if (
        endOffset > characters.length ||
        characters.slice(startOffset, endOffset).join("") !== citation.excerpt
      ) {
        throw new Error("O trecho calculado não corresponde à página original.");
      }
    }
  }
}
