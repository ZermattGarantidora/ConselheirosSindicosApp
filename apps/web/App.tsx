import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { isSimpleConversationMessage } from "../shared/conversation-intent.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "./document-upload-request.js";
import { splitBoldText } from "./message-format.js";

type AuthMode = "development" | "real";
type AiProvider = "gemini" | "local" | "unavailable";

type ContextResponse = Readonly<{
  condominiumId: string;
  role: string;
  permissions: readonly string[];
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

type ConversationProfile = Readonly<{
  name: string;
  administrationCompany: string;
  unitCount: number | null;
  contact: Readonly<{ managerName: string; email: string; phone: string }>;
}>;

type AccountMenuView = "home" | "condominiums" | "profile" | "preferences";

type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";
type DocumentMemoryStatus = "ready" | "pending_confirmation" | "needs_review" | "failed";

const developmentUserId = "sindico-demo";
const suggestedQuestions = [
  "O que a convenção diz sobre animais?",
  "Qual foi a última decisão sobre vagas de garagem?",
  "Este tema precisa ser aprovado em assembleia?"
] as const;

function requestHeaders(authMode: AuthMode | undefined): Readonly<Record<string, string>> {
  return authMode === "development" ? { "x-development-user-id": developmentUserId } : {};
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

function AlvitraMark() {
  return (
    <span className="alvitra-mark" aria-hidden="true">
      A
    </span>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />
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

function MoreIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
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

function AnswerMessage({
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
    (point) => !isRelevantServiceDegradation(point)
  );
  const answerStatus = {
    grounded: { label: "Com fontes", tone: "grounded" },
    abstained: { label: "Base insuficiente", tone: "abstained" },
    conflict: { label: "Fontes em conflito", tone: "conflict" },
    failed: { label: "Falha temporária", tone: "failed" }
  }[answer.answerMode];
  const showGuidance =
    !compact &&
    !isConversationalResponse &&
    (attentionPoints.length > 0 || answer.suggestedNextStep !== null || answer.specialist.required);

  return (
    <>
      <article className="assistant-message answer-message">
        <div className="answer-meta">
          <strong>Alvitra</strong>
          {isConversationalResponse ? null : (
            <span className={`answer-status ${answerStatus.tone}`}>{answerStatus.label}</span>
          )}
        </div>
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
      {isConversationalResponse ? null : (
        <AnswerSources citations={answer.citations} onSelect={onSelectCitation} />
      )}
    </>
  );
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>();
  const [aiProvider, setAiProvider] = useState<AiProvider>("unavailable");
  const [context, setContext] = useState<ContextResponse>();
  const [chats, setChats] = useState<readonly Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuView, setAccountMenuView] = useState<AccountMenuView>("home");
  const [condominiums, setCondominiums] = useState<readonly CondominiumListItem[]>([]);
  const [condominiumsPending, setCondominiumsPending] = useState(false);
  const [condominiumsError, setCondominiumsError] = useState("");
  const [conversationProfile, setConversationProfile] = useState<ConversationProfile>();
  const [profilePending, setProfilePending] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState<PublicAnswer>();
  const [selectedCitation, setSelectedCitation] = useState<Citation>();
  const [feedback, setFeedback] = useState<FeedbackClassification>();
  const [busy, setBusy] = useState(false);
  const [runtimePending, setRuntimePending] = useState(true);
  const [entryPending, setEntryPending] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [pendingChatDocument, setPendingChatDocument] = useState<File>();
  const [sentChatDocumentName, setSentChatDocumentName] = useState("");
  const [chatDocumentMessage, setChatDocumentMessage] = useState("");
  const [chatDocumentMessageIsError, setChatDocumentMessageIsError] = useState(false);
  const [chatDocumentUploading, setChatDocumentUploading] = useState(false);
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
          runtime.aiProvider === "gemini"
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
  }, [answer, busy, chatDocumentMessage, conversationError, submittedQuestion]);

  const canUpload = context?.permissions.includes("document:upload") === true;
  const serviceLabel = useMemo(() => {
    if (runtimePending) return "Preparando a conversa";
    if (entryPending) return "Entrando na conversa";
    if (context === undefined) return "Conversa indisponível";
    if (aiProvider === "gemini") return "Online · memória documental ativa";
    return "Online · memória documental local";
  }, [aiProvider, context, entryPending, runtimePending]);

  async function enterConversation(): Promise<void> {
    if (authMode === undefined || runtimePending || entryPending) return;

    setEntryPending(true);
    setConversationError("");
    try {
      const bootstrapResponse = await fetch("/v1/chat/bootstrap", {
        cache: "no-store",
        credentials: "same-origin",
        headers: requestHeaders(authMode)
      });
      if (!bootstrapResponse.ok) {
        throw new Error(
          await readMessage(
            bootstrapResponse,
            "Não encontrei um contexto autorizado para iniciar esta conversa."
          )
        );
      }

      const authorizedContext = (await bootstrapResponse.json()) as ContextResponse;
      setContext(authorizedContext);

      const historyResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(authorizedContext.condominiumId)}/history?limit=50`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: requestHeaders(authMode)
        }
      );
      if (historyResponse.ok) {
        const history = (await historyResponse.json()) as Readonly<{
          entries: readonly ConversationHistoryEntry[];
        }>;
        setChats([
          {
            id: "history",
            title: history.entries[0]?.question ?? "Conversas anteriores",
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
    if (context === undefined || authMode === undefined) return;
    setAccountMenuOpen(true);
    setAccountMenuView("home");
    setCondominiumsPending(true);
    setCondominiumsError("");
    setProfilePending(true);
    setProfileError("");
    try {
      const response = await fetch("/v1/chat/condominiums", {
        cache: "no-store",
        credentials: "same-origin",
        headers: requestHeaders(authMode)
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível carregar os condomínios."));
      }
      const body = (await response.json()) as Readonly<{
        condominiums: readonly CondominiumListItem[];
      }>;
      setCondominiums(body.condominiums);

      const profileResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/profile`,
        { cache: "no-store", credentials: "same-origin", headers: requestHeaders(authMode) }
      );
      if (!profileResponse.ok) {
        setProfileError(
          await readMessage(profileResponse, "Não foi possível carregar seus dados.")
        );
      } else {
        const profileBody = (await profileResponse.json()) as Readonly<{
          profile: ConversationProfile;
        }>;
        setConversationProfile(profileBody.profile);
      }
    } catch (error: unknown) {
      setCondominiumsError(
        error instanceof Error ? error.message : "Não foi possível carregar os condomínios."
      );
    } finally {
      setCondominiumsPending(false);
      setProfilePending(false);
    }
  }

  async function switchCondominium(item: CondominiumListItem): Promise<void> {
    if (authMode === undefined || busy || chatDocumentUploading) return;
    setCondominiumsPending(true);
    setCondominiumsError("");
    try {
      const contextResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(item.condominiumId)}/context`,
        { cache: "no-store", credentials: "same-origin", headers: requestHeaders(authMode) }
      );
      if (!contextResponse.ok) {
        throw new Error(await readMessage(contextResponse, "Acesso não autorizado."));
      }
      const authorizedContext = (await contextResponse.json()) as ContextResponse;
      setConversationProfile(undefined);
      const historyResponse = await fetch(
        `/v1/condominiums/${encodeURIComponent(authorizedContext.condominiumId)}/history?limit=50`,
        { cache: "no-store", credentials: "same-origin", headers: requestHeaders(authMode) }
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
          title: history.entries[0]?.question ?? "Conversas anteriores",
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

  function startCondominiumConversation(): void {
    setAccountMenuOpen(false);
    setQuestion("Quero cadastrar outro condomínio.");
    window.setTimeout(() => composerInput.current?.focus(), 0);
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

  async function addChatDocument(file: File): Promise<void> {
    if (context === undefined || authMode === undefined) return;
    const mediaType = chatFileMediaType(file);
    if (mediaType === undefined) return;

    setChatDocumentUploading(true);
    setSentChatDocumentName(file.name);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
    try {
      const response = await requestDocumentUploadWithAuthorizationRecovery(fetch, {
        condominiumId: context.condominiumId,
        content: file,
        title: file.name,
        documentType: inferDocumentType(file.name),
        mediaType,
        authMode,
        developmentUserId
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível receber o documento."));
      }
      const result = (await response.json()) as Readonly<{
        memoryStatus?: DocumentMemoryStatus;
      }>;
      setPendingChatDocument(undefined);
      setChatDocumentMessage(
        result.memoryStatus === "needs_review"
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
            ...requestHeaders(authMode)
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
              title: chat.entries.length === 0 ? turn.question : chat.title,
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
    void askQuestion();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!busy && !chatDocumentUploading && question.trim().length > 0) void askQuestion();
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
            ...requestHeaders(authMode)
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

  return (
    <main className="chat-page">
      <header className="chat-header">
        <button
          className="chat-list-button"
          type="button"
          aria-label="Abrir conversas"
          aria-expanded={sidebarOpen}
          aria-controls="chat-sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon />
        </button>
        <div className="brand-lockup">
          <AlvitraMark />
          <div>
            <strong>Alvitra</strong>
            <small>Sua assistente para cuidar do condomínio</small>
          </div>
        </div>
        {context === undefined ? (
          <button
            className="login-entry-button"
            type="button"
            onClick={() => void enterConversation()}
            disabled={authMode === undefined || runtimePending || entryPending}
          >
            {entryPending ? "Entrando..." : "Entrar"}
          </button>
        ) : (
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
              onClick={() => void openAccountMenu()}
            >
              <MoreIcon />
            </button>
          </div>
        )}
      </header>

      {accountMenuOpen ? (
        <section id="account-menu" className="account-menu" aria-label="Menu da conta">
          {accountMenuView === "home" ? (
            <>
              <button type="button" onClick={() => setAccountMenuView("condominiums")}>
                Condomínios
              </button>
              <button type="button" onClick={() => setAccountMenuView("profile")}>
                Meus dados
              </button>
              <button type="button" onClick={() => setAccountMenuView("preferences")}>
                Preferências
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
                    onClick={startCondominiumConversation}
                  >
                    + Adicionar condomínio pela conversa
                  </button>
                </div>
              ) : accountMenuView === "profile" ? (
                <div className="conversation-profile">
                  <strong>Meus dados</strong>
                  {profilePending ? <p>Organizando os dados confirmados na conversa...</p> : null}
                  {profileError === "" ? null : <p role="alert">{profileError}</p>}
                  {conversationProfile === undefined || profilePending ? null : (
                    <>
                      <p>
                        Esses dados são atualizados aos poucos, quando você os confirma na conversa.
                      </p>
                      <dl>
                        {conversationProfile.contact.managerName === "" ? null : (
                          <>
                            <dt>Nome</dt>
                            <dd>{conversationProfile.contact.managerName}</dd>
                          </>
                        )}
                        {conversationProfile.contact.email === "" ? null : (
                          <>
                            <dt>E-mail</dt>
                            <dd>{conversationProfile.contact.email}</dd>
                          </>
                        )}
                        {conversationProfile.contact.phone === "" ? null : (
                          <>
                            <dt>Telefone</dt>
                            <dd>{conversationProfile.contact.phone}</dd>
                          </>
                        )}
                        <dt>Condomínio</dt>
                        <dd>{conversationProfile.name}</dd>
                        {conversationProfile.unitCount === null ? null : (
                          <>
                            <dt>Unidades</dt>
                            <dd>{conversationProfile.unitCount}</dd>
                          </>
                        )}
                        {conversationProfile.administrationCompany === "" ? null : (
                          <>
                            <dt>Administradora</dt>
                            <dd>{conversationProfile.administrationCompany}</dd>
                          </>
                        )}
                      </dl>
                    </>
                  )}
                </div>
              ) : (
                <p className="account-menu-note">
                  Preferências contextuais serão disponibilizadas pela conversa quando necessárias.
                </p>
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
          disabled={context === undefined || busy || chatDocumentUploading}
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
          {conversationHistory.length === 0 && submittedQuestion === "" ? (
            <div className="welcome-block">
              <AlvitraMark />
              <h1>Como posso te ajudar hoje?</h1>
              <p>
                Pode falar comigo sobre o condomínio ou enviar um documento. Quando eu usar uma
                informação do acervo, mostro a fonte para você conferir.
              </p>
              <div className="suggested-questions" aria-label="Perguntas sugeridas">
                {suggestedQuestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuestion(suggestion);
                      composerInput.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {conversationHistory.map((entry) => (
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
          ))}

          {entryPending ? (
            <div className="assistant-message loading-message" role="status">
              <AlvitraMark />
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
              <AlvitraMark />
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
              <AlvitraMark />
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
              accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file !== undefined) selectChatDocument(file);
              }}
            />
            <button
              className="attach-button"
              type="button"
              aria-label="Anexar PDF ou imagem"
              title="Anexar PDF ou imagem"
              disabled={!canUpload || busy || chatDocumentUploading}
              onClick={() => chatDocumentInput.current?.click()}
            >
              <UploadIcon />
            </button>
            <textarea
              ref={composerInput}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Converse com a Alvitra..."
              aria-label="Mensagem para a Alvitra"
              rows={1}
              maxLength={4000}
              disabled={context === undefined || runtimePending || entryPending}
            />
            <button
              className="send-button"
              type="button"
              onClick={sendComposer}
              disabled={
                context === undefined ||
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
