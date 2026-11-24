import type { FastifyRequest } from "fastify";
import type { HostedDocumentTransferRequest } from "../documents/hosted-document-execution.js";
import type { BudgetRequest } from "../security/operation-budget.js";

export type HostedReplayProof = Readonly<{
  request: HostedDocumentTransferRequest;
  policyRevision: string;
}>;
export type JournalReplayProof = Readonly<{
  integralSum?: { receiptSha256: string };
  operation?: BudgetRequest;
  sourceCatalog?: { revision: string; documentVersionIds: readonly string[] };
  sourcePages?: readonly {
    documentId: string;
    documentVersionId: string;
    page: number;
    contentHash: string;
  }[];
  documents?: {
    catalogRevision: string;
    contentRevision: string;
    documentVersionIds: readonly string[];
    hosted?: HostedReplayProof;
  };
}>;
const proofs = new WeakMap<FastifyRequest, JournalReplayProof>();
export function addJournalReplayProof(request: FastifyRequest, proof: JournalReplayProof) {
  proofs.set(request, structuredClone({ ...proofs.get(request), ...proof }));
}
export const journalReplayProof = (request: FastifyRequest) => proofs.get(request);
