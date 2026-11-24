import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  cacheDir: `.local/pilot-security/vite-cache-${process.pid}`,
  test: {
    include: [
      "tests/unit/login-attempt-limit.test.ts",
      "tests/unit/operation-budget.test.ts",
      "tests/unit/access-code.test.ts",
      "tests/unit/access-code-cli.test.ts",
      "tests/unit/access-session.test.ts",
      "tests/unit/conversation-store.test.ts",
      "tests/unit/conversation-timeline.test.ts",
      "tests/e2e/access-code-abuse.e2e.test.ts",
      "tests/e2e/access-code-continuity.e2e.test.ts",
      "tests/e2e/access-code.e2e.test.ts"
    ],
    coverage: { enabled: false }
  }
});
