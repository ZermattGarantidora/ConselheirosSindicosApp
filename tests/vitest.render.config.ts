import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  cacheDir: `.local/render-paid/vite-cache-${process.pid}`,
  test: {
    include: [
      "tests/unit/canonical-origin.test.ts",
      "tests/unit/server-shutdown.test.ts",
      "tests/unit/server.test.ts",
      "tests/unit/pilot-operations.test.ts"
    ],
    coverage: {
      provider: "v8",
      include: [
        "apps/api/app/canonical-origin.ts",
        "apps/api/app/server-shutdown.ts",
        "scripts/pilot-preparation.ts"
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: `.local/render-paid/coverage-${process.pid}`,
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
