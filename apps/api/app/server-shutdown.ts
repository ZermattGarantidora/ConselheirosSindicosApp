type ShutdownSignal = "SIGINT" | "SIGTERM";
type SignalSource = {
  on(signal: ShutdownSignal, listener: () => void): unknown;
  removeListener(signal: ShutdownSignal, listener: () => void): unknown;
};

/** Aguarda o fechamento real; sinais repetidos não interrompem os hooks do Fastify. */
export function registerServerShutdown(
  close: () => Promise<unknown>,
  signals: SignalSource = process,
  onFailure: () => void = () => {
    console.error(JSON.stringify({ code: "server_shutdown_failed" }));
    process.exitCode = 1;
  }
): () => void {
  let closing = false;
  const detach = () => {
    signals.removeListener("SIGINT", stop);
    signals.removeListener("SIGTERM", stop);
  };
  const stop = () => {
    if (closing) return;
    closing = true;
    void Promise.resolve().then(close).catch(onFailure).finally(detach);
  };
  signals.on("SIGINT", stop);
  signals.on("SIGTERM", stop);
  return detach;
}
