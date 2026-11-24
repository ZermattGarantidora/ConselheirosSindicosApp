import { createBook, createLedger } from "../../evals/financial-dossier/corpus.js";
import { renderFullPagePdf } from "./full-page-documents.js";
/** Mesmo ledger/gabarito; PDF de fixture local, sem dependência de artefatos .local. */
export function financialCorpusPdf() {
  const book = createBook(createLedger());
  const pages = book.pages.map((p) => {
    const lines = p.lines.flatMap((line) => {
      const result: string[] = [];
      let rest = line;
      while (rest.length > 90) {
        const cut = rest.lastIndexOf(" ", 90);
        if (cut < 1) throw new Error("Linha sintética longa sem separação.");
        result.push(rest.slice(0, cut));
        rest = rest.slice(cut + 1);
      }
      return [...result, rest];
    });
    return {
      lines: [...lines, ...Array.from({ length: Math.max(0, 50 - lines.length) }, () => "")],
      expectedText: lines.join("\n"),
      probes: []
    };
  });
  return {
    book,
    pages,
    pdf: renderFullPagePdf({ id: "financial-300-v2", title: book.title, pageCount: 300, pages })
  };
}
