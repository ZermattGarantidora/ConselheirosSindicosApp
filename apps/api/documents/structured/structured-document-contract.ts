import type { CondominiumId } from "../../core/condominium-scope.js";
import type { DocumentExtractionMethod } from "../document-model.js";

export type StructuredKnowledgeState = "known" | "unknown" | "needs_review";
export type StructuredDocumentKind =
  | "financial_statement"
  | "convention"
  | "internal_rules"
  | "meeting_minutes"
  | "contract"
  | "unknown";

export type StructuredSourceReference = Readonly<{
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  extractionMethod: DocumentExtractionMethod;
  uncertainty: readonly string[];
}>;

export type StructuredDocumentKindResult = Readonly<{
  value: StructuredDocumentKind;
  state: StructuredKnowledgeState;
  source: StructuredSourceReference | null;
}>;

export type StructuredFinancialPeriod = Readonly<{
  state: StructuredKnowledgeState;
  year: number | null;
  month: number | null;
  source: StructuredSourceReference | null;
}>;

export type StructuredFinancialEntry = Readonly<{
  originalLabel: string;
  originalAmount: string;
  amountMinor: string;
  currency: "BRL";
  source: StructuredSourceReference;
}>;

export type StructuredTable = Readonly<{
  state: StructuredKnowledgeState;
  source: StructuredSourceReference;
  lines: readonly string[];
  rows: readonly StructuredTableRow[];
  warning: string | null;
}>;

export type StructuredTableRow = Readonly<{
  source: StructuredSourceReference;
  cells: readonly StructuredTableCell[];
}>;

export type StructuredTableCell = Readonly<{
  text: string;
  source: StructuredSourceReference;
}>;

export type StructuredDocumentExtraction = Readonly<{
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  documentKind: StructuredDocumentKindResult;
  financialPeriod: StructuredFinancialPeriod;
  financialEntries: readonly StructuredFinancialEntry[];
  tables: readonly StructuredTable[];
  warnings: readonly string[];
}>;
