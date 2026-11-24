import type { DocumentCondominiumCheck } from "../api/documents/document-condominium-check.js";
import type { DocumentConversationEvent } from "../api/answers/document-conversation.js";
import type { DocumentAnalysisReport } from "../api/analysis/document-analysis.js";
import type { AnswerPayload } from "../api/answers/answer-contract.js";
import { singleGenerationRequestTimeoutMs } from "../shared/generation-limits.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isDocumentSnapshot(value: unknown): value is DocumentAnalysisReport {
  return (
    isRecord(value) &&
    ["available", "limited", "unavailable"].includes(String(value.status)) &&
    typeof value.title === "string" &&
    value.title.trim() !== "" &&
    Array.isArray(value.rows) &&
    value.rows.every(
      (row: unknown) =>
        isRecord(row) &&
        typeof row.label === "string" &&
        typeof row.detail === "string" &&
        Array.isArray(row.citations)
    ) &&
    Array.isArray(value.limitations) &&
    value.limitations.every((item: unknown) => typeof item === "string")
  );
}

/** Valida o transporte; autorização e fidelidade continuam sendo verificadas pelo servidor. */
export function isAnswerPayload(value: unknown): value is AnswerPayload {
  if (!isRecord(value) || !isRecord(value.specialist)) return false;
  return (
    typeof value.answer === "string" &&
    value.answer.trim() !== "" &&
    ["grounded", "abstained", "conflict", "failed"].includes(String(value.answerMode)) &&
    Array.isArray(value.citations) &&
    value.citations.every(
      (citation: unknown) =>
        isRecord(citation) &&
        ["id", "evidenceId", "documentId", "documentVersionId", "title", "excerpt"].every(
          (key) => typeof citation[key] === "string" && citation[key].trim() !== ""
        ) &&
        Number.isSafeInteger(citation.page) &&
        Number(citation.page) > 0 &&
        Number.isSafeInteger(citation.startOffset) &&
        Number(citation.startOffset) >= 0 &&
        Number.isSafeInteger(citation.endOffset) &&
        Number(citation.endOffset) > Number(citation.startOffset)
    ) &&
    Array.isArray(value.attentionPoints) &&
    value.attentionPoints.every((item: unknown) => typeof item === "string") &&
    (value.suggestedNextStep === null || typeof value.suggestedNextStep === "string") &&
    typeof value.specialist.required === "boolean" &&
    (value.specialist.type === null || typeof value.specialist.type === "string") &&
    (value.specialist.reason === null || typeof value.specialist.reason === "string")
  );
}

async function fetchDocumentAnalysis(
  request: typeof fetch,
  url: string,
  options: RequestInit
): Promise<Response> {
  try {
    return await request(url, {
      ...options,
      signal: AbortSignal.timeout(singleGenerationRequestTimeoutMs)
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))
      throw new Error(
        "A análise excedeu o tempo de espera. O arquivo foi recebido; confira a conversa antes de tentar novamente."
      );
    throw new Error(
      "A conexão foi interrompida. O arquivo foi recebido; a conclusão da análise não foi confirmada."
    );
  }
}

export type DocumentConversationResult = Readonly<{
  message?: string;
  snapshot?: DocumentAnalysisReport;
}>;

export async function requestDocumentConversationResult(
  fetchRequest: typeof fetch,
  input: Readonly<{
    condominiumId: string;
    documentVersionId: string;
    headers: Record<string, string>;
    event: DocumentConversationEvent;
    analysisOnly?: boolean;
    message?: string;
  }>
): Promise<DocumentConversationResult> {
  const response = await fetchDocumentAnalysis(
    fetchRequest,
    `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/documents/${encodeURIComponent(input.documentVersionId)}/conversation`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { ...input.headers, "content-type": "application/json" },
      body: JSON.stringify({
        event: input.event,
        ...(input.message === undefined ? {} : { message: input.message }),
        ...(input.analysisOnly === true ? { analysisOnly: true } : {})
      })
    }
  );
  if (!response.ok)
    throw new Error(
      "A Alvitra não conseguiu conversar sobre o anexo agora. Tente novamente pelos documentos enviados."
    );
  const result: unknown = await response.json().catch(() => null);
  if (
    !isRecord(result) ||
    (result.snapshot !== undefined && !isDocumentSnapshot(result.snapshot)) ||
    ((typeof result.message !== "string" || result.message.trim() === "") &&
      result.snapshot === undefined)
  )
    throw new Error("A Alvitra não conseguiu conversar sobre o anexo agora.");
  return result as DocumentConversationResult;
}

export async function requestDocumentConversation(
  fetchRequest: typeof fetch,
  input: Parameters<typeof requestDocumentConversationResult>[1]
): Promise<string> {
  const result = await requestDocumentConversationResult(fetchRequest, input);
  if (result.message === undefined)
    throw new Error("A Alvitra não conseguiu conversar sobre o anexo agora.");
  return result.message;
}

export async function requestDocumentBatchSummary(
  fetchRequest: typeof fetch,
  input: Readonly<{
    condominiumId: string;
    documentVersionIds: readonly string[];
    headers: Record<string, string>;
    message?: string;
    onOriginalImprovementStatus?: (message: string) => void;
  }>
): Promise<AnswerPayload> {
  const response = await fetchDocumentAnalysis(
    fetchRequest,
    `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/documents/conversation`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { ...input.headers, "content-type": "application/json" },
      body: JSON.stringify({
        documentVersionIds: input.documentVersionIds,
        ...(input.message === undefined ? {} : { message: input.message })
      })
    }
  );
  if (response.status === 413) throw new Error("O material excedeu o limite desta análise.");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    switch (body?.code) {
      case "analysis_unavailable":
        throw new Error(
          "A Alvitra não conseguiu concluir a análise agora. Tente novamente mais tarde."
        );
      case "answer_validation_failed":
        throw new Error("A resposta não passou pela validação documental.");
      case "analysis_failed":
        throw new Error("A análise falhou. O arquivo foi recebido.");
      case "tenant_work_limit":
        throw new Error("Aguarde um instante antes de continuar.");
      case "document_catalog_changed":
        throw new Error("Os documentos mudaram durante a análise. Refaça a consulta.");
      default:
        throw new Error("A análise não foi concluída. O arquivo foi recebido.");
    }
  }
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body) || !isAnswerPayload(body.summary))
    throw new Error("A análise devolveu uma resposta incompleta. O arquivo foi recebido.");
  if (isRecord(body.originalImprovement) && typeof body.originalImprovement.message === "string")
    input.onOriginalImprovementStatus?.(body.originalImprovement.message);
  return body.summary;
}

/** Resultados prontos são comunicados pela síntese contextual, sem relatório na interface. */
export async function requestDocumentConversationReply(
  fetchRequest: typeof fetch,
  input: Parameters<typeof requestDocumentConversationResult>[1]
): Promise<Readonly<{ text: string; answer?: AnswerPayload }>> {
  const result = await requestDocumentConversationResult(fetchRequest, input);
  if (result.snapshot !== undefined) {
    const answer = await requestDocumentBatchSummary(fetchRequest, {
      condominiumId: input.condominiumId,
      documentVersionIds: [input.documentVersionId],
      headers: input.headers
    });
    return { text: "", answer };
  }
  if (result.message === undefined || result.message.trim() === "")
    throw new Error("A Alvitra não conseguiu conversar sobre o anexo agora.");
  return { text: result.message };
}

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
    message?: string;
  }>
): Promise<void> {
  const response = await fetchRequest(
    `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/documents/${encodeURIComponent(input.documentVersionId)}/confirm-condominium`,
    {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(30_000),
      headers: { ...input.headers, "content-type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        ...(input.message === undefined ? {} : { message: input.message })
      })
    }
  );
  if (!response.ok)
    throw new Error("Não foi possível confirmar. Atualize os documentos e tente novamente.");
}

export function DocumentCondominiumConfirmation(
  props: Readonly<{
    message: string;
  }>
) {
  return (
    <article
      className="assistant-message document-confirmation-message"
      aria-label="Mensagem da Alvitra sobre o documento"
    >
      <p>{props.message}</p>
    </article>
  );
}
