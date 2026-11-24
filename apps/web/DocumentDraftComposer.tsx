import { useEffect, useRef, useState } from "react";
import type { AnswerPayload } from "../api/answers/answer-contract.js";
import type { DocumentImprovement } from "../shared/document-improvement.js";
import { DocumentAuthoringComposer } from "./DocumentAuthoringComposer.js";
import { FinancialReportComposer } from "./FinancialReportComposer.js";
import {
  maximumDraftTextCharacters,
  type DocumentDraft,
  type DocumentDraftContent
} from "../shared/document-draft.js";

const emptyContent = (): DocumentDraftContent => ({
  title: "",
  documentKind: "Documento",
  operation: "create",
  text: "",
  sources: [],
  changes: "",
  pending: ""
});
export function DocumentDraftComposer({
  condominiumId,
  chatId,
  headers,
  selection,
  draftSelection
}: Readonly<{
  condominiumId: string;
  chatId: string;
  headers: Readonly<Record<string, string>>;
  selection?: Pick<AnswerPayload, "answer" | "citations">;
  draftSelection?: DocumentDraft;
}>) {
  const base = `/v1/condominiums/${encodeURIComponent(condominiumId)}/chats/${encodeURIComponent(chatId)}/document-drafts`;
  const [open, setOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [draft, setDraft] = useState<DocumentDraft>();
  const [content, setContent] = useState<DocumentDraftContent>(emptyContent);
  const [drafts, setDrafts] = useState<readonly DocumentDraft[]>([]);
  const [cursor, setCursor] = useState<string | null>();
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [durable, setDurable] = useState<boolean>();
  const [offer, setOffer] = useState<DocumentImprovement | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const dirty =
    !draft ||
    ["title", "documentKind", "operation", "text", "changes", "pending"].some(
      (field) =>
        content[field as keyof DocumentDraftContent] !== draft[field as keyof DocumentDraftContent]
    );
  useEffect(() => {
    if (!selection) return;
    setOpen(true);
    setDraft(undefined);
    setDraftId(crypto.randomUUID());
    setReviewed(false);
    setError("");
    setContent({
      ...emptyContent(),
      text: selection.answer,
      sources: selection.citations
        .filter((c) => c.sourceScope !== "legislation")
        .slice(0, 20)
        .map((c) => ({
          documentId: c.documentId,
          documentVersionId: c.documentVersionId,
          page: c.page,
          excerpt: c.excerpt
        })),
      pending: selection.citations.some((c) => c.sourceScope === "legislation")
        ? "Conferir as referências legais mencionadas na conversa antes de usar este documento."
        : ""
    });
  }, [selection]);
  async function jsonRequest(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...headers, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const result = (await response.json()) as {
      message?: string;
      draft?: DocumentDraft;
      drafts?: DocumentDraft[];
      nextCursor?: string | null;
      durable?: boolean;
      offer?: DocumentImprovement | null;
    };
    if (!response.ok) throw new Error(result.message ?? "Não foi possível recuperar o documento.");
    return result;
  }
  async function load(before?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest(
        `${base}${before ? `?before=${encodeURIComponent(before)}` : ""}`
      );
      setDrafts((previous) => [
        ...new Map(
          [...(before ? previous : []), ...(result.drafts ?? [])].map((d) => [d.id, d])
        ).values()
      ]);
      setCursor(result.nextCursor);
      setDurable(result.durable);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os rascunhos.");
    } finally {
      setBusy(false);
    }
  }
  function adopt(value: DocumentDraft) {
    setOffer(null);
    setDraft(value);
    setDraftId(value.id);
    setContent({
      title: value.title,
      documentKind: value.documentKind,
      operation: value.operation,
      text: value.text,
      sources: value.sources,
      changes: value.changes,
      pending: value.pending,
      ...(value.authoringSource ? { authoringSource: value.authoringSource } : {}),
      ...(value.audioSource ? { audioSource: value.audioSource } : {})
    });
    setReviewed(false);
  }
  useEffect(() => {
    if (draftSelection) {
      setOpen(true);
      adopt(draftSelection);
      setError("");
    }
  }, [draftSelection]);
  useEffect(() => {
    setOffer(null);
    if (!draft || dirty || draft.status !== "awaiting_confirmation") return;
    let current = true;
    void jsonRequest(`${base}/${draft.id}/improvement`, { expectedEvent: draft.event })
      .then((result) => {
        if (current) setOffer(result.offer ?? null);
      })
      .catch((error: unknown) => {
        if (current) setError(error instanceof Error ? error.message : "Melhoria indisponível.");
      });
    return () => {
      current = false;
    };
    // A avaliação pertence à revisão, nunca a uma edição local ainda não salva.
  }, [base, draft?.id, draft?.event, dirty]);
  async function decideImprovement(accept: boolean) {
    if (!offer) return;
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest(`${base}/${offer.draftId}/improvement`, {
        expectedEvent: offer.baseEvent,
        hash: offer.baseHash,
        accept
      });
      if (!active.current) return;
      adopt(result.draft!);
      setDurable(result.durable);
      if (!accept) setOffer({ ...offer, status: "declined" });
    } catch (error) {
      if (active.current)
        setError(error instanceof Error ? error.message : "Não foi possível decidir a melhoria.");
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function write(decision?: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest(
        `${base}/${draftId}${decision === undefined ? "" : "/decide"}`,
        decision === undefined
          ? { expectedEvent: draft?.event ?? 0, content }
          : { expectedEvent: draft!.event, hash: draft!.hash, confirm: decision, reviewed }
      );
      adopt(result.draft!);
      setDurable(result.durable);
      setDrafts((previous) => [result.draft!, ...previous.filter((d) => d.id !== draftId)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o rascunho.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${base}/${draft.id}/pdf?hash=${draft.hash}`, {
        headers,
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message ?? "PDF indisponível.");
      }
      const blob = await response.blob();
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `alvitra-rascunho-${draft.id}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível baixar o PDF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="document-draft-composer" aria-label="Revisar documento e gerar PDF">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
      >
        Documentos em preparação
      </button>
      {!open ? null : (
        <div>
          <p className="interface-status">
            Revisão do documento · saída em PDF · original preservado
          </p>
          {durable === false ? (
            <p className="interface-status">
              Ambiente em memória: os rascunhos podem desaparecer ao reiniciar a API.
            </p>
          ) : null}
          <button
            type="button"
            aria-expanded={financialOpen}
            onClick={() => setFinancialOpen((v) => !v)}
          >
            Relatório financeiro
          </button>
          {financialOpen ? (
            <FinancialReportComposer
              condominiumId={condominiumId}
              chatId={chatId}
              headers={headers}
              onDraft={(value) => {
                adopt(value);
                setDrafts((previous) => [value, ...previous.filter((d) => d.id !== value.id)]);
              }}
            />
          ) : null}
          <DocumentAuthoringComposer
            key={`${condominiumId}:${chatId}`}
            condominiumId={condominiumId}
            chatId={chatId}
            headers={headers}
            onDraft={(value) => {
              adopt(value);
              setDrafts((previous) => [value, ...previous.filter((d) => d.id !== value.id)]);
            }}
          />
          <div className="draft-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(undefined);
                setDraftId(crypto.randomUUID());
                setContent(emptyContent());
                setReviewed(false);
              }}
            >
              Novo rascunho
            </button>
            <button type="button" disabled={busy} onClick={() => void load()}>
              Atualizar rascunhos
            </button>
          </div>
          {drafts.map((item) => (
            <button type="button" key={item.id} disabled={busy} onClick={() => adopt(item)}>
              {item.title} · revisão {item.revision} ·{" "}
              {item.status === "confirmed"
                ? "confirmada"
                : item.status === "declined"
                  ? "recusada"
                  : "aguarda confirmação"}
            </button>
          ))}
          {!cursor ? null : (
            <button type="button" disabled={busy} onClick={() => void load(cursor)}>
              Carregar anteriores
            </button>
          )}
          <fieldset disabled={busy}>
            <label>
              Título
              <input
                maxLength={200}
                value={content.title}
                onChange={(e) => {
                  setContent({ ...content, title: e.target.value });
                  setReviewed(false);
                }}
              />
            </label>
            <label>
              Tipo do documento
              <input
                maxLength={80}
                value={content.documentKind}
                onChange={(e) => {
                  setContent({ ...content, documentKind: e.target.value });
                  setReviewed(false);
                }}
              />
            </label>
            <label>
              Pedido
              <select
                value={content.operation}
                onChange={(e) =>
                  setContent({
                    ...content,
                    operation: e.target.value as DocumentDraftContent["operation"]
                  })
                }
              >
                <option value="create">Criar documento</option>
                <option value="revise">Alterar documento</option>
                <option value="improve">Melhoria oferecida</option>
              </select>
            </label>
            <label>
              Texto do documento
              <textarea
                rows={14}
                maxLength={maximumDraftTextCharacters}
                value={content.text}
                onChange={(e) => {
                  setContent({ ...content, text: e.target.value });
                  setReviewed(false);
                }}
              />
            </label>
            <label>
              Alterações propostas
              <textarea
                rows={2}
                maxLength={2_000}
                value={content.changes}
                onChange={(e) => setContent({ ...content, changes: e.target.value })}
              />
            </label>
            <label>
              Pendências e pontos para revisão humana
              <textarea
                rows={2}
                maxLength={2_000}
                value={content.pending}
                onChange={(e) => setContent({ ...content, pending: e.target.value })}
              />
            </label>
          </fieldset>
          {!offer || offer.status !== "offered" || dirty ? null : (
            <div aria-label="Melhoria proposta">
              <article className="assistant-message">
                <p>{offer.message}</p>
              </article>
              <p className="interface-status">Alterações propostas: {offer.changes}</p>
              <details>
                <summary>Conferir o texto proposto</summary>
                <pre className="draft-preview">{offer.text}</pre>
              </details>
              <button type="button" disabled={busy} onClick={() => void decideImprovement(true)}>
                Aplicar ao rascunho para revisar
              </button>
              <button type="button" disabled={busy} onClick={() => void decideImprovement(false)}>
                Manter texto atual
              </button>
            </div>
          )}
          <p className="interface-status">
            Mantenha no texto apenas o que deve constar no PDF. Confira dados, decisões e
            pendências. Convenções, contratos e alterações jurídicas ou financeiras precisam de
            revisão especializada.
          </p>
          <div className="draft-actions">
            <button type="button" disabled={busy || !dirty} onClick={() => void write()}>
              Salvar texto para revisão
            </button>
            {draft?.status !== "awaiting_confirmation" || dirty ? null : (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  Revisei esta versão e suas pendências.
                </label>
                <button type="button" disabled={busy || !reviewed} onClick={() => void write(true)}>
                  Confirmar esta versão para PDF
                </button>
                <button type="button" disabled={busy} onClick={() => void write(false)}>
                  Recusar proposta
                </button>
              </>
            )}
            {draft?.status !== "confirmed" || dirty ? null : (
              <button type="button" disabled={busy} onClick={() => void download()}>
                Baixar PDF confirmado
              </button>
            )}
          </div>
          {!error ? null : (
            <p className="interface-status" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
