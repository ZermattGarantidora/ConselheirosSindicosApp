import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  cacheDir: `.local/pilot-security/budget-cache-${process.pid}`,
  test: {
    include: ["tests/unit/operation-budget.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "apps/api/security/operation-budget.ts",
        "apps/api/security/local-operation-budget-store.ts",
        "apps/api/security/postgres-operation-budget-store.ts"
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: `.local/pilot-security/budget-coverage-${process.pid}`,
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
