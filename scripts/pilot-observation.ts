type Metrics = Record<string, number>;
type RecordValue = Record<string, unknown>;
const requiredMetrics = [
  "queuedJobs",
  "oldestQueuedSeconds",
  "completedLastTenMinutes",
  "failedJobs",
  "expiredLeases",
  "originalsMismatch",
  "healthFailures",
  "isolationIncidents"
] as const;
const optionalMetrics = [
  "memoryRatio",
  "cpuRatio",
  "connectionsRatio",
  "diskRatio",
  "backupAgeSeconds"
] as const;
const ratioMetrics = new Set<string>(["memoryRatio", "cpuRatio", "connectionsRatio", "diskRatio"]);
export const proposedObservationLimits = Object.freeze({
  queueStallSeconds: 600,
  healthFailures: 3,
  resourceRatio: 0.8,
  sampleMaxAgeSeconds: 300
});

function object(value: unknown, keys: readonly string[]): RecordValue {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new Error("Agregados operacionais inválidos.");
  return value as RecordValue;
}
function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/u.test(value))
    throw new Error("Horário operacional inválido.");
  const result = Date.parse(value);
  if (
    !Number.isFinite(result) ||
    new Date(result).toISOString() !== value.replace(/(?<!\.\d{3})Z$/u, ".000Z")
  )
    throw new Error("Horário operacional inválido.");
  return result;
}

export function evaluatePilotObservation(input: unknown, referenceTime: string) {
  const snapshot = object(input, [
    "version",
    "dataPolicy",
    "observedAt",
    "metrics",
    "backupRpoSeconds"
  ]);
  if (snapshot.version !== 1 || snapshot.dataPolicy !== "synthetic-only")
    throw new Error("Use somente agregados sintéticos.");
  const sampledAt = timestamp(snapshot.observedAt);
  const now = timestamp(referenceTime);
  const raw = object(snapshot.metrics, [...requiredMetrics, ...optionalMetrics]);
  const metrics: Metrics = {};
  for (const key of [...requiredMetrics, ...optionalMetrics]) {
    const value = raw[key];
    if (value === undefined && !requiredMetrics.includes(key as (typeof requiredMetrics)[number]))
      continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      (!ratioMetrics.has(key) && !Number.isSafeInteger(value))
    )
      throw new Error("Métrica operacional inválida.");
    metrics[key] = value;
  }
  const rpo = snapshot.backupRpoSeconds;
  if (rpo !== null && (typeof rpo !== "number" || !Number.isSafeInteger(rpo) || rpo < 1))
    throw new Error("RPO sintético inválido.");
  const alerts: { code: string; severity: "contain" | "investigate"; signal?: string }[] = [];
  const add = (
    code: string,
    severity: "contain" | "investigate" = "investigate",
    signal?: string
  ) => alerts.push({ code, severity, ...(signal ? { signal } : {}) });
  if (metrics.isolationIncidents! > 0) add("isolation_incident", "contain");
  if (metrics.originalsMismatch! > 0) add("original_integrity_mismatch", "contain");
  if (metrics.healthFailures! >= proposedObservationLimits.healthFailures)
    add("health_unavailable");
  if (
    metrics.queuedJobs! > 0 &&
    metrics.oldestQueuedSeconds! > proposedObservationLimits.queueStallSeconds &&
    metrics.completedLastTenMinutes === 0
  )
    add("queue_without_progress");
  if (metrics.failedJobs! > 0) add("failed_jobs_need_triage");
  if (metrics.expiredLeases! > 0) add("expired_leases_need_triage");
  for (const key of ratioMetrics)
    if (metrics[key] !== undefined && metrics[key]! > proposedObservationLimits.resourceRatio)
      add("resource_pressure", "investigate", key);
  const sampleAgeSeconds = (now - sampledAt) / 1000;
  if (sampleAgeSeconds < 0) add("sample_from_future");
  else if (sampleAgeSeconds > proposedObservationLimits.sampleMaxAgeSeconds) add("sample_stale");
  if (
    typeof rpo === "number" &&
    metrics.backupAgeSeconds !== undefined &&
    metrics.backupAgeSeconds > rpo
  )
    add("backup_older_than_rpo");
  return {
    state: "synthetic-observation-preview" as const,
    activationAuthorized: false as const,
    thresholdsApproved: false as const,
    networkCalls: 0 as const,
    deliveredNotifications: 0 as const,
    referenceTime,
    observedAt: snapshot.observedAt as string,
    alerts,
    missingSignals: optionalMetrics.filter((key) => metrics[key] === undefined),
    pendingDecisions: rpo === null ? ["backupRpo"] : [],
    limitation:
      "Agregados e limiares de ensaio não comprovam saúde, suporte, alertas entregues ou autorização do piloto."
  };
}
