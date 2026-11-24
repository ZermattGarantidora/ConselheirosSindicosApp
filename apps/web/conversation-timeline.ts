import type { ConversationMessage } from "../api/answers/conversation-store.js";
import type { DocumentToView } from "./DocumentViewer.js";

export type TimelineEntry = Readonly<{
  id: string;
  sequence: number;
  createdAt: string;
  messages: readonly ConversationMessage[];
  metadata: Readonly<{
    setup?: Readonly<Record<string, unknown>>;
    createdContext?: Readonly<Record<string, unknown>>;
    documentVersionId?: string;
  }>;
}>;
export type TimelinePage = Readonly<{
  entries: readonly TimelineEntry[];
  nextCursor: string | null;
  setupSessionId?: string | null;
  durable: boolean;
}>;

/** Somente uploads confirmados no histórico do escopo atual substituem as bolhas temporárias. */
export function recordedDocumentUploads(
  entries: readonly TimelineEntry[],
  condominiumId: string | undefined
): ReadonlyMap<string, DocumentToView> {
  const documents = new Map<string, DocumentToView>();
  if (condominiumId === undefined) return documents;
  for (const entry of entries) {
    const documentVersionId = entry.metadata.documentVersionId;
    if (documentVersionId === undefined) continue;
    for (const message of entry.messages) {
      if (message.role === "user" && message.kind === "upload")
        documents.set(message.id, { condominiumId, documentVersionId, title: message.text });
    }
  }
  return documents;
}

export async function loadTimeline(
  request: typeof fetch,
  headers: Readonly<Record<string, string>>,
  scope?: Readonly<{ condominiumId: string; chatId: string }>,
  before?: string,
  signal?: AbortSignal
): Promise<TimelinePage> {
  const path = scope
    ? `/v1/condominiums/${encodeURIComponent(scope.condominiumId)}/chats/${encodeURIComponent(scope.chatId)}/messages`
    : "/v1/chat/setup-history";
  const response = await request(
    `${path}?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`,
    {
      headers,
      credentials: "same-origin",
      cache: "no-store",
      ...(signal ? { signal } : {})
    }
  );
  if (!response.ok)
    throw new Error(
      "Não foi possível recuperar o histórico. As mensagens já carregadas foram preservadas."
    );
  return response.json() as Promise<TimelinePage>;
}

/** Reconstrói somente valores confirmados nas respostas originais do servidor. */
export function recoverSetup(entries: readonly TimelineEntry[]) {
  let managerName = "",
    condominiumName = "",
    count = 0,
    index = 1;
  let stage: "manager_name" | "condominium_count" | "condominium_name" | "unit_count" | "complete" =
    "manager_name";
  let unitCount: number | undefined;
  let createdContext: Readonly<Record<string, unknown>> | undefined;
  for (const entry of entries) {
    const setup = entry.metadata.setup;
    if (setup) {
      if (
        ["manager_name", "condominium_count", "condominium_name", "unit_count"].includes(
          String(setup.stage)
        )
      )
        stage = setup.stage as typeof stage;
      if (setup.stage === "create_another") {
        stage = "condominium_name";
        count = 1;
        index = 1;
        condominiumName = "";
      }
      if (typeof setup.managerName === "string") managerName = setup.managerName;
      if (typeof setup.condominiumName === "string") condominiumName = setup.condominiumName;
      if (typeof setup.condominiumCount === "number") count = setup.condominiumCount;
      if (typeof setup.condominiumIndex === "number") index = setup.condominiumIndex;
      const update = setup.update as { field?: string; value?: unknown } | undefined;
      if (update?.field === "manager_name" && typeof update.value === "string") {
        managerName = update.value;
        if (stage === "manager_name")
          stage = setup.hasExistingContext === true ? "complete" : "condominium_count";
      }
      if (update?.field === "condominium_count" && typeof update.value === "number") {
        count = update.value;
        if (stage === "condominium_count") stage = "condominium_name";
      }
      if (update?.field === "condominium_name" && typeof update.value === "string") {
        condominiumName = update.value;
        if (stage === "condominium_name") stage = "unit_count";
      }
      if (update?.field === "unit_count" && typeof update.value === "number")
        unitCount = update.value;
    }
    if (entry.metadata.createdContext) {
      createdContext = entry.metadata.createdContext;
      stage = index < count ? "condominium_name" : "complete";
      if (index < count) {
        index++;
        condominiumName = "";
        unitCount = undefined;
      }
    }
  }
  return { managerName, condominiumName, count, index, stage, unitCount, createdContext };
}

export function mergeTimeline(
  previous: readonly TimelineEntry[],
  incoming: readonly TimelineEntry[]
) {
  return [...new Map([...previous, ...incoming].map((entry) => [entry.id, entry])).values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.sequence - b.sequence
  );
}

export function refreshTimeline(
  previous: Pick<TimelinePage, "entries" | "nextCursor"> | undefined,
  incoming: TimelinePage
) {
  const overlap = previous?.entries.some((old) =>
    incoming.entries.some((entry) => entry.id === old.id)
  );
  return {
    entries: mergeTimeline(previous?.entries ?? [], incoming.entries),
    // Sem sobreposição, pode haver mais de uma página de mensagens de outra aba ainda não lidas.
    nextCursor: overlap ? previous!.nextCursor : incoming.nextCursor
  };
}
