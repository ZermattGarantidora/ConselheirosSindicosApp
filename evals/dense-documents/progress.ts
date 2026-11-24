import { atomicJson } from "../full-page-documents/checkpoints.js";
/** Snapshot de progresso é secundário; resultados imutáveis já foram persistidos. */
export function createProgressWriter(
  path: string,
  write: (path: string, value: unknown) => Promise<void> = atomicJson,
  onDelayed: () => void = () => console.warn(JSON.stringify({ event: "progress_snapshot_delayed" }))
) {
  let queue = Promise.resolve();
  return (value: unknown) => {
    const next = queue.then(async () => {
      try {
        await write(path, value);
      } catch (error) {
        if (!["EPERM", "EBUSY"].includes(String((error as NodeJS.ErrnoException).code)))
          throw error;
        onDelayed();
      }
    });
    queue = next.catch(() => {});
    return next;
  };
}
