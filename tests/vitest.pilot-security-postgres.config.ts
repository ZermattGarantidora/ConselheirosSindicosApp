import { defineConfig } from "vitest/config";
const runDirectory = `.local/pilot-security/postgres-${Date.now()}-${process.pid}`;
export default defineConfig({
  envDir: false,
  cacheDir: `${runDirectory}/cache`,
  test: {
    include: ["tests/isolated/pilot-security-postgres.test.ts"],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ["default", "json", "junit"],
    outputFile: { json: `${runDirectory}/results.json`, junit: `${runDirectory}/junit.xml` },
    coverage: { enabled: false }
  }
});
