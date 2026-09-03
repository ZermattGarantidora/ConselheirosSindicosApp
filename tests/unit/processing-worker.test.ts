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
            documentVersionId: "version-1",
            attemptCount: 1
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
    expect(received).toEqual([
      { condominiumId: "alameda", documentVersionId: "version-1", jobId: "job-1", attemptCount: 1 }
    ]);
  });

  it("delega a falha ao repositório persistido e preserva o erro original", async () => {
    const failed: string[] = [];
    const expected = new Error("falha sintética");
    const job = {
      jobId: "job-1",
      condominiumId: createCondominiumId("alameda"),
      documentVersionId: "version-1",
      attemptCount: 1
    };

    await expect(
      processOne(
        {
          async claimNext() {
            return job;
          },
          async fail(failedJob) {
            failed.push(failedJob.jobId);
          }
        },
        {
          async process() {
            throw expected;
          }
        }
      )
    ).rejects.toBe(expected);

    expect(failed).toEqual(["job-1"]);
  });
});
