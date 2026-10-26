type ConsultationSection = Readonly<{ locator: string; text: string }>;

function wrapText(value: string, width = 100): string[] {
  return value.split(/\r?\n/u).flatMap((paragraph) => {
    if (paragraph.trim().length === 0) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of paragraph.trim().split(/\s+/u)) {
      if (word.length > width) throw new Error("Palavra excede a largura da cópia de consulta.");
      if (current.length + word.length + 1 > width) {
        lines.push(current);
        current = word;
      } else current = current.length === 0 ? word : `${current} ${word}`;
    }
    lines.push(current);
    return lines;
  });
}

function encodeText(value: string): string {
  if (Array.from(value).some((character) => character.codePointAt(0)! > 255)) {
    throw new Error(
      "Caractere não suportado na cópia de consulta; não substituir silenciosamente."
    );
  }
  return Buffer.from(value, "latin1").toString("hex");
}

/** PDF derivado, com páginas reais e texto WinAnsi; nunca é rotulado como publicação oficial. */
export function createConsultationPdf(
  input: Readonly<{
    title: string;
    officialUrl: string;
    verifiedAt: string;
    reviewDueAt: string;
    limitation: string;
    sections: readonly ConsultationSection[];
  }>
): Readonly<{ content: Buffer; locators: readonly string[] }> {
  if (input.sections.length === 0) throw new Error("A cópia exige ao menos um recorte.");
  const pageLines: string[][] = [];
  const locators: string[] = [];
  for (const section of input.sections) {
    if (section.text.trim().length === 0) throw new Error("Recorte vazio.");
    const header = [
      "ALVITRA - COPIA DE CONSULTA - PAGINACAO PROPRIA",
      ...wrapText(input.title),
      `Conferencia: ${input.verifiedAt} | Revisao: ${input.reviewDueAt} (limite exclusivo)`,
      ...wrapText(`Origem oficial: ${input.officialUrl}`, 110),
      ...wrapText(`Dispositivo: ${section.locator}`),
      ...wrapText(`Limites: ${input.limitation}`),
      "TEXTO DO RECORTE"
    ];
    const availableLines = 64 - header.length - 3;
    if (availableLines < 10) throw new Error("Metadados excedem a área segura da página.");
    const body = wrapText(section.text);
    for (let offset = 0; offset < body.length; offset += availableLines) {
      pageLines.push([
        ...header,
        ...body.slice(offset, offset + availableLines),
        "FIM DO RECORTE",
        `Pagina ${pageLines.length + 1} da copia Alvitra; consulte a origem para o texto integral.`
      ]);
      locators.push(section.locator);
    }
  }
  const pageCount = pageLines.length;
  const fontObject = 3 + pageCount * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageLines.map((_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...pageLines.map(
      (_, index) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${3 + pageCount + index} 0 R >>`
    ),
    ...pageLines.map((lines) => {
      const stream = `BT /F1 8 Tf 10.8 TL 32 806 Td\n${lines.map((line) => `<${encodeText(line)}> Tj T*`).join("\n")}\nET`;
      return `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startXref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return Object.freeze({ content: Buffer.from(pdf), locators: Object.freeze(locators) });
}
