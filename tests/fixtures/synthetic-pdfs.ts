function escapePdfText(value: string): string {
  return value.replaceAll(/([()\\])/g, "\\$1");
}

function createSyntheticPdf(pages: readonly (string | null)[]): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    ...pages.map((_, index) => {
      const contentObjectNumber = pages.length + 3 + index;
      return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 ${pages.length + 3 + pages.length} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    }),
    ...pages.map((text) => {
      const stream =
        text === null
          ? "q 0 0 300 144 re S Q"
          : `BT /F1 12 Tf 72 72 Td (${escapePdfText(text)}) Tj ET`;
      return `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
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

export function createSyntheticTextPdf(): Buffer {
  return createSyntheticPdf(["Regra da primeira pagina", "Regra da segunda pagina"]);
}

export function createSyntheticScannedPdf(pageCount = 1): Buffer {
  return createSyntheticPdf(Array.from({ length: pageCount }, () => null));
}
