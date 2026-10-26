import assert from "node:assert/strict";
import { setInterval, clearInterval } from "node:timers";
import { setTimeout as pause } from "node:timers/promises";

const samples = [];
let peakResidentBytes = process.memoryUsage().rss;
const sample = (phase) => {
  const memory = process.memoryUsage();
  peakResidentBytes = Math.max(peakResidentBytes, memory.rss);
  samples.push({
    phase,
    rssMiB: Math.round(memory.rss / 1048576),
    heapMiB: Math.round(memory.heapUsed / 1048576)
  });
};
sample("before_import");
// Only the synthetic fixture uses Node 24's native type stripping; the server is compiled JS.
const { createSyntheticTextPdf, createSyntheticElectionMinutesPdf } =
  await import("../tests/fixtures/synthetic-pdfs.ts");
const { startServer } = await import("../dist/api/app/server.js");
sample("after_import");
const app = await startServer(0, {
  APP_ENV: "production",
  DEMO_MODE: "true",
  DEMO_SEED_DOCUMENTS: "false"
});
const timer = setInterval(() => {
  peakResidentBytes = Math.max(peakResidentBytes, process.memoryUsage().rss);
}, 10);
timer.unref();
const headers = { "x-development-user-id": "sindico-demo" };

try {
  sample("ready");
  assert.equal((await app.inject({ url: "/health" })).statusCode, 200);
  for (const [title, content] of [
    ["Documento sintético de duas páginas", createSyntheticTextPdf()],
    ["Ata sintética de eleição", createSyntheticElectionMinutesPdf()]
  ]) {
    const received = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(title),
        "x-document-type": "meeting_minutes",
        "x-document-validity-confirmed": "true"
      },
      payload: content
    });
    assert.equal(received.statusCode, 202);
    const versionId = received.json().documentVersionId;
    const deadline = Date.now() + 10_000;
    let status;
    do {
      const catalog = await app.inject({ url: "/v1/condominiums/alameda/documents", headers });
      assert.equal(catalog.statusCode, 200);
      status = catalog
        .json()
        .documents.find((document) => document.documentVersionId === versionId)?.processingStatus;
      if (["ready", "failed", "needs_review"].includes(status)) break;
      await pause(20);
    } while (Date.now() < deadline);
    assert.equal(status, "ready");
    const original = await app.inject({
      url: `/v1/condominiums/alameda/documents/${versionId}/file`,
      headers
    });
    assert.equal(original.statusCode, 200);
    assert.deepEqual(original.rawPayload, content);
  }
  sample("after_two_pdfs");
  for (let index = 0; index < 20; index += 1) {
    const answer = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers,
      payload: { question: "Quem foi eleita síndica e qual é o período do mandato?" }
    });
    assert.equal(answer.statusCode, 200);
    assert.ok(
      answer.json().citations.some((citation) => citation.title === "Ata sintética de eleição")
    );
  }
  sample("after_twenty_questions");
  console.log(
    JSON.stringify({
      verification: "compiled-production-runtime",
      dataPolicy: "synthetic-only",
      providerCalls: 0,
      documentsProcessed: 2,
      questionsAnswered: 20,
      peakRssMiB: Math.round(peakResidentBytes / 1048576),
      samples
    })
  );
} finally {
  clearInterval(timer);
  await app.close();
}
