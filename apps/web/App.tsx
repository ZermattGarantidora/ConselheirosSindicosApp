import { useState } from "react";

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
  specialist: Readonly<{
    required: boolean;
    type: string | null;
    reason: string | null;
  }>;
  answerId: string;
  questionId: string;
  condominiumId: string;
  riskClass: "low" | "medium" | "high";
  createdAt: string;
}>;

type FeedbackClassification = "correct" | "incorrect" | "incomplete" | "outdated";

const developmentUserId = "sindico-demo";

function modeLabel(mode: PublicAnswer["answerMode"]): string {
  return {
    grounded: "Com base nos documentos",
    abstained: "Sem base suficiente",
    conflict: "Conflito entre documentos",
    failed: "Consulta interrompida"
  }[mode];
}

function modeClass(mode: PublicAnswer["answerMode"]): string {
  return `answer-mode answer-mode-${mode}`;
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as Readonly<{ message?: unknown }>;
    return typeof body.message === "string" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [condominiumId, setCondominiumId] = useState("alameda");
  const [context, setContext] = useState<ContextResponse | undefined>();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<PublicAnswer | undefined>();
  const [selectedCitation, setSelectedCitation] = useState<Citation | undefined>();
  const [feedback, setFeedback] = useState<FeedbackClassification | undefined>();
  const [message, setMessage] = useState("Selecione um condomínio para iniciar.");
  const [busy, setBusy] = useState(false);

  async function selectCondominium() {
    setBusy(true);
    setAnswer(undefined);
    setSelectedCitation(undefined);
    setFeedback(undefined);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(condominiumId)}/context`,
        {
          headers: { "x-development-user-id": developmentUserId }
        }
      );

      if (!response.ok) {
        setContext(undefined);
        setMessage("O acesso a este condomínio não foi autorizado.");
        return;
      }

      const body = (await response.json()) as ContextResponse;
      setContext(body);
      setMessage(`Contexto autorizado para ${body.condominiumId}.`);
    } catch {
      setContext(undefined);
      setMessage("Não foi possível verificar o condomínio agora.");
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion() {
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0 || context === undefined) {
      setMessage(
        context === undefined
          ? "Selecione um condomínio autorizado antes de perguntar."
          : "Escreva uma pergunta para continuar."
      );
      return;
    }

    setBusy(true);
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
      const body = (await response.json()) as PublicAnswer;
      setAnswer(body);
      setMessage("Consulta concluída. Confira a resposta e as fontes abaixo.");
    } catch {
      setMessage("Não foi possível conectar ao conselheiro agora.");
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(classification: FeedbackClassification) {
    if (answer === undefined) {
      return;
    }
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
      setMessage("Feedback registrado sem alterar a resposta original.");
    } catch {
      setMessage("Não foi possível registrar o feedback agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">CONSELHEIRO DOCUMENTAL</p>
          <h1>Decida com a fonte por perto.</h1>
          <p className="subtitle">
            Consulte os documentos autorizados do condomínio e veja quando a base não é suficiente.
          </p>
        </div>
        <span className="synthetic-badge">Ambiente sintético</span>
      </header>

      <section className="context-card" aria-labelledby="context-title">
        <div>
          <p className="eyebrow">CONTEXTO ATIVO</p>
          <h2 id="context-title">Escolha o condomínio</h2>
        </div>
        <div className="context-controls">
          <label htmlFor="condominium-id">Identificador</label>
          <div className="control-row">
            <input
              id="condominium-id"
              value={condominiumId}
              onChange={(event) => setCondominiumId(event.target.value)}
              autoComplete="off"
            />
            <button type="button" onClick={selectCondominium} disabled={busy}>
              {busy && context === undefined ? "Verificando…" : "Selecionar"}
            </button>
          </div>
          <p className="context-status" role="status">
            {message}
          </p>
          {context === undefined ? null : (
            <p className="context-meta">
              Perfil: <strong>{context.role}</strong> · permissões documentais ativas
            </p>
          )}
        </div>
      </section>

      <section className="workspace" aria-label="Consulta documental">
        <div className="question-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NOVA CONSULTA</p>
              <h2>O que você precisa conferir?</h2>
            </div>
            <span className="lock-mark" aria-label="Consulta isolada por condomínio">
              ⌁
            </span>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ex.: Quando termina o contrato de manutenção dos elevadores?"
            aria-label="Escreva uma pergunta"
            rows={5}
            maxLength={4_000}
          />
          <div className="composer-footer">
            <span>A resposta só pode usar evidências do condomínio ativo.</span>
            <button type="button" onClick={askQuestion} disabled={busy || context === undefined}>
              {busy && context !== undefined ? "Consultando…" : "Consultar documentos"}
            </button>
          </div>
        </div>

        <div className="answer-panel" aria-live="polite">
          {answer === undefined ? (
            <div className="empty-answer">
              <span className="empty-icon">✦</span>
              <h2>A resposta aparece aqui</h2>
              <p>
                Primeiro selecione o condomínio. Depois, faça uma pergunta em linguagem natural e
                abra a fonte de cada trecho recuperado.
              </p>
            </div>
          ) : (
            <article>
              <div className="answer-heading">
                <div>
                  <p className="eyebrow">RESPOSTA</p>
                  <h2>{modeLabel(answer.answerMode)}</h2>
                </div>
                <span className={modeClass(answer.answerMode)}>{answer.riskClass}</span>
              </div>
              <p className="answer-copy">{answer.answer}</p>

              {answer.attentionPoints.length === 0 ? null : (
                <div className="attention-box">
                  <strong>Preste atenção</strong>
                  <ul>
                    {answer.attentionPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {answer.suggestedNextStep === null ? null : (
                <div className="next-step">
                  <span>PRÓXIMO PASSO</span>
                  <p>{answer.suggestedNextStep}</p>
                </div>
              )}

              {answer.specialist.required ? (
                <div className="specialist-box">
                  <strong>Valide com {answer.specialist.type ?? "um especialista"}</strong>
                  <p>{answer.specialist.reason}</p>
                </div>
              ) : null}

              <div className="sources-section">
                <div className="section-label">
                  <span>FONTES DA RESPOSTA</span>
                  <small>{answer.citations.length} trecho(s) verificável(is)</small>
                </div>
                {answer.citations.length === 0 ? (
                  <p className="no-sources">
                    Nenhuma fonte foi exibida porque não há base suficiente.
                  </p>
                ) : (
                  <div className="citation-list">
                    {answer.citations.map((citation) => (
                      <button
                        type="button"
                        className="citation-button"
                        key={citation.id}
                        onClick={() => setSelectedCitation(citation)}
                      >
                        <span>
                          {citation.title} · página {citation.page}
                        </span>
                        <strong>Abrir trecho →</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCitation === undefined ? null : (
                <section className="source-viewer" aria-label="Fonte aberta">
                  <div className="source-viewer-heading">
                    <div>
                      <p className="eyebrow">FONTE ABERTA</p>
                      <h3>{selectedCitation.title}</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedCitation(undefined)}>
                      Fechar
                    </button>
                  </div>
                  <p className="source-meta">
                    Versão {selectedCitation.documentVersionId} · página {selectedCitation.page}
                  </p>
                  <blockquote>{selectedCitation.excerpt}</blockquote>
                </section>
              )}

              <div className="feedback-section">
                <span>Esta resposta ajudou?</span>
                <div className="feedback-actions">
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
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
