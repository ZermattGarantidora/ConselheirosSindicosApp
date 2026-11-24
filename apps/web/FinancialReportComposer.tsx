import { useEffect, useRef, useState } from "react";
import type { DocumentDraft } from "../shared/document-draft.js";
type Request = { documentVersionIds: string[]; currentDocumentKey: string };
type Result = {
  nextCursor?: string | null;
  enabled?: boolean;
  message?: string;
  documents?: { documentVersionId: string; title: string }[];
  candidates?: { key: string; title: string; page: number }[];
  reports?: { id: string; request: Request; status: string }[];
  draft?: DocumentDraft;
};
export function FinancialReportComposer({
  condominiumId,
  chatId,
  headers,
  onDraft
}: Readonly<{
  condominiumId: string;
  chatId: string;
  headers: Readonly<Record<string, string>>;
  onDraft: (draft: DocumentDraft) => void;
}>) {
  const base = `/v1/condominiums/${encodeURIComponent(condominiumId)}/chats/${encodeURIComponent(chatId)}/financial-reports`;
  const [available, setAvailable] = useState<Result>(),
    [versions, setVersions] = useState<string[]>([]),
    [candidates, setCandidates] = useState<NonNullable<Result["candidates"]>>([]),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const life = useRef({ active: true, controller: new AbortController() }),
    pending = useRef<{ id: string; signature: string } | undefined>(undefined);
  async function json(
    path: string,
    body?: Request,
    signal = life.current.controller.signal
  ): Promise<Result> {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: { ...headers, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const value = (await response.json()) as Result;
    if (!response.ok)
      throw new Error(value.message ?? "Não foi possível recuperar o relatório financeiro.");
    return value;
  }
  useEffect(() => {
    const state = { active: true, controller: new AbortController() };
    life.current = state;
    void json(base)
      .then((r) => {
        if (state.active) setAvailable(r);
      })
      .catch((e) => {
        if (state.active) setError(e instanceof Error ? e.message : "Relatórios indisponíveis.");
      });
    return () => {
      state.active = false;
      state.controller.abort();
    };
  }, [base]);
  const selection = versions.join(",");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setCandidates([]);
    setKey("");
    if (!selection) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    setError("");
    void json(`${base}?versions=${encodeURIComponent(selection)}`, undefined, controller.signal)
      .then((r) => {
        if (active) {
          setCandidates(r.candidates ?? []);
          if (r.candidates?.length === 1) setKey(r.candidates[0]!.key);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Não foi possível ler o caderno.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [base, selection]);
  async function run(work: () => Promise<Result>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await work();
      if (life.current.active) {
        if (r.draft) onDraft(r.draft);
        const recent = await json(base);
        if (life.current.active) setAvailable(recent);
      }
    } catch (e) {
      if (life.current.active)
        setError(e instanceof Error ? e.message : "Não foi possível concluir o pedido.");
    } finally {
      if (life.current.active) setBusy(false);
    }
  }
  async function prepare(request: Request) {
    const signature = JSON.stringify(request);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() };
    return json(`${base}/${pending.current.id}`, request);
  }
  async function older() {
    if (busy || !available?.nextCursor) return;
    setBusy(true);
    setError("");
    try {
      const r = await json(`${base}?cursor=${encodeURIComponent(available.nextCursor)}`);
      if (life.current.active)
        setAvailable((previous) => ({
          ...r,
          reports: [...(previous?.reports ?? []), ...(r.reports ?? [])].filter(
            (v, i, a) => a.findIndex((x) => x.id === v.id) === i
          )
        }));
    } catch (e) {
      if (life.current.active) setError(e instanceof Error ? e.message : "Pedidos indisponíveis.");
    } finally {
      if (life.current.active) setBusy(false);
    }
  }
  return (
    <section className="document-authoring" aria-label="Relatório financeiro do caderno">
      <h3>Relatório financeiro do caderno</h3>
      <p>
        Selecione o material e o balancete de referência. Confira os achados no rascunho antes de
        confirmar o PDF.
      </p>
      {available?.enabled === false ? (
        <p role="status">
          A preparação financeira está desabilitada neste ambiente. Relatórios já salvos continuam
          disponíveis conforme suas permissões.
        </p>
      ) : null}
      <fieldset disabled={busy || available?.enabled !== true}>
        <legend>Material para conferência</legend>
        {available?.documents?.map((d) => (
          <label className="draft-review-confirmation" key={d.documentVersionId}>
            <input
              type="checkbox"
              checked={versions.includes(d.documentVersionId)}
              onChange={(e) =>
                setVersions(
                  e.target.checked
                    ? [...versions, d.documentVersionId]
                    : versions.filter((v) => v !== d.documentVersionId)
                )
              }
            />
            {d.title}
          </label>
        ))}
        {!available?.documents?.length ? (
          <p>Nenhum documento completo e confirmado disponível.</p>
        ) : null}
        <label>
          Balancete de referência
          <select
            aria-label="Balancete de referência"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={loading || busy}
          >
            <option value="">Escolha o balancete</option>
            {candidates.map((c) => (
              <option key={c.key} value={c.key}>
                {c.title} · página {c.page}
              </option>
            ))}
          </select>
        </label>
        {loading ? <p role="status">Lendo a identificação dos documentos…</p> : null}
        {selection && !loading && !candidates.length ? (
          <p>Nenhum balancete com identificação explícita foi encontrado nesse material.</p>
        ) : null}
        <button
          type="button"
          disabled={busy || loading || !key || !versions.length}
          onClick={() =>
            void run(() => prepare({ documentVersionIds: versions, currentDocumentKey: key }))
          }
        >
          Preparar relatório financeiro
        </button>
      </fieldset>
      {busy ? <p role="status">Preparando ou recuperando o relatório financeiro…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {available?.reports?.length ? (
        <div aria-label="Pedidos financeiros salvos">
          <h4>Pedidos financeiros salvos</h4>
          {available.reports.map((r, i) => (
            <div key={r.id}>
              {r.status === "needs_reconciliation" ? (
                <p>Pedido {i + 1} aguarda reconciliação de uma etapa já enviada.</p>
              ) : (
                <button
                  type="button"
                  disabled={
                    busy ||
                    (!["ready", "resumable_without_model"].includes(r.status) &&
                      available.enabled !== true)
                  }
                  onClick={() =>
                    void run(() =>
                      r.status === "ready"
                        ? json(`${base}/${r.id}`)
                        : json(`${base}/${r.id}`, r.request)
                    )
                  }
                >
                  {["ready", "resumable_without_model"].includes(r.status)
                    ? "Recuperar relatório financeiro"
                    : "Retomar pedido financeiro"}{" "}
                  {i + 1}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {available?.nextCursor ? (
        <button type="button" disabled={busy} onClick={() => void older()}>
          Carregar pedidos financeiros anteriores
        </button>
      ) : null}
    </section>
  );
}
