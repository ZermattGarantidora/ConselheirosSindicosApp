import { createHash } from "node:crypto";

export type VerifiedLegalPage = Readonly<{
  pageNumber: number;
  locator: string;
  text: string;
  textSha256: string;
  startOffset: number;
  endOffset: number;
}>;

export type VerifiedLegalSource = Readonly<{
  id: string;
  versionId: string;
  title: string;
  officialUrl: string;
  issuingAuthority: string;
  jurisdiction: "BR";
  verifiedAt: string;
  reviewDueAt: string;
  relatedLaws: readonly string[];
  limitation: string;
  capturedTextSha256: string;
  pdfSha256: string;
  pdfBase64: string;
  pages: readonly VerifiedLegalPage[];
}>;

export type VerifiedLegalEdition = Readonly<{
  payloadSha256: string;
  payload: Readonly<{ edition: string; sources: readonly VerifiedLegalSource[] }>;
}>;

export function legalContentHash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function legalContentId(value: string): string {
  const hash = legalContentHash(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/u;

/** Falha fechada: uma edição alterada não é ativada parcialmente. */
export function validateLegalEdition(edition: VerifiedLegalEdition): VerifiedLegalEdition {
  if (legalContentHash(JSON.stringify(edition.payload)) !== edition.payloadSha256) {
    throw new Error("A edição legal diverge do manifesto de integridade.");
  }
  if (edition.payload.sources.length === 0) throw new Error("Edição legal vazia.");
  const ids = new Set<string>();
  for (const source of edition.payload.sources) {
    const origin = new URL(source.officialUrl);
    if (
      origin.protocol !== "https:" ||
      origin.hostname !== "www.planalto.gov.br" ||
      origin.username !== "" ||
      origin.password !== "" ||
      origin.port !== "" ||
      source.jurisdiction !== "BR" ||
      !uuidPattern.test(source.id) ||
      !uuidPattern.test(source.versionId) ||
      ids.has(source.id) ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(source.verifiedAt) ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(source.reviewDueAt) ||
      !Number.isFinite(Date.parse(source.verifiedAt)) ||
      !Number.isFinite(Date.parse(source.reviewDueAt)) ||
      source.verifiedAt >= source.reviewDueAt ||
      source.pages.length === 0
    )
      throw new Error("Metadados legais não autorizados ou inválidos.");
    const pdf = Buffer.from(source.pdfBase64, "base64");
    if (
      !pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      legalContentHash(pdf) !== source.pdfSha256
    ) {
      throw new Error("A cópia legal diverge do PDF conferido.");
    }
    ids.add(source.id);
    for (const [index, page] of source.pages.entries()) {
      if (
        page.pageNumber !== index + 1 ||
        page.locator.trim().length === 0 ||
        legalContentHash(page.text) !== page.textSha256 ||
        !Number.isInteger(page.startOffset) ||
        !Number.isInteger(page.endOffset) ||
        page.startOffset < 0 ||
        page.endOffset <= page.startOffset ||
        page.endOffset > Array.from(page.text).length ||
        !page.text.includes("PAGINACAO PROPRIA")
      )
        throw new Error("Página legal não verificável.");
      Object.freeze(page);
    }
    Object.freeze(source.pages);
    Object.freeze(source.relatedLaws);
    Object.freeze(source);
  }
  Object.freeze(edition.payload.sources);
  Object.freeze(edition.payload);
  return Object.freeze(edition);
}
