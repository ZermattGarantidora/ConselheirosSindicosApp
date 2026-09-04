import { useState } from "react";

type ContextResponse = Readonly<{
  condominiumId: string;
  role: string;
  permissions: readonly string[];
}>;

type AnswerResponse = Readonly<{
  answer: string;
  answerMode: "grounded" | "abstained" | "conflict" | "failed";
  citations: readonly Readonly<{
    documentId: string;
    documentVersionId: string;
    title: string;
    page: number;
    excerpt: string;
  }>[];
  attentionPoints: readonly string[];
  suggestedNextStep: string | null;
  specialist: Readonly<{ required: boolean; type: string | null; reason: string | null }>;
  claims: readonly Readonly<{ statement: string; citationIndexes: readonly number[] }>[];
}>;

type SourceResponse = Readonly<{
  title: string;
  page: number;
  content: string;
}>;

export function App() {
  const [condominiumId, setCondominiumId] = useState("alameda");
  const [context, setContext] = useState<ContextResponse | undefined>();
  const [message, setMessage] = useState("Selecione um condomínio para iniciar.");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const [openCitation, setOpenCitation] = useState<number | undefined>();
  const [source, setSource] = useState<SourceResponse | undefined>();

  async function selectCondominium() {
    const response = await fetch(`/v1/condominiums/${encodeURIComponent(condominiumId)}/context`, {
      headers: { "x-development-user-id": "sindico-demo" }
    });

    if (!response.ok) {
      setContext(undefined);
      setAnswer(undefined);
      setSource(undefined);
      setOpenCitation(undefined);
      setMessage("O acesso a este condomínio não foi autorizado.");
      return;
    }

    const body = (await response.json()) as ContextResponse;
    setContext(body);
    setAnswer(undefined);
    setSource(undefined);
    setOpenCitation(undefined);
    setMessage(`Contexto autorizado para ${body.condominiumId}.`);
  }

  async function openSource(citation: AnswerResponse["citations"][number], index: number) {
    if (context === undefined) return;
    setOpenCitation(index);
    setSource(undefined);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/documents/${encodeURIComponent(citation.documentId)}/versions/${encodeURIComponent(citation.documentVersionId)}/pages/${citation.page}`,
        { headers: { "x-development-user-id": "sindico-demo" } }
      );
      if (response.ok) setSource((await response.json()) as SourceResponse);
    } catch {
      setMessage("Não foi possível abrir a fonte documental com segurança.");
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (context === undefined || question.trim().length === 0 || loading) return;

    setLoading(true);
    setAnswer(undefined);
    setOpenCitation(undefined);
    setSource(undefined);
    try {
      const response = await fetch(
        `/v1/condominiums/${encodeURIComponent(context.condominiumId)}/answers`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-development-user-id": "sindico-demo" },
          body: JSON.stringify({ question })
        }
      );

      if (!response.ok) {
        setMessage("Não foi possível consultar os documentos com segurança.");
        return;
      }

      setAnswer((await response.json()) as AnswerResponse);
      setMessage("Resposta fundamentada no contexto selecionado.");
    } catch {
      setMessage("Não foi possível consultar os documentos com segurança.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Conselheiro para Síndicos</h1>
      <p>Ambiente local com dados sintéticos.</p>
      <label htmlFor="condominium-id">Condomínio</label>
      <input
        id="condominium-id"
        value={condominiumId}
        onChange={(event) => setCondominiumId(event.target.value)}
      />
      <button type="button" onClick={selectCondominium}>
        Selecionar contexto
      </button>
      <p role="status">{message}</p>
      {context === undefined ? null : (
        <>
          <p>Perfil: {context.role}</p>
          <form onSubmit={askQuestion}>
            <label htmlFor="question">Pergunte sobre os documentos deste condomínio</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: A locação por temporada é permitida?"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Consultando…" : "Perguntar"}
            </button>
          </form>
          {answer === undefined ? null : (
            <section aria-label="Resposta documental">
              <h2>Resposta direta</h2>
              <p>{answer.answer}</p>
              <h3>Base documental</h3>
              {answer.citations.length === 0 ? <p>Nenhuma citação disponível.</p> : null}
              <ul>
                {answer.citations.map((citation, index) => (
                  <li key={`${citation.documentVersionId}-${citation.page}-${index}`}>
                    <button type="button" onClick={() => openSource(citation, index)}>
                      {citation.title} · página {citation.page}
                    </button>
                    {openCitation === index ? (
                      <blockquote>{source?.content ?? citation.excerpt}</blockquote>
                    ) : null}
                  </li>
                ))}
              </ul>
              <h3>Pontos de atenção</h3>
              {answer.attentionPoints.length === 0 ? <p>Nenhum ponto adicional.</p> : null}
              <ul>
                {answer.attentionPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <h3>Próximo passo sugerido</h3>
              <p>{answer.suggestedNextStep ?? "Nenhum próximo passo adicional."}</p>
              {answer.specialist.required ? (
                <p>
                  Consulte {answer.specialist.type}: {answer.specialist.reason}
                </p>
              ) : null}
            </section>
          )}
        </>
      )}
    </main>
  );
}
