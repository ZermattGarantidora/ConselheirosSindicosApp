import { describe, expect, it } from "vitest";

import {
  PdfTextExtractionError,
  extractPdfTextByPage
} from "../../apps/api/documents/extract-pdf-text.js";

function createTextPdf(): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length 48 >>\nstream\nBT /F1 12 Tf 72 72 Td (Regra da primeira pagina) Tj ET\nendstream",
    "<< /Length 47 >>\nstream\nBT /F1 12 Tf 72 72 Td (Regra da segunda pagina) Tj ET\nendstream"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const startXref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}

describe("extração de texto PDF", () => {
  it("preserva a ordem, a página humana e o hash de cada página", async () => {
    const pages = await extractPdfTextByPage(createTextPdf());

    expect(pages).toHaveLength(2);
    expect(pages).toMatchObject([
      { pageIndex: 0, pageNumber: 1, extractedText: "Regra da primeira pagina", qualityScore: 1 },
      { pageIndex: 1, pageNumber: 2, extractedText: "Regra da segunda pagina", qualityScore: 1 }
    ]);
    expect(pages[0]?.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falha de modo recuperável para conteúdo inválido", async () => {
    await expect(
      extractPdfTextByPage(Buffer.from("%PDF-not-a-real-document"))
    ).rejects.toBeInstanceOf(PdfTextExtractionError);
  });
});
