import { useEffect, useRef, useState } from "react";

export type DocumentToView = Readonly<{
  condominiumId: string;
  documentVersionId: string;
  title: string;
  page?: number;
}>;

export async function loadDocumentOriginal(
  fetchRequest: typeof fetch,
  document: DocumentToView,
  headers: Readonly<Record<string, string>>,
  signal: AbortSignal
): Promise<Blob> {
  const response = await fetchRequest(
    `/v1/condominiums/${encodeURIComponent(document.condominiumId)}/documents/${encodeURIComponent(document.documentVersionId)}/file`,
    { credentials: "same-origin", cache: "no-store", headers, signal }
  );
  if (!response.ok)
    throw new Error("Não foi possível abrir o original. Confira seu acesso e tente novamente.");
  const blob = await response.blob();
  if (!["application/pdf", "image/jpeg", "image/png"].includes(blob.type)) {
    throw new Error("O formato do arquivo não permite visualização segura.");
  }
  return blob;
}

export function DocumentViewer({
  document,
  headers,
  onClose
}: Readonly<{
  document: DocumentToView;
  headers: Readonly<Record<string, string>>;
  onClose: () => void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [original, setOriginal] = useState<Readonly<{ url: string; mediaType: string }>>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const headersKey = JSON.stringify(headers);

  useEffect(() => {
    const previousFocus = window.document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setOriginal(undefined);
    setError("");
    void loadDocumentOriginal(
      fetch,
      document,
      JSON.parse(headersKey) as Record<string, string>,
      controller.signal
    )
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setOriginal({ url: objectUrl, mediaType: blob.type });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error ? failure.message : "Não foi possível abrir o original."
          );
        }
      });
    return () => {
      controller.abort();
      if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl);
    };
  }, [document, headersKey, attempt]);

  return (
    <dialog
      ref={dialog}
      className="document-viewer"
      aria-label={`Documento completo: ${document.title}`}
      onCancel={onClose}
    >
      <header>
        <strong>{document.title}</strong>
        {original === undefined ? null : (
          <a href={original.url} download={document.title}>
            Baixar original
          </a>
        )}
        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </header>
      {error !== "" ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : original === undefined ? (
        <p role="status">Abrindo documento completo...</p>
      ) : original.mediaType === "application/pdf" ? (
        <iframe
          title={`PDF completo: ${document.title}`}
          src={`${original.url}#page=${document.page ?? 1}`}
        />
      ) : (
        <div className="document-viewer-image">
          <img src={original.url} alt={document.title} />
        </div>
      )}
    </dialog>
  );
}
