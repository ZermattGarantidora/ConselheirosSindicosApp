import type { DocumentCondominiumCheck } from "../api/documents/document-condominium-check.js";

export class DocumentCondominiumConfirmationRequiredError extends Error {
  public constructor(public readonly check: DocumentCondominiumCheck) {
    super("Confirme o condomínio antes de usar este documento. Sua mensagem foi preservada.");
    this.name = "DocumentCondominiumConfirmationRequiredError";
  }
}

export async function confirmDocumentCondominium(
  fetchRequest: typeof fetch,
  input: Readonly<{
    condominiumId: string;
    documentVersionId: string;
    headers: Record<string, string>;
  }>
): Promise<void> {
  const response = await fetchRequest(
    `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/documents/${encodeURIComponent(input.documentVersionId)}/confirm-condominium`,
    {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(30_000),
      headers: { ...input.headers, "content-type": "application/json" },
      body: JSON.stringify({ confirm: true })
    }
  );
  if (!response.ok)
    throw new Error("Não foi possível confirmar. Atualize os documentos e tente novamente.");
}

export function DocumentCondominiumConfirmation(
  props: Readonly<{
    title: string;
    check: DocumentCondominiumCheck;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>
) {
  return (
    <div
      className="document-condominium-confirmation"
      role="group"
      aria-label="Conferir condomínio do documento"
    >
      <strong>Conferir condomínio · {props.title}</strong>
      <p>
        O documento identifica {props.check.detectedNames.map((name) => `“${name}”`).join(", ")},
        mas o condomínio selecionado é “{props.check.expectedName}”. Este documento pertence a “
        {props.check.expectedName}”?
      </p>
      <small>O arquivo aguarda sua confirmação para ser usado nas consultas.</small>
      <div className="document-confirmation-actions">
        <button type="button" disabled={props.busy} onClick={props.onConfirm}>
          Sim, usar em {props.check.expectedName}
        </button>
        <button type="button" disabled={props.busy} onClick={props.onCancel}>
          Cancelar uso
        </button>
      </div>
    </div>
  );
}
