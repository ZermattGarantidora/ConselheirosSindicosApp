import { createHash, randomUUID } from "node:crypto";
import type { AnswerPayload } from "./answer-contract.js";
import type { UserId } from "../identity/authorized-condominium-context.js";

export type ConversationScope = Readonly<
  { userId: UserId } & (
    | { kind: "setup"; setupSessionId: string }
    | { kind: "chat"; condominiumId: string; chatId: string }
  )
>;
export type ConversationMessage = Readonly<{
  id: string;
  role: "user" | "assistant";
  kind: "setup" | "question_answer" | "document_status" | "document_summary" | "upload";
  text: string;
  answer?: AnswerPayload;
}>;
export type ConversationEntry = Readonly<{
  id: string;
  scope: ConversationScope;
  sequence: number;
  createdAt: string;
  requestKey: string;
  inputHash: string;
  messages: readonly ConversationMessage[];
  response: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
}>;
export type ConversationWrite = Omit<ConversationEntry, "scope" | "sequence">;
export type ConversationPage = Readonly<{
  entries: readonly ConversationEntry[];
  nextCursor: string | null;
}>;
export interface ConversationStore {
  readonly durable: boolean;
  beginSetup(userId: UserId): Promise<string>;
  pendingSetup(userId: UserId): Promise<string | undefined>;
  bindSetup(
    userId: UserId,
    sessionId: string,
    target: Extract<ConversationScope, { kind: "chat" }>
  ): Promise<void>;
  find(scope: ConversationScope, requestKey: string): Promise<ConversationEntry | undefined>;
  append(scope: ConversationScope, entry: ConversationWrite): Promise<ConversationEntry>;
  list(scope: ConversationScope, limit?: number, cursor?: string): Promise<ConversationPage>;
}
export class ConversationStoreError extends Error {
  public constructor(
    public readonly statusCode: 400 | 401 | 403 | 404 | 409 | 503,
    message = "Não foi possível salvar ou recuperar a conversa."
  ) {
    super(message);
    this.name = "ConversationStoreError";
  }
}
export const conversationHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function scopeKey(scope: ConversationScope): string {
  return scope.kind === "setup"
    ? `setup:${scope.setupSessionId}`
    : `chat:${scope.condominiumId}:${scope.chatId}`;
}
export function cursorFor(scope: ConversationScope, entry: ConversationEntry): string {
  return Buffer.from(
    JSON.stringify({
      scope: conversationHash([scope.userId, scopeKey(scope)]),
      time: entry.createdAt,
      sequence: entry.sequence
    })
  ).toString("base64url");
}
export function parseConversationCursor(
  scope: ConversationScope,
  cursor?: string
): { time: string; sequence: number } | undefined {
  if (cursor === undefined) return undefined;
  try {
    if (cursor.length > 500) throw new Error();
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      value.scope !== conversationHash([scope.userId, scopeKey(scope)]) ||
      !Number.isSafeInteger(value.sequence) ||
      value.sequence < 1 ||
      typeof value.time !== "string" ||
      new Date(value.time).toISOString() !== value.time
    )
      throw new Error();
    return { time: value.time, sequence: value.sequence };
  } catch {
    throw new ConversationStoreError(400, "Cursor de conversa inválido.");
  }
}
export function validateConversationWrite(entry: ConversationWrite): void {
  if (
    !/^[0-9a-f-]{36}$/iu.test(entry.id) ||
    entry.requestKey.length < 1 ||
    entry.requestKey.length > 200 ||
    !/^[0-9a-f]{64}$/u.test(entry.inputHash) ||
    new Date(entry.createdAt).toISOString() !== entry.createdAt ||
    (!entry.messages.length && entry.metadata.kind !== "setup_creation") ||
    entry.messages.length > 2 ||
    Buffer.byteLength(JSON.stringify(entry)) > 200_000 ||
    entry.messages.some(
      (message) =>
        !["user", "assistant"].includes(message.role) ||
        !["setup", "question_answer", "document_status", "document_summary", "upload"].includes(
          message.kind
        ) ||
        !message.text.trim() ||
        message.text.length > 20_000
    )
  )
    throw new ConversationStoreError(400, "Registro de conversa inválido.");
}
export function createInMemoryConversationStore(): ConversationStore {
  const sessions = new Map<
    string,
    { userId: UserId; target?: Extract<ConversationScope, { kind: "chat" }> }
  >();
  const entries: ConversationEntry[] = [];
  let sequence = 0;
  const same = (left: ConversationScope, right: ConversationScope) =>
    left.userId === right.userId && scopeKey(left) === scopeKey(right);
  const check = (scope: ConversationScope) => {
    if (scope.kind === "setup") {
      const session = sessions.get(scope.setupSessionId);
      if (!session || session.userId !== scope.userId || session.target)
        throw new ConversationStoreError(404);
    }
  };
  return {
    durable: false,
    async beginSetup(userId) {
      const active = [...sessions].find(
        ([, session]) => session.userId === userId && !session.target
      );
      if (active) return active[0];
      const id = randomUUID();
      sessions.set(id, { userId });
      return id;
    },
    async pendingSetup(userId) {
      return [...sessions].find(([, session]) => session.userId === userId && !session.target)?.[0];
    },
    async bindSetup(userId, sessionId, target) {
      const session = sessions.get(sessionId);
      if (target.userId !== userId || !session || session.userId !== userId)
        throw new ConversationStoreError(404);
      if (session.target) {
        if (!same(session.target, target)) throw new ConversationStoreError(409);
        return;
      }
      session.target = target;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;
        if (
          entry.scope.kind === "setup" &&
          entry.scope.setupSessionId === sessionId &&
          entry.scope.userId === userId
        )
          entries[i] = { ...entry, scope: target };
      }
    },
    async find(scope, key) {
      check(scope);
      const entry = entries.find((entry) => same(entry.scope, scope) && entry.requestKey === key);
      return entry === undefined ? undefined : structuredClone(entry);
    },
    async append(scope, value) {
      check(scope);
      validateConversationWrite(value);
      const existing = entries.find(
        (entry) => same(entry.scope, scope) && entry.requestKey === value.requestKey
      );
      if (existing) {
        if (existing.inputHash !== value.inputHash)
          throw new ConversationStoreError(409, "A chave já foi usada para outra mensagem.");
        return structuredClone(existing);
      }
      const entry = structuredClone({ ...value, scope, sequence: ++sequence });
      entries.push(entry);
      return structuredClone(entry);
    },
    async list(scope, limit = 50, cursor) {
      check(scope);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new ConversationStoreError(400);
      const before = parseConversationCursor(scope, cursor);
      const size = Math.max(1, Math.min(100, Math.floor(limit)));
      const rows = entries
        .filter(
          (entry) =>
            same(entry.scope, scope) &&
            (!before ||
              entry.createdAt < before.time ||
              (entry.createdAt === before.time && entry.sequence < before.sequence))
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.sequence - a.sequence);
      const page = rows.slice(0, size);
      return {
        entries: structuredClone(page.toReversed()),
        nextCursor: rows.length > size ? cursorFor(scope, page.at(-1)!) : null
      };
    }
  };
}
