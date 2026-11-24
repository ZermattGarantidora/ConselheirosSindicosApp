import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: `.local/authoring/vite-cache-${process.pid}`,
  test: {
    experimental: {
      fsModuleCache: true,
      fsModuleCachePath: `.local/authoring/module-cache-${process.pid}`
    },
    include: [
      "tests/unit/document-drafts.test.ts",
      "tests/unit/authoring-operations.test.ts",
      "tests/unit/document-authoring.test.ts",
      "tests/unit/original-document-improvements.test.ts",
      "tests/unit/document-authoring-ui.test.ts",
      "tests/unit/document-improvements.test.ts",
      "tests/unit/document-draft-routes.test.ts",
      "tests/unit/docx-reading.test.ts",
      "tests/unit/audio-transcription.test.ts",
      "tests/unit/audio-inputs.test.ts",
      "tests/unit/audio-recovery-journal.test.ts",
      "tests/unit/audio-minutes.test.ts",
      "tests/unit/semantic-minutes-contract.test.ts",
      "tests/unit/semantic-minutes-model.test.ts",
      "tests/unit/audio-minutes-ui.test.ts",
      "tests/e2e/audio-minutes.e2e.test.ts",
      "tests/e2e/document-authoring.e2e.test.ts",
      "tests/e2e/document-proposals.e2e.test.ts",
      "tests/e2e/original-document-improvements.e2e.test.ts"
    ],
    coverage: { enabled: false }
  }
});
