export type DocumentCondominiumCheck = Readonly<{
  status: "pending" | "confirmed";
  expectedName: string;
  detectedNames: readonly string[];
  sources: readonly Readonly<{ name: string; source: "filename" | "text"; page: number | null }>[];
  resumeProcessingStatus: "ready" | "needs_review";
}>;

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(?:(?:condominio|residencial|edificio)(?:\s+|$))+/u, "")
    .replace(/^(?:do|da|de)\s+/u, "")
    .trim();
}

function explicitName(line: string, filename = false): string | undefined {
  const text = line.replaceAll(/[_–—]+/gu, " ").replaceAll(/\s+-\s+|(?<=\p{L})-(?=\p{L})/gu, " ");
  const prefix = filename
    ? /(?:^|[\s-])((?:condom[ií]nio|residencial|edif[ií]cio)\s*[:-]?\s+.+)$/iu
    : /^(?:(?:conven[cç][aã]o|regimento\s+interno|ata\s+(?:da|de)\s+assembleia(?:\s+geral)?|balancete|contratante)\s*(?::|d[oa]|de)?\s+)?((?:condom[ií]nio|residencial|edif[ií]cio)\s*[:-]?\s+.+)$/iu;
  const match = prefix.exec(text.trim());
  if (match?.[1] === undefined) return undefined;
  const name = match[1]
    .split(
      /[.;,|]|\s+[–—-]\s+|\s+(?=(?:cnpj|cpf|endere[cç]o|rua|avenida|balancete|compet[eê]ncia|per[ií]odo|p[aá]gina|conven[cç][aã]o|regimento|ata|relat[oó]rio)\b)|\s+(?=20\d{2}(?:\D|$))/iu,
      1
    )[0]!
    .replaceAll(/[“”"']/gu, "")
    .trim();
  const normalized = normalizeName(name);
  if (normalized.length < 2 || name.length > 120 || /[<>{}=]/u.test(name)) return undefined;
  // Generic prose is not a reliable identification of the document's owner.
  if (
    /\b(?:deve|dever[aá]|poder[aá]|vizinho|citado|exemplo|ignore|instru[cç][oõ]es)\b/iu.test(name)
  )
    return undefined;
  return name;
}

/** Explicit labels are untrusted evidence of a possible mismatch, never authorization. */
export function checkDocumentCondominium(
  input: Readonly<{
    expectedName: string;
    title: string;
    pages: readonly Readonly<{ pageNumber: number; extractedText: string }>[];
    processingStatus: "ready" | "needs_review";
  }>
): DocumentCondominiumCheck | undefined {
  const expected = normalizeName(input.expectedName);
  if (expected === "") return undefined;
  const sources: Array<DocumentCondominiumCheck["sources"][number]> = [];
  const filenameName = explicitName(input.title.replace(/\.[^.]+$/u, ""), true);
  if (filenameName !== undefined)
    sources.push({ name: filenameName, source: "filename", page: null });
  for (const page of input.pages) {
    const lines = page.extractedText.slice(0, 800).split(/\r?\n/u).slice(0, 6);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const labelOnly = /^(?:condom[ií]nio|residencial|edif[ií]cio)\s*:?$/iu.test(line.trim());
      const name = explicitName(labelOnly ? `${line} ${lines[index + 1] ?? ""}` : line);
      if (name !== undefined) sources.push({ name, source: "text", page: page.pageNumber });
    }
  }
  if (!sources.some(({ name }) => normalizeName(name) !== expected)) return undefined;
  const names = new Map(sources.map(({ name }) => [normalizeName(name), name]));
  return Object.freeze({
    status: "pending",
    expectedName: input.expectedName,
    detectedNames: Object.freeze([...names.values()]),
    sources: Object.freeze(sources),
    resumeProcessingStatus: input.processingStatus
  });
}
