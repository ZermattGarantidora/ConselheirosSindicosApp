import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { sha256 } from "./protocol.js";

export async function readCheckpoint<T>(path: string): Promise<T | undefined> {
  try {
    const saved = JSON.parse(await readFile(path, "utf8")) as { value: T; sha256: string };
    if (saved.sha256 !== sha256(saved.value)) throw new Error("Checkpoint adulterado.");
    return saved.value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function atomicJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { flag: "wx" });
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, path);
      break;
    } catch (error) {
      if (
        attempt >= 5 ||
        !["EPERM", "EBUSY"].includes(String((error as NodeJS.ErrnoException).code))
      )
        throw error;
      await delay(20 * (attempt + 1));
    }
  }
}

export async function writeCheckpoint(path: string, value: unknown): Promise<void> {
  if ((await readCheckpoint(path)) !== undefined)
    throw new Error("Checkpoint concluído não pode ser substituído.");
  await atomicJson(path, { value, sha256: sha256(value) });
}
