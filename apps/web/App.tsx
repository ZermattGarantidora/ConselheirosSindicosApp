import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";

import { requestDocumentUploadWithAuthorizationRecovery } from "./document-upload-request.js";
import { splitBoldText } from "./message-format.js";
import { isSimpleConversationMessage } from "../shared/conversation-intent.js";

type ContextResponse = Readonly<{
  condominiumId: string;
  role: string;
  permissions: readonly string[];
  resumedRegistration?: boolean;
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

type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";
type View =
  | "landing"
  | "login"
  | "onboarding"
  | "condominiums"
  | "create-condominium"
  | "chat"
  | "profile"
  | "admin-dashboard"
  | "chat-settings";
type SettingsTab = "personalization" | "documents" | "preferences" | "management";
type AiProvider = "gemini" | "local" | "unavailable";
type CondominiumListItem = Readonly<{ id: string; name: string; detail: string }>;
type RegistrationForm = Readonly<{
  name: string;
  cnpj: string;
  administrationCompany: string;
  unitCount: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  managerName: string;
  email: string;
  phone: string;
}>;
type DocumentMemoryStatus = "ready" | "pending_confirmation" | "needs_review" | "failed";
type AuthMode = "unknown" | "development" | "real" | "unavailable";
type AuthPanel = "login" | "register" | "forgot" | "reset" | "verify" | "mfa";
type AuthUser = Readonly<{
  userId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}>;
type AccountSecurityStatus = Readonly<{
  emailVerified: boolean;
  mfaEnabled: boolean;
}>;
type ManagedAuthSession = Readonly<{
  sessionId: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}>;
type MfaSetup = Readonly<{ secret: string; uri: string }>;
type AdminDashboard = Readonly<{
  metrics: Readonly<{
    activeAccounts: number;
    newAccountsLast7Days: number;
    activeUsersLast7Days: number;
  }>;
  accounts: readonly Readonly<{
    displayName: string;
    email: string;
  }>[];
  generatedAt: string;
  commercialOpportunities: Readonly<{ collectionActive: boolean }>;
}>;
type RegistrationFile = Pick<File, "name" | "type" | "size">;
type ChatSettings = Readonly<{
  showHistory: boolean;
  showEvidenceReminder: boolean;
}>;
const settingsTabOrder: readonly SettingsTab[] = [
  "personalization",
  "documents",
  "preferences",
  "management"
];
const settingsTabCopy: Readonly<
  Record<SettingsTab, Readonly<{ label: string; description: string }>>
> = {
  personalization: { label: "Personalização", description: "Identificação e fotos" },
  documents: { label: "Documentos", description: "Arquivos e memória" },
  preferences: { label: "Preferências", description: "Conversa" },
  management: { label: "Gestão", description: "Ações do condomínio" }
};
type RegisteredDocument = Readonly<{
  documentId: string;
  documentVersionId: string;
  title: string;
  documentType: "convention" | "internal_rules" | "meeting_minutes" | "contract" | "other";
  versionNumber: number;
  sizeBytes: number;
  mediaType?: "application/pdf" | "image/jpeg" | "image/png";
  processingStatus: "uploaded" | "processing" | "ready" | "needs_review" | "failed";
  validityStatus: "pending" | "confirmed" | "disputed" | "superseded" | "not_applicable";
  createdAt: string;
  expectedPageCount: number | null;
  processedPageCount: number | null;
  searchablePageCount: number | null;
  unreadablePageNumbers: readonly number[];
  extractionCompleteness: number | null;
  extractionMethod: "pdf_text" | "ocr" | "image_vision" | null;
  ocrQualityScore: number | null;
  uploadedByCurrentUser: boolean;
}>;
type ArchivedDocument = Readonly<{
  documentId: string;
  title: string;
  archivedAt: string;
}>;
type DocumentPreview = Readonly<{
  title: string;
  url: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
}>;
type CondominiumProfile = Readonly<{
  condominiumId: string;
  name: string;
  cnpj: string | null;
  address: Readonly<{
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }>;
  administrationCompany: string;
  unitCount: number | null;
  contact: Readonly<{ managerName: string; email: string; phone: string }>;
  description: string;
}>;
type CondominiumProfileDraft = Omit<CondominiumProfile, "unitCount"> &
  Readonly<{ unitCount: string }>;
type CondominiumProfilePhoto = Readonly<{
  photoId: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  isCover: boolean;
  createdAt: string;
}>;

const defaultChatSettings: ChatSettings = Object.freeze({
  showHistory: true,
  showEvidenceReminder: true
});

// Identidade provisória para o piloto. Centralizada para permitir uma troca futura sem
// espalhar novamente o nome público pela interface.
const provisionalBrand = Object.freeze({
  productName: "Alvitra",
  agentName: "Alvitra",
  mark: "A"
});

const developmentUserId = "sindico-demo";
const suggestedQuestions = [
  "Animais são permitidos?",
  "Quais regras existem para visitantes?",
  "O que preciso conferir antes de uma obra?"
] as const;

const condominiumCatalog: readonly CondominiumListItem[] = [
  { id: "alameda", name: "Residencial Alameda", detail: "Documentos disponíveis" },
  { id: "bosque", name: "Condomínio Bosque", detail: "Segundo condomínio autorizado" }
] as const;

const emptyRegistrationForm: RegistrationForm = {
  name: "",
  cnpj: "",
  administrationCompany: "",
  unitCount: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  managerName: "",
  email: "",
  phone: ""
};

function onlyDigits(value: string): string {
  return value.replaceAll(/\D/gu, "");
}

function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/u, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/u, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/u, ".$1/$2")
    .replace(/(\d{4})(\d)/u, "$1-$2");
}

function condominiumSlug(name: string, cnpj: string): string {
  const base = name
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
    .slice(0, 48);
  return `${base || "condominio"}-${onlyDigits(cnpj).slice(-6)}`;
}

function condominiumInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0]?.slice(0, 2).toLocaleUpperCase("pt-BR") ?? "CO";
  return `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("pt-BR");
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

function documentTypeLabel(type: RegisteredDocument["documentType"]): string {
  return {
    convention: "Convenção",
    internal_rules: "Regimento interno",
    meeting_minutes: "Ata",
    contract: "Contrato",
    other: "Outro documento"
  }[type];
}

function processingStatusLabel(status: RegisteredDocument["processingStatus"]): string {
  return {
    uploaded: "Recebido",
    processing: "Processando",
    ready: "Pronto para consulta",
    needs_review: "Precisa de revisão",
    failed: "Falha no processamento"
  }[status];
}

function extractionSummaryLabel(document: RegisteredDocument): string {
  if (document.extractionMethod === "image_vision") {
    return document.processingStatus === "ready"
      ? "1 imagem interpretada por IA · confira a foto original"
      : "Interpretação visual indisponível; a foto não está em consulta";
  }
  if (document.expectedPageCount === null || document.processedPageCount === null) {
    return document.mediaType?.startsWith("image/")
      ? "Análise da imagem ainda não concluída"
      : "Leitura ainda não medida";
  }

  const method = document.extractionMethod === "ocr" ? "OCR" : "texto do PDF";
  const pages = `${document.processedPageCount} de ${document.expectedPageCount} páginas lidas`;
  if (document.unreadablePageNumbers.length === 0) return `${pages} · ${method}`;
  return `${pages} · revisar páginas ${document.unreadablePageNumbers.join(", ")}`;
}

function validityStatusLabel(status: RegisteredDocument["validityStatus"]): string {
  return {
    pending: "Vigência pendente",
    confirmed: "Vigência confirmada",
    disputed: "Vigência em conflito",
    superseded: "Versão substituída",
    not_applicable: "Sem vigência"
  }[status];
}

function formatDocumentSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1) return "Tamanho não informado";
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1
  })} MB`;
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

export function registrationValidationErrors(
  form: RegistrationForm,
  constitutionMinutes: RegistrationFile | undefined,
  additionalDocuments: readonly RegistrationFile[],
  documentsConfirmed: boolean,
  realAccount: boolean
): readonly string[] {
  const errors: string[] = [];
  const cnpjDigits = onlyDigits(form.cnpj);
  const unitCount = form.unitCount.trim();

  if (form.name.trim().length < 2) errors.push("nome do condomínio");
  if (cnpjDigits.length !== 14) {
    errors.push(realAccount ? "CNPJ com 14 dígitos" : "CNPJ sintético com 14 dígitos");
  }
  if (form.city.trim().length === 0) errors.push("cidade");
  if (!/^[A-Z]{2}$/iu.test(form.state.trim())) errors.push("UF com 2 letras");
  if (
    unitCount !== "" &&
    (!/^\d+$/u.test(unitCount) || Number(unitCount) < 1 || Number(unitCount) > 100_000)
  ) {
    errors.push("quantidade de unidades válida");
  }
  if (form.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(form.email.trim())) {
    errors.push("e-mail de contato válido");
  }

  if (constitutionMinutes === undefined) {
    errors.push("ata de constituição em PDF");
  } else if (!isPdf(constitutionMinutes) || constitutionMinutes.size > 25 * 1024 * 1024) {
    errors.push("ata em PDF de até 25 MB");
  }

  const invalidAdditionalDocument = additionalDocuments.find(
    (file) => !isPdf(file) || file.size > 25 * 1024 * 1024
  );
  if (invalidAdditionalDocument !== undefined) {
    errors.push(`arquivo adicional "${invalidAdditionalDocument.name}" em PDF de até 25 MB`);
  }
  if (!documentsConfirmed) {
    errors.push("confirmação de que os documentos pertencem a este condomínio");
  }

  return errors;
}

export function formatRegistrationFailure(
  error: unknown,
  phase: "condominium" | "documents"
): string {
  const detail =
    error instanceof Error && error.message.trim() !== ""
      ? error.message.trim()
      : "erro inesperado";
  const normalizedDetail = detail.endsWith(".") ? detail : `${detail}.`;
  const action = phase === "documents" ? "salvar a ata e os documentos" : "criar o condomínio";
  const sessionHint = /acesso não autorizado|sessão não autenticada/iu.test(detail)
    ? " Confira se a sessão ainda está ativa; se necessário, volte ao login e tente novamente."
    : "";
  return `Não foi possível ${action}: ${normalizedDetail}${sessionHint}`;
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      {provisionalBrand.mark}
    </span>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M19 12H5m6-7-7 7 7 7" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 7h16m-10 4v5m4-5v5M9 7l1-3h4l1 3m3 0-1 13H7L6 7" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6m0 4h.01" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 12h5m-5 4h5" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M10 5H5v14h5m3-4 4-3-4-3m4 3H9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18 15.3a3.5 3.5 0 0 1 2 3.2V20" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M3 12h4l2.2-5 4.1 10 2.1-5H21" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FormattedText({ text }: Readonly<{ text: string }>) {
  return splitBoldText(text).map((segment, index) =>
    segment.bold ? <strong key={index}>{segment.text}</strong> : segment.text
  );
}

let chatAudioContext: AudioContext | undefined;

function availableChatAudioContext(): AudioContext | undefined {
  try {
    chatAudioContext ??= new AudioContext();
    if (chatAudioContext.state === "suspended") {
      void chatAudioContext.resume().catch(() => undefined);
    }
    return chatAudioContext;
  } catch {
    return undefined;
  }
}

function playMessageSentSound(): void {
  try {
    const audioContext = availableChatAudioContext();
    if (audioContext === undefined) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startedAt = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(680, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(880, startedAt + 0.1);
    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.045, startedAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.11);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startedAt);
    oscillator.stop(startedAt + 0.12);
  } catch {
    // O áudio é apenas uma confirmação; o envio continua em navegadores sem Web Audio.
  }
}

function playAnswerReceivedSound(): void {
  try {
    const audioContext = availableChatAudioContext();
    if (audioContext === undefined) return;
    const firstNote = audioContext.createOscillator();
    const secondNote = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startedAt = audioContext.currentTime;

    firstNote.type = "sine";
    firstNote.frequency.setValueAtTime(520, startedAt);
    secondNote.type = "sine";
    secondNote.frequency.setValueAtTime(720, startedAt + 0.09);
    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.035, startedAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.2);
    firstNote.connect(gain);
    secondNote.connect(gain);
    gain.connect(audioContext.destination);
    firstNote.start(startedAt);
    firstNote.stop(startedAt + 0.08);
    secondNote.start(startedAt + 0.09);
    secondNote.stop(startedAt + 0.2);
  } catch {
    // A resposta continua disponível mesmo quando o navegador bloqueia o áudio.
  }
}

export function App() {
  const [view, setView] = useState<View>("landing");
  const [displayName, setDisplayName] = useState("Gestor");
  const [condominiumId, setCondominiumId] = useState("alameda");
  const [availableCondominiums, setAvailableCondominiums] = useState<CondominiumListItem[]>([
    ...condominiumCatalog
  ]);
  const [condominiumSearch, setCondominiumSearch] = useState("");
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(emptyRegistrationForm);
  const [constitutionMinutes, setConstitutionMinutes] = useState<File | undefined>();
  const [additionalDocuments, setAdditionalDocuments] = useState<readonly File[]>([]);
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registrationReturnView, setRegistrationReturnView] = useState<
    "onboarding" | "condominiums"
  >("condominiums");
  const [setupNotice, setSetupNotice] = useState<string | undefined>();
  const [registrationMessageIsError, setRegistrationMessageIsError] = useState(false);
  const [context, setContext] = useState<ContextResponse | undefined>();
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState<PublicAnswer | undefined>();
  const [conversationError, setConversationError] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    readonly ConversationHistoryEntry[]
  >([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | undefined>();
  const [feedback, setFeedback] = useState<FeedbackClassification | undefined>();
  const [message, setMessage] = useState("Escolha ou crie um condomínio para iniciar.");
  const [aiProvider, setAiProvider] = useState<AiProvider>("unavailable");
  const [authMode, setAuthMode] = useState<AuthMode>("unknown");
  const [authSessionRestore, setAuthSessionRestore] = useState(true);
  const [accountSecurityEnabled, setAccountSecurityEnabled] = useState(false);
  const [authPanel, setAuthPanel] = useState<AuthPanel>("login");
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirmation, setAuthPasswordConfirmation] = useState("");
  const [authActionToken, setAuthActionToken] = useState("");
  const [authChallengeId, setAuthChallengeId] = useState("");
  const [authMfaCode, setAuthMfaCode] = useState("");
  const [authDevelopmentActionUrl, setAuthDevelopmentActionUrl] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageIsError, setAuthMessageIsError] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [accountSecurityStatus, setAccountSecurityStatus] = useState<
    AccountSecurityStatus | undefined
  >();
  const [accountSessions, setAccountSessions] = useState<readonly ManagedAuthSession[]>([]);
  const [accountSettingsBusy, setAccountSettingsBusy] = useState(false);
  const [accountSettingsMessage, setAccountSettingsMessage] = useState("");
  const [accountSettingsMessageIsError, setAccountSettingsMessageIsError] = useState(false);
  const [currentAccountPassword, setCurrentAccountPassword] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountPasswordConfirmation, setNewAccountPasswordConfirmation] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | undefined>();
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<readonly string[]>([]);
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | undefined>();
  const [adminDashboardBusy, setAdminDashboardBusy] = useState(false);
  const [adminDashboardError, setAdminDashboardError] = useState("");
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("personalization");
  const [profileReturnView, setProfileReturnView] = useState<"chat" | "condominiums">("chat");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsMessageIsError, setSettingsMessageIsError] = useState(false);
  const [condominiumProfile, setCondominiumProfile] = useState<
    CondominiumProfileDraft | undefined
  >();
  const [condominiumProfilePhotos, setCondominiumProfilePhotos] = useState<
    readonly CondominiumProfilePhoto[]
  >([]);
  const [condominiumProfilePhotoUrls, setCondominiumProfilePhotoUrls] = useState<
    Readonly<Record<string, string>>
  >({});
  const [condominiumProfileLoading, setCondominiumProfileLoading] = useState(false);
  const [condominiumProfileSaving, setCondominiumProfileSaving] = useState(false);
  const [condominiumProfileUploading, setCondominiumProfileUploading] = useState(false);
  const [profilePhotoRemoving, setProfilePhotoRemoving] = useState(false);
  const [condominiumProfileMessage, setCondominiumProfileMessage] = useState("");
  const [condominiumProfileMessageIsError, setCondominiumProfileMessageIsError] = useState(false);
  const [profilePhotoRemovalCandidate, setProfilePhotoRemovalCandidate] = useState<
    CondominiumProfilePhoto | undefined
  >();
  const [registeredDocuments, setRegisteredDocuments] = useState<readonly RegisteredDocument[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<readonly ArchivedDocument[]>([]);
  const [registeredDocumentsBusy, setRegisteredDocumentsBusy] = useState(false);
  const [registeredDocumentsError, setRegisteredDocumentsError] = useState("");
  const [documentRemovalCandidate, setDocumentRemovalCandidate] = useState<
    RegisteredDocument | undefined
  >();
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | undefined>();
  const [documentPreviewBusy, setDocumentPreviewBusy] = useState(false);
  const [documentPreviewError, setDocumentPreviewError] = useState("");
  const [settingsDocumentFiles, setSettingsDocumentFiles] = useState<readonly File[]>([]);
  const [settingsDocumentsConfirmed, setSettingsDocumentsConfirmed] = useState(false);
  const [settingsDocumentsUploading, setSettingsDocumentsUploading] = useState(false);
  const [chatDocumentMessage, setChatDocumentMessage] = useState("");
  const [chatDocumentMessageIsError, setChatDocumentMessageIsError] = useState(false);
  const [chatDocumentUploading, setChatDocumentUploading] = useState(false);
  const [pendingChatDocument, setPendingChatDocument] = useState<File | undefined>();
  const [sentChatDocumentName, setSentChatDocumentName] = useState("");
  const [leaveManagementOpen, setLeaveManagementOpen] = useState(false);
  const [leaveManagementBusy, setLeaveManagementBusy] = useState(false);
  const [condominiumNotice, setCondominiumNotice] = useState("");
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const chatDocumentInput = useRef<HTMLInputElement>(null);
  const documentPreviewUrl = useRef<string | undefined>(undefined);
  const profilePhotoObjectUrls = useRef<readonly string[]>([]);
  const touchStartX = useRef<number | null>(null);
  const isConversationalResponse =
    answer !== undefined && isSimpleConversationMessage(submittedQuestion);
  const answerStatus:
    Readonly<{ label: string; tone: "attention" | "conflict" | "failed" }> | undefined =
    answer === undefined || isConversationalResponse
      ? undefined
      : answer.answerMode === "conflict"
        ? { label: "Fontes em conflito", tone: "conflict" }
        : answer.answerMode === "failed"
          ? { label: "Consulta interrompida", tone: "failed" }
          : answer.riskClass === "high"
            ? { label: "Risco alto", tone: "attention" }
            : undefined;
  const showsExceptionalGuidance =
    answer !== undefined &&
    !isConversationalResponse &&
    (answer.answerMode !== "grounded" || answer.riskClass === "high" || answer.specialist.required);
  const visibleAttentionPoints =
    answer === undefined || isConversationalResponse
      ? []
      : answer.attentionPoints
          .filter(
            (point) =>
              point !== answer.specialist.reason &&
              (showsExceptionalGuidance || isRelevantServiceDegradation(point))
          )
          .slice(0, 1);

  useEffect(
    () => () => {
      if (documentPreviewUrl.current !== undefined) URL.revokeObjectURL(documentPreviewUrl.current);
      profilePhotoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );
  const showSuggestedNextStep = showsExceptionalGuidance && answer?.suggestedNextStep !== null;
  const showSpecialist = answer?.specialist.required === true;
  const showResponseGuidance =
    visibleAttentionPoints.length > 0 || showSuggestedNextStep || showSpecialist;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const verificationToken = query.get("verify_email");
    const resetToken = query.get("reset_password");
    if (verificationToken !== null || resetToken !== null) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (verificationToken !== null) {
      setAuthActionToken(verificationToken);
      setAuthPanel("verify");
      setView("login");
      return;
    }
    if (resetToken !== null) {
      setAuthActionToken(resetToken);
      setAuthPanel("reset");
      setView("login");
    }
  }, []);

  useEffect(() => {
    let runtimeRequestActive = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4_000);
    void fetch("/v1/runtime", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("A configuração do ambiente está indisponível.");
        const body = (await response.json()) as Readonly<{
          aiProvider?: unknown;
          authMode?: unknown;
          authSessionRestore?: unknown;
          accountSecurityEnabled?: unknown;
        }>;
        if (!runtimeRequestActive) return;
        if (body.aiProvider === "gemini" || body.aiProvider === "local") {
          setAiProvider(body.aiProvider);
        }
        if (body.authMode === "real" || body.authMode === "development") {
          setAuthMode(body.authMode);
        } else {
          throw new Error("O modo de autenticação retornado é inválido.");
        }
        if (typeof body.authSessionRestore === "boolean") {
          setAuthSessionRestore(body.authSessionRestore);
        }
        setAccountSecurityEnabled(body.accountSecurityEnabled === true);
      })
      .catch(() => {
        if (!runtimeRequestActive) return;
        setAiProvider("unavailable");
        setAuthMode("unavailable");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
    return () => {
      runtimeRequestActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (authMode !== "real") return;
    if (!authSessionRestore) {
      void fetch("/v1/auth/logout", { method: "POST", credentials: "same-origin" }).catch(
        () => undefined
      );
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/v1/auth/session", { credentials: "same-origin" });
        if (!response.ok) return;
        const body = (await response.json()) as Readonly<{ user?: AuthUser }>;
        if (body.user === undefined) return;
        setAuthUser(body.user);
        setDisplayName(body.user.displayName);
        if (body.user.isAdmin) {
          setView("admin-dashboard");
          await loadAdminDashboard();
          return;
        }
        await loadAuthorizedCondominiums();
        setMessage("Escolha um condomínio autorizado para abrir a conversa.");
      } catch {
        setAvailableCondominiums([]);
      }
    })();
  }, [authMode, authSessionRestore]);

  useEffect(() => {
    if (authMode !== "development") return;
    void fetch("/v1/development/test-condominiums", {
      headers: { "x-development-user-id": developmentUserId }
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as Readonly<{
          condominiums?: readonly Readonly<{
            condominiumId: string;
            name: string;
            address: Readonly<{ city: string; state: string }>;
          }>[];
        }>;
        const profiles = body.condominiums;
        if (!Array.isArray(profiles)) return;
        setAvailableCondominiums((current) => [
          ...current,
          ...profiles
            .filter((profile) => !current.some((item) => item.id === profile.condominiumId))
            .map((profile) => ({
              id: profile.condominiumId,
              name: profile.name,
              detail: `${profile.address.city}/${profile.address.state} · Condomínio autorizado`
            }))
        ]);
      })
      .catch(() => undefined);
  }, [authMode]);

  useEffect(() => {
    const input = composerInput.current;
    if (input === null) return;

    input.style.height = "auto";
    const styles = window.getComputedStyle(input);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const maximumHeight = lineHeight * 5 + verticalPadding;
    input.style.height = `${Math.min(input.scrollHeight, maximumHeight)}px`;
    input.style.overflowY = input.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, [question]);

  async function submitAuthentication(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const registering = authPanel === "register";
    if (registering && authPassword !== authPasswordConfirmation) {
      setAuthMessage("As senhas informadas não são iguais.");
      setAuthMessageIsError(true);
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    setAuthMessageIsError(false);
    setAuthDevelopmentActionUrl("");
    const endpoint = registering ? "/v1/auth/register" : "/v1/auth/login";
    const payload = registering
      ? { displayName: authDisplayName, email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        setAuthMessage(await readMessage(response, "Não foi possível concluir o acesso."));
        setAuthMessageIsError(true);
        return;
      }
      const body = (await response.json()) as Readonly<{
        user?: AuthUser;
        verificationRequired?: boolean;
        mfaRequired?: boolean;
        challengeId?: string;
        developmentActionUrl?: string;
      }>;
      if (registering && body.verificationRequired === true) {
        setAuthPassword("");
        setAuthPasswordConfirmation("");
        setAuthDevelopmentActionUrl(body.developmentActionUrl ?? "");
        setAuthPanel("verify");
        setAuthMessage(
          body.developmentActionUrl === undefined
            ? "Conta criada. Consulte seu e-mail para confirmar o endereço antes de entrar."
            : "Conta criada. Neste ambiente de desenvolvimento, use o link abaixo para confirmar o e-mail."
        );
        return;
      }
      if (body.mfaRequired === true && typeof body.challengeId === "string") {
        setAuthChallengeId(body.challengeId);
        setAuthMfaCode("");
        setAuthPassword("");
        setAuthPanel("mfa");
        setAuthMessage("Informe o código do aplicativo autenticador ou um código de recuperação.");
        return;
      }
      if (body.user === undefined) {
        setAuthMessage("A resposta do servidor não trouxe uma conta válida.");
        setAuthMessageIsError(true);
        return;
      }
      await completeAccountLogin(body.user);
    } catch {
      setAuthMessage("Não foi possível conectar ao servidor agora.");
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  }

  async function completeAccountLogin(user: AuthUser): Promise<void> {
    setAuthUser(user);
    setDisplayName(user.displayName);
    setAuthPassword("");
    setAuthPasswordConfirmation("");
    setAuthMfaCode("");
    setAuthChallengeId("");
    setAuthMessage("");
    setAuthMessageIsError(false);
    if (user.isAdmin) {
      setView("admin-dashboard");
      await loadAdminDashboard();
      return;
    }
    await loadAuthorizedCondominiums();
    setMessage("Login concluído. Escolha um condomínio autorizado para abrir a conversa.");
    setView("condominiums");
  }

  async function submitMfaChallenge(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    setAuthMessageIsError(false);
    try {
      const response = await fetch("/v1/auth/mfa/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ challengeId: authChallengeId, code: authMfaCode })
      });
      if (!response.ok) {
        setAuthMessage(await readMessage(response, "O código não pôde ser validado."));
        setAuthMessageIsError(true);
        return;
      }
      const body = (await response.json()) as Readonly<{ user?: AuthUser }>;
      if (body.user === undefined) throw new Error("missing_user");
      await completeAccountLogin(body.user);
    } catch {
      setAuthMessage("Não foi possível validar o segundo fator agora.");
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestAccountAction(
    event: FormEvent<HTMLFormElement>,
    purpose: "verify-email" | "password-reset"
  ): Promise<void> {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    setAuthMessageIsError(false);
    setAuthDevelopmentActionUrl("");
    try {
      const response = await fetch(`/v1/auth/${purpose}/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: authEmail })
      });
      if (!response.ok) {
        setAuthMessage(await readMessage(response, "Não foi possível enviar as instruções."));
        setAuthMessageIsError(true);
        return;
      }
      const body = (await response.json()) as Readonly<{
        message?: string;
        developmentActionUrl?: string;
      }>;
      setAuthDevelopmentActionUrl(body.developmentActionUrl ?? "");
      setAuthMessage(body.message ?? "Se a conta for compatível, as instruções serão enviadas.");
    } catch {
      setAuthMessage("Não foi possível conectar ao servidor agora.");
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  }

  async function confirmEmail(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    setAuthMessageIsError(false);
    try {
      const response = await fetch("/v1/auth/verify-email/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: authActionToken })
      });
      if (!response.ok) {
        setAuthMessage(await readMessage(response, "O link é inválido ou expirou."));
        setAuthMessageIsError(true);
        return;
      }
      window.history.replaceState({}, "", window.location.pathname);
      setAuthActionToken("");
      setAuthDevelopmentActionUrl("");
      setAuthPanel("login");
      setAuthMessage("E-mail confirmado. Agora você pode entrar.");
    } catch {
      setAuthMessage("Não foi possível confirmar o e-mail agora.");
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  }

  async function resetAccountPassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (authPassword !== authPasswordConfirmation) {
      setAuthMessage("As senhas informadas não são iguais.");
      setAuthMessageIsError(true);
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    setAuthMessageIsError(false);
    try {
      const response = await fetch("/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token: authActionToken, password: authPassword })
      });
      if (!response.ok) {
        setAuthMessage(await readMessage(response, "O link é inválido ou expirou."));
        setAuthMessageIsError(true);
        return;
      }
      window.history.replaceState({}, "", window.location.pathname);
      setAuthActionToken("");
      setAuthPassword("");
      setAuthPasswordConfirmation("");
      setAuthPanel("login");
      setAuthMessage("Senha redefinida. Todas as sessões anteriores foram encerradas.");
    } catch {
      setAuthMessage("Não foi possível redefinir a senha agora.");
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  }

  async function logoutAccount(): Promise<void> {
    await fetch("/v1/auth/logout", { method: "POST", credentials: "same-origin" }).catch(
      () => undefined
    );
    setAuthUser(undefined);
    setAuthDisplayName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthPasswordConfirmation("");
    setAuthActionToken("");
    setAuthChallengeId("");
    setAuthMfaCode("");
    setAuthDevelopmentActionUrl("");
    setAuthMessage("");
    setAuthMessageIsError(false);
    setAccountSecurityStatus(undefined);
    setAccountSessions([]);
    setAccountSettingsMessage("");
    setMfaSetup(undefined);
    setMfaRecoveryCodes([]);
    setAdminDashboard(undefined);
    setAdminDashboardError("");
    setChatSettings(defaultChatSettings);
    setCondominiumNotice("");
    setRegisteredDocuments([]);
    setSettingsDocumentFiles([]);
    setSettingsDocumentsConfirmed(false);
    setAvailableCondominiums([...condominiumCatalog]);
    setView("landing");
  }

  async function loadAdminDashboard(): Promise<void> {
    setAdminDashboardBusy(true);
    setAdminDashboardError("");
    try {
      const response = await fetch("/v1/admin/dashboard", { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível carregar os indicadores da Zermatt.")
        );
      }
      const body = (await response.json()) as AdminDashboard;
      setAdminDashboard(body);
    } catch (error: unknown) {
      setAdminDashboardError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os indicadores da Zermatt."
      );
    } finally {
      setAdminDashboardBusy(false);
    }
  }

  function openAuthentication(panel: AuthPanel): void {
    setAuthPanel(panel);
    setAuthMessage("");
    setAuthMessageIsError(false);
    setAuthPassword("");
    setAuthPasswordConfirmation("");
    setAuthMfaCode("");
    setAuthChallengeId("");
    setAuthDevelopmentActionUrl("");
    setView("login");
  }

  function resetConversation() {
    setQuestion("");
    setSubmittedQuestion("");
    setAnswer(undefined);
    setConversationError("");
    setConversationHistory([]);
    setSelectedCitation(undefined);
    setFeedback(undefined);
    setConversationError("");
    setSetupNotice(undefined);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
    setPendingChatDocument(undefined);
    setSentChatDocumentName("");
  }

  function openCondominiumPicker() {
    if (authMode === "real" || window.matchMedia("(max-width: 720px)").matches) {
      setCondominiumSearch("");
      if (authMode === "real") void loadAuthorizedCondominiums();
      setView("condominiums");
      return;
    }
    setView("onboarding");
  }

  function openChatSettings(): void {
    setSettingsTab("personalization");
    setSettingsMessage("");
    setSettingsMessageIsError(false);
    setCondominiumProfileMessage("");
    setCondominiumProfileMessageIsError(false);
    setCondominiumProfile(undefined);
    setCondominiumProfilePhotos([]);
    setCondominiumProfilePhotoUrls({});
    profilePhotoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    profilePhotoObjectUrls.current = [];
    setSettingsDocumentFiles([]);
    setSettingsDocumentsConfirmed(false);
    setLeaveManagementOpen(false);
    setView("chat-settings");
    if (context !== undefined) {
      void loadRegisteredDocuments(context.condominiumId);
      void loadCondominiumProfile(context.condominiumId);
    }
  }

  function handleSettingsTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: SettingsTab
  ): void {
    const currentIndex = settingsTabOrder.indexOf(currentTab);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % settingsTabOrder.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + settingsTabOrder.length) % settingsTabOrder.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = settingsTabOrder.length - 1;
    if (nextIndex === undefined) return;

    const nextTab = settingsTabOrder[nextIndex];
    if (nextTab === undefined) return;
    event.preventDefault();
    setSettingsTab(nextTab);
    document.getElementById(`settings-tab-${nextTab}`)?.focus();
  }

  async function loadAccountSecurity(): Promise<void> {
    if (!accountSecurityEnabled) return;
    setAccountSettingsBusy(true);
    try {
      const [statusResponse, sessionsResponse] = await Promise.all([
        fetch("/v1/auth/security", { credentials: "same-origin" }),
        fetch("/v1/auth/sessions", { credentials: "same-origin" })
      ]);
      if (!statusResponse.ok) {
        throw new Error(
          await readMessage(statusResponse, "Não foi possível carregar a segurança da conta.")
        );
      }
      if (!sessionsResponse.ok) {
        throw new Error(
          await readMessage(sessionsResponse, "Não foi possível carregar os dispositivos.")
        );
      }
      const status = (await statusResponse.json()) as AccountSecurityStatus;
      const sessionsBody = (await sessionsResponse.json()) as Readonly<{
        sessions?: readonly ManagedAuthSession[];
      }>;
      setAccountSecurityStatus(status);
      setAccountSessions(sessionsBody.sessions ?? []);
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível carregar a segurança da conta."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function changeAccountPassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (newAccountPassword !== newAccountPasswordConfirmation) {
      setAccountSettingsMessage("As novas senhas informadas não são iguais.");
      setAccountSettingsMessageIsError(true);
      return;
    }
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    try {
      const response = await fetch("/v1/auth/password/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: currentAccountPassword,
          newPassword: newAccountPassword
        })
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível trocar a senha."));
      }
      setCurrentAccountPassword("");
      setNewAccountPassword("");
      setNewAccountPasswordConfirmation("");
      setAccountSettingsMessage(
        "Senha alterada. Os outros dispositivos foram desconectados; esta sessão continua ativa."
      );
      setAccountSettingsMessageIsError(false);
      await loadAccountSecurity();
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível trocar a senha."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function beginMfaSetup(): Promise<void> {
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    setMfaRecoveryCodes([]);
    try {
      const response = await fetch("/v1/auth/mfa/setup", {
        method: "POST",
        credentials: "same-origin"
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível iniciar o MFA."));
      }
      setMfaSetup((await response.json()) as MfaSetup);
      setMfaSetupCode("");
      setAccountSettingsMessage(
        "Adicione a chave no aplicativo autenticador e informe o código de seis dígitos."
      );
      setAccountSettingsMessageIsError(false);
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar o MFA."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function enableMfa(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    try {
      const response = await fetch("/v1/auth/mfa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: mfaSetupCode })
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível ativar o MFA."));
      }
      const body = (await response.json()) as Readonly<{ recoveryCodes?: readonly string[] }>;
      setMfaRecoveryCodes(body.recoveryCodes ?? []);
      setMfaSetup(undefined);
      setMfaSetupCode("");
      setAccountSecurityStatus((current) =>
        current === undefined
          ? { emailVerified: true, mfaEnabled: true }
          : { ...current, mfaEnabled: true }
      );
      setAccountSettingsMessage(
        "MFA ativado. Guarde os códigos de recuperação antes de sair desta tela."
      );
      setAccountSettingsMessageIsError(false);
      await loadAccountSecurity();
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível ativar o MFA."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function disableMfa(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    try {
      const response = await fetch("/v1/auth/mfa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: mfaDisablePassword, code: mfaDisableCode })
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível desativar o MFA."));
      }
      setMfaDisablePassword("");
      setMfaDisableCode("");
      setMfaRecoveryCodes([]);
      setAccountSecurityStatus((current) =>
        current === undefined
          ? { emailVerified: true, mfaEnabled: false }
          : { ...current, mfaEnabled: false }
      );
      setAccountSettingsMessage("MFA desativado. Os outros dispositivos foram desconectados.");
      setAccountSettingsMessageIsError(false);
      await loadAccountSecurity();
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível desativar o MFA."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function revokeAccountSession(session: ManagedAuthSession): Promise<void> {
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    try {
      const response = await fetch(`/v1/auth/sessions/${encodeURIComponent(session.sessionId)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível encerrar a sessão."));
      }
      const body = (await response.json()) as Readonly<{ currentRevoked?: boolean }>;
      if (body.currentRevoked === true) {
        await logoutAccount();
        return;
      }
      setAccountSettingsMessage("Dispositivo desconectado.");
      setAccountSettingsMessageIsError(false);
      await loadAccountSecurity();
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível encerrar a sessão."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  async function revokeOtherAccountSessions(): Promise<void> {
    setAccountSettingsBusy(true);
    setAccountSettingsMessage("");
    try {
      const response = await fetch("/v1/auth/sessions/revoke-others", {
        method: "POST",
        credentials: "same-origin"
      });
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível desconectar os dispositivos.")
        );
      }
      setAccountSettingsMessage("Todos os outros dispositivos foram desconectados.");
      setAccountSettingsMessageIsError(false);
      await loadAccountSecurity();
    } catch (error: unknown) {
      setAccountSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível desconectar os dispositivos."
      );
      setAccountSettingsMessageIsError(true);
    } finally {
      setAccountSettingsBusy(false);
    }
  }

  function openProfile(returnView: "chat" | "condominiums"): void {
    setProfileReturnView(returnView);
    setAccountSettingsMessage("");
    setAccountSettingsMessageIsError(false);
    setView("profile");
    if (authMode === "real") void loadAccountSecurity();
  }

  function openCondominiumRegistration(returnView: "onboarding" | "condominiums") {
    setRegistrationReturnView(returnView);
    setRegistrationForm({
      ...emptyRegistrationForm,
      managerName: displayName.trim()
    });
    setConstitutionMinutes(undefined);
    setAdditionalDocuments([]);
    setDocumentsConfirmed(false);
    setRegistrationMessage("");
    setRegistrationMessageIsError(false);
    setView("create-condominium");
  }

  async function loadAuthorizedCondominiums(): Promise<void> {
    try {
      const response = await fetch("/v1/condominiums", { credentials: "same-origin" });
      if (!response.ok) {
        setAvailableCondominiums([]);
        return;
      }
      const body = (await response.json()) as Readonly<{
        condominiums?: readonly Readonly<{
          condominiumId: string;
          name: string;
          detail: string;
        }>[];
      }>;
      if (!Array.isArray(body.condominiums)) {
        setAvailableCondominiums([]);
        return;
      }
      setAvailableCondominiums(
        body.condominiums.map((item) => ({
          id: item.condominiumId,
          name: item.name,
          detail: item.detail
        }))
      );
    } catch {
      setAvailableCondominiums([]);
    }
  }

  async function deleteCondominium(): Promise<void> {
    const activeContext = context;
    if (activeContext === undefined || activeContext.role !== "manager") return;

    setLeaveManagementBusy(true);
    setSettingsMessage("");
    setSettingsMessageIsError(false);
    const condominiumId = activeContext.condominiumId;
    const endpoint =
      authMode === "real"
        ? `/v1/condominiums/${encodeURIComponent(condominiumId)}`
        : `/v1/development/test-condominiums/${encodeURIComponent(condominiumId)}`;
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "same-origin",
        ...(authMode === "development"
          ? { headers: { "x-development-user-id": developmentUserId } }
          : {})
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível apagar o condomínio."));
      }

      setAvailableCondominiums((current) =>
        current.filter((item) => item.id !== activeContext.condominiumId)
      );
      setCondominiumId("");
      setContext(undefined);
      resetConversation();
      setLeaveManagementOpen(false);
      setCondominiumNotice(
        "Condomínio apagado. O cadastro, os documentos, o chat e o histórico foram excluídos permanentemente."
      );
      setView("condominiums");
    } catch (error: unknown) {
      setLeaveManagementOpen(false);
      setSettingsMessageIsError(true);
      setSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível apagar o condomínio."
      );
    } finally {
      setLeaveManagementBusy(false);
    }
  }

  function updateRegistrationField(field: keyof RegistrationForm, value: string) {
    setRegistrationForm((current) => ({ ...current, [field]: value }));
  }

  async function loadConversationHistory(id: string): Promise<void> {
    try {
      const response = await fetch(`/v1/condominiums/${encodeURIComponent(id)}/history?limit=50`, {
        headers: { "x-development-user-id": developmentUserId }
      });
      if (!response.ok) {
        setConversationHistory([]);
        return;
      }
      const body = (await response.json()) as Readonly<{
        entries?: readonly ConversationHistoryEntry[];
      }>;
      setConversationHistory(Array.isArray(body.entries) ? body.entries : []);
    } catch {
      setConversationHistory([]);
    }
  }

  async function selectCondominium(id = condominiumId, showChat = true) {
    setBusy(true);
    setCondominiumNotice("");
    resetConversation();
    try {
      const response = await fetch(`/v1/condominiums/${encodeURIComponent(id)}/context`, {
        headers: { "x-development-user-id": developmentUserId }
      });

      if (!response.ok) {
        setContext(undefined);
        setMessage("Não foi possível acessar esse condomínio.");
        return;
      }

      const body = (await response.json()) as ContextResponse;
      setCondominiumId(body.condominiumId);
      setContext(body);
      await loadConversationHistory(body.condominiumId);
      setMessage(`Contexto ativo: ${body.condominiumId}.`);
      if (showChat) setView("chat");
    } catch {
      setContext(undefined);
      setMessage("Não foi possível conectar ao servidor agora.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadRegistrationDocument(
    condominium: string,
    file: File,
    documentType: string,
    title: string
  ): Promise<DocumentMemoryStatus | undefined> {
    const response = await requestDocumentUploadWithAuthorizationRecovery(fetch, {
      condominiumId: condominium,
      content: file,
      title,
      documentType,
      authMode: authMode === "development" ? "development" : "real",
      developmentUserId
    });
    if (!response.ok) {
      throw new Error(await readMessage(response, `Não foi possível salvar ${file.name}.`));
    }
    const body = (await response.json()) as Readonly<{ memoryStatus?: DocumentMemoryStatus }>;
    return body.memoryStatus;
  }

  async function loadRegisteredDocuments(id: string): Promise<void> {
    setRegisteredDocumentsBusy(true);
    setRegisteredDocumentsError("");
    try {
      const headers =
        authMode === "development" ? { "x-development-user-id": developmentUserId } : {};
      const [response, archivedResponse] = await Promise.all([
        fetch(`/v1/condominiums/${encodeURIComponent(id)}/documents`, {
          credentials: "same-origin",
          headers
        }),
        fetch(`/v1/condominiums/${encodeURIComponent(id)}/documents/archived`, {
          credentials: "same-origin",
          headers
        })
      ]);
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível carregar os documentos registrados.")
        );
      }
      const body = (await response.json()) as Readonly<{
        documents?: readonly RegisteredDocument[];
      }>;
      setRegisteredDocuments(Array.isArray(body.documents) ? body.documents : []);
      if (archivedResponse.ok) {
        const archivedBody = (await archivedResponse.json()) as Readonly<{
          documents?: readonly ArchivedDocument[];
        }>;
        setArchivedDocuments(Array.isArray(archivedBody.documents) ? archivedBody.documents : []);
      } else {
        setArchivedDocuments([]);
      }
    } catch (error: unknown) {
      setRegisteredDocuments([]);
      setArchivedDocuments([]);
      setRegisteredDocumentsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os documentos registrados."
      );
    } finally {
      setRegisteredDocumentsBusy(false);
    }
  }

  function profileRequestHeaders(): Readonly<Record<string, string>> {
    return authMode === "development" ? { "x-development-user-id": developmentUserId } : {};
  }

  async function loadCondominiumProfile(id: string): Promise<void> {
    setCondominiumProfileLoading(true);
    setCondominiumProfileMessage("");
    try {
      const response = await fetch(`/v1/condominiums/${encodeURIComponent(id)}/profile`, {
        credentials: "same-origin",
        headers: profileRequestHeaders()
      });
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível carregar os dados do condomínio.")
        );
      }
      const body = (await response.json()) as Readonly<{
        profile?: CondominiumProfile;
        photos?: readonly CondominiumProfilePhoto[];
      }>;
      if (body.profile === undefined || context?.condominiumId !== id) return;

      const photos = Array.isArray(body.photos) ? body.photos : [];
      const urls = await Promise.all(
        photos.map(async (photo) => {
          try {
            const imageResponse = await fetch(
              `/v1/condominiums/${encodeURIComponent(id)}/profile/photos/${encodeURIComponent(photo.photoId)}`,
              { credentials: "same-origin", headers: profileRequestHeaders() }
            );
            if (!imageResponse.ok) return undefined;
            return [photo.photoId, URL.createObjectURL(await imageResponse.blob())] as const;
          } catch {
            return undefined;
          }
        })
      );
      const photoUrlEntries = urls.filter((item) => item !== undefined);
      if (context?.condominiumId !== id) {
        photoUrlEntries.forEach(([, url]) => URL.revokeObjectURL(url));
        return;
      }
      const nextUrls = Object.fromEntries(photoUrlEntries);
      profilePhotoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      profilePhotoObjectUrls.current = Object.values(nextUrls);
      setCondominiumProfilePhotoUrls(nextUrls);
      setCondominiumProfile({
        ...body.profile,
        unitCount: body.profile.unitCount === null ? "" : String(body.profile.unitCount)
      });
      setCondominiumProfilePhotos(photos);
      const locality = `${body.profile.address.city}/${body.profile.address.state}`;
      setAvailableCondominiums((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                name: body.profile?.name ?? item.name,
                detail: body.profile?.address.city
                  ? `${locality} · Condomínio autorizado`
                  : item.detail
              }
            : item
        )
      );
    } catch (error: unknown) {
      if (context?.condominiumId !== id) return;
      setCondominiumProfileMessage(
        error instanceof Error ? error.message : "Não foi possível carregar os dados do condomínio."
      );
      setCondominiumProfileMessageIsError(true);
    } finally {
      setCondominiumProfileLoading(false);
    }
  }

  async function saveCondominiumProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const activeContext = context;
    const profile = condominiumProfile;
    if (activeContext === undefined || profile === undefined || activeContext.role !== "manager")
      return;
    setCondominiumProfileSaving(true);
    setCondominiumProfileMessage("");
    setCondominiumProfileMessageIsError(false);
    try {
      const unitCount = profile.unitCount.trim() === "" ? null : Number(profile.unitCount);
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(activeContext.condominiumId)}/profile`,
        {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json", ...profileRequestHeaders() },
          body: JSON.stringify({
            name: profile.name,
            address: profile.address,
            administrationCompany: profile.administrationCompany,
            unitCount,
            contact: profile.contact,
            description: profile.description
          })
        }
      );
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível salvar o perfil do condomínio.")
        );
      }
      const body = (await response.json()) as Readonly<{ profile?: CondominiumProfile }>;
      if (body.profile === undefined) throw new Error("O servidor não confirmou as alterações.");
      setCondominiumProfile({
        ...body.profile,
        unitCount: body.profile.unitCount === null ? "" : String(body.profile.unitCount)
      });
      const locality = `${body.profile.address.city}/${body.profile.address.state}`;
      setAvailableCondominiums((current) =>
        current.map((item) =>
          item.id === activeContext.condominiumId
            ? {
                ...item,
                name: body.profile?.name ?? item.name,
                detail: `${locality} · Condomínio autorizado`
              }
            : item
        )
      );
      setCondominiumProfileMessage("Perfil do condomínio atualizado.");
    } catch (error: unknown) {
      setCondominiumProfileMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o perfil do condomínio."
      );
      setCondominiumProfileMessageIsError(true);
    } finally {
      setCondominiumProfileSaving(false);
    }
  }

  async function addCondominiumProfilePhotos(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const activeContext = context;
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (activeContext === undefined || activeContext.role !== "manager" || files.length === 0)
      return;
    const remaining = 5 - condominiumProfilePhotos.length;
    if (files.length > remaining) {
      setCondominiumProfileMessage(
        remaining > 0
          ? `Você pode adicionar mais ${remaining} foto(s).`
          : "Este condomínio já tem cinco fotos. Remova uma para adicionar outra."
      );
      setCondominiumProfileMessageIsError(true);
      return;
    }

    setCondominiumProfileUploading(true);
    setCondominiumProfileMessage("");
    setCondominiumProfileMessageIsError(false);
    const failures: string[] = [];
    let uploaded = 0;
    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLocaleLowerCase("pt-BR");
        const mediaType =
          file.type ||
          (extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : extension === "png"
              ? "image/png"
              : extension === "webp"
                ? "image/webp"
                : "");
        if (
          !new Set(["image/jpeg", "image/png", "image/webp"]).has(mediaType) ||
          file.size > 5 * 1024 * 1024
        ) {
          failures.push(`${file.name}: use JPEG, PNG ou WebP de até 5 MB.`);
          continue;
        }
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (let offset = 0; offset < bytes.length; offset += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
          }
          const response = await fetch(
            `/v1/condominiums/${encodeURIComponent(activeContext.condominiumId)}/profile/photos`,
            {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json", ...profileRequestHeaders() },
              body: JSON.stringify({ mediaType, contentBase64: btoa(binary) })
            }
          );
          if (!response.ok) throw new Error(await readMessage(response, "A foto não foi aceita."));
          uploaded += 1;
        } catch (error: unknown) {
          failures.push(
            `${file.name}: ${error instanceof Error ? error.message : "não foi enviada."}`
          );
        }
      }
      await loadCondominiumProfile(activeContext.condominiumId);
      if (failures.length > 0) {
        setCondominiumProfileMessage(
          `${uploaded} de ${files.length} foto(s) enviada(s). ${failures.join(" ")}`
        );
        setCondominiumProfileMessageIsError(true);
      } else {
        setCondominiumProfileMessage(`${uploaded} foto(s) adicionada(s) ao perfil.`);
      }
    } finally {
      setCondominiumProfileUploading(false);
    }
  }

  async function setCondominiumProfileCover(photoId: string): Promise<void> {
    const activeContext = context;
    if (activeContext === undefined || activeContext.role !== "manager") return;
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(activeContext.condominiumId)}/profile/photos/${encodeURIComponent(photoId)}/cover`,
        { method: "PUT", credentials: "same-origin", headers: profileRequestHeaders() }
      );
      if (!response.ok)
        throw new Error(await readMessage(response, "Não foi possível escolher a foto de capa."));
      await loadCondominiumProfile(activeContext.condominiumId);
      setCondominiumProfileMessage("Foto de capa atualizada.");
      setCondominiumProfileMessageIsError(false);
    } catch (error: unknown) {
      setCondominiumProfileMessage(
        error instanceof Error ? error.message : "Não foi possível escolher a foto de capa."
      );
      setCondominiumProfileMessageIsError(true);
    }
  }

  async function deleteCondominiumProfilePhoto(): Promise<void> {
    const activeContext = context;
    const candidate = profilePhotoRemovalCandidate;
    if (activeContext === undefined || candidate === undefined || activeContext.role !== "manager")
      return;
    setProfilePhotoRemoving(true);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(activeContext.condominiumId)}/profile/photos/${encodeURIComponent(candidate.photoId)}`,
        { method: "DELETE", credentials: "same-origin", headers: profileRequestHeaders() }
      );
      if (!response.ok)
        throw new Error(await readMessage(response, "Não foi possível remover esta foto."));
      setProfilePhotoRemovalCandidate(undefined);
      await loadCondominiumProfile(activeContext.condominiumId);
      setCondominiumProfileMessage("Foto removida do perfil.");
      setCondominiumProfileMessageIsError(false);
    } catch (error: unknown) {
      setCondominiumProfileMessage(
        error instanceof Error ? error.message : "Não foi possível remover esta foto."
      );
      setCondominiumProfileMessageIsError(true);
    } finally {
      setProfilePhotoRemoving(false);
    }
  }

  async function addSettingsDocuments(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const activeContext = context;
    if (activeContext === undefined || !activeContext.permissions.includes("document:upload")) {
      setSettingsMessageIsError(true);
      setSettingsMessage("Sua conta não possui permissão para adicionar documentos.");
      return;
    }
    if (settingsDocumentFiles.length === 0) {
      setSettingsMessageIsError(true);
      setSettingsMessage("Selecione ao menos um PDF para adicionar.");
      return;
    }
    const invalidFiles = settingsDocumentFiles.filter(
      (file) => !isPdf(file) || file.size > 25 * 1024 * 1024
    );
    if (invalidFiles.length > 0) {
      setSettingsMessageIsError(true);
      setSettingsMessage(
        `Revise os arquivos: ${invalidFiles.map((file) => file.name).join(", ")}. Use PDFs de até 25 MB.`
      );
      return;
    }
    if (!settingsDocumentsConfirmed) {
      setSettingsMessageIsError(true);
      setSettingsMessage("Confirme que os documentos pertencem a este condomínio antes de enviar.");
      return;
    }
    const previousMeetingMinutes = settingsDocumentFiles.some(
      (file) => inferDocumentType(file.name) === "meeting_minutes"
    )
      ? registeredDocuments.find((document) => document.documentType === "meeting_minutes")
      : undefined;
    const removePreviousMeetingMinutes =
      previousMeetingMinutes !== undefined &&
      window.confirm(
        `Já existe a ata “${previousMeetingMinutes.title}”. Deseja removê-la da memória deste condomínio após enviar a nova ata?`
      );

    setSettingsDocumentsUploading(true);
    setSettingsMessage("");
    setSettingsMessageIsError(false);
    const results = await Promise.allSettled(
      settingsDocumentFiles.map((file) =>
        uploadRegistrationDocument(
          activeContext.condominiumId,
          file,
          inferDocumentType(file.name),
          file.name.replace(/\.pdf$/iu, "")
        )
      )
    );
    const failedEntries = results.flatMap((result, index) => {
      const file = settingsDocumentFiles[index];
      return result.status === "rejected" && file !== undefined ? [file] : [];
    });
    const failedFiles = failedEntries.map((file) => file.name);
    const savedCount = results.length - failedEntries.length;

    await loadRegisteredDocuments(activeContext.condominiumId);
    if (removePreviousMeetingMinutes && previousMeetingMinutes !== undefined && savedCount > 0) {
      void removeRegisteredDocument(previousMeetingMinutes);
    }
    if (failedFiles.length === 0) {
      setSettingsDocumentFiles([]);
      setSettingsDocumentsConfirmed(false);
      setSettingsMessage(
        `${savedCount} ${savedCount === 1 ? "documento foi adicionado" : "documentos foram adicionados"} à memória do condomínio.`
      );
    } else if (savedCount > 0) {
      setSettingsDocumentFiles(failedEntries);
      setSettingsMessageIsError(true);
      setSettingsMessage(
        `${savedCount} ${savedCount === 1 ? "documento foi salvo" : "documentos foram salvos"}, mas não foi possível adicionar: ${failedFiles.join(", ")}.`
      );
    } else {
      setSettingsMessageIsError(true);
      setSettingsMessage(`Não foi possível adicionar: ${failedFiles.join(", ")}.`);
    }
    setSettingsDocumentsUploading(false);
  }

  function closeDocumentPreview(): void {
    if (documentPreviewUrl.current !== undefined) {
      URL.revokeObjectURL(documentPreviewUrl.current);
      documentPreviewUrl.current = undefined;
    }
    setDocumentPreview(undefined);
    setDocumentPreviewError("");
  }

  async function viewRegisteredDocument(document: RegisteredDocument): Promise<void> {
    if (context === undefined) return;
    closeDocumentPreview();
    setDocumentPreviewBusy(true);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/documents/${encodeURIComponent(document.documentVersionId)}/file`,
        {
          credentials: "same-origin",
          headers: authMode === "development" ? { "x-development-user-id": developmentUserId } : {}
        }
      );
      if (!response.ok) {
        throw new Error(await readMessage(response, "Não foi possível abrir este arquivo."));
      }
      const file = await response.blob();
      const mediaType = document.mediaType ?? "application/pdf";
      if (file.type !== mediaType) {
        throw new Error("O arquivo disponível não corresponde ao tipo registrado.");
      }
      const url = URL.createObjectURL(file);
      documentPreviewUrl.current = url;
      setDocumentPreview({ title: document.title, url, mediaType });
    } catch (error) {
      setDocumentPreviewError(
        error instanceof Error ? error.message : "Não foi possível abrir este arquivo."
      );
    } finally {
      setDocumentPreviewBusy(false);
    }
  }

  async function removeRegisteredDocument(document: RegisteredDocument): Promise<void> {
    if (context === undefined) return;
    setRegisteredDocumentsBusy(true);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/documents/${encodeURIComponent(document.documentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: authMode === "development" ? { "x-development-user-id": developmentUserId } : {}
        }
      );
      if (!response.ok)
        throw new Error(await readMessage(response, "Não foi possível remover o documento."));
      setSettingsMessage(
        `${document.title} foi para a lixeira. Você pode recuperá-lo por até 30 dias; depois, o original e os dados derivados serão apagados do banco ativo.`
      );
      await loadRegisteredDocuments(context.condominiumId);
    } catch (error) {
      setSettingsMessageIsError(true);
      setSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível remover o documento."
      );
    } finally {
      setRegisteredDocumentsBusy(false);
    }
  }

  async function restoreRegisteredDocument(document: ArchivedDocument): Promise<void> {
    if (context === undefined) return;
    setRegisteredDocumentsBusy(true);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/documents/${encodeURIComponent(document.documentId)}/restore`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: authMode === "development" ? { "x-development-user-id": developmentUserId } : {}
        }
      );
      if (!response.ok)
        throw new Error(await readMessage(response, "Não foi possível recuperar o documento."));
      setSettingsMessage(`${document.title} foi recuperado e voltou à memória do condomínio.`);
      await loadRegisteredDocuments(context.condominiumId);
    } catch (error) {
      setSettingsMessageIsError(true);
      setSettingsMessage(
        error instanceof Error ? error.message : "Não foi possível recuperar o documento."
      );
    } finally {
      setRegisteredDocumentsBusy(false);
    }
  }

  function selectChatDocument(file: File): void {
    const mediaType = chatFileMediaType(file);
    const maximumBytes = mediaType === "application/pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (mediaType === undefined || file.size > maximumBytes) {
      setChatDocumentMessageIsError(true);
      setChatDocumentMessage("Escolha um PDF de até 25 MB ou uma foto JPEG/PNG de até 10 MB.");
      return;
    }
    setPendingChatDocument(file);
    setChatDocumentMessage("");
    setChatDocumentMessageIsError(false);
  }

  function sendComposer(): void {
    if (pendingChatDocument !== undefined) {
      void addChatDocument(pendingChatDocument);
      return;
    }
    void askQuestion();
  }

  async function addChatDocument(file: File): Promise<void> {
    const activeContext = context;
    if (activeContext === undefined || !activeContext.permissions.includes("document:upload")) {
      setChatDocumentMessageIsError(true);
      setChatDocumentMessage(
        "Sua conta não possui permissão para enviar documentos neste condomínio."
      );
      return;
    }
    const mediaType = chatFileMediaType(file);
    const maximumBytes = mediaType === "application/pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (mediaType === undefined || file.size > maximumBytes) {
      setChatDocumentMessageIsError(true);
      setChatDocumentMessage("Escolha um PDF de até 25 MB ou uma foto JPEG/PNG de até 10 MB.");
      return;
    }
    const previousMeetingMinutes =
      mediaType === "application/pdf" && inferDocumentType(file.name) === "meeting_minutes"
        ? registeredDocuments.find((document) => document.documentType === "meeting_minutes")
        : undefined;
    const removePreviousMeetingMinutes =
      previousMeetingMinutes !== undefined &&
      window.confirm(
        `Já existe a ata “${previousMeetingMinutes.title}”. Deseja removê-la da memória deste condomínio após enviar a nova ata?`
      );

    setChatDocumentUploading(true);
    setChatDocumentMessageIsError(false);
    setChatDocumentMessage(`Enviando ${file.name}…`);
    try {
      const response = await requestDocumentUploadWithAuthorizationRecovery(fetch, {
        condominiumId: activeContext.condominiumId,
        content: file,
        title: file.name.replace(/\.(pdf|jpe?g|png)$/iu, ""),
        documentType: "other",
        mediaType,
        authMode: authMode === "development" ? "development" : "real",
        developmentUserId
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, `Não foi possível enviar ${file.name}.`));
      }
      const uploaded = (await response.json()) as Readonly<{ documentVersionId?: unknown }>;
      const documentVersionId =
        typeof uploaded.documentVersionId === "string" ? uploaded.documentVersionId : undefined;
      setPendingChatDocument(undefined);
      setSentChatDocumentName(file.name);
      setChatDocumentMessage(
        mediaType === "application/pdf"
          ? `Recebi ${file.name}. Estou lendo e identificando o documento; ele só ficará disponível para respostas quando o processamento terminar.`
          : `Recebi ${file.name}. A observação visual será gerada por IA e pode conter erros; confira a foto original. Neste ambiente, use somente imagens sintéticas. A foto será guardada no banco deste condomínio e enviada à Gemini paga para análise.`
      );
      if (removePreviousMeetingMinutes && previousMeetingMinutes !== undefined) {
        void removeRegisteredDocument(previousMeetingMinutes);
      }
      void loadRegisteredDocuments(activeContext.condominiumId);
      if (documentVersionId !== undefined) {
        window.setTimeout(
          () =>
            void announceChatDocumentResult(
              activeContext.condominiumId,
              documentVersionId,
              file.name
            ),
          1_500
        );
      }
    } catch (error: unknown) {
      setChatDocumentMessageIsError(true);
      setChatDocumentMessage(
        error instanceof Error ? error.message : `Não foi possível enviar ${file.name}.`
      );
    } finally {
      setChatDocumentUploading(false);
    }
  }

  async function announceChatDocumentResult(
    activeCondominiumId: string,
    documentVersionId: string,
    fileName: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(activeCondominiumId)}/documents`,
        {
          credentials: "same-origin",
          headers: authMode === "development" ? { "x-development-user-id": developmentUserId } : {}
        }
      );
      if (!response.ok || context?.condominiumId !== activeCondominiumId) return;
      const body = (await response.json()) as Readonly<{
        documents?: readonly RegisteredDocument[];
      }>;
      const document = body.documents?.find(
        (candidate) => candidate.documentVersionId === documentVersionId
      );
      if (
        document === undefined ||
        document.processingStatus === "uploaded" ||
        document.processingStatus === "processing"
      ) {
        window.setTimeout(
          () => void announceChatDocumentResult(activeCondominiumId, documentVersionId, fileName),
          2_500
        );
        return;
      }
      await loadRegisteredDocuments(activeCondominiumId);
      if (document.processingStatus === "ready") {
        setChatDocumentMessage(
          document.documentType === "other"
            ? `Li ${fileName}, mas não encontrei sinal suficiente para identificar o tipo. Ele já está disponível para consulta.`
            : `Li ${fileName} e identifiquei como ${documentTypeLabel(document.documentType)}. Ele já está disponível para consulta.`
        );
        return;
      }
      setChatDocumentMessageIsError(true);
      setChatDocumentMessage(
        `Li ${fileName}, mas o arquivo precisa de revisão antes de entrar nas respostas.`
      );
    } catch {
      // A confirmação da leitura é complementar; o catálogo continua sendo a fonte do estado.
    }
  }

  async function createCondominium(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const realAccount = authMode === "real";
    const validationErrors = registrationValidationErrors(
      registrationForm,
      constitutionMinutes,
      additionalDocuments,
      documentsConfirmed,
      realAccount
    );

    if (validationErrors.length > 0) {
      setRegistrationMessage(
        `${validationErrors.length === 1 ? "Revise este item" : "Revise estes itens"}: ${validationErrors.join("; ")}.`
      );
      setRegistrationMessageIsError(true);
      return;
    }
    if (constitutionMinutes === undefined) return;

    const cnpj = onlyDigits(registrationForm.cnpj);
    const id = condominiumSlug(registrationForm.name, cnpj);
    let registrationPhase: "condominium" | "documents" = "condominium";
    setBusy(true);
    setRegistrationMessage("Criando o condomínio…");
    setRegistrationMessageIsError(false);
    try {
      const response = await fetch(
        realAccount ? "/v1/condominiums" : "/v1/development/test-condominiums",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            ...(realAccount ? {} : { "x-development-user-id": developmentUserId })
          },
          body: JSON.stringify({
            ...(realAccount ? {} : { condominiumId: id }),
            name: registrationForm.name,
            cnpj,
            administrationCompany: registrationForm.administrationCompany,
            unitCount:
              registrationForm.unitCount.trim() === "" ? null : Number(registrationForm.unitCount),
            address: {
              postalCode: registrationForm.postalCode,
              street: registrationForm.street,
              number: registrationForm.number,
              complement: registrationForm.complement,
              neighborhood: registrationForm.neighborhood,
              city: registrationForm.city,
              state: registrationForm.state
            },
            contact: {
              managerName: registrationForm.managerName,
              email: registrationForm.email,
              phone: registrationForm.phone
            }
          })
        }
      );

      let createdContext: ContextResponse;
      if (response.status === 409 && !realAccount) {
        const contextResponse = await fetch(`/v1/condominiums/${encodeURIComponent(id)}/context`, {
          headers: { "x-development-user-id": developmentUserId }
        });
        if (!contextResponse.ok) {
          throw new Error("Já existe outro condomínio com estes dados.");
        }
        createdContext = (await contextResponse.json()) as ContextResponse;
      } else if (response.ok) {
        createdContext = (await response.json()) as ContextResponse;
      } else {
        throw new Error(
          await readMessage(
            response,
            realAccount
              ? "Não foi possível criar o condomínio."
              : "Não foi possível criar o condomínio."
          )
        );
      }

      setCondominiumId(createdContext.condominiumId);
      setContext(createdContext);
      setAvailableCondominiums((current) =>
        current.some((item) => item.id === createdContext.condominiumId)
          ? current
          : [
              ...current,
              {
                id: createdContext.condominiumId,
                name: registrationForm.name.trim(),
                detail: "Cadastro incompleto · envie a ata"
              }
            ]
      );

      setRegistrationMessage(
        createdContext.resumedRegistration === true
          ? "Cadastro anterior encontrado para sua conta. Retomando o envio dos documentos…"
          : realAccount
            ? "Condomínio criado para sua conta. Salvando os documentos…"
            : "Condomínio criado. Salvando a ata na memória…"
      );
      registrationPhase = "documents";
      const minutesStatus = await uploadRegistrationDocument(
        createdContext.condominiumId,
        constitutionMinutes,
        "meeting_minutes",
        "Ata de assembleia geral de constituição do condomínio"
      );

      const additionalResults = await Promise.allSettled(
        additionalDocuments.map((file) =>
          uploadRegistrationDocument(
            createdContext.condominiumId,
            file,
            inferDocumentType(file.name),
            file.name.replace(/\.pdf$/iu, "")
          )
        )
      );
      const savedAdditional = additionalResults.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failedAdditional = additionalDocuments.length - savedAdditional;
      const failedAdditionalDetails = additionalResults.flatMap((result, index) => {
        if (result.status !== "rejected") return [];
        const fileName = additionalDocuments[index]?.name ?? "arquivo adicional";
        const detail =
          result.reason instanceof Error && result.reason.message.trim() !== ""
            ? result.reason.message.trim()
            : "erro inesperado";
        return [`${fileName}: ${detail.endsWith(".") ? detail : `${detail}.`}`];
      });
      const reviewCount = [
        minutesStatus,
        ...additionalResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : []
        )
      ].filter((status) => status === "needs_review" || status === "failed").length;

      setAvailableCondominiums((current) =>
        current.map((item) =>
          item.id === createdContext.condominiumId
            ? {
                ...item,
                name: registrationForm.name.trim(),
                detail: `${registrationForm.city.trim()}/${registrationForm.state.trim().toUpperCase()} · ${savedAdditional + 1} documento(s)`
              }
            : item
        )
      );
      resetConversation();
      setSetupNotice(
        failedAdditional > 0
          ? `Cadastro concluído e ata salva. Não foi possível salvar: ${failedAdditionalDetails.join("; ")}`
          : reviewCount > 0
            ? "Cadastro concluído. Os arquivos foram salvos, mas alguns precisam de revisão antes de entrarem nas respostas."
            : `Cadastro concluído. A ata e ${savedAdditional} documento(s) adicional(is) já fazem parte da memória deste condomínio.`
      );
      setMessage(
        realAccount
          ? `Condomínio ativo: ${createdContext.condominiumId}.`
          : `Contexto ativo: ${createdContext.condominiumId}.`
      );
      setView("chat");
    } catch (error: unknown) {
      setRegistrationMessage(formatRegistrationFailure(error, registrationPhase));
      setRegistrationMessageIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion() {
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0 || context === undefined) return;

    playMessageSentSound();
    if (answer !== undefined && submittedQuestion !== "") {
      const previousTurn: ConversationHistoryEntry = {
        questionId: answer.questionId,
        question: submittedQuestion,
        answer,
        createdAt: answer.createdAt
      };
      setConversationHistory((current) => [
        ...current.filter((entry) => entry.answer.answerId !== answer.answerId),
        previousTurn
      ]);
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
          headers: {
            "content-type": "application/json",
            "x-development-user-id": developmentUserId
          },
          credentials: "same-origin",
          signal: controller.signal,
          body: JSON.stringify({ question: trimmedQuestion })
        }
      );
      if (!response.ok) {
        setAnswer(undefined);
        const failure = await readMessage(response, "Não foi possível processar a pergunta.");
        setMessage(failure);
        setConversationError(failure);
        return;
      }
      setAnswer((await response.json()) as PublicAnswer);
      playAnswerReceivedSound();
    } catch {
      setAnswer(undefined);
      const failure = "Não foi possível conectar ao conselheiro agora.";
      setMessage(failure);
      setConversationError(failure);
    } finally {
      window.clearTimeout(requestTimeout);
      setBusy(false);
    }
  }

  async function submitFeedback(classification: FeedbackClassification) {
    if (answer === undefined) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(answer.condominiumId)}/answers/${encodeURIComponent(answer.answerId)}/feedback`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-development-user-id": developmentUserId
          },
          body: JSON.stringify({ classification })
        }
      );
      if (!response.ok) {
        setMessage(await readMessage(response, "Não foi possível registrar o feedback."));
        return;
      }
      setFeedback(classification);
    } catch {
      setMessage("Não foi possível registrar o feedback agora.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "landing") {
    return (
      <main className="landing-page">
        <header className="landing-header">
          <div className="login-brand">
            <BrandMark />
            <span>{provisionalBrand.productName}</span>
          </div>
          <span className="landing-header-label">CONSELHEIRO DOCUMENTAL</span>
        </header>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="overline">GESTÃO CONDOMINIAL COM MAIS CLAREZA</p>
            <h1 id="landing-title">Encontre a regra certa para tomar a próxima decisão.</h1>
            <p className="landing-lead">
              A {provisionalBrand.productName} organiza os documentos do seu condomínio e ajuda você
              a consultar convenções, atas e contratos com respostas fundamentadas e fontes
              verificáveis.
            </p>
            <div className="landing-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => openAuthentication("login")}
              >
                Entrar
                <span aria-hidden="true">→</span>
              </button>
              <button
                className="landing-secondary-button"
                type="button"
                onClick={() => openAuthentication("register")}
              >
                Criar minha conta
              </button>
            </div>
            {authUser === undefined ? null : (
              <button
                className="landing-session-button"
                type="button"
                onClick={() => {
                  if (authUser.isAdmin) {
                    setView("admin-dashboard");
                    void loadAdminDashboard();
                    return;
                  }
                  setView("condominiums");
                }}
              >
                Continuar como {authUser.displayName}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <section
            className="landing-evidence"
            aria-label={`Como a ${provisionalBrand.productName} ajuda`}
          >
            <p className="landing-evidence-overline">SEM RESPOSTAS NO ESCURO</p>
            <h2>Você vê a resposta e de onde ela veio.</h2>
            <p className="landing-evidence-copy">
              Pergunte como falaria com alguém da sua equipe. A {provisionalBrand.productName}
              procura a regra nos documentos e mostra a página e o trecho usados na resposta.
            </p>
            <p className="landing-evidence-note">
              Se os documentos não bastarem, ela deixa isso claro.
            </p>
          </section>
        </section>
        <footer className="landing-footer">Um espaço simples para a memória do condomínio.</footer>
      </main>
    );
  }

  if (view === "login") {
    if (authMode === "unknown") {
      return (
        <main className="login-page">
          <section className="login-card auth-loading-card" aria-live="polite">
            <div className="login-brand">
              <BrandMark />
              <span>{provisionalBrand.productName}</span>
            </div>
            <p className="overline">CONSELHEIRO DOCUMENTAL</p>
            <h1>Preparando seu acesso.</h1>
            <p className="login-lead">Só um instante enquanto verificamos o ambiente seguro.</p>
            <p className="auth-hint">
              Se essa tela não avançar, volte para a apresentação e tente novamente.
            </p>
            <button
              className="return-login-button"
              type="button"
              onClick={() => setView("landing")}
            >
              Voltar para a apresentação
            </button>
          </section>
        </main>
      );
    }
    if (authMode === "development") {
      return (
        <main className="login-page">
          <section className="login-card" aria-labelledby="demo-access-title">
            <div className="login-brand">
              <BrandMark />
              <span>{provisionalBrand.productName}</span>
            </div>
            <p className="overline">CONSELHEIRO DOCUMENTAL</p>
            <h1 id="demo-access-title">Acesse o ambiente de teste.</h1>
            <p className="login-lead">
              Escolha um condomínio sintético e experimente perguntas com respostas fundamentadas e
              fontes verificáveis.
            </p>
            <div className="test-notice">
              <strong>Ambiente de demonstração</strong>
              <p>Este acesso não solicita nem envia credenciais reais.</p>
            </div>
            <label htmlFor="display-name">Como quer ser chamado?</label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="off"
            />
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setMessage("Escolha um condomínio sintético para iniciar a conversa.");
                setView("onboarding");
              }}
            >
              Entrar no ambiente de testes <span aria-hidden="true">→</span>
            </button>
            <p className="login-footer">
              Use somente informações e documentos fictícios neste ambiente.
            </p>
          </section>
        </main>
      );
    }
    if (authMode === "real") {
      const registering = authPanel === "register";
      const panelCopy: Readonly<Record<AuthPanel, Readonly<{ title: string; lead: string }>>> = {
        login: {
          title: "Bem-vindo de volta.",
          lead: "Entre para continuar de onde você parou, com seus condomínios autorizados."
        },
        register: {
          title: "Crie sua conta.",
          lead: "Organize os documentos dos seus condomínios em um espaço seguro."
        },
        forgot: {
          title: "Recupere seu acesso.",
          lead: "Informe seu e-mail. Se houver uma conta compatível, você receberá as instruções."
        },
        reset: {
          title: "Defina uma nova senha.",
          lead: "A nova senha encerrará o acesso em todos os dispositivos anteriores."
        },
        verify: {
          title: "Confirme seu e-mail.",
          lead:
            authActionToken === ""
              ? "Use o link recebido ou solicite uma nova confirmação."
              : "Confirme que este endereço pertence a você antes de entrar."
        },
        mfa: {
          title: "Confirme que é você.",
          lead: "Use o código do aplicativo autenticador ou um código de recuperação."
        }
      };
      const activePanelCopy = panelCopy[authPanel];
      return (
        <main className="login-page">
          <section className="login-card" aria-labelledby="auth-title">
            <div className="login-brand">
              <BrandMark />
              <span>{provisionalBrand.productName}</span>
            </div>
            <p className="overline">CONSELHEIRO DOCUMENTAL</p>
            <h1 id="auth-title">{activePanelCopy.title}</h1>
            <p className="login-lead">{activePanelCopy.lead}</p>

            {authPanel === "login" || registering ? (
              <form className="auth-form" onSubmit={submitAuthentication}>
                {registering ? (
                  <label>
                    Como quer ser chamado?
                    <input
                      value={authDisplayName}
                      onChange={(event) => setAuthDisplayName(event.target.value)}
                      autoComplete="name"
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </label>
                ) : null}
                <label>
                  E-mail
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Senha
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    autoComplete={registering ? "new-password" : "current-password"}
                    minLength={12}
                    maxLength={200}
                    required
                  />
                </label>
                {registering ? (
                  <>
                    <label>
                      Confirme a senha
                      <input
                        type="password"
                        value={authPasswordConfirmation}
                        onChange={(event) => setAuthPasswordConfirmation(event.target.value)}
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={200}
                        required
                      />
                    </label>
                    <p className="auth-hint">
                      Use pelo menos 12 caracteres. Não reutilize uma senha importante.
                    </p>
                  </>
                ) : null}
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Aguarde…" : registering ? "Criar conta" : "Entrar"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authPanel === "forgot" ? (
              <form
                className="auth-form"
                onSubmit={(event) => void requestAccountAction(event, "password-reset")}
              >
                <label>
                  E-mail
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Aguarde…" : "Enviar instruções"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authPanel === "verify" && authActionToken !== "" ? (
              <form className="auth-form" onSubmit={confirmEmail}>
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Confirmando…" : "Confirmar meu e-mail"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authPanel === "verify" && authActionToken === "" ? (
              <form
                className="auth-form"
                onSubmit={(event) => void requestAccountAction(event, "verify-email")}
              >
                <label>
                  E-mail
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Aguarde…" : "Reenviar confirmação"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authPanel === "reset" ? (
              <form className="auth-form" onSubmit={resetAccountPassword}>
                <label>
                  Nova senha
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={200}
                    required
                  />
                </label>
                <label>
                  Confirme a nova senha
                  <input
                    type="password"
                    value={authPasswordConfirmation}
                    onChange={(event) => setAuthPasswordConfirmation(event.target.value)}
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={200}
                    required
                  />
                </label>
                <p className="auth-hint">Use pelo menos 12 caracteres.</p>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={authBusy || authActionToken === ""}
                >
                  {authBusy ? "Aguarde…" : "Redefinir senha"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authPanel === "mfa" ? (
              <form className="auth-form" onSubmit={submitMfaChallenge}>
                <label>
                  Código de segurança
                  <input
                    value={authMfaCode}
                    onChange={(event) => setAuthMfaCode(event.target.value)}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    minLength={6}
                    maxLength={32}
                    required
                    autoFocus
                  />
                </label>
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Validando…" : "Confirmar acesso"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {authMessage !== "" ? (
              <p
                className={authMessageIsError ? "auth-error" : "auth-message"}
                role={authMessageIsError ? "alert" : "status"}
              >
                {authMessage}
              </p>
            ) : null}
            {authDevelopmentActionUrl === "" ? null : (
              <a className="auth-development-link" href={authDevelopmentActionUrl}>
                Abrir link local de teste
              </a>
            )}

            {authPanel === "login" ? (
              <div className="auth-navigation">
                <button
                  className="auth-switch"
                  type="button"
                  onClick={() => openAuthentication("forgot")}
                >
                  Esqueci minha senha
                </button>
                <button
                  className="auth-switch"
                  type="button"
                  onClick={() => openAuthentication("register")}
                >
                  Ainda não tenho uma conta
                </button>
              </div>
            ) : (
              <button
                className="auth-switch"
                type="button"
                onClick={() => openAuthentication("login")}
              >
                {authPanel === "register" ? "Já tenho uma conta" : "Voltar para o login"}
              </button>
            )}
            <p className="login-footer">
              Seus documentos continuam separados por condomínio e só aparecem para quem tem
              autorização.
            </p>
          </section>
        </main>
      );
    }

    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="connection-title">
          <div className="login-brand">
            <BrandMark />
            <span>{provisionalBrand.productName}</span>
          </div>
          <p className="overline">CONSELHEIRO DOCUMENTAL</p>
          <h1 id="connection-title">Acesso indisponível.</h1>
          <p className="login-lead">
            Não foi possível conectar o acesso seguro agora. Tente novamente em instantes.
          </p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Tentar novamente <span aria-hidden="true">→</span>
          </button>
          <p className="login-footer">Respostas documentais com fontes verificáveis.</p>
        </section>
      </main>
    );
  }

  if (view === "admin-dashboard") {
    const generatedAt =
      adminDashboard === undefined
        ? undefined
        : new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
          }).format(new Date(adminDashboard.generatedAt));

    return (
      <main className="admin-dashboard-page">
        <header className="admin-dashboard-header">
          <div className="admin-dashboard-brand">
            <BrandMark />
            <span>
              <strong>Zermatt</strong>
              <small>Painel administrativo</small>
            </span>
          </div>
          <button type="button" aria-label="Sair da conta" onClick={() => void logoutAccount()}>
            <ExitIcon />
            <span>Sair da conta</span>
          </button>
        </header>

        <section className="admin-dashboard-shell" aria-labelledby="admin-dashboard-title">
          <div className="admin-dashboard-intro">
            <div>
              <p>VISÃO DA ZERMATT</p>
              <h1 id="admin-dashboard-title">Sinais essenciais do produto.</h1>
              <span>
                Aquisição e atividade em números agregados para orientar as próximas decisões.
              </span>
            </div>
            <div className="admin-dashboard-account">
              <span aria-hidden="true">
                {authUser?.displayName.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "A"}
              </span>
              <div>
                <strong>{authUser?.displayName ?? "Administrador"}</strong>
                <small>Acesso administrativo</small>
              </div>
            </div>
          </div>

          {adminDashboardError === "" ? null : (
            <section className="admin-dashboard-error" role="alert">
              <div>
                <strong>Indicadores indisponíveis</strong>
                <span>{adminDashboardError}</span>
              </div>
              <button type="button" onClick={() => void loadAdminDashboard()}>
                Tentar novamente
              </button>
            </section>
          )}

          <section className="admin-metric-grid" aria-label="Indicadores de aquisição e uso">
            <article className="admin-metric-card">
              <span className="admin-metric-icon" aria-hidden="true">
                <UsersIcon />
              </span>
              <p>CONTAS ATIVAS</p>
              <strong>
                {adminDashboardBusy ? "—" : (adminDashboard?.metrics.activeAccounts ?? "—")}
              </strong>
              <small>Total de pessoas com uma conta disponível.</small>
            </article>
            <article className="admin-metric-card">
              <span className="admin-metric-icon is-green" aria-hidden="true">
                <SparkIcon />
              </span>
              <p>NOVOS CADASTROS</p>
              <strong>
                {adminDashboardBusy ? "—" : (adminDashboard?.metrics.newAccountsLast7Days ?? "—")}
              </strong>
              <small>Contas criadas nos últimos 7 dias.</small>
            </article>
            <article className="admin-metric-card">
              <span className="admin-metric-icon is-teal" aria-hidden="true">
                <ActivityIcon />
              </span>
              <p>ACESSO RECENTE</p>
              <strong>
                {adminDashboardBusy ? "—" : (adminDashboard?.metrics.activeUsersLast7Days ?? "—")}
              </strong>
              <small>Pessoas distintas que entraram nos últimos 7 dias.</small>
            </article>
          </section>

          <section className="admin-account-directory" aria-labelledby="admin-accounts-title">
            <header>
              <div>
                <p>CONTAS CADASTRADAS</p>
                <h2 id="admin-accounts-title">Pessoas com acesso ao produto</h2>
                <span>Nome e e-mail informados na criação da conta.</span>
              </div>
              <span aria-live="polite">
                {adminDashboardBusy
                  ? "Carregando…"
                  : `${adminDashboard?.accounts.length ?? 0} ${
                      adminDashboard?.accounts.length === 1 ? "conta" : "contas"
                    }`}
              </span>
            </header>

            {adminDashboardBusy ? (
              <div className="admin-account-directory-status" role="status">
                Carregando contas cadastradas…
              </div>
            ) : adminDashboard?.accounts.length ? (
              <ul>
                {adminDashboard.accounts.map((account) => (
                  <li key={account.email}>
                    <span aria-hidden="true">
                      {account.displayName.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "P"}
                    </span>
                    <div>
                      <strong>{account.displayName}</strong>
                      <small>{account.email}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-account-directory-status">Nenhuma conta ativa encontrada.</div>
            )}
          </section>

          <div className="admin-dashboard-lower-grid">
            <section className="admin-dashboard-boundary-card">
              <span aria-hidden="true">
                <CheckIcon />
              </span>
              <div>
                <p>DADOS MINIMIZADOS</p>
                <h2>Somente sinais úteis para a Zermatt.</h2>
                <span>
                  Os indicadores usam contagens agregadas. No diretório, aparecem apenas nome e
                  e-mail para a administração de acesso.
                </span>
              </div>
            </section>
            <section className="admin-dashboard-opportunity-card">
              <div>
                <p>OPORTUNIDADES COMERCIAIS</p>
                <span>Coleta desativada</span>
              </div>
              <h2>Nenhum interesse é inferido.</h2>
              <p>
                Oportunidades só aparecerão quando existir um pedido de contato com consentimento
                explícito e revogável.
              </p>
            </section>
          </div>

          <footer className="admin-dashboard-updated" aria-live="polite">
            {adminDashboardBusy
              ? "Atualizando indicadores…"
              : generatedAt === undefined
                ? "Indicadores ainda não carregados."
                : `Atualizado em ${generatedAt}.`}
          </footer>
        </section>
      </main>
    );
  }

  if (view === "onboarding") {
    return (
      <main className="onboarding-page">
        <header className="simple-header">
          <div className="login-brand">
            <BrandMark />
            <span>{provisionalBrand.productName}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (authMode === "real") {
                void logoutAccount();
                return;
              }
              setView("landing");
            }}
          >
            Sair da conta
          </button>
        </header>
        <section className="onboarding-card" aria-labelledby="onboarding-title">
          <p className="overline">PASSO 1 DE 1</p>
          <h1 id="onboarding-title">
            {authMode === "real"
              ? `Olá, ${authUser?.displayName ?? displayName}.`
              : "Vamos começar pelo condomínio."}
          </h1>
          <p>
            {authMode === "real"
              ? "Sua conta está pronta para receber o primeiro condomínio autorizado."
              : "Cadastre ou escolha um condomínio para começar a organizar sua memória documental."}
          </p>
          {authMode === "real" ? (
            <>
              <div className="account-ready-card">
                <span className="account-ready-icon" aria-hidden="true">
                  <CheckIcon />
                </span>
                <div>
                  <strong>Conta ativa</strong>
                  <p>
                    Sua conta está protegida. O cadastro do primeiro condomínio será o próximo passo
                    desta jornada.
                  </p>
                </div>
              </div>
              <button
                className="return-login-button"
                type="button"
                onClick={() => void logoutAccount()}
              >
                ← Voltar para o login
              </button>
            </>
          ) : (
            <>
              <div className="sample-list">
                <button type="button" onClick={() => selectCondominium("alameda")} disabled={busy}>
                  <span className="building-icon">
                    <BuildingIcon />
                  </span>
                  <span>
                    <strong>Residencial Alameda</strong>
                    <small>Documentos disponíveis</small>
                  </span>
                  <b>→</b>
                </button>
                <button type="button" onClick={() => selectCondominium("bosque")} disabled={busy}>
                  <span className="building-icon">
                    <BuildingIcon />
                  </span>
                  <span>
                    <strong>Condomínio Bosque</strong>
                    <small>Segundo condomínio autorizado</small>
                  </span>
                  <b>→</b>
                </button>
              </div>
              <div className="create-test-card">
                <div>
                  <strong>Cadastrar outro condomínio</strong>
                  <p>
                    Informe os dados básicos e adicione a ata de constituição para iniciar a
                    memória.
                  </p>
                </div>
                <button
                  className="open-registration-button"
                  type="button"
                  onClick={() => openCondominiumRegistration("onboarding")}
                >
                  Abrir cadastro completo <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          )}
          <p className="onboarding-status" role="status">
            {message}
          </p>
        </section>
      </main>
    );
  }

  if (view === "create-condominium") {
    return (
      <main className="condominium-registration-page">
        <header className="registration-header">
          <button
            type="button"
            aria-label="Voltar para condomínios"
            onClick={() => setView(registrationReturnView)}
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <strong>Novo condomínio</strong>
            <small>Cadastro e memória documental</small>
          </div>
          <span className="registration-step">1 de 1</span>
        </header>

        <form className="registration-form" onSubmit={createCondominium} noValidate>
          <section className="registration-intro">
            <span className="registration-building" aria-hidden="true">
              <BuildingIcon />
            </span>
            <div>
              <p className="overline">NOVO CONTEXTO</p>
              <h1>Cadastre o condomínio.</h1>
              <p>
                {authMode === "real"
                  ? "Esses dados criam um condomínio só para sua conta e organizam a memória documental."
                  : "Esses dados organizam o contexto do chat e ficam vinculados ao condomínio selecionado."}
              </p>
            </div>
          </section>

          <div className="registration-layout">
            <div className="registration-fields">
              <section className="registration-card">
                <div className="registration-card-title">
                  <span>1</span>
                  <div>
                    <strong>Dados do condomínio</strong>
                    <small>Informações usadas para identificar este contexto.</small>
                  </div>
                </div>
                <div className="registration-grid">
                  <label className="wide-field">
                    <span>Nome do condomínio *</span>
                    <input
                      value={registrationForm.name}
                      onChange={(event) => updateRegistrationField("name", event.target.value)}
                      placeholder="Ex.: Residencial Horizonte"
                      maxLength={120}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>CNPJ *</span>
                    <input
                      value={registrationForm.cnpj}
                      onChange={(event) =>
                        updateRegistrationField("cnpj", formatCnpj(event.target.value))
                      }
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      maxLength={18}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Quantidade de unidades</span>
                    <input
                      value={registrationForm.unitCount}
                      onChange={(event) => updateRegistrationField("unitCount", event.target.value)}
                      placeholder="Ex.: 64"
                      type="number"
                      min="1"
                      max="100000"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="wide-field">
                    <span>Administradora</span>
                    <input
                      value={registrationForm.administrationCompany}
                      onChange={(event) =>
                        updateRegistrationField("administrationCompany", event.target.value)
                      }
                      placeholder="Nome da administradora, se houver"
                      maxLength={120}
                      autoComplete="off"
                    />
                  </label>
                </div>
              </section>

              <section className="registration-card">
                <div className="registration-card-title">
                  <span>2</span>
                  <div>
                    <strong>Endereço</strong>
                    <small>Cidade e UF são necessárias para concluir.</small>
                  </div>
                </div>
                <div className="registration-grid address-grid">
                  <label>
                    <span>CEP</span>
                    <input
                      value={registrationForm.postalCode}
                      onChange={(event) =>
                        updateRegistrationField("postalCode", event.target.value)
                      }
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      autoComplete="off"
                    />
                  </label>
                  <label className="street-field">
                    <span>Logradouro</span>
                    <input
                      value={registrationForm.street}
                      onChange={(event) => updateRegistrationField("street", event.target.value)}
                      placeholder="Rua, avenida ou alameda"
                      maxLength={120}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Número</span>
                    <input
                      value={registrationForm.number}
                      onChange={(event) => updateRegistrationField("number", event.target.value)}
                      placeholder="Ex.: 150"
                      maxLength={20}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Complemento</span>
                    <input
                      value={registrationForm.complement}
                      onChange={(event) =>
                        updateRegistrationField("complement", event.target.value)
                      }
                      placeholder="Bloco ou referência"
                      maxLength={80}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Bairro</span>
                    <input
                      value={registrationForm.neighborhood}
                      onChange={(event) =>
                        updateRegistrationField("neighborhood", event.target.value)
                      }
                      placeholder="Bairro"
                      maxLength={80}
                      autoComplete="off"
                    />
                  </label>
                  <label className="city-field">
                    <span>Cidade *</span>
                    <input
                      value={registrationForm.city}
                      onChange={(event) => updateRegistrationField("city", event.target.value)}
                      placeholder="Cidade"
                      maxLength={80}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label className="state-field">
                    <span>UF *</span>
                    <input
                      value={registrationForm.state}
                      onChange={(event) =>
                        updateRegistrationField(
                          "state",
                          event.target.value
                            .replaceAll(/[^a-z]/giu, "")
                            .slice(0, 2)
                            .toUpperCase()
                        )
                      }
                      placeholder="SP"
                      maxLength={2}
                      required
                      autoComplete="off"
                    />
                  </label>
                </div>
              </section>

              <section className="registration-card">
                <div className="registration-card-title">
                  <span>3</span>
                  <div>
                    <strong>Contato da gestão</strong>
                    <small>Campos opcionais para organizar o cadastro.</small>
                  </div>
                </div>
                <div className="registration-grid">
                  <label className="wide-field">
                    <span>Responsável</span>
                    <input
                      value={registrationForm.managerName}
                      onChange={(event) =>
                        updateRegistrationField("managerName", event.target.value)
                      }
                      placeholder="Nome do síndico ou responsável"
                      maxLength={100}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>E-mail</span>
                    <input
                      value={registrationForm.email}
                      onChange={(event) => updateRegistrationField("email", event.target.value)}
                      placeholder="contato@exemplo.test"
                      type="email"
                      maxLength={160}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Telefone</span>
                    <input
                      value={registrationForm.phone}
                      onChange={(event) => updateRegistrationField("phone", event.target.value)}
                      placeholder="(00) 00000-0000"
                      maxLength={30}
                      inputMode="tel"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </section>
            </div>

            <aside className="registration-card document-card">
              <div className="registration-card-title">
                <span>4</span>
                <div>
                  <strong>Documentos iniciais</strong>
                  <small>PDF de até 25 MB por arquivo.</small>
                </div>
              </div>

              <label
                className={`document-dropzone${constitutionMinutes === undefined ? "" : " selected"}`}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    setConstitutionMinutes(event.target.files?.[0]);
                    setRegistrationMessage("");
                    setRegistrationMessageIsError(false);
                  }}
                />
                <span className="document-icon" aria-hidden="true">
                  {constitutionMinutes === undefined ? <UploadIcon /> : <CheckIcon />}
                </span>
                <strong>Ata de assembleia geral de constituição *</strong>
                <small>
                  {constitutionMinutes === undefined
                    ? "Toque para selecionar o documento obrigatório"
                    : constitutionMinutes.name}
                </small>
              </label>

              <label className="additional-document-button">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(event) => {
                    setAdditionalDocuments(Array.from(event.target.files ?? []));
                    setRegistrationMessage("");
                    setRegistrationMessageIsError(false);
                  }}
                />
                <span aria-hidden="true">
                  <PlusIcon />
                </span>
                Adicionar outros documentos
              </label>

              {additionalDocuments.length === 0 ? (
                <p className="document-examples">Convenção, regimento, outras atas ou contratos.</p>
              ) : (
                <div className="selected-documents">
                  {additionalDocuments.map((file, index) => (
                    <div key={`${file.name}-${file.size}`}>
                      <span aria-hidden="true">PDF</span>
                      <p>
                        <strong>{file.name}</strong>
                        <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                      </p>
                      <button
                        type="button"
                        aria-label={`Remover ${file.name}`}
                        onClick={() =>
                          setAdditionalDocuments((current) =>
                            current.filter((_item, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="document-confirmation">
                <input
                  type="checkbox"
                  checked={documentsConfirmed}
                  onChange={(event) => setDocumentsConfirmed(event.target.checked)}
                />
                <span>
                  {authMode === "real"
                    ? "Confirmo que os PDFs pertencem a este condomínio e podem ser usados nas respostas do chat."
                    : "Confirmo que os PDFs pertencem a este condomínio e podem ser usados nas respostas do chat."}
                </span>
              </label>

              <div className="memory-explanation">
                <span aria-hidden="true">{provisionalBrand.mark}</span>
                <p>
                  <strong>Memória separada por condomínio</strong>
                  <small>
                    A {provisionalBrand.agentName} consulta apenas os documentos salvos no contexto
                    selecionado.
                  </small>
                </p>
              </div>
            </aside>
          </div>

          <footer className="registration-actions">
            <p
              className={
                registrationMessageIsError ? "registration-message error" : "registration-message"
              }
              role={registrationMessageIsError ? "alert" : "status"}
              aria-live={registrationMessageIsError ? "assertive" : "polite"}
            >
              {registrationMessage}
            </p>
            <div>
              <button type="button" onClick={() => setView(registrationReturnView)} disabled={busy}>
                Cancelar
              </button>
              <button className="registration-submit" type="submit" disabled={busy}>
                {busy ? (
                  "Salvando cadastro…"
                ) : (
                  <>
                    <span className="registration-submit-label-desktop">
                      Criar condomínio e abrir conversa
                    </span>
                    <span className="registration-submit-label-mobile">Criar condomínio</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </main>
    );
  }

  if (view === "condominiums") {
    const normalizedSearch = condominiumSearch.trim().toLocaleLowerCase("pt-BR");
    const visibleCondominiums = availableCondominiums.filter((item) =>
      `${item.name} ${item.id}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
    );

    return (
      <main className="mobile-condominiums-page">
        <header className="mobile-condominiums-header">
          <div className="mobile-condominiums-brand">
            <BrandMark />
            <div>
              <strong>{provisionalBrand.productName}</strong>
              <small>Conselheira documental</small>
            </div>
          </div>
          <div className="mobile-condominiums-actions">
            <button
              className="mobile-add-button"
              type="button"
              aria-label="Cadastrar novo condomínio"
              onClick={() => openCondominiumRegistration("condominiums")}
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              className="mobile-account-button"
              type="button"
              aria-label="Abrir perfil do gestor"
              onClick={() => openProfile("condominiums")}
            >
              {displayName.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "G"}
            </button>
          </div>
        </header>
        <section className="mobile-condominiums-content">
          <div className="mobile-condominiums-heading">
            <div>
              <p className="overline">SEUS CONTEXTOS</p>
              <h1>Condomínios</h1>
            </div>
            <span>{availableCondominiums.length}</span>
          </div>
          {condominiumNotice === "" ? null : (
            <p className="mobile-condominiums-notice" role="status">
              {condominiumNotice}
            </p>
          )}
          <label className="mobile-condominiums-search">
            <span aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              value={condominiumSearch}
              onChange={(event) => setCondominiumSearch(event.target.value)}
              placeholder="Pesquisar condomínio"
              aria-label="Pesquisar condomínio"
            />
          </label>
          <div className="mobile-condominiums-tabs" aria-label="Filtros">
            <span className="selected">Todos</span>
            <span>{availableCondominiums.length} disponíveis</span>
          </div>
          <div className="mobile-condominiums-list">
            {visibleCondominiums.map((item) => (
              <button
                key={item.id}
                className={`mobile-condominium-row${item.id === condominiumId ? " active" : ""}`}
                type="button"
                onClick={() => selectCondominium(item.id)}
                disabled={busy}
                aria-current={item.id === condominiumId ? "page" : undefined}
              >
                <span className="mobile-condominium-avatar" aria-hidden="true">
                  {condominiumInitials(item.name)}
                </span>
                <span className="mobile-condominium-copy">
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                {item.id === condominiumId ? (
                  <span className="mobile-condominium-current">Aberto</span>
                ) : null}
                <span className="mobile-condominium-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {visibleCondominiums.length === 0 ? (
              <div className="mobile-condominiums-empty-card">
                <span className="mobile-condominiums-empty-icon" aria-hidden="true">
                  <BuildingIcon />
                </span>
                <strong>Nenhum grupo autorizado ainda</strong>
                <p>
                  Quando um condomínio for associado à sua conta, ele aparecerá aqui como uma
                  conversa.
                </p>
                {authMode === "real" ? (
                  <button
                    className="mobile-create-first-button"
                    type="button"
                    onClick={() => openCondominiumRegistration("condominiums")}
                  >
                    Criar meu condomínio <span aria-hidden="true">→</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (view === "profile") {
    return (
      <main className="app-settings-page">
        <header className="chat-settings-header app-settings-header">
          <button
            type="button"
            className="chat-settings-back"
            aria-label="Voltar"
            onClick={() => setView(profileReturnView)}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M19 12H5m6-7-7 7 7 7" />
            </svg>
          </button>
          <div>
            <strong>Perfil</strong>
            <small>Conta e acesso</small>
          </div>
        </header>

        <section className="app-settings-content" aria-label="Perfil do gestor">
          <section className="app-settings-profile-card">
            <span aria-hidden="true">
              {displayName.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "G"}
            </span>
            <div>
              <p>PERFIL ATUAL</p>
              <h1>{displayName.trim() || "Gestor"}</h1>
              <small>
                {authUser?.email ??
                  (authMode === "real" ? "Conta protegida" : "Ambiente de demonstração")}
              </small>
            </div>
          </section>

          {accountSettingsMessage === "" ? null : (
            <p
              className={`account-settings-message${accountSettingsMessageIsError ? " error" : ""}`}
              role={accountSettingsMessageIsError ? "alert" : "status"}
            >
              {accountSettingsMessage}
            </p>
          )}

          {authMode === "real" && accountSecurityEnabled ? (
            <>
              <section className="app-settings-card account-security-card">
                <div className="app-settings-card-heading">
                  <div>
                    <p>SENHA</p>
                    <h2>Trocar senha</h2>
                  </div>
                  <span aria-hidden="true">•••</span>
                </div>
                <p>A troca mantém este dispositivo conectado e encerra as outras sessões.</p>
                <form className="account-security-form" onSubmit={changeAccountPassword}>
                  <label>
                    Senha atual
                    <input
                      type="password"
                      value={currentAccountPassword}
                      onChange={(event) => setCurrentAccountPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <label>
                    Nova senha
                    <input
                      type="password"
                      value={newAccountPassword}
                      onChange={(event) => setNewAccountPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={200}
                      required
                    />
                  </label>
                  <label>
                    Confirme a nova senha
                    <input
                      type="password"
                      value={newAccountPasswordConfirmation}
                      onChange={(event) => setNewAccountPasswordConfirmation(event.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={200}
                      required
                    />
                  </label>
                  <button type="submit" disabled={accountSettingsBusy}>
                    {accountSettingsBusy ? "Aguarde…" : "Alterar senha"}
                  </button>
                </form>
              </section>

              <section className="app-settings-card account-security-card">
                <div className="app-settings-card-heading">
                  <div>
                    <p>SEGUNDO FATOR</p>
                    <h2>Autenticação em duas etapas</h2>
                  </div>
                  <span
                    className={accountSecurityStatus?.mfaEnabled ? "is-secure" : ""}
                    aria-hidden="true"
                  >
                    2×
                  </span>
                </div>
                <p>
                  {accountSecurityStatus?.mfaEnabled
                    ? "Ativa. Todo novo acesso exige um código do autenticador ou de recuperação."
                    : "Adicione uma proteção além da senha usando um aplicativo autenticador."}
                </p>

                {mfaRecoveryCodes.length === 0 ? null : (
                  <div className="mfa-recovery-codes" role="status">
                    <strong>Guarde estes códigos em local seguro</strong>
                    <p>Cada código pode ser usado uma única vez e não será exibido novamente.</p>
                    <ul>
                      {mfaRecoveryCodes.map((code) => (
                        <li key={code}>
                          <code>{code}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {accountSecurityStatus?.mfaEnabled ? (
                  <form className="account-security-form" onSubmit={disableMfa}>
                    <label>
                      Senha atual
                      <input
                        type="password"
                        value={mfaDisablePassword}
                        onChange={(event) => setMfaDisablePassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <label>
                      Código do autenticador ou de recuperação
                      <input
                        value={mfaDisableCode}
                        onChange={(event) => setMfaDisableCode(event.target.value)}
                        autoComplete="one-time-code"
                        minLength={6}
                        maxLength={32}
                        required
                      />
                    </label>
                    <button className="danger" type="submit" disabled={accountSettingsBusy}>
                      Desativar MFA
                    </button>
                  </form>
                ) : mfaSetup === undefined ? (
                  <button
                    className="account-security-action"
                    type="button"
                    onClick={() => void beginMfaSetup()}
                    disabled={accountSettingsBusy}
                  >
                    Configurar aplicativo autenticador
                  </button>
                ) : (
                  <form className="account-security-form" onSubmit={enableMfa}>
                    <div className="mfa-setup-key">
                      <span>Chave de configuração</span>
                      <code>{mfaSetup.secret}</code>
                      <a href={mfaSetup.uri}>Abrir no aplicativo autenticador</a>
                    </div>
                    <label>
                      Código de seis dígitos
                      <input
                        value={mfaSetupCode}
                        onChange={(event) => setMfaSetupCode(event.target.value)}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        required
                      />
                    </label>
                    <button type="submit" disabled={accountSettingsBusy}>
                      Ativar MFA
                    </button>
                  </form>
                )}
              </section>

              <section className="app-settings-card account-security-card">
                <div className="app-settings-card-heading">
                  <div>
                    <p>DISPOSITIVOS</p>
                    <h2>Sessões conectadas</h2>
                  </div>
                  <span aria-hidden="true">{accountSessions.length}</span>
                </div>
                <p>Revise onde sua conta está aberta e encerre acessos que não reconhecer.</p>
                {accountSettingsBusy && accountSessions.length === 0 ? (
                  <p className="account-sessions-empty">Carregando dispositivos…</p>
                ) : accountSessions.length === 0 ? (
                  <p className="account-sessions-empty">Nenhuma sessão ativa foi encontrada.</p>
                ) : (
                  <ul className="account-session-list">
                    {accountSessions.map((session) => (
                      <li key={session.sessionId}>
                        <div>
                          <strong>
                            {session.deviceLabel}
                            {session.current ? <em>Este dispositivo</em> : null}
                          </strong>
                          <small>
                            Atividade em{" "}
                            {new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short"
                            }).format(new Date(session.lastSeenAt))}
                          </small>
                        </div>
                        <button
                          type="button"
                          onClick={() => void revokeAccountSession(session)}
                          disabled={accountSettingsBusy}
                        >
                          {session.current ? "Sair" : "Desconectar"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {accountSessions.some((session) => !session.current) ? (
                  <button
                    className="account-security-action secondary"
                    type="button"
                    onClick={() => void revokeOtherAccountSessions()}
                    disabled={accountSettingsBusy}
                  >
                    Desconectar outros dispositivos
                  </button>
                ) : null}
              </section>
            </>
          ) : null}

          <section className="app-settings-card app-settings-session-card">
            <div className="app-settings-card-heading">
              <div>
                <p>ACESSO</p>
                <h2>Sessão atual</h2>
              </div>
              <span aria-hidden="true">
                <ExitIcon />
              </span>
            </div>
            <p>
              {authMode === "real"
                ? "Encerra o acesso neste dispositivo sem apagar sua conta ou seus condomínios."
                : "Encerra o acesso à demonstração e volta para a apresentação inicial."}
            </p>
            <button type="button" onClick={() => void logoutAccount()}>
              Sair da conta
            </button>
          </section>
        </section>
      </main>
    );
  }

  if (view === "chat-settings") {
    const activeCondominium = availableCondominiums.find(
      (item) => item.id === context?.condominiumId
    );
    const profileCoverPhoto = condominiumProfilePhotos.find((photo) => photo.isCover);

    return (
      <main className="chat-settings-page">
        <header className="chat-settings-header">
          <button
            type="button"
            className="chat-settings-back"
            aria-label="Voltar para conversa"
            onClick={() => setView("chat")}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M19 12H5m6-7-7 7 7 7" />
            </svg>
          </button>
          <div>
            <strong>Configurações do condomínio</strong>
            <small>{activeCondominium?.name ?? context?.condominiumId ?? "Condomínio"}</small>
          </div>
        </header>

        <section className="chat-settings-content" aria-label="Configurações do condomínio">
          <div className="chat-settings-identity">
            <span
              className={`chat-settings-identity-icon${profileCoverPhoto && condominiumProfilePhotoUrls[profileCoverPhoto.photoId] ? " has-profile-photo" : ""}`}
              aria-hidden="true"
            >
              {profileCoverPhoto && condominiumProfilePhotoUrls[profileCoverPhoto.photoId] ? (
                <img src={condominiumProfilePhotoUrls[profileCoverPhoto.photoId]} alt="" />
              ) : (
                <BuildingIcon />
              )}
            </span>
            <div>
              <strong>{activeCondominium?.name ?? context?.condominiumId ?? "Condomínio"}</strong>
              <small>Conversa documental protegida por condomínio</small>
            </div>
          </div>

          {settingsMessage === "" ? null : (
            <p
              className={`chat-settings-message${settingsMessageIsError ? " error" : ""}`}
              role={settingsMessageIsError ? "alert" : "status"}
            >
              {settingsMessage}
            </p>
          )}

          <div className="chat-settings-tabs" role="tablist" aria-label="Seções das configurações">
            {settingsTabOrder.map((tab) => (
              <button
                key={tab}
                type="button"
                id={`settings-tab-${tab}`}
                className={`chat-settings-tab${settingsTab === tab ? " is-active" : ""}`}
                role="tab"
                aria-selected={settingsTab === tab}
                aria-controls={`settings-panel-${tab}`}
                tabIndex={settingsTab === tab ? 0 : -1}
                onClick={() => setSettingsTab(tab)}
                onKeyDown={(event) => handleSettingsTabKeyDown(event, tab)}
              >
                <span className="chat-settings-tab-icon" aria-hidden="true">
                  {tab === "personalization" ? (
                    <BuildingIcon />
                  ) : tab === "documents" ? (
                    <DocumentIcon />
                  ) : tab === "management" ? (
                    <AlertIcon />
                  ) : (
                    <SettingsIcon />
                  )}
                </span>
                <span className="chat-settings-tab-copy">
                  <strong>{settingsTabCopy[tab].label}</strong>
                  <small>{settingsTabCopy[tab].description}</small>
                </span>
                {tab === "documents" ? (
                  <span
                    className="chat-settings-tab-count"
                    aria-label={`${registeredDocuments.length} ${registeredDocuments.length === 1 ? "arquivo" : "arquivos"}`}
                  >
                    {registeredDocuments.length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <section
            className="chat-settings-card condominium-profile-card"
            id="settings-panel-personalization"
            role="tabpanel"
            aria-labelledby="settings-tab-personalization"
            hidden={settingsTab !== "personalization"}
            tabIndex={0}
          >
            <div className="chat-settings-card-heading">
              <div>
                <p className="chat-settings-overline">PERFIL E IDENTIFICAÇÃO</p>
                <h2>Personalização do condomínio</h2>
              </div>
              <span aria-hidden="true">
                <BuildingIcon />
              </span>
            </div>
            <p className="condominium-profile-intro">
              Deixe o espaço de trabalho com a cara do condomínio. Essas informações ajudam na
              identificação e não substituem os documentos consultados pelo Alvitra.
            </p>

            {condominiumProfileMessage === "" ? null : (
              <p
                className={`chat-settings-message${condominiumProfileMessageIsError ? " error" : ""}`}
                role={condominiumProfileMessageIsError ? "alert" : "status"}
              >
                {condominiumProfileMessage}
              </p>
            )}

            {condominiumProfileLoading ? (
              <p className="document-catalog-state" role="status">
                Carregando perfil e fotos…
              </p>
            ) : condominiumProfile === undefined ? (
              <div className="document-catalog-state error" role="alert">
                <p>Não foi possível exibir o perfil deste condomínio.</p>
                <button
                  type="button"
                  className="chat-settings-secondary-button"
                  onClick={() => {
                    if (context !== undefined) void loadCondominiumProfile(context.condominiumId);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <form className="condominium-profile-form" onSubmit={saveCondominiumProfile}>
                  <div className="condominium-profile-fields">
                    <label className="profile-field profile-field-wide">
                      <span>Nome do condomínio</span>
                      <input
                        required
                        maxLength={120}
                        value={condominiumProfile.name}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : { ...current, name: event.target.value }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>
                        CNPJ <small>não pode ser alterado</small>
                      </span>
                      <input
                        value={
                          condominiumProfile.cnpj
                            ? formatCnpj(condominiumProfile.cnpj)
                            : "Não informado"
                        }
                        readOnly
                        aria-readonly="true"
                      />
                    </label>
                    <label className="profile-field">
                      <span>Administradora</span>
                      <input
                        maxLength={120}
                        value={condominiumProfile.administrationCompany}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : { ...current, administrationCompany: event.target.value }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Quantidade de unidades</span>
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={condominiumProfile.unitCount}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : { ...current, unitCount: event.target.value }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>CEP</span>
                      <input
                        maxLength={9}
                        autoComplete="postal-code"
                        value={condominiumProfile.address.postalCode}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, postalCode: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field profile-field-wide">
                      <span>Rua ou avenida</span>
                      <input
                        maxLength={120}
                        autoComplete="address-line1"
                        value={condominiumProfile.address.street}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, street: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Número</span>
                      <input
                        maxLength={20}
                        value={condominiumProfile.address.number}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, number: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Complemento</span>
                      <input
                        maxLength={80}
                        value={condominiumProfile.address.complement}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, complement: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Bairro</span>
                      <input
                        maxLength={80}
                        autoComplete="address-level3"
                        value={condominiumProfile.address.neighborhood}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, neighborhood: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Cidade</span>
                      <input
                        required
                        maxLength={80}
                        autoComplete="address-level2"
                        value={condominiumProfile.address.city}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: { ...current.address, city: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field profile-field-compact">
                      <span>UF</span>
                      <input
                        required
                        maxLength={2}
                        autoComplete="address-level1"
                        value={condominiumProfile.address.state}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  address: {
                                    ...current.address,
                                    state: event.target.value.toUpperCase()
                                  }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <div className="profile-field-separator profile-field-wide">
                      <strong>Contato da gestão</strong>
                      <small>Opcional, para manter os dados do condomínio organizados.</small>
                    </div>
                    <label className="profile-field">
                      <span>Nome do responsável</span>
                      <input
                        maxLength={100}
                        autoComplete="name"
                        value={condominiumProfile.contact.managerName}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  contact: { ...current.contact, managerName: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>E-mail da gestão</span>
                      <input
                        type="email"
                        maxLength={160}
                        autoComplete="email"
                        value={condominiumProfile.contact.email}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  contact: { ...current.contact, email: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Telefone</span>
                      <input
                        type="tel"
                        maxLength={30}
                        autoComplete="tel"
                        value={condominiumProfile.contact.phone}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : {
                                  ...current,
                                  contact: { ...current.contact, phone: event.target.value }
                                }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                      />
                    </label>
                    <label className="profile-field profile-field-wide">
                      <span>
                        Sobre o condomínio <small>até 500 caracteres</small>
                      </span>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={condominiumProfile.description}
                        onChange={(event) =>
                          setCondominiumProfile((current) =>
                            current === undefined
                              ? current
                              : { ...current, description: event.target.value }
                          )
                        }
                        disabled={context?.role !== "manager" || condominiumProfileSaving}
                        placeholder="Uma breve apresentação para ajudar a identificar este condomínio"
                      />
                      <small className="profile-character-count">
                        {condominiumProfile.description.length}/500
                      </small>
                    </label>
                  </div>
                  {context?.role === "manager" ? (
                    <button
                      type="submit"
                      className="condominium-profile-save"
                      disabled={condominiumProfileSaving}
                    >
                      {condominiumProfileSaving ? "Salvando alterações…" : "Salvar personalização"}
                    </button>
                  ) : (
                    <p className="chat-settings-footnote">
                      Você pode consultar o perfil; somente o síndico responsável pode alterá-lo.
                    </p>
                  )}
                </form>

                <section className="condominium-profile-photos" aria-label="Fotos do condomínio">
                  <div className="condominium-profile-photos-heading">
                    <div>
                      <strong>Fotos do condomínio</strong>
                      <small>Escolha uma capa para identificar este espaço.</small>
                    </div>
                    <span>{condominiumProfilePhotos.length}/5</span>
                  </div>
                  {condominiumProfilePhotos.length === 0 ? (
                    <div className="profile-photo-empty">
                      <span aria-hidden="true">
                        <BuildingIcon />
                      </span>
                      <div>
                        <strong>Nenhuma foto adicionada</strong>
                        <small>
                          Uma foto da fachada ou de uma área comum ajuda a reconhecer o condomínio.
                        </small>
                      </div>
                    </div>
                  ) : (
                    <div className="profile-photo-grid">
                      {condominiumProfilePhotos.map((photo) => (
                        <article
                          className={`profile-photo-tile${photo.isCover ? " is-cover" : ""}`}
                          key={photo.photoId}
                        >
                          {condominiumProfilePhotoUrls[photo.photoId] ? (
                            <img
                              src={condominiumProfilePhotoUrls[photo.photoId]}
                              alt={
                                photo.isCover ? "Foto de capa do condomínio" : "Foto do condomínio"
                              }
                            />
                          ) : (
                            <div
                              className="profile-photo-placeholder"
                              aria-label="Pré-visualização indisponível"
                            >
                              <BuildingIcon />
                            </div>
                          )}
                          {photo.isCover ? (
                            <span className="profile-photo-cover-badge">Capa</span>
                          ) : null}
                          {context?.role === "manager" ? (
                            <div className="profile-photo-actions">
                              {!photo.isCover ? (
                                <button
                                  type="button"
                                  onClick={() => void setCondominiumProfileCover(photo.photoId)}
                                >
                                  Definir como capa
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="profile-photo-delete"
                                aria-label="Remover foto do perfil"
                                onClick={() => setProfilePhotoRemovalCandidate(photo)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                  {context?.role === "manager" ? (
                    <label
                      className={`profile-photo-picker${condominiumProfileUploading || condominiumProfilePhotos.length >= 5 ? " disabled" : ""}`}
                    >
                      <span aria-hidden="true">
                        <UploadIcon />
                      </span>
                      <div>
                        <strong>
                          {condominiumProfileUploading ? "Enviando fotos…" : "Adicionar fotos"}
                        </strong>
                        <small>JPEG, PNG ou WebP · até 5 MB por foto</small>
                      </div>
                      <em>
                        {condominiumProfilePhotos.length >= 5 ? "Limite atingido" : "Selecionar"}
                      </em>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        multiple
                        disabled={
                          condominiumProfileUploading || condominiumProfilePhotos.length >= 5
                        }
                        onChange={(event) => void addCondominiumProfilePhotos(event)}
                      />
                    </label>
                  ) : null}
                  <p className="profile-photo-privacy">
                    Por privacidade, evite fotos com pessoas, placas de veículos ou outros dados
                    pessoais desnecessários.
                  </p>
                </section>
              </>
            )}
          </section>

          <div
            className="chat-settings-tab-panel"
            id="settings-panel-documents"
            role="tabpanel"
            aria-labelledby="settings-tab-documents"
            hidden={settingsTab !== "documents"}
            tabIndex={0}
          >
            <section className="chat-settings-card document-catalog-card">
              <div className="chat-settings-card-heading">
                <div>
                  <p className="chat-settings-overline">DOCUMENTOS DO CONDOMÍNIO</p>
                  <h2>Documentos registrados</h2>
                </div>
                <span aria-hidden="true">
                  <DocumentIcon />
                </span>
              </div>
              <div className="document-catalog-summary">
                <p>Arquivos que o Alvitra consulta para responder sobre este condomínio.</p>
                <span>
                  {registeredDocuments.length}{" "}
                  {registeredDocuments.length === 1 ? "arquivo" : "arquivos"}
                </span>
              </div>

              {registeredDocumentsBusy ? (
                <p className="document-catalog-state" role="status">
                  Carregando documentos…
                </p>
              ) : registeredDocumentsError !== "" ? (
                <div className="document-catalog-state error" role="alert">
                  <p>{registeredDocumentsError}</p>
                  <button
                    type="button"
                    className="chat-settings-secondary-button"
                    onClick={() => {
                      if (context !== undefined)
                        void loadRegisteredDocuments(context.condominiumId);
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : registeredDocuments.length === 0 ? (
                <div className="document-catalog-empty">
                  <span aria-hidden="true">
                    <DocumentIcon />
                  </span>
                  <div>
                    <strong>Nenhum documento registrado</strong>
                    <p>Adicione PDFs ou fotos pelo chat para começar a memória deste condomínio.</p>
                  </div>
                </div>
              ) : (
                <ul className="document-catalog-list" aria-label="Documentos registrados">
                  {registeredDocuments.map((document) => (
                    <li key={document.documentVersionId}>
                      <span className="document-catalog-icon" aria-hidden="true">
                        <DocumentIcon />
                      </span>
                      <div className="document-catalog-copy">
                        <strong>{document.title}</strong>
                        <small>
                          {documentTypeLabel(document.documentType)} · Versão{" "}
                          {document.versionNumber} · {formatDocumentSize(document.sizeBytes)}
                        </small>
                        <div className="document-catalog-statuses">
                          <span className={`processing-${document.processingStatus}`}>
                            {processingStatusLabel(document.processingStatus)}
                          </span>
                          <span className={`validity-${document.validityStatus}`}>
                            {validityStatusLabel(document.validityStatus)}
                          </span>
                        </div>
                        <small className="document-extraction-summary">
                          {extractionSummaryLabel(document)}
                        </small>
                      </div>
                      <div
                        className="document-catalog-actions"
                        role="group"
                        aria-label={`Ações para ${document.title}`}
                      >
                        <button
                          type="button"
                          className="document-catalog-preview-button"
                          onClick={() => void viewRegisteredDocument(document)}
                          disabled={documentPreviewBusy}
                        >
                          <PreviewIcon />
                          <span>Visualizar</span>
                        </button>
                        {context?.permissions.includes("document:upload") ? (
                          <button
                            type="button"
                            className="document-catalog-remove-button"
                            onClick={() => setDocumentRemovalCandidate(document)}
                            disabled={registeredDocumentsBusy}
                          >
                            <TrashIcon />
                            <span>Mover para lixeira</span>
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {archivedDocuments.length > 0 ? (
              <section
                className="chat-settings-card document-catalog-card"
                aria-label="Lixeira de documentos"
              >
                <div className="chat-settings-card-heading">
                  <div>
                    <p className="chat-settings-overline">LIXEIRA DE DOCUMENTOS</p>
                    <h2>Documentos recuperáveis</h2>
                  </div>
                  <span aria-hidden="true">
                    <RestoreIcon />
                  </span>
                </div>
                <div className="document-recovery-notice">
                  <span aria-hidden="true">
                    <RestoreIcon />
                  </span>
                  <p>
                    Você pode recuperar o documento por até 30 dias. Depois, o original e os dados
                    usados para localizá-lo na busca são removidos do banco ativo. As conversas,
                    respostas e trechos já citados ficam no chat, identificados como históricos.
                    Cópias de segurança seguem prazo próprio.
                  </p>
                </div>
                <ul className="document-catalog-list" aria-label="Documentos recuperáveis">
                  {archivedDocuments.map((document) => (
                    <li key={document.documentId}>
                      <span className="document-catalog-icon" aria-hidden="true">
                        <DocumentIcon />
                      </span>
                      <div className="document-catalog-copy">
                        <strong>{document.title}</strong>
                        <small>
                          Removido em {new Date(document.archivedAt).toLocaleDateString("pt-BR")} ·
                          recuperação disponível até{" "}
                          {new Date(
                            new Date(document.archivedAt).getTime() + 30 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("pt-BR")}
                        </small>
                      </div>
                      <div
                        className="document-catalog-actions"
                        role="group"
                        aria-label={`Ações para ${document.title}`}
                      >
                        <button
                          type="button"
                          className="document-catalog-restore-button"
                          onClick={() => void restoreRegisteredDocument(document)}
                          disabled={registeredDocumentsBusy}
                        >
                          <RestoreIcon />
                          <span>Recuperar documento</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <form
              className="chat-settings-card settings-document-upload"
              onSubmit={addSettingsDocuments}
            >
              <div className="chat-settings-card-heading">
                <div>
                  <p className="chat-settings-overline">ADICIONAR À MEMÓRIA</p>
                  <h2>Adicionar documentos</h2>
                </div>
                <span aria-hidden="true">
                  <UploadIcon />
                </span>
              </div>
              <p className="settings-document-upload-intro">
                Envie convenções, regimentos, atas ou contratos. Cada PDF pode ter até 25 MB.
              </p>
              <label
                className={`settings-document-picker${
                  context?.permissions.includes("document:upload") ? "" : " disabled"
                }`}
              >
                <span aria-hidden="true">
                  <UploadIcon />
                </span>
                <div>
                  <strong>Escolher documentos</strong>
                  <small>PDF · até 25 MB por arquivo · vários arquivos de uma vez</small>
                </div>
                <em>Selecionar</em>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={
                    settingsDocumentsUploading || !context?.permissions.includes("document:upload")
                  }
                  onChange={(event) => {
                    const selected = Array.from(event.currentTarget.files ?? []);
                    setSettingsDocumentFiles((current) => [...current, ...selected]);
                    setSettingsMessage("");
                    setSettingsMessageIsError(false);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {settingsDocumentFiles.length === 0 ? null : (
                <div className="settings-selected-documents-panel">
                  <div className="settings-selected-documents-heading">
                    <strong>Prontos para adicionar</strong>
                    <span>{settingsDocumentFiles.length}</span>
                  </div>
                  <ul className="settings-selected-documents" aria-label="Arquivos selecionados">
                    {settingsDocumentFiles.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`}>
                        <span aria-hidden="true">
                          <DocumentIcon />
                        </span>
                        <div>
                          <strong>{file.name}</strong>
                          <small>{formatDocumentSize(file.size)} · pronto para envio</small>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remover ${file.name} da seleção`}
                          onClick={() =>
                            setSettingsDocumentFiles((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index)
                            )
                          }
                          disabled={settingsDocumentsUploading}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="settings-document-confirmation">
                <input
                  type="checkbox"
                  checked={settingsDocumentsConfirmed}
                  onChange={(event) => setSettingsDocumentsConfirmed(event.target.checked)}
                  disabled={
                    settingsDocumentsUploading || !context?.permissions.includes("document:upload")
                  }
                />
                <span>
                  <strong>Confirmar antes de adicionar</strong>
                  <small>
                    Estes documentos pertencem a este condomínio e podem fundamentar as respostas.
                  </small>
                </span>
              </label>

              {context?.permissions.includes("document:upload") ? null : (
                <p className="chat-settings-footnote">
                  Sua conta pode consultar os documentos, mas não adicionar novos arquivos.
                </p>
              )}
              <button
                type="submit"
                className="settings-document-submit"
                disabled={
                  settingsDocumentsUploading ||
                  !context?.permissions.includes("document:upload") ||
                  settingsDocumentFiles.length === 0 ||
                  !settingsDocumentsConfirmed
                }
              >
                <UploadIcon />
                {settingsDocumentsUploading
                  ? "Adicionando…"
                  : settingsDocumentFiles.length === 0
                    ? "Escolha os documentos"
                    : `Adicionar ${settingsDocumentFiles.length} ${
                        settingsDocumentFiles.length === 1 ? "documento" : "documentos"
                      } à memória`}
              </button>
            </form>
          </div>

          <div
            className="chat-settings-tab-panel"
            id="settings-panel-preferences"
            role="tabpanel"
            aria-labelledby="settings-tab-preferences"
            hidden={settingsTab !== "preferences"}
            tabIndex={0}
          >
            <section className="chat-settings-card">
              <div className="chat-settings-card-heading">
                <div>
                  <p className="chat-settings-overline">PREFERÊNCIAS DA CONVERSA</p>
                  <h2>Como o chat aparece</h2>
                </div>
                <span aria-hidden="true">
                  <SettingsIcon />
                </span>
              </div>
              <label className="chat-settings-toggle">
                <span>
                  <strong>Mostrar histórico nesta tela</strong>
                  <small>
                    Esconde ou exibe as conversas anteriores carregadas para este condomínio.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={chatSettings.showHistory}
                  onChange={(event) =>
                    setChatSettings((current) => ({
                      ...current,
                      showHistory: event.target.checked
                    }))
                  }
                />
              </label>
              <label className="chat-settings-toggle">
                <span>
                  <strong>Lembrete de evidências</strong>
                  <small>
                    Mostra o aviso de que respostas documentais usam apenas fontes autorizadas.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={chatSettings.showEvidenceReminder}
                  onChange={(event) =>
                    setChatSettings((current) => ({
                      ...current,
                      showEvidenceReminder: event.target.checked
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="chat-settings-secondary-button"
                onClick={() => {
                  resetConversation();
                  setSettingsMessageIsError(false);
                  setSettingsMessage(
                    "A conversa visível foi limpa. O histórico salvo não foi apagado."
                  );
                }}
              >
                Limpar conversa visível
              </button>
              <small className="chat-settings-footnote">
                Essas preferências ficam neste dispositivo.
              </small>
            </section>
          </div>

          <div
            className="chat-settings-tab-panel"
            id="settings-panel-management"
            role="tabpanel"
            aria-labelledby="settings-tab-management"
            hidden={settingsTab !== "management"}
            tabIndex={0}
          >
            <section className="chat-settings-card chat-settings-danger-card">
              <div className="chat-settings-card-heading">
                <div>
                  <p className="chat-settings-overline">GESTÃO DO CONDOMÍNIO</p>
                  <h2>Sair da gestão e apagar condomínio</h2>
                </div>
                <span aria-hidden="true">
                  <AlertIcon />
                </span>
              </div>
              <p>
                Esta ação apaga permanentemente o condomínio selecionado, incluindo documentos,
                conversas e histórico. Sua conta não será apagada.
              </p>
              {context?.role === "manager" ? null : (
                <p className="chat-settings-footnote">
                  Apenas o síndico responsável pode apagar o condomínio.
                </p>
              )}
              <button
                type="button"
                className="chat-settings-leave-button"
                onClick={() => {
                  setSettingsMessage("");
                  setSettingsMessageIsError(false);
                  setLeaveManagementOpen(true);
                }}
                disabled={leaveManagementBusy || context?.role !== "manager"}
              >
                Sair da gestão e apagar condomínio
              </button>
            </section>
          </div>
        </section>

        {leaveManagementOpen ? (
          <div className="chat-settings-overlay" role="presentation">
            <section
              className="chat-settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="leave-management-title"
            >
              <p className="chat-settings-overline">CONFIRMAÇÃO</p>
              <h2 id="leave-management-title">Apagar condomínio?</h2>
              <p>
                O condomínio, todos os documentos, conversas, histórico e associações serão apagados
                permanentemente. Essa ação não pode ser desfeita e não apaga sua conta.
              </p>
              <div className="chat-settings-dialog-actions">
                <button
                  type="button"
                  className="chat-settings-secondary-button"
                  onClick={() => setLeaveManagementOpen(false)}
                  disabled={leaveManagementBusy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="chat-settings-leave-button"
                  onClick={() => void deleteCondominium()}
                  disabled={leaveManagementBusy}
                >
                  {leaveManagementBusy ? "Apagando…" : "Apagar condomínio"}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {profilePhotoRemovalCandidate ? (
          <div className="chat-settings-overlay" role="presentation">
            <section
              className="chat-settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-profile-photo-title"
            >
              <p className="chat-settings-overline">FOTO DO CONDOMÍNIO</p>
              <h2 id="remove-profile-photo-title">Remover esta foto?</h2>
              <p>
                A foto será removida do perfil.{" "}
                {profilePhotoRemovalCandidate.isCover
                  ? "Se houver outra imagem, ela passará a ser a capa."
                  : "Esta ação não altera as demais fotos."}
              </p>
              <div className="chat-settings-dialog-actions">
                <button
                  type="button"
                  className="chat-settings-secondary-button"
                  onClick={() => setProfilePhotoRemovalCandidate(undefined)}
                  disabled={profilePhotoRemoving}
                >
                  Manter foto
                </button>
                <button
                  type="button"
                  className="chat-settings-leave-button"
                  onClick={() => void deleteCondominiumProfilePhoto()}
                  disabled={profilePhotoRemoving}
                >
                  {profilePhotoRemoving ? "Removendo…" : "Remover foto"}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {documentPreviewBusy || documentPreview !== undefined || documentPreviewError !== "" ? (
          <div className="chat-settings-overlay" role="presentation">
            <section
              className="document-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-preview-title"
            >
              <header>
                <div>
                  <p className="chat-settings-overline">VISUALIZAÇÃO SEGURA</p>
                  <h2 id="document-preview-title">
                    {documentPreview?.title ?? "Abrindo documento"}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar visualização"
                  onClick={closeDocumentPreview}
                >
                  ×
                </button>
              </header>
              {documentPreviewBusy ? (
                <p className="document-preview-state" role="status">
                  Carregando arquivo…
                </p>
              ) : documentPreviewError !== "" ? (
                <div className="document-preview-state error" role="alert">
                  <p>{documentPreviewError}</p>
                  <button
                    type="button"
                    className="chat-settings-secondary-button"
                    onClick={closeDocumentPreview}
                  >
                    Fechar
                  </button>
                </div>
              ) : documentPreview !== undefined ? (
                documentPreview.mediaType === "application/pdf" ? (
                  <iframe title={`PDF: ${documentPreview.title}`} src={documentPreview.url} />
                ) : (
                  <img
                    className="document-preview-image"
                    src={documentPreview.url}
                    alt={`Foto original: ${documentPreview.title}`}
                  />
                )
              ) : null}
            </section>
          </div>
        ) : null}

        {documentRemovalCandidate !== undefined ? (
          <div className="chat-settings-overlay" role="presentation">
            <section
              className="document-removal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-removal-title"
              aria-describedby="document-removal-description"
            >
              <span className="document-removal-dialog-icon" aria-hidden="true">
                <TrashIcon />
              </span>
              <p className="chat-settings-overline">GERENCIAR MEMÓRIA DOCUMENTAL</p>
              <h2 id="document-removal-title">Mover para a lixeira?</h2>
              <p id="document-removal-description">
                <strong>{documentRemovalCandidate.title}</strong> deixará de ser usado em novas
                respostas agora. Você poderá recuperá-lo por até 30 dias. Após esse prazo, o
                original e os dados usados na busca serão removidos do banco ativo. As mensagens,
                respostas e trechos já citados permanecem no chat, identificados como históricos.
                Cópias de segurança seguem prazo próprio.
              </p>
              <div className="document-removal-dialog-actions">
                <button
                  type="button"
                  className="chat-settings-secondary-button"
                  onClick={() => setDocumentRemovalCandidate(undefined)}
                  disabled={registeredDocumentsBusy}
                >
                  Manter documento
                </button>
                <button
                  type="button"
                  className="document-removal-confirm-button"
                  onClick={() => {
                    const document = documentRemovalCandidate;
                    setDocumentRemovalCandidate(undefined);
                    void removeRegisteredDocument(document);
                  }}
                  disabled={registeredDocumentsBusy}
                >
                  <TrashIcon />
                  Mover para lixeira
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    );
  }

  const visibleConversationHistory = chatSettings.showHistory ? conversationHistory : [];
  const activeCondominium = availableCondominiums.find(
    (item) => item.id === context?.condominiumId
  );
  const normalizedSidebarSearch = condominiumSearch.trim().toLocaleLowerCase("pt-BR");
  const sidebarCondominiums = availableCondominiums.filter((item) =>
    `${item.name} ${item.detail}`.toLocaleLowerCase("pt-BR").includes(normalizedSidebarSearch)
  );

  return (
    <main
      className={`chat-page${desktopSidebarOpen ? "" : " sidebar-collapsed"}`}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        if (touch !== undefined) touchStartX.current = touch.clientX;
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0];
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (touch !== undefined && startX !== null && Math.abs(touch.clientX - startX) >= 90) {
          openCondominiumPicker();
        }
      }}
    >
      <aside className="desktop-sidebar" aria-label="Lista de condomínios">
        <header className="desktop-sidebar-header">
          <div className="login-brand">
            <BrandMark />
            <span>{provisionalBrand.productName}</span>
          </div>
          <button
            className="desktop-sidebar-close"
            type="button"
            aria-label="Ocultar lista de condomínios"
            onClick={() => setDesktopSidebarOpen(false)}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M14 6l-6 6 6 6" />
              <path d="M19 5v14" />
            </svg>
          </button>
        </header>

        <div className="desktop-sidebar-heading">
          <div>
            <p>CONVERSAS</p>
            <h1>Condomínios</h1>
          </div>
          <button
            type="button"
            aria-label="Cadastrar novo condomínio"
            onClick={() => openCondominiumRegistration("condominiums")}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <label className="desktop-sidebar-search">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={condominiumSearch}
            onChange={(event) => setCondominiumSearch(event.target.value)}
            placeholder="Buscar condomínio"
            aria-label="Buscar condomínio"
          />
        </label>

        <nav className="desktop-condominium-list" aria-label="Condomínios autorizados">
          {sidebarCondominiums.map((item) => (
            <button
              key={item.id}
              className={item.id === context?.condominiumId ? "active" : ""}
              type="button"
              onClick={() => void selectCondominium(item.id)}
              disabled={busy}
              aria-current={item.id === context?.condominiumId ? "page" : undefined}
            >
              <span className="desktop-condominium-avatar" aria-hidden="true">
                {condominiumInitials(item.name)}
              </span>
              <span className="desktop-condominium-copy">
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
              {item.id === context?.condominiumId ? (
                <span className="desktop-active-dot" aria-label="Condomínio aberto" />
              ) : null}
            </button>
          ))}
          {sidebarCondominiums.length === 0 ? (
            <div className="desktop-sidebar-empty">
              <strong>Nenhum condomínio encontrado</strong>
              <small>Tente buscar por outro nome.</small>
            </div>
          ) : null}
        </nav>

        <footer className="desktop-sidebar-profile">
          <button
            type="button"
            aria-label="Abrir perfil do gestor"
            onClick={() => openProfile("chat")}
          >
            <span aria-hidden="true">
              {displayName.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "G"}
            </span>
            <span>
              <strong>{displayName.trim() || "Gestor"}</strong>
              <small>{authMode === "real" ? "Conta protegida" : "Ambiente de demonstração"}</small>
            </span>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </footer>
      </aside>

      <section className="chat-shell">
        <header className="chat-header">
          <button
            className="mobile-chat-back"
            type="button"
            aria-label="Voltar para condomínios"
            onClick={openCondominiumPicker}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M19 12H5m6-7-7 7 7 7" />
            </svg>
          </button>
          <button
            className="desktop-sidebar-open"
            type="button"
            aria-label="Mostrar lista de condomínios"
            onClick={() => setDesktopSidebarOpen(true)}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M10 6l6 6-6 6" />
              <path d="M5 5v14" />
            </svg>
            <span>Condomínios</span>
          </button>
          <div className="login-brand inverse">
            <BrandMark />
            <span>{provisionalBrand.productName}</span>
          </div>
          <div className="agent-presence">
            <span className="presence-avatar">{provisionalBrand.mark}</span>
            <div>
              <strong>{provisionalBrand.agentName}</strong>
              <small>
                <i />{" "}
                {aiProvider === "gemini"
                  ? "Gemini conectado"
                  : aiProvider === "local"
                    ? "Modo local — Gemini não conectado"
                    : "Verificando conexão"}
              </small>
            </div>
          </div>
          <div className="active-context">
            <span aria-hidden="true">
              {condominiumInitials(
                activeCondominium?.name ?? context?.condominiumId ?? "Condomínio"
              )}
            </span>
            <div>
              <strong>{activeCondominium?.name ?? context?.condominiumId}</strong>
              <small>Memória documental ativa</small>
            </div>
          </div>
          <button
            className="chat-settings-button"
            type="button"
            aria-label="Configurações do condomínio"
            onClick={openChatSettings}
          >
            <span aria-hidden="true">
              <SettingsIcon />
            </span>
            <span>Configurações</span>
          </button>
        </header>
        <section className="chat-main" aria-label="Conversa documental">
          {chatSettings.showEvidenceReminder &&
          submittedQuestion !== "" &&
          !isSimpleConversationMessage(submittedQuestion) ? (
            <div className="security-notice">
              ✓ A Alvitra consulta os documentos primeiro e separa orientação geral de regra
              confirmada.
            </div>
          ) : null}
          <div className="messages" aria-live="polite">
            {visibleConversationHistory.map((entry) => (
              <div className="history-turn" key={entry.answer.answerId}>
                <div className="user-message">
                  <p>{entry.question}</p>
                </div>
                <article className="assistant-message history-answer">
                  <div className="answer-meta">
                    <strong>{provisionalBrand.agentName}</strong>
                  </div>
                  <p className="answer-copy">
                    <FormattedText text={entry.answer.answer} />
                  </p>
                </article>
                {entry.answer.citations.length === 0 ? null : (
                  <section className="assistant-message detail-message sources">
                    <div>
                      <strong>Fontes da resposta</strong>
                      <small>
                        {entry.answer.citations.some((citation) => citation.sourceRemoved)
                          ? "Trechos históricos preservados na conversa"
                          : `${entry.answer.citations.length} trecho(s) verificável(is)`}
                      </small>
                    </div>
                    {entry.answer.citations.map((citation) => (
                      <button
                        type="button"
                        key={citation.id}
                        onClick={() => setSelectedCitation(citation)}
                      >
                        <span>
                          <DocumentIcon />
                        </span>
                        <div>
                          <strong>{citation.title}</strong>
                          <small>
                            {citation.sourceRemoved
                              ? "Documento removido do acervo · trecho histórico"
                              : citation.sourceScope === "legislation"
                                ? "Legislação oficial"
                                : "Documento do condomínio"}{" "}
                            · página {citation.page} · abrir trecho
                          </small>
                        </div>
                        <b>›</b>
                      </button>
                    ))}
                  </section>
                )}
              </div>
            ))}
            {visibleConversationHistory.length === 0 &&
            submittedQuestion === "" &&
            answer === undefined ? (
              <>
                <p className="conversation-date">HOJE</p>
                {setupNotice === undefined ? null : (
                  <div className="assistant-message setup-notice">
                    <span aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <p>{setupNotice}</p>
                  </div>
                )}
                <div className="assistant-message welcome-message">
                  <strong>{provisionalBrand.agentName}</strong>
                  <p>Olá, {displayName.trim() || "gestor"}! Eu sou sua conselheira documental.</p>
                </div>
                <div className="assistant-message guide-message">
                  <p>
                    Posso consultar regras, atas e contratos deste condomínio. Escreva o que você
                    precisa conferir e eu mostrarei a fonte usada.
                  </p>
                </div>
                <div className="suggested-questions" aria-label="Perguntas sugeridas">
                  <span>Experimente perguntar:</span>
                  {suggestedQuestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {sentChatDocumentName === "" ? null : (
              <div className="user-message sent-document-message">
                <span aria-hidden="true">
                  <DocumentIcon />
                </span>
                <div>
                  <strong>Documento enviado</strong>
                  <p>{sentChatDocumentName}</p>
                </div>
              </div>
            )}
            {chatDocumentMessage === "" ? null : (
              <div
                className={`assistant-message document-upload-notice${
                  chatDocumentMessageIsError ? " is-error" : ""
                }`}
                role={chatDocumentMessageIsError ? "alert" : "status"}
              >
                <span aria-hidden="true">
                  <DocumentIcon />
                </span>
                <p>{chatDocumentMessage}</p>
              </div>
            )}
            {submittedQuestion === "" ? null : (
              <div className="user-message">
                <p>{submittedQuestion}</p>
              </div>
            )}
            {busy && submittedQuestion !== "" ? (
              <div className="assistant-message loading">
                <span className="loading-avatar">{provisionalBrand.mark}</span>
                <div>
                  <strong>{provisionalBrand.agentName} está preparando uma resposta</strong>
                  <small>
                    Consultando fontes autorizadas <b>● ● ●</b>
                  </small>
                </div>
              </div>
            ) : null}
            {conversationError === "" ? null : (
              <div className="assistant-message response-message" role="alert">
                <div className="answer-meta">
                  <strong>{provisionalBrand.agentName}</strong>
                  <span className="answer-status failed">Falha temporária</span>
                </div>
                <p className="answer-copy">{conversationError}</p>
                <p>Tente novamente. Sua pergunta continua visível na conversa.</p>
              </div>
            )}
            {answer === undefined ? null : (
              <>
                <article className="assistant-message response-message">
                  <div className="answer-meta">
                    <strong>{provisionalBrand.agentName}</strong>
                    {answerStatus === undefined ? null : (
                      <span className={`answer-status ${answerStatus.tone}`}>
                        {answerStatus.label}
                      </span>
                    )}
                  </div>
                  <p className="answer-copy">
                    <FormattedText text={answer.answer} />
                  </p>
                  {showResponseGuidance ? (
                    <div className="answer-guidance">
                      {visibleAttentionPoints.map((point) => (
                        <p className="answer-attention" key={point}>
                          <strong>Atenção:</strong> <FormattedText text={point} />
                        </p>
                      ))}
                      {showSuggestedNextStep ? (
                        <p className="answer-next-step">
                          <strong>Próximo passo:</strong>{" "}
                          <FormattedText text={answer.suggestedNextStep ?? ""} />
                        </p>
                      ) : null}
                      {showSpecialist ? (
                        <p className="answer-specialist">
                          <strong>Valide com {answer.specialist.type ?? "um especialista"}:</strong>{" "}
                          <FormattedText text={answer.specialist.reason ?? ""} />
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
                {isConversationalResponse || answer.citations.length === 0 ? null : (
                  <section className="assistant-message detail-message sources">
                    <div>
                      <strong>Fontes da resposta</strong>
                      <small>
                        {answer.citations.some((citation) => citation.sourceRemoved)
                          ? "Trechos históricos preservados na conversa"
                          : `${answer.citations.length} trecho(s) verificável(is)`}
                      </small>
                    </div>
                    {answer.citations.map((citation) => (
                      <button
                        type="button"
                        key={citation.id}
                        onClick={() => setSelectedCitation(citation)}
                      >
                        <span>
                          <DocumentIcon />
                        </span>
                        <div>
                          <strong>{citation.title}</strong>
                          <small>
                            {citation.sourceRemoved
                              ? "Documento removido do acervo · trecho histórico"
                              : citation.sourceScope === "legislation"
                                ? "Legislação oficial"
                                : "Documento do condomínio"}{" "}
                            · página {citation.page} · abrir trecho
                          </small>
                        </div>
                        <b>›</b>
                      </button>
                    ))}
                  </section>
                )}
                {isConversationalResponse ? null : (
                  <div className="feedback detail-message">
                    <span>Esta resposta ajudou?</span>
                    {(["correct", "incorrect", "incomplete", "outdated"] as const).map(
                      (classification) => (
                        <button
                          type="button"
                          key={classification}
                          className={feedback === classification ? "selected" : ""}
                          onClick={() => submitFeedback(classification)}
                          disabled={busy}
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
              </>
            )}
            {selectedCitation === undefined ? null : (
              <section className="assistant-message source-viewer">
                <div>
                  <p className="overline">
                    {selectedCitation.sourceRemoved ? "TRECHO HISTÓRICO" : "FONTE ABERTA"}
                  </p>
                  <h3>{selectedCitation.title}</h3>
                </div>
                <button type="button" onClick={() => setSelectedCitation(undefined)}>
                  Fechar
                </button>
                <p>
                  {selectedCitation.sourceRemoved ? "Original removido · " : "Versão "}
                  {selectedCitation.documentVersionId} · página {selectedCitation.page}
                </p>
                <blockquote>{selectedCitation.excerpt}</blockquote>
              </section>
            )}
          </div>
        </section>
        <footer
          className={`composer${registeredDocuments.some((document) => document.mediaType?.startsWith("image/")) ? " composer-has-images" : ""}`}
        >
          {pendingChatDocument === undefined ? (
            <div className="composer-hint-wrap">
              <span className="composer-hint">Pergunte à {provisionalBrand.agentName}</span>
              {registeredDocuments.some((document) => document.mediaType?.startsWith("image/")) ? (
                <small className="composer-image-disclosure">
                  Perguntas para localizar fotos cadastradas podem ser processadas pela Gemini paga.
                </small>
              ) : null}
            </div>
          ) : (
            <div className="composer-attachment">
              <span aria-hidden="true">
                <DocumentIcon />
              </span>
              <strong>{pendingChatDocument.name}</strong>
              <small>
                {chatFileMediaType(pendingChatDocument) === "application/pdf"
                  ? "Pronto para enviar pela seta"
                  : "A foto será armazenada no banco deste condomínio e enviada à Gemini paga para análise. Use somente imagem sintética neste ambiente. Envie pela seta."}
              </small>
              <button
                type="button"
                aria-label={`Remover ${pendingChatDocument.name}`}
                onClick={() => setPendingChatDocument(undefined)}
              >
                ×
              </button>
            </div>
          )}
          <input
            ref={chatDocumentInput}
            className="composer-document-input"
            type="file"
            accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file !== undefined) selectChatDocument(file);
            }}
          />
          <button
            className="composer-upload-button"
            type="button"
            onClick={() => chatDocumentInput.current?.click()}
            disabled={
              chatDocumentUploading || busy || !context?.permissions.includes("document:upload")
            }
            aria-label="Anexar PDF ou foto"
            title="Anexar PDF ou foto"
          >
            <UploadIcon />
          </button>
          <textarea
            ref={composerInput}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                pendingChatDocument === undefined &&
                !window.matchMedia("(max-width: 760px)").matches
              ) {
                event.preventDefault();
                if (!busy && question.trim().length > 0) void askQuestion();
              }
            }}
            placeholder="Ex.: O que a convenção diz sobre animais?"
            aria-label="Escreva sua pergunta"
            rows={1}
            maxLength={4000}
          />
          <button
            className="composer-send-button"
            type="button"
            onClick={sendComposer}
            disabled={
              busy ||
              chatDocumentUploading ||
              (pendingChatDocument === undefined && question.trim().length === 0)
            }
            aria-label={
              pendingChatDocument === undefined ? "Enviar pergunta" : "Enviar documento selecionado"
            }
            title={
              pendingChatDocument === undefined ? "Enviar pergunta" : "Enviar documento pela seta"
            }
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="m5 12 14-7-4.5 14-3-5.5L5 12Z" />
              <path d="m11.5 13.5 3.5-3.5" />
            </svg>
          </button>
        </footer>
      </section>
    </main>
  );
}
