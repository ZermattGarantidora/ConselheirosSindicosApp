import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { isSimpleConversationMessage } from "../shared/conversation-intent.js";
import {
  getAnswerStatusPresentation,
  isAutomaticDocumentaryLimitation
} from "./answer-presentation.js";
import {
  buildConversationTitle,
  buildConversationTitleFromQuestions
} from "./conversation-title.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "./document-upload-request.js";
import {
  createDevelopmentIdentity,
  loadDevelopmentIdentity,
  loadDevelopmentSetupProfile,
  rememberDevelopmentCondominium,
  rememberDevelopmentManagerName,
  saveDevelopmentIdentity,
  type DevelopmentIdentity
} from "./development-identity.js";
import { splitBoldText } from "./message-format.js";
import type { DocumentAnalysisReport } from "../api/analysis/document-analysis.js";

type AuthMode = "development" | "real";
type AiProvider = "openai" | "gemini" | "local" | "unavailable";

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

type Chat = Readonly<{
  id: string;
  title: string;
  entries: readonly ConversationHistoryEntry[];
}>;

type CondominiumListItem = Readonly<{
  condominiumId: string;
  name: string;
  detail: string;
  role: string;
  permissions: readonly string[];
}>;

type DocumentListItem = Readonly<{
  condominiumId: string;
  condominiumName: string;
  documentId: string;
  title: string;
  documentType: "convention" | "internal_rules" | "meeting_minutes" | "contract" | "other";
  processingStatus: string;
}>;

type AccountMenuView = "home" | "condominiums" | "documents" | "current_documents";
type DocumentScreen = "current";
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
type DocumentMemoryStatus = "ready" | "pending_confirmation" | "needs_review" | "failed";

const documentTypeLabels = Object.freeze({
  convention: "Convenções",
  internal_rules: "Regimentos internos",
  meeting_minutes: "Atas",
  contract: "Contratos",
  other: "Outros documentos"
});

function calculateKnowledgeProgress(documents: readonly DocumentListItem[]): number {
  const readyTypes = new Set(
    documents
      .filter((document) => document.processingStatus === "ready")
      .map((document) => document.documentType)
  );
  const weights: Readonly<Record<DocumentListItem["documentType"], number>> = {
    convention: 40,
    internal_rules: 20,
    meeting_minutes: 15,
    contract: 10,
    other: 15
  };
  return [...readyTypes].reduce((total, type) => total + weights[type], 0);
}

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

function isPdf(file: Pick<File, "type" | "name">): boolean {
  return file.type === "application/pdf" || file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf");
}

function chatFileMediaType(
  file: Pick<File, "type" | "name">
): "application/pdf" | "image/jpeg" | "image/png" | undefined {
  const name = file.name.toLocaleLowerCase("pt-BR");
  if (isPdf(file)) return "application/pdf";
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (file.type === "image/png" || name.endsWith(".png")) return "image/png";
  return undefined;
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
  return splitBoldText(text).map((segment, index) =>
    segment.bold ? <strong key={`${segment.text}-${index}`}>{segment.text}</strong> : segment.text
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

function AnswerSources({
  citations,
  onSelect
}: Readonly<{
  citations: readonly Citation[];
  onSelect: (citation: Citation) => void;
}>) {
  if (citations.length === 0) return null;

  return (
    <section className="source-list" aria-label="Fontes da resposta">
      <div className="source-list-heading">
        <strong>Fontes da resposta</strong>
        <span>{citations.length} trecho(s)</span>
      </div>
      {citations.map((citation) => (
        <button type="button" key={citation.id} onClick={() => onSelect(citation)}>
          <span className="source-icon">
            <DocumentIcon />
          </span>
          <span>
            <strong>{citation.title}</strong>
            <small>
              {citation.sourceRemoved
                ? "Documento removido · trecho histórico"
                : citation.sourceScope === "legislation"
                  ? "Legislação oficial"
                  : "Documento do condomínio"}
              {` · página ${citation.page}`}
            </small>
          </span>
          <b aria-hidden="true">›</b>
        </button>
      ))}
    </section>
  );
}

export function AnswerMessage({
  answer,
  question,
  onSelectCitation,
  compact = false
}: Readonly<{
  answer: PublicAnswer;
  question: string;
  onSelectCitation: (citation: Citation) => void;
  compact?: boolean;
}>) {
  const isConversationalResponse = isSimpleConversationMessage(question);
  const attentionPoints = answer.attentionPoints.filter(
    (point) => !isRelevantServiceDegradation(point) && !isAutomaticDocumentaryLimitation(point)
  );
  const answerStatus = getAnswerStatusPresentation(answer.answerMode);
  const showGuidance =
    !compact &&
    !isConversationalResponse &&
    (attentionPoints.length > 0 || answer.suggestedNextStep !== null || answer.specialist.required);

  return (
    <>
      <article className="assistant-message answer-message">
        {isConversationalResponse || answerStatus === null ? null : (
          <div className="answer-meta">
            <span className={`answer-status ${answerStatus.tone}`}>{answerStatus.label}</span>
          </div>
        )}
        <p className="answer-copy">
          <FormattedText text={answer.answer} />
        </p>
        {showGuidance ? (
          <div className="answer-guidance">
            {attentionPoints.map((point) => (
              <p key={point}>
                <strong>Atenção:</strong> <FormattedText text={point} />
              </p>
            ))}
            {answer.suggestedNextStep === null ? null : (
              <p>
                <strong>Próximo passo:</strong> <FormattedText text={answer.suggestedNextStep} />
              </p>
            )}
            {!answer.specialist.required ? null : (
              <p>
                <strong>Valide com {answer.specialist.type ?? "um especialista"}:</strong>{" "}
                <FormattedText text={answer.specialist.reason ?? ""} />
              </p>
            )}
          </div>
        ) : null}
      </article>
      {answer.documentAnalysis === undefined ? null : (
        <section className="document-analysis" aria-label="Conferência documental calculada">
          <strong>{answer.documentAnalysis.title}</strong>
          <p>Relatório calculado a partir dos documentos disponíveis neste turno.</p>
          {answer.documentAnalysis.rows.map((row, index) => (
            <div key={`${row.label}:${index}`}>
              <p>
                <strong>{row.label}</strong>: {row.detail}
              </p>
              <AnswerSources citations={row.citations} onSelect={onSelectCitation} />
            </div>
          ))}
          {answer.documentAnalysis.limitations.map((limitation) => (
            <p key={limitation}>{limitation}</p>
          ))}
        </section>
      )}
      {isConversationalResponse ? null : (
        <AnswerSources citations={answer.citations} onSelect={onSelectCitation} />
      )}
    </>
  );
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>();
  const [aiProvider, setAiProvider] = useState<AiProvider>("unavailable");
  const [entered, setEntered] = useState(false);
  const rememberedDevelopmentIdentity = useMemo(
    () =>
      typeof window === "undefined" ? undefined : loadDevelopmentIdentity(window.localStorage),
    []
  );
  const [loginName, setLoginName] = useState(rememberedDevelopmentIdentity?.displayName ?? "");
  const [developmentIdentity, setDevelopmentIdentity] = useState<DevelopmentIdentity>();
  const [context, setContext] = useState<ContextResponse>();
  const [chats, setChats] = useState<readonly Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuView, setAccountMenuView] = useState<AccountMenuView>("home");
  const [documentScreen, setDocumentScreen] = useState<DocumentScreen>();
  const [condominiums, setCondominiums] = useState<readonly CondominiumListItem[]>([]);
  const [condominiumsPending, setCondominiumsPending] = useState(false);
  const [condominiumsError, setCondominiumsError] = useState("");
  const [documents, setDocuments] = useState<readonly DocumentListItem[]>([]);
  const [documentsPending, setDocumentsPending] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [setupStage, setSetupStage] = useState<SetupStage>("manager_name");
  const [setupMessages, setSetupMessages] = useState<readonly SetupMessage[]>([]);
  const [setupCondominiumTotal, setSetupCondominiumTotal] = useState(0);
  const [setupCondominiumIndex, setSetupCondominiumIndex] = useState(1);
  const [setupCondominiumName, setSetupCondominiumName] = useState("");
  const [setupManagerName, setSetupManagerName] = useState("");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState<PublicAnswer>();
  const [selectedCitation, setSelectedCitation] = useState<Citation>();
  const [feedback, setFeedback] = useState<FeedbackClassification>();
  const [busy, setBusy] = useState(false);
  const [runtimePending, setRuntimePending] = useState(true);
  const [entryPending, setEntryPending] = useState(false);
  const offlineDemo = authMode === "development" && aiProvider === "local";
  const [conversationError, setConversationError] = useState("");
  const [pendingChatDocument, setPendingChatDocument] = useState<File>();
  const [sentChatDocumentName, setSentChatDocumentName] = useState("");
  const [chatDocumentMessage, setChatDocumentMessage] = useState("");
  const [chatDocumentMessageIsError, setChatDocumentMessageIsError] = useState(false);
  const [chatDocumentUploading, setChatDocumentUploading] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentPickerKind, setAttachmentPickerKind] = useState<AttachmentKind>("document");
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const chatDocumentInput = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const conversationHistory = activeChat?.entries ?? [];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadRuntime(): Promise<void> {
      try {
        const runtimeResponse = await fetch("/v1/runtime", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!runtimeResponse.ok) throw new Error("Não foi possível verificar o serviço.");
        const runtime = (await runtimeResponse.json()) as Readonly<{
          authMode?: unknown;
          aiProvider?: unknown;
        }>;
        const mode: AuthMode = runtime.authMode === "real" ? "real" : "development";
        if (!active) return;
        setAuthMode(mode);
        setAiProvider(
          runtime.aiProvider === "openai"
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
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [answer, busy, chatDocumentMessage, conversationError, setupMessages, submittedQuestion]);

  const canUpload = context?.permissions.includes("document:upload") === true;
  const conversationStarted =
    setupMessages.some((message) => message.role === "user") ||
    conversationHistory.length > 0 ||
    submittedQuestion !== "";
  const groupedDocuments = useMemo(
    () =>
      Object.entries(documentTypeLabels)
        .map(([type, label]) => ({
          type,
          label,
          documents: documents.filter((document) => document.documentType === type)
        }))
        .filter((group) => group.documents.length > 0),
    [documents]
  );
  const currentCondominium = condominiums.find(
    (condominium) => condominium.condominiumId === context?.condominiumId
  );
  const currentCondominiumDocuments = useMemo(
    () =>
      context === undefined
        ? []
        : documents.filter((document) => document.condominiumId === context.condominiumId),
    [context, documents]
  );
  const groupedCurrentCondominiumDocuments = useMemo(
    () =>
      Object.entries(documentTypeLabels)
        .map(([type, label]) => ({
          type,
          label,
          documents: currentCondominiumDocuments.filter(
            (document) => document.documentType === type
          )
        }))
        .filter((group) => group.documents.length > 0),
    [currentCondominiumDocuments]
  );
  const currentKnowledgeProgress = useMemo(
    () => calculateKnowledgeProgress(currentCondominiumDocuments),
    [currentCondominiumDocuments]
  );
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
    if (aiProvider === "openai") return "Online · memória documental ativa";
    return "Online · memória documental local";
  }, [aiProvider, context, entryPending, runtimePending, setupCondominiumTotal, setupStage]);

  async function enterConversation(): Promise<void> {
    if (authMode === undefined || runtimePending || entryPending) return;

    let selectedIdentity: DevelopmentIdentity;
    try {
      selectedIdentity = createDevelopmentIdentity(loginName);
    } catch (error: unknown) {
      setConversationError(
        error instanceof Error ? error.message : "Digite um nome de usuário válido."
      );
      return;
    }

    setEntryPending(true);
    setConversationError("");
    setDevelopmentIdentity(selectedIdentity);
    setSetupManagerName("");
    saveDevelopmentIdentity(window.localStorage, selectedIdentity);
    const savedProfile =
      authMode === "development"
        ? loadDevelopmentSetupProfile(window.localStorage, selectedIdentity)
        : undefined;
    try {
      const bootstrapResponse = await fetch("/v1/chat/bootstrap", {
        cache: "no-store",
        credentials: "same-origin",
        headers: requestHeaders(authMode, selectedIdentity)
      });
      if (bootstrapResponse.status === 404) {
        if (
          savedProfile?.completed === true &&
          savedProfile.managerName !== "" &&
          savedProfile.condominiums.length > 0
        ) {
          let restoredContext: ContextResponse | undefined;
          for (const condominium of savedProfile.condominiums) {
            const restoreResponse = await fetch("/v1/development/test-condominiums", {
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
            const welcome = await requestSetupMessage(
              { stage: "returning", managerName: savedProfile.managerName },
              selectedIdentity
            );
            const chatId = crypto.randomUUID();
            setContext(restoredContext);
            setSetupManagerName(savedProfile.managerName);
            setSetupStage("complete");
            setSetupMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]);
            setChats([{ id: chatId, title: "Nova conversa", entries: [] }]);
            setActiveChatId(chatId);
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
      const welcome = await requestSetupMessage(
        { stage: "returning", managerName },
        selectedIdentity
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

      const historyResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(authorizedContext.condominiumId)}/history?limit=50`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: requestHeaders(authMode, selectedIdentity)
        }
      );
      if (historyResponse.ok) {
        const history = (await historyResponse.json()) as Readonly<{
          entries: readonly ConversationHistoryEntry[];
        }>;
        setChats([
          {
            id: "history",
            title: buildConversationTitleFromQuestions(
              history.entries.map((entry) => entry.question)
            ),
            entries: history.entries
          }
        ]);
        setActiveChatId("history");
      }
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
    setAccountMenuOpen(true);
    setAccountMenuView("home");
    setCondominiumsPending(true);
    setCondominiumsError("");
    setDocumentsPending(true);
    setDocumentsError("");
    try {
      const response = await fetch("/v1/chat/condominiums", {
        cache: "no-store",
        credentials: "same-origin",
        headers: requestHeaders(authMode, developmentIdentity)
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível carregar os condomínios."));
      }
      const body = (await response.json()) as Readonly<{
        condominiums: readonly CondominiumListItem[];
      }>;
      setCondominiums(body.condominiums);
      const documentLists = await Promise.all(
        body.condominiums.map(async (item) => {
          const documentResponse = await fetch(
            `/v1/condominiums/${encodeURIComponent(item.condominiumId)}/documents`,
            {
              cache: "no-store",
              credentials: "same-origin",
              headers: requestHeaders(authMode, developmentIdentity)
            }
          );
          if (!documentResponse.ok) {
            throw new Error(
              await readMessage(documentResponse, "Não foi possível carregar os documentos.")
            );
          }
          const documentBody = (await documentResponse.json()) as Readonly<{
            documents: readonly Omit<DocumentListItem, "condominiumId" | "condominiumName">[];
          }>;
          return documentBody.documents.map((document) => ({
            ...document,
            condominiumId: item.condominiumId,
            condominiumName: item.name
          }));
        })
      );
      setDocuments(documentLists.flat());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível carregar os dados da conta.";
      setCondominiumsError(message);
      setDocumentsError(message);
    } finally {
      setCondominiumsPending(false);
      setDocumentsPending(false);
    }
  }

  async function switchCondominium(item: CondominiumListItem): Promise<void> {
    if (authMode === undefined || busy || chatDocumentUploading) return;
    setCondominiumsPending(true);
    setCondominiumsError("");
    try {
      const contextResponse = await fetch(
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
      const historyResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(authorizedContext.condominiumId)}/history?limit=50`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: requestHeaders(authMode, developmentIdentity)
        }
      );
      if (!historyResponse.ok) {
        throw new Error(
          await readMessage(historyResponse, "Não foi possível carregar o histórico.")
        );
      }
      const history = (await historyResponse.json()) as Readonly<{
        entries: readonly ConversationHistoryEntry[];
      }>;
      setContext(authorizedContext);
      setChats([
        {
          id: "history",
          title: buildConversationTitleFromQuestions(
            history.entries.map((entry) => entry.question)
          ),
          entries: history.entries
        }
      ]);
      setActiveChatId("history");
      preserveActiveTurn();
      setAccountMenuOpen(false);
    } catch (error: unknown) {
      setCondominiumsError(
        error instanceof Error ? error.message : "Não foi possível trocar de condomínio."
      );
    } finally {
      setCondominiumsPending(false);
    }
  }

  function openCurrentDocuments(): void {
    setAccountMenuOpen(false);
    setDocumentScreen("current");
  }

  async function requestSetupMessage(
    input: Readonly<Record<string, string | number>>,
    identity: DevelopmentIdentity | undefined = developmentIdentity
  ): Promise<string> {
    if (authMode === undefined) throw new Error("A conversa ainda não está disponível.");
    if (offlineDemo && (input.stage === "welcome" || input.stage === "returning")) return "";
    const setupInput =
      setupManagerName.trim() === "" || input.managerName !== undefined
        ? input
        : { ...input, managerName: setupManagerName };
    const response = await fetch("/v1/chat/setup-message", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", ...requestHeaders(authMode, identity) },
      body: JSON.stringify(setupInput)
    });
    if (!response.ok)
      throw new Error(await readMessage(response, "A Alvitra está indisponível no momento."));
    const body = (await response.json()) as Readonly<{ message: string }>;
    return body.message;
  }

  async function requestSetupTurn(message: string): Promise<SetupTurnResponse> {
    if (authMode === undefined || setupStage === "complete")
      throw new Error("A conversa ainda não está disponível.");
    const response = await fetch("/v1/chat/setup-turn", {
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
    window.setTimeout(() => composerInput.current?.focus(), 0);
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
    const developmentCondominiumId = `${normalizedName || "condominio"}-${crypto.randomUUID().slice(0, 8)}`;
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
    const response = await fetch(endpoint, {
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
    const chatId = crypto.randomUUID();
    setChats([{ id: chatId, title: "Nova conversa", entries: [] }]);
    setActiveChatId(chatId);
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
      setConversationError(
        error instanceof Error ? error.message : "A Alvitra está indisponível no momento."
      );
    } finally {
      setBusy(false);
    }
  }

  function selectChatDocument(file: File): void {
    const mediaType = chatFileMediaType(file);
    const limit = mediaType === "application/pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (mediaType === undefined) {
      setChatDocumentMessage("Envie um arquivo PDF, JPEG ou PNG.");
      setChatDocumentMessageIsError(true);
      return;
    }
    if (file.size > limit) {
      setChatDocumentMessage(
        mediaType === "application/pdf"
          ? "O PDF deve ter até 25 MB."
          : "A imagem deve ter até 10 MB."
      );
      setChatDocumentMessageIsError(true);
      return;
    }
    setPendingChatDocument(file);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
  }

  function chooseAttachment(kind: AttachmentKind): void {
    setAttachmentPickerKind(kind);
    setAttachmentMenuOpen(false);
    window.setTimeout(() => chatDocumentInput.current?.click(), 0);
  }

  async function addChatDocument(file: File): Promise<void> {
    if (context === undefined || authMode === undefined) return;
    const mediaType = chatFileMediaType(file);
    if (mediaType === undefined) return;

    setChatDocumentUploading(true);
    setSentChatDocumentName(file.name);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
    try {
      const documentType = inferDocumentType(file.name);
      const response = await requestDocumentUploadWithAuthorizationRecovery(fetch, {
        condominiumId: context.condominiumId,
        content: file,
        title: file.name,
        documentType,
        mediaType,
        authMode,
        ...(developmentIdentity === undefined
          ? {}
          : { developmentUserId: developmentIdentity.userId })
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível receber o documento."));
      }
      const result = (await response.json()) as Readonly<{
        memoryStatus?: DocumentMemoryStatus;
      }>;
      setPendingChatDocument(undefined);
      setChatDocumentMessage(
        documentType === "convention" && result.memoryStatus === "needs_review"
          ? "Recebi a convenção, mas a leitura precisa de revisão antes de ela servir de base. Se puder, envie o PDF original completo e legível ou as páginas que ficaram difíceis de ler."
          : documentType === "convention" && result.memoryStatus === "ready"
            ? "Recebi e processei a convenção. Ela é a principal referência interna deste condomínio; se houver uma versão posterior, envie-a também para eu comparar a vigência."
            : result.memoryStatus === "needs_review"
              ? "Recebi o arquivo, mas ele precisa de revisão antes de fundamentar respostas."
              : result.memoryStatus === "failed"
                ? "Recebi o arquivo, mas não consegui incluí-lo na memória documental."
                : result.memoryStatus === "ready"
                  ? "Recebi, processei e incluí o documento na memória desta conversa."
                  : "Recebi o documento. O processamento e a vetorização continuam em segundo plano."
      );
      setChatDocumentMessageIsError(result.memoryStatus === "failed");
    } catch (error: unknown) {
      setChatDocumentMessage(
        error instanceof Error ? error.message : "Não foi possível receber o documento agora."
      );
      setChatDocumentMessageIsError(true);
    } finally {
      setChatDocumentUploading(false);
    }
  }

  async function askQuestion(): Promise<void> {
    const trimmedQuestion = question.trim();
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
    const requestTimeout = window.setTimeout(() => controller.abort(), 70_000);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/questions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            ...requestHeaders(authMode, developmentIdentity, setupManagerName)
          },
          signal: controller.signal,
          body: JSON.stringify({ question: trimmedQuestion })
        }
      );
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível processar a pergunta."));
      }
      setAnswer((await response.json()) as PublicAnswer);
    } catch (error: unknown) {
      setAnswer(undefined);
      setConversationError(
        error instanceof Error && error.name !== "AbortError"
          ? error.message
          : "A resposta demorou mais do que o esperado. Tente novamente."
      );
    } finally {
      window.clearTimeout(requestTimeout);
      setBusy(false);
    }
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

  function createChat(): void {
    if (busy || chatDocumentUploading) return;
    preserveActiveTurn();
    const id = crypto.randomUUID();
    setChats((current) => [...current, { id, title: "Nova conversa", entries: [] }]);
    setActiveChatId(id);
    setSidebarOpen(false);
    window.setTimeout(() => composerInput.current?.focus(), 0);
  }

  function selectChat(chatId: string): void {
    if (busy || chatDocumentUploading || chatId === activeChatId) return;
    preserveActiveTurn();
    setActiveChatId(chatId);
    setSidebarOpen(false);
  }

  function renameChat(chatId: string): void {
    const chat = chats.find((item) => item.id === chatId);
    if (chat === undefined) return;
    const title = window.prompt("Nome da conversa", chat.title)?.trim();
    if (title === undefined || title.length === 0) return;
    setChats((current) => current.map((item) => (item.id === chatId ? { ...item, title } : item)));
  }

  function deleteChat(chatId: string): void {
    const chat = chats.find((item) => item.id === chatId);
    if (chat === undefined || !window.confirm(`Excluir a conversa “${chat.title}”?`)) return;
    if (activeChatId === chatId) preserveActiveTurn();
    const remaining = chats.filter((item) => item.id !== chatId);
    setChats(remaining);
    if (activeChatId === chatId) {
      const next = remaining.at(-1);
      if (next === undefined) {
        const id = crypto.randomUUID();
        setChats([{ id, title: "Nova conversa", entries: [] }]);
        setActiveChatId(id);
      } else {
        setActiveChatId(next.id);
      }
    }
  }

  function sendComposer(): void {
    if (pendingChatDocument !== undefined) {
      void addChatDocument(pendingChatDocument);
      return;
    }
    if (setupStage !== "complete") {
      void advanceSetup(question);
      return;
    }
    void askQuestion();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!busy && !chatDocumentUploading && question.trim().length > 0) sendComposer();
  }

  async function submitFeedback(classification: FeedbackClassification): Promise<void> {
    if (answer === undefined || authMode === undefined) return;
    try {
      const response = await fetch(
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
            void enterConversation();
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
            <label htmlFor="login-name">Nome de usuário</label>
            <input
              id="login-name"
              name="username"
              type="text"
              autoComplete="username"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
              minLength={2}
              maxLength={60}
              placeholder="Escolha um nome para acessar"
              required
              autoFocus
            />
            <p className="login-notice">
              Este é um acesso provisório para testes, sem senha. Use o mesmo nome para retomar seu
              cadastro em outra aba ou depois de reiniciar o app. Esse nome serve somente para o
              acesso; no primeiro login, a Alvitra perguntará como você prefere ser chamado. Mais
              adiante, a entrada será feita pelo WhatsApp.
            </p>
          </div>
          <button
            className="login-entry-button"
            type="submit"
            disabled={authMode === undefined || runtimePending || entryPending}
          >
            {entryPending ? "Entrando..." : "Entrar"}
          </button>
          {conversationError === "" ? null : <p role="alert">{conversationError}</p>}
        </form>
      </main>
    );
  }

  if (documentScreen === "current") {
    return (
      <main className="document-page">
        <header className="document-page-header">
          <button type="button" onClick={() => setDocumentScreen(undefined)}>
            ‹ Voltar ao chat
          </button>
          <div>
            <strong>Documentos</strong>
            <small>{currentCondominium?.name ?? "Condomínio atual"}</small>
          </div>
        </header>
        <section className="document-page-content" aria-label="Documentos do condomínio">
          <div className="knowledge-progress">
            <div>
              <span>Contexto da Alvitra</span>
              <strong>{currentKnowledgeProgress}%</strong>
            </div>
            <div
              className="knowledge-progress-track"
              role="progressbar"
              aria-label="Contexto documental disponível para a Alvitra"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentKnowledgeProgress}
            >
              <span style={{ width: `${currentKnowledgeProgress}%` }} />
            </div>
            <p>
              Calculado pelos tipos de documentos já processados deste condomínio. A convenção
              completa e vigente é a base mais importante.
            </p>
          </div>
          <div className="document-page-list">
            <h1>Documentos enviados</h1>
            {documentsPending ? <p>Carregando documentos autorizados...</p> : null}
            {documentsError === "" ? null : <p role="alert">{documentsError}</p>}
            {!documentsPending &&
            documentsError === "" &&
            currentCondominiumDocuments.length === 0 ? (
              <p>Nenhum documento enviado ainda para este condomínio.</p>
            ) : null}
            {groupedCurrentCondominiumDocuments.map((group) => (
              <section key={group.type} aria-label={group.label}>
                <h2>{group.label}</h2>
                {group.documents.map((document) => (
                  <article key={document.documentId}>
                    <DocumentIcon />
                    <span>
                      <strong>{document.title}</strong>
                      <small>
                        {document.processingStatus === "ready"
                          ? "Disponível para consulta"
                          : "Em processamento"}
                      </small>
                    </span>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`chat-page${conversationStarted ? " has-conversation" : ""}`}>
      <header className="chat-header">
        <button
          className="chat-list-button"
          type="button"
          aria-label="Abrir conversas"
          aria-expanded={sidebarOpen}
          aria-controls="chat-sidebar"
          onClick={() => setSidebarOpen(true)}
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
            {serviceLabel}
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
        <section id="account-menu" className="account-menu" aria-label="Menu da conta">
          {accountMenuView === "home" ? (
            <>
              <div className="current-condominium-menu-item">
                <span>Condomínio atual</span>
                <strong>{currentCondominium?.name ?? "Carregando condomínio..."}</strong>
                <button
                  type="button"
                  onClick={openCurrentDocuments}
                  disabled={context === undefined || documentsPending}
                >
                  Ver documentos deste condomínio
                </button>
              </div>
              <button type="button" onClick={() => setAccountMenuView("condominiums")}>
                Condomínios
              </button>
              <button type="button" onClick={() => setAccountMenuView("documents")}>
                Dados
              </button>
            </>
          ) : (
            <>
              <button
                className="account-menu-back"
                type="button"
                onClick={() => setAccountMenuView("home")}
              >
                ‹ Voltar
              </button>
              {accountMenuView === "condominiums" ? (
                <div className="condominium-menu-list">
                  <strong>Condomínios</strong>
                  {condominiumsPending ? <p>Carregando condomínios autorizados...</p> : null}
                  {condominiumsError === "" ? null : <p role="alert">{condominiumsError}</p>}
                  {!condominiumsPending && condominiumsError === "" && condominiums.length === 0 ? (
                    <p>Você ainda não configurou nenhum condomínio.</p>
                  ) : null}
                  {condominiums.map((item) => (
                    <button
                      type="button"
                      key={item.condominiumId}
                      disabled={condominiumsPending || busy || chatDocumentUploading}
                      onClick={() => void switchCondominium(item)}
                    >
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                  <button
                    className="start-condominium-chat"
                    type="button"
                    onClick={() => void startCondominiumConversation()}
                  >
                    + Adicionar condomínio pela conversa
                  </button>
                </div>
              ) : accountMenuView === "documents" ? (
                <div className="document-menu-list">
                  <strong>Dados</strong>
                  <p>Documentos enviados, organizados por tipo e condomínio.</p>
                  {documentsPending ? <p>Carregando documentos autorizados...</p> : null}
                  {documentsError === "" ? null : <p role="alert">{documentsError}</p>}
                  {!documentsPending && documentsError === "" && documents.length === 0 ? (
                    <p>Nenhum documento enviado ainda.</p>
                  ) : null}
                  {groupedDocuments.map((group) => (
                    <section key={group.type} aria-label={group.label}>
                      <h3>{group.label}</h3>
                      {group.documents.map((document) => (
                        <article key={`${document.condominiumId}-${document.documentId}`}>
                          <DocumentIcon />
                          <span>
                            <strong>{document.title}</strong>
                            <small>
                              {document.condominiumName} ·{" "}
                              {document.processingStatus === "ready"
                                ? "Disponível para consulta"
                                : "Em processamento"}
                            </small>
                          </span>
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="document-menu-list">
                  <strong>Documentos deste condomínio</strong>
                  <p>{currentCondominium?.name ?? "Condomínio atual"}</p>
                  {documentsPending ? <p>Carregando documentos autorizados...</p> : null}
                  {documentsError === "" ? null : <p role="alert">{documentsError}</p>}
                  {!documentsPending &&
                  documentsError === "" &&
                  currentCondominiumDocuments.length === 0 ? (
                    <p>Nenhum documento enviado ainda para este condomínio.</p>
                  ) : null}
                  {groupedCurrentCondominiumDocuments.map((group) => (
                    <section key={group.type} aria-label={group.label}>
                      <h3>{group.label}</h3>
                      {group.documents.map((document) => (
                        <article key={document.documentId}>
                          <DocumentIcon />
                          <span>
                            <strong>{document.title}</strong>
                            <small>
                              {document.processingStatus === "ready"
                                ? "Disponível para consulta"
                                : "Em processamento"}
                            </small>
                          </span>
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      <aside
        id="chat-sidebar"
        className={`chat-sidebar${sidebarOpen ? " is-open" : ""}`}
        aria-label="Conversas"
      >
        <div className="sidebar-heading">
          <strong>Conversas</strong>
          <button type="button" aria-label="Fechar conversas" onClick={() => setSidebarOpen(false)}>
            ×
          </button>
        </div>
        <button
          className="new-chat-button"
          type="button"
          onClick={createChat}
          disabled={
            setupStage !== "complete" || context === undefined || busy || chatDocumentUploading
          }
        >
          + Nova conversa
        </button>
        <nav className="chat-history" aria-label="Conversas anteriores">
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
                  aria-label={`Renomear ${chat.title}`}
                  onClick={() => renameChat(chat.id)}
                >
                  Renomear
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${chat.title}`}
                  onClick={() => deleteChat(chat.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </nav>
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
          {setupMessages
            .filter((message) => message.text.trim() !== "")
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

          {setupStage === "complete"
            ? conversationHistory.map((entry) => (
                <div className="conversation-turn" key={entry.answer.answerId}>
                  <div className="user-message">
                    <p>{entry.question}</p>
                  </div>
                  <AnswerMessage
                    answer={entry.answer}
                    question={entry.question}
                    compact
                    onSelectCitation={setSelectedCitation}
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

          {sentChatDocumentName === "" ? null : (
            <div className="user-message document-message">
              <DocumentIcon />
              <p>{sentChatDocumentName}</p>
            </div>
          )}

          {chatDocumentMessage === "" ? null : (
            <div
              className={`assistant-message system-message${chatDocumentMessageIsError ? " is-error" : ""}`}
              role={chatDocumentMessageIsError ? "alert" : "status"}
            >
              <DocumentIcon />
              <p>{chatDocumentMessage}</p>
            </div>
          )}

          {submittedQuestion === "" ? null : (
            <div className="user-message">
              <p>{submittedQuestion}</p>
            </div>
          )}

          {busy && submittedQuestion !== "" ? (
            <div className="assistant-message loading-message" role="status">
              <div>
                <strong>Consultando o contexto disponível</strong>
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          ) : null}

          {conversationError === "" || runtimePending || entryPending ? null : (
            <div className="assistant-message error-message" role="alert">
              <div>
                <strong>Não consegui continuar agora</strong>
                <p>{conversationError}</p>
              </div>
            </div>
          )}

          {answer === undefined ? null : (
            <div className="current-answer">
              <AnswerMessage
                answer={answer}
                question={submittedQuestion}
                onSelectCitation={setSelectedCitation}
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

          {selectedCitation === undefined ? null : (
            <aside className="source-viewer" aria-label="Trecho da fonte">
              <div>
                <span>{selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"}</span>
                <h2>{selectedCitation.title}</h2>
                <p>
                  {selectedCitation.sourceRemoved ? "Original removido · " : "Versão "}
                  {selectedCitation.documentVersionId} · página {selectedCitation.page}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedCitation(undefined)}>
                Fechar
              </button>
              <blockquote>{selectedCitation.excerpt}</blockquote>
            </aside>
          )}
          <div ref={messagesEnd} />
        </div>
      </section>

      <footer className="composer-wrap">
        <div className="composer">
          {pendingChatDocument === undefined ? null : (
            <div className="composer-attachment">
              <DocumentIcon />
              <div>
                <strong>{pendingChatDocument.name}</strong>
                <small>
                  {chatFileMediaType(pendingChatDocument) === "application/pdf"
                    ? "Pronto para enviar e processar"
                    : "A imagem será armazenada e só será enviada quando você confirmar pela seta"}
                </small>
              </div>
              <button
                type="button"
                aria-label={`Remover ${pendingChatDocument.name}`}
                onClick={() => setPendingChatDocument(undefined)}
              >
                ×
              </button>
            </div>
          )}
          <div className="composer-row">
            <input
              ref={chatDocumentInput}
              className="visually-hidden"
              type="file"
              accept={
                attachmentPickerKind === "document"
                  ? "application/pdf,.pdf"
                  : "image/jpeg,.jpg,.jpeg,image/png,.png"
              }
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file !== undefined) selectChatDocument(file);
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
                    <small>PDF</small>
                  </button>
                  <button type="button" role="menuitem" onClick={() => chooseAttachment("photo")}>
                    Enviar foto
                    <small>JPG ou PNG</small>
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
              disabled={
                authMode === undefined ||
                (offlineDemo && setupStage !== "complete") ||
                runtimePending ||
                entryPending ||
                (setupStage === "complete" && context === undefined)
              }
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
                (pendingChatDocument === undefined && question.trim().length === 0)
              }
              aria-label={
                pendingChatDocument === undefined
                  ? "Enviar mensagem"
                  : "Enviar documento selecionado"
              }
            >
              <SendIcon />
            </button>
          </div>
        </div>
        <p>A Alvitra pode cometer erros. Confira as fontes e valide decisões importantes.</p>
      </footer>
    </main>
  );
}
