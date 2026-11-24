import type { RegisteredDocument } from "../api/documents/document-catalog.js";

export type LibraryDocument = Pick<
  RegisteredDocument,
  | "documentId"
  | "documentVersionId"
  | "title"
  | "documentType"
  | "isFinancialStatement"
  | "processingStatus"
  | "validityStatus"
  | "versionNumber"
  | "createdAt"
  | "condominiumCheck"
> &
  Readonly<{ condominiumId: string; condominiumName: string }>;

export const documentCategories = [
  { type: "convention", label: "Convenções", description: "Regras e estrutura do condomínio" },
  {
    type: "internal_rules",
    label: "Regimentos internos",
    description: "Convivência e uso dos espaços"
  },
  { type: "meeting_minutes", label: "Atas", description: "Decisões e registros de assembleias" },
  { type: "contract", label: "Contratos", description: "Serviços e compromissos documentados" },
  {
    type: "financial_statement",
    label: "Balancetes",
    description: "Somente balancetes e prestações de contas"
  },
  {
    type: "other",
    label: "Outros documentos",
    description: "Demais arquivos enviados"
  }
] as const;

export type AvailabilityFilter = "all" | "available" | "attention";
export type LibrarySection = "all" | "financial_statement";

export function libraryDocumentCategory(document: LibraryDocument): string {
  return document.isFinancialStatement === true ? "financial_statement" : document.documentType;
}

export function isDocumentAvailable(document: LibraryDocument): boolean {
  return (
    document.processingStatus === "ready" &&
    ["confirmed", "not_applicable"].includes(document.validityStatus) &&
    document.condominiumCheck?.status !== "pending"
  );
}

export function scopedLibraryDocuments(
  documents: readonly LibraryDocument[],
  condominiumId: string | undefined
): readonly LibraryDocument[] {
  const versions = new Map<string, LibraryDocument>();
  for (const document of documents) {
    if (document.condominiumId === condominiumId)
      versions.set(document.documentVersionId, document);
  }
  return [...versions.values()].sort(
    (first, second) =>
      first.title.localeCompare(second.title, "pt-BR", { sensitivity: "base", numeric: true }) ||
      second.versionNumber - first.versionNumber ||
      first.documentVersionId.localeCompare(second.documentVersionId)
  );
}

export function summarizeDocumentAvailability(documents: readonly LibraryDocument[]) {
  const available = documents.filter(isDocumentAvailable).length;
  return {
    total: documents.length,
    available,
    attention: documents.length - available,
    percentage: documents.length === 0 ? 0 : Math.round((100 * available) / documents.length)
  };
}

const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");

export function filterLibraryDocuments(
  documents: readonly LibraryDocument[],
  search: string,
  category: string,
  availability: AvailabilityFilter
): readonly LibraryDocument[] {
  const query = normalizeSearch(search.trim());
  return documents.filter(
    (document) =>
      normalizeSearch(document.title).includes(query) &&
      (category === "all" || libraryDocumentCategory(document) === category) &&
      (availability === "all" ||
        (availability === "available"
          ? isDocumentAvailable(document)
          : !isDocumentAvailable(document)))
  );
}

export function documentValidityLabel(status: LibraryDocument["validityStatus"]): string {
  return {
    pending: "Vigência não confirmada",
    confirmed: "Vigência confirmada",
    disputed: "Vigência em conflito",
    superseded: "Versão substituída",
    not_applicable: "Vigência não se aplica"
  }[status];
}

export async function loadCondominiumDocuments(
  request: typeof fetch,
  scope: Readonly<{
    condominiumId: string;
    condominiumName: string;
    headers: Readonly<Record<string, string>>;
  }>,
  signal: AbortSignal
): Promise<readonly LibraryDocument[]> {
  const response = await request(
    `/v1/condominiums/${encodeURIComponent(scope.condominiumId)}/documents`,
    { credentials: "same-origin", cache: "no-store", headers: scope.headers, signal }
  );
  if (!response.ok) throw new Error("Não foi possível carregar os documentos. Tente novamente.");
  const body = (await response.json()) as {
    documents: readonly Omit<LibraryDocument, "condominiumId" | "condominiumName">[];
  };
  // Mesmo um transporte que termine depois do cancelamento não pode publicar o catálogo antigo.
  signal.throwIfAborted();
  return scopedLibraryDocuments(
    body.documents.map((document) => ({
      ...document,
      condominiumId: scope.condominiumId,
      condominiumName: scope.condominiumName
    })),
    scope.condominiumId
  );
}
