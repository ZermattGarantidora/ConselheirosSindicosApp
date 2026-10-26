import type { ChatAttachment, ChatSummary } from "../api/chats/chat-repository.js";

export type ChatRequestScope = Readonly<{
  condominiumId: string;
  headers: Readonly<Record<string, string>>;
}>;
export type SavedChat<Entry> = Readonly<{
  id: string;
  title: string;
  entries: readonly Entry[];
  attachments: readonly ChatAttachment[];
  loaded: boolean;
  persisted: boolean;
}>;

export function createEmptyChat<Entry>(
  createId: () => string = () => crypto.randomUUID()
): SavedChat<Entry> {
  return {
    id: createId(),
    title: "Nova conversa",
    entries: [],
    attachments: [],
    loaded: true,
    persisted: false
  };
}

export function startNewChat<Entry>(
  chats: readonly SavedChat<Entry>[],
  createId: () => string = () => crypto.randomUUID()
): Readonly<{ chats: readonly SavedChat<Entry>[]; activeChatId: string }> {
  const chat = createEmptyChat<Entry>(createId);
  return {
    activeChatId: chat.id,
    chats: [
      chat,
      ...chats.filter(
        (previous) =>
          previous.persisted || previous.entries.length > 0 || previous.attachments.length > 0
      )
    ]
  };
}

export function getChatSetupMessages<Message>(
  messages: readonly Message[],
  setupComplete: boolean,
  setupChatId: string | undefined,
  activeChatId: string | undefined
): readonly Message[] {
  return !setupComplete || (setupChatId !== undefined && setupChatId === activeChatId)
    ? messages
    : [];
}
const path = (scope: ChatRequestScope) =>
  `/v1/condominiums/${encodeURIComponent(scope.condominiumId)}`;

export async function openChatSession<Entry>(
  request: typeof fetch,
  scope: ChatRequestScope,
  createId: () => string = () => crypto.randomUUID()
): Promise<Readonly<{ chats: readonly SavedChat<Entry>[]; activeChatId: string }>> {
  const previous = new Map<string, SavedChat<Entry>>();
  const cursors = new Set<string>();
  const signal = AbortSignal.timeout(60_000);
  let cursor: string | null = null;
  do {
    const response = await request(
      `${path(scope)}/chats${cursor === null ? "" : `?before=${encodeURIComponent(cursor)}`}`,
      { credentials: "same-origin", cache: "no-store", headers: scope.headers, signal }
    );
    if (!response.ok)
      throw new Error("Não foi possível carregar suas conversas anteriores. Tente novamente.");
    const body = (await response.json()) as {
      chats: readonly ChatSummary[];
      nextCursor: string | null;
    };
    for (const chat of body.chats)
      previous.set(chat.id, {
        ...chat,
        entries: [],
        attachments: [],
        loaded: false,
        persisted: true
      });
    cursor = body.nextCursor;
    if (cursor !== null && cursors.has(cursor))
      throw new Error("Não foi possível concluir a leitura das conversas.");
    if (cursor !== null) cursors.add(cursor);
  } while (cursor !== null);
  const chat = createEmptyChat<Entry>(createId);
  return {
    activeChatId: chat.id,
    chats: [chat, ...previous.values()]
  };
}

export async function saveChat(
  request: typeof fetch,
  scope: ChatRequestScope,
  input: Readonly<{ id: string; title: string }>
): Promise<ChatSummary> {
  const response = await request(`${path(scope)}/chats`, {
    method: "POST",
    credentials: "same-origin",
    headers: { ...scope.headers, "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok)
    throw new Error("Não foi possível salvar esta conversa. Sua mensagem foi preservada.");
  return response.json() as Promise<ChatSummary>;
}

export async function loadSavedChat<Entry>(
  request: typeof fetch,
  scope: ChatRequestScope,
  chatId: string
): Promise<Readonly<{ entries: readonly Entry[]; attachments: readonly ChatAttachment[] }>> {
  const entries: Entry[] = [];
  const attachments = new Map<string, ChatAttachment>();
  const cursors = new Set<string>();
  const signal = AbortSignal.timeout(60_000);
  let cursor: string | null = null;
  do {
    const response = await request(
      `${path(scope)}/history?limit=100&chatId=${encodeURIComponent(chatId)}${cursor === null ? "" : `&before=${encodeURIComponent(cursor)}`}`,
      { credentials: "same-origin", cache: "no-store", headers: scope.headers, signal }
    );
    if (!response.ok)
      throw new Error("Não foi possível abrir esta conversa. Seu histórico foi preservado.");
    const body = (await response.json()) as {
      entries: readonly Entry[];
      attachments: readonly ChatAttachment[];
      nextCursor: string | null;
    };
    entries.unshift(...body.entries);
    for (const attachment of body.attachments)
      attachments.set(attachment.documentVersionId, attachment);
    cursor = body.nextCursor;
    if (cursor !== null && cursors.has(cursor))
      throw new Error("Não foi possível concluir a leitura do histórico.");
    if (cursor !== null) cursors.add(cursor);
  } while (cursor !== null);
  return { entries, attachments: [...attachments.values()] };
}

export async function changeSavedChat(
  request: typeof fetch,
  scope: ChatRequestScope,
  chatId: string,
  title?: string
): Promise<void> {
  const response = await request(`${path(scope)}/chats/${encodeURIComponent(chatId)}`, {
    method: title === undefined ? "DELETE" : "PATCH",
    credentials: "same-origin",
    headers: {
      ...scope.headers,
      ...(title === undefined ? {} : { "content-type": "application/json" })
    },
    ...(title === undefined ? {} : { body: JSON.stringify({ title }) }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error("Não foi possível atualizar esta conversa. Tente novamente.");
}
