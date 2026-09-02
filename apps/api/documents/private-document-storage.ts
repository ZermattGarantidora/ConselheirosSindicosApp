import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { CondominiumId } from "../core/condominium-scope.js";

export type PrivateStorageObject = Readonly<{
  condominiumId: CondominiumId;
  objectId: string;
  content: Buffer;
}>;

export interface PrivateDocumentStorage {
  storeOriginal(input: PrivateStorageObject): Promise<Readonly<{ storageKey: string }>>;
  removeOriginal(
    input: Readonly<{ condominiumId: CondominiumId; objectId: string }>
  ): Promise<void>;
}

function tenantStorageSegment(condominiumId: CondominiumId): string {
  return createHash("sha256").update(condominiumId).digest("hex").slice(0, 32);
}

function assertObjectId(objectId: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(objectId)
  ) {
    throw new Error("Identificador de objeto de storage inválido.");
  }
}

function objectPath(rootDirectory: string, condominiumId: CondominiumId, objectId: string): string {
  assertObjectId(objectId);
  const root = resolve(rootDirectory);
  const tenantDirectory = join(root, tenantStorageSegment(condominiumId));
  const target = join(tenantDirectory, `${objectId}.pdf`);

  if (!target.startsWith(`${tenantDirectory}\\`) && !target.startsWith(`${tenantDirectory}/`)) {
    throw new Error("Caminho de storage fora do condomínio autorizado.");
  }

  return target;
}

export function createPrivateStorageKey(condominiumId: CondominiumId, objectId: string): string {
  assertObjectId(objectId);
  return `tenants/${tenantStorageSegment(condominiumId)}/objects/${objectId}`;
}

export function createLocalPrivateDocumentStorage(rootDirectory: string): PrivateDocumentStorage {
  return {
    async storeOriginal({ condominiumId, objectId, content }) {
      const target = objectPath(rootDirectory, condominiumId, objectId);
      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, content, { flag: "wx" });

      return Object.freeze({ storageKey: createPrivateStorageKey(condominiumId, objectId) });
    },
    async removeOriginal({ condominiumId, objectId }) {
      await rm(objectPath(rootDirectory, condominiumId, objectId), { force: true });
    }
  };
}
