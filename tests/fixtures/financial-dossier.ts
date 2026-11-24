import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { createBook, createLedger } from "../../evals/financial-dossier/corpus.js";
import { createFinancialReportService } from "../../apps/api/authoring/financial-report.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import { managerContext } from "../unit/answer-fixtures.js";
export function financialDocument(): AnalysisDocument {
  const book = createBook(createLedger());
  return {
    condominiumId: managerContext.condominiumId,
    documentId: "financial-book",
    documentVersionId: "financial-book-v1",
    documentTitle: book.title,
    pages: book.pages.map((p) => ({
      pageNumber: p.page,
      extractedText: p.text,
      extractionMethod: "pdf_text",
      qualityScore: 1
    }))
  };
}
export function financialFixture() {
  const full = financialDocument();
  let original = {
    ...full,
    pages: [...full.pages.slice(0, 6), full.pages[165]!, full.pages[299]!].map((p, i) => ({
      ...p,
      pageNumber: i + 1
    }))
  };
  const row: RegisteredDocument = {
    condominiumId: managerContext.condominiumId,
    documentId: original.documentId,
    documentVersionId: original.documentVersionId,
    title: original.documentTitle,
    documentType: "other",
    versionNumber: 1,
    sizeBytes: 100,
    processingStatus: "ready",
    validityStatus: "confirmed",
    createdAt: "2026-11-18T00:00:00Z",
    expectedPageCount: 8,
    processedPageCount: 8,
    searchablePageCount: 8,
    extractionCompleteness: 1,
    unreadablePageNumbers: [],
    extractionMethod: "pdf_text",
    ocrQualityScore: null
  };
  const catalog = { listAuthorized: vi.fn(async () => [row]) },
    reader = { readAuthorized: vi.fn(async () => [original]) },
    store = createInMemoryConversationStore();
  const scope = {
    kind: "chat" as const,
    condominiumId: managerContext.condominiumId,
    userId: managerContext.userId,
    chatId: randomUUID()
  };
  const complete = vi.fn(
    async (phase: "write" | "review", data: Record<string, unknown>): Promise<unknown> => {
      if (phase === "write")
        return {
          title: "Relatório financeiro fictício",
          overview: "Conferência baseada no caderno integral.",
          priorities: (data.priorityCheckIds as string[]).map((checkId) => ({
            checkId,
            text: "Confira os valores e solicite os esclarecimentos indicados."
          })),
          conclusion: "Valide decisões financeiras com o responsável contábil."
        };
      return {
        accepted: true,
        snapshotHash: data.snapshotHash,
        planHash: data.planHash,
        checks: (data.checks as { id: string }[]).map((c) => ({ id: c.id, supported: true })),
        issues: []
      };
    }
  );
  const now = () => new Date("2026-11-18T12:00:00Z");
  const sources = {
    getAuthorizedPage: vi.fn(async (_c: unknown, ref: { page: number }) => ({
      documentId: original.documentId,
      documentVersionId: original.documentVersionId,
      title: original.documentTitle,
      page: ref.page,
      content: original.pages[ref.page - 1]!.extractedText
    }))
  };
  const drafts = createDocumentDraftService({
    store,
    catalog,
    sources,
    now,
    authoringSource: (c, s, id) => service.reference(c, s, id)
  });
  const options = {
    store,
    catalog,
    reader,
    drafts,
    model: { key: "synthetic-financial-model", complete },
    now,
    authorize: vi.fn(async () => managerContext)
  };
  const service: ReturnType<typeof createFinancialReportService> =
    createFinancialReportService(options);
  return {
    row,
    scope,
    store,
    complete,
    reader,
    catalog,
    drafts,
    options,
    service,
    id: randomUUID(),
    request: { documentVersionIds: [original.documentVersionId], currentDocumentKey: "BAL-OUT" },
    changePage() {
      original = {
        ...original,
        pages: original.pages.map((p, i) =>
          i === 7 ? { ...p, extractedText: p.extractedText + "\nVersão alterada." } : p
        )
      };
    }
  };
}
