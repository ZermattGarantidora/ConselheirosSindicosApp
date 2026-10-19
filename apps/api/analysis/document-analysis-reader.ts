import type { Pool } from "pg";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { StructuredExtractionPage } from "../documents/structured/extract-structured-document.js";
import type { RetrievableChunk } from "../retrieval/retrieval-contract.js";

export type AnalysisDocument = Readonly<{
  condominiumId: AuthorizedCondominiumContext["condominiumId"];
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  pages: readonly StructuredExtractionPage[];
}>;

export interface DocumentAnalysisReader {
  readAuthorized(
    context: AuthorizedCondominiumContext,
    versionIds: readonly string[]
  ): Promise<readonly AnalysisDocument[]>;
}

export function assertAnalysisLimits(documents: readonly AnalysisDocument[]): void {
  const pages = documents.flatMap((document) => document.pages);
  if (
    pages.length > 500 ||
    pages.reduce((total, page) => total + page.extractedText.length, 0) > 2_000_000
  ) {
    throw new Error("O conjunto excede o limite de análise; selecione menos documentos.");
  }
}

/** Reconstrói somente páginas integralmente cobertas por chunks autorizados. */
export function createMemoryDocumentAnalysisReader(
  chunks: readonly RetrievableChunk[]
): DocumentAnalysisReader {
  return {
    async readAuthorized(context, versionIds) {
      if (!context.permissions.includes("document:read")) throw new Error("Acesso não autorizado.");
      const allowed = new Set(versionIds);
      const groups = new Map<string, RetrievableChunk[]>();
      for (const chunk of chunks) {
        if (
          chunk.condominiumId !== context.condominiumId ||
          chunk.sourceScope === "legislation" ||
          !allowed.has(chunk.documentVersionId) ||
          chunk.processingStatus !== "ready" ||
          !["confirmed", "not_applicable"].includes(chunk.validityStatus)
        )
          continue;
        const group = groups.get(chunk.documentVersionId) ?? [];
        group.push(chunk);
        groups.set(chunk.documentVersionId, group);
      }
      const documents = [...groups.values()].map((group): AnalysisDocument => {
        const first = group[0]!;
        const numbers = [...new Set(group.map((chunk) => chunk.pageNumber))].sort((a, b) => a - b);
        const pages = numbers.map((pageNumber): StructuredExtractionPage => {
          const parts = group
            .filter((chunk) => chunk.pageNumber === pageNumber)
            .sort((a, b) => a.startOffset - b.startOffset);
          const characters: string[] = [];
          for (const part of parts) {
            const content = Array.from(part.content);
            if (
              part.startOffset > characters.length ||
              part.endOffset !== part.startOffset + content.length
            ) {
              throw new Error("A página não tem cobertura textual verificável.");
            }
            content.forEach((character, index) => {
              const offset = part.startOffset + index;
              if (characters[offset] !== undefined && characters[offset] !== character) {
                throw new Error("Chunks da página são conflitantes.");
              }
              characters[offset] = character;
            });
          }
          return {
            pageNumber,
            extractedText: characters.join(""),
            extractionMethod: parts[0]!.extractionMethod,
            qualityScore: Math.min(...parts.map((part) => part.qualityScore))
          };
        });
        return {
          condominiumId: context.condominiumId,
          documentId: first.documentId,
          documentVersionId: first.documentVersionId,
          documentTitle: first.documentTitle,
          pages
        };
      });
      assertAnalysisLimits(documents);
      return documents;
    }
  };
}

export function createPostgresDocumentAnalysisReader(
  pool: Pick<Pool, "connect">
): DocumentAnalysisReader {
  return {
    async readAuthorized(context, versionIds) {
      if (!context.permissions.includes("document:read")) throw new Error("Acesso não autorizado.");
      if (versionIds.length === 0) return [];
      const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu;
      if (!uuid.test(context.condominiumId) || versionIds.some((id) => !uuid.test(id))) {
        throw new Error("Identificador documental inválido.");
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        let userId: string = context.userId;
        if (!uuid.test(userId)) {
          const user = await client.query<{ user_id: string | null }>(
            "SELECT app.resolve_user_id($1) AS user_id",
            [userId]
          );
          userId = user.rows[0]?.user_id ?? "";
        }
        if (!uuid.test(userId)) throw new Error("Acesso não autorizado.");
        await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
        await client.query("SELECT set_config('app.condominium_id', $1, true)", [
          context.condominiumId
        ]);
        const result = await client.query<{
          document_id: string;
          document_version_id: string;
          title: string;
          page_number: number;
          extracted_text: string;
          extraction_method: StructuredExtractionPage["extractionMethod"];
          quality_score: number;
        }>(
          `
          SELECT d.id AS document_id, dv.id AS document_version_id, d.title,
            dp.page_number, dp.extracted_text, dp.extraction_method, dp.quality_score
          FROM app.document_pages AS dp
          JOIN app.document_versions AS dv
            ON dv.condominium_id = dp.condominium_id AND dv.id = dp.document_version_id
          JOIN app.documents AS d
            ON d.condominium_id = dv.condominium_id AND d.id = dv.document_id
          JOIN app.document_version_states AS state
            ON state.condominium_id = dv.condominium_id AND state.document_version_id = dv.id
          WHERE dp.condominium_id = app.current_condominium_id()
            AND dv.id = ANY($1::uuid[]) AND d.status = 'active'
            AND state.processing_status = 'ready'
            AND state.validity_status IN ('confirmed', 'not_applicable')
          ORDER BY dv.id, dp.page_number
          LIMIT 501
        `,
          [versionIds]
        );
        const groups = new Map<string, AnalysisDocument>();
        for (const row of result.rows) {
          const previous = groups.get(row.document_version_id);
          groups.set(row.document_version_id, {
            condominiumId: context.condominiumId,
            documentId: row.document_id,
            documentVersionId: row.document_version_id,
            documentTitle: row.title,
            pages: [
              ...(previous?.pages ?? []),
              {
                pageNumber: Number(row.page_number),
                extractedText: row.extracted_text,
                extractionMethod: row.extraction_method,
                qualityScore: Number(row.quality_score)
              }
            ]
          });
        }
        const documents = [...groups.values()];
        assertAnalysisLimits(documents);
        await client.query("COMMIT");
        return documents;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
