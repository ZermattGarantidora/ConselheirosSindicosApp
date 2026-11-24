import { mkdir, writeFile } from "node:fs/promises";
import { createDraftPdf } from "../apps/api/authoring/draft-pdf.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
const text =
  Array.from(
    { length: 90 },
    (_, i) => `Parágrafo ${i + 1}: FICTÍCIO. Ação de manutenção e revisão — valor de R$ 12,34.`
  ).join("\n") + "\nFIM DO TEXTO SINTÉTICO CONFIRMADO.";
const content = createDraftPdf(
  {
    title: "Convenção sintética — proposta de revisão",
    documentKind: "Convenção",
    operation: "revise",
    text,
    sources: [],
    changes: "Somente exemplo sintético de diagramação.",
    pending: "Revisar com assessoria jurídica; não é documento aprovado."
  },
  1
);
const pages = await extractPdfTextByPage(content);
if (
  !pages
    .map((page) => page.extractedText)
    .join(" ")
    .includes("FIM DO TEXTO SINTÉTICO CONFIRMADO")
)
  throw new Error("Texto final ausente.");
await mkdir(".local/authoring/pdf", { recursive: true });
await writeFile(".local/authoring/pdf/rascunho-sintetico.pdf", content);
process.stdout.write(
  JSON.stringify({ pages: pages.length, bytes: content.length, syntheticOnly: true }) + "\n"
);
