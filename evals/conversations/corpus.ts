import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { DocumentType } from "../../apps/api/documents/document-model.js";
import type { RetrievableChunk } from "../../apps/api/retrieval/retrieval-contract.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";

export const syntheticMarker = "FICTÍCIO — GERADO POR IA — SOMENTE TESTE";
export const pageSeparator = "\n--- PAGE ---\n";
export const frozenDate = "2026-10-26T12:00:00.000Z";

type DocumentDefinition = Readonly<{
  key: string;
  file: string;
  title: string;
  type: DocumentType;
  tenant: "alameda" | "bosque";
  documentId: string;
  version: number;
  validity: RetrievableChunk["validityStatus"];
  quality: number;
}>;

function document(
  key: string,
  file: string,
  title: string,
  type: DocumentType = "other",
  overrides: Partial<DocumentDefinition> = {}
): DocumentDefinition {
  return Object.freeze({
    key,
    file,
    title,
    type,
    tenant: "alameda",
    documentId: key,
    version: 1,
    validity: "confirmed",
    quality: 1,
    ...overrides
  });
}

export const documentManifest: readonly DocumentDefinition[] = Object.freeze([
  document("convention", "alameda-convencao-v1.txt", "Convenção Alameda v1", "convention"),
  document(
    "convention-draft",
    "alameda-convencao-v2.txt",
    "Minuta de convenção Alameda v2",
    "convention",
    { documentId: "convention", version: 2, validity: "disputed" }
  ),
  document("rules", "alameda-regimento.txt", "Regimento Alameda", "internal_rules"),
  document("notice", "alameda-edital-ago.txt", "Edital AGO Alameda", "meeting_minutes"),
  document("agm", "alameda-ata-ago.txt", "Ata AGO Alameda", "meeting_minutes"),
  document("egm", "alameda-ata-age.txt", "Ata AGE Alameda", "meeting_minutes"),
  document("june", "alameda-balancete-junho.txt", "Balancete junho Alameda"),
  document("july", "alameda-balancete-julho.txt", "Balancete julho Alameda"),
  document("august", "alameda-balancete-agosto.txt", "Balancete agosto Alameda"),
  document("employee", "alameda-contrato-funcionario.txt", "Contrato FUNC-A Alameda", "contract"),
  document("cleaning", "alameda-contrato-limpeza.txt", "Contrato de limpeza Alameda", "contract"),
  document(
    "cleaning-draft",
    "alameda-aditivo-limpeza.txt",
    "Minuta de aditivo de limpeza",
    "contract",
    { documentId: "cleaning", version: 2, validity: "disputed" }
  ),
  document("lift", "alameda-contrato-elevador.txt", "Contrato do elevador Alameda", "contract"),
  document("emergency", "alameda-plano-emergencia.txt", "Exercício de plano de emergência"),
  document("calendar", "alameda-calendario.txt", "Calendário administrativo Alameda"),
  document("bosque", "bosque-convencao.txt", "Convenção Bosque", "convention", {
    tenant: "bosque"
  }),
  document("injection", "alameda-nota-maliciosa.txt", "Nota não confiável de fornecedor"),
  document("ocr", "alameda-balancete-ocr.txt", "Balancete ilegível agosto", "other", {
    validity: "pending",
    quality: 0.2
  }),
  document("arrears", "alameda-inadimplencia.txt", "Posição de cotas e acordos"),
  document("incidents", "alameda-ocorrencias.txt", "Registro de ocorrências"),
  document("maintenance", "alameda-manutencao.txt", "Plano e laudos de manutenção"),
  document("insurance", "alameda-seguro.txt", "Resumo de apólice sintética", "contract"),
  document(
    "privacy",
    "alameda-privacidade.txt",
    "Política interna de privacidade",
    "internal_rules"
  ),
  document("handover", "alameda-transicao.txt", "Termo de transição de gestão"),
  document("bids", "alameda-propostas.txt", "Propostas de modernização", "contract")
]);

export type CorpusDocument = Readonly<
  DocumentDefinition & {
    versionId: string;
    sha256: string;
    pages: readonly string[];
  }
>;
export type ConversationCorpus = Readonly<{
  documents: readonly CorpusDocument[];
  chunks: readonly RetrievableChunk[];
  sha256: string;
}>;

export function parseDocumentPages(text: string): readonly string[] {
  const normalized = text.replaceAll("\r\n", "\n").trim();
  if (!normalized.startsWith(syntheticMarker)) throw new Error("Documento sem marcador sintético.");
  const pages = normalized.split(/\n--- PAGE ---(?:\n|$)/u).map((page) => page.trim());
  if (pages.some((page, index) => !page.includes(`Página ${index + 1}.`)))
    throw new Error("Paginação sintética inválida.");
  return Object.freeze(pages);
}

export async function loadConversationCorpus(): Promise<ConversationCorpus> {
  const documents = await Promise.all(
    documentManifest.map(async (definition): Promise<CorpusDocument> => {
      const text = await readFile(
        new URL(`./documents/${definition.file}`, import.meta.url),
        "utf8"
      );
      const pages = parseDocumentPages(text);
      return Object.freeze({
        ...definition,
        versionId: `${definition.documentId}-v${definition.version}`,
        pages,
        sha256: createHash("sha256").update(pages.join(pageSeparator)).digest("hex")
      });
    })
  );
  if (
    new Set(documents.map((item) => item.key)).size !== documents.length ||
    new Set(documents.map((item) => `${item.tenant}/${item.versionId}`)).size !== documents.length
  )
    throw new Error("Documento ou versão duplicados.");
  const chunks = documents.flatMap((item) =>
    item.pages.map((content, index): RetrievableChunk =>
      Object.freeze({
        id: `${item.key}-p${index + 1}`,
        condominiumId: createCondominiumId(item.tenant),
        documentId: item.documentId,
        documentVersionId: item.versionId,
        documentVersionNumber: item.version,
        documentTitle: item.title,
        documentType: item.type,
        sourceKind: "user_upload",
        sourceScope: "condominium",
        pageId: `${item.versionId}-p${index + 1}`,
        pageNumber: index + 1,
        startOffset: 0,
        endOffset: Array.from(content).length,
        content,
        contentSha256: createHash("sha256").update(content).digest("hex"),
        semanticScore: null,
        extractionMethod: item.key === "ocr" ? "ocr" : "pdf_text",
        qualityScore: item.quality,
        processingStatus: item.key === "ocr" ? "needs_review" : "ready",
        validityStatus: item.validity,
        validFrom: null,
        validUntil: null
      })
    )
  );
  return Object.freeze({
    documents: Object.freeze(documents),
    chunks: Object.freeze(chunks),
    sha256: createHash("sha256").update(JSON.stringify(documents)).digest("hex")
  });
}
