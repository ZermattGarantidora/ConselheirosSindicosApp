import { type FormEvent, useEffect, useRef, useState } from "react";

import { splitBoldText } from "./message-format.js";

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
  | "chat-settings";
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
type AuthMode = "unknown" | "development" | "real";
type AuthPanel = "login" | "register";
type AuthUser = Readonly<{ userId: string; email: string; displayName: string }>;
type RegistrationFile = Pick<File, "name" | "type" | "size">;
type ChatSettings = Readonly<{
  showHistory: boolean;
  showEvidenceReminder: boolean;
}>;

const defaultChatSettings: ChatSettings = Object.freeze({
  showHistory: true,
  showEvidenceReminder: true
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

function isPdf(file: Pick<File, "type" | "name">): boolean {
  return file.type === "application/pdf" || file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf");
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

function modeLabel(mode: PublicAnswer["answerMode"]): string {
  return {
    grounded: "Com base nos documentos",
    abstained: "Sem base suficiente",
    conflict: "Conflito entre documentos",
    failed: "Consulta interrompida"
  }[mode];
}

function isConversationalMessage(message: string): boolean {
  const normalized = message.trim();
  const documentaryQuestion =
    /convenção|convencao|regimento|ata\b|assembleia|contrato|cláusula|clausula|documento|regra|norma|página|pagina|quórum|quorum|vigência|vigencia|prazo|vencimento/iu.test(
      normalized
    );
  return normalized.length > 0 && normalized.length <= 1_200 && !documentaryQuestion;
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
  } else if (!isPdf(constitutionMinutes) || constitutionMinutes.size > 10 * 1024 * 1024) {
    errors.push("ata em PDF de até 10 MB");
  }

  const invalidAdditionalDocument = additionalDocuments.find(
    (file) => !isPdf(file) || file.size > 10 * 1024 * 1024
  );
  if (invalidAdditionalDocument !== undefined) {
    errors.push(`arquivo adicional "${invalidAdditionalDocument.name}" em PDF de até 10 MB`);
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

function ZermattMark() {
  return (
    <span className="zermatt-mark" aria-hidden="true">
      Z
    </span>
  );
}

function FormattedText({ text }: Readonly<{ text: string }>) {
  return splitBoldText(text).map((segment, index) =>
    segment.bold ? <strong key={index}>{segment.text}</strong> : segment.text
  );
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
  const [conversationHistory, setConversationHistory] = useState<
    readonly ConversationHistoryEntry[]
  >([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | undefined>();
  const [feedback, setFeedback] = useState<FeedbackClassification | undefined>();
  const [message, setMessage] = useState("Escolha ou crie um condomínio para iniciar.");
  const [aiProvider, setAiProvider] = useState<AiProvider>("unavailable");
  const [authMode, setAuthMode] = useState<AuthMode>("unknown");
  const [authPanel, setAuthPanel] = useState<AuthPanel>("login");
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [leaveManagementOpen, setLeaveManagementOpen] = useState(false);
  const [leaveManagementBusy, setLeaveManagementBusy] = useState(false);
  const [condominiumNotice, setCondominiumNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const touchStartX = useRef<number | null>(null);
  const isConversationalResponse =
    answer !== undefined && isConversationalMessage(submittedQuestion);

  useEffect(() => {
    void fetch("/health")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as Readonly<{
          aiProvider?: unknown;
          authMode?: unknown;
        }>;
        if (body.aiProvider === "gemini" || body.aiProvider === "local") {
          setAiProvider(body.aiProvider);
        }
        if (body.authMode === "real" || body.authMode === "development") {
          setAuthMode(body.authMode);
        }
      })
      .catch(() => {
        setAiProvider("unavailable");
        setAuthMode("development");
      });
  }, []);

  useEffect(() => {
    if (authMode !== "unknown") return;
    const timeoutId = window.setTimeout(() => {
      setAuthMode((current) => (current === "unknown" ? "development" : current));
    }, 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [authMode]);

  useEffect(() => {
    if (authMode !== "real") return;
    void (async () => {
      try {
        const response = await fetch("/v1/auth/session", { credentials: "same-origin" });
        if (!response.ok) return;
        const body = (await response.json()) as Readonly<{ user?: AuthUser }>;
        if (body.user === undefined) return;
        setAuthUser(body.user);
        setDisplayName(body.user.displayName);
        await loadAuthorizedCondominiums();
        setMessage("Escolha um condomínio autorizado para abrir a conversa.");
        setView("condominiums");
      } catch {
        setAvailableCondominiums([]);
      }
    })();
  }, [authMode]);

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
    setAuthBusy(true);
    setAuthMessage("");
    const endpoint = authPanel === "register" ? "/v1/auth/register" : "/v1/auth/login";
    const payload =
      authPanel === "register"
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
        return;
      }
      const body = (await response.json()) as Readonly<{ user?: AuthUser }>;
      if (body.user === undefined) {
        setAuthMessage("A resposta do servidor não trouxe uma conta válida.");
        return;
      }
      setAuthUser(body.user);
      setDisplayName(body.user.displayName);
      setAuthPassword("");
      await loadAuthorizedCondominiums();
      setMessage(
        authPanel === "register"
          ? "Conta criada. Seus grupos de condomínio aparecerão aqui quando forem autorizados."
          : "Login concluído. Escolha um condomínio autorizado para abrir a conversa."
      );
      setView("condominiums");
    } catch {
      setAuthMessage("Não foi possível conectar ao servidor agora.");
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
    setAuthMessage("");
    setChatSettings(defaultChatSettings);
    setCondominiumNotice("");
    setAvailableCondominiums([...condominiumCatalog]);
    setView("landing");
  }

  function openAuthentication(panel: AuthPanel): void {
    setAuthPanel(panel);
    setAuthMessage("");
    setAuthPassword("");
    setView("login");
  }

  function resetConversation() {
    setQuestion("");
    setSubmittedQuestion("");
    setAnswer(undefined);
    setConversationHistory([]);
    setSelectedCitation(undefined);
    setFeedback(undefined);
    setSetupNotice(undefined);
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
    setSettingsMessage("");
    setLeaveManagementOpen(false);
    setView("chat-settings");
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
    const response = await fetch(`/v1/condominiums/${encodeURIComponent(condominium)}/documents`, {
      method: "POST",
      headers: {
        "content-type": "application/pdf",
        ...(authMode === "development" ? { "x-development-user-id": developmentUserId } : {}),
        "x-document-title": encodeURIComponent(title),
        "x-document-type": documentType,
        "x-document-validity-confirmed": "true"
      },
      body: file
    });
    if (!response.ok) {
      throw new Error(await readMessage(response, `Não foi possível salvar ${file.name}.`));
    }
    const body = (await response.json()) as Readonly<{ memoryStatus?: DocumentMemoryStatus }>;
    return body.memoryStatus;
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
        realAccount
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
    setBusy(true);
    setSubmittedQuestion(trimmedQuestion);
    setAnswer(undefined);
    setSelectedCitation(undefined);
    setFeedback(undefined);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/questions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-development-user-id": developmentUserId
          },
          body: JSON.stringify({ question: trimmedQuestion })
        }
      );
      if (!response.ok) {
        setMessage(await readMessage(response, "Não foi possível processar a pergunta."));
        return;
      }
      setAnswer((await response.json()) as PublicAnswer);
      setQuestion("");
    } catch {
      setMessage("Não foi possível conectar ao conselheiro agora.");
    } finally {
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
            <ZermattMark />
            <span>Zermatt</span>
          </div>
          <span className="landing-header-label">CONSELHEIRO DOCUMENTAL</span>
        </header>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="overline">GESTÃO CONDOMINIAL COM MAIS CLAREZA</p>
            <h1 id="landing-title">Encontre a regra certa para tomar a próxima decisão.</h1>
            <p className="landing-lead">
              O Conselheiro organiza os documentos do seu condomínio e ajuda você a consultar
              convenções, atas e contratos com respostas fundamentadas e fontes verificáveis.
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
            <p className="landing-privacy">
              Seus documentos ficam separados por condomínio e só aparecem para quem tem
              autorização.
            </p>
          </div>
          <aside className="landing-proof" aria-label="Como o Conselheiro ajuda">
            <div className="landing-proof-icon" aria-hidden="true">
              ✓
            </div>
            <div>
              <p className="landing-proof-overline">DO DOCUMENTO À DECISÃO</p>
              <h2>Contexto para agir com segurança</h2>
              <ul>
                <li>Respostas baseadas no acervo autorizado</li>
                <li>Documento, página e trecho como evidência</li>
                <li>Alertas claros quando falta informação</li>
              </ul>
            </div>
          </aside>
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
              <ZermattMark />
              <span>Zermatt</span>
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
    if (authMode === "real") {
      const registering = authPanel === "register";
      return (
        <main className="login-page">
          <section className="login-card" aria-labelledby="auth-title">
            <div className="login-brand">
              <ZermattMark />
              <span>Zermatt</span>
            </div>
            <p className="overline">CONSELHEIRO DOCUMENTAL</p>
            <h1 id="auth-title">{registering ? "Crie sua conta." : "Bem-vindo de volta."}</h1>
            <p className="login-lead">
              {registering
                ? "Organize os documentos dos seus condomínios em um espaço seguro."
                : "Entre para continuar de onde você parou, com seus condomínios autorizados."}
            </p>
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
                <p className="auth-hint">
                  Use pelo menos 12 caracteres. Não reutilize uma senha importante.
                </p>
              ) : null}
              {authMessage !== "" ? (
                <p className="auth-error" role="alert">
                  {authMessage}
                </p>
              ) : null}
              <button className="primary-button" type="submit" disabled={authBusy}>
                {authBusy ? "Aguarde…" : registering ? "Criar conta" : "Entrar"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setAuthPanel(registering ? "login" : "register");
                setAuthMessage("");
                setAuthPassword("");
              }}
            >
              {registering ? "Já tenho uma conta" : "Ainda não tenho uma conta"}
            </button>
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
            <ZermattMark />
            <span>Zermatt</span>
          </div>
          <p className="overline">CONSELHEIRO DOCUMENTAL</p>
          <h1 id="connection-title">Acesso indisponível.</h1>
          <p className="login-lead">
            Não foi possível conectar o acesso seguro agora. Tente novamente em instantes.
          </p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Tentar novamente <span aria-hidden="true">→</span>
          </button>
          <p className="login-footer">
            Zermatt Garantidora · tecnologia para uma gestão mais segura
          </p>
        </section>
      </main>
    );
  }

  if (view === "onboarding") {
    return (
      <main className="onboarding-page">
        <header className="simple-header">
          <div className="login-brand">
            <ZermattMark />
            <span>Zermatt</span>
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
                  ✓
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
                  <span className="building-icon">▥</span>
                  <span>
                    <strong>Residencial Alameda</strong>
                    <small>Documentos disponíveis</small>
                  </span>
                  <b>→</b>
                </button>
                <button type="button" onClick={() => selectCondominium("bosque")} disabled={busy}>
                  <span className="building-icon">▥</span>
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
            ←
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
              ▥
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
                  <small>PDF de até 10 MB por arquivo.</small>
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
                  {constitutionMinutes === undefined ? "↑" : "✓"}
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
                <span aria-hidden="true">＋</span>
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
                <span aria-hidden="true">C</span>
                <p>
                  <strong>Memória separada por condomínio</strong>
                  <small>
                    A Cora consulta apenas os documentos salvos no contexto selecionado.
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
                {busy
                  ? "Salvando cadastro…"
                  : authMode === "real"
                    ? "Criar condomínio e abrir conversa"
                    : "Criar condomínio e abrir conversa"}
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
          <div>
            <strong>Condomínios</strong>
            <small>Seus grupos de conversa</small>
          </div>
          {authMode === "real" ? (
            <button
              className="mobile-account-button"
              type="button"
              onClick={() => void logoutAccount()}
            >
              Voltar ao login
            </button>
          ) : (
            <button
              className="mobile-add-button"
              type="button"
              aria-label="Cadastrar novo condomínio"
              onClick={() => openCondominiumRegistration("condominiums")}
            >
              +
            </button>
          )}
        </header>
        <section className="mobile-condominiums-content">
          {condominiumNotice === "" ? null : (
            <p className="mobile-condominiums-notice" role="status">
              {condominiumNotice}
            </p>
          )}
          <label className="mobile-condominiums-search">
            <span aria-hidden="true">⌕</span>
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
              >
                <span className="mobile-condominium-avatar" aria-hidden="true">
                  ▥
                </span>
                <span className="mobile-condominium-copy">
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="mobile-condominium-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {visibleCondominiums.length === 0 ? (
              <div className="mobile-condominiums-empty-card">
                <span className="mobile-condominiums-empty-icon" aria-hidden="true">
                  ▥
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

  if (view === "chat-settings") {
    const activeCondominium = availableCondominiums.find(
      (item) => item.id === context?.condominiumId
    );

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
            <strong>Configurações do chat</strong>
            <small>{activeCondominium?.name ?? context?.condominiumId ?? "Condomínio"}</small>
          </div>
        </header>

        <section className="chat-settings-content" aria-label="Configurações gerais do chat">
          <div className="chat-settings-identity">
            <span className="chat-settings-identity-icon" aria-hidden="true">
              ▥
            </span>
            <div>
              <strong>{activeCondominium?.name ?? context?.condominiumId ?? "Condomínio"}</strong>
              <small>Conversa documental protegida por condomínio</small>
            </div>
          </div>

          <section className="chat-settings-card">
            <div className="chat-settings-card-heading">
              <div>
                <p className="chat-settings-overline">PREFERÊNCIAS DA CONVERSA</p>
                <h2>Como o chat aparece</h2>
              </div>
              <span aria-hidden="true">⚙</span>
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

          <section className="chat-settings-card chat-settings-danger-card">
            <div className="chat-settings-card-heading">
              <div>
                <p className="chat-settings-overline">GESTÃO DO CONDOMÍNIO</p>
                <h2>Sair da gestão e apagar condomínio</h2>
              </div>
              <span aria-hidden="true">!</span>
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
                setLeaveManagementOpen(true);
              }}
              disabled={leaveManagementBusy || context?.role !== "manager"}
            >
              Sair da gestão e apagar condomínio
            </button>
          </section>

          {settingsMessage === "" ? null : (
            <p className="chat-settings-message" role="status">
              {settingsMessage}
            </p>
          )}
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
      </main>
    );
  }

  const visibleConversationHistory = chatSettings.showHistory ? conversationHistory : [];

  return (
    <main
      className="chat-page"
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
        <div className="login-brand inverse">
          <ZermattMark />
          <span>Zermatt</span>
        </div>
        <div className="cora-presence">
          <span className="presence-avatar">C</span>
          <div>
            <strong>Cora</strong>
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
          <span aria-hidden="true">▥</span>
          <div>
            <strong>
              {availableCondominiums.find((item) => item.id === context?.condominiumId)?.name ??
                context?.condominiumId}
            </strong>
            <small>
              {aiProvider === "gemini"
                ? "Gemini conectado"
                : aiProvider === "local"
                  ? "Modo local"
                  : "Verificando conexão"}
            </small>
          </div>
        </div>
        <button
          className="chat-settings-button"
          type="button"
          aria-label="Configurações do chat"
          onClick={openChatSettings}
        >
          <span aria-hidden="true">⚙</span>
          <span>Configurações</span>
        </button>
        <button type="button" onClick={openCondominiumPicker}>
          Trocar condomínio
        </button>
      </header>
      <section className="chat-main" aria-label="Conversa documental">
        {chatSettings.showEvidenceReminder &&
        submittedQuestion !== "" &&
        !isConversationalMessage(submittedQuestion) ? (
          <div className="security-notice">
            ✓ A resposta só pode usar evidências do condomínio selecionado.
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
                  <strong>Cora</strong>
                </div>
                <p className="answer-copy">
                  <FormattedText text={entry.answer.answer} />
                </p>
              </article>
            </div>
          ))}
          {visibleConversationHistory.length === 0 &&
          submittedQuestion === "" &&
          answer === undefined ? (
            <>
              <p className="conversation-date">HOJE</p>
              {setupNotice === undefined ? null : (
                <div className="assistant-message setup-notice">
                  <span aria-hidden="true">✓</span>
                  <p>{setupNotice}</p>
                </div>
              )}
              <div className="assistant-message welcome-message">
                <strong>Cora</strong>
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
          {submittedQuestion === "" ? null : (
            <div className="user-message">
              <p>{submittedQuestion}</p>
            </div>
          )}
          {busy && submittedQuestion !== "" ? (
            <div className="assistant-message loading">
              <span className="loading-avatar">C</span>
              <div>
                <strong>Cora está preparando uma resposta</strong>
                <small>
                  Consultando fontes autorizadas <b>● ● ●</b>
                </small>
              </div>
            </div>
          ) : null}
          {answer === undefined ? null : (
            <>
              <article className="assistant-message response-message">
                <div className="answer-meta">
                  <strong>Cora</strong>
                  {isConversationalResponse ? null : (
                    <>
                      <span className={`answer-mode ${answer.answerMode}`}>
                        {modeLabel(answer.answerMode)}
                      </span>
                      <span className={`risk ${answer.riskClass}`}>
                        {answer.riskClass === "high"
                          ? "ALTO RISCO"
                          : answer.riskClass === "medium"
                            ? "ATENÇÃO"
                            : "RISCO BAIXO"}
                      </span>
                    </>
                  )}
                </div>
                <p className="answer-copy">
                  <FormattedText text={answer.answer} />
                </p>
              </article>
              {answer.attentionPoints.length === 0 ? null : (
                <section className="assistant-message detail-message attention-box">
                  <strong>Pontos de atenção</strong>
                  <ul>
                    {answer.attentionPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}
              {isConversationalResponse || answer.suggestedNextStep === null ? null : (
                <section className="assistant-message detail-message next-step">
                  <strong>PRÓXIMO PASSO</strong>
                  <p>{answer.suggestedNextStep}</p>
                </section>
              )}
              {answer.specialist.required ? (
                <section className="assistant-message detail-message specialist-box">
                  <strong>Valide com {answer.specialist.type ?? "um especialista"}</strong>
                  <p>{answer.specialist.reason}</p>
                </section>
              ) : null}
              {isConversationalResponse ? null : (
                <section className="assistant-message detail-message sources">
                  <div>
                    <strong>Fontes da resposta</strong>
                    <small>{answer.citations.length} trecho(s) verificável(is)</small>
                  </div>
                  {answer.citations.length === 0 ? (
                    <p>Nenhuma fonte é exibida quando falta base documental.</p>
                  ) : (
                    answer.citations.map((citation) => (
                      <button
                        type="button"
                        key={citation.id}
                        onClick={() => setSelectedCitation(citation)}
                      >
                        <span>▤</span>
                        <div>
                          <strong>{citation.title}</strong>
                          <small>Página {citation.page} · abrir trecho</small>
                        </div>
                        <b>›</b>
                      </button>
                    ))
                  )}
                </section>
              )}
              {selectedCitation === undefined ? null : (
                <section className="assistant-message source-viewer">
                  <div>
                    <p className="overline">FONTE ABERTA</p>
                    <h3>{selectedCitation.title}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedCitation(undefined)}>
                    Fechar
                  </button>
                  <p>
                    Versão {selectedCitation.documentVersionId} · página {selectedCitation.page}
                  </p>
                  <blockquote>{selectedCitation.excerpt}</blockquote>
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
        </div>
      </section>
      <footer className="composer">
        <span className="composer-hint">Pergunte à Cora</span>
        <textarea
          ref={composerInput}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex.: O que a convenção diz sobre animais?"
          aria-label="Escreva sua pergunta"
          rows={1}
          maxLength={4000}
        />
        <button
          type="button"
          onClick={askQuestion}
          disabled={busy || question.trim().length === 0}
          aria-label="Enviar pergunta"
        >
          ↑
        </button>
      </footer>
    </main>
  );
}
