export const documentAuthoringVersion = "document-authoring-v1" as const;
export type DocumentAuthoringRequest = Readonly<{
  title: string;
  documentKind: string;
  operation: "create" | "revise" | "improve";
  request: string;
  report: string;
  documentVersionIds: readonly string[];
}>;
export type DocumentAuthoringSource = Readonly<{
  id: string;
  kind: "document" | "user_report";
  title: string;
  text: string;
  documentId?: string;
  documentVersionId?: string;
  page?: number;
  documentType?: string;
}>;
export type DocumentProposalReference = Readonly<{
  sourceId: string;
  startOffset: number;
  endOffset: number;
  quote: string;
}>;
export type DocumentProposalPlan = Readonly<{
  version: typeof documentAuthoringVersion;
  status: "ready" | "needs_context";
  message: string;
  title: string;
  documentKind: string;
  operation: DocumentAuthoringRequest["operation"];
  paragraphs: readonly Readonly<{
    id: string;
    text: string;
    provenance: "document_fact" | "user_report" | "draft_wording";
    references: readonly DocumentProposalReference[];
  }>[];
  changes: readonly Readonly<{
    id: string;
    paragraphId: string;
    before: DocumentProposalReference | null;
    after: string;
    kind: "editorial" | "factual" | "substantive";
    reason: string;
    references: readonly DocumentProposalReference[];
  }>[];
  coverage: readonly Readonly<{
    sourceId: string;
    disposition: "represented" | "pending" | "non_material";
    paragraphIds: readonly string[];
    reason: string;
  }>[];
  pending: readonly string[];
  requiresSpecialist: boolean;
}>;
export type DocumentProposal = Readonly<{
  id: string;
  hash: string;
  sourceHash: string;
  plan: DocumentProposalPlan;
  sources: readonly DocumentAuthoringSource[];
  status: "offered" | "accepted" | "declined" | "needs_context" | "unchanged";
  trigger?: "original_analysis";
}>;
export type DocumentAuthoringReference = Readonly<{
  proposalId: string;
  proposalHash: string;
  sourceHash: string;
  hasUserReport: boolean;
}>;
