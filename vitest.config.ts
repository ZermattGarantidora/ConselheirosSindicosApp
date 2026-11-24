import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  test: {
    include: ["tests/{unit,e2e}/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "apps/api/**/*.ts",
        "apps/shared/document-use-decision.ts",
        "apps/shared/conversation-intent.ts"
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
