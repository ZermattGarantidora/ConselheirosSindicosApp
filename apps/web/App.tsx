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
type View = "login" | "onboarding" | "condominiums" | "create-condominium" | "chat";
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

const developmentUserId = "sindico-demo";
const suggestedQuestions = [
  "Animais são permitidos?",
  "Quais regras existem para visitantes?",
  "O que preciso conferir antes de uma obra?"
] as const;

const condominiumCatalog: readonly CondominiumListItem[] = [
  { id: "alameda", name: "Residencial Alameda", detail: "Documentos de demonstração disponíveis" },
  { id: "bosque", name: "Condomínio Bosque", detail: "Segundo contexto isolado para testes" }
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

function isPdf(file: File): boolean {
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
  const [view, setView] = useState<View>("login");
  const [displayName, setDisplayName] = useState("Gestor de testes");
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
  const [busy, setBusy] = useState(false);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const touchStartX = useRef<number | null>(null);
  const isConversationalResponse =
    answer !== undefined && isConversationalMessage(submittedQuestion);

  useEffect(() => {
    void fetch("/health")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as Readonly<{ aiProvider?: unknown }>;
        if (body.aiProvider === "gemini" || body.aiProvider === "local") {
          setAiProvider(body.aiProvider);
        }
      })
      .catch(() => setAiProvider("unavailable"));
  }, []);

  useEffect(() => {
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
              detail: `${profile.address.city}/${profile.address.state} · Cadastro de teste`
            }))
        ]);
      })
      .catch(() => undefined);
  }, []);

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
    if (window.matchMedia("(max-width: 580px)").matches) {
      setCondominiumSearch("");
      setView("condominiums");
      return;
    }
    setView("onboarding");
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
    setView("create-condominium");
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
    resetConversation();
    try {
      const response = await fetch(`/v1/condominiums/${encodeURIComponent(id)}/context`, {
        headers: { "x-development-user-id": developmentUserId }
      });

      if (!response.ok) {
        setContext(undefined);
        setMessage("Não foi possível acessar esse condomínio de teste.");
        return;
      }

      const body = (await response.json()) as ContextResponse;
      setCondominiumId(body.condominiumId);
      setContext(body);
      await loadConversationHistory(body.condominiumId);
      setMessage(`Contexto de teste ativo: ${body.condominiumId}.`);
      if (showChat) setView("chat");
    } catch {
      setContext(undefined);
      setMessage("Não foi possível conectar ao ambiente de testes agora.");
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
        "x-development-user-id": developmentUserId,
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

  async function createTestCondominium(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cnpj = onlyDigits(registrationForm.cnpj);
    const invalidAdditionalDocument = additionalDocuments.find(
      (file) => !isPdf(file) || file.size > 10 * 1024 * 1024
    );

    if (cnpj.length !== 14) {
      setRegistrationMessage("Informe um CNPJ sintético com 14 dígitos.");
      return;
    }
    if (constitutionMinutes === undefined) {
      setRegistrationMessage("Anexe a ata de assembleia geral de constituição em PDF.");
      return;
    }
    if (!isPdf(constitutionMinutes) || constitutionMinutes.size > 10 * 1024 * 1024) {
      setRegistrationMessage("A ata deve ser um PDF de até 10 MB.");
      return;
    }
    if (invalidAdditionalDocument !== undefined) {
      setRegistrationMessage(
        `O arquivo ${invalidAdditionalDocument.name} deve ser um PDF de até 10 MB.`
      );
      return;
    }
    if (!documentsConfirmed) {
      setRegistrationMessage("Confirme que os documentos sintéticos pertencem a este condomínio.");
      return;
    }

    const id = condominiumSlug(registrationForm.name, cnpj);
    setBusy(true);
    setRegistrationMessage("Criando o condomínio…");
    try {
      const response = await fetch("/v1/development/test-condominiums", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-development-user-id": developmentUserId
        },
        body: JSON.stringify({
          condominiumId: id,
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
      });

      let createdContext: ContextResponse;
      if (response.status === 409) {
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
          await readMessage(response, "Não foi possível criar o condomínio de teste.")
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

      setRegistrationMessage("Condomínio criado. Salvando a ata na memória…");
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
          ? `Cadastro concluído e ata salva. ${failedAdditional} documento(s) adicional(is) não puderam ser salvos.`
          : reviewCount > 0
            ? "Cadastro concluído. Os arquivos foram salvos, mas alguns precisam de revisão antes de entrarem nas respostas."
            : `Cadastro concluído. A ata e ${savedAdditional} documento(s) adicional(is) já fazem parte da memória deste condomínio.`
      );
      setMessage(`Contexto de teste ativo: ${createdContext.condominiumId}.`);
      setView("chat");
    } catch (error: unknown) {
      setRegistrationMessage(
        error instanceof Error ? error.message : "Não foi possível concluir o cadastro agora."
      );
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

  if (view === "login") {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-brand">
            <ZermattMark />
            <span>Zermatt</span>
          </div>
          <p className="overline">CONSELHEIRO DOCUMENTAL</p>
          <h1 id="login-title">Bem-vindo.</h1>
          <p className="login-lead">
            Consulte os documentos do condomínio com respostas fundamentadas e fontes verificáveis.
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
          <button className="primary-button" type="button" onClick={() => setView("onboarding")}>
            Entrar no ambiente de testes <span aria-hidden="true">→</span>
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
          <button type="button" onClick={() => setView("login")}>
            Sair da demonstração
          </button>
        </header>
        <section className="onboarding-card" aria-labelledby="onboarding-title">
          <p className="overline">PASSO 1 DE 1</p>
          <h1 id="onboarding-title">Vamos começar pelo condomínio.</h1>
          <p>
            Escolha um cenário já preparado ou crie um condomínio sintético para testar a jornada.
          </p>
          <div className="sample-list">
            <button type="button" onClick={() => selectCondominium("alameda")} disabled={busy}>
              <span className="building-icon">▥</span>
              <span>
                <strong>Residencial Alameda</strong>
                <small>Documentos de demonstração disponíveis</small>
              </span>
              <b>→</b>
            </button>
            <button type="button" onClick={() => selectCondominium("bosque")} disabled={busy}>
              <span className="building-icon">▥</span>
              <span>
                <strong>Condomínio Bosque</strong>
                <small>Segundo contexto isolado para testes</small>
              </span>
              <b>→</b>
            </button>
          </div>
          <div className="create-test-card">
            <div>
              <strong>Cadastrar outro condomínio</strong>
              <p>
                Informe os dados básicos e adicione a ata de constituição para iniciar a memória.
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

        <form className="registration-form" onSubmit={createTestCondominium}>
          <section className="registration-intro">
            <span className="registration-building" aria-hidden="true">
              ▥
            </span>
            <div>
              <p className="overline">NOVO CONTEXTO</p>
              <h1>Cadastre o condomínio.</h1>
              <p>
                Estes dados organizam o contexto do chat. Use apenas informações e documentos
                sintéticos neste ambiente de testes.
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
                  Confirmo que os PDFs são sintéticos, pertencem a este condomínio e podem ser
                  usados nas respostas do chat.
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
            <p role="status">{registrationMessage}</p>
            <div>
              <button type="button" onClick={() => setView(registrationReturnView)} disabled={busy}>
                Cancelar
              </button>
              <button className="registration-submit" type="submit" disabled={busy}>
                {busy ? "Salvando cadastro…" : "Criar condomínio e abrir chat"}
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
            <small>Escolha o contexto da conversa</small>
          </div>
          <button
            className="mobile-add-button"
            type="button"
            aria-label="Cadastrar novo condomínio"
            onClick={() => openCondominiumRegistration("condominiums")}
          >
            +
          </button>
        </header>
        <section className="mobile-condominiums-content">
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
              <p className="mobile-condominiums-empty">Nenhum condomínio encontrado.</p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

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
          ←
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
        <button type="button" onClick={openCondominiumPicker}>
          Trocar condomínio
        </button>
      </header>
      <section className="chat-main" aria-label="Conversa documental">
        {submittedQuestion !== "" && !isConversationalMessage(submittedQuestion) ? (
          <div className="security-notice">
            ✓ A resposta só pode usar evidências do condomínio selecionado.
          </div>
        ) : null}
        <div className="messages" aria-live="polite">
          {conversationHistory.map((entry) => (
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
          {conversationHistory.length === 0 && submittedQuestion === "" && answer === undefined ? (
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
