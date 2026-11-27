import { defineConfig } from "vitest/config";

const directory = `.local/persistent-runtime/tests-${Date.now()}-${process.pid}`;
export default defineConfig({
  envDir: false,
  cacheDir: `${directory}/cache`,
  test: {
    include: [
      "tests/unit/persistent-execution.test.ts",
      "tests/unit/persistent-startup.test.ts",
      "tests/unit/postgres-runtime-query.test.ts"
    ],
    reporters: ["default", "json", "junit"],
    outputFile: { json: `${directory}/results.json`, junit: `${directory}/junit.xml` },
    coverage: {
      provider: "v8",
      reportsDirectory: `${directory}/coverage`,
      reporter: ["text", "json-summary"],
      include: [
        "apps/api/security/persistent-execution.ts",
        "apps/api/security/persistent-database.ts",
        "apps/api/identity/postgres-runtime-query.ts"
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
