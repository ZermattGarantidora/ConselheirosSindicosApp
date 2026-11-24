import { describe, expect, it } from "vitest";
import { evaluatePilotObservation } from "../../scripts/pilot-observation.js";
const now = "2026-11-09T12:00:00.000Z";
const snapshot = () => ({
  version: 1,
  dataPolicy: "synthetic-only",
  observedAt: now,
  backupRpoSeconds: null as number | null,
  metrics: {
    queuedJobs: 0,
    oldestQueuedSeconds: 0,
    completedLastTenMinutes: 0,
    failedJobs: 0,
    expiredLeases: 0,
    originalsMismatch: 0,
    healthFailures: 0,
    isolationIncidents: 0,
    memoryRatio: 0.2,
    cpuRatio: 0.2,
    connectionsRatio: 0.2,
    diskRatio: 0.2,
    backupAgeSeconds: 100
  }
});
describe("Spec 070 AC-7007 — observação sintética sem notificações", () => {
  it("fila ociosa não dispara falha e limiares/RPO continuam sem aprovação", () => {
    expect(evaluatePilotObservation(snapshot(), now)).toMatchObject({
      alerts: [],
      missingSignals: [],
      pendingDecisions: ["backupRpo"],
      activationAuthorized: false,
      thresholdsApproved: false,
      networkCalls: 0,
      deliveredNotifications: 0
    });
  });
  it("detecta fila sem progresso, sem alarmar se houver conclusão recente ou atraso dentro do limiar", () => {
    const input = snapshot();
    input.metrics.queuedJobs = 1;
    input.metrics.oldestQueuedSeconds = 601;
    expect(evaluatePilotObservation(input, now).alerts).toContainEqual({
      code: "queue_without_progress",
      severity: "investigate"
    });
    input.metrics.completedLastTenMinutes = 1;
    expect(evaluatePilotObservation(input, now).alerts).toEqual([]);
    input.metrics.completedLastTenMinutes = 0;
    input.metrics.oldestQueuedSeconds = 600;
    expect(evaluatePilotObservation(input, now).alerts).toEqual([]);
  });
  it("dá prioridade de contenção a isolamento e original divergente; demais falhas exigem triagem", () => {
    const input = snapshot();
    Object.assign(input.metrics, {
      isolationIncidents: 1,
      originalsMismatch: 1,
      failedJobs: 1,
      expiredLeases: 1,
      healthFailures: 3
    });
    expect(evaluatePilotObservation(input, now).alerts).toEqual(
      expect.arrayContaining([
        { code: "isolation_incident", severity: "contain" },
        { code: "original_integrity_mismatch", severity: "contain" },
        { code: "health_unavailable", severity: "investigate" },
        { code: "failed_jobs_need_triage", severity: "investigate" },
        { code: "expired_leases_need_triage", severity: "investigate" }
      ])
    );
  });
  it("recursos e backup respeitam limites; ausência de métrica nunca vira cobertura completa", () => {
    const input = snapshot();
    input.backupRpoSeconds = 60;
    input.metrics.memoryRatio = 0.81;
    expect(evaluatePilotObservation(input, now).alerts).toEqual(
      expect.arrayContaining([
        { code: "resource_pressure", severity: "investigate", signal: "memoryRatio" },
        { code: "backup_older_than_rpo", severity: "investigate" }
      ])
    );
    input.metrics.memoryRatio = 0.8;
    input.metrics.backupAgeSeconds = 60;
    expect(evaluatePilotObservation(input, now).alerts).toEqual([]);
    const { memoryRatio: unused, ...metrics } = input.metrics;
    void unused;
    expect(evaluatePilotObservation({ ...input, metrics }, now).missingSignals).toEqual([
      "memoryRatio"
    ]);
  });
  it("sinaliza amostra antiga ou futura e aceita ISO sem milissegundos", () => {
    expect(evaluatePilotObservation(snapshot(), "2026-11-09T12:05:01Z").alerts).toContainEqual({
      code: "sample_stale",
      severity: "investigate"
    });
    expect(evaluatePilotObservation(snapshot(), "2026-11-09T11:59:59Z").alerts).toContainEqual({
      code: "sample_from_future",
      severity: "investigate"
    });
    expect(
      evaluatePilotObservation({ ...snapshot(), observedAt: "2026-11-09T12:00:00Z" }, now).alerts
    ).toEqual([]);
  });
  it.each([
    null,
    [],
    {},
    { ...snapshot(), version: 2 },
    { ...snapshot(), dataPolicy: "real" },
    { ...snapshot(), privatePayload: "SYNTHETIC-PRIVATE" },
    { ...snapshot(), metrics: [] },
    { ...snapshot(), metrics: { ...snapshot().metrics, apiKey: "SYNTHETIC-SECRET" } },
    { ...snapshot(), backupRpoSeconds: 0 },
    { ...snapshot(), backupRpoSeconds: undefined },
    { ...snapshot(), metrics: { ...snapshot().metrics, queuedJobs: -1 } },
    { ...snapshot(), metrics: { ...snapshot().metrics, queuedJobs: 0.5 } },
    { ...snapshot(), metrics: { ...snapshot().metrics, queuedJobs: undefined } },
    { ...snapshot(), metrics: { ...snapshot().metrics, memoryRatio: NaN } },
    { ...snapshot(), observedAt: "2026-11-31T12:00:00Z" },
    { ...snapshot(), observedAt: "invalid" },
    { ...snapshot(), observedAt: "2026-11-09T99:00:00Z" }
  ])("recusa entrada fora do contrato sem repetir valores", (input) => {
    expect(() => evaluatePilotObservation(input, now)).toThrow();
    try {
      evaluatePilotObservation(input, now);
    } catch (error) {
      expect(String(error)).not.toMatch(/SYNTHETIC-PRIVATE|SYNTHETIC-SECRET/u);
    }
  });
});
