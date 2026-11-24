import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  isSimpleConversationMessage,
  isDocumentUploadNotice
} from "../shared/conversation-intent.js";
import { questionRequestTimeoutMs } from "../shared/generation-limits.js";
import { readDocumentUseDecision } from "../shared/document-use-decision.js";
import {
  type Appearance,
  getBrowserStorage,
  getInitialAppearance,
  saveAppearance
} from "./appearance.js";
import { signOut } from "./profile-session.js";
import { requestAccessSession } from "./access-session.js";
import { AccessCodeConnection } from "./AccessCodeConnection.js";
import {
  loadTimeline,
  mergeTimeline,
  recordedDocumentUploads,
  recoverSetup,
  refreshTimeline,
  type TimelineEntry
} from "./conversation-timeline.js";
import { isAutomaticDocumentaryLimitation } from "./answer-presentation.js";
import { groupCitations } from "./document-analysis-presentation.js";
import { buildConversationTitle } from "./conversation-title.js";
import { focusComposer } from "./composer-focus.js";
import {
  changeSavedChat,
  createEmptyChat,
  getChatSetupMessages,
  loadSavedChat,
  openChatSession,
  saveChat,
  startNewChat,
  type SavedChat
} from "./chat-session.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "./document-upload-request.js";
import { sendDocumentMessage, waitForDocumentProcessing } from "./document-processing-request.js";
import { readQuestionResponse } from "./question-response.js";
import { DocumentDraftComposer } from "./DocumentDraftComposer.js";
import { DocumentAuthoringComposer } from "./DocumentAuthoringComposer.js";
import { AudioMinutesComposer } from "./AudioMinutesComposer.js";
import type { DocumentDraft } from "../shared/document-draft.js";
import {
  chatFileMediaType,
  selectDocumentFiles,
  sendDocumentBatch
} from "./document-upload-batch.js";
import {
  createDocumentBatchResponse,
  documentResponseScope,
  queueDocumentConfirmation,
  type DocumentBatchResponse
} from "./document-batch-response.js";
import {
  DocumentBatchProgress,
  RecordedDocumentUpload,
  PendingDocumentAttachments,
  type DocumentUploadProgress
} from "./ChatDocumentAttachments.js";
import { DocumentViewer, type DocumentToView } from "./DocumentViewer.js";
import { DocumentAvailability, DocumentLibrary, LibraryDocumentList } from "./DocumentLibrary.js";
import {
  loadCondominiumDocuments,
  scopedLibraryDocuments,
  type LibraryDocument,
  type LibrarySection
} from "./document-library.js";
import {
  isAnswerPayload,
  isDocumentSnapshot,
  confirmDocumentCondominium,
  requestDocumentConversationReply,
  requestDocumentBatchSummary,
  DocumentCondominiumConfirmation,
  DocumentCondominiumConfirmationRequiredError
} from "./document-condominium-confirmation.js";
import type { DocumentCondominiumCheck } from "../api/documents/document-condominium-check.js";
import {
  loadDevelopmentSetupProfile,
  rememberDevelopmentCondominium,
  rememberDevelopmentManagerName,
  type DevelopmentIdentity
} from "./development-identity.js";
import { splitMessageText } from "./message-format.js";
import type { DocumentAnalysisReport } from "../api/analysis/document-analysis.js";
import type { AnswerPayload } from "../api/answers/answer-contract.js";

type AuthMode = "development" | "real";
type AiProvider = "openai" | "gemini" | "codex" | "local" | "unavailable";

type ContextResponse = Readonly<{
  condominiumId: string;
  role: string;
  permissions: readonly string[];
  preferredName?: string;
}>;

type Citation = Readonly<{
  id: string;
  evidenceId: string;
  documentId: string;
  documentVersionId: string;
  title: string;
  page: number;
  excerpt: string;
  sourceScope?: "condominium" | "legislation";
  sourceRemoved?: boolean;
  startOffset: number;
  endOffset: number;
}>;

type PublicAnswer = Readonly<{
  answer: string;
  answerMode: "grounded" | "abstained" | "conflict" | "failed";
  citations: readonly Citation[];
  attentionPoints: readonly string[];
  suggestedNextStep: string | null;
  specialist: Readonly<{ required: boolean; type: string | null; reason: string | null }>;
  answerId: string;
  questionId: string;
  condominiumId: string;
  riskClass: "low" | "medium" | "high";
  createdAt: string;
  documentAnalysis?: DocumentAnalysisReport;
}>;

type ConversationHistoryEntry = Readonly<{
  questionId: string;
  question: string;
  answer: PublicAnswer;
  createdAt: string;
}>;

type Chat = SavedChat<ConversationHistoryEntry>;

type CondominiumListItem = Readonly<{
  condominiumId: string;
  name: string;
  detail: string;
  role: string;
  permissions: readonly string[];
}>;

type DocumentListItem = LibraryDocument;

type AccountMenuView = "home" | "profile";
type AttachmentKind = "document" | "photo";
type SetupStage =
  "manager_name" | "condominium_count" | "condominium_name" | "unit_count" | "complete";
type SetupMessage = Readonly<{
  id: string;
  role: "assistant" | "user";
  text: string;
}>;
type SetupTurnUpdate =
  | Readonly<{ field: "manager_name"; value: string }>
  | Readonly<{ field: "condominium_name"; value: string }>
  | Readonly<{ field: "condominium_count"; value: number }>
  | Readonly<{ field: "unit_count"; value: number }>;
type SetupTurnResponse = Readonly<{
  message: string;
  intent: "answer" | "correction" | "question" | "small_talk" | "unclear";
  update: SetupTurnUpdate | null;
}>;

type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";

function requestHeaders(
  authMode: AuthMode | undefined,
  identity: DevelopmentIdentity | undefined,
  preferredName?: string
): Readonly<Record<string, string>> {
  return authMode === "development" && identity !== undefined
    ? {
        "x-development-user-id": identity.userId,
        ...(preferredName === undefined || preferredName.trim() === ""
          ? {}
          : { "x-development-user-name": encodeURIComponent(preferredName.trim()) })
      }
    : {};
}

function inferDocumentType(fileName: string): string {
  const normalized = fileName
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
  if (normalized.includes("convencao")) return "convention";
  if (normalized.includes("regimento")) return "internal_rules";
  if (normalized.includes("ata")) return "meeting_minutes";
  if (normalized.includes("contrato")) return "contract";
  return "other";
}

function isRelevantServiceDegradation(point: string): boolean {
  return /(?:extraída localmente dos documentos porque o provedor de IA está temporariamente indisponível|modo documental local)/iu.test(
    point
  );
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as Readonly<{ message?: unknown }>;
    return typeof body.message === "string" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

function FormattedText({ text }: Readonly<{ text: string }>) {
  return splitMessageText(text).map((segment, index) =>
    segment.href ? (
      <a
        key={`${segment.text}-${index}`}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
      >
        {segment.text}
      </a>
    ) : segment.bold ? (
      <strong key={`${segment.text}-${index}`}>{segment.text}</strong>
    ) : (
      segment.text
    )
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m5 12 14-7-4.5 14-3-5.5L5 12Z" />
      <path d="m11.5 13.5 3.5-3.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
      <path d="M9 5v14" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 12h5m-5 4h5" />
    </svg>
  );
}

export function AnswerSources({
  citations,
  onSelect
}: Readonly<{
  citations: readonly Citation[];
  onSelect: (citation: Citation) => void;
}>) {
  if (citations.length === 0) return null;
  const groups = groupCitations(citations);

  return (
    <details className="source-list" aria-label="Fontes da resposta">
      <summary className="source-list-toggle" aria-label="Ver fontes da resposta">
        <span className="source-icon">
          <DocumentIcon />
        </span>
      </summary>
      {groups.map((group) => {
        const citation = group[0]!;
        const statusLabel = (citation: Citation) =>
          citation.sourceRemoved
            ? "Trecho histórico · fonte atual indisponível"
            : citation.sourceScope === "legislation"
              ? "Legislação oficial"
              : "Documento do condomínio";
        const sourceButton = (citation: Citation, label?: string, includePage = true) => (
          <button
            type="button"
            key={JSON.stringify([
              citation.id,
              citation.startOffset,
              citation.endOffset,
              citation.excerpt
            ])}
            onClick={() => onSelect(citation)}
          >
            <span className="source-icon">
              <DocumentIcon />
            </span>
            <span>
              <strong>{label ?? citation.title}</strong>
              <small>
                {statusLabel(citation)}
                {includePage ? ` · página ${citation.page}` : ""}
              </small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        );
        if (group.length === 1) return sourceButton(citation);
        const pageCount = new Set(group.map((item) => item.page)).size;
        const pageLabel = pageCount === 1 ? `página ${citation.page}` : `${pageCount} páginas`;
        return (
          <details className="source-document-group" key={citation.id}>
            <summary className="source-document-toggle">
              <span className="source-icon">
                <DocumentIcon />
              </span>
              <span>
                <strong>{citation.title}</strong>
                <small>
                  {statusLabel(citation)} · {pageLabel} · {group.length} trechos
                </small>
              </span>
              <b aria-hidden="true">›</b>
            </summary>
            {group.map((item, index) =>
              sourceButton(
                item,
                pageCount === 1
                  ? `Trecho ${index + 1}: ${item.excerpt}`
                  : `Página ${item.page}: ${item.excerpt}`,
                false
              )
            )}
          </details>
        );
      })}
    </details>
  );
}

export function AnswerMessage({
  answer,
  question,
  onSelectCitation,
  onPrepareDocument,
  compact = false
}: Readonly<{
  answer: Pick<PublicAnswer, keyof AnswerPayload> & Partial<PublicAnswer>;
  question: string;
  onSelectCitation: (citation: Citation) => void;
  onPrepareDocument?: (answer: Pick<AnswerPayload, "answer" | "citations">) => void;
  compact?: boolean;
}>) {
  const isConversationalResponse = isSimpleConversationMessage(question);
  const attentionPoints = answer.attentionPoints.filter(
    (point) => !isRelevantServiceDegradation(point) && !isAutomaticDocumentaryLimitation(point)
  );
  const showGuidance =
    !compact &&
    !isConversationalResponse &&
    (attentionPoints.length > 0 || answer.suggestedNextStep !== null || answer.specialist.required);
  const specialist =
    answer.specialist.type === "seguradora"
      ? "a seguradora"
      : `um ${answer.specialist.type ?? "especialista"}`;

  return (
    <>
      <article className="assistant-message answer-message">
        <p className="answer-copy">
          <FormattedText text={answer.answer} />
        </p>
        {showGuidance ? (
          <div className="answer-guidance">
            {attentionPoints.map((point) => (
              <p key={point}>
                <FormattedText text={point} />
              </p>
            ))}
            {answer.suggestedNextStep === null ? null : (
              <p>
                <FormattedText text={answer.suggestedNextStep} />
              </p>
            )}
            {!answer.specialist.required ? null : (
              <p>
                Vale conferir isso com {specialist}.
                {answer.specialist.reason === null ? null : (
                  <>
                    {" "}
                    <FormattedText text={answer.specialist.reason} />
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}
      </article>
      {isConversationalResponse ? null : (
        <AnswerSources citations={answer.citations} onSelect={onSelectCitation} />
      )}
      {!onPrepareDocument || answer.answerMode === "failed" || isConversationalResponse ? null : (
        <button
          type="button"
          className="prepare-document"
          onClick={() => onPrepareDocument(answer)}
        >
          Revisar texto para PDF
        </button>
      )}
    </>
  );
}

export function App() {
  const [appearance, setAppearance] = useState(getInitialAppearance);
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>();
  const [aiProvider, setAiProvider] = useState<AiProvider>("unavailable");
  const [entered, setEntered] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeEnabled, setAccessCodeEnabled] = useState(false);
  const [restorePending, setRestorePending] = useState(true);
  const [restoreRevision, setRestoreRevision] = useState(0);
  const [developmentIdentity, setDevelopmentIdentity] = useState<DevelopmentIdentity>();
  const [context, setContext] = useState<ContextResponse>();
  const [chats, setChats] = useState<readonly Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>();
  const [timeline, setTimeline] =
    useState<
      Readonly<{ scope: string; entries: readonly TimelineEntry[]; nextCursor: string | null }>
    >();
  const [timelineRevision, setTimelineRevision] = useState(0);
  const [timelineError, setTimelineError] = useState("");
  const pendingReceipts = useRef(new Map<string, string>());
  const setupSession = useRef<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuView, setAccountMenuView] = useState<AccountMenuView>("home");
  const [sidebarCondominiumId, setSidebarCondominiumId] = useState<string>();
  const [condominiums, setCondominiums] = useState<readonly CondominiumListItem[]>([]);
  const [condominiumsPending, setCondominiumsPending] = useState(false);
  const [condominiumsError, setCondominiumsError] = useState("");
  const [condominiumsRevision, setCondominiumsRevision] = useState(0);
  const [documentLibraryOpen, setDocumentLibraryOpen] = useState(false);
  const [documentLibrarySection, setDocumentLibrarySection] = useState<LibrarySection>("all");
  const [documentsRevision, setDocumentsRevision] = useState(0);
  const [documentCatalog, setDocumentCatalog] = useState<
    Readonly<{
      condominiumId: string;
      documents: readonly DocumentListItem[];
      pending: boolean;
      error: string;
    }>
  >();
  const [setupStage, setSetupStage] = useState<SetupStage>("manager_name");
  const [setupMessages, setSetupMessages] = useState<readonly SetupMessage[]>([]);
  const [setupChatId, setSetupChatId] = useState<string>();
  const [setupCondominiumTotal, setSetupCondominiumTotal] = useState(0);
  const [setupCondominiumIndex, setSetupCondominiumIndex] = useState(1);
  const [setupCondominiumName, setSetupCondominiumName] = useState("");
  const [setupManagerName, setSetupManagerName] = useState("");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState<PublicAnswer>();
  const [documentSelection, setDocumentSelection] =
    useState<Readonly<{ scope: string; answer: Pick<AnswerPayload, "answer" | "citations"> }>>();
  const [selectedCitation, setSelectedCitation] = useState<Citation>();
  const [viewedDocument, setViewedDocument] = useState<DocumentToView>();
  const [documentUploadProgress, setDocumentUploadProgress] = useState<
    readonly DocumentUploadProgress[]
  >([]);
  const [pendingCondominiumConfirmations, setPendingCondominiumConfirmations] = useState<
    readonly Readonly<{
      document: DocumentToView;
      check: DocumentCondominiumCheck;
      message: string;
      scope: Readonly<{ identity: string }>;
      conversationMessageId?: string;
      batch?: Readonly<{ response: DocumentBatchResponse<DocumentToView>; key: string }>;
    }>[]
  >([]);
  const [documentConversationMessages, setDocumentConversationMessages] = useState<
    readonly (SetupMessage & {
      answer?: AnswerPayload;
      /** Preserva falas já exibidas antes da atualização da interface local. */
      batch?: Readonly<{ summary?: AnswerPayload }>;
    })[]
  >([]);
  const documentConversationScope = useRef({ identity: "" });
  const documentConversationIdentity = `${context?.condominiumId ?? ""}:${activeChatId ?? ""}`;
  documentConversationScope.current = documentResponseScope(
    documentConversationScope.current,
    documentConversationIdentity
  );
  const pendingCondominiumConfirmation =
    pendingCondominiumConfirmations[0]?.scope === documentConversationScope.current
      ? pendingCondominiumConfirmations[0]
      : undefined;
  const condominiumConfirmationSending = useRef(false);
  const confirmationAnnouncement = useRef("");
  const [feedback, setFeedback] = useState<FeedbackClassification>();
  const [busy, setBusy] = useState(false);
  const [researchingWeb, setResearchingWeb] = useState(false);
  const [runtimePending, setRuntimePending] = useState(true);
  const [entryPending, setEntryPending] = useState(false);
  const offlineDemo = authMode === "development" && aiProvider === "local";
  const [conversationError, setConversationError] = useState("");
  const [pendingChatDocuments, setPendingChatDocuments] = useState<readonly File[]>([]);
  const [chatDocumentMessage, setChatDocumentMessage] = useState("");
  const [chatDocumentMessageIsError, setChatDocumentMessageIsError] = useState(false);
  const [chatDocumentUploading, setChatDocumentUploading] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [audioComposerScope, setAudioComposerScope] = useState<string>();
  const [audioDraftSelection, setAudioDraftSelection] =
    useState<Readonly<{ scope: string; draft: DocumentDraft }>>();
  const [attachmentPickerKind, setAttachmentPickerKind] = useState<AttachmentKind>("document");
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const chatDocumentInput = useRef<HTMLInputElement>(null);
  const composerSending = useRef(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const visibleSetupMessages = getChatSetupMessages(
    setupMessages,
    setupStage === "complete",
    setupChatId,
    activeChatId
  );
  const conversationHistory = (activeChat?.entries ?? []).filter(
    (entry) => entry.answer.answerId !== answer?.answerId
  );
  const currentCondominium = condominiums.find(
    (item) => item.condominiumId === context?.condominiumId
  );
  const currentCondominiumName = currentCondominium?.name ?? "Condomínio da conversa";
  const documents = scopedLibraryDocuments(
    documentCatalog?.documents ?? [],
    context?.condominiumId
  );
  const documentsPending =
    documentCatalog?.condominiumId !== context?.condominiumId || documentCatalog?.pending === true;
  const documentsError =
    documentCatalog?.condominiumId === context?.condominiumId ? (documentCatalog?.error ?? "") : "";
  const identityHeadersKey = JSON.stringify(requestHeaders(authMode, developmentIdentity));
  const timelineScope = `${identityHeadersKey}:${context?.condominiumId ?? ""}:${activeChatId ?? ""}`;
  const currentTimeline = timeline?.scope === timelineScope ? timeline : undefined;
  const canonicalMessages = currentTimeline?.entries.flatMap((entry) => entry.messages) ?? [];
  const canonicalUploads = recordedDocumentUploads(
    currentTimeline?.entries ?? [],
    context?.condominiumId
  );
  const recordedUploadVersionsKey = JSON.stringify(
    [...canonicalUploads.values()].map((document) => document.documentVersionId).sort()
  );
  const canonicalTexts = new Set(
    canonicalMessages.map((message) => `${message.role}:${message.text}`)
  );

  async function conversationFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = String(input);
    const journaled =
      init?.method === "POST" &&
      (/\/chat\/setup-(?:message|turn)$|\/questions$|\/documents(?:\/conversation|\/[^/]+\/(?:conversation|confirm-condominium))?$/.test(
        url
      ) ||
        url === "/v1/condominiums" ||
        url === "/v1/development/test-condominiums");
    if (!journaled) return fetch(input, init);
    const headers = new Headers(init?.headers);
    const setup = /\/chat\/setup-/.test(url);
    const creation = url === "/v1/condominiums" || url === "/v1/development/test-condominiums";
    if (
      (setup || creation) &&
      setupSession.current &&
      !headers.has("x-conversation-condominium-id")
    )
      headers.set("x-setup-session-id", setupSession.current);
    if (
      context &&
      activeChatId &&
      setupStage === "complete" &&
      !creation &&
      (!setup ||
        !["welcome", "create_another"].includes(
          String(JSON.parse(String(init?.body ?? "{}")).stage)
        ))
    ) {
      if (!headers.has("x-conversation-condominium-id"))
        headers.set("x-conversation-condominium-id", context.condominiumId);
      if (!headers.has("x-conversation-chat-id"))
        headers.set("x-conversation-chat-id", activeChatId);
    }
    const binary =
      init?.body instanceof Blob
        ? await init.body.arrayBuffer()
        : init?.body instanceof ArrayBuffer
          ? init.body
          : ArrayBuffer.isView(init?.body)
            ? new Uint8Array(init.body.buffer, init.body.byteOffset, init.body.byteLength).slice()
                .buffer
            : undefined;
    const bodyKey = binary
      ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", binary)))
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("")
      : String(init?.body ?? "");
    const key = `${timelineScope}:${url}:${headers.get("x-document-title") ?? ""}:${bodyKey}`;
    const receipt = pendingReceipts.current.get(key) ?? crypto.randomUUID();
    pendingReceipts.current.set(key, receipt);
    headers.set("x-conversation-request-id", receipt);
    const response = await fetch(input, { ...init, headers });
    const confirmedBody = (value: unknown): boolean => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const body = value as Record<string, unknown>;
      const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
      if (/\/questions$/.test(url))
        return text(body.answerId) && text(body.questionId) && text(body.answer);
      if (/\/chat\/setup-message$/.test(url)) return text(body.message);
      if (/\/chat\/setup-turn$/.test(url))
        return (
          text(body.message) &&
          ["answer", "correction", "question", "small_talk", "unclear"].includes(
            String(body.intent)
          ) &&
          "update" in body
        );
      if (creation)
        return (
          text(body.condominiumId) &&
          !!body.condominium &&
          typeof body.condominium === "object" &&
          text((body.condominium as Record<string, unknown>).name)
        );
      if (/\/documents\/conversation$/.test(url)) {
        return isAnswerPayload(body.summary);
      }
      if (/\/documents$/.test(url)) return text(body.documentId) && text(body.documentVersionId);
      if (body.snapshot !== undefined) return isDocumentSnapshot(body.snapshot);
      return text(body.message) || body.confirmed === true;
    };
    if (response.headers.get("x-alvitra-progress") === "internet") {
      // O cabeçalho é só progresso; o recibo aguarda o corpo e a gravação final.
      void response
        .clone()
        .json()
        .then((result: unknown) => {
          if (
            result &&
            typeof result === "object" &&
            "statusCode" in result &&
            result.statusCode === 200 &&
            "body" in result &&
            result.body &&
            typeof result.body === "object" &&
            confirmedBody(result.body)
          ) {
            if (pendingReceipts.current.get(key) === receipt) pendingReceipts.current.delete(key);
            setTimelineRevision((value) => value + 1);
          }
        })
        .catch(() => {});
      return response;
    }
    if (response.ok) {
      try {
        // fetch resolves at headers. Confirm a complete, valid body before forgetting its key.
        if (confirmedBody(await response.clone().json())) {
          const session = response.headers.get("x-setup-session-id");
          if (session) setupSession.current = session;
          if (pendingReceipts.current.get(key) === receipt) pendingReceipts.current.delete(key);
          setTimelineRevision((value) => value + 1);
        }
      } catch {
        /* The caller reports the body error; an explicit retry keeps the same key. */
      }
    }
    return response;
  }

  useEffect(() => {
    if (!entered || authMode === undefined || busy || chatDocumentUploading) return;
    const controller = new AbortController();
    const scope =
      setupStage === "complete" && context && activeChatId
        ? { condominiumId: context.condominiumId, chatId: activeChatId }
        : undefined;
    setTimelineError("");
    void loadTimeline(
      fetch,
      requestHeaders(authMode, developmentIdentity),
      scope,
      undefined,
      controller.signal
    )
      .then((page) => {
        if (!controller.signal.aborted)
          setTimeline((previous) => ({
            scope: timelineScope,
            ...refreshTimeline(previous?.scope === timelineScope ? previous : undefined, page)
          }));
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setTimelineError(error instanceof Error ? error.message : "Histórico indisponível.");
      });
    return () => controller.abort();
  }, [
    entered,
    authMode,
    identityHeadersKey,
    context?.condominiumId,
    activeChatId,
    setupStage,
    timelineRevision,
    busy,
    chatDocumentUploading
  ]);

  async function loadEarlierMessages(): Promise<void> {
    if (!currentTimeline?.nextCursor) return;
    const scope = timelineScope;
    try {
      const page = await loadTimeline(
        fetch,
        requestHeaders(authMode, developmentIdentity),
        setupStage === "complete" && context && activeChatId
          ? { condominiumId: context.condominiumId, chatId: activeChatId }
          : undefined,
        currentTimeline.nextCursor
      );
      setTimeline((previous) =>
        previous?.scope === scope
          ? {
              scope,
              entries: mergeTimeline(page.entries, previous.entries),
              nextCursor: page.nextCursor
            }
          : previous
      );
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : "Histórico indisponível.");
    }
  }
  const composerDisabled =
    authMode === undefined ||
    busy ||
    chatDocumentUploading ||
    (offlineDemo && setupStage !== "complete") ||
    runtimePending ||
    entryPending ||
    (setupStage === "complete" && context === undefined);
  const composerOverlayOpen =
    sidebarOpen ||
    accountMenuOpen ||
    attachmentMenuOpen ||
    documentLibraryOpen ||
    viewedDocument !== undefined ||
    selectedCitation !== undefined;

  useEffect(() => {
    focusComposer(composerInput.current, { entered, overlayOpen: composerOverlayOpen });
  }, [entered, composerDisabled, composerOverlayOpen, activeChatId, context?.condominiumId]);

  useEffect(() => {
    if (!entered || authMode === undefined) return;
    const controller = new AbortController();
    setCondominiumsPending(true);
    setCondominiumsError("");
    void fetch("/v1/chat/condominiums", {
      credentials: "same-origin",
      cache: "no-store",
      headers: JSON.parse(identityHeadersKey) as Record<string, string>,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)])
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os condomínios.");
        const body = (await response.json()) as { condominiums: readonly CondominiumListItem[] };
        if (!controller.signal.aborted) setCondominiums(body.condominiums);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setCondominiumsError(
            error instanceof Error ? error.message : "Não foi possível carregar os condomínios."
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCondominiumsPending(false);
      });
    return () => controller.abort();
  }, [
    entered,
    authMode,
    identityHeadersKey,
    context?.condominiumId,
    sidebarOpen,
    condominiumsRevision
  ]);

  useEffect(() => {
    if (
      (!accountMenuOpen && !documentLibraryOpen && recordedUploadVersionsKey === "[]") ||
      context === undefined
    )
      return;
    const condominiumId = context.condominiumId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    setDocumentCatalog({ condominiumId, documents: [], pending: true, error: "" });
    const load = async () => {
      try {
        const loaded = await loadCondominiumDocuments(
          fetch,
          {
            condominiumId,
            condominiumName: currentCondominiumName,
            headers: JSON.parse(identityHeadersKey) as Record<string, string>
          },
          AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)])
        );
        if (controller.signal.aborted) return;
        setDocumentCatalog({ condominiumId, documents: loaded, pending: false, error: "" });
        if (loaded.some((item) => ["uploaded", "processing"].includes(item.processingStatus)))
          timer = setTimeout(() => void load(), 3000);
      } catch (error: unknown) {
        if (!controller.signal.aborted)
          setDocumentCatalog({
            condominiumId,
            documents: [],
            pending: false,
            error:
              error instanceof Error && error.name !== "TimeoutError"
                ? error.message
                : "Não foi possível carregar os documentos. Tente novamente."
          });
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    accountMenuOpen,
    documentLibraryOpen,
    context?.condominiumId,
    currentCondominiumName,
    identityHeadersKey,
    recordedUploadVersionsKey,
    documentsRevision,
    chatDocumentUploading
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance;
  }, [appearance]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadRuntime(): Promise<void> {
      try {
        const runtimeResponse = await conversationFetch("/v1/runtime", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!runtimeResponse.ok) throw new Error("Não foi possível verificar o serviço.");
        const runtime = (await runtimeResponse.json()) as Readonly<{
          authMode?: unknown;
          accessCodeEnabled?: unknown;
          aiProvider?: unknown;
        }>;
        const mode: AuthMode = runtime.authMode === "real" ? "real" : "development";
        if (!active) return;
        setAuthMode(mode);
        setAccessCodeEnabled(runtime.accessCodeEnabled === true);
        setAiProvider(
          runtime.aiProvider === "codex"
            ? "codex"
            : runtime.aiProvider === "openai"
              ? "openai"
              : runtime.aiProvider === "gemini"
                ? "gemini"
                : runtime.aiProvider === "local"
                  ? "local"
                  : "unavailable"
        );
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) return;
        setConversationError(
          error instanceof Error
            ? error.message
            : "Não foi possível preparar a conversa com segurança."
        );
      } finally {
        if (active) setRuntimePending(false);
      }
    }

    void loadRuntime();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (runtimePending || authMode === undefined) return;
    if (!accessCodeEnabled) {
      setRestorePending(false);
      return;
    }
    const controller = new AbortController();
    setRestorePending(true);
    void requestAccessSession(
      fetch,
      undefined,
      AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])
    )
      .then(async (identity) => {
        if (!controller.signal.aborted && identity) await enterConversation(identity);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setConversationError("Não foi possível retomar seu acesso agora. Tente novamente.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestorePending(false);
      });
    return () => controller.abort();
  }, [authMode, runtimePending, accessCodeEnabled, restoreRevision]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    answer,
    busy,
    chatDocumentMessage,
    conversationError,
    pendingCondominiumConfirmation,
    documentConversationMessages,
    setupMessages,
    submittedQuestion
  ]);

  useEffect(() => {
    setViewedDocument(undefined);
    setDocumentUploadProgress([]);
    setPendingCondominiumConfirmations([]);
    setDocumentConversationMessages([]);
    setPendingChatDocuments([]);
    setChatDocumentMessage("");
  }, [context?.condominiumId, activeChatId]);

  useEffect(() => {
    setDocumentLibraryOpen(false);
  }, [context?.condominiumId]);

  function openCitation(citation: Citation): void {
    setSelectedCitation(citation);
    if (citation.sourceRemoved || citation.sourceScope === "legislation" || context === undefined)
      return;
    setViewedDocument({
      condominiumId: context.condominiumId,
      documentVersionId: citation.documentVersionId,
      title: citation.title,
      page: citation.page
    });
  }

  const canUpload = context?.permissions.includes("document:upload") === true;
  const conversationStarted =
    visibleSetupMessages.some((message) => message.role === "user") ||
    conversationHistory.length > 0 ||
    submittedQuestion !== "";
  const serviceLabel = useMemo(() => {
    if (runtimePending) return "Preparando a conversa";
    if (entryPending) return "Entrando na conversa";
    if (setupStage === "manager_name") return "Conhecendo você";
    if (setupStage !== "complete") {
      return setupCondominiumTotal === 1
        ? "Configurando seu condomínio"
        : "Configurando seus condomínios";
    }
    if (context === undefined) return "Conversa indisponível";
    if (aiProvider === "codex") return "Online · seu plano Codex";
    if (aiProvider === "openai") return "Online · memória documental ativa";
    return "Online · memória documental local";
  }, [aiProvider, context, entryPending, runtimePending, setupCondominiumTotal, setupStage]);

  async function enterConversation(selectedIdentity: DevelopmentIdentity): Promise<void> {
    if (authMode === undefined || runtimePending || entryPending) return;

    setEntryPending(true);
    setConversationError("");
    setDevelopmentIdentity(selectedIdentity);
    setSetupManagerName("");
    const savedProfile =
      authMode === "development"
        ? loadDevelopmentSetupProfile(
            getBrowserStorage() ?? { getItem: () => null },
            selectedIdentity
          )
        : undefined;
    try {
      const bootstrapResponse = await fetch("/v1/chat/bootstrap", {
        cache: "no-store",
        credentials: "same-origin",
        headers: requestHeaders(authMode, selectedIdentity)
      });
      if (
        (bootstrapResponse.ok || bootstrapResponse.status === 404) &&
        (await resumeSetup(
          selectedIdentity,
          bootstrapResponse.ok
            ? ((await bootstrapResponse.clone().json()) as ContextResponse)
            : undefined
        ))
      )
        return;
      if (bootstrapResponse.status === 404) {
        if (
          savedProfile?.completed === true &&
          savedProfile.managerName !== "" &&
          savedProfile.condominiums.length > 0
        ) {
          let restoredContext: ContextResponse | undefined;
          for (const condominium of savedProfile.condominiums) {
            const restoreResponse = await conversationFetch("/v1/development/test-condominiums", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "content-type": "application/json",
                ...requestHeaders(authMode, selectedIdentity)
              },
              body: JSON.stringify({
                ...condominium,
                contact: { managerName: savedProfile.managerName }
              })
            });
            if (!restoreResponse.ok && restoreResponse.status !== 409) {
              throw new Error(
                await readMessage(restoreResponse, "Não consegui restaurar seu cadastro agora.")
              );
            }
            if (restoreResponse.ok && restoredContext === undefined) {
              restoredContext = (await restoreResponse.json()) as ContextResponse;
            }
          }
          if (restoredContext !== undefined) {
            const session = await openChatSession<ConversationHistoryEntry>(fetch, {
              condominiumId: restoredContext.condominiumId,
              headers: requestHeaders(authMode, selectedIdentity)
            });
            await saveChat(
              fetch,
              {
                condominiumId: restoredContext.condominiumId,
                headers: requestHeaders(authMode, selectedIdentity)
              },
              session.chats[0]!
            );
            const welcome = await requestSetupMessage(
              { stage: "returning", managerName: savedProfile.managerName },
              selectedIdentity,
              { condominiumId: restoredContext.condominiumId, chatId: session.activeChatId }
            );
            setContext(restoredContext);
            setSetupManagerName(savedProfile.managerName);
            setSetupStage("complete");
            setSetupMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]);
            setChats(session.chats);
            setActiveChatId(session.activeChatId);
            setSetupChatId(session.activeChatId);
            setEntered(true);
            return;
          }
        }
        const welcome = await requestSetupMessage({ stage: "welcome" }, selectedIdentity);
        setContext(undefined);
        setSetupManagerName("");
        setSetupStage("manager_name");
        setSetupMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]);
        setEntered(true);
        return;
      }
      if (!bootstrapResponse.ok) {
        throw new Error(
          await readMessage(
            bootstrapResponse,
            "Não encontrei um contexto autorizado para iniciar esta conversa."
          )
        );
      }

      const authorizedContext = (await bootstrapResponse.json()) as ContextResponse;
      const managerName =
        savedProfile?.managerName ?? authorizedContext.preferredName?.trim() ?? "";
      if (managerName === "") {
        const welcome = await requestSetupMessage({ stage: "welcome" }, selectedIdentity);
        setContext(authorizedContext);
        setSetupManagerName("");
        setSetupStage("manager_name");
        setSetupMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]);
        setEntered(true);
        return;
      }
      const session = await openChatSession<ConversationHistoryEntry>(fetch, {
        condominiumId: authorizedContext.condominiumId,
        headers: requestHeaders(authMode, selectedIdentity)
      });
      await saveChat(
        fetch,
        {
          condominiumId: authorizedContext.condominiumId,
          headers: requestHeaders(authMode, selectedIdentity)
        },
        session.chats[0]!
      );
      const welcome = await requestSetupMessage(
        { stage: "returning", managerName },
        selectedIdentity,
        { condominiumId: authorizedContext.condominiumId, chatId: session.activeChatId }
      );
      setContext(authorizedContext);
      setSetupManagerName(managerName);
      setSetupStage("complete");
      setSetupMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: welcome
        }
      ]);
      setEntered(true);
      setChats(session.chats);
      setActiveChatId(session.activeChatId);
      setSetupChatId(session.activeChatId);
    } catch (error: unknown) {
      setConversationError(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar na conversa com segurança."
      );
    } finally {
      setEntryPending(false);
    }
  }

  async function openAccountMenu(): Promise<void> {
    if (authMode === undefined) return;
    setSidebarOpen(false);
    setAccountMenuOpen(true);
    setAccountMenuView("home");
  }

  function changeAppearance(next: Appearance): void {
    setAppearance(next);
    saveAppearance(getBrowserStorage(), next);
  }

  async function leaveAccount(): Promise<void> {
    if (authMode === undefined || signOutPending) return;
    setSignOutPending(true);
    setSignOutError("");
    try {
      await signOut(authMode, getBrowserStorage(), fetch, accessCodeEnabled);
      // Recriar a página descarta todo o estado e impede respostas antigas na próxima entrada.
      window.location.reload();
    } catch {
      setSignOutError("Não foi possível sair da conta. Tente novamente.");
      setSignOutPending(false);
    }
  }

  async function switchCondominium(item: CondominiumListItem): Promise<void> {
    if (authMode === undefined || busy || chatDocumentUploading || setupStage !== "complete")
      return;
    if (item.condominiumId === context?.condominiumId) {
      setSidebarCondominiumId(item.condominiumId);
      return;
    }
    setBusy(true);
    setCondominiumsPending(true);
    setCondominiumsError("");
    try {
      const contextResponse = await conversationFetch(
        `/v1/condominiums/${encodeURIComponent(item.condominiumId)}/context`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: requestHeaders(authMode, developmentIdentity)
        }
      );
      if (!contextResponse.ok) {
        throw new Error(await readMessage(contextResponse, "Acesso não autorizado."));
      }
      const authorizedContext = (await contextResponse.json()) as ContextResponse;
      const session = await openChatSession<ConversationHistoryEntry>(fetch, {
        condominiumId: authorizedContext.condominiumId,
        headers: requestHeaders(authMode, developmentIdentity)
      });
      preserveActiveTurn();
      setContext(authorizedContext);
      setChats(session.chats);
      setActiveChatId(session.activeChatId);
      setSidebarCondominiumId(authorizedContext.condominiumId);
      setSetupMessages([]);
      setSetupChatId(undefined);
      setQuestion("");
      setConversationError("");
      setAttachmentMenuOpen(false);
      setDocumentCatalog(undefined);
      setDocumentLibraryOpen(false);
      setAccountMenuOpen(false);
    } catch (error: unknown) {
      setCondominiumsError(
        error instanceof Error ? error.message : "Não foi possível trocar de condomínio."
      );
    } finally {
      setCondominiumsPending(false);
      setBusy(false);
    }
  }

  async function requestSetupMessage(
    input: Readonly<Record<string, string | number>>,
    identity: DevelopmentIdentity | undefined = developmentIdentity,
    scope?: Readonly<{ condominiumId: string; chatId: string }>
  ): Promise<string> {
    if (authMode === undefined) throw new Error("A conversa ainda não está disponível.");
    if (offlineDemo && (input.stage === "welcome" || input.stage === "returning")) return "";
    if (offlineDemo && input.stage === "new_conversation") {
      const managerName = typeof input.managerName === "string" ? input.managerName.trim() : "";
      return `${managerName === "" ? "Olá" : `Olá, ${managerName}`}. Como posso ajudar você agora?`;
    }
    const setupInput =
      setupManagerName.trim() === "" || input.managerName !== undefined
        ? input
        : { ...input, managerName: setupManagerName };
    const response = await conversationFetch("/v1/chat/setup-message", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...requestHeaders(authMode, identity),
        ...(scope
          ? {
              "x-conversation-condominium-id": scope.condominiumId,
              "x-conversation-chat-id": scope.chatId
            }
          : {})
      },
      body: JSON.stringify(setupInput)
    });
    if (!response.ok)
      throw new Error(await readMessage(response, "A Alvitra está indisponível no momento."));
    const body = (await response.json()) as Readonly<{ message: string }>;
    return body.message;
  }

  async function resumeSetup(
    identity: DevelopmentIdentity | undefined,
    existingContext?: ContextResponse
  ): Promise<boolean> {
    let page = await loadTimeline(fetch, requestHeaders(authMode, identity));
    setupSession.current = page.setupSessionId ?? undefined;
    let entries = page.entries;
    const cursors = new Set<string>();
    while (page.nextCursor) {
      if (cursors.has(page.nextCursor))
        throw new Error("Não foi possível concluir a recuperação do cadastro.");
      cursors.add(page.nextCursor);
      page = await loadTimeline(
        fetch,
        requestHeaders(authMode, identity),
        undefined,
        page.nextCursor
      );
      entries = mergeTimeline(page.entries, entries);
    }
    if (!entries.some((entry) => entry.messages.length > 0)) return false;
    const recovered = recoverSetup(entries);
    setSetupManagerName(recovered.managerName);
    setSetupCondominiumName(recovered.condominiumName);
    setSetupCondominiumTotal(recovered.count);
    setSetupCondominiumIndex(recovered.index);
    setSetupMessages(entries.flatMap((entry) => entry.messages));
    setSetupStage(recovered.stage);
    const condominiumId =
      recovered.createdContext?.condominiumId ??
      (recovered.stage === "complete" ? existingContext?.condominiumId : undefined);
    if (typeof condominiumId === "string") {
      const response = await conversationFetch(
        `/v1/condominiums/${encodeURIComponent(condominiumId)}/context`,
        {
          credentials: "same-origin",
          cache: "no-store",
          headers: requestHeaders(authMode, identity)
        }
      );
      if (!response.ok) throw new Error("O cadastro anterior não está autorizado nesta sessão.");
      const restored = (await response.json()) as ContextResponse;
      setContext(restored);
      const session = await openChatSession<ConversationHistoryEntry>(fetch, {
        condominiumId,
        headers: requestHeaders(authMode, identity)
      });
      await bindSetupHistory(restored, session.activeChatId, identity);
      setChats(
        session.chats.map((chat) =>
          chat.id === session.activeChatId ? { ...chat, persisted: true } : chat
        )
      );
      setActiveChatId(session.activeChatId);
      setSetupChatId(session.activeChatId);
    }
    setEntered(true);
    return true;
  }

  async function bindSetupHistory(
    created: ContextResponse,
    chatId: string,
    identity = developmentIdentity
  ): Promise<void> {
    const response = await conversationFetch(
      `/v1/condominiums/${encodeURIComponent(created.condominiumId)}/chats/${encodeURIComponent(chatId)}/setup-history`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: requestHeaders(authMode, identity)
      }
    );
    if (!response.ok)
      throw new Error(
        "O condomínio foi cadastrado, mas não foi possível associar o histórico. Entre novamente para retomar."
      );
    setupSession.current = undefined;
  }

  async function requestSetupTurn(message: string): Promise<SetupTurnResponse> {
    if (authMode === undefined || setupStage === "complete")
      throw new Error("A conversa ainda não está disponível.");
    const response = await conversationFetch("/v1/chat/setup-turn", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...requestHeaders(authMode, developmentIdentity)
      },
      body: JSON.stringify({
        stage: setupStage,
        message,
        history: setupMessages.slice(-12).map(({ role, text }) => ({ role, text })),
        ...(setupManagerName === "" ? {} : { managerName: setupManagerName }),
        ...(setupCondominiumName === "" ? {} : { condominiumName: setupCondominiumName }),
        ...(setupCondominiumTotal < 1
          ? {}
          : { condominiumCount: setupCondominiumTotal, condominiumIndex: setupCondominiumIndex }),
        hasExistingContext: context !== undefined
      })
    });
    if (!response.ok)
      throw new Error(await readMessage(response, "A Alvitra está indisponível no momento."));
    return (await response.json()) as SetupTurnResponse;
  }

  async function startCondominiumConversation(): Promise<void> {
    setAccountMenuOpen(false);
    setSidebarOpen(false);
    setConversationError("");
    const message = await requestSetupMessage({ stage: "create_another" }).catch(
      (error: unknown) => {
        setConversationError(
          error instanceof Error ? error.message : "A Alvitra está indisponível no momento."
        );
        return undefined;
      }
    );
    if (message === undefined) return;
    setSetupCondominiumTotal(1);
    setSetupCondominiumIndex(1);
    setSetupCondominiumName("");
    setSetupStage("condominium_name");
    appendSetupMessage("assistant", message);
    setQuestion("");
  }

  function appendSetupMessage(role: SetupMessage["role"], text: string): void {
    setSetupMessages((current) => [...current, { id: crypto.randomUUID(), role, text }]);
  }

  async function createCondominiumFromSetup(name: string, unitCount: number): Promise<void> {
    if (authMode === undefined) return;
    const normalizedName = name
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .replaceAll(/[^a-z0-9]+/gu, "-")
      .replaceAll(/^-|-$/gu, "")
      .slice(0, 40);
    const developmentCondominiumId = `${normalizedName || "condominio"}-${(setupSession.current ?? crypto.randomUUID()).slice(0, 8)}`;
    const endpoint =
      authMode === "development" ? "/v1/development/test-condominiums" : "/v1/condominiums";
    const payload =
      authMode === "development"
        ? {
            condominiumId: developmentCondominiumId,
            name,
            unitCount,
            contact: { managerName: setupManagerName }
          }
        : { name, unitCount };
    const response = await conversationFetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...requestHeaders(authMode, developmentIdentity)
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(await readMessage(response, "Não consegui salvar esse condomínio agora."));
    }
    const created = (await response.json()) as ContextResponse;
    if (authMode === "development" && developmentIdentity !== undefined) {
      rememberDevelopmentCondominium(
        window.localStorage,
        developmentIdentity,
        setupManagerName,
        { condominiumId: developmentCondominiumId, name, unitCount },
        setupCondominiumIndex >= setupCondominiumTotal
      );
    }
    setContext(created);
    const chat = createEmptyChat<ConversationHistoryEntry>();
    await bindSetupHistory(created, chat.id);
    setChats([{ ...chat, persisted: true }]);
    setActiveChatId(chat.id);
    setSetupChatId(chat.id);
    setAnswer(undefined);
    setSubmittedQuestion("");
    setSelectedCitation(undefined);
    setFeedback(undefined);
  }

  async function advanceSetup(rawAnswer: string): Promise<void> {
    const trimmedAnswer = rawAnswer.trim();
    if (trimmedAnswer.length === 0 || busy) return;
    appendSetupMessage("user", trimmedAnswer);
    setQuestion("");
    setConversationError("");
    setBusy(true);
    try {
      const turn = await requestSetupTurn(trimmedAnswer);
      const update = turn.update;
      if (update === null) {
        appendSetupMessage("assistant", turn.message);
        return;
      }

      if (update.field === "manager_name") {
        setSetupManagerName(update.value);
        if (authMode === "development" && developmentIdentity !== undefined) {
          rememberDevelopmentManagerName(window.localStorage, developmentIdentity, update.value);
        }
        if (setupStage === "manager_name") {
          setSetupStage(context === undefined ? "condominium_count" : "complete");
          if (context) {
            const chat = createEmptyChat<ConversationHistoryEntry>();
            await bindSetupHistory(context, chat.id);
            setChats([{ ...chat, persisted: true }]);
            setActiveChatId(chat.id);
            setSetupChatId(chat.id);
          }
        }
        appendSetupMessage("assistant", turn.message);
        return;
      }

      if (update.field === "condominium_count") {
        setSetupCondominiumTotal(update.value);
        if (setupStage === "condominium_count") {
          setSetupCondominiumIndex(1);
          setSetupStage("condominium_name");
        }
        appendSetupMessage("assistant", turn.message);
        return;
      }

      if (update.field === "condominium_name") {
        setSetupCondominiumName(update.value);
        if (setupStage === "condominium_name") setSetupStage("unit_count");
        appendSetupMessage("assistant", turn.message);
        return;
      }

      await createCondominiumFromSetup(setupCondominiumName, update.value);
      if (setupCondominiumIndex < setupCondominiumTotal) {
        setSetupCondominiumIndex(setupCondominiumIndex + 1);
        setSetupCondominiumName("");
        setSetupStage("condominium_name");
      } else {
        setSetupStage("complete");
      }
      appendSetupMessage("assistant", turn.message);
    } catch (error: unknown) {
      setQuestion((current) => (current === "" ? trimmedAnswer : current));
      setConversationError(
        error instanceof Error ? error.message : "A Alvitra está indisponível no momento."
      );
    } finally {
      setBusy(false);
    }
  }

  function selectChatDocuments(files: readonly File[]): void {
    const selection = selectDocumentFiles(pendingChatDocuments, files);
    setPendingChatDocuments(selection.files);
    setChatDocumentMessage(selection.errors.join(" "));
    setChatDocumentMessageIsError(selection.errors.length > 0);
  }

  function chooseAttachment(kind: AttachmentKind): void {
    setAttachmentPickerKind(kind);
    setAttachmentMenuOpen(false);
    window.setTimeout(() => chatDocumentInput.current?.click(), 0);
  }

  async function converseAboutDocument(
    document: DocumentToView,
    event: "received" | "status" | "confirmed" | "cancelled",
    message?: string
  ): Promise<string | undefined> {
    const scope = documentConversationScope.current;
    const result = await requestDocumentConversationReply(conversationFetch, {
      ...document,
      event,
      ...(message === undefined ? {} : { message }),
      headers: requestHeaders(authMode, developmentIdentity)
    });
    if (scope !== documentConversationScope.current) return undefined;
    const id = crypto.randomUUID();
    setDocumentConversationMessages((messages) => [
      ...messages,
      ...(message === undefined
        ? []
        : [{ id: crypto.randomUUID(), role: "user" as const, text: message }]),
      {
        id,
        role: "assistant",
        ...result
      }
    ]);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
    return id;
  }

  useEffect(() => {
    const pending = pendingCondominiumConfirmation;
    if (
      pending === undefined ||
      authMode === undefined ||
      activeChatId === undefined ||
      context?.condominiumId !== pending.document.condominiumId ||
      pending.conversationMessageId !== undefined ||
      busy ||
      chatDocumentUploading
    )
      return;
    const key = `${documentConversationIdentity}:${pending.document.documentVersionId}`;
    if (confirmationAnnouncement.current === key) return;
    confirmationAnnouncement.current = key;
    const scope = documentConversationScope.current;
    setChatDocumentUploading(true);
    void ensureActiveChatSaved(buildConversationTitle(pending.document.title))
      .then(() =>
        scope === documentConversationScope.current
          ? converseAboutDocument(pending.document, "status")
          : undefined
      )
      .then((conversationMessageId) => {
        if (conversationMessageId === undefined || scope !== documentConversationScope.current)
          return;
        setPendingCondominiumConfirmations((current) =>
          current.map((item) =>
            item.document.condominiumId === pending.document.condominiumId &&
            item.document.documentVersionId === pending.document.documentVersionId
              ? { ...item, conversationMessageId }
              : item
          )
        );
      })
      .catch((error: unknown) => {
        if (scope === documentConversationScope.current)
          setConversationError(
            error instanceof Error ? error.message : "A Alvitra está indisponível no momento."
          );
      })
      .finally(() => {
        if (scope === documentConversationScope.current) setChatDocumentUploading(false);
      });
  }, [
    pendingCondominiumConfirmation,
    documentConversationIdentity,
    authMode,
    activeChatId,
    context?.condominiumId,
    busy,
    chatDocumentUploading
  ]);

  async function addChatDocuments(files: readonly File[]): Promise<void> {
    if (context === undefined || authMode === undefined || files.length === 0) return;
    const message = question.trim();
    const uploadNotice = isDocumentUploadNotice(message);
    const scope = documentConversationScope.current;
    const isCurrent = () => scope === documentConversationScope.current;
    const blockedByEarlierFiles =
      submittedQuestion === message &&
      documentUploadProgress.some((item) => item.document !== undefined && item.phase !== "ready");
    const items = files.map((file) => ({ id: crypto.randomUUID(), file }));
    const updateProgress = (id: string, patch: Partial<DocumentUploadProgress>) => {
      if (!isCurrent()) return;
      setDocumentUploadProgress((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    };
    preserveActiveTurn();
    setSubmittedQuestion(message);
    setQuestion("");
    setConversationError("");
    setChatDocumentUploading(true);
    setDocumentUploadProgress((current) => [
      ...current,
      ...items.map(({ id, file }) => ({ id, name: file.name, phase: "queued" as const }))
    ]);
    setChatDocumentMessage("Enviando documentos...");
    setChatDocumentMessageIsError(false);
    try {
      const chatId = await ensureActiveChatSaved(buildConversationTitle(message || files[0]!.name));
      const batchResponse = createDocumentBatchResponse<DocumentToView>({
        keys: items.map((item) => item.id),
        isCurrent,
        respond: async (documents) => {
          if (message !== "" && !uploadNotice) return;
          try {
            const summary = await requestDocumentBatchSummary(conversationFetch, {
              onOriginalImprovementStatus: (message) => {
                if (isCurrent()) setConversationError(message);
              },
              condominiumId: context.condominiumId,
              documentVersionIds: documents.map((document) => document.documentVersionId),
              ...(uploadNotice ? { message } : {}),
              headers: requestHeaders(authMode, developmentIdentity)
            });
            if (!isCurrent()) return;
            if (uploadNotice) setQuestion((current) => (current.trim() === message ? "" : current));
            setDocumentConversationMessages((current) => [
              ...current,
              { id: crypto.randomUUID(), role: "assistant", text: "", answer: summary }
            ]);
          } catch (error) {
            if (isCurrent() && uploadNotice)
              setQuestion((current) => (current === "" ? message : current));
            if (isCurrent())
              setConversationError(
                error instanceof Error
                  ? error.message
                  : "A análise não foi concluída. Tente novamente."
              );
          }
        }
      });
      const allReady = await sendDocumentBatch({
        documents: items,
        message: blockedByEarlierFiles ? "" : message,
        isCurrent,
        process: async ({ id, file }) => {
          const mediaType = chatFileMediaType(file);
          if (mediaType === undefined) return false;
          let versionId = "";
          let ready = false;
          updateProgress(id, { phase: "uploading" });
          try {
            await sendDocumentMessage({
              message: "",
              receive: async () => {
                const response = await requestDocumentUploadWithAuthorizationRecovery(
                  conversationFetch,
                  {
                    chatId,
                    condominiumId: context.condominiumId,
                    content: file,
                    title: file.name,
                    documentType: inferDocumentType(file.name),
                    mediaType,
                    authMode,
                    signal: AbortSignal.timeout(60_000),
                    ...(developmentIdentity === undefined
                      ? {}
                      : { developmentUserId: developmentIdentity.userId })
                  }
                );
                if (!response.ok)
                  throw new Error(
                    await readMessage(response, "Não foi possível receber o documento.")
                  );
                const result = (await response.json()) as Readonly<{ documentVersionId: string }>;
                if (!isCurrent()) throw new Error("A conversa mudou.");
                versionId = result.documentVersionId;
                const document = {
                  condominiumId: context.condominiumId,
                  documentVersionId: versionId,
                  title: file.name
                };
                updateProgress(id, { phase: "processing", document });
                setChats((current) =>
                  current.map((chat) =>
                    chat.id !== chatId
                      ? chat
                      : {
                          ...chat,
                          attachments: [
                            ...(chat.attachments ?? []),
                            {
                              documentVersionId: versionId,
                              title: file.name,
                              createdAt: new Date().toISOString()
                            }
                          ]
                        }
                  )
                );
                setPendingChatDocuments((current) => current.filter((pending) => pending !== file));
                setDocumentsRevision((revision) => revision + 1);
              },
              waitUntilProcessed: async () => {
                const status = await waitForDocumentProcessing(fetch, {
                  condominiumId: context.condominiumId,
                  documentVersionId: versionId,
                  headers: requestHeaders(authMode, developmentIdentity),
                  signal: AbortSignal.timeout(60_000)
                });
                if (!isCurrent()) throw new Error("A conversa mudou.");
                ready = status === "ready";
                updateProgress(id, { phase: status });
                if (ready) {
                  batchResponse.markReady(id, {
                    condominiumId: context.condominiumId,
                    documentVersionId: versionId,
                    title: file.name
                  });
                  return status;
                }
                return status;
              },
              ask: async () => {}
            });
            return ready;
          } catch (error: unknown) {
            if (!isCurrent()) return false;
            if (error instanceof DocumentCondominiumConfirmationRequiredError) {
              const document = {
                condominiumId: context.condominiumId,
                documentVersionId: versionId,
                title: file.name
              };
              updateProgress(id, { phase: "needs_review" });
              setPendingCondominiumConfirmations((current) => [
                ...current,
                {
                  document,
                  check: error.check,
                  message:
                    files.length === 1 && !blockedByEarlierFiles && !uploadNotice ? message : "",
                  scope,
                  batch: { response: batchResponse, key: id }
                }
              ]);
            } else {
              updateProgress(id, {
                phase: "failed",
                error:
                  error instanceof Error &&
                  error.name !== "TimeoutError" &&
                  error.name !== "AbortError"
                    ? error.message
                    : "A espera excedeu o limite. Confira o estado em Documentos antes de tentar novamente."
              });
            }
            return false;
          }
        },
        complete: () => batchResponse.finish(),
        ask: (text) => askQuestion(text)
      });
      if (!isCurrent()) return;
      if (!allReady || blockedByEarlierFiles) {
        setQuestion((current) => (current === "" ? message : current));
      }
      setChatDocumentMessage("");
      setChatDocumentMessageIsError(false);
    } catch (error: unknown) {
      if (!isCurrent()) return;
      const detail =
        error instanceof Error ? error.message : "Não foi possível enviar os documentos.";
      setDocumentUploadProgress((current) =>
        current.map((item) =>
          items.some(({ id }) => id === item.id) && item.phase === "queued"
            ? { ...item, phase: "failed", error: detail }
            : item
        )
      );
      setChatDocumentMessage(detail);
      setChatDocumentMessageIsError(true);
      setQuestion((current) => (current === "" ? message : current));
    } finally {
      if (isCurrent()) setChatDocumentUploading(false);
    }
  }

  async function confirmPendingDocument(
    input: NonNullable<typeof pendingCondominiumConfirmation>,
    decisionMessage: string
  ): Promise<void> {
    if (
      authMode === undefined ||
      context?.condominiumId !== input.document.condominiumId ||
      busy ||
      chatDocumentUploading ||
      condominiumConfirmationSending.current
    )
      return;
    condominiumConfirmationSending.current = true;
    setChatDocumentUploading(true);
    const scope = documentConversationScope.current;
    try {
      await confirmDocumentCondominium(conversationFetch, {
        ...input.document,
        message: decisionMessage,
        headers: requestHeaders(authMode, developmentIdentity)
      });
      if (scope !== documentConversationScope.current) return;
      setQuestion((current) => (current.trim() === decisionMessage ? "" : current));
      setPendingCondominiumConfirmations((current) =>
        current.filter(
          (pending) => pending.document.documentVersionId !== input.document.documentVersionId
        )
      );
      setDocumentUploadProgress((current) =>
        current.map((item) =>
          item.document?.documentVersionId === input.document.documentVersionId
            ? { ...item, phase: input.check.resumeProcessingStatus }
            : item
        )
      );
      setDocumentConversationMessages((messages) => [
        ...messages,
        { id: crypto.randomUUID(), role: "user", text: decisionMessage }
      ]);
      setDocumentCatalog((current) =>
        current === undefined
          ? current
          : {
              ...current,
              documents: current.documents.map((document) =>
                document.documentVersionId === input.document.documentVersionId &&
                document.condominiumId === input.document.condominiumId
                  ? {
                      ...document,
                      processingStatus: input.check.resumeProcessingStatus,
                      condominiumCheck: { ...input.check, status: "confirmed" as const }
                    }
                  : document
              )
            }
      );
      setDocumentsRevision((revision) => revision + 1);
      if (input.batch !== undefined) {
        const status =
          input.check.resumeProcessingStatus === "ready"
            ? "ready"
            : await waitForDocumentProcessing(fetch, {
                condominiumId: input.document.condominiumId,
                documentVersionId: input.document.documentVersionId,
                headers: requestHeaders(authMode, developmentIdentity),
                signal: AbortSignal.timeout(60_000)
              });
        if (scope !== documentConversationScope.current) return;
        setDocumentUploadProgress((current) =>
          current.map((item) =>
            item.document?.documentVersionId === input.document.documentVersionId
              ? { ...item, phase: status }
              : item
          )
        );
        if (status === "ready") {
          input.batch.response.markReady(input.batch.key, input.document);
          await input.batch.response.respondIfReady();
          if (scope !== documentConversationScope.current) return;
          if (input.message !== "") {
            setQuestion((current) => (current.trim() === input.message ? "" : current));
            await askQuestion(input.message);
          }
        }
        return;
      }
      if (input.message !== "" && input.check.resumeProcessingStatus === "ready") {
        setQuestion((current) => (current.trim() === input.message ? "" : current));
        await askQuestion(input.message);
      } else {
        await converseAboutDocument(input.document, "confirmed");
      }
    } catch (error) {
      if (scope !== documentConversationScope.current) return;
      setChatDocumentMessage(
        error instanceof Error ? error.message : "Não foi possível confirmar o documento."
      );
      setChatDocumentMessageIsError(true);
    } finally {
      condominiumConfirmationSending.current = false;
      if (scope === documentConversationScope.current) setChatDocumentUploading(false);
    }
  }

  async function cancelDocumentUse(decisionMessage: string): Promise<void> {
    const pending = pendingCondominiumConfirmation;
    if (
      pending === undefined ||
      busy ||
      chatDocumentUploading ||
      condominiumConfirmationSending.current
    )
      return;
    condominiumConfirmationSending.current = true;
    setChatDocumentUploading(true);
    const scope = documentConversationScope.current;
    try {
      await converseAboutDocument(pending.document, "cancelled", decisionMessage);
      if (scope !== documentConversationScope.current) return;
      pending.batch?.response.cancel();
      setQuestion((current) => (current.trim() === decisionMessage ? "" : current));
      setPendingCondominiumConfirmations((current) =>
        current.filter(
          (item) => item.document.documentVersionId !== pending.document.documentVersionId
        )
      );
    } catch (error) {
      if (scope !== documentConversationScope.current) return;
      setConversationError(
        error instanceof Error ? error.message : "A Alvitra está indisponível no momento."
      );
    } finally {
      condominiumConfirmationSending.current = false;
      if (scope === documentConversationScope.current) setChatDocumentUploading(false);
    }
  }

  function documentConfirmationControl(document: DocumentListItem) {
    if (document.condominiumCheck?.status !== "pending") return null;
    return (
      <button
        className="document-review-button"
        type="button"
        disabled={
          !canUpload ||
          document.condominiumId !== context?.condominiumId ||
          busy ||
          chatDocumentUploading
        }
        onClick={() => {
          const check = document.condominiumCheck;
          if (check === undefined) return;
          confirmationAnnouncement.current = "";
          setPendingCondominiumConfirmations((current) =>
            queueDocumentConfirmation(current, {
              document,
              check,
              message: "",
              scope: documentConversationScope.current
            })
          );
          setAccountMenuOpen(false);
          setDocumentLibraryOpen(false);
        }}
      >
        {document.condominiumId === context?.condominiumId
          ? "Conferir condomínio"
          : "Selecione este condomínio para conferir"}
      </button>
    );
  }

  async function askQuestion(message = question): Promise<void> {
    const trimmedQuestion = message.trim();
    if (trimmedQuestion.length === 0 || context === undefined || authMode === undefined) return;

    if (answer !== undefined && submittedQuestion !== "") {
      const previousTurn: ConversationHistoryEntry = {
        questionId: answer.questionId,
        question: submittedQuestion,
        answer,
        createdAt: answer.createdAt
      };
      saveTurn(previousTurn);
    }
    setAnswer(undefined);
    setResearchingWeb(false);
    setBusy(true);
    setSubmittedQuestion(trimmedQuestion);
    if (activeChatId !== undefined) {
      setChats((current) =>
        current.map((chat) =>
          chat.id === activeChatId && chat.title === "Nova conversa"
            ? { ...chat, title: buildConversationTitle(trimmedQuestion) }
            : chat
        )
      );
    }
    setQuestion("");
    setSelectedCitation(undefined);
    setFeedback(undefined);
    setConversationError("");
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), questionRequestTimeoutMs);
    try {
      const chatId = await ensureActiveChatSaved(buildConversationTitle(trimmedQuestion));
      const response = await conversationFetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/questions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            "x-alvitra-progress": "web",
            ...requestHeaders(authMode, developmentIdentity, setupManagerName)
          },
          signal: controller.signal,
          body: JSON.stringify({ question: trimmedQuestion, chatId })
        }
      );
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível processar a pergunta."));
      }
      const receivedAnswer = await readQuestionResponse(response, () => setResearchingWeb(true));
      setAnswer(receivedAnswer);
      saveTurn({
        questionId: receivedAnswer.questionId,
        question: trimmedQuestion,
        answer: receivedAnswer,
        createdAt: receivedAnswer.createdAt
      });
    } catch (error: unknown) {
      setAnswer(undefined);
      setQuestion((current) => (current === "" ? trimmedQuestion : current));
      setConversationError(
        error instanceof Error && error.name !== "AbortError"
          ? error.message
          : "A resposta demorou mais do que o esperado. Tente novamente."
      );
    } finally {
      window.clearTimeout(requestTimeout);
      setResearchingWeb(false);
      setBusy(false);
    }
  }

  async function ensureActiveChatSaved(title: string): Promise<string> {
    if (context === undefined || authMode === undefined || activeChatId === undefined)
      throw new Error("Conversa indisponível. Sua mensagem foi preservada.");
    if (activeChat?.persisted === true) return activeChatId;
    const saved = await saveChat(
      fetch,
      {
        condominiumId: context.condominiumId,
        headers: requestHeaders(authMode, developmentIdentity)
      },
      {
        id: activeChatId,
        title:
          activeChat?.title !== undefined && activeChat.title !== "Nova conversa"
            ? activeChat.title
            : title
      }
    );
    setChats((current) =>
      current.map((chat) =>
        chat.id === saved.id ? { ...chat, title: saved.title, persisted: true } : chat
      )
    );
    return saved.id;
  }

  function saveTurn(turn: ConversationHistoryEntry): void {
    if (activeChatId === undefined) return;
    setChats((current) =>
      current.map((chat) =>
        chat.id !== activeChatId
          ? chat
          : {
              ...chat,
              title:
                chat.title === "Nova conversa" ? buildConversationTitle(turn.question) : chat.title,
              entries: [
                ...chat.entries.filter((entry) => entry.answer.answerId !== turn.answer.answerId),
                turn
              ]
            }
      )
    );
  }

  function preserveActiveTurn(): void {
    if (answer !== undefined && submittedQuestion !== "") {
      saveTurn({
        questionId: answer.questionId,
        question: submittedQuestion,
        answer,
        createdAt: answer.createdAt
      });
    }
    setAnswer(undefined);
    setSubmittedQuestion("");
    setSelectedCitation(undefined);
    setFeedback(undefined);
  }

  async function createChat(): Promise<void> {
    if (busy || chatDocumentUploading) return;
    preserveActiveTurn();
    const chat = createEmptyChat<ConversationHistoryEntry>();
    setBusy(true);
    setConversationError("");
    try {
      if (context && authMode)
        await saveChat(
          fetch,
          {
            condominiumId: context.condominiumId,
            headers: requestHeaders(authMode, developmentIdentity)
          },
          chat
        );
      const greeting = await requestSetupMessage(
        {
          stage: "new_conversation",
          ...(setupManagerName.trim() === "" ? {} : { managerName: setupManagerName })
        },
        developmentIdentity,
        context ? { condominiumId: context.condominiumId, chatId: chat.id } : undefined
      );
      setChats((current) =>
        startNewChat(current, () => chat.id).chats.map((item) =>
          item.id === chat.id ? { ...item, persisted: true } : item
        )
      );
      setActiveChatId(chat.id);
      setSetupMessages([{ id: crypto.randomUUID(), role: "assistant", text: greeting }]);
      setSetupChatId(chat.id);
      setQuestion("");
      setAttachmentMenuOpen(false);
      setSidebarOpen(false);
    } catch (error: unknown) {
      setConversationError(
        error instanceof Error ? error.message : "Não foi possível iniciar uma nova conversa."
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectChat(chatId: string): Promise<void> {
    if (busy || chatDocumentUploading || chatId === activeChatId) return;
    const chat = chats.find((item) => item.id === chatId);
    if (chat === undefined || context === undefined || authMode === undefined) return;
    preserveActiveTurn();
    setBusy(true);
    setConversationError("");
    try {
      if (chat.persisted === true) {
        const history = await loadSavedChat<ConversationHistoryEntry>(
          fetch,
          {
            condominiumId: context.condominiumId,
            headers: requestHeaders(authMode, developmentIdentity)
          },
          chatId
        );
        setChats((current) =>
          current.map((item) => (item.id === chatId ? { ...item, ...history, loaded: true } : item))
        );
      }
      setActiveChatId(chatId);
      setSidebarOpen(false);
    } catch (error) {
      setConversationError(
        error instanceof Error ? error.message : "Não foi possível abrir a conversa."
      );
    } finally {
      setBusy(false);
    }
  }

  async function renameChat(chatId: string): Promise<void> {
    const chat = chats.find((item) => item.id === chatId);
    if (chat === undefined) return;
    const title = window.prompt("Nome da conversa", chat.title)?.trim();
    if (title === undefined || title.length === 0) return;
    if (context === undefined || authMode === undefined || busy || chatDocumentUploading) return;
    setBusy(true);
    try {
      const scope = {
        condominiumId: context.condominiumId,
        headers: requestHeaders(authMode, developmentIdentity)
      };
      if (chat.persisted !== true) await saveChat(fetch, scope, { id: chatId, title });
      else await changeSavedChat(fetch, scope, chatId, title);
      setChats((current) =>
        current.map((item) => (item.id === chatId ? { ...item, title, persisted: true } : item))
      );
    } catch (error) {
      setConversationError(
        error instanceof Error ? error.message : "Não foi possível renomear a conversa."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteChat(chatId: string): Promise<void> {
    const chat = chats.find((item) => item.id === chatId);
    if (chat === undefined || !window.confirm(`Excluir a conversa “${chat.title}”?`)) return;
    if (context === undefined || authMode === undefined || busy || chatDocumentUploading) return;
    setBusy(true);
    try {
      if (chat.persisted === true)
        await changeSavedChat(
          fetch,
          {
            condominiumId: context.condominiumId,
            headers: requestHeaders(authMode, developmentIdentity)
          },
          chatId
        );
      if (activeChatId === chatId) preserveActiveTurn();
      const remaining = chats.filter((item) => item.id !== chatId);
      setChats(remaining);
      if (activeChatId === chatId) {
        const session = startNewChat(remaining);
        setChats(session.chats);
        setActiveChatId(session.activeChatId);
      }
    } catch (error) {
      setConversationError(
        error instanceof Error ? error.message : "Não foi possível excluir a conversa."
      );
    } finally {
      setBusy(false);
    }
  }

  function sendComposer(): void {
    if (composerSending.current || busy || chatDocumentUploading) return;
    composerSending.current = true;
    const finish = () => {
      composerSending.current = false;
    };
    if (pendingChatDocuments.length > 0) {
      void addChatDocuments(pendingChatDocuments).finally(finish);
      return;
    }
    const decisionMessage = question.trim();
    const decision =
      pendingCondominiumConfirmation === undefined
        ? undefined
        : readDocumentUseDecision(decisionMessage);
    if (pendingCondominiumConfirmation !== undefined && decision !== undefined) {
      const sending =
        decision === "confirm"
          ? confirmPendingDocument(pendingCondominiumConfirmation, decisionMessage)
          : cancelDocumentUse(decisionMessage);
      void sending.finally(finish);
      return;
    }
    if (setupStage !== "complete") {
      void advanceSetup(question).finally(finish);
      return;
    }
    void askQuestion().finally(finish);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (
      !busy &&
      !chatDocumentUploading &&
      (question.trim().length > 0 || pendingChatDocuments.length > 0)
    )
      sendComposer();
  }

  async function submitFeedback(classification: FeedbackClassification): Promise<void> {
    if (answer === undefined || authMode === undefined) return;
    try {
      const response = await conversationFetch(
        `/v1/condominiums/${encodeURIComponent(answer.condominiumId)}/answers/${encodeURIComponent(answer.answerId)}/feedback`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            ...requestHeaders(authMode, developmentIdentity)
          },
          body: JSON.stringify({ classification })
        }
      );
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível registrar sua avaliação."));
      }
      setFeedback(classification);
    } catch (error: unknown) {
      setConversationError(
        error instanceof Error ? error.message : "Não foi possível registrar sua avaliação."
      );
    }
  }

  if (!entered) {
    return (
      <main className="login-page">
        <form
          className="login-card"
          aria-labelledby="login-title"
          onSubmit={(event) => {
            event.preventDefault();
            if (entryPending || restorePending) return;
            setEntryPending(true);
            setConversationError("");
            void requestAccessSession(fetch, accessCode)
              .then(async (identity) => {
                if (identity) {
                  setAccessCode("");
                  // O cookie já foi confirmado; a abertura da conversa tem seu próprio progresso.
                  setEntryPending(false);
                  await enterConversation(identity);
                }
              })
              .catch((error: unknown) =>
                setConversationError(
                  error instanceof Error ? error.message : "Não foi possível acessar agora."
                )
              )
              .finally(() => setEntryPending(false));
          }}
        >
          <div className="login-brand">
            <strong>Alvitra</strong>
          </div>
          <div>
            <p className="login-kicker">Sua assistente para cuidar do condomínio</p>
            <h1 id="login-title">Cuidar bem começa com uma boa conversa.</h1>
            <p>Entre para conversar com a Alvitra e organizar seus condomínios em um só lugar.</p>
          </div>
          <div className="login-fields">
            <label htmlFor="login-code">Código de acesso</label>
            <input
              id="login-code"
              name="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              minLength={32}
              maxLength={64}
              placeholder="Digite o código fornecido pela equipe"
              required
              autoFocus
            />
            <p className="login-notice">
              Use o código fornecido pela equipe. Seu acesso fica salvo neste navegador. Para
              conectar outro aparelho, encontre seu código em Perfil.
            </p>
          </div>
          <button
            className="login-entry-button"
            type="submit"
            disabled={
              authMode === undefined ||
              runtimePending ||
              entryPending ||
              restorePending ||
              !accessCodeEnabled
            }
          >
            {restorePending ? "Retomando acesso..." : entryPending ? "Entrando..." : "Entrar"}
          </button>
          {conversationError === "" ? null : <p role="alert">{conversationError}</p>}
          {conversationError !== "" && !runtimePending && accessCodeEnabled ? (
            <button
              type="button"
              className="login-retry"
              onClick={() => {
                setConversationError("");
                setRestoreRevision((value) => value + 1);
              }}
            >
              Tentar retomar acesso
            </button>
          ) : null}
          {!runtimePending && !accessCodeEnabled ? (
            <p role="status">A entrada por código ainda não está configurada neste ambiente.</p>
          ) : null}
          {authMode === "development" ? (
            <p className="login-notice">Ambiente de demonstração com dados de teste.</p>
          ) : null}
        </form>
      </main>
    );
  }

  const documentViewer =
    viewedDocument === undefined ? null : (
      <DocumentViewer
        document={viewedDocument}
        headers={requestHeaders(authMode, developmentIdentity)}
        onClose={() => setViewedDocument(undefined)}
      />
    );

  return (
    <main className={`chat-page${conversationStarted ? " has-conversation" : ""}`}>
      <header className="chat-header">
        <button
          className="chat-list-button"
          type="button"
          aria-label="Abrir conversas"
          aria-expanded={sidebarOpen}
          aria-controls="chat-sidebar"
          onClick={() => {
            setAccountMenuOpen(false);
            setSidebarCondominiumId(context?.condominiumId);
            setSidebarOpen(true);
          }}
        >
          <SidebarIcon />
        </button>
        <div className="brand-lockup">
          <div>
            <strong>Alvitra</strong>
          </div>
        </div>
        <div className="header-actions">
          <div className="service-state">
            <span aria-hidden="true" />
            {currentCondominium === undefined ? serviceLabel : currentCondominium.name}
          </div>
          <button
            className="account-menu-button"
            type="button"
            aria-label="Abrir menu da conta"
            aria-expanded={accountMenuOpen}
            aria-controls="account-menu"
            onClick={() => {
              if (accountMenuOpen) setAccountMenuOpen(false);
              else void openAccountMenu();
            }}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {accountMenuOpen ? (
        <section id="account-menu" className="account-menu" aria-label="Documentos e conta">
          {accountMenuView === "profile" ? (
            <>
              <button
                className="account-menu-back"
                type="button"
                onClick={() => setAccountMenuView("home")}
              >
                ‹ Voltar aos documentos
              </button>
              <div className="profile-menu" aria-label="Perfil">
                <h2>Perfil</h2>
                <div className="profile-summary">
                  <span className="profile-avatar" aria-hidden="true">
                    {setupManagerName.trim().charAt(0).toLocaleUpperCase("pt-BR") || "P"}
                  </span>
                  <div>
                    <strong>{setupManagerName.trim() || "Seu perfil"}</strong>
                    <small>Síndico</small>
                  </div>
                </div>
                <div className="profile-appearance">
                  <label htmlFor="profile-appearance">Aparência</label>
                  <select
                    id="profile-appearance"
                    value={appearance}
                    onChange={(event) =>
                      changeAppearance(event.target.value === "dark" ? "dark" : "light")
                    }
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                  </select>
                </div>
                {accessCodeEnabled ? <AccessCodeConnection /> : null}
                {signOutError === "" ? null : <p role="alert">{signOutError}</p>}
                {authMode === "development" ? (
                  <p className="profile-demo-notice">Acesso provisório para testes.</p>
                ) : null}
                <button
                  className="profile-option profile-sign-out"
                  type="button"
                  disabled={signOutPending}
                  onClick={() => void leaveAccount()}
                >
                  {signOutPending ? "Saindo..." : "Sair da conta"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="documents-panel-heading">
                <div>
                  <span>DOCUMENTOS</span>
                  <h2>{currentCondominiumName}</h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar documentos"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  ×
                </button>
              </div>
              <button
                className="documents-profile-button"
                type="button"
                onClick={() => setAccountMenuView("profile")}
              >
                Perfil <span aria-hidden="true">›</span>
              </button>
              {context === undefined ? (
                <p className="documents-panel-note">
                  Escolha ou configure um condomínio pela conversa para ver seus documentos.
                </p>
              ) : (
                <>
                  <button
                    className="library-expand-button"
                    type="button"
                    onClick={() => {
                      setDocumentLibrarySection("all");
                      setDocumentLibraryOpen(true);
                    }}
                  >
                    Melhor visualização <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    className="library-expand-button"
                    type="button"
                    onClick={() => {
                      setDocumentLibrarySection("financial_statement");
                      setDocumentLibraryOpen(true);
                    }}
                  >
                    Balancetes <span aria-hidden="true">↗</span>
                  </button>
                  {documentsPending ? (
                    <p role="status">Carregando documentos autorizados...</p>
                  ) : documentsError !== "" ? (
                    <div role="alert">
                      <p>{documentsError}</p>
                      <button
                        type="button"
                        onClick={() => setDocumentsRevision((revision) => revision + 1)}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentAvailability documents={documents} />
                      <div className="documents-panel-list">
                        <h2>
                          Documentos enviados <span>{documents.length}</span>
                        </h2>
                        {documents.length === 0 ? (
                          <p>
                            Envie documentos pela conversa quando precisar. Seus arquivos aparecerão
                            aqui.
                          </p>
                        ) : (
                          <LibraryDocumentList
                            documents={documents}
                            onOpen={setViewedDocument}
                            confirmationControl={documentConfirmationControl}
                          />
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </section>
      ) : null}

      <aside
        id="chat-sidebar"
        className={`chat-sidebar${sidebarOpen ? " is-open" : ""}`}
        aria-label="Condomínios e conversas"
        inert={!sidebarOpen}
      >
        <div className="sidebar-heading">
          <strong>{sidebarCondominiumId === undefined ? "Condomínios" : "Conversas"}</strong>
          <button type="button" aria-label="Fechar conversas" onClick={() => setSidebarOpen(false)}>
            ×
          </button>
        </div>
        {condominiumsError !== "" ? <p role="alert">{condominiumsError}</p> : null}
        {sidebarCondominiumId === undefined ? (
          <div className="condominium-directory">
            <p>Seus condomínios, cada conversa no seu lugar.</p>
            {condominiumsPending ? (
              <p role="status">Carregando condomínios autorizados...</p>
            ) : null}
            {condominiums.map((item) => {
              const isSelected = item.condominiumId === context?.condominiumId;
              return (
                <button
                  type="button"
                  className={`condominium-directory-item${isSelected ? " is-selected" : ""}`}
                  key={item.condominiumId}
                  disabled={
                    condominiumsPending ||
                    busy ||
                    chatDocumentUploading ||
                    setupStage !== "complete"
                  }
                  onClick={() => void switchCondominium(item)}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <span className="condominium-initial" aria-hidden="true">
                    {item.name.trim().charAt(0).toLocaleUpperCase("pt-BR")}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {isSelected ? "Em conversa · " : ""}
                      {item.detail}
                    </small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
            {!condominiumsPending && condominiumsError === "" && condominiums.length === 0 ? (
              <p>Você ainda não configurou nenhum condomínio.</p>
            ) : null}
            {condominiumsError !== "" ? (
              <button
                type="button"
                onClick={() => {
                  setCondominiumsRevision((revision) => revision + 1);
                }}
              >
                Tentar novamente
              </button>
            ) : null}
            <button
              className="start-condominium-chat"
              type="button"
              disabled={busy || chatDocumentUploading || setupStage !== "complete"}
              onClick={() => void startCondominiumConversation()}
            >
              + Adicionar condomínio pela conversa
            </button>
          </div>
        ) : sidebarCondominiumId === context?.condominiumId ? (
          <div className="condominium-chat-section">
            <button
              className="sidebar-back-button"
              type="button"
              disabled={busy}
              onClick={() => setSidebarCondominiumId(undefined)}
            >
              ‹ Todos os condomínios
            </button>
            <h2>{currentCondominiumName}</h2>
            <button
              className="new-chat-button"
              type="button"
              onClick={() => void createChat()}
              disabled={
                setupStage !== "complete" || context === undefined || busy || chatDocumentUploading
              }
            >
              + Nova conversa
            </button>
            <nav className="chat-history" aria-label={`Conversas de ${currentCondominiumName}`}>
              {chats.map((chat) => (
                <div
                  className={`chat-history-item${chat.id === activeChatId ? " is-active" : ""}`}
                  key={chat.id}
                >
                  <button
                    type="button"
                    onClick={() => selectChat(chat.id)}
                    disabled={busy || chatDocumentUploading}
                    aria-current={chat.id === activeChatId ? "page" : undefined}
                  >
                    {chat.title}
                  </button>
                  <div>
                    <button
                      type="button"
                      disabled={busy || chatDocumentUploading}
                      aria-label={`Renomear ${chat.title}`}
                      onClick={() => renameChat(chat.id)}
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      disabled={busy || chatDocumentUploading}
                      aria-label={`Excluir ${chat.title}`}
                      onClick={() => deleteChat(chat.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </nav>
          </div>
        ) : null}
      </aside>
      {sidebarOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar conversas"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <section className="conversation" aria-label="Conversa com a Alvitra">
        <div className="messages" aria-live="polite">
          {offlineDemo ? (
            <p className="operational-notice" role="status">
              Modo local de teste, sem IA externa. A configuração conversacional de um novo perfil
              está indisponível. Contextos já configurados podem consultar documentos autorizados;
              as respostas locais são simulações, não validação de IA.
            </p>
          ) : null}
          {timelineError === "" ? null : (
            <p className="interface-status" role="alert">
              {timelineError}
            </p>
          )}
          {currentTimeline?.nextCursor ? (
            <button type="button" onClick={() => void loadEarlierMessages()}>
              Carregar mensagens anteriores
            </button>
          ) : null}
          {canonicalMessages
            .filter(
              (message) =>
                !(
                  pendingCondominiumConfirmation?.conversationMessageId &&
                  documentConversationMessages.some(
                    (local) =>
                      local.id === pendingCondominiumConfirmation.conversationMessageId &&
                      local.text === message.text
                  )
                ) &&
                message.id !== answer?.answerId &&
                !currentTimeline?.entries.some(
                  (entry) =>
                    entry.messages.some((item) => item.id === answer?.answerId) &&
                    entry.messages.some((item) => item.id === message.id)
                )
            )
            .map((message) =>
              message.role === "user" ? (
                message.kind === "upload" ? (
                  <RecordedDocumentUpload
                    key={message.id}
                    name={message.text}
                    document={canonicalUploads.get(message.id)}
                    items={documentUploadProgress}
                    catalog={
                      documentCatalog?.condominiumId === context?.condominiumId
                        ? documents
                        : undefined
                    }
                    catalogPending={documentsPending}
                    catalogError={documentsError}
                    onOpen={setViewedDocument}
                  />
                ) : (
                  <div className="user-message" key={message.id}>
                    <p>{message.text}</p>
                  </div>
                )
              ) : message.answer ? (
                <AnswerMessage
                  key={message.id}
                  answer={message.answer}
                  question=""
                  compact
                  onSelectCitation={openCitation}
                  onPrepareDocument={(value) =>
                    setDocumentSelection({ scope: timelineScope, answer: value })
                  }
                />
              ) : (
                <article className="assistant-message" key={message.id}>
                  <p>
                    <FormattedText text={message.text} />
                  </p>
                </article>
              )
            )}
          {visibleSetupMessages
            .filter(
              (message) =>
                message.text.trim() !== "" && !canonicalTexts.has(`${message.role}:${message.text}`)
            )
            .map((message) =>
              message.role === "assistant" ? (
                <article className="assistant-message setup-message" key={message.id}>
                  <p>
                    <FormattedText text={message.text} />
                  </p>
                </article>
              ) : (
                <div className="user-message" key={message.id}>
                  <p>{message.text}</p>
                </div>
              )
            )}

          {(activeChat?.attachments ?? [])
            .filter(
              (attachment) =>
                !currentTimeline?.entries.some(
                  (entry) =>
                    entry.metadata.documentVersionId === attachment.documentVersionId &&
                    entry.messages.some((message) => message.kind === "upload")
                ) &&
                !documentUploadProgress.some(
                  (item) => item.document?.documentVersionId === attachment.documentVersionId
                )
            )
            .map((attachment) => (
              <div className="user-message document-message" key={attachment.documentVersionId}>
                <DocumentIcon />
                <button
                  type="button"
                  className="document-open-button"
                  onClick={() => {
                    if (context !== undefined)
                      setViewedDocument({ ...attachment, condominiumId: context.condominiumId });
                  }}
                >
                  {attachment.title}
                </button>
              </div>
            ))}

          {setupStage === "complete"
            ? conversationHistory
                .filter(
                  (entry) =>
                    !canonicalMessages.some((message) => message.id === entry.answer.answerId)
                )
                .map((entry) => (
                  <div className="conversation-turn" key={entry.answer.answerId}>
                    <div className="user-message">
                      <p>{entry.question}</p>
                    </div>
                    <AnswerMessage
                      answer={entry.answer}
                      question={entry.question}
                      compact
                      onSelectCitation={openCitation}
                    />
                  </div>
                ))
            : null}

          {entryPending ? (
            <div className="assistant-message loading-message" role="status">
              <div>
                <strong>Entrando na conversa</strong>
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          ) : null}

          <DocumentBatchProgress
            items={documentUploadProgress}
            recordedDocuments={[...canonicalUploads.values()]}
            onOpen={setViewedDocument}
          />

          {chatDocumentMessageIsError && chatDocumentMessage !== "" ? (
            <p className="interface-status" role="alert">
              {chatDocumentMessage}
            </p>
          ) : chatDocumentUploading ? (
            <span
              className="typing-dots"
              role="status"
              aria-label={
                chatDocumentMessage || "A Alvitra está preparando a resposta sobre o documento."
              }
            >
              <i />
              <i />
              <i />
            </span>
          ) : null}

          {documentConversationMessages
            .filter(
              (message) =>
                pendingCondominiumConfirmation?.conversationMessageId === message.id ||
                !canonicalTexts.has(
                  `${message.role}:${message.answer?.answer ?? message.batch?.summary?.answer ?? message.text}`
                )
            )
            .map((message) => {
              const documentAnswer = message.answer ?? message.batch?.summary;
              return message.role === "user" ? (
                <div className="user-message" key={message.id}>
                  <p>{message.text}</p>
                </div>
              ) : pendingCondominiumConfirmation?.conversationMessageId === message.id ? (
                <DocumentCondominiumConfirmation key={message.id} message={message.text} />
              ) : documentAnswer !== undefined ? (
                <AnswerMessage
                  key={message.id}
                  answer={documentAnswer}
                  question=""
                  onSelectCitation={openCitation}
                />
              ) : (
                <article className="assistant-message" key={message.id}>
                  {message.text === "" ? null : <p>{message.text}</p>}
                </article>
              );
            })}

          {pendingCondominiumConfirmation !== undefined &&
          pendingCondominiumConfirmation.conversationMessageId === undefined ? (
            <aside className="interface-status" aria-label="Confirmação de documento pendente">
              <p>
                {pendingCondominiumConfirmation.document.title}: confirmação necessária para usar em{" "}
                {pendingCondominiumConfirmation.check.expectedName}. A fala da Alvitra está
                indisponível.
              </p>
            </aside>
          ) : null}

          {submittedQuestion === "" ? null : (
            <div className="user-message">
              <p>{submittedQuestion}</p>
            </div>
          )}

          {busy && submittedQuestion !== "" ? (
            <div className="assistant-message loading-message thinking-message" role="status">
              <div>
                <strong>{researchingWeb ? "Pesquisando na internet" : "Pensando..."}</strong>
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          ) : null}

          {conversationError === "" || runtimePending || entryPending ? null : (
            <p className="interface-status" role="alert">
              {conversationError}
            </p>
          )}

          {answer === undefined ? null : (
            <div className="current-answer">
              <AnswerMessage
                answer={answer}
                question={submittedQuestion}
                onSelectCitation={openCitation}
                onPrepareDocument={(value) =>
                  setDocumentSelection({ scope: timelineScope, answer: value })
                }
              />
              {isSimpleConversationMessage(submittedQuestion) ? null : (
                <div className="feedback" aria-label="Avaliar resposta">
                  <span>Esta resposta ajudou?</span>
                  {(["correct", "incorrect", "incomplete", "outdated"] as const).map(
                    (classification) => (
                      <button
                        type="button"
                        key={classification}
                        className={feedback === classification ? "selected" : ""}
                        onClick={() => void submitFeedback(classification)}
                      >
                        {
                          {
                            correct: "Correta",
                            incorrect: "Incorreta",
                            incomplete: "Incompleta",
                            outdated: "Desatualizada"
                          }[classification]
                        }
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {selectedCitation === undefined ||
          (!selectedCitation.sourceRemoved &&
            selectedCitation.sourceScope !== "legislation") ? null : (
            <aside className="source-viewer" aria-label="Trecho da fonte">
              <div>
                <span>{selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"}</span>
                <h2>{selectedCitation.title}</h2>
                <p>
                  {selectedCitation.sourceRemoved ? "Fonte atual indisponível · " : "Versão "}
                  {selectedCitation.documentVersionId} · página {selectedCitation.page}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedCitation(undefined)}>
                Fechar
              </button>
              <blockquote>{selectedCitation.excerpt}</blockquote>
              {selectedCitation.sourceScope === "legislation" &&
              context !== undefined &&
              !selectedCitation.sourceRemoved ? (
                <button
                  type="button"
                  onClick={() =>
                    setViewedDocument({
                      condominiumId: context.condominiumId,
                      documentVersionId: selectedCitation.documentVersionId,
                      legalSourceId: selectedCitation.documentId,
                      title: selectedCitation.title,
                      page: selectedCitation.page
                    })
                  }
                >
                  Abrir cópia de consulta
                </button>
              ) : null}
            </aside>
          )}
          {!context || !activeChatId || audioComposerScope !== timelineScope ? null : (
            <AudioMinutesComposer
              key={`audio:${timelineScope}`}
              condominiumId={context.condominiumId}
              chatId={activeChatId}
              headers={requestHeaders(authMode, developmentIdentity)}
              prepareChat={async () => {
                const saved = await ensureActiveChatSaved("Ata a partir de áudio");
                if (saved !== activeChatId)
                  throw new Error("A conversa mudou. Abra novamente o pedido de ata.");
              }}
              onDraft={(draft) => {
                setAudioDraftSelection({ scope: timelineScope, draft });
                setTimelineRevision((value) => value + 1);
              }}
              onClose={() => setAudioComposerScope(undefined)}
            />
          )}
          {!context || !activeChatId || !canUpload ? null : (
            <DocumentAuthoringComposer
              key={`original:${timelineScope}`}
              condominiumId={context.condominiumId}
              chatId={activeChatId}
              headers={requestHeaders(authMode, developmentIdentity)}
              originalsOnly
              refreshKey={timelineRevision}
              onDraft={(draft) => setAudioDraftSelection({ scope: timelineScope, draft })}
            />
          )}
          {!context || !activeChatId ? null : (
            <DocumentDraftComposer
              key={timelineScope}
              condominiumId={context.condominiumId}
              chatId={activeChatId}
              headers={requestHeaders(authMode, developmentIdentity)}
              {...(audioDraftSelection?.scope === timelineScope
                ? { draftSelection: audioDraftSelection.draft }
                : {})}
              {...(documentSelection?.scope === timelineScope
                ? { selection: documentSelection.answer }
                : {})}
            />
          )}
          <div ref={messagesEnd} />
        </div>
      </section>

      <footer className="composer-wrap">
        <div className="composer">
          <PendingDocumentAttachments
            files={pendingChatDocuments}
            sending={chatDocumentUploading}
            disabled={chatDocumentUploading || busy}
            onRemove={(file) =>
              setPendingChatDocuments((current) => current.filter((pending) => pending !== file))
            }
          />
          <div className="composer-row">
            <input
              ref={chatDocumentInput}
              className="visually-hidden"
              type="file"
              multiple
              disabled={!canUpload || setupStage !== "complete" || busy || chatDocumentUploading}
              accept={
                attachmentPickerKind === "document"
                  ? "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  : "image/jpeg,.jpg,.jpeg,image/png,.png"
              }
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                selectChatDocuments(files);
              }}
            />
            <div className="attachment-menu-wrap">
              <button
                className="attach-button"
                type="button"
                aria-label="Adicionar documento ou foto"
                title="Adicionar documento ou foto"
                aria-expanded={attachmentMenuOpen}
                aria-controls="attachment-menu"
                disabled={!canUpload || setupStage !== "complete" || busy || chatDocumentUploading}
                onClick={() => setAttachmentMenuOpen((current) => !current)}
              >
                <PlusIcon />
              </button>
              {attachmentMenuOpen ? (
                <div id="attachment-menu" className="attachment-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => chooseAttachment("document")}
                  >
                    Enviar documento
                    <small>PDF ou Word</small>
                  </button>
                  <button type="button" role="menuitem" onClick={() => chooseAttachment("photo")}>
                    Enviar foto
                    <small>JPG ou PNG</small>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!context || !activeChatId || setupStage !== "complete"}
                    onClick={() => {
                      setAudioComposerScope(timelineScope);
                      setAttachmentMenuOpen(false);
                    }}
                  >
                    Enviar áudio e pedir ata
                    <small>Relato ou gravação de reunião</small>
                  </button>
                </div>
              ) : null}
            </div>
            <textarea
              ref={composerInput}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={
                setupStage === "manager_name"
                  ? "Digite como prefere ser chamado(a)..."
                  : setupStage === "condominium_count"
                    ? "Digite quantos condomínios você administra..."
                    : setupStage === "condominium_name"
                      ? "Digite o nome do condomínio..."
                      : setupStage === "unit_count"
                        ? "Digite a quantidade de apartamentos..."
                        : "Converse com a Alvitra..."
              }
              aria-label="Mensagem para a Alvitra"
              rows={1}
              maxLength={4000}
              disabled={composerDisabled}
            />
            <button
              className="send-button"
              type="button"
              onClick={sendComposer}
              disabled={
                authMode === undefined ||
                (offlineDemo && setupStage !== "complete") ||
                (setupStage === "complete" && context === undefined) ||
                busy ||
                chatDocumentUploading ||
                (pendingChatDocuments.length === 0 && question.trim().length === 0)
              }
              aria-label={
                pendingChatDocuments.length === 0
                  ? "Enviar mensagem"
                  : pendingChatDocuments.length === 1
                    ? "Enviar documento selecionado"
                    : `Enviar ${pendingChatDocuments.length} arquivos selecionados`
              }
            >
              <SendIcon />
            </button>
          </div>
        </div>
        <p>A Alvitra pode cometer erros. Confira as fontes e valide decisões importantes.</p>
      </footer>
      {documentLibraryOpen && context !== undefined ? (
        <DocumentLibrary
          key={context.condominiumId}
          condominiumId={context.condominiumId}
          condominiumName={currentCondominiumName}
          documents={documents}
          initialSection={documentLibrarySection}
          pending={documentsPending}
          error={documentsError}
          onRetry={() => setDocumentsRevision((revision) => revision + 1)}
          onClose={() => setDocumentLibraryOpen(false)}
          onOpen={setViewedDocument}
          confirmationControl={documentConfirmationControl}
        />
      ) : null}
      {documentViewer}
    </main>
  );
}
