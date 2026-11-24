import { describe, expect, it, vi } from "vitest";

const { poolEnds } = vi.hoisted(() => ({ poolEnds: vi.fn() }));

vi.mock("pg", () => ({
  Pool: class {
    async connect() {
      return {
        async query() {
          return { rows: [], rowCount: 0 };
        },
        release() {}
      };
    }

    async end() {
      poolEnds();
    }
  }
}));

import {
  startPersistentWorker,
  startPersistentWorkerFromEnvironment,
  startContinuousWorkerFromEnvironment
} from "../../apps/api/worker/worker.js";

describe("worker persistido", () => {
  it("AC-6901: worker contínuo fecha seu pool uma vez ao encerrar", async () => {
    const before = poolEnds.mock.calls.length;
    const controller = new AbortController();
    controller.abort();
    await expect(
      startContinuousWorkerFromEnvironment(controller.signal, {
        DATABASE_URL: "postgresql://synthetic:synthetic@localhost/synthetic"
      })
    ).resolves.toBe(0);
    expect(poolEnds.mock.calls.length - before).toBe(1);
  });
  it("exige uma conexão quando iniciado pelo ambiente", async () => {
    await expect(startPersistentWorkerFromEnvironment({})).rejects.toThrow("DATABASE_URL");
  });

  it("fecha o pool quando não há job disponível", async () => {
    const before = poolEnds.mock.calls.length;
    await expect(startPersistentWorker("postgresql://synthetic", {})).resolves.toBe("idle");

    await expect(
      startPersistentWorkerFromEnvironment({
        DATABASE_URL: "postgresql://synthetic",
        DOCUMENT_STORAGE_ROOT: ""
      })
    ).resolves.toBe("idle");
    expect(poolEnds.mock.calls.length - before).toBe(2);
  });
});
