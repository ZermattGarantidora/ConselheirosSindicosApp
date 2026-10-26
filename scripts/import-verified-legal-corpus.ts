import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { createVerifiedLegalLibrary } from "../apps/api/legislation/verified-legal-library.js";
import { importOfficialLegalPdf } from "./import-brazilian-constitution.js";
import { parseDatabaseUrl } from "./database-migrations.js";

export async function importVerifiedLegalCorpus(client: Pick<Client, "query">, now = new Date()) {
  const sources = createVerifiedLegalLibrary().sources;
  if (
    sources.some(
      (source) => !(now >= new Date(source.verifiedAt) && now < new Date(source.reviewDueAt))
    )
  ) {
    throw new Error(
      "A conferência da edição legal expirou ou ainda não começou; reconfira as fontes antes de importar."
    );
  }
  const results = [];
  for (const source of sources) {
    results.push(
      await importOfficialLegalPdf(
        client,
        {
          id: source.id,
          versionId: source.versionId,
          title: source.title,
          issuingAuthority: source.issuingAuthority,
          officialUrl: source.officialUrl,
          versionLabel: `Recorte conferido em ${source.verifiedAt}; paginação da cópia Alvitra`,
          effectiveThrough: `Conferência de ${source.verifiedAt} até ${source.reviewDueAt}, exclusivo; não certifica vigência histórica ou futura.`,
          verifiedAt: source.verifiedAt,
          reviewDueAt: source.reviewDueAt,
          pageRanges: source.pages
        },
        Buffer.from(source.pdfBase64, "base64")
      )
    );
  }
  return Object.freeze(results);
}

async function run(): Promise<void> {
  const url = parseDatabaseUrl(process.env.DATABASE_URL);
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const results = await importVerifiedLegalCorpus(client);
    console.log(
      `Base legal: ${results.length} fontes, ${results.reduce((sum, result) => sum + result.pageCount, 0)} páginas; versões preservadas.`
    );
  } finally {
    await client.end();
  }
}
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href)
  await run();
