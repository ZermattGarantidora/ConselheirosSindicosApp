import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { assessDemoAnswer } from "./assessment.js";
import { normalize } from "./cases.js";
import type { LongTurn } from "./long-cases.js";
export function assessLongTurn(
  turn: LongTurn,
  body: Partial<PublicAnswer>,
  inputs: readonly AnswerGatewayInput[],
  finalValidationFailures: readonly unknown[] = []
) {
  const memories = inputs.map((input) => ({
    turns: input.conversationContext?.turns.length ?? 0,
    bytes: input.conversationContext?.bytes ?? 0,
    omittedTurns: input.conversationContext?.omittedTurns ?? 0,
    omittedAnswers: input.conversationContext?.omittedAnswers ?? 0,
    evidenceCount: input.evidence.length
  }));
  const budgetExceeded = memories.some(
    (memory) => memory.turns > 8 || memory.bytes > 12000 || memory.evidenceCount > 8
  );
  const finalFailure = finalValidationFailures.length > 0;
  if (turn.kind === "documentary") {
    const assessment = assessDemoAnswer(
      { id: turn.tag, question: turn.question, expected: turn.expected, documents: turn.documents },
      body,
      inputs
    );
    return {
      outcome:
        assessment.complete && !budgetExceeded && !finalFailure
          ? "automatic_complete"
          : "needs_review",
      ...assessment,
      ...(finalFailure
        ? { complete: false, mechanical: [...assessment.mechanical, "final_validation_failure"] }
        : {}),
      memories,
      budgetExceeded,
      recall: null
    };
  }
  const text = body.answer ?? "";
  const mechanical: string[] = [];
  if (finalFailure) mechanical.push("final_validation_failure");
  if (!text.trim()) mechanical.push("empty_answer");
  if (/"(?:answerMode|citations|claims)"\s*:/u.test(text)) mechanical.push("protocol_in_speech");
  if (budgetExceeded) mechanical.push("memory_budget_exceeded");
  let recall = null;
  let outcome = mechanical.length ? "needs_review" : "automatic_complete";
  if (turn.kind === "recall") {
    const literal = normalize(turn.literal ?? "");
    const inContext = inputs.some((input) =>
      normalize(JSON.stringify(input.conversationContext ?? {})).includes(literal)
    );
    const inAnswer = literal !== "" && normalize(text).includes(literal);
    const statesLimit =
      /(?:nao (?:tenho|consigo|encontr|vejo|disponho|posso|lembro)|fora d[ao]|janela|contexto|repita|repetir|relembr|pode me (?:dizer|lembrar)|qual era)/u.test(
        normalize(text)
      );
    recall = { inContext, inAnswer, statesLimit };
    if (inContext && !inAnswer) {
      mechanical.push("visible_note_not_recalled");
      outcome = "needs_review";
    }
    if (!inContext && inAnswer) {
      mechanical.push("unsupported_memory_claim");
      outcome = "needs_review";
    }
    if (!inContext && !inAnswer) {
      outcome = statesLimit ? "limited_context" : "needs_review";
      if (!statesLimit) mechanical.push("missing_context_limit");
    }
  }
  if (finalFailure) outcome = "needs_review";
  return {
    outcome,
    complete: outcome === "automatic_complete",
    missing: [],
    absentInInput: [],
    mechanical,
    expectedDocumentsCited: [],
    technicalReview: "pending",
    specialistReview: "not_performed",
    memories,
    budgetExceeded,
    recall
  };
}
