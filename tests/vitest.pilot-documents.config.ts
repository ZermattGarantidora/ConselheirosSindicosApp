import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const runDirectory = resolve(
  ".local/pilot-documents-2026-11-09/extension",
  `${Date.now()}-${process.pid}`
);
export default defineConfig({
  envDir: false,
  cacheDir: `${runDirectory}/cache`,
  test: {
    fileParallelism: false,
    include: [
      "tests/unit/document-test-env.test.ts",
      "tests/unit/conversation-receipt.test.ts",
      "tests/unit/conversation-receipt-contract.test.ts",
      "tests/unit/postgres-document-lifecycle.test.ts",
      "tests/unit/postgres-document-retention-repository.test.ts",
      "tests/unit/document-lifecycle-restore.test.ts",
      "tests/e2e/journal-policy-replay.e2e.test.ts",
      "tests/e2e/question-source-replay.e2e.test.ts",
      "tests/e2e/evidence-continuity.e2e.test.ts",
      "tests/unit/document-recovery-controls.test.ts",
      "tests/unit/hosted-call-ledger.test.ts",
      "tests/unit/hosted-policy-continuity.test.ts",
      "tests/unit/hosted-budget-integration.test.ts",
      "tests/unit/api-operation-control.test.ts",
      "tests/unit/postgres-hosted-call-ledger.test.ts",
      "tests/unit/photo-document-ocr.test.ts",
      "tests/unit/hosted-document-embedding.test.ts",
      "tests/unit/hosted-document-execution.test.ts",
      "tests/unit/hosted-document-processing.test.ts",
      "tests/unit/hosted-document-batch.test.ts",
      "tests/unit/hosted-document-startup.test.ts",
      "tests/unit/hosted-transport-preconditions.test.ts",
      "tests/unit/openai-ocr.test.ts",
      "tests/unit/openai-visual-image.test.ts",
      "tests/unit/openai-answer-gateway.test.ts",
      "tests/unit/document-processing.test.ts",
      "tests/unit/document-batch-conversation.test.ts",
      "tests/unit/ocr-consistency.test.ts",
      "tests/unit/ocr-quality.test.ts",
      "tests/unit/processing-worker.test.ts",
      "tests/unit/persistent-worker.test.ts",
      "tests/unit/upload-document.test.ts",
      "tests/unit/conversation-store.test.ts",
      "tests/unit/worker-processing-ownership.test.ts",
      "tests/unit/development-document-memory.test.ts",
      "tests/unit/postgres-document-adapters.test.ts",
      "tests/unit/persist-document-pages.test.ts",
      "tests/e2e/photo-document-durable.e2e.test.ts",
      "tests/e2e/operation-budget-http.e2e.test.ts",
      "tests/e2e/hosted-worker-budget.e2e.test.ts",
      "tests/e2e/full-page-document-ingestion.e2e.test.ts",
      "tests/e2e/document-ingestion.e2e.test.ts",
      "tests/e2e/document-answer.e2e.test.ts",
      "tests/e2e/document-summary-continuation.e2e.test.ts"
    ],
    reporters: ["default", "json", "junit"],
    outputFile: { json: `${runDirectory}/results.json`, junit: `${runDirectory}/junit.xml` },
    coverage: {
      enabled: false,
      provider: "v8",
      reportsDirectory: `${runDirectory}/coverage-unit`,
      reporter: ["text", "json-summary"],
      include: [
        "apps/api/documents/postgres-document-retention-repository.ts",
        "apps/api/app/journal-replay-proof.ts",
        "apps/api/documents/synthetic-document-recovery-journal.ts",
        "apps/api/documents/document-recovery-controls.ts",
        "apps/api/documents/postgres-document-lifecycle.ts",
        "apps/api/documents/synthetic-document-decisions.ts",
        "apps/api/app/operation-control.ts",
        "apps/api/documents/hosted-call-ledger.ts",
        "apps/api/documents/synthetic-file-hosted-call-ledger.ts",
        "apps/api/documents/postgres-hosted-call-ledger.ts",
        "apps/api/documents/photo-document-pdf.ts",
        "apps/api/documents/hosted-document-execution.ts",
        "apps/api/documents/hosted-document-processing.ts",
        "apps/api/documents/hosted-document-embedding.ts",
        "apps/api/answers/hosted-document-batch-gateway.ts"
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
