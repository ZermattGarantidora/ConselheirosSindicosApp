import { mkdir, writeFile } from "node:fs/promises";
import { createDraftPdf } from "../apps/api/authoring/draft-pdf.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
import { renderSemanticMinutes } from "../apps/api/authoring/semantic-minutes-renderer.js";
import {
  validateMinutesPlan,
  validateMinutesReview,
  semanticHash
} from "../apps/api/authoring/semantic-minutes-contract.js";
import {
  syntheticMinutesInput,
  syntheticMinutesPlan,
  acceptedMinutesReview
} from "../tests/fixtures/semantic-minutes.js";
await mkdir(".local/authoring/semantic-pdf", { recursive: true });
const results = [];
for (const mode of ["dictation", "meeting"] as const) {
  const input = syntheticMinutesInput(mode),
    plan = validateMinutesPlan(syntheticMinutesPlan(input), input);
  validateMinutesReview(
    acceptedMinutesReview(plan, semanticHash(input), input.segments.length),
    plan,
    input,
    semanticHash(input)
  );
  const draft = renderSemanticMinutes(input, plan),
    bytes = createDraftPdf(draft, 1),
    pages = await extractPdfTextByPage(bytes),
    text = pages.map((p) => p.extractedText).join(" ");
  for (const phrase of [
    "não foi submetida a votação",
    "Rejeição relatada",
    "Deliberação adiada",
    "Conferir trecho incerto",
    "SHA-256 do original"
  ]) {
    // Quebras do PDF podem separar palavras, mas não podem remover conteúdo.
    if (!text.replace(/\s+/gu, " ").includes(phrase)) throw new Error(`Trecho ausente: ${phrase}`);
  }
  if (text.includes("O café está bom")) throw new Error("Transcrição bruta usada como ata.");
  await writeFile(`.local/authoring/semantic-pdf/ata-${mode}.pdf`, bytes);
  results.push({ mode, pages: pages.length, bytes: bytes.length });
}
process.stdout.write(
  JSON.stringify({
    syntheticOnly: true,
    realProviderCalls: 0,
    scriptedSemanticOutputs: true,
    results
  }) + "\n"
);
