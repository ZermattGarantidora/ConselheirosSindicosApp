import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  cacheDir: `.local/pilot-operations/vite-cache-${process.pid}`,
  test: {
    include: [
      "tests/unit/pilot-operations.test.ts",
      "tests/unit/pilot-recovery-docker.test.ts",
      "tests/unit/pilot-observation.test.ts",
      "tests/unit/local-integration-guard.test.ts",
      "tests/unit/synthetic-worker-database.test.ts",
      "tests/unit/pilot-local-lifecycle-runner.test.ts"
    ],
    coverage: {
      provider: "v8",
      include: [
        "scripts/pilot-preparation.ts",
        "scripts/pilot-recovery.ts",
        "scripts/pilot-recovery-docker.ts",
        "scripts/pilot-observation.ts",
        "scripts/local-integration-guard.ts",
        "scripts/synthetic-worker-database.ts"
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: `.local/pilot-operations/coverage-${process.pid}`,
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
