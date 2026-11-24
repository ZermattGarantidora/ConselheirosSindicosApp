import type { DocumentToView } from "./DocumentViewer.js";
import { chatFileMediaType, documentSelectionKey } from "./document-upload-batch.js";
import { recoveredDocumentProgress } from "./recovered-document-progress.js";
import type { LibraryDocument } from "./document-library.js";

export type DocumentUploadProgress = Readonly<{
  id: string;
  name: string;
  phase: "queued" | "uploading" | "processing" | "ready" | "needs_review" | "failed";
  document?: DocumentToView;
  error?: string;
}>;

const phaseLabels: Record<DocumentUploadProgress["phase"], string> = {
  queued: "Aguardando envio",
  uploading: "Enviando documento...",
  processing: "Documento recebido. Lendo e preparando para consulta...",
  ready: "Disponível para consulta",
  needs_review: "Leitura precisa de revisão ou confirmação",
  failed: "Não foi possível concluir este arquivo"
};

function sameDocumentVersion(first?: DocumentToView, second?: DocumentToView): boolean {
  return (
    first !== undefined &&
    second !== undefined &&
    first.condominiumId === second.condominiumId &&
    first.documentVersionId === second.documentVersionId
  );
}

function DocumentUploadMessage(
  props: Readonly<{
    name: string;
    document: DocumentToView | undefined;
    progress: Pick<DocumentUploadProgress, "phase" | "error"> | undefined;
    onOpen: (document: DocumentToView) => void;
  }>
) {
  const status =
    props.progress?.error ??
    (props.progress !== undefined && props.progress.phase !== "ready"
      ? phaseLabels[props.progress.phase]
      : undefined);
  return (
    <div className="user-message document-message document-batch-item">
      {props.document === undefined ? (
        <strong>{props.name}</strong>
      ) : (
        <button
          type="button"
          className="document-open-button"
          onClick={() => props.onOpen(props.document!)}
          aria-label={`Visualizar ${props.name}`}
        >
          {props.name}
        </button>
      )}
      {status === undefined ? null : (
        <small
          className="interface-status"
          role={props.progress?.error === undefined ? "status" : "alert"}
        >
          {status}
        </small>
      )}
    </div>
  );
}

export function RecordedDocumentUpload(
  props: Readonly<{
    name: string;
    document: DocumentToView | undefined;
    items: readonly DocumentUploadProgress[];
    catalog?: readonly LibraryDocument[] | undefined;
    catalogPending?: boolean;
    catalogError?: string;
    onOpen: (document: DocumentToView) => void;
  }>
) {
  const local = props.items.find((item) => sameDocumentVersion(item.document, props.document));
  const progress = recoveredDocumentProgress(
    props.document,
    local,
    props.catalog,
    props.catalogPending ?? false,
    props.catalogError
  );
  return (
    <DocumentUploadMessage
      name={props.name}
      document={props.document}
      progress={progress}
      onOpen={props.onOpen}
    />
  );
}

export function PendingDocumentAttachments(
  props: Readonly<{
    files: readonly File[];
    sending: boolean;
    disabled: boolean;
    onRemove: (file: File) => void;
  }>
) {
  if (props.sending || props.files.length === 0) return null;
  return (
    <div className="composer-attachments" aria-label="Arquivos selecionados">
      <p>
        {props.files.length === 1
          ? "1 arquivo selecionado"
          : `${props.files.length} arquivos selecionados`}
      </p>
      {props.files.map((file) => (
        <div className="composer-attachment" key={documentSelectionKey(file)}>
          <span aria-hidden="true">↥</span>
          <div>
            <strong>{file.name}</strong>
            <small>
              {chatFileMediaType(file) === "application/pdf" ? "PDF" : "Foto"} · Pronto para enviar
            </small>
          </div>
          <button
            type="button"
            aria-label={`Remover ${file.name}`}
            disabled={props.disabled}
            onClick={() => props.onRemove(file)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function DocumentBatchProgress(
  props: Readonly<{
    items: readonly DocumentUploadProgress[];
    recordedDocuments?: readonly DocumentToView[];
    onOpen: (document: DocumentToView) => void;
  }>
) {
  const pending = props.items.filter(
    (item) =>
      !props.recordedDocuments?.some((document) => sameDocumentVersion(item.document, document))
  );
  if (pending.length === 0) return null;
  return (
    <div className="document-batch" aria-label="Envio de arquivos">
      {pending.map((item) => (
        <DocumentUploadMessage
          key={item.id}
          name={item.name}
          document={item.document}
          progress={item}
          onOpen={props.onOpen}
        />
      ))}
    </div>
  );
}
