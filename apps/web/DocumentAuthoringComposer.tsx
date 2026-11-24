import { useEffect, useRef, useState } from "react";
import type { DocumentDraft } from "../shared/document-draft.js";
import type { DocumentAuthoringRequest, DocumentProposal } from "../shared/document-proposal.js";

type Result = {
  message?: string;
  enabled?: boolean;
  documents?: { documentVersionId: string; title: string }[];
  proposals?: DocumentProposal[];
  proposal?: DocumentProposal;
  draft?: DocumentDraft;
  nextCursor?: string | null;
};
const provenance = {
  document_fact: "Base documental",
  user_report: "Relato declarado pelo usuário",
  draft_wording: "Redação proposta, sujeita à revisão"
};
export function DocumentAuthoringComposer({
  condominiumId,
  chatId,
  headers,
  onDraft,
  originalsOnly = false,
  refreshKey = 0
}: Readonly<{
  condominiumId: string;
  chatId: string;
  headers: Readonly<Record<string, string>>;
  onDraft: (draft: DocumentDraft) => void;
  originalsOnly?: boolean;
  refreshKey?: number;
}>) {
  const base = `/v1/condominiums/${encodeURIComponent(condominiumId)}/chats/${encodeURIComponent(chatId)}/document-proposals`;
  const [available, setAvailable] = useState<Result>();
  const [proposal, setProposal] = useState<DocumentProposal>();
  const [recent, setRecent] = useState<DocumentProposal[]>([]);
  const [cursor, setCursor] = useState<string | null>();
  const [request, setRequest] = useState<DocumentAuthoringRequest>({
    title: "",
    documentKind: "Comunicado",
    operation: "create",
    request: "",
    report: "",
    documentVersionIds: []
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lifecycle = useRef<{ active: boolean; controller: AbortController }>({
    active: true,
    controller: new AbortController()
  });
  const pending = useRef<{ signature: string; id: string } | undefined>(undefined);
  async function json(path: string, body?: unknown): Promise<Result> {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: lifecycle.current.controller.signal,
      headers: { ...headers, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const result = (await response.json()) as Result;
    if (!response.ok)
      throw new Error(result.message ?? "Proposta indisponível. Retome o mesmo pedido.");
    return result;
  }
  useEffect(() => {
    const state = { active: true, controller: new AbortController() };
    lifecycle.current = state;
    void json(base)
      .then((result) => {
        if (state.active) {
          setError("");
          setAvailable(result);
          const proposals = (result.proposals ?? []).filter(
            (p) => !originalsOnly || p.trigger === "original_analysis"
          );
          setRecent(proposals);
          if (originalsOnly) setProposal(proposals.find((p) => p.status === "offered"));
          setCursor(result.nextCursor);
        }
      })
      .catch((e: unknown) => {
        if (state.active) {
          if (originalsOnly) setProposal(undefined);
          setError(e instanceof Error ? e.message : "Propostas indisponíveis.");
        }
      });
    return () => {
      state.active = false;
      state.controller.abort();
    };
    // O componente é recriado ao mudar de conversa; abrir só consulta, nunca redige.
  }, [base, originalsOnly, refreshKey]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      if (lifecycle.current.active)
        setError(e instanceof Error ? e.message : "Não foi possível concluir o pedido.");
    } finally {
      if (lifecycle.current.active) setBusy(false);
    }
  }
  async function prepare() {
    const signature = JSON.stringify(request);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() };
    const result = await json(`${base}/${pending.current.id}`, request);
    if (lifecycle.current.active && result.proposal) {
      setProposal(result.proposal);
      setRecent((previous) => [
        result.proposal!,
        ...previous.filter((p) => p.id !== result.proposal!.id)
      ]);
    }
  }
  async function decide(accept: boolean) {
    if (!proposal) return;
    const result = await json(`${base}/${proposal.id}/decide`, { hash: proposal.hash, accept });
    if (!lifecycle.current.active) return;
    if (result.proposal) {
      setProposal(result.proposal);
      setRecent((previous) =>
        previous.map((p) => (p.id === result.proposal!.id ? result.proposal! : p))
      );
    }
    if (result.draft) onDraft(result.draft);
  }
  if (originalsOnly && !proposal && !error) return null;
  return (
    <section
      className="document-authoring"
      aria-label={
        originalsOnly ? "Melhoria do original na conversa" : "Propor documento com fontes"
      }
    >
      {originalsOnly ? (
        <h3>Melhoria sugerida para o original</h3>
      ) : (
        <>
          <h3>Propor documento com fontes</h3>
          <p>
            Peça uma criação ou revisão e confira cada mudança antes de abrir um rascunho. O
            original permanece preservado.
          </p>
          {available?.enabled === false ? (
            <p role="status">
              A redação documental está desabilitada neste ambiente. Você pode recuperar propostas
              anteriores ou preparar um rascunho manual.
            </p>
          ) : null}
          <fieldset disabled={busy || available?.enabled !== true}>
            <label>
              Título da proposta
              <input
                maxLength={200}
                value={request.title}
                onChange={(e) => setRequest({ ...request, title: e.target.value })}
              />
            </label>
            <label>
              Tipo da proposta
              <input
                maxLength={80}
                value={request.documentKind}
                onChange={(e) => setRequest({ ...request, documentKind: e.target.value })}
              />
            </label>
            <label>
              Operação proposta
              <select
                value={request.operation}
                onChange={(e) =>
                  setRequest({
                    ...request,
                    operation: e.target.value as DocumentAuthoringRequest["operation"]
                  })
                }
              >
                <option value="create">Criar</option>
                <option value="revise">Revisar</option>
                <option value="improve">Melhorar</option>
              </select>
            </label>
            <label>
              O que deseja preparar?
              <textarea
                maxLength={2000}
                value={request.request}
                onChange={(e) => setRequest({ ...request, request: e.target.value })}
              />
            </label>
            <fieldset>
              <legend>Versões documentais para fundamentar a proposta</legend>
              {available?.documents?.length ? (
                available.documents.map((d) => (
                  <label className="draft-review-confirmation" key={d.documentVersionId}>
                    <input
                      type="checkbox"
                      checked={request.documentVersionIds.includes(d.documentVersionId)}
                      onChange={(e) =>
                        setRequest({
                          ...request,
                          documentVersionIds: e.target.checked
                            ? [...request.documentVersionIds, d.documentVersionId]
                            : request.documentVersionIds.filter((id) => id !== d.documentVersionId)
                        })
                      }
                    />
                    {d.title} · versão {d.documentVersionId}
                  </label>
                ))
              ) : (
                <p>
                  Nenhuma versão confirmada disponível. Relatos serão identificados como informação
                  declarada.
                </p>
              )}
            </fieldset>
            <label>
              Relato ou informações declaradas (opcional)
              <textarea
                maxLength={4000}
                value={request.report}
                onChange={(e) => setRequest({ ...request, report: e.target.value })}
              />
            </label>
            <p>
              O relato será identificado separadamente das fontes documentais. Não comprova fatos,
              aprovação ou vigência.
            </p>
            <button
              type="button"
              disabled={!request.title.trim() || !request.request.trim()}
              onClick={() => void run(prepare)}
            >
              Preparar proposta fundamentada
            </button>
          </fieldset>
        </>
      )}
      {busy ? <p role="status">Conferindo o pedido e suas fontes…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!originalsOnly && recent.length ? (
        <details>
          <summary>Propostas desta conversa</summary>
          {recent.map((p) => (
            <button
              type="button"
              key={p.id}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await json(`${base}/${p.id}`);
                  if (lifecycle.current.active) setProposal(result.proposal);
                })
              }
            >
              {p.plan.title} ·{" "}
              {p.status === "accepted"
                ? "aceita"
                : p.status === "declined"
                  ? "recusada"
                  : p.status === "unchanged"
                    ? "sem melhoria necessária"
                    : p.status === "needs_context"
                      ? "precisa de contexto"
                      : "aguarda decisão"}
            </button>
          ))}
        </details>
      ) : null}
      {!originalsOnly && cursor ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await json(`${base}?before=${encodeURIComponent(cursor)}`);
              if (lifecycle.current.active) {
                setRecent((previous) => [
                  ...new Map(
                    [...previous, ...(result.proposals ?? [])].map((p) => [p.id, p])
                  ).values()
                ]);
                setCursor(result.nextCursor);
              }
            })
          }
        >
          Carregar propostas anteriores
        </button>
      ) : null}
      {proposal ? (
        <article className="document-proposal" aria-label="Proposta documental para conferência">
          <h4>{proposal.plan.title}</h4>
          <p>{proposal.plan.message}</p>
          {proposal.plan.paragraphs.map((p) => (
            <div key={p.id}>
              <strong>{provenance[p.provenance]}</strong>
              <p className="document-proposal-text">{p.text}</p>
            </div>
          ))}
          <h4>Alterações e fundamentos</h4>
          {proposal.plan.changes.map((c) => (
            <div className="document-proposal-change" key={c.id}>
              <p>
                <strong>Antes:</strong>{" "}
                <span className="document-proposal-text">{c.before?.quote ?? "Texto novo"}</span>
              </p>
              <p>
                <strong>Depois:</strong> <span className="document-proposal-text">{c.after}</span>
              </p>
              <p>
                <strong>Justificativa:</strong> {c.reason}
              </p>
              {[
                ...new Map(
                  [
                    ...(c.before ? [c.before] : []),
                    ...c.references,
                    ...(proposal.plan.paragraphs.find((p) => p.id === c.paragraphId)?.references ??
                      [])
                  ].map((r) => [JSON.stringify(r), r])
                ).values()
              ].map((r, i) => {
                const source = proposal.sources.find((s) => s.id === r.sourceId);
                return (
                  <blockquote key={i}>
                    {r.quote}
                    <footer>
                      {source?.kind === "user_report"
                        ? "Relato declarado pelo usuário"
                        : `${source?.title} · versão ${source?.documentVersionId} · página/bloco ${source?.page}`}{" "}
                      · caracteres {r.startOffset}–{r.endOffset}
                    </footer>
                  </blockquote>
                );
              })}
            </div>
          ))}
          {proposal.plan.pending.length ? (
            <>
              <h4>Pendências</h4>
              <ul>
                {proposal.plan.pending.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          ) : null}
          {proposal.plan.requiresSpecialist ? (
            <p>Confira esta proposta com assessoria especializada antes de usar.</p>
          ) : null}
          <details>
            <summary>Conferir cobertura e fontes completas</summary>
            {proposal.plan.coverage.map((c) => {
              const source = proposal.sources.find((s) => s.id === c.sourceId);
              return (
                <div key={c.sourceId}>
                  <h4>{source?.title}</h4>
                  <p>
                    {c.disposition === "represented"
                      ? "Representada na proposta"
                      : c.disposition === "pending"
                        ? "Pendente de contexto"
                        : "Sem conteúdo material para o pedido"}
                    : {c.reason}
                  </p>
                  <p className="document-proposal-text">{source?.text}</p>
                </div>
              );
            })}
          </details>
          <p>
            Aceitar abre um novo rascunho. Confira o texto e confirme a revisão separadamente antes
            de gerar o PDF.
          </p>
          {proposal.status === "unchanged" ? (
            <p role="status">Nenhuma melhoria necessária; nenhum rascunho foi criado.</p>
          ) : proposal.status === "needs_context" ? (
            <p role="status">
              Complemente o contexto e faça um novo pedido; nenhum rascunho foi criado.
            </p>
          ) : proposal.status === "declined" ? (
            <p role="status">Proposta recusada.</p>
          ) : (
            <div className="draft-actions">
              <button type="button" disabled={busy} onClick={() => void run(() => decide(true))}>
                {proposal.status === "accepted"
                  ? "Reabrir rascunho aceito"
                  : "Aceitar e conferir rascunho"}
              </button>
              {proposal.status === "offered" ? (
                <button type="button" disabled={busy} onClick={() => void run(() => decide(false))}>
                  Recusar proposta
                </button>
              ) : null}
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
