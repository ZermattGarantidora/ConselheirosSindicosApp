import { randomUUID } from "node:crypto";
import {
  conversationHash,
  type ConversationStore,
  type ConversationScope
} from "../answers/conversation-store.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { DocumentDraft } from "../../shared/document-draft.js";
import type { DocumentImprovement } from "../../shared/document-improvement.js";
import type { AuthoringOperations } from "./authoring-operations.js";
import {
  DocumentDraftError,
  validateDraftContent,
  type createDocumentDraftService
} from "./document-drafts.js";

type Scope = Extract<ConversationScope, { kind: "chat" }>;
export interface DocumentImprovementAgent {
  /** Injetado somente por composição explícita. Não existe transporte ou prompt padrão. */
  suggest(draft: DocumentDraft): Promise<{ message: string; text: string; changes: string } | null>;
}
const tokens = (text: string) =>
  text
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR")
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
export function createDocumentImprovementService(options: {
  store: ConversationStore;
  operations?: AuthoringOperations;
  drafts: ReturnType<typeof createDocumentDraftService>;
  agent?: DocumentImprovementAgent;
  now: () => Date;
  authorize: (
    context: AuthorizedCondominiumContext,
    scope: Scope
  ) => Promise<AuthorizedCondominiumContext>;
}) {
  const prefix = (id: string, event: number) => `document-improvement:${id}:${event}`;
  async function append(
    scope: Scope,
    key: string,
    command: unknown,
    response: Record<string, unknown>,
    text: string,
    role: "assistant" | "user" = "user",
    id = randomUUID()
  ) {
    return options.store.append(scope, {
      id,
      createdAt: options.now().toISOString(),
      requestKey: key,
      inputHash: conversationHash(command),
      response,
      messages: [{ id: randomUUID(), role, kind: "question_answer", text }],
      metadata: { documentImprovement: true, documentDraftId: key.split(":")[1] }
    });
  }
  async function current(
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string,
    event: number
  ) {
    const actor = await options.authorize(context, scope);
    const draft = await options.drafts.read(actor, scope, id);
    if (draft.event !== event || draft.status !== "awaiting_confirmation")
      throw new DocumentDraftError(
        409,
        "A revisão mudou ou já foi decidida. A oferta anterior não pode ser aplicada."
      );
    return { actor, draft };
  }
  return {
    async offer(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      event: number
    ): Promise<DocumentImprovement | null> {
      const { draft } = await current(context, scope, id, event);
      const key = prefix(id, event),
        command = ["editorial-v1", draft.hash];
      const existing = await options.store.find(scope, `${key}:result`);
      if (existing) {
        const decision = await options.store.find(scope, `${key}:decision`);
        await options.operations?.check(context, scope, id);
        const offer = existing.response.offer as DocumentImprovement | null;
        return offer
          ? {
              ...offer,
              status:
                (decision?.response.status as DocumentImprovement["status"] | undefined) ??
                "offered"
            }
          : null;
      }
      if (!options.agent) return null;
      const execute = async (): Promise<DocumentImprovement | null> => {
        const marker = randomUUID();
        const owner = await append(
          scope,
          `${key}:dispatch`,
          command,
          { status: "started" },
          "Solicitei uma avaliação de melhoria editorial do rascunho salvo.",
          "user",
          marker
        );
        if (owner.id !== marker)
          throw new DocumentDraftError(
            503,
            "Avaliação editorial já iniciada. Aguarde o resultado; nenhuma nova chamada foi feita."
          );
        const result = await options.agent!.suggest(draft);
        await current(context, scope, id, event);
        let offer: DocumentImprovement | null = null;
        if (result) {
          const proposed = {
            ...draft,
            operation: "improve" as const,
            text: result.text,
            changes: result.changes
          };
          validateDraftContent(proposed);
          if (
            typeof result.message !== "string" ||
            !result.message.trim() ||
            result.message.length > 2000 ||
            /\p{Cc}/u.test(result.message.replace(/[\t\r\n]/gu, "")) ||
            !result.changes.trim() ||
            result.text === draft.text ||
            conversationHash(tokens(result.text)) !== conversationHash(tokens(draft.text)) ||
            conversationHash(result.text.match(/[+-]?\d[\d.,:/-]*/gu)) !==
              conversationHash(draft.text.match(/[+-]?\d[\d.,:/-]*/gu))
          )
            throw new DocumentDraftError(
              422,
              "A melhoria deve preservar todas as palavras, números e sua ordem. Revise os fatos manualmente."
            );
          offer = {
            draftId: id,
            baseEvent: event,
            baseHash: draft.hash,
            message: result.message,
            text: result.text,
            changes: result.changes,
            status: "offered"
          };
        }
        await append(
          scope,
          `${key}:result`,
          command,
          { offer },
          offer?.message ?? "A avaliação editorial não apresentou proposta de alteração.",
          offer ? "assistant" : "user"
        );
        return offer;
      };
      return options.operations
        ? options.operations.run(
            context,
            scope,
            id,
            "document_improvement",
            String(event),
            conversationHash(command),
            execute
          )
        : execute();
    },
    async decide(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      event: number,
      hash: string,
      accept: boolean
    ) {
      const actor = await options.authorize(context, scope),
        key = prefix(id, event);
      const result = await options.store.find(scope, `${key}:result`);
      const offer = result?.response.offer as DocumentImprovement | undefined;
      if (!offer || offer.baseHash !== hash)
        throw new DocumentDraftError(409, "Oferta indisponível para esta revisão.");
      const decision = await options.store.find(scope, `${key}:decision`);
      if (decision?.response.status === (accept ? "declined" : "accepted"))
        throw new DocumentDraftError(409, "A oferta já recebeu outra decisão.");
      if (decision?.response.status === "accepted") {
        const latest = await options.drafts.read(actor, scope, id);
        if (latest.event > event) {
          const applied = (await options.store.find(scope, `document-draft:${id}:${event + 1}`))
            ?.response.draft as DocumentDraft | undefined;
          if (
            applied?.operation !== "improve" ||
            applied.text !== offer.text ||
            applied.changes !== offer.changes
          )
            throw new DocumentDraftError(
              409,
              "Outra edição venceu a aplicação da melhoria. Confira o texto atual."
            );
          return latest;
        }
      }
      const base = await current(context, scope, id, event);
      if (base.draft.hash !== hash)
        throw new DocumentDraftError(409, "A origem mudou. Reavalie a revisão atual.");
      await append(
        scope,
        `${key}:decision`,
        [hash, accept],
        { status: accept ? "accepted" : "declined" },
        accept
          ? "Aceitei a melhoria editorial para revisar o novo texto, sem confirmar PDF."
          : "Recusei a melhoria editorial; mantenha o rascunho atual."
      );
      if (!accept) {
        await options.operations?.check(context, scope, id);
        return base.draft;
      }
      return options.drafts.propose(
        base.actor,
        scope,
        id,
        { ...base.draft, operation: "improve", text: offer.text, changes: offer.changes },
        event
      );
    }
  };
}
