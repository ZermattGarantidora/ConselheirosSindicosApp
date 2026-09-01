import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { processOne } from "../../apps/api/worker/processing-worker.js";
import { startWorker } from "../../apps/api/worker/worker.js";

describe("worker de processamento", () => {
  it("fica ocioso quando não há job", async () => {
    await expect(startWorker()).resolves.toBe("idle");
  });

  it("repassa apenas IDs escopados ao processador", async () => {
    const received: unknown[] = [];

    const result = await processOne(
      {
        async claimNext() {
          return {
            jobId: "job-1",
            condominiumId: createCondominiumId("alameda"),
            documentVersionId: "version-1"
          };
        }
      },
      {
        async process(input) {
          received.push(input);
        }
      }
    );

    expect(result).toBe("processed");
    expect(received).toEqual([{ condominiumId: "alameda", documentVersionId: "version-1" }]);
  });
});
