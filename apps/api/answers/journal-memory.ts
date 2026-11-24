import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { answerPipelineVersion, answerSchemaVersion } from "./answer-contract.js";
import type { ConversationHistoryEntry } from "./answer-persistence.js";
import type { ConversationEntry } from "./conversation-store.js";
import { ConversationMemoryError } from "./conversation-memory.js";

/** Registros auxiliares vêm do journal interno; o corpo HTTP nunca fornece estes valores. */
export function journalMemoryEntries(
  context: AuthorizedCondominiumContext,
  chatId: string,
  entries: readonly ConversationEntry[]
): readonly ConversationHistoryEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.messages.length &&
        !entry.messages.some((message) => message.kind === "question_answer")
    )
    .map((entry) => {
      if (
        entry.scope.kind !== "chat" ||
        entry.scope.userId !== context.userId ||
        entry.scope.condominiumId !== context.condominiumId ||
        entry.scope.chatId !== chatId
      )
        throw new ConversationMemoryError();
      const user = entry.messages.find((message) => message.role === "user");
      const assistant = entry.messages.find((message) => message.role === "assistant");
      const general = assistant?.kind === "setup" && entry.metadata.source === "server";
      return {
        chatId,
        questionId: user?.id ?? entry.id,
        question: user?.text ?? "",
        createdAt: new Date(entry.createdAt),
        memoryReplaySafe: general,
        answer: {
          answerId: assistant?.id ?? entry.id,
          questionId: user?.id ?? entry.id,
          condominiumId: context.condominiumId,
          userId: context.userId,
          answer: assistant?.text ?? "",
          answerMode: assistant?.answer?.answerMode ?? "abstained",
          citations: assistant?.answer?.citations ?? [],
          claims: [],
          attentionPoints: [],
          suggestedNextStep: null,
          specialist: { required: false, type: null, reason: null },
          riskClass: "low",
          schemaVersion: answerSchemaVersion,
          promptVersion: "server-journal-v1",
          pipelineVersion: answerPipelineVersion,
          validationStatus: "passed",
          requestId: null,
          createdAt: new Date(entry.createdAt)
        }
      };
    });
}
