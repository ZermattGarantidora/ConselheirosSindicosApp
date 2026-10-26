import { useEffect, useRef, useState } from "react";

export type DocumentToView = Readonly<{
  condominiumId: string;
  documentVersionId: string;
  title: string;
  page?: number;
  legalSourceId?: string;
}>;

export async function loadDocumentOriginal(
  fetchRequest: typeof fetch,
  document: DocumentToView,
  headers: Readonly<Record<string, string>>,
  signal: AbortSignal
): Promise<Blob> {
  const response = await fetchRequest(
    document.legalSourceId === undefined
      ? `/v1/condominiums/${encodeURIComponent(document.condominiumId)}/documents/${encodeURIComponent(document.documentVersionId)}/file`
      : `/v1/condominiums/${encodeURIComponent(document.condominiumId)}/legal-sources/${encodeURIComponent(document.legalSourceId)}/versions/${encodeURIComponent(document.documentVersionId)}/copy`,
    { credentials: "same-origin", cache: "no-store", headers, signal }
  );
  if (!response.ok)
    throw new Error(
      document.legalSourceId === undefined
        ? "Não foi possível abrir o original. Confira seu acesso e tente novamente."
        : "Não foi possível abrir a cópia de consulta. Confira seu acesso e tente novamente."
    );
  const blob = await response.blob();
  const allowedTypes =
    document.legalSourceId === undefined
      ? ["application/pdf", "image/jpeg", "image/png"]
      : ["application/pdf"];
  if (!allowedTypes.includes(blob.type)) {
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
      aria-label={`${document.legalSourceId === undefined ? "Documento completo" : "Cópia de consulta"}: ${document.title}`}
      onCancel={onClose}
    >
      <header>
        <strong>{document.title}</strong>
        {original === undefined ? null : (
          <a href={original.url} download={document.title}>
            {document.legalSourceId === undefined ? "Baixar original" : "Baixar cópia de consulta"}
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
        <p role="status">
          {document.legalSourceId === undefined
            ? "Abrindo documento completo..."
            : "Abrindo cópia de consulta..."}
        </p>
      ) : original.mediaType === "application/pdf" ? (
        <iframe
          title={`${document.legalSourceId === undefined ? "PDF completo" : "Cópia de consulta"}: ${document.title}`}
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
