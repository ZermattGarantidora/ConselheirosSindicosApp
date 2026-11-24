import { documentLifecycleFixture } from "./document-lifecycle-postgres.js";
import { createPostgresProcessingJobQueue } from "../../apps/api/worker/postgres-processing-job-queue.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
const fixture = documentLifecycleFixture();
try {
  const result = await processOne(
    createPostgresProcessingJobQueue(fixture.worker),
    fixture.processor
  );
  console.info(
    JSON.stringify({ result, simulatedTransports: fixture.transports(), realProviderCalls: 0 })
  );
} catch (error) {
  console.error(
    JSON.stringify({
      result: "failed",
      errorType: error instanceof Error ? error.name : "unknown",
      simulatedTransports: fixture.transports(),
      realProviderCalls: 0
    })
  );
  process.exitCode = 1;
} finally {
  await fixture.close();
}
