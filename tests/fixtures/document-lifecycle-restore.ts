import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
  localRecoveryConnection,
  backupLocalApplication,
  restoreLocalApplication
} from "../../scripts/pilot-recovery.js";
import { createDockerRecoveryRunner } from "../../scripts/pilot-recovery-docker.js";

/** Read-only guard, before CLI or mutation. Existing application schemas are never reset. */
export async function assertDocumentRestoreTarget(
  client: Pick<Client, "query">,
  expectedName: string
) {
  if (!/^alvitra_ops_restore_[a-f0-9]{32}$/u.test(expectedName))
    throw new Error("Destino sintético inválido.");
  const marker = (
    await client.query(
      "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
    )
  ).rows;
  if (
    marker.length !== 1 ||
    marker[0].name !== expectedName ||
    marker[0].purpose !== "restore" ||
    marker[0].data_policy !== "synthetic-local-only"
  )
    throw new Error("Destino sem posse/marcador da rodada.");
  const occupied = (
    await client.query("SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='app') AS occupied")
  ).rows;
  if (occupied.length !== 1 || occupied[0].occupied !== false)
    throw new Error("A restauração exige destino vazio.");
}

/** Reuses the reviewed operational dump, container inspection and inventory comparison. */
export function createDocumentLifecycleRestorer(options: {
  sourceUrl: string;
  restoreUrl: string;
  runId: string;
  directory: string;
  containerName: string;
  confirmation: "synthetic-local-only";
}) {
  const source = localRecoveryConnection(options.sourceUrl, "source", options.confirmation);
  const initial = localRecoveryConnection(options.restoreUrl, "restore", options.confirmation);
  if (
    !/^[a-f0-9]{32}$/u.test(options.runId) ||
    source.pathname !== `/alvitra_ops_source_${options.runId}` ||
    initial.pathname !== `/alvitra_ops_restore_${options.runId}` ||
    source.hostname !== initial.hostname ||
    source.port !== initial.port ||
    [source, initial].some(
      (url) => url.username !== "postgres" || url.password !== "synthetic-only"
    ) ||
    resolve(options.directory).toLowerCase() !==
      resolve(".local/pilot-operations", options.runId).toLowerCase()
  )
    throw new Error("Bancos/diretório fora da rodada própria.");
  const names = new Set([
    "before-calls",
    "before-purge",
    "before-authoring-operations",
    "financial-confirmed"
  ]);
  const snapshotPath = (name: string) => {
    if (!names.has(name)) throw new Error("Snapshot fora do contrato sintético.");
    return resolve(options.directory, "snapshots", name);
  };
  const runner = () =>
    createDockerRecoveryRunner({
      containerName: options.containerName,
      outputDirectory: resolve(".local/pilot-operations")
    });
  let restored = false;
  async function nextTarget() {
    if (!restored) return new URL(initial);
    const target = new URL(initial);
    target.pathname = `/alvitra_ops_restore_${randomUUID().replaceAll("-", "")}`;
    localRecoveryConnection(target.toString(), "restore", options.confirmation);
    const sourceClient = new Client({
      connectionString: source.toString(),
      connectionTimeoutMillis: 5000
    });
    const adminUrl = new URL(source);
    adminUrl.pathname = "/postgres";
    const admin = new Client({
      connectionString: adminUrl.toString(),
      connectionTimeoutMillis: 5000
    });
    const fresh = new Client({
      connectionString: target.toString(),
      connectionTimeoutMillis: 5000
    });
    try {
      await sourceClient.connect();
      const marker = (
        await sourceClient.query(
          "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
        )
      ).rows;
      if (
        marker.length !== 1 ||
        marker[0].name !== source.pathname.slice(1) ||
        marker[0].purpose !== "source" ||
        marker[0].data_policy !== "synthetic-local-only"
      )
        throw new Error("Origem fora da rodada própria.");
      await admin.connect();
      // Exclusive CREATE: collision fails; no IF NOT EXISTS, DROP or overwrite of a previous target.
      await admin.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
      await fresh.connect();
      await fresh.query(
        "CREATE SCHEMA ops_control; CREATE TABLE ops_control.environment(purpose text NOT NULL,data_policy text NOT NULL); INSERT INTO ops_control.environment VALUES('restore','synthetic-local-only'); CREATE EXTENSION vector"
      );
      return target;
    } finally {
      await Promise.all([sourceClient.end(), admin.end(), fresh.end()]);
    }
  }
  return {
    async backup(name: string) {
      const path = snapshotPath(name);
      await mkdir(resolve(options.directory, "snapshots"), { recursive: true });
      const client = new Client({
        connectionString: source.toString(),
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        await backupLocalApplication(
          client,
          source.toString(),
          path,
          options.confirmation,
          await runner()
        );
      } finally {
        await client.end();
      }
    },
    async restore(name: string): Promise<string> {
      const path = snapshotPath(name),
        target = await nextTarget();
      const client = new Client({
        connectionString: target.toString(),
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        await assertDocumentRestoreTarget(client, target.pathname.slice(1));
        await restoreLocalApplication(
          client,
          target.toString(),
          path,
          options.confirmation,
          await runner()
        );
        restored = true;
        return target.toString();
      } finally {
        await client.end();
      }
    }
  };
}
