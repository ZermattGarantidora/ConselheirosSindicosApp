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
  startPersistentWorkerFromEnvironment
} from "../../apps/api/worker/worker.js";

describe("worker persistido", () => {
  it("exige uma conexão quando iniciado pelo ambiente", async () => {
    await expect(startPersistentWorkerFromEnvironment({})).rejects.toThrow("DATABASE_URL");
  });

  it("fecha o pool quando não há job disponível", async () => {
    await expect(
      startPersistentWorker("postgresql://synthetic", ".local/synthetic-documents", {})
    ).resolves.toBe("idle");

    await expect(
      startPersistentWorkerFromEnvironment({
        DATABASE_URL: "postgresql://synthetic",
        DOCUMENT_STORAGE_ROOT: ""
      })
    ).resolves.toBe("idle");
    expect(poolEnds).toHaveBeenCalledTimes(2);
  });
});
