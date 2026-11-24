import { isDocumentUploadNotice } from "../shared/conversation-intent.js";

export function chatFileMediaType(
  file: Pick<File, "type" | "name">
):
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | undefined {
  const name = file.name.toLocaleLowerCase("pt-BR");
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg"))
    return "image/jpeg";
  if (file.type === "image/png" || name.endsWith(".png")) return "image/png";
  return undefined;
}

export function documentSelectionKey(file: File): string {
  return JSON.stringify([file.name, file.size, file.type, file.lastModified]);
}

export function selectDocumentFiles(
  current: readonly File[],
  incoming: readonly File[]
): Readonly<{ files: readonly File[]; errors: readonly string[] }> {
  const files = [...current];
  const keys = new Set(current.map(documentSelectionKey));
  const errors: string[] = [];
  for (const file of incoming) {
    const mediaType = chatFileMediaType(file);
    const limit = mediaType === "application/pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (mediaType === undefined) {
      errors.push(`${file.name}: envie um PDF, Word (.docx), JPEG ou PNG.`);
    } else if (file.size > limit) {
      errors.push(`${file.name}: o limite é ${mediaType === "application/pdf" ? 25 : 10} MB.`);
    } else if (!keys.has(documentSelectionKey(file))) {
      keys.add(documentSelectionKey(file));
      files.push(file);
    }
  }
  return { files, errors };
}

/** O acompanhamento de um arquivo termina antes de iniciar o próximo upload. */
export async function sendDocumentBatch<T>(
  input: Readonly<{
    documents: readonly T[];
    message: string;
    process: (document: T, index: number) => Promise<boolean>;
    isCurrent: () => boolean;
    ask: (message: string) => Promise<void>;
    complete?: () => Promise<void>;
  }>
): Promise<boolean> {
  if (input.documents.length === 0) return false;
  let allReady = true;
  for (const [index, document] of input.documents.entries()) {
    if (!input.isCurrent()) return false;
    if (!(await input.process(document, index))) allReady = false;
  }
  if (!input.isCurrent()) return false;
  await input.complete?.();
  if (!input.isCurrent()) return false;
  if (
    allReady &&
    input.message.trim() !== "" &&
    (input.complete === undefined || !isDocumentUploadNotice(input.message))
  )
    await input.ask(input.message.trim());
  return allReady;
}
