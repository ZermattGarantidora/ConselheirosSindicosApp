export type DocumentBatchResponse<T> = Readonly<{
  markReady: (key: string, document: T) => void;
  finish: () => Promise<void>;
  respondIfReady: () => Promise<void>;
  cancel: () => void;
}>;

/** Abrir a confirmação pela biblioteca não perde o vínculo com o envio original. */
export function queueDocumentConfirmation<
  T extends Readonly<{ document: Readonly<{ condominiumId: string; documentVersionId: string }> }>
>(current: readonly T[], next: T): readonly T[] {
  const matches = (item: T) =>
    item.document.condominiumId === next.document.condominiumId &&
    item.document.documentVersionId === next.document.documentVersionId;
  return current.some(matches)
    ? current.map((item) => (matches(item) ? { ...item, ...next } : item))
    : [...current, next];
}

/** Uma ida e volta ao mesmo chat não reativa resultados da visita anterior. */
export function documentResponseScope(
  previous: Readonly<{ identity: string }>,
  identity: string
): Readonly<{ identity: string }> {
  return previous.identity === identity ? previous : { identity };
}

/** Conserva o envio inteiro, inclusive durante confirmações posteriores à leitura inicial. */
export function createDocumentBatchResponse<T>(
  input: Readonly<{
    keys: readonly string[];
    isCurrent: () => boolean;
    respond: (documents: readonly T[]) => Promise<void>;
  }>
): DocumentBatchResponse<T> {
  if (input.keys.length === 0 || new Set(input.keys).size !== input.keys.length)
    throw new Error("O lote deve conter arquivos distintos.");
  const keys = [...input.keys];
  const ready = new Map<string, T>();
  let uploadsFinished = false;
  let attempted = false;

  const respondIfReady = async () => {
    if (attempted || !uploadsFinished || ready.size !== keys.length || !input.isCurrent()) return;
    // Bloqueia duplicatas também durante a geração e após falha de resultado incerto.
    attempted = true;
    await input.respond(keys.map((key) => ready.get(key)!));
  };

  return {
    markReady(key, document) {
      if (!keys.includes(key)) throw new Error("O arquivo não pertence a este lote.");
      if (!attempted) ready.set(key, document);
    },
    async finish() {
      uploadsFinished = true;
      await respondIfReady();
    },
    respondIfReady,
    cancel() {
      attempted = true;
    }
  };
}
