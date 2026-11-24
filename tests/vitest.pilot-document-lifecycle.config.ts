import { defineConfig } from "vitest/config";
const directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY;
if (!directory || process.env.PILOT_RECOVERY_CONFIRMATION !== "synthetic-local-only")
  throw new Error("Somente ensaio local guardado.");
export default defineConfig({
  envDir: false,
  cacheDir: `${directory}/cache`,
  test: {
    include: ["tests/isolated/document-lifecycle-postgres.test.ts"],
    fileParallelism: false,
    testTimeout: 180000,
    hookTimeout: 60000,
    reporters: ["default", "json", "junit"],
    outputFile: {
      json: `${directory}/document-lifecycle-tests.json`,
      junit: `${directory}/junit.xml`
    },
    coverage: { enabled: false }
  }
});
