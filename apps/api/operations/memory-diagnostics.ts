export function startMemoryDiagnostics(
  report: (
    metrics: Readonly<{
      event: string;
      rssMiB: number;
      heapMiB: number;
      externalMiB: number;
      buffersMiB: number;
    }>
  ) => void = (metrics) => console.info(JSON.stringify(metrics)),
  usage: () => NodeJS.MemoryUsage = process.memoryUsage
): () => void {
  const sample = () => {
    const memory = usage();
    report({
      event: "server_memory",
      rssMiB: Math.round(memory.rss / 1048576),
      heapMiB: Math.round(memory.heapUsed / 1048576),
      externalMiB: Math.round(memory.external / 1048576),
      buffersMiB: Math.round(memory.arrayBuffers / 1048576)
    });
  };
  sample();
  const timer = setInterval(sample, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
