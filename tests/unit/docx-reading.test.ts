import { expect, it } from "vitest";
import { docxMediaType, extractDocxText } from "../../apps/api/documents/extract-docx-text.js";
import { processDocumentVersion } from "../../apps/api/documents/document-processing.js";
import { assertDocumentContent } from "../../apps/api/documents/upload-document.js";
import { syntheticDocx } from "../fixtures/synthetic-authoring.js";
import { managerContext } from "./answer-fixtures.js";
it("AC-7305: lê parágrafos e tabela com locadores, entidades e sem páginas Word presumidas", () => {
  const doc = syntheticDocx(
    "<w:p><w:r><w:t>FICTÍCIO. Ação &amp; manutenção &#x20ac; 12,34.</w:t><w:tab/><w:t>Fim.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Voto sintético: abstenção.</w:t></w:r></w:p></w:tc></w:tr></w:tbl>"
  );
  expect(extractDocxText(doc)).toEqual({
    complete: false,
    limitations: [
      "Tabelas exigem conferência no original; a leitura por blocos não preserva relações entre células."
    ],
    blocks: [
      {
        locator: "Bloco 1 (sem paginação Word)",
        text: "FICTÍCIO. Ação & manutenção € 12,34.\tFim."
      },
      { locator: "Bloco 2 (sem paginação Word)", text: "Voto sintético: abstenção." }
    ]
  });
  expect(() => assertDocumentContent(doc, docxMediaType)).not.toThrow();
});
it("AC-7305: recursos não extraídos ficam needs_review sem consumo de OCR", async () => {
  const content = syntheticDocx(
    "<w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>FICTÍCIO. Texto.</w:t><w:drawing/></w:r></w:p>"
  );
  const result = await processDocumentVersion({
    condominiumId: managerContext.condominiumId,
    documentId: "doc",
    documentVersionId: "version",
    content,
    mediaType: docxMediaType,
    currentState: {
      processingStatus: "uploaded",
      validityStatus: "confirmed",
      validFrom: null,
      validUntil: null,
      ocrQualityScore: null
    }
  });
  expect(result.status).toBe("needs_review");
  expect(result.extractionSummary.extractionCompleteness).toBe(0);
  expect(result.pages[0]?.analysisLimitations).toContain("não são páginas do Word");
});
it("AC-7305: Word textual simples fica pronto com blocos verificáveis e sem OCR", async () => {
  const result = await processDocumentVersion({
    condominiumId: managerContext.condominiumId,
    documentId: "doc",
    documentVersionId: "version",
    content: syntheticDocx(),
    mediaType: docxMediaType,
    currentState: {
      processingStatus: "uploaded",
      validityStatus: "confirmed",
      validFrom: null,
      validUntil: null,
      ocrQualityScore: null
    },
    ocrAdapter: {
      recognize: async () => {
        throw new Error("OCR não deve ser chamado para Word.");
      }
    }
  });
  expect(result.status).toBe("completed");
  expect(result.extractionSummary.extractionCompleteness).toBe(1);
  expect(result.pages[0]).toMatchObject({
    extractionMethod: "docx_text",
    pageNumber: 1,
    qualityScore: 1
  });
  expect(result.pages[0]?.extractedText).toContain("Artigo 1: revisar em assembleia");
});
it.each([
  {
    "word/_rels/document.xml.rels":
      '<Relationships><Relationship Target="https://example.invalid" TargetMode="External"/></Relationships>'
  },
  { "word/vbaProject.bin": "x" },
  { "word/document.xml": '<!DOCTYPE x [<!ENTITY a SYSTEM "file:///secret">]><w:document/>' },
  { "word/document.xml": "<w:document><w:p><w:t>&unknown;</w:t></w:p></w:document>" },
  { "../outside.xml": "<x/>" },
  { "word/document.xml": "<w:document><w:p></w:document>" }
])("AC-7305: rejeita pacote ativo, externo ou XML não confiável %s", (extra) => {
  expect(() => extractDocxText(syntheticDocx(undefined, extra))).toThrow();
});
it("AC-7305: bloqueia CRC alterado, expansão excessiva, pacote truncado e criptografia", () => {
  const good = syntheticDocx();
  const corrupt = Buffer.from(good);
  corrupt[60] = corrupt[60]! ^ 1;
  const encrypted = Buffer.from(good);
  encrypted.writeUInt16LE(1, 6);
  const bomb = Buffer.from(good);
  const central = bomb.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  bomb.writeUInt32LE(0x7fffffff, central + 24);
  for (const bad of [Buffer.alloc(0), good.subarray(0, 100), corrupt, encrypted, bomb])
    expect(() => extractDocxText(bad)).toThrow();
});
