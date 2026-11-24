import type { DocumentDraftContent } from "../../shared/document-draft.js";

const windowsCharacters = new Map(
  Array.from("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ").map((character, index) => [
    character,
    [
      128, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 142, 145, 146, 147, 148, 149, 150,
      151, 152, 153, 154, 155, 156, 158, 159
    ][index]!
  ])
);
function encoded(value: string): string {
  const bytes = Array.from(value, (character) => {
    const code = character.codePointAt(0)!;
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) return code;
    const mapped = windowsCharacters.get(character);
    if (mapped !== undefined) return mapped;
    throw new Error(
      "O PDF não suporta um dos caracteres. Revise o texto; nenhum caractere foi substituído."
    );
  });
  return Buffer.from(bytes).toString("hex");
}
function lines(value: string, width: number): string[] {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .flatMap((paragraph) => {
      if (!paragraph) return [""];
      const result: string[] = [];
      let rest = paragraph.replace(/\t/gu, "    ");
      while (rest.length > width) {
        const space = rest.lastIndexOf(" ", width);
        const cut = space > 0 ? space : width;
        result.push(rest.slice(0, cut));
        rest = rest.slice(space > 0 ? cut + 1 : cut);
      }
      result.push(rest);
      return result;
    });
}
/** Renderização determinística local. Não recebe nem executa HTML, links, fontes ou scripts. */
export function createDraftPdf(input: DocumentDraftContent, revision: number): Buffer {
  const title = lines(input.title, 65);
  const body = lines(input.text, 78);
  const references = [
    "REFERÊNCIAS E LIMITES",
    "Cópia para revisão humana. Não assinada nem aprovada.",
    "Texto selecionado e revisado pelo usuário; não comprova fatos ou deliberações.",
    ...(input.pending ? ["Pendências:", input.pending] : []),
    ...(input.changes ? ["Alterações propostas:", input.changes] : []),
    ...(input.authoringSource
      ? [
          `Origem: proposta documental ${input.authoringSource.proposalId}.`,
          `SHA-256 da proposta: ${input.authoringSource.proposalHash}`,
          `SHA-256 do conjunto integral de fontes: ${input.authoringSource.sourceHash}`,
          ...(input.authoringSource.hasUserReport
            ? [
                "Inclui relato declarado pelo usuário, sujeito à conferência; não é prova documental."
              ]
            : [])
        ]
      : []),
    ...(input.audioSource
      ? [
          `Origem: áudio ${input.audioSource.inputId}; modo ${input.audioSource.mode === "dictation" ? "relato do síndico" : "gravação de reunião"}; duração ${input.audioSource.durationSeconds} segundos. Referências temporais constam no texto.`,
          `SHA-256 do original: ${input.audioSource.originalSha256}`,
          `SHA-256 da transcrição: ${input.audioSource.transcriptSha256}`,
          "Relato/transcrição não comprovam aprovação, participantes, votos ou quórum."
        ]
      : []),
    ...(input.sources.length
      ? [
          "Localizadores: PDF e fotos usam páginas; Word usa blocos de leitura, sem paginação original."
        ]
      : []),
    ...input.sources.map(
      (source, index) =>
        `Fonte ${index + 1}: documento ${source.documentId}; versão ${source.documentVersionId}; localizador ${source.page}. Trecho: ${source.excerpt}`
    )
  ].flatMap((value) => lines(value, 78));
  const content = [...body, "", ...references];
  // Conferir o repertório antes de produzir qualquer arquivo.
  [...title, ...content].forEach(encoded);
  if (title.length > 4) throw new Error("Título excede a área disponível.");
  const capacity = 51 - title.length;
  const pages = Array.from({ length: Math.ceil(content.length / capacity) }, (_, i) =>
    content.slice(i * capacity, (i + 1) * capacity)
  );
  if (pages.length > 100)
    throw new Error("O rascunho excede 100 páginas. Divida o conteúdo explicitamente.");
  const count = pages.length;
  const font = 3 + 2 * count;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${count} /Kids [${pages.map((_, i) => `${3 + i} 0 R`).join(" ")}] >>`,
    ...pages.map(
      (_, i) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${3 + count + i} 0 R >>`
    ),
    ...pages.map((page, index) => {
      const header = [
        "ALVITRA · RASCUNHO PARA REVISÃO",
        ...title,
        ...lines(`Revisão ${revision} · ${input.documentKind}`, 78),
        ""
      ];
      const text = [...header, ...page];
      const stream = `BT /F1 10.5 Tf 13 TL 48 790 Td\n${text.map((line) => `<${encoded(line)}> Tj T*`).join("\n")}\nET\nBT /F1 9 Tf 48 36 Td <${encoded(`Página ${index + 1} de ${count} · Paginação própria · Original preservado`)}> Tj ET`;
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
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}
