import { copyFile, mkdir, readFile, readdir, realpath, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fingerprint, freezeSnapshot, hash } from "../conversation-comparison/snapshot.js";
import { sha256 } from "./protocol.js";

async function extraFiles(root: string) {
  const paths = (await readdir(join(root, "evals/full-page-documents")))
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => `evals/full-page-documents/${name}`);
  paths.push("tests/fixtures/full-page-documents.ts");
  return Promise.all(
    paths.map(async (path) => ({ path, hash: sha256(await readFile(join(root, path), "utf8")) }))
  );
}

export async function freezeFullPageSnapshot(root: string, directory: string): Promise<string> {
  const snapshot = await freezeSnapshot(root, directory);
  const manifestPath = join(directory, "full-page-snapshot.json");
  try {
    await readFile(manifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const before = await extraFiles(root);
    for (const file of before) {
      const target = join(snapshot, file.path);
      await mkdir(resolve(target, ".."), { recursive: true });
      await copyFile(join(root, file.path), target);
    }
    if (sha256(before) !== sha256(await extraFiles(snapshot)))
      throw new Error("Fontes mudaram durante a cópia do snapshot.");
    await writeFile(manifestPath, JSON.stringify({ extra: before }, null, 2), { flag: "wx" });
  }
  const dependencies = join(snapshot, "node_modules");
  const expectedDependencies = await realpath(join(root, "node_modules"));
  try {
    if ((await realpath(dependencies)) !== expectedDependencies)
      throw new Error("Dependências do snapshot divergentes.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await symlink(
      expectedDependencies,
      dependencies,
      process.platform === "win32" ? "junction" : "dir"
    );
  }
  await validateFullPageSnapshot(snapshot, directory);
  return snapshot;
}

export async function validateFullPageSnapshot(
  snapshot: string,
  directory: string
): Promise<string> {
  const base = JSON.parse(await readFile(join(directory, "snapshot-manifest.json"), "utf8")) as {
    fingerprint: string;
  };
  const extra = JSON.parse(await readFile(join(directory, "full-page-snapshot.json"), "utf8")) as {
    extra: Awaited<ReturnType<typeof extraFiles>>;
  };
  if (
    hash(await fingerprint(snapshot)) !== base.fingerprint ||
    sha256(await extraFiles(snapshot)) !== sha256(extra.extra)
  ) {
    throw new Error("Snapshot alterado; retomada recusada.");
  }
  return sha256({ base: base.fingerprint, extra: extra.extra });
}
