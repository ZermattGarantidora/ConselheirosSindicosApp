import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { files, hasFact, normalize, type DemoCase } from "./cases.js";
import {
  hasUnprovenExecution,
  cleanTrailingSourceMarker
} from "../../apps/api/answers/documentary-execution.js";
export function assessDemoAnswer(
  test: DemoCase,
  body: Partial<PublicAnswer>,
  inputs: readonly AnswerGatewayInput[]
) {
  const text = body.answer ?? "";
  const evidence = inputs.flatMap((input) => input.evidence);
  const cited = body.citations ?? [];
  const missing = test.expected.filter(
    (fact) =>
      !hasFact(text, fact) &&
      !hasFact(test.question, fact) &&
      !(
        ["lucas", "renata", "beatriz", "eduardo", "camila", "marina", "paulo"].includes(fact) &&
        new RegExp("\\b" + fact + "\\b", "u").test(normalize(test.question))
      )
  );
  const absentInInput = test.expected.filter(
    (fact) => !evidence.some((source) => hasFact(source.content, fact))
  );
  const mechanical: string[] = [];
  if (!text.trim()) mechanical.push("empty_answer");
  if (/"(?:answerMode|citations|claims)"\s*:/u.test(text) || /\b(?:batch|chunk):[\w-]+/u.test(text))
    mechanical.push("protocol_in_speech");
  const safeAbstention =
    test.expected.includes("missing") && body.answerMode === "abstained" && cited.length === 0;
  if (body.answerMode !== "grounded" && body.answerMode !== "conflict" && !safeAbstention)
    mechanical.push("documentary_answer_not_grounded");
  for (const citation of cited) {
    const source = evidence.find((item) => item.id === citation.evidenceId);
    if (
      !source ||
      source.documentId !== citation.documentId ||
      source.documentVersionId !== citation.documentVersionId ||
      source.pageNumber !== citation.page ||
      !source.content.includes(citation.excerpt)
    )
      mechanical.push("citation_invalid");
  }
  if (
    !safeAbstention &&
    !cited.some((citation) => Object.values(files).some((title) => citation.title === title))
  )
    mechanical.push("corpus_document_not_cited");
  if (cleanTrailingSourceMarker(text, cited.length > 0) !== text)
    mechanical.push("decorative_citation_in_speech");
  if (
    hasUnprovenExecution({
      answer: text,
      answerMode: body.answerMode ?? "failed",
      citations: cited,
      attentionPoints: body.attentionPoints ?? [],
      suggestedNextStep: body.suggestedNextStep ?? null,
      specialist: body.specialist ?? { required: false, type: null, reason: null }
    })
  )
    mechanical.push("unproven_execution_assertion");
  return {
    complete: missing.length === 0 && mechanical.length === 0,
    missing,
    absentInInput,
    mechanical,
    expectedDocumentsCited: test.documents.filter((key) =>
      cited.some((citation) => citation.title === files[key])
    ),
    technicalReview: "pending" as const,
    specialistReview: "not_performed" as const
  };
}
