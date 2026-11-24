export type ContinuousWorkerConfiguration = Readonly<{
  databaseUrl: string;
  pollIntervalMs: number;
  leaseSeconds: number;
  heartbeatIntervalMs: number;
  ssl?: { ca: string; rejectUnauthorized: true };
}>;

function integer(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = environment[name]?.trim();
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} deve ser um inteiro entre ${minimum} e ${maximum}.`);
  }
  return value;
}

export function continuousWorkerConfiguration(
  environment: NodeJS.ProcessEnv
): ContinuousWorkerConfiguration {
  if (environment.DEMO_MODE?.trim().toLowerCase() === "true") {
    throw new Error("O worker separado exige persistência; não use DEMO_MODE=true.");
  }
  const databaseUrl =
    environment.DOCUMENT_WORKER_DATABASE_URL?.trim() || environment.DATABASE_URL?.trim();
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl ?? "");
  } catch {
    throw new Error("Defina uma DATABASE_URL PostgreSQL válida para o worker separado.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("O worker separado exige uma conexão PostgreSQL.");
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) &&
    !["require", "verify-full"].includes(parsed.searchParams.get("sslmode") ?? "")
  ) {
    throw new Error("A conexão remota do worker separado exige TLS.");
  }
  const leaseSeconds = integer(environment, "DOCUMENT_WORKER_LEASE_SECONDS", 300, 3, 3600);
  const heartbeatIntervalMs = integer(
    environment,
    "DOCUMENT_WORKER_HEARTBEAT_MS",
    Math.min(30_000, Math.floor((leaseSeconds * 1000) / 3)),
    10,
    60_000
  );
  if (heartbeatIntervalMs * 2 >= leaseSeconds * 1000) {
    throw new Error("O heartbeat do worker deve ser menor que metade do prazo da reserva.");
  }
  const certificate = environment.DOCUMENT_WORKER_SSL_CA?.trim();
  if (certificate && !certificate.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("DOCUMENT_WORKER_SSL_CA deve conter o certificado raiz PEM do banco.");
  }
  if (certificate) parsed.searchParams.delete("sslmode");
  return {
    databaseUrl: certificate ? parsed.toString() : databaseUrl!,
    pollIntervalMs: integer(environment, "DOCUMENT_WORKER_POLL_MS", 1000, 10, 60_000),
    leaseSeconds,
    heartbeatIntervalMs,
    ...(certificate ? { ssl: { ca: certificate, rejectUnauthorized: true as const } } : {})
  };
}
