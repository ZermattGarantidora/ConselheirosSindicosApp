import { defineConfig } from "vitest/config";

const directory = process.env.PILOT_LOCAL_REPORT_DIRECTORY;
if (!directory) throw new Error("Diretório exclusivo do ensaio local ausente.");
export default defineConfig({
  envDir: false,
  cacheDir: `${directory}/cache`,
  test: {
    include: ["tests/integration/rls-tenant-isolation.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ["default", "json", "junit"],
    outputFile: { json: `${directory}/rls-result.json`, junit: `${directory}/rls-junit.xml` }
  }
});
