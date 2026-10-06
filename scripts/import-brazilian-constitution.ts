import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import { Client } from "pg";

import { createCondominiumId } from "../apps/api/core/condominium-scope.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
import {
  createLocalSyntheticEmbeddingAdapter,
  formatPgVector
} from "../apps/api/retrieval/local-embedding.js";
import { chunkPage } from "../apps/api/retrieval/retrieval-contract.js";
import { parseDatabaseUrl } from "./database-migrations.js";

export const constitutionSource = Object.freeze({
  id: "19880000-0000-4000-8000-000000000139",
  title: "Constituição da República Federativa do Brasil",
  issuingAuthority: "Câmara dos Deputados",
  officialUrl:
    "https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988/arquivos/ConstituicaoTextoAtualizado_EC%20139.pdf",
  versionLabel: "Texto atualizado até a Emenda Constitucional nº 139, de 2026",
  effectiveThrough: "Emenda Constitucional nº 139, de 2026"
});

const maximumDownloadBytes = 25 * 1024 * 1024;
const chunkingScope = createCondominiumId("00000000-0000-4000-8000-000000000000");

type QueryClient = Pick<Client, "query">;

export type ConstitutionImportResult = Readonly<{
  status: "imported" | "unchanged";
  sourceId: string;
  versionId: string;
  versionNumber: number;
  pageCount: number;
  chunkCount: number;
  contentSha256: string;
}>;

export async function downloadOfficialConstitution(
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch
): Promise<Buffer> {
  const url = new URL(constitutionSource.officialUrl);
  if (url.protocol !== "https:" || url.hostname !== "www2.camara.leg.br") {
    throw new Error("A fonte da Constituição deve permanecer no domínio oficial da Câmara.");
  }

  const response = await fetchImplementation(url, {
    headers: {
      accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9",
      referer: "https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 AlvitraLegalImporter/1.0"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`A Câmara retornou HTTP ${response.status} ao baixar a Constituição.`);
  }

  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > maximumDownloadBytes) {
    throw new Error("O PDF oficial excede o limite seguro de importação.");
  }

  const content = Buffer.from(await response.arrayBuffer());
  if (content.length === 0 || content.length > maximumDownloadBytes) {
    throw new Error("O tamanho do PDF oficial é inválido para importação.");
  }
  if (!content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("A fonte oficial não retornou um PDF válido.");
  }
  return content;
}

export async function importBrazilianConstitution(
  client: QueryClient,
  content: Buffer
): Promise<ConstitutionImportResult> {
  const contentSha256 = createHash("sha256").update(content).digest("hex");
  const pages = await extractPdfTextByPage(content);
  if (pages.length === 0 || pages.some((page) => page.extractedText.trim().length === 0)) {
    throw new Error("O PDF oficial não possui texto verificável em todas as páginas.");
  }

  const embeddingAdapter = createLocalSyntheticEmbeddingAdapter();
  const preparedPages = await Promise.all(
    pages.map(async (page) => {
      const pageId = randomUUID();
      const chunks = chunkPage({
        condominiumId: chunkingScope,
        documentVersionId: "legal-version",
        documentPageId: pageId,
        pageNumber: page.pageNumber,
        extractedText: page.extractedText
      });
      const embeddedChunks = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          id: randomUUID(),
          embedding: await embeddingAdapter.embed({
            content: chunk.content,
            contentSha256: chunk.contentSha256
          })
        }))
      );
      return Object.freeze({ page, pageId, chunks: Object.freeze(embeddedChunks) });
    })
  );

  await client.query("BEGIN");
  try {
    await client.query(
      `
        INSERT INTO app.legal_sources (
          id, title, source_type, jurisdiction, issuing_authority,
          official_url, status
        )
        VALUES ($1, $2, 'legislation', 'BR', $3, $4, 'active')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          issuing_authority = EXCLUDED.issuing_authority,
          official_url = EXCLUDED.official_url,
          status = 'active',
          updated_at = now()
      `,
      [
        constitutionSource.id,
        constitutionSource.title,
        constitutionSource.issuingAuthority,
        constitutionSource.officialUrl
      ]
    );
    await client.query("SELECT id FROM app.legal_sources WHERE id = $1 FOR UPDATE", [
      constitutionSource.id
    ]);

    const existing = await client.query<{
      id: string;
      version_number: number | string;
      page_count: number | string;
      chunk_count: number | string;
    }>(
      `
        SELECT version.id, version.version_number,
          (SELECT count(*) FROM app.legal_source_pages AS page
            WHERE page.legal_source_version_id = version.id) AS page_count,
          (SELECT count(*) FROM app.legal_source_chunks AS chunk
            WHERE chunk.legal_source_version_id = version.id) AS chunk_count
        FROM app.legal_source_versions AS version
        WHERE version.legal_source_id = $1 AND version.content_sha256 = $2
        LIMIT 1
      `,
      [constitutionSource.id, contentSha256]
    );
    const existingVersion = existing.rows[0];
    if (existingVersion !== undefined) {
      await client.query(
        `
          UPDATE app.legal_source_versions
          SET is_current = (id = $2)
          WHERE legal_source_id = $1
        `,
        [constitutionSource.id, existingVersion.id]
      );
      await client.query("COMMIT");
      return Object.freeze({
        status: "unchanged" as const,
        sourceId: constitutionSource.id,
        versionId: existingVersion.id,
        versionNumber: Number(existingVersion.version_number),
        pageCount: Number(existingVersion.page_count),
        chunkCount: Number(existingVersion.chunk_count),
        contentSha256
      });
    }

    const versionNumberResult = await client.query<{ next_version: number | string }>(
      `
        SELECT COALESCE(max(version_number), 0) + 1 AS next_version
        FROM app.legal_source_versions
        WHERE legal_source_id = $1
      `,
      [constitutionSource.id]
    );
    const versionNumber = Number(versionNumberResult.rows[0]?.next_version ?? 1);
    const versionId = randomUUID();

    await client.query(
      "UPDATE app.legal_source_versions SET is_current = false WHERE legal_source_id = $1",
      [constitutionSource.id]
    );
    await client.query(
      `
        INSERT INTO app.legal_source_versions (
          id, legal_source_id, version_number, version_label, content_sha256,
          media_type, size_bytes, effective_through, is_current
        )
        VALUES ($1, $2, $3, $4, $5, 'application/pdf', $6, $7, true)
      `,
      [
        versionId,
        constitutionSource.id,
        versionNumber,
        constitutionSource.versionLabel,
        contentSha256,
        content.length,
        constitutionSource.effectiveThrough
      ]
    );

    let chunkCount = 0;
    for (const prepared of preparedPages) {
      await client.query(
        `
          INSERT INTO app.legal_source_pages (
            id, legal_source_version_id, page_index, page_number,
            extracted_text, extraction_method, quality_score, content_sha256
          )
          VALUES ($1, $2, $3, $4, $5, 'pdf_text', $6, $7)
        `,
        [
          prepared.pageId,
          versionId,
          prepared.page.pageIndex,
          prepared.page.pageNumber,
          prepared.page.extractedText,
          prepared.page.qualityScore,
          prepared.page.contentSha256
        ]
      );

      for (const chunk of prepared.chunks) {
        await client.query(
          `
            INSERT INTO app.legal_source_chunks (
              id, legal_source_version_id, legal_source_page_id, chunk_index,
              start_offset, end_offset, content, content_sha256, token_count,
              search_vector, embedding_profile, embedding
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              to_tsvector('portuguese', $7), $10, $11::vector
            )
          `,
          [
            chunk.id,
            versionId,
            prepared.pageId,
            chunk.chunkIndex,
            chunk.startOffset,
            chunk.endOffset,
            chunk.content,
            chunk.contentSha256,
            chunk.tokenCount,
            embeddingAdapter.profile.embeddingProfile,
            formatPgVector(chunk.embedding.values)
          ]
        );
        chunkCount += 1;
      }
    }

    await client.query("COMMIT");
    return Object.freeze({
      status: "imported" as const,
      sourceId: constitutionSource.id,
      versionId,
      versionNumber,
      pageCount: pages.length,
      chunkCount,
      contentSha256
    });
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Mantém o erro original da importação.
    }
    throw error;
  }
}

async function run(): Promise<void> {
  const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  const client = new Client({ connectionString: databaseUrl.toString() });
  await client.connect();
  try {
    const content = await downloadOfficialConstitution();
    const result = await importBrazilianConstitution(client, content);
    console.log(
      `${result.status === "imported" ? "Constituição importada" : "Constituição já atualizada"}: ` +
        `${result.pageCount} páginas, ${result.chunkCount} trechos, versão ${result.versionNumber}.`
    );
  } finally {
    await client.end();
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}
