import { createHash } from "node:crypto";

import { createCondominiumId } from "../core/condominium-scope.js";
import type { RetrievableChunk } from "./retrieval-contract.js";

function chunk(input: Omit<RetrievableChunk, "contentSha256" | "endOffset">): RetrievableChunk {
  return Object.freeze({
    ...input,
    endOffset: Array.from(input.content).length,
    contentSha256: createHash("sha256").update(input.content).digest("hex")
  });
}

/** Corpus sintético, exclusivamente para a demonstração local. */
export const developmentRetrievalFixtures: readonly RetrievableChunk[] = Object.freeze([
  chunk({
    id: "alameda-convencao-animais-p3",
    condominiumId: createCondominiumId("alameda"),
    documentId: "alameda-convencao",
    documentVersionId: "alameda-convencao-v1",
    documentVersionNumber: 1,
    documentTitle: "Convenção sintética do Residencial Alameda",
    documentType: "convention",
    sourceKind: "user_upload",
    pageId: "alameda-convencao-p3",
    pageNumber: 3,
    startOffset: 0,
    content:
      "Animais de pequeno porte são permitidos nas unidades, desde que não circulem desacompanhados nas áreas comuns e não causem perturbação recorrente.",
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 0.99,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: new Date("2025-01-01T00:00:00.000Z"),
    validUntil: null
  }),
  chunk({
    id: "bosque-regimento-visitantes-p4",
    condominiumId: createCondominiumId("bosque"),
    documentId: "bosque-regimento",
    documentVersionId: "bosque-regimento-v1",
    documentVersionNumber: 1,
    documentTitle: "Regimento sintético do Condomínio Bosque",
    documentType: "internal_rules",
    sourceKind: "user_upload",
    pageId: "bosque-regimento-p4",
    pageNumber: 4,
    startOffset: 0,
    content:
      "Visitantes devem ser identificados na portaria e acompanhados pelo morador responsável durante o uso do salão de festas.",
    semanticScore: null,
    extractionMethod: "pdf_text",
    qualityScore: 0.99,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: new Date("2025-01-01T00:00:00.000Z"),
    validUntil: null
  })
]);
