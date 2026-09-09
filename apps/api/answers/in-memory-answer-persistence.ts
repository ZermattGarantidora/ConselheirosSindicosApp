import { randomUUID } from "node:crypto";

import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  AnswerPersistence,
  AuditEventRecord,
  FeedbackRecord,
  PersistedInteraction,
  SubmitFeedbackInput
} from "./answer-persistence.js";
import { validateFeedbackInput } from "./answer-persistence.js";
import type { AnswerRecord } from "./answer-contract.js";

export type InMemoryAnswerPersistence = AnswerPersistence &
  Readonly<{
    getInteraction(answerId: string): PersistedInteraction | undefined;
    listInteractions(): readonly PersistedInteraction[];
    listFeedback(): readonly FeedbackRecord[];
    listAuditEvents(): readonly AuditEventRecord[];
  }>;

function interactionKey(condominiumId: string, answerId: string): string {
  return `${condominiumId}|${answerId}`;
}

export function createInMemoryAnswerPersistence(
  idFactory: () => string = randomUUID,
  now: () => Date = () => new Date()
): InMemoryAnswerPersistence {
  const interactions = new Map<string, PersistedInteraction>();
  const feedback = new Map<string, FeedbackRecord>();
  const auditEvents: AuditEventRecord[] = [];

  return {
    async saveInteraction(input) {
      const key = interactionKey(input.answer.condominiumId, input.answer.answerId);
      if (interactions.has(key)) {
        throw new Error("A resposta já foi persistida.");
      }
      if (
        input.question.condominiumId !== input.answer.condominiumId ||
        input.retrieval.condominiumId !== input.answer.condominiumId ||
        input.question.id !== input.answer.questionId ||
        input.retrieval.questionId !== input.question.id
      ) {
        throw new Error("A interação não preserva o escopo do condomínio.");
      }

      const frozen = Object.freeze({
        ...input,
        evidence: Object.freeze(input.evidence.map((item) => Object.freeze({ ...item }))),
        claims: Object.freeze(
          input.claims.map((claim) =>
            Object.freeze({
              ...claim,
              citationEvidenceIds: Object.freeze([...claim.citationEvidenceIds])
            })
          )
        ),
        invocations: Object.freeze(
          input.invocations.map((invocation) =>
            Object.freeze({
              ...invocation,
              evidenceIds: Object.freeze([...invocation.evidenceIds])
            })
          )
        ),
        auditEvents: Object.freeze(
          input.auditEvents.map((event) =>
            Object.freeze({ ...event, metadata: Object.freeze({ ...event.metadata }) })
          )
        )
      });
      interactions.set(key, frozen);
      auditEvents.push(...frozen.auditEvents);
    },

    async findAnswer(context, answerId): Promise<AnswerRecord | undefined> {
      return interactions.get(interactionKey(context.condominiumId, answerId))?.answer;
    },

    async findAnswerByIdempotencyKey(context, idempotencyKey): Promise<AnswerRecord | undefined> {
      return [...interactions.values()].find(
        (interaction) =>
          interaction.question.condominiumId === context.condominiumId &&
          interaction.question.idempotencyKey === idempotencyKey
      )?.answer;
    },

    async createFeedback(
      context: AuthorizedCondominiumContext,
      input: SubmitFeedbackInput
    ): Promise<FeedbackRecord | undefined> {
      validateFeedbackInput(input);
      const answer = await this.findAnswer(context, input.answerId);
      if (answer === undefined || answer.condominiumId !== context.condominiumId) {
        return undefined;
      }

      const record: FeedbackRecord = Object.freeze({
        id: idFactory(),
        condominiumId: context.condominiumId,
        answerId: answer.answerId,
        submittedByUserId: context.userId,
        classification: input.classification,
        comment: input.comment,
        createdAt: now()
      });
      feedback.set(record.id, record);
      auditEvents.push(
        Object.freeze({
          id: idFactory(),
          condominiumId: context.condominiumId,
          actorType: "user" as const,
          actorUserId: context.userId,
          eventType: "feedback_created" as const,
          subjectType: "feedback" as const,
          subjectId: record.id,
          requestId: input.requestId ?? "feedback",
          correlationId: answer.answerId,
          metadata: Object.freeze({ classification: record.classification }),
          createdAt: record.createdAt
        })
      );
      return record;
    },

    getInteraction(answerId) {
      return [...interactions.values()].find(
        (interaction) => interaction.answer.answerId === answerId
      );
    },

    listInteractions() {
      return Object.freeze([...interactions.values()]);
    },

    listFeedback() {
      return Object.freeze([...feedback.values()]);
    },

    listAuditEvents() {
      return Object.freeze([...auditEvents]);
    }
  };
}
