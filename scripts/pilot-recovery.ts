import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { Client } from "pg";

export type RecoveryClient = Pick<Client, "query">;
export type RecoveryCommand = {
  executable: "pg_dump" | "pg_restore";
  args: string[];
  environment: Record<string, string>;
};
export type RecoveryRunner = (command: RecoveryCommand) => Promise<void>;
type TableFingerprint = { name: string; rows: string; sha256: string };
export type RecoveryInventory = {
  tables: TableFingerprint[];
  sequences: Record<string, unknown>[];
  catalog: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  extension: { name: string; schema: string; version: string };
};
export type RecoveryManifest = {
  version: 1;
  purpose: "synthetic-local-recovery";
  sourceDatabase: string;
  dumpSha256: string;
  inventory: RecoveryInventory;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const digestPattern = /^[a-f0-9]{64}$/u;
const databasePattern = /^alvitra_ops_(source|restore)_[a-f0-9]{12,32}$/u;
const safeIdentifier = (value: string) => {
  if (!/^[a-z][a-z0-9_]*$/u.test(value)) throw new Error("Identificador local inválido.");
  return `"${value}"`;
};

export function localRecoveryConnection(
  rawUrl: string | undefined,
  purpose: "source" | "restore",
  confirmation: string | undefined
): URL {
  if (confirmation !== "synthetic-local-only")
    throw new Error("Confirme o ensaio sintético local.");
  let parsed: URL;
  try {
    parsed = new URL(rawUrl ?? "");
  } catch {
    throw new Error("Conexão local inválida.");
  }
  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    !databasePattern.test(name) ||
    !name.startsWith(`alvitra_ops_${purpose}_`) ||
    !parsed.username ||
    parsed.search !== "" ||
    parsed.hash !== ""
  )
    throw new Error("Use somente o banco local descartável da finalidade escolhida.");
  return parsed;
}

export function postgresRecoveryCommand(
  executable: RecoveryCommand["executable"],
  url: URL,
  args: string[],
  systemEnvironment: NodeJS.ProcessEnv = process.env
): RecoveryCommand {
  const environment: Record<string, string> = {};
  for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"])
    if (systemEnvironment[name]) environment[name] = systemEnvironment[name]!;
  Object.assign(environment, {
    PGHOST: url.hostname.replace(/^\[|\]$/gu, ""),
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGCONNECT_TIMEOUT: "5",
    PGCLIENTENCODING: "UTF8",
    PGSSLMODE: "disable",
    LANG: "C",
    LC_ALL: "C"
  });
  return {
    executable,
    args: args.length === 1 && args[0] === "--version" ? args : ["--no-password", ...args],
    environment
  };
}

export const runPostgresRecoveryCommand: RecoveryRunner = async (command) => {
  try {
    const result = await promisify(execFile)(command.executable, command.args, {
      env: command.environment,
      shell: false,
      windowsHide: true,
      timeout: 300_000,
      maxBuffer: 1_048_576
    });
    // Do not silently accept pg_dump warnings or copy database errors into telemetry.
    if (result.stderr.trim()) throw new Error();
  } catch {
    throw new Error("A ferramenta PostgreSQL falhou; destino permanece em quarentena.");
  }
};

export async function recoveryFileSha256(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}

async function assertMarker(client: RecoveryClient, url: URL, purpose: "source" | "restore") {
  const result = await client.query<{ name: string; purpose: string; data_policy: string }>(
    `SELECT current_database() AS name, purpose, data_policy FROM ops_control.environment`
  );
  if (
    result.rows.length !== 1 ||
    result.rows[0]!.name !== decodeURIComponent(url.pathname.slice(1)) ||
    result.rows[0]!.purpose !== purpose ||
    result.rows[0]!.data_policy !== "synthetic-local-only"
  )
    throw new Error("Marcador de recuperação local inválido.");
}

async function safeRoles(client: RecoveryClient): Promise<Record<string, unknown>[]> {
  const roles = (
    await client.query<{
      rolname: string;
      rolcanlogin: boolean;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
      rolbypassrls: boolean;
      rolinherit: boolean;
    }>(`SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
      rolbypassrls, rolinherit FROM pg_roles
      WHERE rolname IN ('app_runtime','app_worker','app_ai_executor') ORDER BY rolname`)
  ).rows;
  if (
    !["app_runtime", "app_worker"].every((name) => roles.some((role) => role.rolname === name)) ||
    roles.some((role) =>
      Object.entries(role).some(
        ([key, value]) =>
          key !== "rolname" &&
          !(role.rolname === "app_ai_executor" && key === "rolinherit") &&
          value !== false
      )
    )
  )
    throw new Error("Papéis de aplicação inseguros ou ausentes.");
  const inherited = await client.query(`SELECT 1 FROM pg_auth_members m
    JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('app_runtime','app_worker','app_ai_executor')`);
  if (inherited.rows.length) throw new Error("Papéis da aplicação não podem herdar outros papéis.");
  return roles;
}

const aclSql = (acl: string, type: string, owner: string) => `(SELECT COALESCE(jsonb_agg(
  jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable),'[]'::jsonb)
  FROM aclexplode(COALESCE(${acl},acldefault(${type},${owner}))) a)`;

const catalogSql = `
  SELECT kind, identity, definition FROM (
    SELECT 'relation' AS kind, c.relname::text AS identity,
      jsonb_build_object('kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
        'owner',pg_get_userbyid(c.relowner),'acl',${aclSql("c.relacl", "(CASE WHEN c.relkind='S' THEN 'S' ELSE 'r' END)::\"char\"", "c.relowner")},
        'view',CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid) ELSE NULL END) AS definition
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' AND c.relkind IN ('r','p','S','v','m')
    UNION ALL SELECT 'column', c.relname::text||'.'||a.attname::text,
      jsonb_build_object('type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
        'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid))
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='app' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p')
    UNION ALL SELECT 'policy', tablename::text||'.'||policyname::text, to_jsonb(p)
      FROM pg_policies p WHERE schemaname='app'
    UNION ALL SELECT 'constraint', c.relname::text||'.'||co.conname::text,
      jsonb_build_object('definition',pg_get_constraintdef(co.oid),'validated',co.convalidated)
      FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app'
    UNION ALL SELECT 'index', indexname::text, to_jsonb(i) FROM pg_indexes i WHERE schemaname='app'
    UNION ALL SELECT 'sequence', sequencename::text, to_jsonb(s) FROM pg_sequences s WHERE schemaname='app'
    UNION ALL SELECT 'routine', p.proname::text||'('||pg_get_function_identity_arguments(p.oid)||')',
      jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',${aclSql("p.proacl", "'f'", "p.proowner")})
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app'
    UNION ALL SELECT 'trigger', c.relname::text||'.'||t.tgname::text, to_jsonb(pg_get_triggerdef(t.oid))
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' AND NOT t.tgisinternal
    UNION ALL SELECT 'schema', n.nspname::text,
      jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',${aclSql("n.nspacl", "'n'", "n.nspowner")})
      FROM pg_namespace n WHERE n.nspname='app'
    UNION ALL SELECT 'defaultAcl', r.rolname::text||'.'||d.defaclobjtype::text,
      jsonb_build_object('acl',${aclSql("d.defaclacl", "d.defaclobjtype", "d.defaclrole")}) FROM pg_default_acl d
      JOIN pg_roles r ON r.oid=d.defaclrole JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='app'
  ) objects ORDER BY kind, identity`;

export async function captureRecoveryInventory(client: RecoveryClient): Promise<RecoveryInventory> {
  await client.query("SET LOCAL TIME ZONE 'UTC'");
  await client.query("SET LOCAL DateStyle = 'ISO, YMD'");
  await client.query("SET LOCAL extra_float_digits = 3");
  const roles = await safeRoles(client);
  const extension = (
    await client.query<{ name: string; schema: string; version: string }>(
      `SELECT e.extname AS name, n.nspname AS schema, e.extversion AS version
     FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'`
    )
  ).rows;
  if (extension.length !== 1) throw new Error("Extensão vector ausente.");
  const names = (
    await client.query<{ name: string }>(`SELECT tablename AS name FROM pg_tables
    WHERE schemaname='app' ORDER BY tablename`)
  ).rows.map((row) => row.name);
  for (const required of [
    "users",
    "memberships",
    "chats",
    "access_codes",
    "device_sessions",
    "document_original_contents",
    "document_versions",
    "document_pages",
    "document_chunks",
    "document_chunk_embeddings",
    "processing_jobs",
    "conversation_entries",
    "schema_migrations"
  ])
    if (!names.includes(required)) throw new Error("Schema incompleto para recuperação integral.");
  const tables: TableFingerprint[] = [];
  for (const name of names) {
    const result = await client.query<{ rows: string; sha256: string }>(`
      SELECT count(*)::text AS rows,
        encode(sha256(convert_to(COALESCE(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex') AS sha256
      FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash
        FROM app.${safeIdentifier(name)} t) fingerprints`);
    tables.push({ name, ...result.rows[0]! });
  }
  const sequences: Record<string, unknown>[] = [];
  const sequenceNames = (
    await client.query<{ name: string }>(`SELECT sequencename AS name
    FROM pg_sequences WHERE schemaname='app' ORDER BY sequencename`)
  ).rows;
  for (const { name } of sequenceNames) {
    const state = await client.query(
      `SELECT last_value::text, is_called FROM app.${safeIdentifier(name)}`
    );
    sequences.push({ name, ...state.rows[0] });
  }
  return {
    tables,
    sequences,
    roles,
    extension: extension[0]!,
    catalog: (await client.query(catalogSql)).rows
  };
}

export function assertRecoveryInventory(expected: RecoveryInventory, actual: RecoveryInventory) {
  if (hash(JSON.stringify(expected)) !== hash(JSON.stringify(actual)))
    throw new Error("Inventário restaurado divergente; mantenha o destino em quarentena.");
}

export async function backupLocalApplication(
  client: RecoveryClient,
  sourceUrl: string,
  directory: string,
  confirmation: string,
  run: RecoveryRunner = runPostgresRecoveryCommand
): Promise<RecoveryManifest> {
  const url = localRecoveryConnection(sourceUrl, "source", confirmation);
  if (!isAbsolute(directory)) throw new Error("Use diretório absoluto e exclusivo para o ensaio.");
  try {
    await assertMarker(client, url, "source");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const inventory = await captureRecoveryInventory(client);
    const snapshot = (
      await client.query<{ snapshot: string }>("SELECT pg_export_snapshot() AS snapshot")
    ).rows[0]?.snapshot;
    if (!snapshot || !/^[a-f0-9-]{10,100}$/iu.test(snapshot)) throw new Error("Snapshot inválido.");
    // mkdir is exclusive: never overwrite a previous backup or follow an existing directory link.
    await mkdir(directory, { mode: 0o700 });
    const dump = join(directory, "app.dump");
    await run(
      postgresRecoveryCommand("pg_dump", url, [
        "--format=custom",
        "--schema=app",
        "--strict-names",
        `--snapshot=${snapshot}`,
        `--file=${dump}`
      ])
    );
    const manifest: RecoveryManifest = {
      version: 1,
      purpose: "synthetic-local-recovery",
      sourceDatabase: decodeURIComponent(url.pathname.slice(1)),
      dumpSha256: await recoveryFileSha256(dump),
      inventory
    };
    await client.query("COMMIT");
    await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600
    });
    return manifest;
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("Backup local não concluído; nenhum manifesto de sucesso foi confirmado.");
  }
}

export async function restoreLocalApplication(
  client: RecoveryClient,
  restoreUrl: string,
  directory: string,
  confirmation: string,
  run: RecoveryRunner = runPostgresRecoveryCommand
): Promise<void> {
  const url = localRecoveryConnection(restoreUrl, "restore", confirmation);
  if (!isAbsolute(directory)) throw new Error("Use diretório absoluto de backup local.");
  try {
    const manifest = JSON.parse(
      await readFile(join(directory, "manifest.json"), "utf8")
    ) as RecoveryManifest;
    if (
      manifest.version !== 1 ||
      manifest.purpose !== "synthetic-local-recovery" ||
      typeof manifest.sourceDatabase !== "string" ||
      !/^alvitra_ops_source_[a-f0-9]{12,32}$/u.test(manifest.sourceDatabase) ||
      !digestPattern.test(manifest.dumpSha256) ||
      !manifest.inventory?.tables?.length ||
      manifest.sourceDatabase === decodeURIComponent(url.pathname.slice(1))
    )
      throw new Error();
    if ((await recoveryFileSha256(join(directory, "app.dump"))) !== manifest.dumpSha256)
      throw new Error();
    await assertMarker(client, url, "restore");
    const occupied =
      await client.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE (n.nspname='app' OR (n.nspname NOT IN ('pg_catalog','information_schema','ops_control')
        AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN ('r','p','v','m')))
      UNION ALL SELECT 1 FROM pg_namespace WHERE nspname='app' LIMIT 1`);
    if (occupied.rows.length) throw new Error();
    await safeRoles(client);
    const vector = (
      await client.query(`SELECT e.extname AS name, n.nspname AS schema, e.extversion AS version
      FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'`)
    ).rows;
    if (JSON.stringify(vector[0]) !== JSON.stringify(manifest.inventory.extension))
      throw new Error();
    await run(
      postgresRecoveryCommand("pg_restore", url, [
        "--single-transaction",
        "--exit-on-error",
        "--no-owner",
        `--dbname=${decodeURIComponent(url.pathname.slice(1))}`,
        join(directory, "app.dump")
      ])
    );
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    assertRecoveryInventory(manifest.inventory, await captureRecoveryInventory(client));
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("Restauração local não validada; mantenha o destino em quarentena.");
  }
}
