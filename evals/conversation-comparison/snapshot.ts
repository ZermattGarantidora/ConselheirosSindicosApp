import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

export const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function fingerprint(root: string) {
  const files: { path: string; sha256: string }[] = [];
  async function visit(path: string) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      const target = join(path, item.name);
      if (item.isDirectory()) await visit(target);
      else if (/\.(?:ts|tsx|json|txt|yaml|pdf)$/u.test(item.name))
        files.push({
          path: relative(root, target).replaceAll("\\", "/"),
          sha256: createHash("sha256")
            .update(await readFile(target))
            .digest("hex")
        });
    }
  }
  for (const folder of [
    "apps/api",
    "apps/shared",
    "evals/conversations",
    "evals/conversation-comparison"
  ])
    await visit(resolve(root, folder));
  files.push({
    path: "package.json",
    sha256: createHash("sha256")
      .update(await readFile(resolve(root, "package.json")))
      .digest("hex")
  });
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
export async function freezeSnapshot(root: string, directory: string, baselineDirectory?: string) {
  const snapshot = join(directory, "snapshot");
  try {
    await readFile(join(directory, "snapshot-manifest.json"), "utf8");
    return snapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const sourceRoot = baselineDirectory === undefined ? root : join(baselineDirectory, "snapshot");
  const baselineFiles = await fingerprint(sourceRoot);
  let baselineFingerprint: string | undefined;
  if (baselineDirectory !== undefined) {
    const baselineManifest = JSON.parse(
      await readFile(join(baselineDirectory, "snapshot-manifest.json"), "utf8")
    ) as { fingerprint: string };
    baselineFingerprint = hash(baselineFiles);
    if (baselineFingerprint !== baselineManifest.fingerprint)
      throw new Error("Baseline histórico alterado; execução recusada.");
  }
  const harnessPaths = new Set(
    ["run.ts", "protocol.ts", "snapshot.ts"].map((name) => `evals/conversation-comparison/${name}`)
  );
  const harnessFiles =
    baselineDirectory === undefined
      ? []
      : (await fingerprint(root)).filter((item) => harnessPaths.has(item.path));
  const before = baselineFiles.map(
    (item) => harnessFiles.find((replacement) => replacement.path === item.path) ?? item
  );
  await mkdir(snapshot, { recursive: true });
  for (const item of before) {
    const target = join(snapshot, item.path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await copyFile(join(harnessFiles.includes(item) ? root : sourceRoot, item.path), target);
  }
  const after = await fingerprint(snapshot);
  if (hash(before) !== hash(after))
    throw new Error("Snapshot inconsistente: fonte mudou durante a cópia; use outro run-key.");
  await writeFile(
    join(directory, "snapshot-manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        fingerprint: hash(after),
        ...(baselineFingerprint === undefined ? {} : { baselineFingerprint }),
        files: after
      },
      null,
      2
    ),
    { flag: "wx" }
  );
  return snapshot;
}
