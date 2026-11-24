import { afterEach, describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { runContinuousDocumentWorker } from "../../apps/api/worker/continuous-worker.js";
import { continuousWorkerConfiguration } from "../../apps/api/worker/worker-configuration.js";
import type { ProcessingJob } from "../../apps/api/worker/processing-worker.js";

const job: ProcessingJob = {
  condominiumId: createCondominiumId("synthetic-worker"),
  documentVersionId: "synthetic-version",
  jobId: "synthetic-job",
  attemptCount: 1
};
const options = (signal: AbortSignal) => ({ signal, pollIntervalMs: 10, heartbeatIntervalMs: 20 });
const queue = () => ({
  claimNext: vi.fn<() => Promise<ProcessingJob | undefined>>().mockResolvedValue(undefined),
  renewLease: vi.fn().mockResolvedValue(true),
  fail: vi.fn().mockResolvedValue(undefined)
});

afterEach(() => vi.useRealTimers());

describe("Spec 069 — worker contínuo", () => {
  it("AC-6901: aguarda ociosidade, recebe novos documentos e encerra sem nova reserva", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const jobs = queue();
    jobs.claimNext.mockResolvedValueOnce(undefined).mockResolvedValueOnce(job);
    const process = vi.fn(async (input) => {
      expect(input).toMatchObject(job);
      controller.abort();
    });
    const run = runContinuousDocumentWorker(jobs, { process }, options(controller.signal));
    await vi.advanceTimersByTimeAsync(10);
    expect(await run).toBe(1);
    expect(jobs.claimNext).toHaveBeenCalledTimes(2);
    expect(process).toHaveBeenCalledTimes(1);
    expect(jobs.fail).not.toHaveBeenCalled();
  });

  it("AC-6901: sinal durante uma reserva termina a tarefa e não busca a próxima", async () => {
    const controller = new AbortController();
    const jobs = queue();
    jobs.claimNext.mockImplementation(async () => {
      controller.abort();
      return job;
    });
    const process = vi.fn(async () => undefined);
    expect(await runContinuousDocumentWorker(jobs, { process }, options(controller.signal))).toBe(
      1
    );
    expect(process).toHaveBeenCalledOnce();
    expect(jobs.claimNext).toHaveBeenCalledOnce();
  });

  it("AC-6901: sinal interrompe espera ociosa e diagnóstico não altera execução", async () => {
    const controller = new AbortController();
    const jobs = queue();
    const events: string[] = [];
    const run = runContinuousDocumentWorker(
      jobs,
      { process: vi.fn() },
      {
        ...options(controller.signal),
        onDiagnostic(event) {
          events.push(event.code);
          throw new Error("telemetria sintética indisponível");
        }
      }
    );
    await Promise.resolve();
    controller.abort();
    expect(await run).toBe(0);
    expect(events).toEqual(["worker_started", "worker_stopped"]);
  });

  it("AC-6902: renova tarefa ativa e aguarda conclusão durante encerramento", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const jobs = queue();
    jobs.claimNext.mockResolvedValue(job);
    let finish!: () => void;
    const process = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const run = runContinuousDocumentWorker(jobs, { process }, options(controller.signal));
    await vi.advanceTimersByTimeAsync(61);
    expect(jobs.renewLease).toHaveBeenCalledTimes(3);
    expect(jobs.renewLease).toHaveBeenCalledWith(job);
    expect(process).toHaveBeenCalledOnce();
    controller.abort();
    let stopped = false;
    void run.then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(20);
    expect(stopped).toBe(false);
    finish();
    expect(await run).toBe(1);
    expect(jobs.claimNext).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([false, new Error("conteúdo privado não deve ser registrado")])(
    "AC-6902: perda ou erro de renovação cancela a publicação e não expõe conteúdo (%s)",
    async (failure) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const jobs = queue();
      jobs.claimNext.mockResolvedValue(job);
      if (failure instanceof Error) jobs.renewLease.mockRejectedValue(failure);
      else jobs.renewLease.mockResolvedValue(failure);
      const diagnostics: unknown[] = [];
      const process = vi.fn(
        (input: ProcessingJob & { signal?: AbortSignal }) =>
          new Promise<void>((_, reject) => {
            input.signal!.addEventListener("abort", () => reject(input.signal!.reason), {
              once: true
            });
          })
      );
      jobs.fail.mockImplementation(async () => {
        controller.abort();
      });
      const run = runContinuousDocumentWorker(
        jobs,
        { process },
        {
          ...options(controller.signal),
          onDiagnostic: (event) => diagnostics.push(event)
        }
      );
      await vi.advanceTimersByTimeAsync(20);
      expect(await run).toBe(0);
      expect(jobs.fail).toHaveBeenCalledWith(job);
      expect(JSON.stringify(diagnostics)).toContain("worker_lease_lost");
      expect(JSON.stringify(diagnostics)).not.toContain("conteúdo privado");
    }
  );

  it("AC-6903: indisponibilidade da fila e falha de retentativa não encerram o daemon", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const jobs = queue();
    jobs.claimNext.mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValue(job);
    jobs.fail.mockRejectedValueOnce(new Error("retry unavailable"));
    let attempts = 0;
    const events: string[] = [];
    const run = runContinuousDocumentWorker(
      jobs,
      {
        process: async () => {
          if (++attempts === 1) throw new Error("processing unavailable");
          controller.abort();
        }
      },
      { ...options(controller.signal), onDiagnostic: (event) => events.push(event.code) }
    );
    await vi.advanceTimersByTimeAsync(30);
    expect(await run).toBe(1);
    expect(attempts).toBe(2);
    expect(events).toEqual(
      expect.arrayContaining([
        "worker_queue_failed",
        "worker_processing_failed",
        "worker_retry_failed"
      ])
    );
  });

  it("valida intervalos antes de consultar a fila e respeita sinal já encerrado", async () => {
    const controller = new AbortController();
    const jobs = queue();
    await expect(
      runContinuousDocumentWorker(
        jobs,
        { process: vi.fn() },
        {
          ...options(controller.signal),
          pollIntervalMs: 0
        }
      )
    ).rejects.toThrow("inteiros positivos");
    controller.abort();
    expect(
      await runContinuousDocumentWorker(jobs, { process: vi.fn() }, options(controller.signal))
    ).toBe(0);
    expect(jobs.claimNext).not.toHaveBeenCalled();
  });
});

describe("Spec 069 — configuração do worker separado", () => {
  const databaseUrl = "postgresql://synthetic:synthetic@localhost:5432/synthetic";
  it("aceita banco local e segredo próprio sem expor credencial", () => {
    expect(continuousWorkerConfiguration({ DATABASE_URL: databaseUrl })).toMatchObject({
      databaseUrl,
      pollIntervalMs: 1000,
      leaseSeconds: 300,
      heartbeatIntervalMs: 30_000
    });
    expect(
      continuousWorkerConfiguration({
        DOCUMENT_WORKER_DATABASE_URL: databaseUrl,
        DATABASE_URL: "invalid",
        DOCUMENT_WORKER_LEASE_SECONDS: "3"
      }).heartbeatIntervalMs
    ).toBe(1000);
    expect(
      continuousWorkerConfiguration({
        DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/db?sslmode=verify-full"
      }).databaseUrl
    ).toContain("verify-full");
    const certificate = "-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----";
    const secured = continuousWorkerConfiguration({
      DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/db?sslmode=verify-full",
      DOCUMENT_WORKER_SSL_CA: certificate
    });
    expect(secured.ssl).toEqual({ ca: certificate, rejectUnauthorized: true });
    expect(secured.databaseUrl).not.toContain("sslmode");
  });
  it.each([
    {},
    { DEMO_MODE: "true", DATABASE_URL: databaseUrl },
    { DATABASE_URL: "invalid" },
    { DATABASE_URL: "https://synthetic.invalid" },
    { DATABASE_URL: databaseUrl, DOCUMENT_WORKER_SSL_CA: "invalid" },
    { DATABASE_URL: "postgresql://synthetic:synthetic@synthetic.invalid/db" },
    { DATABASE_URL: databaseUrl, DOCUMENT_WORKER_POLL_MS: "NaN" },
    { DATABASE_URL: databaseUrl, DOCUMENT_WORKER_LEASE_SECONDS: "2" },
    { DATABASE_URL: databaseUrl, DOCUMENT_WORKER_HEARTBEAT_MS: "0" },
    {
      DATABASE_URL: databaseUrl,
      DOCUMENT_WORKER_HEARTBEAT_MS: "1500",
      DOCUMENT_WORKER_LEASE_SECONDS: "3"
    }
  ])("recusa configuração insegura ou inválida %j", (environment) => {
    expect(() => continuousWorkerConfiguration(environment)).toThrow();
  });
});
