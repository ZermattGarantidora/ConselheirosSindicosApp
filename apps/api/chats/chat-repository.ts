import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";

export const legacyChatId = "00000000-0000-4000-8000-000000000000";
export const chatIdPattern =
  /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu;
export type HistoryCursor = Readonly<{ createdAt: string; id: string }>;
export type ChatSummary = Readonly<{ id: string; title: string; createdAt: string }>;
export type ChatAttachment = Readonly<{
  documentVersionId: string;
  title: string;
  createdAt: string;
}>;
export type HistoryFilter = Readonly<{ chatId?: string; before?: HistoryCursor }>;

export function parseHistoryCursor(value: string | undefined): HistoryCursor | undefined {
  if (value === undefined) return undefined;
  const [createdAt, id, extra] = value.split("|");
  if (
    createdAt === undefined ||
    id === undefined ||
    extra !== undefined ||
    !chatIdPattern.test(id) ||
    !Number.isFinite(Date.parse(createdAt))
  )
    throw new Error("O cursor do histórico é inválido.");
  return { createdAt: new Date(createdAt).toISOString(), id };
}

export interface ChatRepository {
  list(
    context: AuthorizedCondominiumContext,
    before?: HistoryCursor
  ): Promise<readonly ChatSummary[]>;
  find(context: AuthorizedCondominiumContext, chatId: string): Promise<ChatSummary | undefined>;
  create(
    context: AuthorizedCondominiumContext,
    input: Readonly<{ id: string; title: string }>
  ): Promise<ChatSummary | undefined>;
  rename(context: AuthorizedCondominiumContext, chatId: string, title: string): Promise<boolean>;
  hide(context: AuthorizedCondominiumContext, chatId: string): Promise<boolean>;
  attachDocument(
    context: AuthorizedCondominiumContext,
    chatId: string,
    attachment: ChatAttachment
  ): Promise<void>;
  listAttachments(
    context: AuthorizedCondominiumContext,
    chatId: string
  ): Promise<readonly ChatAttachment[]>;
}

export function createInMemoryChatRepository(now: () => Date = () => new Date()): ChatRepository {
  const chats = new Map<string, ChatSummary & { hidden: boolean }>();
  const attachments = new Map<string, ChatAttachment[]>();
  const scopeKey = (context: AuthorizedCondominiumContext) =>
    JSON.stringify([context.condominiumId, context.userId]);
  const key = (context: AuthorizedCondominiumContext, id: string) => `${scopeKey(context)}:${id}`;
  const allowed = (context: AuthorizedCondominiumContext) =>
    context.permissions.includes("document:read");
  return {
    async list(context, before) {
      if (!allowed(context)) return [];
      const prefix = `${scopeKey(context)}:`;
      return [...chats.entries()]
        .filter(([id, chat]) => id.startsWith(prefix) && !chat.hidden)
        .map(([, chat]) => chat)
        .filter(
          (chat) =>
            before === undefined ||
            chat.createdAt < before.createdAt ||
            (chat.createdAt === before.createdAt && chat.id < before.id)
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        .slice(0, 100)
        .map(({ id, title, createdAt }) => ({ id, title, createdAt }));
    },
    async find(context, chatId) {
      const chat = allowed(context) ? chats.get(key(context, chatId)) : undefined;
      return chat === undefined || chat.hidden
        ? undefined
        : { id: chat.id, title: chat.title, createdAt: chat.createdAt };
    },
    async create(context, input) {
      if (!allowed(context)) return undefined;
      const id = key(context, input.id);
      if (!chats.has(id))
        chats.set(id, { ...input, createdAt: now().toISOString(), hidden: false });
      const chat = chats.get(id)!;
      return chat.hidden
        ? undefined
        : { id: chat.id, title: chat.title, createdAt: chat.createdAt };
    },
    async rename(context, chatId, title) {
      const id = key(context, chatId);
      const chat = allowed(context) ? chats.get(id) : undefined;
      if (chat === undefined || chat.hidden) return false;
      chats.set(id, { ...chat, title });
      return true;
    },
    async hide(context, chatId) {
      const id = key(context, chatId);
      const chat = allowed(context) ? chats.get(id) : undefined;
      if (chat === undefined || chat.hidden) return false;
      chats.set(id, { ...chat, hidden: true });
      return true;
    },
    async attachDocument(context, chatId, attachment) {
      if ((await this.find(context, chatId)) === undefined)
        throw new Error("Conversa indisponível.");
      const id = key(context, chatId);
      attachments.set(id, [
        ...(attachments.get(id) ?? []).filter(
          (item) => item.documentVersionId !== attachment.documentVersionId
        ),
        attachment
      ]);
    },
    async listAttachments(context, chatId) {
      return (await this.find(context, chatId)) === undefined
        ? []
        : [...(attachments.get(key(context, chatId)) ?? [])];
    }
  };
}
