type FetchRequest = (url: string, init?: RequestInit) => Promise<Response>;

export type DocumentProcessingStatus = "ready" | "needs_review" | "failed";

export function documentProcessingLabel(status: string): string {
  if (status === "ready") return "Disponível para consulta";
  if (status === "needs_review") return "Leitura precisa de revisão";
  if (status === "failed") return "Falha na leitura";
  return "Em processamento";
}

export async function waitForDocumentProcessing(
  fetchRequest: FetchRequest,
  input: Readonly<{
    condominiumId: string;
    documentVersionId: string;
    headers: Readonly<Record<string, string>>;
    signal: AbortSignal;
  }>
): Promise<DocumentProcessingStatus> {
  while (true) {
    input.signal.throwIfAborted();
    const response = await fetchRequest(
      `/v1/condominiums/${encodeURIComponent(input.condominiumId)}/documents`,
      {
        credentials: "same-origin",
        cache: "no-store",
        headers: input.headers,
        signal: input.signal
      }
    );
    if (!response.ok) throw new Error("Não foi possível acompanhar a leitura do documento.");
    const body = (await response.json()) as Readonly<{
      documents: readonly Readonly<{ documentVersionId: string; processingStatus: string }>[];
    }>;
    const document = body.documents.find(
      (item) => item.documentVersionId === input.documentVersionId
    );
    if (document === undefined)
      throw new Error("O documento não está mais disponível neste condomínio.");
    if (["ready", "needs_review", "failed"].includes(document.processingStatus)) {
      return document.processingStatus as DocumentProcessingStatus;
    }
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(input.signal.reason);
      };
      const timer = setTimeout(() => {
        input.signal.removeEventListener("abort", abort);
        resolve();
      }, 1000);
      input.signal.addEventListener("abort", abort, { once: true });
      if (input.signal.aborted) abort();
    });
  }
}

export async function sendDocumentMessage(
  input: Readonly<{
    message: string;
    receive: () => Promise<void>;
    waitUntilProcessed: () => Promise<DocumentProcessingStatus>;
    ask: (message: string) => Promise<void>;
  }>
): Promise<void> {
  await input.receive();
  const status = await input.waitUntilProcessed();
  if (input.message.trim() === "") return;
  if (status !== "ready") {
    throw new Error(
      status === "needs_review"
        ? "O arquivo precisa de revisão. Confira o original ou envie uma versão legível antes de consultar sua mensagem."
        : "A leitura do arquivo falhou. Sua mensagem foi preservada para tentar novamente."
    );
  }
  await input.ask(input.message.trim());
}
