import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createCondominiumId } from "../../dist/api/core/condominium-scope.js";
import { createDevelopmentDocumentMemory } from "../../dist/api/documents/development-document-memory.js";
import {
  resolveAuthorizedCondominiumContext,
  createUserId
} from "../../dist/api/identity/authorized-condominium-context.js";
import { createDevelopmentIdentityRepository } from "../../dist/api/identity/development-identity-repository.js";
import { createScopedTextRetriever } from "../../dist/api/retrieval/text-retrieval.js";

const directory = process.argv[2];
assert(directory);
const content = await readFile(`${directory}/document.pdf`);
const document = JSON.parse(await readFile(`${directory}/expected.json`, "utf8"));
const memory = createDevelopmentDocumentMemory();
const context = await resolveAuthorizedCondominiumContext(createDevelopmentIdentityRepository(), {
  userId: createUserId("sindico-demo"),
  condominiumId: createCondominiumId("alameda"),
  now: new Date("2026-11-05T12:00:00.000Z")
});
const started = performance.now();
const status = await memory.indexUploaded({
  record: {
    condominiumId: context.condominiumId,
    documentId: "long-document",
    documentVersionId: "long-version",
    storageObjectId: "long-original",
    storageKey: "synthetic-long-original",
    uploadedByUserId: context.userId,
    validityStatus: "confirmed",
    documentType: "other",
    mediaType: "application/pdf",
    title: document.title,
    sizeBytes: content.length,
    contentSha256: createHash("sha256").update(content).digest("hex"),
    processingStatus: "uploaded"
  },
  content,
  validityConfirmed: true
});
const indexingMs = performance.now() - started;
assert.equal(status, "ready");
const [indexed] = await memory.analysisReader.readAuthorized(context, ["long-version"]);
assert.equal(indexed?.pages.length, 300);
for (const [index, page] of document.pages.entries())
  assert.equal(indexed.pages[index].extractedText, page.expectedText);
const retriever = createScopedTextRetriever(memory.index);
const queries = [];
for (const pass of ["cold", "warm"]) {
  for (const pageNumber of [1, 150, 300]) {
    const probe = document.pages[pageNumber - 1].probes[2];
    const start = performance.now();
    const result = await retriever.search(context, { query: probe.question });
    queries.push({ page: pageNumber, elapsedMs: performance.now() - start, pass });
    assert(
      result.evidence.some(
        (item) => item.pageNumber === pageNumber && item.content.includes(probe.statement)
      )
    );
  }
}
const peakRssMiB = process.resourceUsage().maxRSS / 1024;
const report = {
  schemaVersion: 1,
  runtime: "compiled-node",
  syntheticOnly: true,
  pageCount: indexed.pages.length,
  sizeBytes: content.length,
  characters: indexed.pages.reduce((sum, page) => sum + page.extractedText.length, 0),
  indexingMs,
  queries,
  peakRssMiB,
  thresholds: { indexingMs: 60_000, warmQueryMs: 5_000, peakRssMiB: 512 },
  passed:
    indexingMs <= 60_000 &&
    peakRssMiB < 512 &&
    queries.filter((item) => item.pass === "warm").every((item) => item.elapsedMs <= 5_000)
};
await mkdir("reports/long-pdf", { recursive: true });
await writeFile("reports/long-pdf/latest.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
