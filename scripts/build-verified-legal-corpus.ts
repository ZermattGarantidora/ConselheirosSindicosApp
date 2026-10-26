import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { curatedLegalSources } from "../apps/api/legislation/curated-source-texts.js";
import { createConsultationPdf } from "../apps/api/legislation/consultation-pdf.js";
import {
  legalContentHash,
  legalContentId,
  validateLegalEdition
} from "../apps/api/legislation/legal-edition-contract.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";

const verifiedAt = "2026-10-22";
const reviewDueAt = "2026-11-21";
const sources = [];
for (const source of curatedLegalSources) {
  const copy = createConsultationPdf({ ...source, verifiedAt, reviewDueAt });
  const extractedPages = await extractPdfTextByPage(copy.content);
  const pdfSha256 = legalContentHash(copy.content);
  const pages = extractedPages.map((page, index) => {
    const marker = "TEXTO DO RECORTE";
    const start = page.extractedText.indexOf(marker) + marker.length;
    const end = page.extractedText.lastIndexOf("FIM DO RECORTE");
    if (start < marker.length || end <= start)
      throw new Error("PDF sem delimitadores verificáveis.");
    const body = page.extractedText.slice(start, end);
    const startOffset =
      Array.from(page.extractedText.slice(0, start)).length + body.length - body.trimStart().length;
    return {
      pageNumber: page.pageNumber,
      locator: copy.locators[index]!,
      text: page.extractedText,
      textSha256: page.contentSha256,
      startOffset,
      endOffset:
        Array.from(page.extractedText.slice(0, end)).length - (body.length - body.trimEnd().length)
    };
  });
  // Cada dispositivo capturado precisa sobreviver à paginação e extração sem reescrita.
  for (const section of source.sections) {
    const extracted = pages
      .filter((page) => page.locator === section.locator)
      .map((page) => Array.from(page.text).slice(page.startOffset, page.endOffset).join(""))
      .join(" ");
    if (extracted.replace(/\s+/gu, " ").trim() !== section.text.replace(/\s+/gu, " ").trim()) {
      throw new Error(`Recorte alterado na cópia: ${source.key} / ${section.locator}`);
    }
  }
  sources.push({
    id: legalContentId(`alvitra:legal:${source.key}`),
    versionId: legalContentId(
      `alvitra:legal:${JSON.stringify(source)}:${verifiedAt}:${reviewDueAt}:${pdfSha256}`
    ),
    title: `${source.title} - copia de consulta Alvitra (${verifiedAt})`,
    officialUrl: source.officialUrl,
    issuingAuthority: "Presidência da República / Portal do Planalto",
    jurisdiction: "BR" as const,
    verifiedAt,
    reviewDueAt,
    relatedLaws: [...source.relatedLaws],
    limitation: source.limitation,
    capturedTextSha256: legalContentHash(JSON.stringify(source.sections)),
    pdfSha256,
    pdfBase64: copy.content.toString("base64"),
    pages
  });
}
const payload = { edition: verifiedAt, sources };
const edition = validateLegalEdition({
  payload,
  payloadSha256: legalContentHash(JSON.stringify(payload))
});
const destination = new URL("../apps/api/legislation/verified-legal-edition.ts", import.meta.url);
const generated = `// Gerado por scripts/build-verified-legal-corpus.ts; não editar manualmente.\nexport const verifiedLegalEdition = ${JSON.stringify(edition, null, 2)} as const;\n`;
await writeFile(
  destination,
  await format(generated, {
    ...(await resolveConfig(fileURLToPath(destination))),
    parser: "typescript"
  })
);
console.log(
  `Edição ${verifiedAt}: ${sources.length} fontes, ${sources.reduce((sum, source) => sum + source.pages.length, 0)} páginas conferíveis.`
);
