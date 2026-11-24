import { startContinuousWorkerFromEnvironment } from "./worker.js";

const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  await startContinuousWorkerFromEnvironment(controller.signal, process.env, (diagnostic) => {
    console.info(JSON.stringify(diagnostic));
  });
} catch {
  console.error(JSON.stringify({ code: "worker_start_failed" }));
  process.exitCode = 1;
} finally {
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
