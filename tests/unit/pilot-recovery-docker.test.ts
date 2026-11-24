import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDockerRecoveryRunner,
  localRecoveryDockerHost,
  type DockerRecoveryTransport
} from "../../scripts/pilot-recovery-docker.js";
import { postgresRecoveryCommand } from "../../scripts/pilot-recovery.js";

const directories: string[] = [];
const name = "alvitra-ops-aaaaaaaaaaaa";
const url = new URL(
  "postgresql://postgres:synthetic-only@127.0.0.1:55432/alvitra_ops_source_aaaaaaaaaaaa"
);
async function rootDirectory() {
  const root = await mkdtemp(join(tmpdir(), "alvitra-pilot-docker-test-"));
  directories.push(root);
  return root;
}
function inspection(root: string) {
  return {
    labels: {
      "app.alvitra.purpose": "synthetic-local-recovery",
      "app.alvitra.data-policy": "synthetic-local-only"
    },
    ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] },
    mounts: [{ Type: "bind", Source: root, Destination: "/recovery", RW: true }],
    running: "true",
    image: "pgvector/pgvector:pg17"
  };
}
const rendered = (state: ReturnType<typeof inspection>) =>
  [
    JSON.stringify(state.labels),
    JSON.stringify(state.ports),
    JSON.stringify(state.mounts),
    state.running,
    state.image
  ].join("\n") + "\n";
afterEach(async () => {
  for (const root of directories.splice(0)) {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("alvitra-pilot-docker-test-"));
    await rm(root, { recursive: true, force: true });
  }
});

describe("Spec 070 AC-7006 — ferramentas no Docker local", () => {
  it("inspeciona sem ler Config.Env e mapeia somente a saída, sem senha nos argumentos", async () => {
    const root = await rootDirectory();
    const state = inspection(root);
    const transport = vi.fn<DockerRecoveryTransport>(async (args) =>
      args[0] === "inspect" ? rendered(state) : "pg_dump 17\n"
    );
    const run = await createDockerRecoveryRunner({
      containerName: name,
      outputDirectory: root,
      transport
    });
    await run(
      postgresRecoveryCommand("pg_dump", url, [
        "--format=custom",
        "--schema=app",
        "--strict-names",
        "--snapshot=00000003-0000001B-1",
        `--file=${join(root, "run", "backup", "app.dump")}`
      ])
    );
    const calls = transport.mock.calls.map(([args]) => args);
    expect(calls[0]![2]).not.toContain("Config.Env");
    expect(calls[1]).toEqual(
      expect.arrayContaining([
        "exec",
        "postgres",
        "PGHOST=/var/run/postgresql",
        "--file=/recovery/run/backup/app.dump"
      ])
    );
    expect(JSON.stringify(calls)).not.toContain("synthetic-only");
    expect(JSON.stringify(calls)).not.toContain("PGPASSWORD");
    expect(localRecoveryDockerHost).toMatch(/^(npipe:|unix:\/\/\/var\/run\/docker.sock$)/u);
    await run(
      postgresRecoveryCommand("pg_restore", url, [
        "--single-transaction",
        "--exit-on-error",
        "--no-owner",
        `--dbname=${url.pathname.slice(1)}`,
        join(root, "run", "backup", "app.dump")
      ])
    );
    expect(transport.mock.calls.at(-1)![0].at(-1)).toBe("/recovery/run/backup/app.dump");
    await run(postgresRecoveryCommand("pg_dump", url, ["--version"]));
  });
  it.each(["pilot", "alvitra-ops-unsafe;", "alvitra-pilot-aaaaaaaaaaaa"])(
    "recusa container não reservado %s",
    async (containerName) => {
      await expect(
        createDockerRecoveryRunner({ containerName, outputDirectory: await rootDirectory() })
      ).rejects.toThrow("inválido");
    }
  );
  it("recusa saída relativa", async () => {
    await expect(
      createDockerRecoveryRunner({ containerName: name, outputDirectory: "relative" })
    ).rejects.toThrow();
  });
  it.each([
    "labels",
    "ports",
    "portCount",
    "hostPort",
    "mountRoot",
    "mountReadOnly",
    "extraMount",
    "stopped",
    "image",
    "metadata"
  ])("recusa inspeção divergente antes de executar: %s", async (problem) => {
    const root = await rootDirectory();
    const state = inspection(root);
    if (problem === "labels") state.labels["app.alvitra.purpose"] = "pilot";
    if (problem === "ports") state.ports["5432/tcp"]![0]!.HostIp = "0.0.0.0";
    if (problem === "portCount") state.ports["5432/tcp"] = [];
    if (problem === "hostPort") state.ports["5432/tcp"]![0]!.HostPort = "5432";
    if (problem === "mountRoot") state.mounts[0]!.Source = dirname(root);
    if (problem === "mountReadOnly") state.mounts[0]!.RW = false;
    if (problem === "extraMount")
      state.mounts.push({ Type: "bind", Source: root, Destination: "/secret", RW: true });
    if (problem === "stopped") state.running = "false";
    if (problem === "image") state.image = "pgvector/pgvector:pg16";
    const transport = vi
      .fn<DockerRecoveryTransport>()
      .mockResolvedValue(problem === "metadata" ? "invalid" : rendered(state));
    const run = await createDockerRecoveryRunner({
      containerName: name,
      outputDirectory: root,
      transport
    });
    await expect(run(postgresRecoveryCommand("pg_dump", url, ["--version"]))).rejects.toThrow(
      "quarentena"
    );
    expect(transport).toHaveBeenCalledOnce();
  });
  it.each([
    "outside",
    "relative",
    "unknownArgument",
    "wrongUser",
    "remoteHost",
    "wrongDatabase",
    "invalidPort"
  ])("recusa comando sem consultar Docker: %s", async (problem) => {
    const root = await rootDirectory();
    const transport = vi.fn<DockerRecoveryTransport>();
    const run = await createDockerRecoveryRunner({
      containerName: name,
      outputDirectory: root,
      transport
    });
    const command = postgresRecoveryCommand("pg_dump", url, ["--version"]);
    if (problem === "outside") command.args = [`--file=${join(dirname(root), "app.dump")}`];
    if (problem === "relative") command.args = ["--file=relative/app.dump"];
    if (problem === "unknownArgument") command.args = ["--host=remote.invalid"];
    if (problem === "wrongUser") command.environment.PGUSER = "app_runtime";
    if (problem === "remoteHost") command.environment.PGHOST = "remote.invalid";
    if (problem === "wrongDatabase") command.environment.PGDATABASE = "pilot";
    if (problem === "invalidPort") command.environment.PGPORT = "not-a-port";
    await expect(run(command)).rejects.toThrow("quarentena");
    expect(transport).not.toHaveBeenCalled();
  });
  it("permite tmpfs próprio e não divulga falha do processo", async () => {
    const root = await rootDirectory();
    const state = inspection(root);
    state.mounts.push({
      Type: "tmpfs",
      Source: "",
      Destination: "/var/lib/postgresql/data",
      RW: true
    });
    const transport = vi
      .fn<DockerRecoveryTransport>()
      .mockResolvedValueOnce(rendered(state))
      .mockRejectedValueOnce(new Error("SYNTHETIC-PRIVATE-FAILURE"));
    const run = await createDockerRecoveryRunner({
      containerName: name,
      outputDirectory: root,
      transport
    });
    await expect(run(postgresRecoveryCommand("pg_dump", url, ["--version"]))).rejects.toThrow(
      "quarentena"
    );
  });
});
