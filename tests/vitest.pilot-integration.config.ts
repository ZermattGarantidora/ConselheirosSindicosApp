import { defineConfig } from "vitest/config";

const runDirectory = `.local/pilot-security/integration-${Date.now()}-${process.pid}`;
export default defineConfig({
  envDir: false,
  cacheDir: `${runDirectory}/cache`,
  test: {
    fileParallelism: false,
    include: [
      "tests/unit/hosted-policy-continuity.test.ts",
      "tests/unit/hosted-budget-integration.test.ts",
      "tests/unit/api-operation-control.test.ts",
      "tests/unit/hosted-call-ledger.test.ts",
      "tests/unit/postgres-hosted-call-ledger.test.ts",
      "tests/unit/hosted-document-execution.test.ts",
      "tests/unit/hosted-document-processing.test.ts",
      "tests/unit/hosted-document-embedding.test.ts",
      "tests/unit/hosted-document-batch.test.ts",
      "tests/unit/hosted-document-startup.test.ts",
      "tests/unit/operation-budget.test.ts",
      "tests/e2e/photo-document-durable.e2e.test.ts",
      "tests/e2e/operation-budget-http.e2e.test.ts",
      "tests/e2e/hosted-worker-budget.e2e.test.ts",
      "tests/e2e/access-code-continuity.e2e.test.ts"
    ],
    reporters: ["default", "json", "junit"],
    outputFile: { json: `${runDirectory}/results.json`, junit: `${runDirectory}/junit.xml` },
    coverage: {
      enabled: false,
      provider: "v8",
      reportsDirectory: `${runDirectory}/coverage`,
      reporter: ["text", "json-summary"],
      include: [
        "apps/api/documents/hosted-document-execution.ts",
        "apps/api/documents/hosted-call-ledger.ts",
        "apps/api/security/hosted-operation-budget.ts"
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
