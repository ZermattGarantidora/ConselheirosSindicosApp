import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: `.local/pilot-security/data-controls-cache-${process.pid}`,
  test: { include: ["tests/unit/synthetic-maintenance-plan.test.ts"], coverage: { enabled: false } }
});
