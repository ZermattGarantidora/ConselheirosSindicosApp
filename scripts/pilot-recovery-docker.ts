import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type { RecoveryCommand, RecoveryRunner } from "./pilot-recovery.js";

export type DockerRecoveryTransport = (args: readonly string[]) => Promise<string>;
export const localRecoveryDockerHost =
  process.platform === "win32"
    ? "npipe:////./pipe/dockerDesktopLinuxEngine"
    : "unix:///var/run/docker.sock";
const inspectionFormat =
  "{{json .Config.Labels}}\n{{json .NetworkSettings.Ports}}\n{{json .Mounts}}\n{{.State.Running}}\n{{.Config.Image}}";
const databasePattern = /^alvitra_ops_(source|restore)_[a-f0-9]{12,32}$/u;

function normalizedMount(value: string): string {
  const path = value
    .replaceAll("\\", "/")
    .replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//iu, "$1:/");
  return (process.platform === "win32" ? path.toLowerCase() : path).replace(/\/+$/u, "");
}

function mappedFile(root: string, value: string): string {
  const path = relative(root, resolve(value));
  if (
    !isAbsolute(value) ||
    path === "" ||
    path.startsWith("..") ||
    isAbsolute(path) ||
    !path.replaceAll("\\", "/").endsWith("/app.dump")
  )
    throw new Error("Arquivo fora da saída sintética de recuperação.");
  return `/recovery/${path.replaceAll("\\", "/")}`;
}

function mappedArguments(command: RecoveryCommand, root: string): string[] {
  const database = command.environment.PGDATABASE;
  if (
    !database ||
    !databasePattern.test(database) ||
    command.environment.PGHOST !== "127.0.0.1" ||
    command.environment.PGUSER !== "postgres" ||
    !/^\d{1,5}$/u.test(command.environment.PGPORT ?? "")
  )
    throw new Error("Conexão do container não corresponde ao ensaio local.");
  const allowed = new Set([
    "--no-password",
    "--version",
    "--format=custom",
    "--schema=app",
    "--strict-names",
    "--single-transaction",
    "--exit-on-error",
    "--no-owner"
  ]);
  return command.args.map((arg, index) => {
    if (
      allowed.has(arg) ||
      /^--snapshot=[a-f0-9-]{10,100}$/iu.test(arg) ||
      arg === `--dbname=${database}`
    )
      return arg;
    if (command.executable === "pg_dump" && arg.startsWith("--file="))
      return `--file=${mappedFile(root, arg.slice(7))}`;
    if (command.executable === "pg_restore" && index === command.args.length - 1 && isAbsolute(arg))
      return mappedFile(root, arg);
    throw new Error("Argumento de recuperação não autorizado.");
  });
}

export async function createDockerRecoveryRunner(options: {
  containerName: string;
  outputDirectory: string;
  transport?: DockerRecoveryTransport;
}): Promise<RecoveryRunner> {
  if (
    !/^alvitra-ops-[a-f0-9]{12,32}$/u.test(options.containerName) ||
    !isAbsolute(options.outputDirectory)
  )
    throw new Error("Destino Docker de recuperação inválido.");
  await mkdir(options.outputDirectory, { recursive: true, mode: 0o700 });
  const root = await realpath(options.outputDirectory);
  // Never load the user's Docker config or inherit remote contexts and API credentials.
  const config = await mkdtemp(join(root, "docker-client-"));
  const environment: Record<string, string> = {};
  for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
    if (process.env[name]) environment[name] = process.env[name]!;
  const transport =
    options.transport ??
    (async (args: readonly string[]) => {
      try {
        const result = await promisify(execFile)(
          "docker",
          ["--config", config, "--host", localRecoveryDockerHost, ...args],
          {
            env: environment,
            shell: false,
            windowsHide: true,
            timeout: 300_000,
            maxBuffer: 2_097_152
          }
        );
        if (result.stderr.trim()) throw new Error();
        return result.stdout;
      } catch {
        throw new Error("Ferramenta do container local indisponível.");
      }
    });
  return async (command) => {
    let phase = "arguments";
    try {
      const args = mappedArguments(command, root);
      phase = "inspection";
      const inspection = await transport([
        "inspect",
        "--format",
        inspectionFormat,
        options.containerName
      ]);
      const lines = inspection.trim().split(/\r?\n/u);
      phase = "metadata";
      if (lines.length !== 5) throw new Error();
      const labels = JSON.parse(lines[0]!) as Record<string, string>;
      const ports = JSON.parse(lines[1]!) as Record<string, { HostIp: string; HostPort: string }[]>;
      const mounts = JSON.parse(lines[2]!) as {
        Type: string;
        Source: string;
        Destination: string;
        RW: boolean;
      }[];
      if (
        labels["app.alvitra.purpose"] !== "synthetic-local-recovery" ||
        labels["app.alvitra.data-policy"] !== "synthetic-local-only" ||
        lines[3] !== "true" ||
        lines[4] !== "pgvector/pgvector:pg17" ||
        ports["5432/tcp"]?.length !== 1 ||
        ports["5432/tcp"]![0]!.HostIp !== "127.0.0.1" ||
        ports["5432/tcp"]![0]!.HostPort !== command.environment.PGPORT ||
        !mounts.some(
          (mount) =>
            mount.Type === "bind" &&
            mount.Destination === "/recovery" &&
            mount.RW &&
            normalizedMount(mount.Source) === normalizedMount(root)
        ) ||
        mounts.some(
          (mount) =>
            !(mount.Type === "bind" && mount.Destination === "/recovery") &&
            !(mount.Type === "tmpfs" && mount.Destination === "/var/lib/postgresql/data")
        )
      )
        throw new Error();
      phase = "tool";
      await transport([
        "exec",
        "--user",
        "postgres",
        "--env",
        "PGHOST=/var/run/postgresql",
        "--env",
        "PGUSER=postgres",
        "--env",
        `PGDATABASE=${command.environment.PGDATABASE}`,
        "--env",
        "PGCONNECT_TIMEOUT=5",
        "--env",
        "PGCLIENTENCODING=UTF8",
        "--env",
        "LANG=C",
        "--env",
        "LC_ALL=C",
        options.containerName,
        command.executable,
        ...args
      ]);
    } catch {
      throw Object.assign(
        new Error("Recuperação Docker local recusada ou não concluída; destino em quarentena."),
        { phase }
      );
    }
  };
}
