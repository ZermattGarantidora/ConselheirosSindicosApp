type PilotService = {
  properties: Record<string, string>;
  environment: Record<string, { value?: string; sync?: string }>;
};

const propertyNames = new Set([
  "type",
  "name",
  "runtime",
  "region",
  "plan",
  "numInstances",
  "autoDeployTrigger",
  "buildCommand",
  "startCommand",
  "healthCheckPath",
  "maxShutdownDelaySeconds"
]);
const literalEnvironment: Record<string, string> = {
  NODE_VERSION: "24",
  APP_ENV: "production",
  DEMO_MODE: "false",
  DOCUMENT_WORKER_IN_API: "false",
  CODEX_ANSWER_ENABLED: "false",
  ALVITRA_DEMO_WEB_SEARCH_ENABLED: "false",
  ALVITRA_LOCAL_TEST_DOCUMENTS_ENABLED: "false",
  OPENAI_OCR_ENABLED: "false",
  OPENAI_IMAGE_ANALYSIS_ENABLED: "false",
  GEMINI_IMAGE_ANALYSIS_ENABLED: "false",
  GEMINI_ENABLED: "false",
  WEB_DIST_DIR: "apps/web/dist",
  PUBLIC_APP_ORIGIN: "https://alvitra.app",
  PUBLIC_APP_ALIASES: "www.alvitra.app,alvitraapp.com,www.alvitraapp.com",
  DOCUMENT_WORKER_POLL_MS: "1000",
  DOCUMENT_WORKER_LEASE_SECONDS: "300",
  DOCUMENT_WORKER_HEARTBEAT_MS: "30000"
};
const secretNames = new Set([
  "DATABASE_URL",
  "DOCUMENT_WORKER_DATABASE_URL",
  "ACCESS_CODE_SECRET",
  "AUTH_ACCOUNT_SECRET_KEY",
  "OPENAI_API_KEY"
]);

function scalar(value: string): string {
  if (/^(["'])[^"'\r\n]*\1$/u.test(value)) return value.slice(1, -1);
  if (/[#{}[\]*!|>"']/u.test(value) || value.startsWith("&"))
    throw new Error("Sintaxe de Blueprint não suportada.");
  return value;
}

/** Deliberately accepts only the scalar subset used by this reviewed pilot blueprint. */
export function parsePilotBlueprint(source: string): PilotService[] {
  const services: PilotService[] = [];
  let service: PilotService | undefined;
  let environmentName: string | undefined;
  let inEnvironment = false;
  let rootSeen = false;
  for (const line of source.replaceAll("\r", "").split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (line === "services:" && !rootSeen) {
      rootSeen = true;
      continue;
    }
    const start = /^ {2}- type: (web|worker)$/u.exec(line);
    if (start && rootSeen) {
      service = { properties: { type: start[1]! }, environment: {} };
      services.push(service);
      inEnvironment = false;
      environmentName = undefined;
      continue;
    }
    if (!service) throw new Error("Estrutura de Blueprint inválida.");
    if (line === "    envVars:" && !inEnvironment) {
      inEnvironment = true;
      continue;
    }
    const variable = /^ {6}- key: ([A-Z][A-Z0-9_]*)$/u.exec(line);
    if (variable && inEnvironment) {
      environmentName = variable[1]!;
      if (Object.hasOwn(service.environment, environmentName))
        throw new Error("Variável duplicada.");
      service.environment[environmentName] = {};
      continue;
    }
    const setting = /^ {8}(value|sync): (.+)$/u.exec(line);
    if (setting && environmentName && inEnvironment) {
      const entry = service.environment[environmentName]!;
      const key = setting[1] as "value" | "sync";
      if (Object.hasOwn(entry, key)) throw new Error("Configuração duplicada.");
      if (key === "sync" && setting[2] !== "false")
        throw new Error("sync deve ser o booleano false sem aspas.");
      if (key === "value" && /^(true|false|\d+)$/u.test(setting[2]!))
        throw new Error("Valores de ambiente booleanos ou numéricos exigem aspas.");
      entry[key] = scalar(setting[2]!);
      continue;
    }
    const property = /^ {4}([a-zA-Z]+): (.+)$/u.exec(line);
    if (property && !inEnvironment && propertyNames.has(property[1]!)) {
      if (Object.hasOwn(service.properties, property[1]!))
        throw new Error("Propriedade duplicada.");
      if (
        ["numInstances", "maxShutdownDelaySeconds"].includes(property[1]!) &&
        !/^\d+$/u.test(property[2]!)
      )
        throw new Error("Propriedade numérica inválida.");
      service.properties[property[1]!] = scalar(property[2]!);
      continue;
    }
    throw new Error("Sintaxe de Blueprint não suportada.");
  }
  if (services.length !== 2) throw new Error("O piloto exige exatamente web e worker.");
  return services;
}

export const requiredPilotDecisions = [
  "regionReview",
  "providerReview",
  "dataPolicyReview",
  "budgetReview",
  "operationsOwner",
  "supportChannel",
  "secretRecoveryReview",
  "deletionReplayReview",
  "fullRestoreEvidence",
  "candidateRevision",
  "finalReview",
  "rpoMinutes",
  "rtoMinutes",
  "retentionDays"
] as const;

export function inspectPilotPreparation(blueprint: string, decisions: unknown) {
  const failures: string[] = [];
  try {
    const services = parsePilotBlueprint(blueprint);
    for (const [index, type] of ["web", "worker"].entries()) {
      const { properties, environment } = services[index]!;
      const expected = {
        type,
        name: type === "web" ? "alvitra-demo-sintetica" : "alvitra-pilot-documents",
        runtime: "node",
        plan: "1c-2g",
        numInstances: "1",
        autoDeployTrigger: "off",
        maxShutdownDelaySeconds: "300",
        buildCommand:
          "pnpm install --frozen-lockfile --prod=false && pnpm run build:api" +
          (type === "web" ? " && pnpm run build:web" : ""),
        startCommand: type === "web" ? "node dist/api/app/main.js" : "node dist/api/worker/main.js"
      };
      for (const [key, value] of Object.entries(expected))
        if (properties[key] !== value) failures.push(`${type}.${key}`);
      if (
        !["oregon", "ohio", "virginia", "frankfurt", "singapore"].includes(properties.region ?? "")
      )
        failures.push(`${type}.region`);
      if (
        type === "web"
          ? properties.healthCheckPath !== "/health"
          : properties.healthCheckPath !== undefined
      )
        failures.push(`${type}.healthCheckPath`);
      for (const [key, value] of Object.entries(environment)) {
        if (secretNames.has(key)) {
          if (value.sync !== "false" || value.value !== undefined) failures.push(`${type}.secret`);
        } else if (literalEnvironment[key] !== value.value || value.sync !== undefined)
          failures.push(`${type}.environment`);
      }
      const required = [
        "NODE_VERSION",
        "APP_ENV",
        "DEMO_MODE",
        "DOCUMENT_WORKER_IN_API",
        "CODEX_ANSWER_ENABLED",
        "ALVITRA_DEMO_WEB_SEARCH_ENABLED",
        "ALVITRA_LOCAL_TEST_DOCUMENTS_ENABLED",
        "OPENAI_OCR_ENABLED",
        "OPENAI_IMAGE_ANALYSIS_ENABLED",
        "GEMINI_IMAGE_ANALYSIS_ENABLED",
        "GEMINI_ENABLED",
        ...(type === "web"
          ? [
              "WEB_DIST_DIR",
              "PUBLIC_APP_ORIGIN",
              "PUBLIC_APP_ALIASES",
              "DATABASE_URL",
              "ACCESS_CODE_SECRET",
              "AUTH_ACCOUNT_SECRET_KEY",
              "OPENAI_API_KEY"
            ]
          : [
              "DOCUMENT_WORKER_DATABASE_URL",
              "DOCUMENT_WORKER_POLL_MS",
              "DOCUMENT_WORKER_LEASE_SECONDS",
              "DOCUMENT_WORKER_HEARTBEAT_MS"
            ])
      ];
      for (const key of required)
        if (!environment[key]) failures.push(`${type}.missingEnvironment`);
      if (
        type === "worker" &&
        [...secretNames].some((key) => key !== "DOCUMENT_WORKER_DATABASE_URL" && environment[key])
      )
        failures.push("worker.excessSecret");
      if (
        type === "worker" &&
        ["PUBLIC_APP_ORIGIN", "PUBLIC_APP_ALIASES"].some((key) => environment[key])
      )
        failures.push("worker.excessConfiguration");
    }
    if (services[0]!.properties.region !== services[1]!.properties.region)
      failures.push("sharedRegion");
  } catch {
    failures.push("blueprintSyntax");
  }
  const record =
    decisions && typeof decisions === "object" ? (decisions as Record<string, unknown>) : {};
  const values =
    record.decisions && typeof record.decisions === "object"
      ? (record.decisions as Record<string, unknown>)
      : {};
  if (record.version !== 1 || record.pilotDate !== "2026-11-16") failures.push("decisionsFormat");
  const pending = requiredPilotDecisions.filter((key) => {
    const value = values[key];
    if (["rpoMinutes", "rtoMinutes", "retentionDays"].includes(key))
      return typeof value !== "number" || !Number.isSafeInteger(value) || value < 1;
    if (key === "candidateRevision")
      return typeof value !== "string" || !/^[a-f0-9]{40}$/u.test(value);
    return typeof value !== "string" || value.trim() === "";
  });
  return {
    state: "prepared-not-activated" as const,
    activationAuthorized: false as const,
    networkCalls: 0 as const,
    configurationValid: failures.length === 0,
    configurationFailures: [...new Set(failures)],
    pendingDecisions: pending,
    decisionsRecorded: pending.length === 0,
    limitation:
      "Registros locais não comprovam aprovação, implantação, saúde ou recuperação do ambiente efetivo."
  };
}
