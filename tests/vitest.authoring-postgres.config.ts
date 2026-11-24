import { defineConfig } from "vitest/config";
const directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY;
if (!directory || process.env.PILOT_RECOVERY_CONFIRMATION !== "synthetic-local-only")
  throw new Error("Somente ensaio PostgreSQL sintético local guardado.");
export default defineConfig({
  envDir: false,
  cacheDir: `${directory}/authoring-cache`,
  test: {
    include: [
      "tests/isolated/authoring-postgres.test.ts",
      "tests/isolated/financial-report-postgres.test.ts"
    ],
    fileParallelism: false,
    testTimeout: 180000,
    coverage: { enabled: false }
  }
});
