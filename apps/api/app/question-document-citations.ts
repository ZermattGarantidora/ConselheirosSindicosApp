import type { RegisteredDocument } from "../documents/document-catalog.js";
import type { AnswerRecord } from "../answers/answer-contract.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { canSummarizeDocument } from "../analysis/document-snapshot.js";
import { conversationHash } from "../answers/conversation-store.js";

/** A vigência de uma minuta não é promovida por permitir a comparação citada. */
export function canJournalCiteDocument(
  document: RegisteredDocument,
  kind: string,
  context: AuthorizedCondominiumContext,
  response: Readonly<Record<string, unknown>>,
  saved: AnswerRecord | undefined
): boolean {
  if (
    document.condominiumId !== context.condominiumId ||
    !context.permissions.includes("document:read")
  )
    return false;
  if (canSummarizeDocument(document)) return true;
  if (
    kind !== "question_answer" ||
    document.processingStatus !== "ready" ||
    document.condominiumCheck?.status === "pending" ||
    !["pending", "disputed"].includes(document.validityStatus) ||
    !saved ||
    saved.validationStatus !== "passed" ||
    saved.userId !== context.userId ||
    saved.condominiumId !== context.condominiumId ||
    saved.answerId !== response.answerId ||
    saved.answer !== response.answer ||
    saved.answerMode !== response.answerMode ||
    conversationHash(saved.citations) !== conversationHash(response.citations)
  )
    return false;
  const citations = saved.citations.filter(
    (c) =>
      c.documentVersionId === document.documentVersionId && c.documentId === document.documentId
  );
  if (!citations.length) return false;
  return citations.every((c) => {
    const claims = saved.claims.filter((claim) => claim.citationEvidenceIds.includes(c.evidenceId));
    return (
      claims.length > 0 &&
      claims.every(
        (claim) =>
          claim.claimType === "interpretation" &&
          claim.evidenceRequired &&
          /propost|prop[oõ]e|penden|disput|sem assinatura|n[aã]o.{0,20}(?:aprovad|confirmad|vigente|autoriza|permite|substitui)/iu.test(
            claim.statement
          )
      )
    );
  });
}
