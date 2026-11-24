import type {
  ConversationCase,
  ConversationTurn,
  ReviewerRole,
  ScenarioKind,
  Topic
} from "./dataset.js";

type Step = readonly [question: string, expected: string, overrides?: Partial<ConversationTurn>];

/** Cada fase declara a fotografia completa de fontes disponíveis, nunca o gabarito ao gateway. */
export function phase(
  documents: string,
  steps: readonly Step[],
  defaults: Partial<ConversationTurn> = {}
): readonly ConversationTurn[] {
  return steps.map(([question, expected, overrides]) =>
    Object.freeze({
      question,
      expected,
      documents: Object.freeze(documents.split(",").filter(Boolean)),
      legalLibrary: false,
      ...defaults,
      ...overrides
    })
  );
}

export function longCase(
  number: number,
  topic: Topic,
  title: string,
  focus: readonly string[],
  reviewers: readonly ReviewerRole[],
  phases: readonly (readonly ConversationTurn[])[],
  kind: ScenarioKind = "continuity"
): ConversationCase {
  let total = 0;
  return Object.freeze({
    id: `CONV-long-${String(number).padStart(2, "0")}`,
    topic,
    title,
    kind,
    priority: "P0",
    requiredReviewers: Object.freeze<ReviewerRole[]>(["síndico", ...new Set(reviewers)]),
    longConversation: Object.freeze({
      focus: Object.freeze([...focus]),
      checkpointTurns: Object.freeze(phases.map((part) => (total += part.length)))
    }),
    turns: Object.freeze(phases.flat())
  });
}
