import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { drainProcessingQueue, processOne } from "../../apps/api/worker/processing-worker.js";
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

  it("drena todos os documentos disponíveis sem exigir execução manual por arquivo", async () => {
    const pending = ["version-1", "version-2"];
    const processed: string[] = [];

    const count = await drainProcessingQueue(
      {
        async claimNext() {
          const documentVersionId = pending.shift();
          return documentVersionId === undefined
            ? undefined
            : {
                jobId: `job-${documentVersionId}`,
                condominiumId: createCondominiumId("alameda"),
                documentVersionId,
                attemptCount: 1
              };
        }
      },
      {
        async process(input) {
          processed.push(input.documentVersionId);
        }
      }
    );

    expect(count).toBe(2);
    expect(processed).toEqual(["version-1", "version-2"]);
  });

  it("limita a drenagem para não monopolizar o processo", async () => {
    let claimed = 0;
    const count = await drainProcessingQueue(
      {
        async claimNext() {
          claimed += 1;
          return {
            jobId: `job-${claimed}`,
            condominiumId: createCondominiumId("alameda"),
            documentVersionId: `version-${claimed}`,
            attemptCount: 1
          };
        }
      },
      { async process() {} },
      2
    );

    expect(count).toBe(2);
    expect(claimed).toBe(2);
  });
});
