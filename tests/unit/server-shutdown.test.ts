import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { registerServerShutdown } from "../../apps/api/app/server-shutdown.js";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("AC-6909 — encerramento da API", () => {
  it.each(["SIGTERM", "SIGINT"])("aguarda hooks e fecha uma vez após %s", async (signal) => {
    const signals = new EventEmitter();
    const pending = Promise.withResolvers<void>();
    const close = vi.fn(() => pending.promise);
    const failed = vi.fn();
    registerServerShutdown(close, signals, failed);
    signals.emit(signal);
    await flush();
    expect(close).toHaveBeenCalledTimes(1);
    signals.emit("SIGTERM");
    signals.emit("SIGINT");
    await flush();
    expect(close).toHaveBeenCalledTimes(1);
    expect(signals.listenerCount("SIGTERM")).toBe(1);
    expect(signals.listenerCount("SIGINT")).toBe(1);
    pending.resolve();
    await flush();
    expect(signals.listenerCount("SIGTERM")).toBe(0);
    expect(signals.listenerCount("SIGINT")).toBe(0);
    expect(failed).not.toHaveBeenCalled();
  });

  it("remove somente os próprios listeners e permite cancelamento explícito", () => {
    const signals = new EventEmitter();
    const unrelated = vi.fn();
    const close = vi.fn(async () => undefined);
    signals.on("SIGTERM", unrelated);
    const detach = registerServerShutdown(close, signals);
    detach();
    detach();
    signals.emit("SIGTERM");
    expect(unrelated).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it("registra no processo por padrão e permite remover sem emitir sinais reais", () => {
    const before = process.listenerCount("SIGTERM");
    const detach = registerServerShutdown(async () => undefined);
    expect(process.listenerCount("SIGTERM")).toBe(before + 1);
    detach();
    expect(process.listenerCount("SIGTERM")).toBe(before);
  });

  it.each([false, true])("trata falha de fechamento sem expor erro (síncrona=%s)", async (sync) => {
    const signals = new EventEmitter();
    const error = new Error("synthetic-private-connection-do-not-log");
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const previousExitCode = process.exitCode;
    try {
      registerServerShutdown(() => {
        if (sync) throw error;
        return Promise.reject(error);
      }, signals);
      signals.emit("SIGTERM");
      await flush();
      expect(output.mock.calls).toEqual([[JSON.stringify({ code: "server_shutdown_failed" })]]);
      expect(process.exitCode).toBe(1);
      expect(signals.listenerCount("SIGTERM")).toBe(0);
      expect(signals.listenerCount("SIGINT")).toBe(0);
    } finally {
      process.exitCode = previousExitCode;
      output.mockRestore();
    }
  });
});
