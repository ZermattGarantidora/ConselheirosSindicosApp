import { describe, it, expect } from "vitest";
import { canJournalCiteDocument } from "../../apps/api/app/question-document-citations.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type { AnswerRecord } from "../../apps/api/answers/answer-contract.js";
import { managerContext, bosque } from "./answer-fixtures.js";
function fixture() {
  const document = {
    condominiumId: managerContext.condominiumId,
    documentId: "draft",
    documentVersionId: "draft-v2",
    processingStatus: "ready",
    validityStatus: "pending"
  } as RegisteredDocument;
  const saved = {
    answerId: "answer",
    userId: managerContext.userId,
    condominiumId: managerContext.condominiumId,
    answer: "A minuta propoe R$10,00, sem aprovacao confirmada.",
    answerMode: "grounded",
    validationStatus: "passed",
    citations: [{ evidenceId: "draft-e", documentId: "draft", documentVersionId: "draft-v2" }],
    claims: [
      {
        statement: "A minuta propoe R$10,00 sem aprovacao.",
        claimType: "interpretation",
        evidenceRequired: true,
        citationEvidenceIds: ["draft-e"]
      }
    ]
  } as unknown as AnswerRecord;
  const response = {
    answerId: saved.answerId,
    answer: saved.answer,
    answerMode: saved.answerMode,
    citations: saved.citations
  };
  return { document, saved, response };
}
describe("Spec 076 — recibo de comparação pendente", () => {
  it.each([
    ["O registro não comprova aprovação da proposta.", true],
    ["A ata não demonstra a aprovação da proposta.", true],
    ["O documento não confirma aprovação.", true],
    ["A aprovação foi comprovada pelo pagamento.", false],
    ["Não é necessário comprovar aprovação.", false]
  ])(
    "AC7714: interpreta negativa de aprovacao sem promover vigencia: %s",
    (statement, expected) => {
      const { document, saved, response } = fixture();
      const qualified = { ...saved, claims: saved.claims.map((c) => ({ ...c, statement })) };
      expect(
        canJournalCiteDocument(document, "question_answer", managerContext, response, qualified)
      ).toBe(expected);
      expect(document.validityStatus).toBe("pending");
      expect(
        canJournalCiteDocument(
          { ...document, condominiumId: bosque },
          "question_answer",
          managerContext,
          response,
          qualified
        )
      ).toBe(false);
    }
  );
  it("AC7609: documento pronto não vira vigente por permitir interpretação persistida", () => {
    const { document, saved, response } = fixture();
    expect(
      canJournalCiteDocument(document, "question_answer", managerContext, response, saved)
    ).toBe(true);
    expect(document.validityStatus).toBe("pending");
    expect(
      canJournalCiteDocument(
        { ...document, validityStatus: "disputed" },
        "question_answer",
        managerContext,
        response,
        saved
      )
    ).toBe(true);
    expect(
      canJournalCiteDocument(document, "document_summary", managerContext, response, saved)
    ).toBe(false);
  });
  it.each([
    "sem registro",
    "resposta alterada",
    "citação alterada",
    "outro usuário",
    "outro tenant",
    "afirmação de vigência",
    "sem claim",
    "sem qualificação",
    "apenas rótulo minuta",
    "não validado",
    "não pronto",
    "superseded",
    "propriedade pendente"
  ])("AC7609: recusa %s", (kind) => {
    const f = fixture();
    let d = f.document,
      s = f.saved as AnswerRecord | undefined;
    const r: Record<string, unknown> = { ...f.response };
    if (kind === "sem registro") s = undefined;
    if (kind === "resposta alterada") r.answer = "Esta norma ja esta vigente.";
    if (kind === "citação alterada") r.citations = [];
    if (kind === "outro usuário")
      s = { ...f.saved, userId: "outro" as typeof managerContext.userId };
    if (kind === "outro tenant") d = { ...d, condominiumId: bosque };
    if (kind === "afirmação de vigência")
      s = {
        ...f.saved,
        claims: f.saved.claims.map((c) => ({ ...c, claimType: "condominium_fact" }))
      };
    if (kind === "sem claim") s = { ...f.saved, claims: [] };
    if (kind === "sem qualificação")
      s = {
        ...f.saved,
        claims: f.saved.claims.map((c) => ({ ...c, statement: "A taxa vale R$10,00." }))
      };
    if (kind === "apenas rótulo minuta")
      s = {
        ...f.saved,
        claims: f.saved.claims.map((c) => ({
          ...c,
          statement: "A minuta está vigente e autoriza o valor novo."
        }))
      };
    if (kind === "não validado") s = { ...f.saved, validationStatus: "failed" };
    if (kind === "não pronto") d = { ...d, processingStatus: "needs_review" };
    if (kind === "superseded") d = { ...d, validityStatus: "superseded" };
    if (kind === "propriedade pendente")
      d = {
        ...d,
        condominiumCheck: {
          status: "pending",
          expectedName: "Alameda",
          detectedNames: [],
          sources: [],
          resumeProcessingStatus: "ready"
        }
      };
    expect(canJournalCiteDocument(d, "question_answer", managerContext, r, s)).toBe(false);
  });
});
